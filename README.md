# Family Hub

Nákupy, jídelníček a recepty. Vývoj na GitHubu, provoz na ChatGPT Sites.

Instalace: `pnpm install`. Kontrola: `pnpm exec tsc --noEmit`. Build: `pnpm build`.
Testy presetů: `node --experimental-strip-types --test tests/shopping-presets.test.mjs`.

## Nákupní presety

V záložce Nákupy lze vytvářet pojmenované presety (například Týdenní nákup), upravovat jejich položky, množství a kategorie, mazat presety nebo uložit aktuální neodškrtnuté položky jako nový preset.

Přidání presetu přeskočí položky se stejným názvem, které už čekají na nákup; jejich množství zůstane zachované. Odškrtnuté položky nebrání přidání položky pro nový nákup. Název se porovnává bez ohledu na velikost písmen a krajní mezery.

Data a presety jsou v D1 pod přihlášeným účtem. Starší data bez presetů zůstávají platná. Sdílení domácnosti a konverzační AI zatím nejsou implementovány.
