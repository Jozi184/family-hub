import test from 'node:test';
import assert from 'node:assert/strict';
import { applyShoppingPreset } from '../lib/family/presets.ts';
import { hubStateSchema } from '../lib/family/state-schema.ts';
const milk = {name:'Mléko',qty:'2 l',cat:'Mléčné a vejce'};
const bread = {name:'Chléb',qty:'1 ks',cat:'Pečivo'};
const preset = {id:'weekly',name:'Týdenní nákup',items:[milk,bread]};
let n=0;
const id=()=>`new-${++n}`;
test('Applying twice keeps quantities and avoids duplicates, including name case and whitespace',()=>{
 const items=[{id:'milk',name:' mléko ',qty:'1 l',cat:milk.cat,done:false}];
 const snapshot=structuredClone(items);
 const first=applyShoppingPreset(items,preset,id);
 assert.equal(first.added,1);assert.equal(first.skipped,1);assert.equal(first.items[0].qty,'1 l');
 const second=applyShoppingPreset(first.items,preset,id);
 assert.equal(second.added,0);assert.deepEqual(second.items,first.items);
 assert.deepEqual(items,snapshot);assert.deepEqual(preset.items,[milk,bread]);
});
test('Bought items can be added again while preserving purchase history',()=>{
 const bought={...milk,id:'old',done:true};
 const result=applyShoppingPreset([bought],preset,id);
 assert.equal(result.added,2);assert.deepEqual(result.items[0],bought);
 assert.equal(result.items[1].done,false);assert.notEqual(result.items[1].id,bought.id);
});
test('Repeated names inside a preset add only one pending shopping item',()=>{
 const result=applyShoppingPreset([],{...preset,items:[milk,{...milk,name:'MLÉKO'}]},id);
 assert.equal(result.added,1);assert.equal(result.skipped,1);
});
test('Legacy data remains valid; saved presets retain names, quantities and categories',()=>{
 const legacy={items:[{...milk,id:'one',done:false}],plan:[{date:'2026-10-05',recipe:0,servings:2}]};
 assert.deepEqual(hubStateSchema.parse(legacy),legacy);
 const withPreset={...legacy,presets:[preset]};
 assert.deepEqual(hubStateSchema.parse(withPreset),withPreset);
 assert.equal(hubStateSchema.safeParse({...legacy,presets:[{...preset,items:[{...milk,name:' '}]}]}).success,false);
});
