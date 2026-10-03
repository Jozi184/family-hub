import { getChatGPTUser } from '../../chatgpt-auth';
import { getDb } from '../../../db';
import { hub } from '../../../db/schema';
import { eq } from 'drizzle-orm';
export async function GET() {
 const u=await getChatGPTUser(); if(!u) return Response.json({error:'Přihlaste se.'},{status:401});
 const rows=await getDb().select().from(hub).where(eq(hub.owner,u.userId));
 return Response.json(rows[0]?JSON.parse(rows[0].data):null);
}
export async function POST(req:Request) {
 const u=await getChatGPTUser(); if(!u) return Response.json({error:'Přihlaste se.'},{status:401});
 if(req.headers.get('origin')!==new URL(req.url).origin) return Response.json({error:'Nepovolený požadavek'},{status:403});
 const data=await req.json() as {items:unknown[];plan:unknown[]}; if(JSON.stringify(data).length>200000 || !Array.isArray(data.items)||!Array.isArray(data.plan)) return Response.json({error:'Neplatná data'},{status:400});
 await getDb().insert(hub).values({owner:u.userId,data:JSON.stringify(data)}).onConflictDoUpdate({target:hub.owner,set:{data:JSON.stringify(data)}});
 return Response.json({ok:true});
}
