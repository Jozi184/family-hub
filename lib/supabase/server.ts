import {createClient} from '@supabase/supabase-js';
import {env} from 'cloudflare:workers';
export function publicConfig(){
 const vars=env as unknown as Record<string,string>;
 if(!vars.SUPABASE_URL||!vars.SUPABASE_PUBLISHABLE_KEY)throw new Error('Supabase není nakonfigurované.');
 return {url:vars.SUPABASE_URL,key:vars.SUPABASE_PUBLISHABLE_KEY};
}
export async function userClient(req:Request){
 const token=req.headers.get('Authorization')?.match(/^Bearer (.+)$/)?.[1];
 if(!token)return null;
 const config=publicConfig();
 const client=createClient(config.url,config.key,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:`Bearer ${token}`}}});
 const {data,error}=await client.auth.getUser(token);
 if(error||!data.user)return null;
 return {client,user:data.user};
}
export function json(data:unknown,status=200){return Response.json(data,{status,headers:{'Cache-Control':'private, no-store'}})}
export function sameOrigin(req:Request){return req.headers.get('origin')===new URL(req.url).origin}
