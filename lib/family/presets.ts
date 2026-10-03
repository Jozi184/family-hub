export const shoppingCategories = ['Ovoce a zelenina', 'Pečivo', 'Maso a ryby', 'Mléčné a vejce', 'Trvanlivé', 'Drogerie', 'Ostatní'];
export type ShoppingItem = { id: string; name: string; qty: string; cat: string; done: boolean };
export type PresetItem = { name: string; qty: string; cat: string };
export type ShoppingPreset = { id: string; name: string; items: PresetItem[] };
export function itemKey(name: string) { return name.trim().normalize('NFC').toLocaleLowerCase('cs'); }
// Applying a preset leaves existing, unbought items and their quantities intact.
// Bought items do not prevent a fresh item from being added for the next shop.
export function applyShoppingPreset(items: ShoppingItem[], preset: ShoppingPreset, newId: () => string) {
  const keys = new Set(items.filter(item => !item.done).map(item => itemKey(item.name)));
  const added: ShoppingItem[] = [];
  for (const item of preset.items) {
    const key = itemKey(item.name);
    if (!keys.has(key)) {
      added.push({ ...item, id: newId(), done: false });
      keys.add(key);
    }
  }
  return { items: [...items, ...added], added: added.length, skipped: preset.items.length - added.length };
}
