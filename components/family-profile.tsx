'use client';
import {useState} from 'react';
import {useFamilyAccount} from '../lib/family/account-context';
import {Check,X} from 'lucide-react';
import {profileColors,type FamilyProfile} from '../lib/family/calendar';
type Props={profile:FamilyProfile;loaded:boolean;onSave:(profile:FamilyProfile)=>Promise<boolean>;onClose:()=>void};
export default function FamilyProfileEditor({profile,loaded,onSave,onClose}:Props){
 const account=useFamilyAccount();
 const [draft,setDraft]=useState({...profile}),[working,setWorking]=useState(false),[error,setError]=useState('');
 async function save(){if(!loaded||working)return;setWorking(true);const ok=await onSave({...draft,name:draft.name.trim()});setWorking(false);if(ok)onClose();else setError('Profil se nepodařilo uložit. Zkus to znovu.');}
 return <div className="overlay"><div className="modal" role="dialog" aria-modal="true" aria-label="Můj profil"><button className="close" disabled={working} onClick={onClose} aria-label="Zavřít"><X size={22}/></button><h2>Můj profil</h2><p>Jméno a barva patří tvému přihlášenému účtu.</p><form className="eventform" onSubmit={event=>{event.preventDefault();void save()}}><fieldset disabled={working||!loaded}><label>Jméno<input autoFocus required maxLength={60} value={draft.name} onChange={event=>setDraft({...draft,name:event.target.value})}/></label><label>Moje barva</label><div className="profilecolors">{profileColors.map((color,index)=><button type="button" key={color} aria-label={['Zelená','Modrá','Oranžová','Červená','Tyrkysová'][index]} aria-pressed={color===draft.color} style={{background:color}} disabled={account.household.members.some(member=>member.user_id!==account.userId&&member.color===color)} onClick={()=>setDraft({...draft,color})}>{draft.color===color&&<Check size={20}/>}</button>)}</div><small>Fialová je vyhrazená společným aktivitám.</small><p role="alert" className="preseterror">{error}</p><button className="primary" disabled={working||!loaded}>Uložit profil</button></fieldset></form><p className="profilelimit">{account.email} · {account.household.name}</p></div></div>
}
