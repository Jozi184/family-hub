import {test} from 'node:test';
import assert from 'node:assert/strict';
import {feedURL,downloadFeed,parseFeed,feedLimit} from '../lib/calendar/feed.ts';
const wrap=(events,extra='')=>`BEGIN:VCALENDAR\r\nVERSION:2.0\r\n${extra}${events}\r\nEND:VCALENDAR\r\n`;
const event=(fields)=>`BEGIN:VEVENT\r\n${fields}\r\nEND:VEVENT`;
const parse=(events,extra='')=>parseFeed(wrap(events,extra),'2026-10-01','2026-11-30');
test('Only exact Google/iCloud calendar endpoints can be fetched, including webcal normalization',()=>{
 assert.equal(feedURL('webcal://p123-calendars.icloud.com/published/2/abc_123','apple'),'https://p123-calendars.icloud.com/published/2/abc_123');
 assert.equal(feedURL('https://calendar.google.com/calendar/ical/a%40gmail.com/private-123abc/basic.ics','google'),'https://calendar.google.com/calendar/ical/a%40gmail.com/private-123abc/basic.ics');
 for(const url of ['https://localhost/calendar.ics','http://calendar.google.com/calendar/ical/a/public/basic.ics','https://calendar.google.com.evil.com/calendar/ical/a/public/basic.ics','https://calendar.google.com:8443/calendar/ical/a/public/basic.ics','https://calendar.google.com/calendar/ical/a/public/basic.ics?proxy=x','https://user:pass@calendar.google.com/calendar/ical/a/public/basic.ics','https://calendar.google.com/calendar/ical/a/../../../internal'])assert.throws(()=>feedURL(url,'google'));
 assert.throws(()=>feedURL('https://p1-calendars.icloud.com.evil.com/published/2/abc','apple'));
});
test('All-day DTEND is exclusive and event outside the requested window is omitted',()=>{
 const rows=parse(event('UID:trip\r\nDTSTART;VALUE=DATE:20261003\r\nDTEND;VALUE=DATE:20261006\r\nSUMMARY:Výlet')+'\r\n'+event('UID:old\r\nDTSTART;VALUE=DATE:20250101\r\nSUMMARY:Old'));
 assert.equal(rows.length,1);assert.equal(rows[0].date,'2026-10-03');assert.equal(rows[0].endDate,'2026-10-05');assert.equal(rows[0].time,'');
});
test('UTC and IANA timezone events use Prague time across DST',()=>{
 const rows=parse(event('UID:utc\r\nDTSTART:20261004T070000Z\r\nDTEND:20261004T080000Z\r\nSUMMARY:UTC')+'\r\n'+event('UID:local\r\nDTSTART;TZID=Europe/Prague:20261025T090000\r\nDTEND;TZID=Europe/Prague:20261025T100000\r\nSUMMARY:Winter'));
 assert.equal(rows[0].time,'09:00');assert.equal(rows[1].time,'09:00');
});
test('Weekly recurrence includes EXDATE and moved occurrence without duplicates',()=>{
 const rows=parse(event('UID:series\r\nDTSTART;TZID=Europe/Prague:20261005T090000\r\nDTEND;TZID=Europe/Prague:20261005T100000\r\nRRULE:FREQ=WEEKLY;COUNT=4\r\nEXDATE;TZID=Europe/Prague:20261012T090000\r\nSUMMARY:Weekly')+'\r\n'+event('UID:series\r\nRECURRENCE-ID;TZID=Europe/Prague:20261019T090000\r\nDTSTART;TZID=Europe/Prague:20261020T110000\r\nDTEND;TZID=Europe/Prague:20261020T120000\r\nSUMMARY:Moved'));
 assert.deepEqual(rows.map(r=>[r.date,r.time]),[['2026-10-05','09:00'],['2026-10-20','11:00'],['2026-10-26','09:00']]);assert.equal(new Set(rows.map(r=>r.id)).size,3);
});
test('Cancelled events and cancelled recurrence exceptions are removed',()=>{
 const rows=parse(event('UID:cancelled\r\nDTSTART:20261003T090000Z\r\nSUMMARY:Cancelled\r\nSTATUS:CANCELLED')+'\r\n'+event('UID:repeat\r\nDTSTART:20261004T090000Z\r\nRRULE:FREQ=DAILY;COUNT=2\r\nSUMMARY:Repeat')+'\r\n'+event('UID:repeat\r\nRECURRENCE-ID:20261005T090000Z\r\nSTATUS:CANCELLED'));
 assert.equal(rows.length,1);assert.equal(rows[0].date,'2026-10-04');
});
test('Timed midnight exclusive end stays on the previous Prague day',()=>{
 const rows=parse(event('UID:night\r\nDTSTART;TZID=Europe/Prague:20261004T230000\r\nDTEND;TZID=Europe/Prague:20261005T000000\r\nSUMMARY:Late'));
 assert.equal(rows[0].endDate,'2026-10-04');
});
test('Folded and escaped text, empty calendars and malformed feeds',()=>{
 const rows=parse(event('UID:text\r\nDTSTART;VALUE=DATE:20261003\r\nSUMMARY:A long\r\n  title\r\nDESCRIPTION:One\\nTwo'));
 assert.equal(rows[0].title,'A long title');assert.equal(rows[0].note,'One\nTwo');assert.deepEqual(parse(''),[]);
 assert.throws(()=>parseFeed('<html>login</html>','2026-10-01','2026-11-30'));
});
test('Provider redirects and oversized bodies are rejected without following arbitrary destinations',async()=>{
 const url='https://calendar.google.com/calendar/ical/test/public/basic.ics';let options;
 await assert.rejects(()=>downloadFeed(url,'google',async(_,opts)=>{options=opts;return new Response(null,{status:302,headers:{Location:'https://localhost/private'}})}));assert.equal(options.redirect,'manual');
 await assert.rejects(()=>downloadFeed(url,'google',async()=>new Response('x',{headers:{'Content-Length':String(feedLimit+1)}})));
 await assert.rejects(()=>downloadFeed(url,'google',async()=>new Response('x'.repeat(feedLimit+1))));
});

test('Overrides from another calendar series do not replace unrelated occurrences',()=>{
 const rows=parse(event('UID:first\r\nDTSTART:20261004T090000Z\r\nRRULE:FREQ=DAILY;COUNT=2\r\nSUMMARY:First')+'\r\n'+event('UID:second\r\nDTSTART:20261004T090000Z\r\nRRULE:FREQ=DAILY;COUNT=2\r\nSUMMARY:Second')+'\r\n'+event('UID:second\r\nRECURRENCE-ID:20261005T090000Z\r\nDTSTART:20261005T110000Z\r\nSUMMARY:Moved second'));
 assert.equal(rows.filter(r=>r.title==='First').length,2);assert.equal(rows.filter(r=>r.title==='Moved second').length,1);
});

test('RDATE adds a date to the recurrence and an embedded VTIMEZONE converts to Prague',()=>{
 const rows=parse(event('UID:extra\r\nDTSTART:20261004T090000Z\r\nRDATE:20261006T090000Z\r\nSUMMARY:Extra'));
 assert.deepEqual(rows.map(r=>r.date),['2026-10-04','2026-10-06']);
 const zone='BEGIN:VTIMEZONE\r\nTZID:Custom/Eastern\r\nBEGIN:STANDARD\r\nDTSTART:19700101T000000\r\nTZOFFSETFROM:-0500\r\nTZOFFSETTO:-0500\r\nEND:STANDARD\r\nEND:VTIMEZONE\r\n';
 const embedded=parse(event('UID:tz\r\nDTSTART;TZID=Custom/Eastern:20261004T090000\r\nDTEND;TZID=Custom/Eastern:20261004T100000\r\nSUMMARY:Custom zone'),zone);
 assert.equal(embedded[0].time,'16:00');
});
