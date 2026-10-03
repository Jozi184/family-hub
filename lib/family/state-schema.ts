import { z } from 'zod';
const presetItem = z.object({
 name: z.string().trim().min(1).max(100),
 qty: z.string().trim().min(1).max(40),
 cat: z.enum(['Ovoce a zelenina','Pečivo','Maso a ryby','Mléčné a vejce','Trvanlivé','Drogerie','Ostatní'])
});
export const hubStateSchema = z.object({
 items: z.array(z.unknown()),
 plan: z.array(z.unknown()),
 presets: z.array(z.object({
  id: z.string().min(1).max(100),
  name: z.string().trim().min(1).max(80),
  items: z.array(presetItem).min(1).max(100)
 })).max(100).optional()
}).passthrough();
