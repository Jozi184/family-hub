import { getChatGPTUser } from '../../chatgpt-auth';
import { getDb } from '../../../db';
import { hub } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import { hubStateSchema } from '../../../lib/family/state-schema';
export async function GET() {
 const u=await getChatGPTUser(); if(!u) return Response.json({error:'Přihlaste se.'},{status:401});
 const rows=await getDb().select().from(hub).where(eq(hub.owner,u.userId));
 return Response.json(rows[0]?JSON.parse(rows[0].data):null);
}
export async function POST(req:Request) {
 const u=await getChatGPTUser(); if(!u) return Response.json({error:'Přihlaste se.'},{status:401});
 if(req.headers.get('origin')!==new URL(req.url).origin) return Response.json({error:'Nepovolený požadavek'},{status:403});
 let payload: unknown;
 try { payload = await req.json(); } catch { return Response.json({error:'Neplatná data'},{status:400}); }
 if (JSON.stringify(payload).length > 200000) return Response.json({error:'Příliš mnoho dat'},{status:400});
 const parsed = hubStateSchema.safeParse(payload);
 if (!parsed.success) return Response.json({error:'Neplatná data'},{status:400});
 const data = parsed.data;
 // Old clients that omit presets must not erase the saved presets.
 if (data.presets === undefined) {
  const previous = await getDb().select().from(hub).where(eq(hub.owner,u.userId));
  data.presets = previous[0] ? (JSON.parse(previous[0].data).presets ?? []) : [];
 }
 await getDb().insert(hub).values({owner:u.userId,data:JSON.stringify(data)}).onConflictDoUpdate({target:hub.owner,set:{data:JSON.stringify(data)}});
 return Response.json({ok:true});
}
