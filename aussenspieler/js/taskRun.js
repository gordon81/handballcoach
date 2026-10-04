// Aufgabe im Training: Serie starten, jede Wiederholung bewerten und ansagen, Zähler im Bild, Ende-Karte
// mit „Nochmal“, Verlauf je Aufgabe. Die Regeln selbst stehen in tasks.js (ohne Browser, unit-getestet).
import { app } from './state.js';
import { settings, store, th } from './store.js';
import { $ } from './dom.js';
import { esc } from '../../shared/js/utils.js';
import { TASKS, judge, tally, repSpeech, result, addHistory, best, speakSec } from './tasks.js';

// Gewählte Aufgabe (null = freies Training). Nur im Kamera-Modus; Videodateien werden immer frei analysiert.
export const chosenTask = () => TASKS[settings.task] || null;

let onAgain = () => {}, onStop = () => {};
// again: Serie neu starten (Training starten), stop: Training beenden. Gesetzt von setupView.js.
export function onTaskButtons(again, stop){ onAgain = again; onStop = stop; }
// Serie fertig (letzter Wurf ausgewertet): Training stoppen, die Ende-Karte bleibt stehen.
// Erst stoppen, dann die Ende-Karte zeigen: „Nochmal“ und die Einrichtung finden das Training dann schon gestoppt.
let pendingEnd = null;
export function onSeriesDone(){
  if(app.task?.done && app.state!=='off') onStop();
  if(pendingEnd){ const p = pendingEnd; pendingEnd = null; showEnd(...p); }
}
// Aufgabe startet jeden Wurf mit einem Ruf des Spielers (Gegenstoß): Mikrofon an, keine Ansage ohne Ruf.
export const taskShout = () => !!(app.task && !app.task.done && TASKS[app.task.id].shout);
// Aufgabe sagt das Ziel erst beim Absprung an?
export const taskCallInAir = () => !!(app.task && !app.task.done && TASKS[app.task.id].callInAir);
// Vorsatz vor dem Ziel („Hoch“ / „Hüfte“) oder null. Der gewählte steht bis zum Wurf in app.task.call.
export function taskCall(){
  const r = app.task; if(!r || r.done || !TASKS[r.id].calls) return null;
  const c = TASKS[r.id].calls; r.callT = performance.now()/1000;   // Zeitpunkt der Ansage (Kreisläufer: Drehung ab hier)
  return r.call = c[Math.floor(Math.random()*c.length)];
}
// Pause nach dem Wurf: die Aufgabe kann eine eigene haben (Serie unter Ermüdung: 2 s).
export const taskPause = () => (app.task && !app.task.done && TASKS[app.task.id].pause) || settings.pause;

// Serie beginnen. → Text der Anleitung (wird statt „Los geht's“ gesprochen) und wie lange sie dauert.
export function beginTask(t){
  const task = chosenTask();
  if(!task || app.source!=='cam'){ app.task = null; renderTaskBox(); return null; }
  app.task = {id:task.id, run:Date.now(), entries:[], done:false};
  app.holdUntil = t + speakSec(task.intro);   // erste Ansage erst nach der Anleitung
  hideEnd(); renderTaskBox();
  return task.intro;
}
export function endTaskRun(){ if(app.task && !app.task.done) app.task = null; renderTaskBox(); }

// Nach jedem Wurf (tracking.finish): bewerten, im Log-Eintrag vermerken. → Ansage-Text oder null (normale Ansage).
export function taskThrow(entry){
  const r = app.task; if(!r || r.done) return null;
  const task = TASKS[r.id];
  if(r.call){ entry.call = r.call; r.call = null; }
  const v = judge(r.id, entry, th(), r.entries.filter(e => e.task));
  if(!v){ renderTaskBox(); return r.id==='air' ? 'Ohne Los geworfen, zählt nicht.' : r.id==='height' ? 'Ohne Ansage geworfen, zählt nicht.' : null; }
  r.entries.push(entry);
  const {n, hits} = tally(r.id, r.entries, th());
  entry.task = {id:r.id, run:r.run, ok:v.ok, why:v.why, n};
  let speech = repSpeech(task, v, n, hits);
  if(n >= task.reps){
    r.done = true;
    const res = result(task, r.entries, th());
    const rec = {at:Date.now(), run:r.run, sid:settings.session?.id, hits, n, goal:task.goal, passed:res.passed, score:res.score, label:res.label};
    settings.taskHist = addHistory(settings.taskHist || {}, r.id, rec);
    store();
    speech = `${v.say} ${res.say}`;
    pendingEnd = [task, rec, res];
  }
  renderTaskBox();
  return speech;
}
export const taskDone = () => !!app.task?.done;
// Treffer wurde nachträglich getippt (zählt bei „Entscheidung in der Luft“): Zähler neu rechnen.
export function taskRecount(entry){
  const v = entry?.task && judge(entry.task.id, entry, th());
  if(v){ entry.task.ok = v.ok; entry.task.why = v.why; store(); }
  renderTaskBox();
}

/* ---------- Anzeige ---------- */
// Großer Zähler oben rechts: aus 4 m lesbar, wie weit die Serie ist.
export function renderTaskBox(){
  const box = $('#taskBox'), r = app.task;
  if(!r){ box.hidden = true; return; }
  const task = TASKS[r.id], {n, hits} = tally(r.id, r.entries, th());
  box.hidden = false;
  const goal = task.goal != null ? `Ziel ${task.goal}` : 'Sprung halten';
  box.innerHTML = `<b>${Math.min(n + (r.done ? 0 : 1), task.reps)}<small>/${task.reps}</small></b><span>✓ ${hits} · ${goal}</span>`;
  box.setAttribute('aria-label', `${task.name}: Wurf ${n} von ${task.reps}, ${hits} geschafft, ${goal}`);
}

const label = r => r.label || `${r.hits} von ${r.n}`;
function showEnd(task, rec, res){
  const c = $('#taskEnd'), b = best(settings.taskHist, task.id);
  c.innerHTML = `<h3>${esc(task.name)}</h3>
    <p class="big ${rec.passed ? 'ok' : 'bad'}">${esc(label(rec))}</p>
    <p>${rec.passed ? 'Aufgabe geschafft!' : `${task.goal != null ? `Ziel war ${task.goal}.` : esc(res.say)} Gleich nochmal?`}${b && b.run!==rec.run ? ` Bestwert: ${esc(label(b))}.` : rec.passed ? ' Neuer Bestwert.' : ''}</p>
    <div class="btnrow"><button class="primaryBtn" data-t="again">Nochmal</button><button data-t="end">Fertig</button></div>`;
  c.hidden = false; $('#card').style.display = 'none';   // Ergebnis-Karte des letzten Wurfs nicht darunter
  c.querySelector('[data-t=again]').onclick = () => { hideEnd(); onAgain(); };
  c.querySelector('[data-t=end]').onclick = () => { hideEnd(); app.task = null; renderTaskBox(); };
}
export function hideEnd(){ $('#taskEnd').hidden = true; }

// Auswahl in der Einrichtung: große Buttons, darunter kurz, was zu tun ist, und der Bestwert.
export function taskBlock(btn){
  const keys = ['free', ...Object.keys(TASKS)], cur = chosenTask();
  const name = k => k==='free' ? 'Freies Training' : TASKS[k].name;
  const b = cur && best(settings.taskHist, cur.id), last = cur && settings.taskHist?.[cur.id]?.at(-1);
  const info = !cur ? 'Würfe mit Zielansage und Technik-Feedback, ohne feste Anzahl.'
    : `${cur.short} ${cur.reps} Würfe` + (cur.goal != null ? `, geschafft bei ${cur.goal}.` : '.') + (b ? ` Bestwert ${label(b)}, zuletzt ${label(last)}.` : '');
  return `<p class="muted">Übung:</p><div class="btnrow tasks">${keys.map(k => btn('task', name(k), (settings.task || 'free')===k ? 'on' : '', true, k)).join('')}</div>
    <p class="muted">${esc(info)}</p>`;
}

// Abschnitt für Bericht und Log: Serien dieses Trainings.
export function sessionRuns(){
  const sid = settings.session?.id, out = [];
  for(const id in settings.taskHist || {}) for(const r of settings.taskHist[id]) if(r.sid===sid) out.push({...r, name:TASKS[id]?.name || id, label:label(r)});
  return out.sort((a, b) => a.at - b.at);
}
