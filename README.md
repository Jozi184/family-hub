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

Samostatný profil (jméno a barva) se serverově váže na identitu přihlášeného uživatele. Kalendář, nákupy a jídelníček sdílí členové společné domácnosti přes Supabase Auth a RLS. Soukromý Site nyní umožňuje přístup pouze vlastníkovi.

Externí Google a iCloud kalendáře lze odebírat pro čtení přes iCal odkaz. Konverzační AI zatím není připojená. Připravené návrhy jídel využívají pouze místní recepty. Cesty a Domov jsou zatím označené jako připravované sekce.

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
- AI nadále není připojená. Google a iCloud kalendáře nyní podporují odběr iCal; přihlášení přes OAuth ani obousměrné úpravy nejsou součástí propojení.

Původní D1 data zůstávají zachovaná. Správce je může přes nastavení domácnosti přenést do prázdné domácnosti, pokud přihlášený a ověřený Supabase e-mail odpovídá původní identitě ChatGPT. Přenos vyžaduje potvrzení kliknutím a nepřepisuje existující data.

## Připojené Google a Apple/iCloud kalendáře

V Rodinném kalendáři vyberte Připojit Google kalendář nebo Připojit Apple / iCloud. Každý člen připojuje vlastní zdroje a výslovně potvrzuje sdílení jejich názvů, časů a poznámek s aktuální domácností. Převzaté události jsou pouze pro čtení a nepřepisují ručně vytvořené rodinné události.

Google používá tajnou adresu iCal (Nastavení → příslušný kalendář → Integrovat kalendář). iCloud používá veřejný webcal odkaz, jehož držitel může kalendář číst; formulář vyžaduje samostatné potvrzení této vlastnosti. Aplikace sama nezapíná veřejné sdílení. Lokální Apple kalendáře bez iCloud nejsou podporované.

Odkazy se ukládají odděleně v `family_calendar_connections`, s RLS dovolující čtení jen vlastníku. Rodina vidí pouze oddělené snapshots v `family_calendar_snapshots`. Žádný odkaz ani provider heslo není v repozitáři, rodinném API nebo klientských seznamech. Server ověřuje přesné domény a cesty Google/iCloud, zakazuje přesměrování a omezuje velikost a dobu načítání.

Načítáme období posledních 30 dní až 365 dní dopředu. Každý zdroj podporuje nejvýše 3 000 výskytů, soubor do 3 MB a omezené rozbalování opakování. ICAL.js zpracovává RRULE, RDATE, EXDATE, změny jednotlivých výskytů, VTIMEZONE a celodenní výlučný DTEND. Časy se zobrazují v Europe/Prague.

Vlastní zdroje se načítají při otevření aplikace a následně přibližně každých 5 minut, dokud je aplikace viditelná. Rodina načítá uložené snapshots každou minutu. Poskytovatel může iCal aktualizovat se zpožděním. Bez otevřené aplikace vlastníka není naplánovaná synchronizace; rodina vidí čas posledního úspěšného načtení. Po selhání načítání zůstávají původní události a zobrazí se chyba. Ruční Obnovit má minimum 60 sekund mezi úspěšnými načteními. Odpojení smaže odběr a jeho snapshot, původní kalendář nezmění; odkaz lze zneplatnit u poskytovatele.

Nejsou aktivované placené služby. Testy `tests/calendar-feed.test.mjs` ověřují opakování, výjimky a zrušení, časová pásma, hranice dnů, povolené adresy a limity. `tests/calendar-subscriptions-rls.sql` ověřuje izolaci tajných odkazů a sdílení snapshots s rolí authenticated; vše se vrací pomocí ROLLBACK. Živý soukromý kalendář nebyl připojen bez uživatelem vloženého odkazu.
