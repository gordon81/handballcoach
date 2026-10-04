// Aufgaben: eine Serie mit Ziel („7 von 10“) und einem Kriterium pro Wiederholung.
// Reine Logik ohne Browser (Unit-Tests in tests/unit.mjs); Ablauf im Training: taskRun.js.
import { TH, KL_CM } from './config.js';

// reps = Würfe pro Serie, goal = so viele müssen geschafft sein (null: eigenes Serien-Kriterium in result()).
// callInAir: Ziel erst beim Absprung ansagen. calls: vor das Ziel wird zufällig eins davon gesagt („Hoch. Orange kurz“).
// pause: eigene Pause nach dem Wurf (s) statt der Einstellung.
export const TASKS = {
  line: {id:'line', name:'Absprung an der Linie', short:'So nah wie möglich an der Linie abspringen, ohne Übertritt.',
    intro:'Aufgabe Absprung an der Linie. Spring so nah wie möglich an der Linie ab, ohne überzutreten. Nach jedem Wurf sage ich dir den Abstand.',
    reps:10, goal:7},
  air: {id:'air', name:'Entscheidung in der Luft', short:'Auf „Los“ anlaufen. Das Ziel kommt erst beim Absprung.',
    intro:'Aufgabe Entscheidung in der Luft. Auf Los läufst du an. Das Ziel sage ich erst, wenn du springst.',
    reps:10, goal:7, callInAir:true},
  height: {id:'height', name:'Wurfhöhe auf Ansage', short:'Vor dem Ziel kommt „Hoch“ (über dem Kopf) oder „Hüfte“ (seitlich, Hand unter der Schulter).',
    intro:'Aufgabe Wurfhöhe auf Ansage. Vor dem Ziel sage ich hoch oder Hüfte. Bei hoch wirfst du über dem Kopf ab, bei Hüfte seitlich aus der Hüfte.',
    reps:10, goal:7, calls:['Hoch', 'Hüfte']},
  angle: {id:'angle', name:'Winkel vergrößern', short:'Kameraposition 2 (Feld mit Tor). Im Sprung Richtung Tormitte fliegen, nicht geradeaus.',
    intro:'Aufgabe Winkel vergrößern. Flieg im Sprung Richtung Tormitte, damit der Wurfwinkel größer wird. Ich sage dir nach jedem Wurf, ob du genug nach innen geflogen bist.',
    reps:10, goal:7, needCam:'court'},
  fastbreak: {id:'fastbreak', name:'Gegenstoß auf Zeit', short:'Weit weg starten (z. B. Mittellinie) und beim Loslaufen laut rufen. Gemessen wird die Zeit vom Ruf bis zum Absprung.',
    intro:'Aufgabe Gegenstoß auf Zeit. Stell dich weit weg, zum Beispiel an die Mittellinie. Ruf laut, wenn du losläufst, dann sage ich das Ziel. Ich messe die Zeit bis zum Absprung.',
    reps:5, goal:4, shout:true},
  pivot: {id:'pivot', name:'Kreisläufer: Drehen auf Ansage', short:'Mit dem Rücken zum Tor an der Linie stehen. Auf „Links“ oder „Rechts“ in diese Richtung drehen und vor der Linie abspringen.',
    intro:'Aufgabe Kreisläufer. Stell dich mit dem Rücken zum Tor an die Linie. Ich sage links oder rechts, dann drehst du dich in diese Richtung und wirfst. Nicht übertreten.',
    reps:10, goal:7, calls:['Links', 'Rechts']},
  tired: {id:'tired', name:'Serie unter Ermüdung', short:'20 Würfe mit nur 2 s Pause. Die Sprunghöhe soll bis zum Ende halten, kein Übertritt.',
    intro:'Aufgabe Serie unter Ermüdung. Zwanzig Würfe mit kurzer Pause. Halte die Sprunghöhe bis zum Schluss und tritt nicht über.',
    reps:20, goal:null, pause:2}
};

// Wie viele Würfe am Anfang und am Ende der Ermüdungs-Serie verglichen werden (bei 20 Würfen je 5).
const edge = task => Math.max(1, Math.min(5, Math.floor(task.reps/2)));
const avg = a => a.reduce((x, y) => x + y, 0)/a.length;

const BAD = {over:'Übertritt', leg:'Falsches Sprungbein', arm:'Wurfarm zu spät oben'};
const SAY_BAD = {over:'Übertritt.', leg:'Falsches Bein.', arm:'Arm früher hoch.'};

// Abstand des Absprungs vor der Linie in cm (auf 5 cm gerundet, Schätzung über KL_CM).
export const lineCm = line => Math.max(0, Math.round(-line*KL_CM/5)*5);

// Eine Wiederholung bewerten. entry = Log-Eintrag des Wurfs (issues, m, target, hit).
// → {ok, why (für Karte/Log), say (Ansage)} oder null, wenn der Wurf für die Aufgabe nicht zählt.
// prev = die bisherigen Würfe dieser Serie (für Vergleiche mit dem Anfang).
export function judge(id, entry, th = TH, prev = []){
  const is = k => (entry.issues || []).includes(k), m = entry.m || {};
  if(id==='line'){
    if(is('over') || m.line > 0) return {ok:false, why:'Übertritt', say:'Übertritt.'};
    if(m.line == null) return {ok:false, why:'Linie nicht geprüft', say:'Linie nicht erkannt.'};
    const cm = lineCm(m.line), d = cm < 5 ? 'Direkt an der Linie' : `${cm} Zentimeter vor der Linie`;
    if(m.line < (th.taskLineFar ?? TH.taskLineFar)) return {ok:false, why:`${cm} cm vor der Linie, zu weit weg`, say:`${d}. Näher ran.`};
    return {ok:true, why:`${cm} cm vor der Linie`, say:`Geschafft. ${d}.`};
  }
  if(id==='air'){
    if(!entry.target) return null;   // ohne „Los“ geworfen: zählt nicht
    const bad = ['over','leg','arm'].find(is);
    if(bad) return {ok:false, why:BAD[bad], say:SAY_BAD[bad]};
    if(entry.hit===false) return {ok:false, why:'Ziel verfehlt', say:'Daneben.'};
    return {ok:true, why:'Sauber trotz später Ansage', say:'Sauber.'};
  }
  if(id==='height'){
    const c = entry.call; if(!c || m.armT == null) return null;   // ohne Höhen-Ansage oder ohne Wurf-Frame: zählt nicht
    if(c==='Hoch') return m.armT > (th.taskHighArm ?? TH.taskHighArm) ? {ok:true, why:'Hoch abgeworfen', say:'Hoch, gut.'}
      : {ok:false, why:'Nicht hoch genug, Hand unter dem Kopf', say:'Höher. Hand über den Kopf.'};
    if(m.shT >= (th.taskHipShoulder ?? TH.taskHipShoulder)) return {ok:false, why:'Zu hoch für Hüfte', say:'Tiefer. Aus der Hüfte.'};
    if(m.hipT < (th.taskHipLow ?? TH.taskHipLow)) return {ok:false, why:'Zu tief', say:'Etwas höher, Hüfthöhe.'};
    return {ok:true, why:'Aus der Hüfte abgeworfen', say:'Hüfte, gut.'};
  }
  if(id==='angle'){
    if(is('over') || m.line > 0) return {ok:false, why:'Übertritt', say:'Übertritt.'};
    if(m.flyAng == null) return {ok:false, why:'Flug nicht gemessen (Linie fehlt?)', say:'Nicht gemessen.'};
    // Der Winkel im Bild ist kein echter Winkel in der Halle (Perspektive): nur „gerade“ oder „nach innen“ ansagen.
    if(m.flyAng < (th.taskFlyAng ?? TH.taskFlyAng)) return {ok:false, why:'Zu gerade geflogen', say:'Zu gerade. Mehr Richtung Tormitte.'};
    return {ok:true, why:'Nach innen geflogen', say:'Geschafft. Gut nach innen.'};
  }
  if(id==='fastbreak'){
    if(m.breakT == null) return null;   // ohne Ruf geworfen: zählt nicht
    const s = m.breakT.toFixed(1).replace('.', ',');
    if(is('over') || m.line > 0) return {ok:false, why:`Übertritt (${s} s)`, say:`Übertritt. ${s} Sekunden.`};
    if(is('leg')) return {ok:false, why:`Falsches Sprungbein (${s} s)`, say:`Falsches Bein. ${s} Sekunden.`};
    if(m.breakT > (th.taskBreakMax ?? TH.taskBreakMax)) return {ok:false, why:`${s} s, zu langsam`, say:`${s} Sekunden. Schneller.`};
    return {ok:true, why:`${s} s`, say:`Geschafft. ${s} Sekunden.`};
  }
  if(id==='pivot'){
    const c = entry.call; if(!c) return null;
    if(is('over') || m.line > 0) return {ok:false, why:'Übertritt', say:'Übertritt.'};
    if(m.turn == null) return {ok:false, why:'Drehung nicht erkannt', say:'Drehung nicht erkannt.'};
    const dir = m.turn > 0 ? 'Links' : 'Rechts', r = m.react != null ? ` Reaktion ${m.react.toFixed(1).replace('.', ',')} Sekunden.` : '';
    if(Math.abs(m.turn) < (th.taskTurnMin ?? TH.taskTurnMin)) return {ok:false, why:'Kaum gedreht', say:'Mehr drehen.'};
    if(dir !== c) return {ok:false, why:`Falsch herum gedreht (${dir.toLowerCase()})`, say:'Falsche Richtung.'};
    return {ok:true, why:`Richtig gedreht${m.react != null ? `, ${m.react.toFixed(1).replace('.', ',')} s` : ''}`, say:`Richtig.${r}`};
  }
  if(id==='tired'){
    if(is('over') || m.line > 0) return {ok:false, why:'Übertritt', say:'Übertritt.'};
    const k = edge(TASKS.tired), first = prev.slice(0, k).map(e => e.m?.jump).filter(x => x != null);
    if(first.length === k && prev.length >= k && m.jump != null && m.jump < avg(first)*(th.taskTiredKeep ?? TH.taskTiredKeep))
      return {ok:true, why:`Sprung ${Math.round(m.jump/avg(first)*100)} % vom Anfang`, say:'Sprung wird flacher. Knie hoch.'};
    return {ok:true, why:'Sprung gehalten', say:'Gut.'};
  }
  return null;
}

// Stand einer Serie aus ihren Würfen (neu gerechnet, damit spätere Treffer-Tipps mitzählen).
export function tally(id, entries, th = TH){
  let n = 0, hits = 0;
  entries.forEach((e, i) => { const v = judge(id, e, th, entries.slice(0, i)); if(!v) return; n++; if(v.ok) hits++; });
  return {n, hits};
}

export const passed = (task, hits) => hits >= task.goal;

// Ergebnis einer fertigen Serie: {passed, hits, n, score (0–1, für den Bestwert), label (Anzeige), say (Ansage)}.
export function result(task, entries, th = TH){
  const {n, hits} = tally(task.id, entries, th);
  if(task.id==='tired'){
    const k = edge(task), j = entries.map(e => e.m?.jump).filter(x => x != null), overs = n - hits;
    const ratio = j.length >= 2*k ? avg(j.slice(-k))/avg(j.slice(0, k)) : null, pct = ratio == null ? null : Math.round(ratio*100);
    const keep = th.taskTiredKeep ?? TH.taskTiredKeep, ok = ratio != null && ratio >= keep && !overs;
    const say = ok ? `Aufgabe geschafft: Sprunghöhe gehalten, ${pct} Prozent vom Anfang, kein Übertritt.`
      : [pct != null && ratio < keep ? `Sprunghöhe am Ende ${pct} Prozent vom Anfang, Ziel ${Math.round(keep*100)}.` : '', overs ? `${overs} Übertritt${overs > 1 ? 'e' : ''}.` : ''].join(' ').trim() || 'Nicht geschafft.';
    return {passed:ok, hits, n, score:ok ? Math.min(1, ratio) : 0, label:pct != null ? `${pct} %` : '–', say};
  }
  return {passed:passed(task, hits), hits, n, score:n ? hits/n : 0, label:`${hits} von ${n}`, say:endSpeech(task, hits, n)};
}
// Ansage nach einer Wiederholung: Ergebnis, dann wie viele noch fehlen bzw. das Serien-Ergebnis.
export function repSpeech(task, v, n, hits, end = null){ return `${v.say} ${n < task.reps ? `Noch ${task.reps - n}.` : (end?.say ?? endSpeech(task, hits, n))}`; }
export function endSpeech(task, hits, n){
  return passed(task, hits) ? `Aufgabe geschafft: ${hits} von ${n}.` : `${hits} von ${n}. Ziel war ${task.goal}. Tippe auf Nochmal.`;
}

// Verlauf je Aufgabe: hist = {[id]: [{at, sid, hits, n, goal}]}, die letzten 30.
export function addHistory(hist, id, rec){ const a = (hist[id] ||= []); a.push(rec); if(a.length > 30) a.splice(0, a.length - 30); return hist; }
export function best(hist, id){
  const a = hist?.[id] || []; if(!a.length) return null;
  const sc = r => r.score ?? r.hits/r.n;
  return a.reduce((b, r) => sc(r) > sc(b) || (sc(r) === sc(b) && r.n > b.n) ? r : b);
}
// Ungefähre Sprechdauer (s), damit die erste Zielansage die Anleitung nicht abschneidet.
export const speakSec = text => Math.min(9, 0.5 + text.split(/\s+/).length*0.36);
