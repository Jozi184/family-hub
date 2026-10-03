'use client';
import { useState } from 'react';
import { Bookmark, Plus, Pencil, Trash2, ShoppingBasket, X } from 'lucide-react';
import { shoppingCategories, type ShoppingPreset, type PresetItem, type ShoppingItem } from '../lib/family/presets';
type Props = {
 presets: ShoppingPreset[]; items: ShoppingItem[]; disabled: boolean;
 onSave: (presets: ShoppingPreset[]) => Promise<boolean>;
 onApply: (preset: ShoppingPreset) => Promise<{ added: number; skipped: number } | null>;
};
export default function ShoppingPresets({ presets, items, disabled, onSave, onApply }: Props) {
 const [draft, setDraft] = useState<ShoppingPreset | null>(null);
 const [remove, setRemove] = useState<ShoppingPreset | null>(null);
 const [error, setError] = useState('');
 const [message, setMessage] = useState('');
 const [working, setWorking] = useState(false);
 const blocked = disabled || working;
 function open(preset?: ShoppingPreset, fromList = false) {
  setError('');
  setDraft(preset ? { ...preset, items: preset.items.map(item => ({ ...item })) } : {
   id: crypto.randomUUID(), name: fromList ? 'Týdenní nákup' : '',
   items: fromList ? items.filter(item => !item.done).map(({ name, qty, cat }) => ({ name, qty, cat })) : [{ name: '', qty: '1 ks', cat: shoppingCategories[0] }]
  });
 }
 function change(index: number, key: keyof PresetItem, value: string) {
  if (!draft) return;
  setDraft({ ...draft, items: draft.items.map((item, i) => i === index ? { ...item, [key]: value } : item) });
 }
 async function commit() {
  if (!draft || blocked) return;
  const clean = { ...draft, name: draft.name.trim(), items: draft.items.map(item => ({ ...item, name: item.name.trim(), qty: item.qty.trim() })) };
  if (!clean.name) { setError('Pojmenuj preset, například Týdenní nákup.'); return; }
  if (!clean.items.length || clean.items.some(item => !item.name || !item.qty)) { setError('Vyplň název a množství u každé položky.'); return; }
  if (presets.some(preset => preset.id !== clean.id && preset.name.trim().toLocaleLowerCase('cs') === clean.name.toLocaleLowerCase('cs'))) { setError('Preset s tímto názvem už existuje. Vyber jiný název.'); return; }
  setWorking(true);
  const next = presets.some(preset => preset.id === clean.id) ? presets.map(preset => preset.id === clean.id ? clean : preset) : [...presets, clean];
  const saved = await onSave(next);
  setWorking(false);
  if (saved) { setDraft(null); setMessage(`Preset „${clean.name}“ je uložený.`); }
  else setError('Preset se nepodařilo uložit. Zkus to znovu, položky zůstaly ve formuláři.');
 }
 async function apply(preset: ShoppingPreset) {
  if (blocked) return;
  setWorking(true);
  const result = await onApply(preset);
  setWorking(false);
  setMessage(result ? `Přidáno: ${result.added} položek.${result.skipped ? ` ${result.skipped} už je v seznamu; množství zůstalo stejné.` : ''}` : 'Přidání selhalo. Zkus to znovu.');
 }
 async function deletePreset() {
  if (!remove || blocked) return;
  setWorking(true);
  const saved = await onSave(presets.filter(preset => preset.id !== remove.id));
  setWorking(false);
  if (saved) { setRemove(null); setMessage('Preset byl smazaný. Nákupní seznam zůstal zachovaný.'); }
  else setError('Preset se nepodařilo smazat. Zkus to znovu.');
 }
 return <section className="card presets"><div className="sectionhead"><div><h2><Bookmark size={19}/> Moje nákupní presety</h2><p>Opakované nákupy připravené jedním kliknutím.</p></div><button className="primary" disabled={blocked} onClick={() => open()}><Plus size={17}/> Nový preset</button></div>
  <p role="status" aria-live="polite" className="presetmessage">{message}</p>
  {presets.length === 0 ? <div className="presetempty"><span className="preseticon"><ShoppingBasket size={26}/></span><div><h3>Co kupujete každý týden?</h3><p>Vytvoř si třeba „Týdenní nákup“, „Drogerie“ nebo „Na víkend“. Položky i množství si nastavíš sám.</p></div></div> : <div className="presetgrid">{presets.map(preset => <article className="presetcard" key={preset.id}><div className="presetcardhead"><h3>{preset.name}</h3><span>{preset.items.length} položek</span></div><p className="presetpreview">{preset.items.slice(0, 4).map(item => item.name).join(' · ')}{preset.items.length > 4 ? ' …' : ''}</p><div className="presetactions"><button className="primary" disabled={blocked} onClick={() => apply(preset)}><Plus size={16}/> Přidat do nákupu</button><button className="plain" aria-label={`Upravit preset ${preset.name}`} disabled={blocked} onClick={() => open(preset)}><Pencil size={17}/></button><button className="plain" aria-label={`Smazat preset ${preset.name}`} disabled={blocked} onClick={() => { setError(''); setRemove(preset); }}><Trash2 size={17}/></button></div></article>)}</div>}
  <div className="presetfoot"><small>Položky, které už čekají na nákup, nepřidáváme podruhé. Odškrtnuté položky se při dalším nákupu přidají znovu.</small><button disabled={blocked || !items.some(item => !item.done)} onClick={() => open(undefined, true)}><Bookmark size={16}/> Uložit aktuální seznam jako preset</button></div>
  {draft && <div className="overlay"><div className="modal presetmodal" role="dialog" aria-modal="true" aria-label="Úprava nákupního presetu"><button className="close" disabled={working} aria-label="Zavřít" onClick={() => setDraft(null)}><X size={22}/></button><h2>{presets.some(preset => preset.id === draft.id) ? 'Upravit preset' : 'Nový nákupní preset'}</h2><p>Ulož si své pravidelné položky. Později můžeš všechno upravit.</p><form onSubmit={event => { event.preventDefault(); void commit(); }}><fieldset disabled={working} className="presetfieldset"><label className="presetlabel">Název presetu<input autoFocus required maxLength={80} placeholder="Např. Týdenní nákup" value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })}/></label><div className="preseteditlist">{draft.items.map((item, index) => <div className="preseteditrow" key={index}><label>Název položky<input required maxLength={100} placeholder="Např. Mléko" value={item.name} onChange={event => change(index, 'name', event.target.value)}/></label><label>Množství<input required maxLength={40} placeholder="2 l" value={item.qty} onChange={event => change(index, 'qty', event.target.value)}/></label><label>Kategorie<select value={item.cat} onChange={event => change(index, 'cat', event.target.value)}>{shoppingCategories.map(category => <option key={category}>{category}</option>)}</select></label><button type="button" className="plain" aria-label={`Odebrat položku ${item.name || index + 1}`} onClick={() => setDraft({ ...draft, items: draft.items.filter((_, i) => i !== index) })}><Trash2 size={17}/></button></div>)}</div><button type="button" disabled={draft.items.length >= 100} onClick={() => setDraft({ ...draft, items: [...draft.items, { name: '', qty: '1 ks', cat: shoppingCategories[0] }] })}><Plus size={17}/> Další položka</button><p role="alert" className="preseterror">{error}</p><div className="presetmodalfoot"><button type="button" disabled={working} onClick={() => setDraft(null)}>Zrušit</button><button className="primary" disabled={blocked}>Uložit preset</button></div></fieldset></form></div></div>}
  {remove && <div className="overlay"><div className="modal" role="dialog" aria-modal="true" aria-label="Smazat preset"><h2>Smazat „{remove.name}“?</h2><p>Smaže se uložený preset. Položky v nákupním seznamu zůstanou.</p><p role="alert" className="preseterror">{error}</p><div className="controls"><button disabled={working} onClick={() => setRemove(null)}>Zrušit</button><button className="primary" disabled={blocked} onClick={deletePreset}>Smazat preset</button></div></div></div>}
 </section>
}
