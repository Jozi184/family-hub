import {userClient,json,sameOrigin} from '../../../lib/supabase/server';
import {getChatGPTUser} from '../../chatgpt-auth';
import {getDb} from '../../../db';
import {hub} from '../../../db/schema';
import {eq} from 'drizzle-orm';
import {hubStateSchema} from '../../../lib/family/state-schema';
async function legacy(req:Request){
 const auth=await userClient(req);if(!auth)return null;
 const previous=await getChatGPTUser();
 if(!previous||!auth.user.email_confirmed_at||previous.email.toLowerCase()!==auth.user.email?.toLowerCase())return null;
 const rows=await getDb().select().from(hub).where(eq(hub.owner,previous.userId));
 if(!rows[0])return null;
 const parsed=hubStateSchema.safeParse(JSON.parse(rows[0].data));if(!parsed.success)return null;
 return {auth,data:{...parsed.data,presets:parsed.data.presets??[],events:(parsed.data.events??[]).map(event=>({...event,ownerId:auth.user.id}))}};
}
export async function GET(req:Request){
 const existing=await legacy(req);if(!existing)return json({available:false});
 return json({available:existing.data.items.length+existing.data.plan.length+existing.data.presets.length+existing.data.events.length>0});
}
export async function POST(req:Request){
 if(!sameOrigin(req))return json({error:'Nepovolený požadavek'},403);
 const existing=await legacy(req);if(!existing)return json({error:'Původní data nejsou dostupná pro tento účet.'},403);
 const {data:household}=await existing.auth.client.from('family_households').select('owner_id').single();
 if(household?.owner_id!==existing.auth.user.id)return json({error:'Přenos může provést pouze správce domácnosti.'},403);
 const {data:current,error}=await existing.auth.client.from('family_state').select('data,revision').single();
 if(error||!current)return json({error:'Domácnost se nepodařilo načíst.'},500);
 if(current.data.legacyImported||['items','plan','presets','events'].some(key=>current.data[key]?.length))return json({error:'Domácnost už obsahuje data. Přenos by je přepsal, proto se neprovedl.'},409);
 const saved=await existing.auth.client.rpc('family_save_state',{payload:{...existing.data,legacyImported:true},expected_revision:current.revision});
 return saved.error?json({error:'Přenos se nepodařil. Původní data zůstala zachovaná.'},500):json({ok:true});
}
