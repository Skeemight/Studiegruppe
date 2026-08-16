# Leanowski · Beer Pong Liga

Point- og turneringstracker til baren Leanowski. Én selvstændig HTML-fil uden
build, server eller internetforbindelse: `public/leanowski.html`.

## Sådan kommer I i gang

**Fra mobilen:** https://claude.ai/code/artifact/00a7b4dc-d622-4772-ae05-64646a82ecb2

**Nemmest i baren:** åbn `leanowski.html` direkte i browseren på den
tablet/computer der står der, og gem den som bogmærke. Læg den på hjemmeskærmen
på en iPad, så åbner den som en app.

**Hvis Studiegruppe-sitet er deployet:** siden ligger også på
`https://<jeres-adresse>/leanowski.html`.

Vælg ét sted og bliv der. Hver enhed, browser og udgave har sin egen kopi af
dataene — skal sæsonen flyttes, går det gennem backup-filen.

## Hold og navne

Hold gemmes i sæsonen, så de bare skal sættes flueben ved næste gang. Skriver I
navnet ind igen, genkendes det uanset store bogstaver, mellemrum og tegnsætning
— "Bajer Boys", "bajer boys" og "Bajer-Boys" er samme hold.

Ligner et navn et hold der findes i forvejen, spørger appen først ("Mente du
Bajer Boys?"), så en tastefejl ikke deler pointene mellem to næsten ens navne
resten af sæsonen. Bevidst nummererede hold som "Hold 1" og "Hold 2" udløser
ikke spørgsmålet.

## Formatet

- Op til 16 hold, ren cup, 1 mod 1 hele vejen til finalen.
- Er I ikke præcis 2, 4, 8 eller 16 hold, sidder de bedst seedede hold over i
  første runde. 6 hold giver f.eks. et 8-mands bracket med 2 oversiddere.
- Taberne af de to semifinaler spiller bronzekamp **samtidig med finalen**.
  Begge kampe dukker op i "Klar til at spille nu" på én gang.

| Placering | Point |
|---|---|
| 🥇 1. plads | 4 |
| 🥈 2. plads | 3 |
| 🥉 3. plads | 2 |
| 4️⃣ 4. plads | 1 |

## Sæsonen er allerede i gang

Er der spillet turneringer før appen kom til, så tryk **⌨︎ Indtast tidligere** på
forsiden. Skriv navn, dato og hvem der blev nr. 1 til 4 — så lægges pointene til
sæsonen. Hold der ikke findes endnu, oprettes automatisk, og kendte navne
genkendes uanset store bogstaver. Ligner et navn et hold der findes i forvejen,
foreslås det rettede navn.

Nr. 3 og 4 kan stå tomme. Andre der deltog uden at komme på podiet kan sættes
på, så deres antal turneringer bliver rigtigt — de får ingen point.

Et indtastet resultat giver **ingen** kampstatistik, da kampene ikke kendes.
Det står mærket "indtastet" i Historik og kan rettes med **Ret**.

## Ret hvem der møder hvem

Skal to bestemte hold mødes, så tryk **⇄ Ret opstilling** under turneringen og
tryk derefter på to hold — de bytter plads. Det virker både på lodtrækningen og
midt i turneringen; holdene skal bare stå i samme runde.

Mens redigeringen er slået til, kan man ikke komme til at sætte vindere. Bytter
I om på hold der allerede har spillet, bliver netop de kampe nulstillet, og
appen fortæller hvor mange. ↺ fortryder hele byttet.

## Når noget går skævt

**Stavefejl i et holdnavn.** Tryk **✎ Omdøb hold** når du sætter en turnering op,
eller **Rediger hold** under Historik. Navnet rettes overalt — også i tidligere
turneringer — så point og historik følger med. Et navn der allerede findes,
afvises.

**Et hold møder ikke op til en kamp.** Tryk **Udeblevet?** øverst på kampen under
"Klar til at spille nu" og vælg hvem der manglede. Det andet hold går videre på
w.o., og kampen tæller ikke med i kampstatistikken.

**Et hold går hjem før de har spillet.** Vælg dem under **⇄ Ret opstilling** og
tryk **Træk ud**. Deres modstander går direkte videre. Har holdet allerede
spillet, brug w.o. i stedet — ellers ville en modstander de slog komme tilbage i
turneringen.

Bemærk at en turnering kan ende med kun tre præmieplaceringer, hvis der ikke er
nogen semifinaletaber at spille bronzekamp mod. Så uddeles 4+3+2 point.

## Sæsonen

Pointene stables op hen over sæsonen (typisk et halvt år). Forsiden viser altid
podiet over top 4 og hele stillingen. Ved lige point afgøres det af flest
førstepladser, så andenpladser, tredjepladser og til sidst antal vundne kampe.

Når sæsonen er slut trykker I **Start sæsonfinale med top 4** — de fire bedste
hold sættes automatisk op med nr. 1 mod nr. 4 og nr. 2 mod nr. 3. Bagefter
arkiverer **Afslut sæson** stillingen under Historik og starter en ny sæson med
blanke point (holdene kan følge med over).

## Sky-synk (valgfri)

Uden opsætning ligger sæsonen kun på den enhed I bruger. Slår I sky-synk til,
deler alle enheder den samme sæson — og så er backup-filen kun et ekstra sikkerhedsnet.

Sådan sættes det op (kan gøres helt fra en telefon):

1. Opret et gratis projekt på [supabase.com](https://supabase.com) — vælg region
   Frankfurt eller Stockholm.
2. Åbn **SQL Editor** → **New query**, indsæt hele `supabase/leanowski-sync.sql`
   fra dette repo, og tryk **Run**.
3. Gå til **Project Settings → API** og kopiér **Project URL** og **anon public**-nøglen.
4. Åbn trackeren → 💾 → **☁︎ Sky-synk mellem enheder**. Indsæt de to værdier,
   tryk **Lav en ny liga-kode**, og tryk **Gem og forbind**.
5. På de andre enheder: samme URL og nøgle, men skriv **den samme liga-kode**.
   De henter så sæsonen ned.

**Liga-koden er adgangen.** Den der har den, kan læse og rette sæsonen. Del den
kun med dem der skal kunne det. Nøglerne gemmes kun i browseren og følger ikke
med i en backup-fil.

**Hvis to enheder retter samtidig** overskriver appen ikke af sig selv. Den
melder konflikt og lader jer vælge hvilken version der skal gælde.

**Uden net** virker appen videre og gemmer lokalt. Den sender når forbindelsen
er tilbage — og melder konflikt hvis nogen nåede at rette imens.

**Vigtigt om gratis-niveauet:** Supabase pauser projekter efter ca. en uges
inaktivitet, og et pauset projekt skal startes manuelt igen. Derfor ligger der
en GitHub Action i `.github/workflows/leanowski-keepalive.yml` der holder det
vågent. Den skal have to secrets for at virke — se filen.

## Backup — vigtigt

Alt gemmes automatisk i browseren på den enhed I bruger, også uden internet.
Men browserdata kan blive ryddet, og en anden enhed har sin egen kopi. Derfor:

1. Tryk på 💾 efter hver turnering og hent backup-filen.
2. Læg filen i Dropbox/Drive eller mail den til jer selv.
3. Skal sæsonen over på en ny enhed: 💾 → **Indlæs backup-fil**.

Appen minder selv om det, hvis der er gået mere end en uge. Virker download ikke
(f.eks. i en indlejret browser), så brug **Kopiér data som tekst** i stedet.

## Fejlklik

Tryk på det samme hold igen for at fjerne resultatet, eller brug ↺ oppe i
hjørnet. Færdige turneringer kan altid rettes bagefter under Historik → **Ret**.
Ændres en tidlig kamp, nulstilles kun de kampe der lå efter den.

## Test

Turneringslogikken (bracket, oversiddere, bronzekamp, point, stilling) er dækket
af tests der kører den rigtige kode direkte fra HTML-filen:

```bash
npm run test:leanowski
```

## Læg den på jeres egen adresse

Trackeren er én statisk fil, så den kan ligge hvor som helst. Byg den til en
mappe hostene forstår:

```bash
npm run build:leanowski     # -> dist/index.html + robots.txt
```

Filen bliver til `index.html`, så adressen bliver ren — `https://liga.eksempel.dk/`
og ikke `.../leanowski.html`.

**Cloudflare Pages eller Vercel** (gratis, kan sættes op fra en telefon):
forbind GitHub-repoet, sæt build-kommandoen til `npm run build:leanowski` og
output-mappen til `dist`. Derefter opdaterer siden sig selv hver gang der
pushes.

**Eget domæne** er det der reelt gør adressen professionel. Både Cloudflare
Pages og Vercel tager et domæne gratis — man peger en CNAME på dem. Har baren
allerede et domæne, koster et underdomæne som `liga.` ingenting.

Appen medbringer sit eget ikon og hedder "Léanowski Liga" på hjemmeskærmen,
uanset hvor den ligger.

## Den hostede udgave

`public/leanowski.html` er den eneste kildefil. Den hostede kopi genereres ud af
den, så de to ikke kan drive fra hinanden:

```bash
node scripts/build-leanowski-artifact.js /sti/til/leanowski-liga.html
```

Er filen ændret, skal den hostede udgave bygges og lægges op igen på **samme
URL** — ellers ender I med to sider og to adskilte sæsoner.
