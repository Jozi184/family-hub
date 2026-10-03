import { getChatGPTUser } from '../../chatgpt-auth';
import { getDb } from '../../../db';
import { profiles } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
const schema=z.object({name:z.string().trim().min(1).max(60),color:z.enum(['#416443','#4267ac','#b77727','#ba5757','#33827f'])});
export async function GET() {
 const user=await getChatGPTUser();if(!user)return Response.json({error:'Přihlaste se.'},{status:401});
 const rows=await getDb().select().from(profiles).where(eq(profiles.userId,user.userId));
 return Response.json(rows[0]?{name:rows[0].name,color:rows[0].color}:{name:user.displayName,color:'#416443'},{headers:{'Cache-Control':'private, no-store'}});
}
export async function POST(req:Request) {
 const user=await getChatGPTUser();if(!user)return Response.json({error:'Přihlaste se.'},{status:401});
 if(req.headers.get('origin')!==new URL(req.url).origin)return Response.json({error:'Nepovolený požadavek'},{status:403});
 let body:unknown;try{body=await req.json()}catch{return Response.json({error:'Neplatná data'},{status:400})}
 const parsed=schema.safeParse(body);if(!parsed.success)return Response.json({error:'Vyplň jméno a zvol barvu.'},{status:400});
 await getDb().insert(profiles).values({userId:user.userId,...parsed.data}).onConflictDoUpdate({target:profiles.userId,set:parsed.data});
 return Response.json(parsed.data,{headers:{'Cache-Control':'private, no-store'}});
}
