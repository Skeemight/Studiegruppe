/**
 * Tester turneringslogikken i public/leanowski.html uden en browser.
 *
 * Koden mellem LOGIC-START og LOGIC-END i HTML-filen er ren logik uden DOM,
 * så den kan hentes ud og køres direkte her.
 *
 *   node scripts/leanowski-test.js
 */
const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'public', 'leanowski.html');
const src = fs.readFileSync(htmlPath, 'utf8');

const startMarker = src.indexOf('LOGIC-START');
const endMarker = src.indexOf('LOGIC-END');
if (startMarker < 0 || endMarker < 0) {
  console.error('Kunne ikke finde LOGIC-START/LOGIC-END i ' + htmlPath);
  process.exit(1);
}
const code = src.slice(src.indexOf('*/', startMarker) + 2, src.lastIndexOf('/*', endMarker));

const logic = new Function(
  code +
  '; return { POINTS, MAX_TEAMS, bracketSizeFor, seedOrder, buildSlots, buildBracket,' +
  ' allMatches, readyMatches, computeStandings, roundName, loserOf, placeOf,' +
  ' normName, editDistance, nearestName,' +
  ' applyRoundSwaps, prunePicks, roundOccupants };'
)();

const {
  bracketSizeFor, seedOrder, buildSlots, buildBracket,
  readyMatches, computeStandings, roundName,
  normName, editDistance, nearestName,
  prunePicks, roundOccupants,
} = logic;

/* ---------- lille test-runner ---------- */
let pass = 0;
const failures = [];
function test(name, fn) {
  try { fn(); pass++; }
  catch (e) { failures.push(name + '\n      ' + e.message); }
}
function eq(actual, expected, what) {
  const a = JSON.stringify(actual), b = JSON.stringify(expected);
  if (a !== b) throw new Error((what || 'værdi') + ': fik ' + a + ', forventede ' + b);
}
function ok(cond, what) {
  if (!cond) throw new Error(what || 'forventede true');
}

/* ---------- hjælpere ---------- */
function teams(n) {
  return Array.from({ length: n }, (_, i) => ({ id: 't' + (i + 1), name: 'Hold ' + (i + 1) }));
}
function tournament(n, opts = {}) {
  const ids = teams(n).map(t => t.id);
  const size = bracketSizeFor(n);
  return {
    id: 'tour', name: 'Test', date: '2026-08-15',
    entrants: ids, slots: buildSlots(ids, size), picks: {}, ...opts,
  };
}
/** Spiller turneringen færdig: bedste seed vinder altid. */
function playFavourites(t) {
  let guard = 0;
  while (guard++ < 60) {
    const b = buildBracket(t);
    const ready = readyMatches(b);
    if (!ready.length) break;
    for (const m of ready) {
      const sa = t.entrants.indexOf(m.a), sb = t.entrants.indexOf(m.b);
      t.picks[m.id] = sa < sb ? m.a : m.b;
    }
  }
  return buildBracket(t);
}

/* ---------- struktur ---------- */
test('bracketSizeFor runder op til nærmeste 2-potens', () => {
  eq([2, 3, 4, 5, 8, 9, 12, 16].map(bracketSizeFor), [2, 4, 4, 8, 8, 16, 16, 16]);
});

test('seedOrder holder seed 1 og 2 adskilt til finalen', () => {
  eq(seedOrder(2), [1, 2]);
  eq(seedOrder(4), [1, 4, 2, 3]);
  eq(seedOrder(8), [1, 8, 4, 5, 2, 7, 3, 6]);
  eq(seedOrder(16), [1, 16, 8, 9, 4, 13, 5, 12, 2, 15, 7, 10, 3, 14, 6, 11]);
  const s16 = seedOrder(16);
  ok(s16.slice(0, 8).includes(1) && s16.slice(8).includes(2), 'seed 1 og 2 i hver sin halvdel');
});

test('buildSlots giver oversiddere til de bedste seeds', () => {
  const slots = buildSlots(['a', 'b', 'c', 'd', 'e'], 8);
  eq(slots, ['a', null, 'd', 'e', 'b', null, 'c', null]);
});

test('rundenavne er korrekte for 16 hold', () => {
  eq([0, 1, 2, 3].map(r => roundName(r, 4)), ['1/8-finale', 'Kvartfinale', 'Semifinale', 'Finale']);
  eq([0, 1].map(r => roundName(r, 2)), ['Semifinale', 'Finale']);
});

test('16 hold giver 4 runder og 8 åbningskampe', () => {
  const b = buildBracket(tournament(16));
  eq(b.nRounds, 4);
  eq(b.rounds.map(r => r.length), [8, 4, 2, 1]);
  eq(readyMatches(b).length, 8, 'kampe klar i første runde');
});

/* ---------- gennemspilning ---------- */
test('16 hold: bedste seed vinder, alle 4 placeringer fyldt', () => {
  const t = tournament(16);
  const b = playFavourites(t);
  ok(b.complete, 'turneringen skal være færdig');
  eq(b.places[1], 't1');
  eq(b.places[2], 't2');
  ok(b.places[3] && b.places[4], 'bronze og 4. plads afgjort');
  ok(b.places[3] !== b.places[4], '3. og 4. plads er forskellige hold');
});

test('finale og bronzekamp bliver klar samtidig', () => {
  const t = tournament(8);
  // Spil alt frem til, men ikke inklusive, finalen.
  for (let guard = 0; guard < 20; guard++) {
    const b = buildBracket(t);
    const pending = readyMatches(b).filter(m => m.id !== 'bronze' && m.id !== b.final.id);
    if (!pending.length) break;
    for (const m of pending) {
      const sa = t.entrants.indexOf(m.a), sb = t.entrants.indexOf(m.b);
      t.picks[m.id] = sa < sb ? m.a : m.b;
    }
  }
  const b = buildBracket(t);
  const ready = readyMatches(b);
  eq(ready.length, 2, 'to kampe tilbage');
  ok(ready.some(m => m.id === 'bronze'), 'bronzekampen er klar');
  ok(ready.some(m => m.id === b.final.id), 'finalen er klar');
  ok(!b.complete, 'ikke færdig før begge er spillet');

  // Kun finalen spillet -> stadig ikke færdig.
  t.picks[b.final.id] = b.final.a;
  ok(!buildBracket(t).complete, 'mangler bronzekampen');
  const b2 = buildBracket(t);
  t.picks.bronze = b2.bronze.a;
  ok(buildBracket(t).complete, 'færdig når bronzekampen også er spillet');
});

test('bronzedeltagerne er præcis de to semifinaletabere', () => {
  const t = tournament(4);
  const b0 = buildBracket(t);
  t.picks[b0.rounds[0][0].id] = b0.rounds[0][0].a;
  t.picks[b0.rounds[0][1].id] = b0.rounds[0][1].b;
  const b = buildBracket(t);
  eq([b.bronze.a, b.bronze.b], [b0.rounds[0][0].b, b0.rounds[0][1].a]);
});

test('5 hold: oversiddere håndteres og alle 4 placeringer fyldes', () => {
  const t = tournament(5);
  const b0 = buildBracket(t);
  eq(b0.size, 8);
  eq(b0.rounds[0].filter(m => m.bye).length, 3, 'tre oversiddere i første runde');
  eq(b0.rounds[0].filter(m => m.a && m.b).length, 1, 'kun én reel kamp i første runde');
  // To oversiddere kan møde hinanden med det samme, så den kamp er også klar.
  eq(readyMatches(b0).map(m => m.id), ['r0m1', 'r1m1'], 'begge spilbare kampe vises som klar');
  const b = playFavourites(t);
  ok(b.complete);
  eq(b.places[1], 't1');
  ok(b.places[3] && b.places[4], '3. og 4. plads afgjort');
});

test('3 hold: en semifinale er oversidder, så 3. plads gives uden bronzekamp', () => {
  const t = tournament(3);
  const b = playFavourites(t);
  ok(b.complete);
  eq(b.places[1], 't1');
  eq(b.places[2], 't2');
  eq(b.places[3], 't3');
  eq(b.places[4], undefined, 'ingen 4. plads med kun 3 hold');
  ok(b.bronze && b.bronze.bye, 'bronzekampen afgøres automatisk');
});

test('2 hold: ingen bronzekamp, kun 1. og 2. plads', () => {
  const t = tournament(2);
  const b = playFavourites(t);
  ok(b.complete);
  eq(b.bronze, null);
  eq(b.places[1], 't1');
  eq(b.places[2], 't2');
  eq(b.places[3], undefined);
});

test('resultatet følger klikkene, ikke seedingen', () => {
  const t = tournament(16);
  let guard = 0;
  while (guard++ < 60) {
    const b = buildBracket(t);
    const ready = readyMatches(b);
    if (!ready.length) break;
    for (const m of ready) t.picks[m.id] = m.b;   // altid nederste hold i kampen
  }
  const b = buildBracket(t);
  ok(b.complete);
  ok(b.places[1] !== 't1', 'topseedet vinder ikke bare automatisk');
  eq(b.places[1], 't11', 'vinderen er den der blev klikket hele vejen igennem');
});

/* ---------- rettelser og fortryd ---------- */
test('ændret resultat i en tidlig kamp rydder alt nedstrøms', () => {
  const t = tournament(8);
  playFavourites(t);
  ok(buildBracket(t).complete);

  // Lad taberen af den første kvartfinale vinde i stedet.
  const first = buildBracket(t).rounds[0][0];
  t.picks[first.id] = first.b;

  const b = buildBracket(t);
  ok(!b.complete, 'turneringen er ikke længere færdigspillet');
  const stale = Object.keys(t.picks).filter(id => {
    const m = logic.allMatches(b).find(x => x.id === id);
    return m && !(t.picks[id] === m.a || t.picks[id] === m.b);
  });
  ok(stale.length > 0, 'gamle valg findes og skal ryddes af pickWinner');
  ok(b.rounds[1][0].winner === null, 'semifinalen skal spilles om');
});

/* ---------- point og stilling ---------- */
test('point fordeles 4/3/2/1', () => {
  const s = { teams: teams(4), tournaments: [] };
  const t = tournament(4);
  playFavourites(t);
  s.tournaments.push(t);
  const st = computeStandings(s);
  eq(st.map(r => [r.name, r.points]), [
    ['Hold 1', 4], ['Hold 2', 3], ['Hold 3', 2], ['Hold 4', 1],
  ]);
  eq(st[0].p1, 1);
  eq(st.map(r => r.played), [1, 1, 1, 1]);
});

test('point stables op over flere turneringer', () => {
  const s = { teams: teams(4), tournaments: [] };
  const a = tournament(4);
  playFavourites(a);                                  // 1,2,3,4
  const b = tournament(4, { id: 'tour2' });
  b.entrants = ['t4', 't3', 't2', 't1'];              // omvendt seeding
  b.slots = buildSlots(b.entrants, 4);
  playFavourites(b);                                  // 4,3,2,1
  s.tournaments.push(a, b);
  const st = computeStandings(s);
  // Alle fire har 4+1 eller 3+2 point = 5. Guld tæller først, så vinderne ligger øverst.
  eq(st.map(r => r.points), [5, 5, 5, 5]);
  eq(st.map(r => r.name).sort(), ['Hold 1', 'Hold 2', 'Hold 3', 'Hold 4']);
  eq(st.map(r => r.played), [2, 2, 2, 2]);
  eq(st.slice(0, 2).map(r => r.p1), [1, 1], 'de to guldvindere ligger først');
  eq(st.map(r => r.rank), [1, 1, 3, 3], 'lige på alle kriterier = delt placering');
});

test('uafsluttet turnering giver ingen point', () => {
  const s = { teams: teams(4), tournaments: [tournament(4)] };
  const st = computeStandings(s);
  eq(st.map(r => r.points), [0, 0, 0, 0]);
  eq(st.map(r => r.played), [0, 0, 0, 0]);
});

test('flest førstepladser afgør ved lige point', () => {
  const s = { teams: teams(4), tournaments: [] };
  // Turnering 1: 1,2,3,4   Turnering 2: 2,1,3,4
  const a = tournament(4);
  playFavourites(a);
  const b = tournament(4, { id: 'tour2' });
  b.entrants = ['t2', 't1', 't3', 't4'];
  b.slots = buildSlots(b.entrants, 4);
  playFavourites(b);
  s.tournaments.push(a, b);
  const st = computeStandings(s);
  eq(st[0].points, st[1].points, 'de to øverste har lige mange point');
  eq(st.map(r => r.p1 + '-' + r.p2).slice(0, 2), ['1-1', '1-1']);
  eq(st[0].rank, 1);
  eq(st[1].rank, 1, 'stadig helt lige — delt plads');
});

test('kampstatistik tælles uden oversiddere', () => {
  const s = { teams: teams(3), tournaments: [] };
  const t = tournament(3);
  playFavourites(t);
  s.tournaments.push(t);
  const st = computeStandings(s);
  const row = Object.fromEntries(st.map(r => [r.name, r.wins + '-' + r.losses]));
  // Hold 1 sad over i semien og vandt finalen: 1-0. Hold 2: vandt semi, tabte finale.
  eq(row['Hold 1'], '1-0');
  eq(row['Hold 2'], '1-1');
  eq(row['Hold 3'], '0-1');
});

/* ---------- turneringslederen retter opstillingen ---------- */
function swapFirstRound(t, posA, posB) {          // som pickSwap gør det i runde 0
  const tmp = t.slots[posA];
  t.slots[posA] = t.slots[posB];
  t.slots[posB] = tmp;
  return prunePicks(t);
}

test('ombytning i første runde ændrer hvem der møder hvem', () => {
  const t = tournament(4);                        // slots: t1,t4,t2,t3
  const before = buildBracket(t).rounds[0].map(m => [m.a, m.b]);
  eq(before, [['t1', 't4'], ['t2', 't3']]);
  swapFirstRound(t, 1, 2);                        // byt t4 og t2
  eq(buildBracket(t).rounds[0].map(m => [m.a, m.b]), [['t1', 't2'], ['t4', 't3']]);
});

test('ombytning før der er spillet nulstiller ingenting', () => {
  const t = tournament(8);
  eq(swapFirstRound(t, 0, 5), 0, 'ingen resultater at nulstille');
  eq(Object.keys(t.picks).length, 0);
});

test('ombytning nulstiller kun de kampe der bliver ugyldige', () => {
  // 8 hold ligger på plads 0-7 som t1,t8,t4,t5,t2,t7,t3,t6 — altså
  // kamp0=plads 0-1, kamp1=plads 2-3, kamp2=plads 4-5, kamp3=plads 6-7.
  const t = tournament(8);
  const b0 = buildBracket(t);
  t.picks[b0.rounds[0][0].id] = b0.rounds[0][0].a;   // spil kamp0
  t.picks[b0.rounds[0][1].id] = b0.rounds[0][1].a;   // og kamp1
  eq(Object.keys(t.picks).length, 2);

  // Byt to hold i den anden halvdel: de spillede kampe skal overleve.
  eq(swapFirstRound(t, 4, 6), 0, 'kampe i den anden halvdel må ikke røres');
  eq(Object.keys(t.picks).length, 2);

  // Byt nu et hold der HAR spillet, med et der ikke har.
  eq(swapFirstRound(t, 0, 4), 1, 'kun den berørte kamp nulstilles');
  eq(Object.keys(t.picks).length, 1, 'kamp1 står stadig');
});

test('ombytning inden for samme kamp ændrer ikke resultatet', () => {
  // Plads 0 og 1 er de to hold i samme kamp — de mødes uanset rækkefølgen.
  // (Brugerfladen blokerer det, men logikken skal heller ikke smide resultatet væk.)
  const t = tournament(8);
  const b0 = buildBracket(t);
  t.picks[b0.rounds[0][0].id] = b0.rounds[0][0].a;
  eq(swapFirstRound(t, 0, 1), 0, 'samme to hold, samme kamp');
  eq(buildBracket(t).rounds[0][0].winner, b0.rounds[0][0].a, 'vinderen står ved magt');
});

test('ombytning rydder også kampene længere fremme', () => {
  const t = tournament(8);
  playFavourites(t);
  ok(buildBracket(t).complete);
  const played = Object.keys(t.picks).length;
  const reset = swapFirstRound(t, 0, 2);          // på tværs af kamp0 og kamp1
  ok(reset >= 4, 'begge kvartfinaler, semifinalen, finalen og bronzekampen skal falde, fik ' + reset);
  ok(!buildBracket(t).complete, 'turneringen er ikke længere færdigspillet');
  eq(Object.keys(t.picks).length, played - reset);
});

test('hold kan bytte plads i en senere runde', () => {
  const t = tournament(8);
  const b0 = buildBracket(t);
  for (const m of b0.rounds[0]) t.picks[m.id] = m.a;   // øverste hold vinder alle
  const semis = buildBracket(t).rounds[1].map(m => [m.a, m.b]);
  const [[a1, b1], [a2, b2]] = semis;

  t.swaps = { 1: [[b1, a2]] };                    // byt de to midterste
  const after = buildBracket(t).rounds[1].map(m => [m.a, m.b]);
  eq(after, [[a1, a2], [b1, b2]], 'semifinalerne skal have nye modstandere');
  eq(prunePicks(t), 0, 'kvartfinalerne er uberørte');
  eq(Object.keys(t.picks).length, 4);
});

test('et bytte i en senere runde springes over hvis holdet ryger ud', () => {
  const t = tournament(8);
  const b0 = buildBracket(t);
  for (const m of b0.rounds[0]) t.picks[m.id] = m.a;
  const semis = buildBracket(t).rounds[1].map(m => [m.a, m.b]);
  const swapped = [semis[0][1], semis[1][0]];     // kamp1-vinderen og kamp2-vinderen
  t.swaps = { 1: [swapped] };
  eq(buildBracket(t).rounds[1][0].b, swapped[1], 'byttet gælder');

  // Ret kvartfinalen så swapped[0] taber og aldrig når semifinalen.
  const q = buildBracket(t).rounds[0][1];
  t.picks[q.id] = q.b;

  const b = buildBracket(t);
  const occ = roundOccupants(b, 1);
  ok(occ.indexOf(swapped[0]) < 0, 'holdet der tabte er ude af semifinalen');
  ok(occ.indexOf(q.b) >= 0, 'og den nye vinder er kommet ind');
  eq(occ.indexOf(swapped[1]), 2, 'byttet er droppet, så det andet hold står på sin egen plads igen');
  eq(b.rounds.length, 3, 'bracketet har stadig sin normale form');
  ok(!b.rounds[1].some(m => m.a && m.a === m.b), 'intet hold må stå på begge pladser i en kamp');
});

test('roundOccupants giver rundens pladser i rækkefølge', () => {
  const t = tournament(4);
  const b = buildBracket(t);
  eq(roundOccupants(b, 0), ['t1', 't4', 't2', 't3']);
  eq(roundOccupants(b, 1), [null, null], 'finalen er ikke afgjort endnu');
});

test('point følger stadig placeringerne efter en ombytning', () => {
  const s = { teams: teams(4), tournaments: [] };
  const t = tournament(4);
  swapFirstRound(t, 1, 2);                        // t1 møder nu t2
  playFavourites(t);
  s.tournaments.push(t);
  const st = computeStandings(s);
  eq(st.reduce((sum, r) => sum + r.points, 0), 10, 'der uddeles stadig 4+3+2+1 point');
  eq(st[0].name, 'Hold 1');
  eq(st.filter(r => r.played === 1).length, 4, 'alle fire hold har spillet');
});

/* ---------- indtastede resultater fra turneringer spillet før appen ---------- */
function manual(places, extra = []) {
  return {
    id: 'm' + places.join(''), name: 'Gammel turnering', date: '2026-08-01',
    manual: true, places: Object.fromEntries(places.map((id, i) => [i + 1, id])),
    entrants: [...places, ...extra], slots: [], picks: {}, swaps: {}, wo: {},
  };
}

test('et indtastet resultat giver 4/3/2/1 point', () => {
  const s = { teams: teams(4), tournaments: [manual(['t1', 't2', 't3', 't4'])] };
  const st = computeStandings(s);
  eq(st.map(r => [r.name, r.points]), [
    ['Hold 1', 4], ['Hold 2', 3], ['Hold 3', 2], ['Hold 4', 1],
  ]);
  eq(st.map(r => r.played), [1, 1, 1, 1]);
});

test('et indtastet resultat opfinder ikke kampstatistik', () => {
  const s = { teams: teams(4), tournaments: [manual(['t1', 't2', 't3', 't4'])] };
  const st = computeStandings(s);
  eq(st.map(r => r.wins + '-' + r.losses), ['0-0', '0-0', '0-0', '0-0'],
    'vi kender ikke kampene, så der må ikke stå sejre');
  const b = buildBracket(s.tournaments[0]);
  ok(b.complete, 'det tæller som en færdig turnering');
  eq(logic.allMatches(b).length, 0, 'der er ingen kampe at vise');
  eq(readyMatches(b).length, 0);
});

test('kun nr. 1 og 2 udfyldt giver 4+3 point', () => {
  const s = { teams: teams(4), tournaments: [manual(['t1', 't2'])] };
  const st = computeStandings(s);
  eq(st.filter(r => r.points > 0).map(r => [r.name, r.points]), [['Hold 1', 4], ['Hold 2', 3]]);
  eq(st.filter(r => r.played === 1).length, 2, 'kun de to deltog');
});

test('andre deltagere tæller med som turnering, men uden point', () => {
  const s = { teams: teams(6), tournaments: [manual(['t1', 't2', 't3', 't4'], ['t5', 't6'])] };
  const st = computeStandings(s);
  const row = Object.fromEntries(st.map(r => [r.name, r.points + '/' + r.played]));
  eq(row['Hold 5'], '0/1', 'deltog, men fik ingen point');
  eq(row['Hold 6'], '0/1');
  eq(st.reduce((a, r) => a + r.points, 0), 10);
});

test('indtastede og spillede turneringer lægges sammen', () => {
  const played = tournament(4);
  playFavourites(played);
  const s = { teams: teams(4), tournaments: [manual(['t4', 't3', 't2', 't1']), played] };
  const st = computeStandings(s);
  eq(st.map(r => r.points), [5, 5, 5, 5], 'alle fire ender på 4+1 eller 3+2 point');
  eq(st.map(r => r.name).sort(), ['Hold 1', 'Hold 2', 'Hold 3', 'Hold 4']);
  eq(st.map(r => r.played), [2, 2, 2, 2]);
  // Sejrene kommer kun fra den spillede turnering.
  eq(st.reduce((a, r) => a + r.wins, 0), 4, 'kun den spillede turnerings 4 kampe tælles');
});

/* ---------- udtrukne hold og w.o. ---------- */
test('et hold trukket ud sender modstanderen direkte videre', () => {
  const t = tournament(8);
  const before = buildBracket(t).rounds[0][0];
  const gone = before.a;
  t.slots[t.slots.indexOf(gone)] = null;
  t.entrants = t.entrants.filter(x => x !== gone);
  const m = buildBracket(t).rounds[0][0];
  eq(m.a, null);
  eq(m.winner, before.b, 'modstanderen går videre');
  ok(m.bye, 'kampen er markeret som oversidder');
});

test('en helt tom gren låser ikke bracketet fast', () => {
  // Begge hold i kamp 0 trækkes ud: semifinalen må ikke vente på en kamp der aldrig kommer.
  const t = tournament(8);
  t.slots[0] = null;
  t.slots[1] = null;
  const b = buildBracket(t);
  ok(b.rounds[0][0].dead, 'kampen er død');
  eq(b.rounds[0][0].winner, null);

  // Spil resten og se at turneringen kan gøres færdig.
  const t2 = tournament(8);
  t2.slots[0] = null;
  t2.slots[1] = null;
  t2.entrants = t2.slots.filter(Boolean);
  const done = playFavourites(t2);
  ok(done.complete, 'turneringen skal kunne spilles færdig med en tom gren');
  ok(done.places[1], 'der skal være en vinder');
  const sf = buildBracket(t2).rounds[1][0];
  ok(sf.bye, 'semifinalen mod den tomme gren er en oversidder');
});

test('alle fire placeringer kan stadig uddeles når et hold er trukket ud', () => {
  const s = { teams: teams(8), tournaments: [] };
  const t = tournament(8);
  t.slots[t.slots.indexOf('t5')] = null;
  t.entrants = t.entrants.filter(x => x !== 't5');
  playFavourites(t);
  s.tournaments.push(t);
  const st = computeStandings(s);
  eq(st.reduce((sum, r) => sum + r.points, 0), 10, 'der uddeles stadig 4+3+2+1');
  eq(st.find(r => r.name === 'Hold 5').played, 0, 'det udtrukne hold har ikke spillet med');
});

test('w.o. giver sejren videre uden at tælle som en spillet kamp', () => {
  // 4 hold = 2 semifinaler + finale + bronzekamp = 4 afgjorte kampe.
  const plain = { teams: teams(4), tournaments: [] };
  const a = tournament(4);
  playFavourites(a);
  plain.tournaments.push(a);
  const normal = computeStandings(plain);
  eq(normal.reduce((s, r) => s + r.wins, 0), 4, 'uden w.o. tælles alle fire kampe');

  // Samme turnering, men den ene semifinale vindes på w.o.
  const s = { teams: teams(4), tournaments: [] };
  const t = tournament(4);
  const m = buildBracket(t).rounds[0][0];
  t.picks[m.id] = m.a;
  t.wo = { [m.id]: true };
  eq(buildBracket(t).rounds[0][0].winner, m.a, 'holdet går videre på w.o.');
  playFavourites(t);
  s.tournaments.push(t);
  const st = computeStandings(s);

  eq(st.reduce((r, x) => r + x.wins, 0), 3, 'w.o.-kampen tælles ikke med');
  eq(st.reduce((r, x) => r + x.losses, 0), 3, 'og giver heller ikke et nederlag');
  eq(st.reduce((r, x) => r + x.points, 0), 10, 'pointene uddeles som normalt');
  eq(st.filter(x => x.played === 1).length, 4, 'alle fire hold står stadig som deltagere');
});

test('et w.o.-mærke overlever ikke at resultatet bliver rettet', () => {
  const t = tournament(4);
  const m = buildBracket(t).rounds[0][0];
  t.picks[m.id] = m.a;
  t.wo = { [m.id]: true };
  // Lederen retter: kampen blev alligevel spillet, og den anden vandt.
  t.picks[m.id] = m.b;
  prunePicks(t);
  // pruneWalkovers lever i brugerfladen; her tjekkes blot at resultatet skifter rent.
  eq(buildBracket(t).rounds[0][0].winner, m.b, 'det nye resultat gælder');
});

/* ---------- holdnavne ---------- */
test('samme navn genkendes uanset store bogstaver og tegnsætning', () => {
  const same = ['Bajer Boys', 'bajer boys', 'BAJER BOYS', 'Bajer-Boys', ' Bajer  Boys '];
  const keys = new Set(same.map(normName));
  eq(keys.size, 1, 'alle skrivemåder skal give samme nøgle');
  eq(normName('Tømmermænd'), normName('tømmermænd'), 'æøå skal bevares og matche');
  ok(normName('Skum') !== normName('Skvæt'), 'forskellige navne må ikke smelte sammen');
});

test('editDistance måler antal rettelser', () => {
  eq(editDistance('skum', 'skum'), 0);
  eq(editDistance('skum', 'skam'), 1);
  eq(editDistance('bajerboys', 'bajerboyz'), 1);
  eq(editDistance('', 'abc'), 3);
});

test('tastefejl i et langt navn fanges', () => {
  const existing = ['Bajer Boys', 'Tømmermænd', 'Kælderholdet'];
  eq(nearestName('Bajer Boyz', existing), 'Bajer Boys', 'ét forkert bogstav skal fanges');
  eq(nearestName('Tømmermnd', existing), 'Tømmermænd', 'et glemt bogstav skal fanges');
});

test('et rigtigt nyt hold udløser ikke et spørgsmål', () => {
  const existing = ['Bajer Boys', 'Tømmermænd', 'Kælderholdet'];
  eq(nearestName('Pong Stars', existing), null);
  eq(nearestName('Skum', existing), null);
  eq(nearestName('Røde Kort', existing), null);
});

test('korte navne kræver et præcist match', () => {
  // "Skum" og "Skam" er kun ét bogstav fra hinanden, men begge er plausible holdnavn.
  eq(nearestName('Skam', ['Skum']), 'Skum', 'fire tegn: én rettelse er stadig mistænkelig');
  eq(nearestName('Ab', ['Ac']), null, 'meget korte navne vurderes ikke');
  eq(nearestName('Team', ['Teak']), 'Teak');
  eq(nearestName('Alfa', ['Beta', 'Gamma']), null);
});

test('nummererede hold forveksles ikke med hinanden', () => {
  eq(nearestName('Hold 2', ['Hold 1']), null, 'Hold 1 og Hold 2 er bevidst forskellige');
  eq(nearestName('Bord 3', ['Bord 1', 'Bord 2']), null);
  eq(nearestName('Hold B', ['Hold A']), 'Hold A', 'bogstaver er ikke numre — her spørges der');
});

test('et navn der allerede findes, matcher sig selv med afstand 0 (ingen prompt)', () => {
  // Et præcist match håndteres af findTeamByName, ikke af nearestName.
  eq(nearestName('Bajer Boys', ['Bajer Boys']), null);
});

/* ---------- resultat ---------- */
console.log('');
if (failures.length) {
  console.log('  ' + pass + ' testede OK, ' + failures.length + ' fejlede:\n');
  failures.forEach(f => console.log('  ✗ ' + f + '\n'));
  process.exit(1);
}
console.log('  ✓ Alle ' + pass + ' tests kørte igennem.\n');
