import {userClient,json,sameOrigin} from '../../../lib/supabase/server';
import {hubStateSchema} from '../../../lib/family/state-schema';
export async function GET(req:Request){
 const auth=await userClient(req);if(!auth)return json({error:'Přihlaste se.'},401);
 const {data,error}=await auth.client.from('family_state').select('data,revision').maybeSingle();
 if(error)return json({error:'Data se nepodařilo načíst.'},500);if(!data)return json({error:'Nejdřív vytvoř domácnost nebo přijmi pozvánku.'},403);
 const parsed=hubStateSchema.safeParse(data.data);if(!parsed.success)return json({error:'Data domácnosti nejsou platná.'},500);
 return json({data:parsed.data,revision:data.revision});
}
export async function POST(req:Request){
 if(!sameOrigin(req))return json({error:'Nepovolený požadavek'},403);
 const auth=await userClient(req);if(!auth)return json({error:'Přihlaste se.'},401);
 let body:unknown;try{body=await req.json()}catch{return json({error:'Neplatná data'},400)}
 if(!body||typeof body!=='object')return json({error:'Neplatná data'},400);
 const input=body as {data:unknown;revision:unknown};const parsed=hubStateSchema.safeParse(input.data);
 if(!parsed.success||JSON.stringify(input.data).length>200000||!Number.isSafeInteger(input.revision))return json({error:'Neplatná data'},400);
 const {data:members,error:membersError}=await auth.client.from('family_members').select('user_id');
 if(membersError)return json({error:'Domácnost se nepodařilo načíst.'},500);
 const allowed=new Set((members??[]).map(member=>member.user_id));
 const events=(parsed.data.events??[]).map(event=>({...event,ownerId:event.ownerId??auth.user.id}));
 if(events.some(event=>!allowed.has(event.ownerId)))return json({error:'Událost nepatří členovi domácnosti.'},400);
 const payload={...parsed.data,presets:parsed.data.presets??[],events};
 const {data,error}=await auth.client.rpc('family_save_state',{payload,expected_revision:input.revision});
 if(error)return json({error:error.message.includes('revision_conflict')?'Mezitím došlo ke změně na jiném zařízení. Načti nový seznam a zopakuj akci.':'Uložení selhalo.'},error.message.includes('revision_conflict')?409:500);
 return json({ok:true,revision:data});
}
