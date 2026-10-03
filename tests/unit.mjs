// Unit-Tests ohne Browser: Ruf-Erkennung (js/shoutDetect.js) mit künstlichen Pegelverläufen.
// Start: node --test tests/unit.mjs (oder npm test im Ordner tests).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shoutDetector, STEP, SENS } from '../js/shoutDetect.js';

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
