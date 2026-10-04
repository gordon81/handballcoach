// Aufgaben: eine Serie mit Ziel („7 von 10“) und einem Kriterium pro Wiederholung.
// Reine Logik ohne Browser (Unit-Tests in tests/unit.mjs); Ablauf im Training: taskRun.js.
import { TH, KL_CM } from './config.js';

// reps = Würfe pro Serie, goal = so viele müssen geschafft sein. callInAir: Ziel erst beim Absprung ansagen.
export const TASKS = {
  line: {id:'line', name:'Absprung an der Linie', short:'So nah wie möglich an der Linie abspringen, ohne Übertritt.',
    intro:'Aufgabe Absprung an der Linie. Spring so nah wie möglich an der Linie ab, ohne überzutreten. Nach jedem Wurf sage ich dir den Abstand.',
    reps:10, goal:7},
  air: {id:'air', name:'Entscheidung in der Luft', short:'Auf „Los“ anlaufen. Das Ziel kommt erst beim Absprung.',
    intro:'Aufgabe Entscheidung in der Luft. Auf Los läufst du an. Das Ziel sage ich erst, wenn du springst.',
    reps:10, goal:7, callInAir:true}
};

const BAD = {over:'Übertritt', leg:'Falsches Sprungbein', arm:'Wurfarm zu spät oben'};
const SAY_BAD = {over:'Übertritt.', leg:'Falsches Bein.', arm:'Arm früher hoch.'};

// Abstand des Absprungs vor der Linie in cm (auf 5 cm gerundet, Schätzung über KL_CM).
export const lineCm = line => Math.max(0, Math.round(-line*KL_CM/5)*5);

// Eine Wiederholung bewerten. entry = Log-Eintrag des Wurfs (issues, m, target, hit).
// → {ok, why (für Karte/Log), say (Ansage)} oder null, wenn der Wurf für die Aufgabe nicht zählt.
export function judge(id, entry, th = TH){
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
  return null;
}

// Stand einer Serie aus ihren Würfen (neu gerechnet, damit spätere Treffer-Tipps mitzählen).
export function tally(id, entries, th = TH){
  let n = 0, hits = 0;
  for(const e of entries){ const v = judge(id, e, th); if(!v) continue; n++; if(v.ok) hits++; }
  return {n, hits};
}

export const passed = (task, hits) => hits >= task.goal;
// Ansage nach einer Wiederholung: Ergebnis, dann wie viele noch fehlen bzw. das Serien-Ergebnis.
export function repSpeech(task, v, n, hits){ return `${v.say} ${n < task.reps ? `Noch ${task.reps - n}.` : endSpeech(task, hits, n)}`; }
export function endSpeech(task, hits, n){
  return passed(task, hits) ? `Aufgabe geschafft: ${hits} von ${n}.` : `${hits} von ${n}. Ziel war ${task.goal}. Tippe auf Nochmal.`;
}

// Verlauf je Aufgabe: hist = {[id]: [{at, sid, hits, n, goal}]}, die letzten 30.
export function addHistory(hist, id, rec){ const a = (hist[id] ||= []); a.push(rec); if(a.length > 30) a.splice(0, a.length - 30); return hist; }
export function best(hist, id){
  const a = hist?.[id] || []; if(!a.length) return null;
  return a.reduce((b, r) => r.hits/r.n > b.hits/b.n || (r.hits/r.n === b.hits/b.n && r.n > b.n) ? r : b);
}
// Ungefähre Sprechdauer (s), damit die erste Zielansage die Anleitung nicht abschneidet.
export const speakSec = text => Math.min(9, 0.5 + text.split(/\s+/).length*0.36);
