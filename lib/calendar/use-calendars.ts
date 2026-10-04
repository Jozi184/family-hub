'use client';
import {useEffect,useRef,useState} from 'react';
import {authFetch} from '../supabase/client';
import type {ImportedEvent,Provider} from './feed';
export type CalendarSource={id:string;ownerId:string;provider:Provider;label:string;syncedAt:string;from:string;to:string;count:number};
export type CalendarConnection={id:string;provider:Provider;label:string;syncedAt:string|null};
type CalendarData={connections:CalendarConnection[];sources:CalendarSource[];events:ImportedEvent[]};
const empty:CalendarData={connections:[],sources:[],events:[]};
export function useCalendars(){
 const [data,setData]=useState<CalendarData>(empty),[error,setError]=useState(''),[loaded,setLoaded]=useState(false),[busy,setBusy]=useState(false);const running=useRef(false),alive=useRef(true);
 async function read(){const response=await authFetch('/api/calendars');const result=await response.json() as CalendarData & {error?:string};if(!response.ok)throw Error(result.error||'Kalendáře se nepodařilo načíst.');if(alive.current){setData(result);setLoaded(true)}return result as CalendarData}
 async function request(action:unknown){const response=await authFetch('/api/calendars',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(action)});const result=await response.json() as {error?:string};if(!response.ok)throw Error(result.error||'Propojení kalendáře selhalo.');return result}
 async function mutate(action:unknown){if(running.current)return false;running.current=true;setBusy(true);setError('');try{await request(action);await read();return true}catch(e){setError(e instanceof Error?e.message:'Propojení kalendáře selhalo.');return false}finally{running.current=false;if(alive.current)setBusy(false)}}
 useEffect(()=>{
  alive.current=true;
  async function poll(){if(running.current||document.hidden)return;running.current=true;setBusy(true);
   try{const latest=await read();const stale=latest.connections.filter(c=>!c.syncedAt||Date.now()-Date.parse(c.syncedAt)>300000);let failed=false;
    for(const connection of stale){if(!alive.current)break;try{await request({action:'refresh',id:connection.id})}catch(e){failed=true;if(alive.current)setError(`${connection.label}: ${e instanceof Error?e.message:'Obnovení selhalo.'}`)}}
    if(stale.length&&alive.current)await read();if(!failed&&alive.current)setError('');
   }catch(e){if(alive.current)setError(e instanceof Error?e.message:'Načtení kalendářů selhalo.')}finally{running.current=false;if(alive.current)setBusy(false)}
  }
  void poll();const timer=setInterval(()=>void poll(),60000);const visible=()=>{if(!document.hidden)void poll()};document.addEventListener('visibilitychange',visible);
  return()=>{alive.current=false;clearInterval(timer);document.removeEventListener('visibilitychange',visible)};
 },[]);
 return {data,error,loaded,busy,mutate};
}
export type CalendarModel=ReturnType<typeof useCalendars>;
