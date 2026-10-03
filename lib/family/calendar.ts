export type FamilyEvent = { id: string; title: string; date: string; time: string; endDate: string; audience: 'me' | 'shared'; note: string };
export type FamilyProfile = { name: string; color: string };
export const profileColors = ['#416443','#4267ac','#b77727','#ba5757','#33827f'];
export const sharedColor = '#8955a8';
export function pragueToday(now = new Date()) {
 const parts = new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Prague',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 return ['year','month','day'].map(type => parts.find(part => part.type === type)!.value).join('-');
}
export function isoDate(date: Date) { return date.toISOString().slice(0,10); }
export function addDays(date: string, days: number) { const result = new Date(`${date}T12:00:00Z`); result.setUTCDate(result.getUTCDate()+days); return isoDate(result); }
export function daysUntil(date: string, today: string) { return Math.round((Date.parse(date+'T12:00:00Z')-Date.parse(today+'T12:00:00Z'))/86400000); }
export function holidays(year: number) {
 const result: Record<string,string> = {};
 for (const [date,name] of Object.entries({ '01-01':'Nový rok / Den obnovy samostatného českého státu','05-01':'Svátek práce','05-08':'Den vítězství','07-05':'Cyril a Metoděj','07-06':'Den upálení mistra Jana Husa','09-28':'Den české státnosti','10-28':'Den vzniku samostatného československého státu','11-17':'Den boje za svobodu a demokracii','12-24':'Štědrý den','12-25':'1. svátek vánoční','12-26':'2. svátek vánoční' })) result[`${year}-${date}`]=name;
 // Gregorian computus: Easter Sunday; public holidays are Friday and Monday.
 const a=year%19,b=Math.floor(year/100),c=year%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451);
 const month=Math.floor((h+l-7*m+114)/31),day=(h+l-7*m+114)%31+1;
 const easter=`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
 result[addDays(easter,-2)]='Velký pátek';result[addDays(easter,1)]='Velikonoční pondělí';
 return result;
}
export function monthCells(month: string) {
 const first=new Date(`${month}-01T12:00:00Z`);const start=addDays(isoDate(first),-(first.getUTCDay()+6)%7);
 return Array.from({length:42},(_,index)=>addDays(start,index));
}
export function nextEvent(events: FamilyEvent[], today: string) {
 return events.filter(event => (event.endDate || event.date) >= today).sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time))[0] ?? null;
}
export function dateLabel(date: string, opts: Intl.DateTimeFormatOptions = {day:'numeric',month:'long'}) {
 return new Date(`${date}T12:00:00Z`).toLocaleDateString('cs-CZ',{...opts,timeZone:'Europe/Prague'});
}
