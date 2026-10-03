# Family Hub

Nákupy, jídelníček a recepty. Vývoj na GitHubu, provoz na ChatGPT Sites.

Instalace: `pnpm install`. Kontrola: `pnpm exec tsc --noEmit`. Build: `pnpm build`.
Testy presetů: `node --experimental-strip-types --test tests/shopping-presets.test.mjs`.

## Nákupní presety

V záložce Nákupy lze vytvářet pojmenované presety (například Týdenní nákup), upravovat jejich položky, množství a kategorie, mazat presety nebo uložit aktuální neodškrtnuté položky jako nový preset.

Přidání presetu přeskočí položky se stejným názvem, které už čekají na nákup; jejich množství zůstane zachované. Odškrtnuté položky nebrání přidání položky pro nový nákup. Název se porovnává bez ohledu na velikost písmen a krajní mezery.

Data a presety jsou v D1 pod přihlášeným účtem. Starší data bez presetů zůstávají platná. Sdílení domácnosti a konverzační AI zatím nejsou implementovány.

## Rodinný kalendář a profily

Úvodní stránka obsahuje datum v časové zóně Europe/Prague, české jmeniny, odpočet do nejbližší události a měsíční kalendář. Události lze vytvářet, upravovat a mazat, včetně celodenních a vícedenních aktivit. Osobní aktivity používají barvu přihlášeného profilu; společné aktivity mají fialovou barvu.

Samostatný profil (jméno a barva) se serverově váže na identitu přihlášeného uživatele. Aktuální data kalendáře a nákupů jsou nadále oddělená podle účtů. Společná domácnost, členství a pozvánky mezi účty zatím nejsou aktivní. Soukromý Site nyní umožňuje přístup pouze vlastníkovi.

Google/Apple synchronizace a konverzační AI zatím nejsou připojené. Připravené návrhy jídel využívají pouze místní recepty. Cesty a Domov jsou zatím označené jako připravované sekce.

České svátky: https://ppropo.mpsv.cz/zakon_245_2000
Jmeniny: knihovna namedays-cs (MIT), https://github.com/OzzyCzech/namedays-cs

Testy kalendáře a presetů: `node --experimental-strip-types --test tests/*.test.mjs`.
