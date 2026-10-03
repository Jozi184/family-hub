'use client';
import {useEffect,useState} from 'react';
import {House,Mail,LockKeyhole,ArrowRight,Users,LogOut} from 'lucide-react';
import type {Session} from '@supabase/supabase-js';
import {authFetch,getSupabase} from '../lib/supabase/client';
import {FamilyAccountContext,type Household} from '../lib/family/account-context';
import Hub from '../app/hub-client';
function errorText(code:string|undefined,message:string){
 if(code==='invalid_credentials')return 'Nesprávný e-mail nebo heslo.';
 if(code==='email_not_confirmed')return 'Nejdřív potvrď svůj e-mail pomocí odkazu ve zprávě.';
 if(code==='email_address_not_authorized'||message.toLowerCase().includes('email address not authorized'))return 'Odesílání e-mailů zatím není nastavené pro tuto adresu. Je potřeba dokončit nastavení e-mailů v Supabase.';
 if(code==='over_email_send_rate_limit')return 'Limit potvrzovacích e-mailů byl vyčerpán. Zkus to později.';
 if(code==='weak_password')return 'Zvol silnější heslo.';
 if(code==='user_already_exists')return 'Účet už existuje. Zkus se přihlásit.';
 return 'Akce se nepodařila. Zkontroluj údaje a zkus to znovu.';
}
export default function FamilyAuth(){
 const [session,setSession]=useState<Session|null>(null),[loaded,setLoaded]=useState(false),[mode,setMode]=useState<'login'|'signup'|'reset'|'recovery'>('login'),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[repeat,setRepeat]=useState(''),[name,setName]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState(''),[working,setWorking]=useState(false);
 useEffect(()=>{let active=true;let unsubscribe:(()=>void)|undefined;
  getSupabase().then(async client=>{
   const {data:{subscription}}=client.auth.onAuthStateChange((event,next)=>{if(!active)return;setSession(next);if(event==='PASSWORD_RECOVERY')setMode('recovery')});unsubscribe=()=>subscription.unsubscribe();
   const {data,error}=await client.auth.getSession();if(!active)return;if(error)throw error;setSession(data.session);setLoaded(true);
   if(window.location.hash.includes('type=recovery'))setMode('recovery');
  }).catch(()=>{if(active){setError('Přihlášení se nepodařilo načíst. Obnov stránku.');setLoaded(true)}});
  return()=>{active=false;unsubscribe?.()};
 },[]);
 function change(next:typeof mode){setMode(next);setError('');setNotice('');setPassword('');setRepeat('')}
 async function submit(){if(working)return;setError('');setNotice('');if((mode==='signup'||mode==='recovery')&&password!==repeat){setError('Hesla se neshodují.');return}setWorking(true);
  try{const client=await getSupabase();
   if(mode==='login'){const {error}=await client.auth.signInWithPassword({email:email.trim(),password});if(error)throw error;setPassword('')}
   else if(mode==='signup'){const {data,error}=await client.auth.signUp({email:email.trim(),password,options:{data:{name:name.trim()},emailRedirectTo:window.location.origin+'/'}});if(error)throw error;setPassword('');setRepeat('');if(!data.session)setNotice('Potvrď e-mail pomocí odkazu ve zprávě. Potom se zde přihlas.');}
   else if(mode==='reset'){const {error}=await client.auth.resetPasswordForEmail(email.trim(),{redirectTo:window.location.origin+'/'});if(error)throw error;setNotice('Pokud pro tuto adresu existuje účet, přijde odkaz pro obnovu hesla.');}
   else {const {error}=await client.auth.updateUser({password});if(error)throw error;setPassword('');setRepeat('');setMode('login');setNotice('Heslo je změněné.');}
  }catch(e){const failure=e as {code?:string;message?:string};setError(errorText(failure.code,failure.message||''))}finally{setWorking(false)}
 }
 if(!loaded)return <div className="authshell"><div className="authcard"><House size={32}/><p>Načítání Family Hubu…</p></div></div>;
 if(session&&mode!=='recovery')return <FamilySpace key={session.user.id} session={session}/>;
 return <div className="authshell"><div className="authcard"><a className="brand" href="/"><span className="brandicon"><House size={24}/></span>family<span>hub</span></a><p className="eyebrow">VÁŠ RODINNÝ PROSTOR</p><h1>{mode==='signup'?'Vytvoř si účet':mode==='reset'?'Zapomenuté heslo?':mode==='recovery'?'Nové heslo':'Vítej doma.'}</h1><p>{mode==='signup'?'Každý člen má vlastní účet. Domácnost potom vytvoříš nebo se připojíš pozvánkou.':mode==='reset'?'Pošleme ti odkaz pro nastavení nového hesla.':mode==='recovery'?'Zvol nové heslo pro svůj účet.':'Přihlas se svým e-mailem a heslem.'}</p><form className="eventform" onSubmit={event=>{event.preventDefault();void submit()}}><fieldset disabled={working}>{mode==='signup'&&<label>Jméno<input required autoComplete="given-name" maxLength={60} value={name} onChange={event=>setName(event.target.value)}/></label>}{mode!=='recovery'&&<label>E-mail<input type="email" required autoComplete="email" value={email} onChange={event=>setEmail(event.target.value)}/></label>}{mode!=='reset'&&<label>Heslo<input type="password" required minLength={mode==='login'?1:10} maxLength={128} autoComplete={mode==='login'?'current-password':'new-password'} value={password} onChange={event=>setPassword(event.target.value)}/></label>}{(mode==='signup'||mode==='recovery')&&<label>Heslo znovu<input type="password" required minLength={10} maxLength={128} autoComplete="new-password" value={repeat} onChange={event=>setRepeat(event.target.value)}/><small>Nejméně 10 znaků.</small></label>}<p className="preseterror" role="alert">{error}</p><p className="authnotice" role="status">{notice}</p><button className="primary authsubmit" disabled={working}>{working?'Chvilku…':mode==='signup'?'Vytvořit účet':mode==='reset'?'Poslat odkaz':mode==='recovery'?'Uložit nové heslo':'Přihlásit se'}<ArrowRight size={17}/></button></fieldset></form>{mode==='login'?<div className="authlinks"><button className="plain" onClick={()=>change('signup')}>Vytvořit účet</button><button className="plain" onClick={()=>change('reset')}>Zapomenuté heslo</button></div>:mode!=='recovery'&&<button className="plain" onClick={()=>change('login')}>Zpět na přihlášení</button>}<small className="authfoot">Soukromé účty. Společné rodinné plány.</small></div></div>
}
function FamilySpace({session}:{session:Session}){
 const [household,setHousehold]=useState<Household|null>(null),[loaded,setLoaded]=useState(false),[error,setError]=useState(''),[working,setWorking]=useState(false),[name,setName]=useState('Naše rodina'),[token,setToken]=useState(''),[invite,setInvite]=useState('');
 async function refresh(){const r=await authFetch('/api/household');const d=await r.json() as Household|null;if(!r.ok)throw Error('Domácnost se nepodařilo načíst.');setHousehold(d);setLoaded(true)}
 async function signOut(){const client=await getSupabase();await client.auth.signOut()}
 useEffect(()=>{let active=true;(async()=>{try{const profile=await authFetch('/api/profile');if(!profile.ok)throw Error();if(active)await refresh()}catch{if(active){setError('Účet se nepodařilo načíst. Obnov stránku.');setLoaded(true)}}})();return()=>{active=false}},[]);
 async function action(type:'create'|'join'){if(working)return;setWorking(true);setError('');try{const r=await authFetch('/api/household',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(type==='create'?{action:'create',name}:{action:'join',token:token.trim()})});const data=await r.json() as {error?:string;invite?:string};if(!r.ok)throw Error(data.error);if(data.invite)setInvite(data.invite);await refresh()}catch(e){setError((e as Error).message||'Akce selhala.')}finally{setWorking(false)}}
 if(household)return <FamilyAccountContext.Provider value={{userId:session.user.id,email:session.user.email||'',household,refreshHousehold:refresh,signOut}}><Hub initialInvite={invite}/></FamilyAccountContext.Provider>;
 return <div className="authshell"><div className="authcard onboarding"><Users size={30}/><h1>{loaded?'Vaše domácnost':'Načítání účtu…'}</h1><p>{session.user.email}</p>{loaded&&<><section><h2>Vytvořit novou domácnost</h2><form className="eventform" onSubmit={event=>{event.preventDefault();void action('create')}}><label>Název<input required maxLength={80} value={name} onChange={event=>setName(event.target.value)}/></label><button className="primary" disabled={working}>Vytvořit domácnost</button></form></section><div className="authdivider">nebo</div><section><h2>Připojit se k rodině</h2><form className="eventform" onSubmit={event=>{event.preventDefault();void action('join')}}><label>Kód pozvánky<input required maxLength={48} minLength={48} value={token} onChange={event=>setToken(event.target.value)} placeholder="Kód od člena domácnosti"/></label><button disabled={working}>Připojit se</button></form></section></>}<p className="preseterror" role="alert">{error}</p><button className="plain" onClick={signOut}><LogOut size={16}/> Odhlásit se</button></div></div>
}
