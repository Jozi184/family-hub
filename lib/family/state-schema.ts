import { z } from 'zod';
const calendarDate=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value=>{const d=new Date(value+'T12:00:00Z');return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===value&&value>='1900-01-01'&&value<='2200-12-31';});
const presetItem = z.object({
 name: z.string().trim().min(1).max(100),
 qty: z.string().trim().min(1).max(40),
 cat: z.enum(['Ovoce a zelenina','Pečivo','Maso a ryby','Mléčné a vejce','Trvanlivé','Drogerie','Ostatní'])
});
export const hubStateSchema = z.object({
 items: z.array(z.object({id:z.string().min(1).max(100),name:z.string().trim().min(1).max(100),qty:z.string().max(40),cat:z.enum(['Ovoce a zelenina','Pečivo','Maso a ryby','Mléčné a vejce','Trvanlivé','Drogerie','Ostatní']),done:z.boolean()})).max(2000),
 plan: z.array(z.object({date:calendarDate,recipe:z.number().int().min(0).max(5),servings:z.number().int().min(1).max(20)})).max(2000),
 events: z.array(z.object({id:z.string().min(1).max(100),title:z.string().trim().min(1).max(100),ownerId:z.string().uuid().optional(),date:calendarDate,endDate:calendarDate,time:z.string().regex(/^(?:|(?:[01]\d|2[0-3]):[0-5]\d)$/),audience:z.enum(['me','shared']),note:z.string().max(1500)}).refine(event=>event.endDate>=event.date,{message:'Konec nesmí být před začátkem.'})).max(1000).optional(),
 presets: z.array(z.object({
  id: z.string().min(1).max(100),
  name: z.string().trim().min(1).max(80),
  items: z.array(presetItem).min(1).max(100)
 })).max(100).optional()
}).passthrough();
