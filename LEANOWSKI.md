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

## Sæsonen

Pointene stables op hen over sæsonen (typisk et halvt år). Forsiden viser altid
podiet over top 4 og hele stillingen. Ved lige point afgøres det af flest
førstepladser, så andenpladser, tredjepladser og til sidst antal vundne kampe.

Når sæsonen er slut trykker I **Start sæsonfinale med top 4** — de fire bedste
hold sættes automatisk op med nr. 1 mod nr. 4 og nr. 2 mod nr. 3. Bagefter
arkiverer **Afslut sæson** stillingen under Historik og starter en ny sæson med
blanke point (holdene kan følge med over).

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

## Den hostede udgave

`public/leanowski.html` er den eneste kildefil. Den hostede kopi genereres ud af
den, så de to ikke kan drive fra hinanden:

```bash
node scripts/build-leanowski-artifact.js /sti/til/leanowski-liga.html
```

Er filen ændret, skal den hostede udgave bygges og lægges op igen på **samme
URL** — ellers ender I med to sider og to adskilte sæsoner.
