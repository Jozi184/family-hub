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

## Supabase účty a společná domácnost

Supabase projekt: `ogactctbykvhlwayfwtt`, region Frankfurt (`eu-central-1`), organizace na Free plánu. Nebyl objednán placený tarif ani SMTP.

Aplikace má skutečné formuláře pro registraci e-mailem a heslem, přihlášení, odhlášení a obnovu hesla přes Supabase Auth. Nový účet vytvoří vlastní domácnost nebo přijme kód pozvánky. Domácnost sdílí nákupy, presety, jídelníček a kalendář; osobní události mají vlastníka a barvu jeho profilu. Změny se kontrolují pomocí revize a ostatní zařízení obnovují data každých 10 sekund.

Data chrání RLS podle členství v domácnosti, nikoli podle uživatelských metadat. Pozvánky mají náhodný kód, platnost 7 dní, nejvýše 4 použití a v databázi se ukládá pouze jejich hash. Každý účet může být členem jedné domácnosti. V první verzi je maximum 5 členů. Správce může obnovit kód pozvánky; tím starý kód přestane platit.

Runtime konfigurace: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` (veřejný klíč pro klienta, nikoli service-role klíč). Žádné privilegované Supabase klíče nejsou v klientu ani repozitáři.

### Zbývající nastavení

- Současný Sites hosting je nadále owner-private. Pro používání bez ChatGPT účtu a přístup členů rodiny je nutné výslovně schválit změnu na veřejnou přihlašovací stránku; data zůstávají chráněná Supabase Auth a RLS.
- V Supabase Authentication / URL Configuration nastavte Site URL a Redirect URL na `https://family-hub-josef.josef-dolezal838830.chatgpt.site/`.
- Výchozí SMTP doručuje pouze adresám členů organizace a má omezený počet e-mailů. Registrace dalších lidí a obnova hesla vyžadují zprovoznění vhodného odesílání e-mailů. Potvrzování e-mailů nebylo vypnuto.
- Google/Apple synchronizace a AI nejsou součástí této změny a nadále nejsou připojené.

Původní D1 data zůstávají zachovaná. Správce je může přes nastavení domácnosti přenést do prázdné domácnosti, pokud přihlášený a ověřený Supabase e-mail odpovídá původní identitě ChatGPT. Přenos vyžaduje potvrzení kliknutím a nepřepisuje existující data.
