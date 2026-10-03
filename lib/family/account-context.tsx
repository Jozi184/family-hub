'use client';
import {createContext,useContext} from 'react';
export type Household={id:string;name:string;owner_id:string;members:{user_id:string;name:string;color:string}[]};
export type Account={userId:string;email:string;household:Household;refreshHousehold:()=>Promise<void>;signOut:()=>Promise<void>};
export const FamilyAccountContext=createContext<Account|null>(null);
export function useFamilyAccount(){const value=useContext(FamilyAccountContext);if(!value)throw Error('Účet není načtený.');return value;}
