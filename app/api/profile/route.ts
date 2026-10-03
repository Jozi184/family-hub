import {userClient,json,sameOrigin} from '../../../lib/supabase/server';
import {z} from 'zod';
const schema=z.object({name:z.string().trim().min(1).max(60),color:z.enum(['#416443','#4267ac','#b77727','#ba5757','#33827f'])});
export async function GET(req:Request){
 const auth=await userClient(req);if(!auth)return json({error:'Přihlaste se.'},401);
 let {data,error}=await auth.client.from('family_profiles').select('name,color').eq('user_id',auth.user.id).maybeSingle();
 if(error)return json({error:'Profil se nepodařilo načíst.'},500);
 if(!data){
  const name=String(auth.user.user_metadata?.name||auth.user.email?.split('@')[0]||'Můj profil').trim().slice(0,60)||'Můj profil';
  const result=await auth.client.from('family_profiles').insert({user_id:auth.user.id,name,color:'#416443'}).select('name,color').single();
  if(result.error)return json({error:'Profil se nepodařilo vytvořit.'},500);data=result.data;
 }
 return json(data);
}
export async function POST(req:Request){
 if(!sameOrigin(req))return json({error:'Nepovolený požadavek'},403);
 const auth=await userClient(req);if(!auth)return json({error:'Přihlaste se.'},401);
 let body:unknown;try{body=await req.json()}catch{return json({error:'Neplatná data'},400)}
 const parsed=schema.safeParse(body);if(!parsed.success)return json({error:'Vyplň jméno a barvu.'},400);
 const {data:members,error:membersError}=await auth.client.from('family_members').select('user_id');
 if(membersError)return json({error:'Profil se nepodařilo uložit.'},500);
 const others=(members||[]).map(m=>m.user_id).filter(id=>id!==auth.user.id);
 if(others.length){const {data,error}=await auth.client.from('family_profiles').select('color').in('user_id',others);if(error)return json({error:'Profil se nepodařilo uložit.'},500);if(data?.some(p=>p.color===parsed.data.color))return json({error:'Tuto barvu už používá jiný člen domácnosti.'},409)}
 const {data,error}=await auth.client.from('family_profiles').update(parsed.data).eq('user_id',auth.user.id).select('name,color').single();
 return error?json({error:'Profil se nepodařilo uložit.'},500):json(data);
}
