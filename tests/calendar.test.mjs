import test from 'node:test';
import assert from 'node:assert/strict';
import {pragueToday,holidays,monthCells,daysUntil,addDays,nextEvent} from '../lib/family/calendar.ts';
import {hubStateSchema} from '../lib/family/state-schema.ts';
import {getNameDay} from 'namedays-cs';
test('Czech dates use Prague midnight in summer and winter',()=>{
 assert.equal(pragueToday(new Date('2026-10-03T22:30:00Z')),'2026-10-04');
 assert.equal(pragueToday(new Date('2026-12-31T23:30:00Z')),'2027-01-01');
});
test('Public holidays include movable Easter dates for several years',()=>{
 assert.equal(Object.keys(holidays(2026)).length,13);
 assert.equal(holidays(2026)['2026-04-03'],'Velký pátek');
 assert.equal(holidays(2026)['2026-04-06'],'Velikonoční pondělí');
 assert.equal(holidays(2027)['2027-03-26'],'Velký pátek');
 assert.equal(holidays(2027)['2027-03-29'],'Velikonoční pondělí');
 assert.equal(holidays(2026)['2026-10-28'],'Den vzniku samostatného československého státu');
});
test('Calendar is Monday-first with continuous days across year boundaries',()=>{
 const cells=monthCells('2027-01');assert.equal(cells.length,42);
 assert.equal(cells[0],'2026-12-28');assert.equal(cells[41],'2027-02-07');
 const feb=monthCells('2028-02');assert.ok(feb.includes('2028-02-29'));
});
test('Day countdown is stable across daylight saving time',()=>{
 assert.equal(daysUntil('2026-03-30','2026-03-28'),2);
 assert.equal(addDays('2026-12-31',1),'2027-01-01');
});
const event={id:'1',title:'Víkend',date:'2026-10-02',endDate:'2026-10-04',time:'',audience:'shared',note:''};
test('Countdown includes ongoing events and skips expired events',()=>{
 assert.deepEqual(nextEvent([event,{...event,id:'2',date:'2026-10-06',endDate:'2026-10-06'}],'2026-10-03'),event);
 assert.equal(nextEvent([event],'2026-10-05'),null);
});
test('Validation accepts old shopping data and rejects impossible dates and inverted ranges',()=>{
 assert.equal(hubStateSchema.safeParse({items:[],plan:[]}).success,true);
 assert.equal(hubStateSchema.safeParse({items:[],plan:[],events:[event]}).success,true);
 assert.equal(hubStateSchema.safeParse({items:[],plan:[],events:[{...event,date:'2026-02-30'}]}).success,false);
 assert.equal(hubStateSchema.safeParse({items:[],plan:[],events:[{...event,endDate:'2026-10-01'}]}).success,false);
});
test('Name days come from the Czech calendar, including multiple names',()=>{
 assert.ok(getNameDay(new Date(2026,9,3)).includes('Bohumil'));
 assert.deepEqual(getNameDay(new Date(2026,11,24)),['Adam','Eva']);
});
test('Shared state rejects unknown recipe indexes and invalid shopping records',()=>{
 assert.equal(hubStateSchema.safeParse({items:[],plan:[{date:'2026-10-05',recipe:99,servings:2}]}).success,false);
 assert.equal(hubStateSchema.safeParse({items:[{id:'1',name:'Mléko',qty:'2 l',cat:'Mléčné a vejce',done:'yes'}],plan:[]}).success,false);
});
