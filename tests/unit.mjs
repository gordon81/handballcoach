// Unit-Tests ohne Browser: Ruf-Erkennung (js/shoutDetect.js) mit künstlichen Pegelverläufen.
// Start: node --test tests/unit.mjs (oder npm test im Ordner tests).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shoutDetector, STEP, SENS } from '../aussenspieler/js/shoutDetect.js';

// Pegelverlauf in Messschritten (je STEP ms): {v, hi} in dB. Hallen-Grundrauschen v −50, hi −55.
let seed = 1;
const rnd = () => (seed = (seed*16807) % 2147483647) / 2147483647;
const n = s => Math.round(s*1000/STEP);
const noise = (s, v = -50, hi = -55) => Array.from({length:n(s)}, () => ({v:v + (rnd()-0.5)*3, hi:hi + (rnd()-0.5)*3}));
// Nachhall: fällt mit 30 dB/s (Halle, ~2 s Nachhallzeit), bis er im Grundrauschen verschwindet.
const tail = (from, base = -50) => { const a = []; for(let l = from; l > base; l -= 30*STEP/1000) a.push({v:l, hi:l - 10}); return a; };
const shout = (ms = 400, v = -25) => [...Array.from({length:Math.round(ms/STEP)}, () => ({v:v + (rnd()-0.5)*2, hi:v - 15})), ...tail(v - 6)];
const bounce = () => [{v:-22, hi:-30}, ...tail(-36)];                     // Knall, danach nur Nachhall
const squeak = (ms = 250) => Array.from({length:Math.round(ms/STEP)}, () => ({v:-33, hi:-20}));   // Schuh, hoch
const whistle = (ms = 500) => Array.from({length:Math.round(ms/STEP)}, () => ({v:-34, hi:-15}));  // Pfiff

// Liefert die Zeitpunkte (s) erkannter Rufe.
function run(seq, {sens = 'mid', mute = () => false} = {}){
  const d = shoutDetector(), hits = [];
  seq.forEach((m, i) => { const t = i*STEP; if(d.push(m.v, m.hi, t, SENS[sens], mute(t/1000))) hits.push(t/1000); });
  return hits;
}
const near = (hits, at, tol = 1) => hits.filter(h => h >= at && h <= at + tol).length;

test('Ruf in ruhiger Halle wird erkannt (am Ende des Rufs)', () => {
  const hits = run([...noise(2), ...shout(), ...noise(2)]);
  assert.equal(hits.length, 1); assert.ok(near(hits, 2.0, 1.2), `Treffer bei ${hits}`);
});

test('Ballaufpralle zählen nicht', () => {
  assert.deepEqual(run([...noise(2), ...bounce(), ...noise(1), ...bounce(), ...noise(1), ...bounce(), ...noise(2)]), []);
});

test('Schuhquietschen und Pfiff zählen nicht', () => {
  assert.deepEqual(run([...noise(2), ...squeak(), ...noise(1), ...squeak(400), ...noise(1), ...whistle(), ...noise(2)]), []);
});

test('Dauerlärm (zweite Gruppe, Musik) löst nicht aus, danach wird ein Ruf darüber erkannt', () => {
  // Ab 2 s dauerhaft 20 dB lauter, mit stimmähnlichem Klang (das ist der schwierige Fall).
  const seq = [...noise(2), ...noise(20, -30, -35)];
  assert.deepEqual(run(seq), [], 'Dauerlärm darf keinen Zuruf auslösen');
  const withShout = [...seq, ...shout(400, -8).map(m => ({v:Math.max(m.v, -30), hi:Math.max(m.hi, -35)})), ...noise(3, -30, -35)];
  const hits = run(withShout);
  assert.equal(hits.length, 1, `Ruf über dem Lärm: ${hits}`); assert.ok(hits[0] > 22);
});

test('Dauerlärm mit kurzen Einbrüchen: Grundpegel zieht trotzdem mit, Ruf darüber wird erkannt', () => {
  // Wie eine zweite Gruppe: schwankt, alle 0,3 s kurz 5 dB leiser (unter der Schwelle, sobald der Grundpegel
  // etwas nachgezogen hat). Ruf 6 s nach Lärmbeginn.
  const babble = s => noise(s, -30, -35).map((m, i) => i % 10 === 9 ? {v:-35, hi:-40} : m);
  const seq = [...noise(2), ...babble(6), ...shout(400, -8).map(m => ({v:Math.max(m.v, -30), hi:Math.max(m.hi, -35)})), ...babble(3)];
  const hits = run(seq);
  assert.equal(hits.length, 1, `Ruf über dem Lärm: ${hits}`); assert.ok(hits[0] > 8 && hits[0] < 9.5, `Treffer bei ${hits}`);
});

test('Mikrofon liefert anfangs keinen Ton: Grundpegel bleibt richtig, der erste Ruf zählt', () => {
  // Beim Start kommen oft ein paar Messungen ganz ohne Ton (−200 dB), bevor das Mikrofon läuft.
  const silence = s => Array.from({length:n(s)}, () => ({v:-200, hi:-200}));
  const hits = run([...silence(0.3), ...noise(1), ...shout(), ...noise(2), ...bounce(), ...noise(2)]);
  assert.equal(hits.length, 1, `Treffer bei ${hits}`); assert.ok(near(hits, 1.3, 1.2), `Treffer bei ${hits}`);
});

test('Lauter Ruf (1,5 s) mit Nachhall zählt, aber nur einmal', () => {
  assert.equal(run([...noise(2), ...shout(1500, -20), ...noise(2)]).length, 1);
});

test('Zwei Rufe kurz hintereinander: nur einer (Sperre), mit Abstand: beide', () => {
  assert.equal(run([...noise(2), ...shout(), ...noise(0.2), ...shout(), ...noise(2)]).length, 1);
  assert.equal(run([...noise(2), ...shout(), ...noise(2), ...shout(), ...noise(2)]).length, 2);
});

test('Während der eigenen Ansage wird nicht gehört', () => {
  assert.deepEqual(run([...noise(2), ...shout(), ...noise(2)], {mute:t => t > 1.9 && t < 3.5}), []);
});

test('Empfindlichkeit: leiser Ruf nur bei „hoch“', () => {
  const seq = [...noise(2), ...shout(400, -39), ...noise(2)];   // 11 dB über dem Rauschen
  assert.equal(run(seq, {sens:'high'}).length, 1);
  assert.equal(run(seq, {sens:'mid'}).length, 0);
  assert.equal(run(seq, {sens:'low'}).length, 0);
});

/* ---------- Aufgaben (js/tasks.js) ---------- */
import { TASKS, judge, tally, repSpeech, endSpeech, addHistory, best, lineCm } from '../aussenspieler/js/tasks.js';
import { TH } from '../aussenspieler/js/config.js';

const throwAt = (line, issues = []) => ({issues, m:{line}});

test('Absprung an der Linie: Fenster bis ~30 cm vor der Linie, Übertritt zählt nie', () => {
  const far = TH.taskLineFar;
  assert.equal(judge('line', throwAt(-0.05)).ok, true);
  assert.equal(judge('line', throwAt(0)).ok, true, 'genau auf der Linie, aber kein Übertritt');
  assert.equal(judge('line', throwAt(far)).ok, true, 'genau an der Grenze');
  assert.equal(judge('line', throwAt(far - 0.01)).ok, false, 'knapp zu weit weg');
  assert.match(judge('line', throwAt(far - 0.1)).say, /Näher ran/);
  assert.equal(judge('line', throwAt(0.02, ['over'])).ok, false);
  assert.equal(judge('line', throwAt(-0.1, ['over'])).why, 'Übertritt', 'Übertritt-Prüfung hat Vorrang');
  assert.equal(judge('line', throwAt(null)).ok, false, 'ohne Linie nicht geschafft');
  assert.equal(judge('line', throwAt(-0.3), {...TH, taskLineFar:-0.35}).ok, true, 'Grenze kommt aus th()');
});

test('Abstand in cm: auf 5 cm gerundet, nie negativ', () => {
  assert.equal(lineCm(-0.1), 15);   // 0,1 KL × 140 cm = 14 cm → 15
  assert.equal(lineCm(-0.02), 5);
  assert.equal(lineCm(0.05), 0);
  assert.match(judge('line', throwAt(-0.01)).say, /Direkt an der Linie/);
  assert.match(judge('line', throwAt(-0.1)).say, /^Geschafft\. 15 Zentimeter vor der Linie\.$/);
});

test('Entscheidung in der Luft: nur Würfe nach „Los“, sauber und nicht daneben', () => {
  assert.equal(judge('air', {target:null, issues:[]}), null, 'ohne Ansage zählt nicht');
  assert.equal(judge('air', {target:'Blau kurz', issues:['jump','rot']}).ok, true, 'Sprunghöhe/Drehung zählen hier nicht');
  assert.equal(judge('air', {target:'Blau kurz', issues:['arm']}).ok, false);
  assert.equal(judge('air', {target:'Blau kurz', issues:[], hit:false}).ok, false);
  assert.equal(judge('air', {target:'Blau kurz', issues:[], hit:true}).ok, true);
});

test('Serie: Zähler, Ansagen, Ende geschafft / nicht geschafft', () => {
  const t = TASKS.line, list = [throwAt(-0.05), throwAt(0.1, ['over']), {issues:[], m:{line:null}, ignored:true}];
  assert.deepEqual(tally('line', list.slice(0, 2)), {n:2, hits:1});
  assert.equal(repSpeech(t, judge('line', list[0]), 3, 3), 'Geschafft. 5 Zentimeter vor der Linie. Noch 7.');
  assert.equal(endSpeech(t, 7, 10), 'Aufgabe geschafft: 7 von 10.');
  assert.match(endSpeech(t, 6, 10), /6 von 10\. Ziel war 7/);
  // Treffer nachträglich getippt: tally rechnet neu.
  const a = {target:'X', issues:[], hit:null}, b = {target:'Y', issues:[], hit:null};
  assert.deepEqual(tally('air', [a, b]), {n:2, hits:2});
  b.hit = false; assert.deepEqual(tally('air', [a, b]), {n:2, hits:1});
});

test('Verlauf: höchstens 30 Serien je Aufgabe, Bestwert nach Quote', () => {
  let h = {};
  for(let i = 0; i < 35; i++) h = addHistory(h, 'line', {run:i, hits:i % 8, n:10});
  assert.equal(h.line.length, 30);
  assert.equal(h.line[0].run, 5, 'die ältesten fallen weg');
  assert.equal(best(h, 'line').hits, 7);
  assert.equal(best({}, 'line'), null);
  assert.equal(best({line:[{hits:4, n:4}, {hits:9, n:10}]}, 'line').n, 4, '4/4 schlägt 9/10');
});
