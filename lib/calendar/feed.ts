import ICAL from 'ical.js';
import type {FamilyEvent} from '../family/calendar';
export type Provider='google'|'apple';
export type ImportedEvent=FamilyEvent & {sourceId:string;sourceLabel:string;provider:Provider};
export const feedLimit=3_000_000;
export function feedURL(raw:string,provider:Provider){
 let url:URL;try{url=new URL(raw.trim().replace(/^webcal:/i,'https:'))}catch{throw Error('Vlož platný odkaz kalendáře.')}
 if(url.protocol!=='https:'||url.port||url.username||url.password||url.hash||url.search)throw Error('Odkaz kalendáře musí používat HTTPS bez dalších parametrů.');
 const valid=provider==='google'?url.hostname==='calendar.google.com'&&/^\/calendar\/ical\/[^/]+\/(private-[a-zA-Z0-9]+|public)\/basic\.ics$/.test(url.pathname):/^p\d{1,3}-calendars\.icloud\.com$/.test(url.hostname)&&/^\/published\/2\/[a-zA-Z0-9_-]+$/.test(url.pathname);
 if(!valid)throw Error(provider==='google'?'Použij adresu ve formátu iCal z nastavení Google kalendáře.':'Použij odkaz sdíleného iCloud kalendáře (webcal://…).');
 return url.href;
}
export async function downloadFeed(raw:string,provider:Provider,fetcher:typeof fetch=fetch){
 const url=feedURL(raw,provider);const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),12000);
 try{
  const response=await fetcher(url,{redirect:'manual',signal:controller.signal,headers:{Accept:'text/calendar'},cache:'no-store'});
  if(!response.ok)throw Error('Kalendář není dostupný. Zkontroluj jeho odkaz a sdílení.');
  if(Number(response.headers.get('Content-Length'))>feedLimit)throw Error('Kalendář je příliš velký (maximum 3 MB).');
  const reader=response.body?.getReader();if(!reader)throw Error('Kalendář neobsahuje data.');let total=0;const decoder=new TextDecoder();let text='';
  try{for(;;){const chunk=await reader.read();if(chunk.done)break;total+=chunk.value.length;if(total>feedLimit){await reader.cancel();throw Error('Kalendář je příliš velký (maximum 3 MB).')}text+=decoder.decode(chunk.value,{stream:true})}text+=decoder.decode()}finally{reader.releaseLock()}
  return text;
 }catch(error){if(controller.signal.aborted)throw Error('Načítání kalendáře trvalo příliš dlouho. Zkus obnovit připojení.');throw error}finally{clearTimeout(timer)}
}
function stamp(t:ICAL.Time){return `${String(t.year).padStart(4,'0')}-${String(t.month).padStart(2,'0')}-${String(t.day).padStart(2,'0')}`}
// Embedded VTIMEZONE is handled by ICAL; IANA zones absent from the feed use Intl.
function instant(t:ICAL.Time,zone:string){
 if(t.zone!==ICAL.Timezone.localTimezone)return t.toJSDate();
 const wanted=Date.UTC(t.year,t.month-1,t.day,t.hour,t.minute,t.second);let ms=wanted;
 const formatter=new Intl.DateTimeFormat('en-GB',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
 for(let i=0;i<3;i++){const p=formatter.formatToParts(new Date(ms));const value=(key:string)=>Number(p.find(part=>part.type===key)?.value);const displayed=Date.UTC(value('year'),value('month')-1,value('day'),value('hour'),value('minute'),value('second'));const delta=wanted-displayed;ms+=delta;if(!delta)break}
 return new Date(ms);
}
function display(t:ICAL.Time,zone:string){if(t.isDate)return {date:stamp(t),time:''};const p=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Prague',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(instant(t,zone));const value=(key:string)=>p.find(part=>part.type===key)!.value;return {date:`${value('year')}-${value('month')}-${value('day')}`,time:`${value('hour')}:${value('minute')}`}}
export function parseFeed(text:string,from:string,to:string):FamilyEvent[]{
 if(new TextEncoder().encode(text).length>feedLimit||!text.trimStart().startsWith('BEGIN:VCALENDAR'))throw Error('Odkaz nevrátil platný iCal kalendář.');
 const root=new ICAL.Component(ICAL.parse(text));const components=root.getAllSubcomponents('vevent');if(components.length>10000)throw Error('Kalendář obsahuje příliš mnoho událostí.');
 const result:FamilyEvent[]=[];const ids=new Set<string>();let steps=0;const started=Date.now();
 const defaultZone=String(root.getFirstPropertyValue('x-wr-timezone')||'Europe/Prague');
 const overrides=new Map<unknown,ICAL.Component[]>();
 for(const c of components){if(c.hasProperty('recurrence-id')){const uid=c.getFirstPropertyValue('uid');overrides.set(uid,[...(overrides.get(uid)??[]),c])}}
 for(const component of components){
  if(Date.now()-started>1500)throw Error('Kalendář je příliš rozsáhlý pro jedno načtení.');
  if(component.hasProperty('recurrence-id'))continue;
  if(String(component.getFirstPropertyValue('status')).toUpperCase()==='CANCELLED')continue;
  const uid=component.getFirstPropertyValue('uid');
  const exceptions=overrides.get(uid)??[];
  const cancelled=new Set(exceptions.filter(c=>String(c.getFirstPropertyValue('status')).toUpperCase()==='CANCELLED').map(c=>(c.getFirstPropertyValue('recurrence-id') as ICAL.Time).toString()));
  const master=new ICAL.Event(component,{exceptions:exceptions.filter(c=>String(c.getFirstPropertyValue('status')).toUpperCase()!=='CANCELLED'),strictExceptions:true});if(!master.startDate||!master.uid)throw Error('Událost v kalendáři nemá datum nebo identifikátor.');
  const add=(start:ICAL.Time,end:ICAL.Time,event:ICAL.Event,key:string)=>{
   if(String(event.component.getFirstPropertyValue('status')).toUpperCase()==='CANCELLED')return;
   const tz=String(event.component.getFirstProperty('dtstart')?.getParameter('tzid')||defaultZone);const a=display(start,tz);
   const b=end.clone();if(b.isDate){b.adjust(-1,0,0,0)}else if(b.compare(start)>0)b.adjust(0,0,0,-1);
   const last=display(b,String(event.component.getFirstProperty('dtend')?.getParameter('tzid')||tz));const endDate=last.date<a.date?a.date:last.date;
   if(a.date>to||endDate<from)return;
   const id=`${master.uid}:${key}`;if(ids.has(id))return;ids.add(id);
   result.push({id,title:String(event.summary||'Bez názvu').slice(0,100),date:a.date,endDate,time:a.time,audience:'me',note:[event.location,event.description].filter(Boolean).join('\n').slice(0,1500)});
   if(result.length>3000)throw Error('Kalendář má v tomto období více než 3 000 událostí.');
  };
  if(master.isRecurring()){
   // Match overrides by UID; cancelled exceptions may have no DTSTART.
   if(!component.hasProperty('rrule')){
    const first=master.startDate;const exclusions=component.getAllProperties('exdate').flatMap(p=>p.getValues()) as ICAL.Time[];
    if(!exclusions.some(t=>t.toString()===first.toString())&&!cancelled.has(first.toString())){const details=master.getOccurrenceDetails(first);add(details.startDate,details.endDate,details.item,first.toString())}
   }
   const iterator=master.iterator();let occurrence:ICAL.Time|null;
   while((occurrence=iterator.next())){
    if(++steps>30000||Date.now()-started>1500)throw Error('Opakování v kalendáři je příliš rozsáhlé.');
    if(stamp(occurrence)>new Date(Date.parse(to)+172800000).toISOString().slice(0,10))break;
    if(cancelled.has(occurrence.toString())||cancelled.has(occurrence.convertToZone(ICAL.Timezone.utcTimezone).toString()))continue;
    const details=master.getOccurrenceDetails(occurrence);add(details.startDate,details.endDate,details.item,occurrence.toString());
   }
  }else add(master.startDate,master.endDate,master,master.startDate.toString());
 }
 return result.sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time));
}
