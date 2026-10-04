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

/* ---------- 7-m-Trainer (siebenmeter/js/rules.js) ---------- */
import { judge7, findThrow, throwDone, lineDist, seriesSpeech, TH7, SERIES } from '../siebenmeter/js/rules.js';

// Seitenansicht in Pixeln: Tor links (kleines x), 7-m-Linie senkrecht bei x = 500, Spieler rechts davon. KL = 200 px.
const LINE7 = {a:{x:500, y:300}, b:{x:500, y:700}, goal:{x:200, y:500}};
// Frames alle 1/30 s von −0,5 s bis end; Wurf bei tThrow (Handgelenk schnell), Fuß-Änderungen über opts.
function frames7({tThrow = 1.5, end = tThrow + 0.5, frontX = (t) => 560, frontY = () => 600, wrist = 6}){
  const out = [];
  for(let t = -0.5; t <= end + 1e-9; t += 1/30){
    const fx = frontX(t), fy = frontY(t), j = (Math.sin(t*50))*0.6;   // etwas Rauschen
    const dx = t > tThrow - 0.1 && t <= tThrow ? -(t - (tThrow - 0.1))*wrist*200 : t > tThrow ? -0.1*wrist*200 : 0;
    out.push({t, bl:200, wr:{x:640 + dx, y:380}, lToe:{x:fx - 15 + j, y:fy}, lHeel:{x:fx + 15, y:fy}, rToe:{x:700, y:600}, rHeel:{x:730, y:600 + j}});
  }
  return out;
}

test('7 m: Linie, Seite zum Tor ist positiv', () => {
  assert.ok(lineDist(LINE7, {x:450, y:500}) > 0);
  assert.ok(lineDist(LINE7, {x:560, y:500}) < 0);
  assert.equal(Math.round(lineDist({...LINE7, a:LINE7.b, b:LINE7.a}, {x:450, y:500})), 50, 'Richtung der Linie egal');
});

test('7 m: sauberer Wurf nach 1,5 s', () => {
  const r = judge7(frames7({}), 0, LINE7);
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.ok(Math.abs(r.m.time - 1.45) < 0.1, `Zeit ${r.m.time}`);
  assert.match(r.say, /^Sauber\. 1,[45] Sekunden\.$/);
  assert.ok(r.m.foot < TH7.footMove);
});

test('7 m: zu langsam (über 3 s) und kein Wurf', () => {
  const slow = judge7(frames7({tThrow:3.3}), 0, LINE7);
  assert.deepEqual(slow.issues, ['slow']); assert.match(slow.say, /Zu langsam\. 3,3 Sekunden/);
  const edge = judge7(frames7({tThrow:2.95}), 0, LINE7);
  assert.equal(edge.ok, true, 'knapp unter 3 s ist ok');
  const none = judge7(frames7({tThrow:99, end:4.6}), 0, LINE7);
  assert.deepEqual(none.issues, ['none']); assert.equal(none.m.time, null);
});

test('7 m: Linie übertreten (Fußspitze jenseits der Linie)', () => {
  const r = judge7(frames7({frontX:t => t > 1.3 ? 495 : 560}), 0, LINE7);
  assert.ok(r.issues.includes('line'), JSON.stringify(r)); assert.ok(r.m.line > 0);
  // Nach dem Abwurf darf der Fuß über die Linie (Ball ist weg).
  assert.equal(judge7(frames7({frontX:t => t > 1.7 ? 480 : 560}), 0, LINE7).ok, true);
});

test('7 m: Standbein – ein Fuß muss stehen bleiben; Rauschen zählt nicht', () => {
  const r = judge7(frames7({frontX:t => t > 0.8 ? 590 : 560}), 0, LINE7);
  assert.equal(r.ok, true, 'hinterer Fuß steht, vorderer darf sich bewegen');
  // Beide bewegen sich: vorderer rutscht, hinterer wird über opts nicht bewegt → anders bauen.
  const fr = frames7({}); fr.forEach(f => { if(f.t > 0.8){ f.rToe = {x:f.rToe.x - 40, y:f.rToe.y}; f.rHeel = {x:f.rHeel.x - 40, y:f.rHeel.y}; f.lToe = {x:f.lToe.x + 30, y:f.lToe.y}; f.lHeel = {x:f.lHeel.x + 30, y:f.lHeel.y}; } });
  assert.deepEqual(judge7(fr, 0, LINE7).issues, ['foot']);
  const lift = frames7({}); lift.forEach(f => { if(f.t > 0.8){ for(const k of ['lToe','lHeel','rToe','rHeel']) f[k] = {x:f[k].x, y:f[k].y - 20}; } });
  const rl = judge7(lift, 0, LINE7);
  assert.deepEqual(rl.issues, ['foot']); assert.equal(rl.m.lift, true, 'hochgesprungen');
  const small = judge7(frames7({frontX:t => 560 + 6*Math.sin(t*40)}), 0, LINE7);
  assert.equal(small.ok, true, 'kleine Schwankungen (3 % KL) sind kein Bewegen');
});

test('7 m: Wurf-Erkennung und Serie', () => {
  const fr = frames7({});
  assert.equal(findThrow(fr, 0).t > 1.4, true);
  assert.equal(throwDone(fr.filter(f => f.t <= 1.55), 0), false, 'gleich nach der Spitze noch nicht fertig');
  assert.equal(throwDone(fr, 0), true);
  assert.equal(findThrow(frames7({wrist:1}), 0), null, 'langsame Armbewegung ist kein Wurf');
  const hop = frames7({wrist:1}); hop.forEach(f => { const k = f.t > 0.8 && f.t < 0.9 ? (f.t - 0.8)*600 : f.t >= 0.9 ? 60 : 0; f.hip = {x:600 - k, y:450}; f.wr = {x:f.wr.x - k, y:f.wr.y}; });
  assert.equal(findThrow(hop, 0), null, 'Hüpfer mit dem ganzen Körper ist kein Wurf');
  const ok = {say:'Sauber. 1,5 Sekunden.'};
  assert.equal(seriesSpeech(ok, 3, 3), 'Sauber. 1,5 Sekunden. Noch 7.');
  assert.match(seriesSpeech(ok, SERIES.reps, SERIES.goal), /Serie geschafft: 8 von 10/);
  assert.match(seriesSpeech(ok, 10, 6), /6 von 10\. Ziel war 8/);
});
