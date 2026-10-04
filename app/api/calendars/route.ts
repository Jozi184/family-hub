import {userClient,json,sameOrigin} from '../../../lib/supabase/server';
import {downloadFeed,feedURL,parseFeed,type Provider} from '../../../lib/calendar/feed';
import {pragueToday,addDays} from '../../../lib/family/calendar';
import {z} from 'zod';
const importedEvent=z.object({id:z.string().min(1).max(4096),title:z.string().max(100),date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),endDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),time:z.string().regex(/^(?:[0-2]\d:[0-5]\d)?$/),note:z.string().max(1500)});
const action=z.discriminatedUnion('action',[
 z.object({action:z.literal('connect'),provider:z.enum(['google','apple']),label:z.string().trim().min(1).max(60),url:z.string().trim().max(2000),shareWithFamily:z.literal(true),publicLinkAcknowledged:z.boolean()}),
 z.object({action:z.literal('refresh'),id:z.string().uuid()}),z.object({action:z.literal('disconnect'),id:z.string().uuid()})
]);
export async function GET(req:Request){
 const auth=await userClient(req);if(!auth)return json({error:'Přihlaste se.'},401);
 const [connections,snapshots]=await Promise.all([
  auth.client.from('family_calendar_connections').select('id,provider,label,created_at').eq('owner_id',auth.user.id).order('created_at'),
  auth.client.from('family_calendar_snapshots').select('connection_id,owner_id,provider,label,events,synced_at,range_start,range_end')
 ]);
 if(connections.error||snapshots.error)return json({error:'Připojené kalendáře se nepodařilo načíst.'},500);
 const sources=(snapshots.data??[]).map(s=>({id:s.connection_id,ownerId:s.owner_id,provider:s.provider,label:s.label,syncedAt:s.synced_at,from:s.range_start,to:s.range_end,count:Array.isArray(s.events)?s.events.length:0}));
 const events=(snapshots.data??[]).flatMap(s=>(Array.isArray(s.events)?s.events:[]).flatMap(e=>{const parsed=importedEvent.safeParse(e);return parsed.success?[{...parsed.data,id:`external:${s.connection_id}:${parsed.data.id}`,ownerId:s.owner_id,audience:'me',sourceId:s.connection_id,sourceLabel:s.label,provider:s.provider}]:[]}));
 return json({connections:(connections.data??[]).map(c=>({...c,syncedAt:sources.find(s=>s.id===c.id)?.syncedAt??null})),sources,events});
}
export async function POST(req:Request){
 if(!sameOrigin(req))return json({error:'Nepovolený požadavek.'},403);
 const auth=await userClient(req);if(!auth)return json({error:'Přihlaste se.'},401);
 let body:unknown;try{const raw=await req.text();if(raw.length>4096)return json({error:'Příliš dlouhý požadavek.'},400);body=JSON.parse(raw)}catch{return json({error:'Neplatná data.'},400)}
 const parsed=action.safeParse(body);if(!parsed.success)return json({error:'Vyplň název, odkaz kalendáře a potvrď sdílení s rodinou.'},400);
 const a=parsed.data;
 const membership=await auth.client.from('family_members').select('household_id').eq('user_id',auth.user.id).maybeSingle();
 if(membership.error||!membership.data)return json({error:'Nejdřív se připoj k domácnosti.'},403);
 const householdId=membership.data.household_id;
 if(a.action==='disconnect'){
  const deleted=await auth.client.from('family_calendar_connections').delete().eq('id',a.id).eq('owner_id',auth.user.id).select('id');
  return deleted.error?json({error:'Odpojení se nezdařilo.'},500):deleted.data?.length?json({ok:true}):json({error:'Kalendář nebyl nalezen.'},404);
 }
 type Connection={id:string;provider:Provider;label:string;feed_url:string};
 let connection:Connection|null=null;
 if(a.action==='refresh'){
  const own=await auth.client.from('family_calendar_connections').select('id,provider,label,feed_url').eq('id',a.id).eq('owner_id',auth.user.id).maybeSingle();
  if(own.error||!own.data)return json({error:'Kalendář nebyl nalezen.'},404);connection=own.data as Connection;
  const snapshot=await auth.client.from('family_calendar_snapshots').select('synced_at').eq('connection_id',a.id).maybeSingle();
  if(snapshot.error)return json({error:'Kalendář se nepodařilo načíst.'},500);
  if(snapshot.data&&Date.now()-Date.parse(snapshot.data.synced_at)<60000)return json({ok:true,cached:true});
 }else{
  if(a.provider==='apple'&&!a.publicLinkAcknowledged)return json({error:'Potvrď, že rozumíš přístupu přes veřejný odkaz iCloud.'},400);
  const count=await auth.client.from('family_calendar_connections').select('id',{count:'exact',head:true}).eq('owner_id',auth.user.id);
  if(count.error)return json({error:'Kalendáře se nepodařilo načíst.'},500);if((count.count??0)>=6)return json({error:'Můžeš připojit nejvýše šest kalendářů.'},400);
  let url:string;try{url=feedURL(a.url,a.provider)}catch(error){return json({error:error instanceof Error?error.message:'Neplatný odkaz.'},400)}
  connection={id:crypto.randomUUID(),provider:a.provider,label:a.label,feed_url:url};
 }
 if(!connection)return json({error:'Kalendář nebyl nalezen.'},404);
 const from=addDays(pragueToday(),-30),to=addDays(pragueToday(),365);
 let events;try{events=parseFeed(await downloadFeed(connection.feed_url,connection.provider),from,to)}catch(error){
  // Provider errors and URLs must never be included in diagnostics or returned to family.
  const known=error instanceof Error?error.message:'';
  const safe=/^(Kalendář|Načítání|Odkaz|Opakování|Událost|Použij|Vlož)/.test(known)?known:'Kalendář se nepodařilo zpracovat. Zkontroluj iCal odkaz.';
  return json({error:safe},422);
 }
 if(a.action==='connect'){
  const created=await auth.client.from('family_calendar_connections').insert({...connection,owner_id:auth.user.id,household_id:householdId});
  if(created.error)return json({error:created.error.code==='23505'?'Tento kalendář je už připojený.':'Připojení se nepodařilo uložit.'},created.error.code==='23505'?409:500);
 }
 const saved=await auth.client.from('family_calendar_snapshots').upsert({connection_id:connection.id,owner_id:auth.user.id,household_id:householdId,provider:connection.provider,label:connection.label,events,synced_at:new Date().toISOString(),range_start:from,range_end:to},{onConflict:'connection_id'});
 if(saved.error){if(a.action==='connect')await auth.client.from('family_calendar_connections').delete().eq('id',connection.id).eq('owner_id',auth.user.id);return json({error:'Události se nepodařilo uložit. Původní události zůstaly zachované.'},500)}
 return json({ok:true,count:events.length});
}
