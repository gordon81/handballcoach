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
import { TASKS, judge, tally, repSpeech, endSpeech, addHistory, best, lineCm, result } from '../aussenspieler/js/tasks.js';
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

test('Wurfhöhe auf Ansage: „Hoch“ über dem Kopf, „Hüfte“ zwischen Hüfte und Schulter', () => {
  const at = (call, armT, shT, hipT) => judge('height', {call, issues:[], m:{armT, shT, hipT}});
  assert.equal(at('Hoch', 0.15, 0.4, 0.9).ok, true);
  assert.equal(at('Hoch', -0.05, 0.2, 0.7).ok, false, 'Hand unter der Nase ist nicht hoch');
  assert.equal(at('Hüfte', -0.6, -0.35, 0.15).ok, true);
  assert.match(at('Hüfte', 0.1, 0.3, 0.9).say, /Tiefer/);
  assert.match(at('Hüfte', -1, -0.8, -0.3).say, /höher/);
  assert.equal(judge('height', {call:null, issues:[], m:{armT:0.1}}), null, 'ohne Ansage zählt nicht');
  assert.equal(judge('height', {call:'Hoch', issues:[], m:{armT:null}}), null, 'ohne Wurf-Frame zählt nicht');
});

test('Winkel vergrößern: Flug nach innen gegen den Anlauf, Übertritt zählt nie', () => {
  const at = (flyAng, issues = [], line = -0.1) => judge('angle', {issues, m:{flyAng, line}});
  assert.equal(at(TH.taskFlyAng).ok, true, 'genau an der Grenze');
  assert.equal(at(TH.taskFlyAng - 1).ok, false);
  assert.match(at(5).say, /Zu gerade/);
  assert.equal(at(-30).ok, false, 'nach außen geflogen');
  assert.equal(at(90, ['over'], 0.05).why, 'Übertritt');
  assert.equal(at(null).ok, false, 'ohne Linie nicht gemessen');
  assert.equal(TASKS.angle.needCam, 'court', 'braucht Kameraposition 2');
});

test('Gegenstoß auf Zeit: Zeit vom Ruf bis zum Absprung, Technik muss stimmen', () => {
  const at = (breakT, issues = [], line = -0.1) => judge('fastbreak', {issues, m:{breakT, line}});
  assert.equal(at(null), null, 'ohne Ruf zählt nicht');
  assert.equal(at(TH.taskBreakMax).ok, true, 'genau an der Grenze');
  assert.match(at(TH.taskBreakMax + 0.1).say, /^4,1 Sekunden\. Schneller\.$/);
  assert.equal(at(2, ['over'], 0.05).ok, false);
  assert.equal(at(2, ['leg']).ok, false);
  assert.equal(at(2).say, 'Geschafft. 2,0 Sekunden.');
  assert.equal(TASKS.fastbreak.shout, true);
});

test('Kreisläufer: in die angesagte Richtung gedreht, genug gedreht, kein Übertritt', () => {
  const at = (call, turn, issues = [], line = -0.1, react = 0.4) => judge('pivot', {call, issues, m:{turn, react, line}});
  assert.equal(at('Links', 170).ok, true); assert.equal(at('Rechts', -170).ok, true);
  assert.match(at('Links', -170).why, /Falsch herum gedreht \(rechts\)/);
  assert.equal(at('Links', 30).ok, false, 'kaum gedreht');
  assert.equal(at('Links', 170, ['over'], 0.05).why, 'Übertritt');
  assert.equal(at(null, 170), null, 'ohne Ansage zählt nicht');
  assert.equal(at('Links', 170).say, 'Richtig. Reaktion 0,4 Sekunden.');
});

test('Serie unter Ermüdung: Sprunghöhe Ende gegen Anfang, Übertritte', () => {
  const t = TASKS.tired, j = (jump, issues = []) => ({issues, m:{jump, line:-0.1}});
  const keep = Array.from({length:20}, (_, i) => j(i < 15 ? 0.3 : 0.28));
  const r = result(t, keep);
  assert.equal(r.passed, true, r.say); assert.equal(r.label, '93 %'); assert.match(r.say, /gehalten, 93 Prozent/);
  const drop = Array.from({length:20}, (_, i) => j(i < 15 ? 0.3 : 0.24));
  assert.equal(result(t, drop).passed, false); assert.match(result(t, drop).say, /80 Prozent vom Anfang, Ziel 90/);
  const over = keep.map((e, i) => i === 7 ? j(0.3, ['over']) : e);
  assert.equal(result(t, over).passed, false); assert.match(result(t, over).say, /1 Übertritt\./);
  // Einzelner Wurf: Warnung, wenn er unter 90 % des Anfangs liegt (erst nach den ersten 5).
  assert.equal(judge('tired', j(0.2), undefined, keep.slice(0, 3)).say, 'Gut.', 'vor Wurf 6 kein Vergleich');
  assert.match(judge('tired', j(0.2), undefined, keep.slice(0, 8)).say, /flacher/);
  assert.equal(judge('tired', j(0.29), undefined, keep.slice(0, 8)).say, 'Gut.');
  assert.equal(judge('tired', j(0.3, ['over'])).ok, false);
  assert.equal(best({tired:[{hits:20, n:20, score:0.93}, {hits:20, n:20, score:0}]}, 'tired').score, 0.93, 'Bestwert nach Quote');
});

/* ---------- Abwehr-Beinarbeit (abwehr/js/rules.js) ---------- */
import { judgeMove, judgeOut, baseFrame, leadSide, nextCmd, summary as defSummary, TH_D } from '../abwehr/js/rules.js';

// Frontal, KL 200 px. Bewegung startet react s nach dem Ruf (t = 0), dauert 0,4 s: dx (px, + = im Bild rechts = links des Spielers), grow (Größe).
function moveFrames({react = 0.4, dx = 0, grow = 0, cross = false}){
  const out = [];
  for(let t = -0.5; t <= 1.7; t += 1/30){
    const u = Math.min(1, Math.max(0, (t - react)/0.4)), x = 500 + dx*u, bl = 200*(1 + grow*u), j = Math.sin(t*40)*1.5;
    const lA = cross && u > 0.3 && u < 0.8 ? x - 30 : x + 20, rA = x - 20;
    out.push({t, hip:{x:x + j, y:400}, bl, lAnk:{x:lA, y:600}, rAnk:{x:rA, y:600}});
  }
  return out;
}

test('Abwehr: Richtung und Reaktionszeit', () => {
  const l = judgeMove(moveFrames({dx:120}), 0, 'links');
  assert.equal(l.ok, true, JSON.stringify(l)); assert.equal(l.dir, 'links');
  assert.ok(l.react > 0.4 && l.react < 0.6, `Reaktion ${l.react}`);
  assert.equal(judgeMove(moveFrames({dx:-120}), 0, 'rechts').ok, true);
  assert.equal(judgeMove(moveFrames({grow:0.2}), 0, 'raus').dir, 'raus');
  assert.equal(judgeMove(moveFrames({grow:-0.15}), 0, 'zurück').dir, 'zurück');
  const wrong = judgeMove(moveFrames({dx:-120}), 0, 'links');
  assert.equal(wrong.ok, false); assert.match(wrong.why, /Falsche Richtung \(rechts\)/);
  const slow = judgeMove(moveFrames({dx:120, react:1.1}), 0, 'links');
  assert.equal(slow.ok, false); assert.match(slow.why, /Zu langsam/);
  assert.equal(judgeMove(moveFrames({}), 0, 'links').why, 'Keine Bewegung', 'Stehen bleiben = keine Bewegung (Rauschen zählt nicht)');
  const lagged = judgeMove(moveFrames({dx:120, react:0.6}), 0, 'links', TH_D, 0.3);
  assert.ok(lagged.react < 0.5, 'Verzögerung der Sprachausgabe wird abgezogen');
});

test('Abwehr: gekreuzte Füße, nächster Ruf, Zusammenfassung', () => {
  assert.equal(judgeMove(moveFrames({dx:120, cross:true}), 0, 'links').crossed, true);
  assert.equal(judgeMove(moveFrames({dx:120}), 0, 'links').crossed, false);
  assert.equal(nextCmd(0.6, 0), 'rechts', 'weit im Bild rechts → zurück zur Mitte');
  assert.equal(nextCmd(-0.6, 0), 'links');
  assert.equal(nextCmd(0, 0.15), 'zurück');
  assert.notEqual(nextCmd(0, 0, ['raus', 'raus'], () => 0.5), 'raus', 'nicht dreimal dasselbe');
  const s = defSummary([{ok:true, react:0.4}, {ok:true, react:0.6, crossed:true}, {ok:false, react:1.2}], 0.5);
  assert.equal(s.avg, 0.5); assert.equal(s.ok, 2); assert.equal(s.crossed, 1);
  assert.match(s.say, /^Fertig\. 2 von 3 richtig\. Reaktion im Schnitt 0,50 Sekunden\. Füße einmal gekreuzt\..*Körperschwerpunkt tiefer/);
  assert.doesNotMatch(defSummary([{ok:true, react:0.4}], 0.9).say, /tiefer/);
});

/* ---------- Rückraum: Schritte zählen (aussenspieler/js/steps.js) ---------- */
import { countSteps } from '../aussenspieler/js/steps.js';

// Anlauf mit n Schritten wie beim Laufen: Körper beschleunigt im ersten Schritt, die Füße stehen abwechselnd fest,
// der schwingende ist schneller als der Körper; danach 0,15 s Stand auf dem Sprungbein (Absprung bei t0 = n·T + 0,15).
const ST = 0.3, SV = 450;   // s je Schritt, px/s Körper (KL 150 px → 3 KL/s)
function runFrames(n, {noise = 1} = {}){
  const out = [], sl = SV*ST, feet = [0, 0], from = [0, 0], hipX = t => t <= 0 ? 0 : t < ST ? SV*t*t/(2*ST) : SV*(t - ST/2);
  let lastK = -1;
  for(let t = -0.6; t <= n*ST + 0.15 + 1e-9; t += 1/30){
    const j = () => Math.sin(t*97 + out.length)*noise;
    if(t >= 0 && t <= n*ST){
      const k = Math.min(n - 1, Math.floor(t/ST)), f = Math.min(1, (t - k*ST)/ST), sw = (n - 1 - k) % 2;
      if(k !== lastK){ from[sw] = feet[sw]; lastK = k; }
      feet[sw] = from[sw] + ((k + 0.5)*sl - from[sw])*f;
    }
    out.push({t, hip:{x:hipX(t) + j(), y:400}, foot:feet.map(x => ({toe:{x:x + 10 + j(), y:500}, heel:{x:x - 10, y:500 + j()}}))});
  }
  return out;
}
test('Rückraum: Bodenkontakte im Anlauf zählen', () => {
  for(const n of [2, 3, 4]){
    const H = runFrames(n), e = {t0:n*ST + 0.15, runT:-0.3, bl:150};
    assert.equal(countSteps(H, e), n, `${n} Schritte`);
  }
  assert.equal(countSteps(runFrames(3, {noise:3}), {t0:3*ST + 0.15, runT:-0.3, bl:150}), 3, 'Rauschen beim Stehen zählt nicht');
  assert.equal(countSteps(runFrames(3).slice(0, 4), {t0:3*ST + 0.15, runT:-0.3, bl:150}), null, 'zu wenig Bilder');
});

/* ---------- Ballaufprall per Mikro (shared/js/bounceDetect.js) ---------- */
import { bounceDetector, SENS as BSENS } from '../shared/js/bounceDetect.js';

// Messungen {v, hi, pk, lvl} alle STEP ms. Grundrauschen: pk ≈ lvl + 2 dB (kein Knall).
const bq = (s, lvl = -55) => Array.from({length:n(s)}, () => { const l = lvl + (rnd()-0.5)*2; return {v:l + 3, hi:l - 2, lvl:l, pk:l + 2 + rnd()}; });
// Knall: 2–3 Messungen mit hohem pk (der 5-ms-Abschnitt), Mittelpegel nur mäßig höher, danach Nachhall ohne Knall.
const knall = (pk = -18) => [{v:pk - 8, hi:pk - 10, lvl:pk - 12, pk}, {v:pk - 10, hi:pk - 12, lvl:pk - 13, pk:pk - 1}, {v:pk - 14, hi:pk - 16, lvl:pk - 16, pk:pk - 4},
  ...Array.from({length:10}, (_, k) => { const l = pk - 22 - k*1.5; return {v:l + 3, hi:l - 2, lvl:l, pk:l + 2}; })];
// Ruf: am Anfang ein Fenster mit hohem pk (Einsatz der Stimme), dann gleichmäßig.
const ruf = (ms = 500, l = -25) => [{v:l - 5, hi:l - 20, lvl:l - 12, pk:l + 1}, ...Array.from({length:Math.round(ms/STEP)}, () => ({v:l, hi:l - 15, lvl:l - 2, pk:l + 1}))];
const pfiff = () => Array.from({length:15}, () => ({v:-40, hi:-18, lvl:-20, pk:-17}));
const klatsch = () => knall(-40);   // leises Fangen / weit weg

function runBounce(seq, sens = 'mid'){
  const d = bounceDetector(), hits = [];
  seq.forEach((m, i) => { const t = i*STEP; if(d.push(m.v, m.hi, t, BSENS[sens], false, m.pk, m.lvl)) hits.push(t/1000); });
  return hits;
}

test('Ballaufprall: Knall zählt einmal, Ruf und Pfiff nicht', () => {
  assert.equal(runBounce([...bq(2), ...knall(), ...bq(1)]).length, 1, 'ein Aufprall');
  assert.equal(runBounce([...bq(2), ...ruf(), ...bq(1)]).length, 0, 'Ruf');
  assert.equal(runBounce([...bq(2), ...pfiff(), ...bq(1)]).length, 0, 'Pfiff');
  assert.equal(runBounce([...bq(2), ...bq(3, -35), ...bq(1)]).length, 0, 'lauter Dauerlärm ohne Knall');
});

test('Ballaufprall: schnelle Pässe (alle 0,6 s) einzeln gezählt, auch über Lärm', () => {
  const seq = [...bq(2)];
  for(let k = 0; k < 10; k++) seq.push(...knall(), ...bq(0.6 - knall().length*STEP/1000));
  assert.equal(runBounce([...seq, ...bq(1)]).length, 10);
  const loud = [...bq(2, -38)];
  for(let k = 0; k < 5; k++) loud.push(...knall(-12), ...bq(0.6 - knall().length*STEP/1000, -38));
  assert.equal(runBounce([...loud, ...bq(1, -38)]).length, 5, 'über Hallenlärm');
});

test('Ballaufprall: leiser Klatsch nur mit hoher Empfindlichkeit', () => {
  assert.equal(runBounce([...bq(2), ...klatsch(), ...bq(1)], 'low').length, 0);
  assert.equal(runBounce([...bq(2), ...klatsch(), ...bq(1)], 'high').length, 1);
});

/* ---------- Pässe gegen die Wand (passen/js/rules.js) ---------- */
import { judgePass, throwsFromPose, summary as passSummary } from '../passen/js/rules.js';

// Seitenansicht, Wand links. KL 200 px. Wurf: Handgelenk schnell nach links bei tThrow; armY = Höhe (px) gegen die Schulter (− = darüber).
function passFrames({tThrow = 1.0, armY = -30, front = 'l'} = {}){
  const out = [];
  for(let t = 0; t <= tThrow + 0.6; t += 1/30){
    const dx = t > tThrow - 0.1 && t <= tThrow ? -(t - (tThrow - 0.1))*1200 : t > tThrow ? -120 : 0;
    const lx = front === 'l' ? 460 : 540, rx = front === 'l' ? 540 : 460;
    out.push({t, wr:{x:560 + dx, y:300 + armY}, wsh:{x:520, y:300}, hip:{x:500, y:420}, bl:200, lAnk:{x:lx, y:600}, rAnk:{x:rx, y:600}});
  }
  return out;
}
test('Pässe: Arm über der Schulter, Gegenbein vorn', () => {
  const ok = judgePass(passFrames(), 1.3, 'left', true);
  assert.deepEqual([ok.arm, ok.foot, ok.ok], [true, true, true], JSON.stringify(ok));
  assert.equal(judgePass(passFrames({armY:40}), 1.3, 'left', true).arm, false, 'Hand unter der Schulter');
  assert.equal(judgePass(passFrames({front:'r'}), 1.3, 'left', true).foot, false, 'Rechtshänder mit rechts vorn');
  assert.equal(judgePass(passFrames({front:'r'}), 1.3, 'left', false).foot, true, 'Linkshänder mit rechts vorn');
  assert.equal(judgePass(passFrames({front:'r'}), 1.3, 'right', true).foot, true, 'Wand rechts: größeres x ist vorn');
  assert.equal(judgePass(passFrames(), 3.0, 'left', true).ok, null, 'kein Abwurf vor dem Aufprall gesehen');
});
test('Pässe: Kamera-Zählung und Zusammenfassung', () => {
  // Zwei Würfe (1,0 s und 2,5 s), dazwischen kommt die Hand langsam zurück (nicht als Wurf zählen).
  const two = [];
  for(let t = 0; t <= 3.2; t += 1/30){
    const one = t0 => t <= t0 - 0.1 ? 0 : t <= t0 ? -(t - (t0 - 0.1))*1200 : Math.min(0, -120 + (t - t0)*150);
    two.push({t, wr:{x:560 + (t < 1.8 ? one(1.0) : one(2.5)), y:270}, wsh:{x:520, y:300}, hip:{x:500, y:420}, bl:200});
  }
  const ts = throwsFromPose(two);
  assert.equal(ts.length, 2, `Würfe bei ${ts}`);
  const s = passSummary([{ok:true, arm:true, foot:true}, {ok:false, arm:false, foot:true}, {ok:null}], 30);
  assert.deepEqual([s.n, s.seen, s.arm, s.foot, s.perMin], [3, 2, 1, 2, 6]);
  assert.match(s.say, /^Fertig\. 3 Pässe in 30 Sekunden\. 1 mit Arm oben, 2 mit dem richtigen Bein vorn\. Ellbogen und Hand über die Schulter\.$/);
});

/* ---------- Sprungkraft (sprung/js/rules.js) ---------- */
import { jumpTracker, summary as jumpSummary, cm as jcm } from '../sprung/js/rules.js';

// Sprünge auf der Stelle: Boden y = 600, Hüfte 400, KL 200 px. jumps = [{h (KL), leg: 'both'|'l'|'r'}], 0,3 s Bodenkontakt.
function jumpFrames(jumps){
  const out = []; let t = 0;
  const push = (lift, leg, noise = 0.5) => {
    const j = Math.sin(t*61)*noise, up = 30;   // angezogenes Bein: 30 px über dem Boden
    out.push({t, hipY:400 - lift + j, bl:200, lY:600 - lift - (leg === 'r' ? up : 0) + j, rY:600 - lift - (leg === 'l' ? up : 0) - j});
    t += 1/30;
  };
  for(let k = 0; k < 9; k++) push(0, 'both');
  for(const jp of jumps){
    for(let k = 0; k < 9; k++) push(0, jp.leg);
    const T = 2*Math.sqrt(2*jp.h*1.4/9.81), n = Math.round(T*30);
    for(let k = 1; k < n; k++){ const u = k/n; push(4*jp.h*200*u*(1-u), jp.leg); }
  }
  for(let k = 0; k < 9; k++) push(0, 'both');
  return out;
}
const runJumps = fr => { const tr = jumpTracker({hipY:400, ground:600, bl:200}), out = []; for(const f of fr){ const j = tr.push(f); if(j) out.push(j); } return out; };

test('Sprungkraft: Sprünge gezählt, Höhe, Bodenkontakt, Bein', () => {
  const js = runJumps(jumpFrames([{h:0.25, leg:'both'}, {h:0.2, leg:'both'}, {h:0.15, leg:'l'}, {h:0.18, leg:'r'}]));
  assert.equal(js.length, 4);
  assert.ok(Math.abs(js[0].height - 0.25) < 0.03 && Math.abs(js[1].height - 0.2) < 0.03, js.map(j => j.height).join(', '));
  assert.deepEqual(js.map(j => j.leg), ['both', 'both', 'l', 'r']);
  assert.equal(js[0].contact, null); assert.ok(js[1].contact > 0.2 && js[1].contact < 0.45, `Kontakt ${js[1].contact}`);
  assert.equal(runJumps(jumpFrames([])).length, 0, 'Stehen mit Rauschen ist kein Sprung');
  assert.equal(runJumps(jumpFrames([{h:0.03, leg:'both'}])).length, 0, 'Wippen ist kein Sprung');
});

test('Sprungkraft: Zusammenfassung, links gegen rechts, Vergleich mit dem letzten Mal', () => {
  const s = jumpSummary([{height:0.2, contact:null}, {height:0.3, contact:0.3}], 'both', {avg:0.2});
  assert.equal(jcm(s.avg), 35);
  assert.equal(s.say, 'Fertig. 2 Sprünge. Im Schnitt 35 Zentimeter, bester 42. Bodenkontakt 0,30 Sekunden. 7 Zentimeter mehr als letztes Mal.');
  const lr = jumpSummary([{height:0.15, leg:'l'}, {height:0.2, leg:'r'}], 'single');
  assert.match(lr.say, /Links 21, rechts 28 Zentimeter\. Rechts 25 Prozent stärker/);
  assert.match(jumpSummary([{height:0.2, leg:'l'}, {height:0.21, leg:'r'}], 'single').say, /Beide Beine ähnlich stark/);
});

/* ---------- Treffererkennung und Tempo (shared/js/hitDetect.js) ---------- */
import { detectHit, circleMask, speedKmh } from '../shared/js/hitDetect.js';

// Ring-Ausschnitte 15×15: Hintergrund 120 ± Rauschen; „Ball“ = heller Fleck (220) in der Mitte zur Zeit tBall.
function ringSamples(tBall, {size = 15, off = 0} = {}){
  const out = []; let seed2 = 3; const r = () => ((seed2 = (seed2*16807) % 2147483647)/2147483647 - 0.5)*8;
  for(let t = -1; t <= 1.5; t += 1/30){
    const px = new Uint8Array(size*size).map(() => 120 + r());
    if(tBall != null && Math.abs(t - tBall) < 0.05) for(let y = 3; y < 12; y++) for(let x = 3 + off; x < 12 + off; x++) if(x >= 0 && x < size) px[y*size + x] = 220;
    out.push({t, px});
  }
  return out;
}
test('Treffererkennung: Ball im getroffenen Ring, nicht daneben', () => {
  const rings = [{name:'Orange kurz', size:15, samples:ringSamples(0.45)}, {name:'Blau lang', size:15, samples:ringSamples(null)}];
  const r = detectHit(rings, 0);
  assert.equal(r.ring, 'Orange kurz'); assert.ok(Math.abs(r.t - 0.45) < 0.05);
  assert.equal(detectHit([{name:'A', size:15, samples:ringSamples(null)}, {name:'B', size:15, samples:ringSamples(null)}], 0).ring, null, 'nur Rauschen: kein Treffer');
  assert.equal(detectHit([{name:'A', size:15, samples:ringSamples(0.4, {off:12})}], 0).ring, null, 'Ball neben dem Ring (außerhalb des Kreises)');
  assert.equal(detectHit([{name:'A', size:15, samples:ringSamples(1.4)}], 0).ring, null, 'zu spät (nach dem Suchfenster)');
  const two = detectHit([{name:'A', size:15, samples:ringSamples(0.4)}, {name:'B', size:15, samples:ringSamples(0.4)}], 0);
  assert.equal(two.ring, null, 'zwei Ringe gleich stark: unklar, kein Treffer');
  assert.equal(circleMask(5).reduce((a, b) => a + b, 0), 9);
  assert.equal(speedKmh(7, 0.35), 72); assert.equal(speedKmh(7, 0.05), null);
});

// Stellung frontal, KL 200 px, Schultern bei x 450/550 (linke Schulter des Spielers im Bild rechts), Füße am Boden y 600.
function stanceFrame({front = null, lead = 'l', armUp = true, width = 1.4, wristY = 380, torso = 120}){
  const half = 50*width, st = 25;   // st: vorderer Fuß 25 px tiefer im Bild (näher an der Kamera)
  const f = {t:0, bl:200, hip:{x:500, y:300 + torso}, lSh:{x:550, y:300}, rSh:{x:450, y:300},
    lAnk:{x:500 + half, y:600 + (front === 'l' ? st : 0)}, rAnk:{x:500 - half, y:600 + (front === 'r' ? st : 0)},
    lWr:{x:560, y:wristY}, rWr:{x:440, y:wristY}};
  if(front && armUp) f[lead + 'Wr'] = {x:f[lead + 'Wr'].x, y:300};
  return f;
}
const many = f => Array.from({length:10}, (_, i) => ({...f, t:i/30}));

test('Abwehr (DHB): Heraustreten mit Fuß und Führarm auf der Wurfarmseite des Gegners', () => {
  assert.equal(leadSide('R'), 'l', 'gegen Rechtshänder links'); assert.equal(leadSide('L'), 'r', 'gegen Linkshänder rechts');
  const ok = judgeOut(many(stanceFrame({front:'l', lead:'l'})), 0, 1, 'R');
  assert.deepEqual([ok.foot, ok.arm, ok.say], [true, true, '']);
  const wf = judgeOut(many(stanceFrame({front:'r', lead:'l'})), 0, 1, 'R');
  assert.equal(wf.foot, false); assert.equal(wf.say, 'Linker Fuß vor.');
  const wa = judgeOut(many(stanceFrame({front:'l', lead:'l', armUp:false})), 0, 1, 'R');
  assert.equal(wa.arm, false); assert.equal(wa.say, 'Linke Hand hoch zum Wurfarm.');
  const lh = judgeOut(many(stanceFrame({front:'r', lead:'r'})), 0, 1, 'L');
  assert.deepEqual([lh.foot, lh.arm], [true, true], 'gegen Linkshänder: rechts vorn');
  assert.equal(judgeOut(many(stanceFrame({front:'l', lead:'l'})), 0, 1, 'L').foot, false, 'gegen Linkshänder links vorn ist falsch');
  assert.equal(judgeOut(many(stanceFrame({})), 0, 1, 'R').why.includes('Füße nicht versetzt'), true);
});

test('Abwehr (DHB): Grundposition breit, Arme in Vorhalte, Oberkörper fast aufrecht', () => {
  const stand = {torso:120};
  assert.deepEqual(baseFrame(stanceFrame({}), stand), {wide:true, arms:true, upright:true});
  assert.equal(baseFrame(stanceFrame({width:0.8}), stand).wide, false, 'schmaler als die Schultern');
  assert.equal(baseFrame(stanceFrame({wristY:460}), stand).arms, false, 'Arme hängen unter der Hüfte');
  assert.equal(baseFrame(stanceFrame({torso:80}), stand).upright, false, 'Oberkörper weit nach vorn gebeugt');
  const s = defSummary([{ok:true, react:0.4, out:{foot:false, arm:true}}], 0.9, TH_D, {wide:0.5, arms:0.9, upright:0.4});
  assert.match(s.say, /Heraustreten 0 von 1 mit richtiger Stellung\..*Beine etwas mehr als schulterbreit\..*Oberkörper fast aufrecht/);
  assert.doesNotMatch(s.say, /Arme leicht angewinkelt/);
});
