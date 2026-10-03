'use client';
import {createClient,type SupabaseClient} from '@supabase/supabase-js';
let client:SupabaseClient|null=null;
export async function getSupabase(){
 if(client)return client;
 const response=await fetch('/api/config');if(!response.ok)throw Error('Služba přihlášení není dostupná.');
 const config=await response.json() as {url:string;key:string};
 client=createClient(config.url,config.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
 return client;
}
export async function authFetch(path:string,options:RequestInit={}){
 const supabase=await getSupabase();const {data,error}=await supabase.auth.getSession();
 if(error||!data.session)throw Error('Přihlaste se.');
 return fetch(path,{...options,headers:{...options.headers,Authorization:`Bearer ${data.session.access_token}`}});
}
