import {userClient,json,sameOrigin} from '../../../lib/supabase/server';
import {z} from 'zod';
const action=z.discriminatedUnion('action',[z.object({action:z.literal('create'),name:z.string().trim().min(1).max(80)}),z.object({action:z.literal('join'),token:z.string().regex(/^[a-f0-9]{48}$/)}),z.object({action:z.literal('invite')})]);
export async function GET(req:Request){
 const auth=await userClient(req);if(!auth)return json({error:'Přihlaste se.'},401);
 const {data:own,error}=await auth.client.from('family_members').select('household_id').eq('user_id',auth.user.id).maybeSingle();
 if(error)return json({error:'Domácnost se nepodařilo načíst.'},500);if(!own)return json(null);
 const {data:household,error:he}=await auth.client.from('family_households').select('id,name,owner_id').eq('id',own.household_id).single();
 const {data:members,error:me}=await auth.client.from('family_members').select('user_id').eq('household_id',own.household_id);
 const {data:profiles,error:pe}=await auth.client.from('family_profiles').select('user_id,name,color').in('user_id',(members||[]).map(m=>m.user_id));
 if(he||me||pe)return json({error:'Domácnost se nepodařilo načíst.'},500);
 return json({...household,members:profiles});
}
export async function POST(req:Request){
 if(!sameOrigin(req))return json({error:'Nepovolený požadavek'},403);
 const auth=await userClient(req);if(!auth)return json({error:'Přihlaste se.'},401);
 let body:unknown;try{body=await req.json()}catch{return json({error:'Neplatná data'},400)}
 const parsed=action.safeParse(body);if(!parsed.success)return json({error:'Vyplň název domácnosti nebo platný kód pozvánky.'},400);
 const a=parsed.data;const result=a.action==='create'?await auth.client.rpc('family_create_household',{household_name:a.name}):a.action==='join'?await auth.client.rpc('family_join_household',{invite_token:a.token}):await auth.client.rpc('family_new_invite');
 if(result.error){const message=result.error.message;return json({error:message.includes('invalid_invite')?'Pozvánka není platná nebo vypršela.':message.includes('household_full')?'Domácnost má už pět členů.':message.includes('already_member')?'Už jsi členem domácnosti.':'Akci se nepodařilo dokončit.'},400)}
 return json(a.action==='invite'?{invite:result.data}:result.data);
}
