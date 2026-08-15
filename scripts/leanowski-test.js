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
  ' allMatches, readyMatches, computeStandings, roundName, loserOf, placeOf };'
)();

const {
  bracketSizeFor, seedOrder, buildSlots, buildBracket,
  readyMatches, computeStandings, roundName,
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

/* ---------- resultat ---------- */
console.log('');
if (failures.length) {
  console.log('  ' + pass + ' testede OK, ' + failures.length + ' fejlede:\n');
  failures.forEach(f => console.log('  ✗ ' + f + '\n'));
  process.exit(1);
}
console.log('  ✓ Alle ' + pass + ' tests kørte igennem.\n');
