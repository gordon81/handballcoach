// Zustandsautomat pro Wurf: off → ready → runup → air → cool → ready …
// Erkennt Absprung und Landung aus den Pose-Frames und übergibt den Sprung an analysis.js.
import { L, TURN_SIGN } from './config.js';
import { ringsOn, evalHit, HIT_WAIT } from './rings.js';
import { app } from './state.js';
import { settings, log, store, ensureSession } from './store.js';
import { $, canvas, showHint } from './dom.js';
import { dist, mid, pct, pick, angDiff, colorOf } from '../../shared/js/utils.js';
import { say, beep } from '../../shared/js/speech.js';
import { quiet } from './shout.js';
import { recStart, recDrop, recFinish, recAge } from './clips.js';
import { evaluate } from './analysis.js';
import { showCard, clipReady, cardHit } from './ui/card.js';
import { renderLog } from './ui/logView.js';
import { taskThrow, taskDone, taskCallInAir, taskCall, taskPause, taskShout, onSeriesDone, taskRecount } from './taskRun.js';

const LABELS = {off:'Gestoppt', ready:'Bereit', runup:'Anlauf', air:'Sprung', cool:'Pause'};
let H=[], visSince=null, lastSeen=-1, lastTarget=null;
let callAt=null;   // Modus „Zuruf“: Zeitpunkt der Zielansage nach dem Ruf
let groundY=null, groundAt=null, baseHip=null, baseMed=null, bodyRef=null, ev=null;

export function setState(s, t){
  app.state = s; app.stateT = t;
  if(s==='off' || s==='air'){ callAt = null; }
  if(s==='off') app.pending = null;
  if(s==='off') recDrop();
  stateText();
}
function stateText(){
  const el = $('#state'), s = app.state; el.dataset.s = s;
  el.textContent = (s==='ready' && app.source==='file') ? 'Analyse aktiv'
    : callAt!==null && (s==='ready' || s==='cool') ? 'Zuruf gehört'
    : s==='ready' && (settings.mode==='call' || taskShout()) && app.source==='cam' ? 'Warte auf Zuruf' : LABELS[s];
}

// Zuruf des Spielers (Mikrofon): Ziel nach zufälligen callMin…callMax Sekunden ansagen.
// Nur wenn der Spieler gerade im Bild ist (in den letzten 2 s erkannt): Lärm von anderen Feldern zählt so nicht.
export function heardCall(){
  // Gegenstoß: der Ruf startet die Uhr und das Ziel kommt sofort; der Spieler ist dabei noch weit weg (nicht im Bild).
  if(taskShout()){
    if(app.source!=='cam' || app.marking || (app.state!=='ready' && app.state!=='cool')) return;
    const now = performance.now()/1000; app.breakAt = now; quiet(0.3); beep(); announce(now); return;
  }
  if(app.source!=='cam' || app.marking || settings.mode!=='call' || callAt!==null) return;
  if(app.state!=='ready' && app.state!=='cool') return;
  const now = performance.now()/1000;
  if(now - lastSeen > 2){ showHint('Zuruf gehört, aber niemand im Bild. Stell dich so hin, dass die Kamera dich sieht.', 2500); return; }
  const lo = Math.max(0, +settings.callMin || 0), hi = Math.max(lo, +settings.callMax || lo);
  callAt = now + lo + Math.random()*(hi - lo);
  quiet(0.3); beep(); stateText();
}
export function resetTracking(t){ H=[]; app.latest=null; visSince=null; ev=null; groundY=groundAt=baseHip=baseMed=bodyRef=null; app.target=null; app.pending=null; hudTarget(null); if(app.state!=='off') setState('ready', t); }
export function hudTarget(name){ const el=$('#target'); el.textContent = name || ''; el.style.color = name ? colorOf(name) : ''; }

// Ein Ergebnis der KI pro Videobild verarbeiten (aus der Hauptschleife).
export function processFrame(res, t){
  if(app.source==='file' && H.length && t < H[H.length-1].t - 0.001) resetTracking(t);   // im Video zurückgespult
  onResult(res, t);
  tick(t);
}

function makeFrame(lm, t, wl){
  const W = canvas.width, Hh = canvas.height;
  const p = {}; for(const k in L){ const q=lm[L[k]]; p[k] = {x:q.x*W, y:q.y*Hh, v:q.visibility ?? 1}; }
  const R = settings.hand === 'R';
  const f = {t, lm, sh:mid(p.lSh,p.rSh), hip:mid(p.lHip,p.rHip), nose:p.nose,
    wr: R?p.rWr:p.lWr, wsh: R?p.rSh:p.lSh,
    foot:[{y:Math.max(p.lAnk.y,p.lHeel.y,p.lToe.y), toe:p.lToe, heel:p.lHeel},
          {y:Math.max(p.rAnk.y,p.rHeel.y,p.rToe.y), toe:p.rToe, heel:p.rHeel}]};
  f.bodyLen = dist(f.sh, mid(p.lAnk,p.rAnk));
  f.low = Math.max(f.foot[0].y, f.foot[1].y);
  f.valid = Math.min(p.lHip.v,p.rHip.v,p.lAnk.v,p.rAnk.v,p.lSh.v,p.rSh.v) > 0.35 && f.bodyLen > 20;
  if(wl){
    const yaw = (a,b) => Math.atan2(wl[b].z-wl[a].z, wl[b].x-wl[a].x) * 180/Math.PI;
    f.hipYaw = yaw(23,24); f.shYaw = yaw(11,12); f.twist = angDiff(f.shYaw, f.hipYaw);
  } else { f.shYaw = f.twist = f.hipYaw = null; }
  return f;
}

function onResult(res, t){
  const lm = res?.landmarks?.[0];
  const f = lm ? makeFrame(lm, t, res.worldLandmarks?.[0]) : null;
  app.latest = f;
  if(!f || !f.valid){ visSince=null; if(app.state==='air' && t-lastSeen>0.4) finish(t); return; }
  if(visSince===null) visSince = t;
  lastSeen = t;
  H.push(f); while(H.length && t-H[0].t > 3) H.shift();
  if(app.state!=='off') step(f, t);
}

function step(f, t){
  if(app.state==='air'){ airFrame(f, t, false); return; }
  const w = H.filter(h => !h.air && h.t >= t-0.8 && h.t <= t-0.15);
  if(w.length >= 4){
    groundAt = groundFit(w); groundY = groundAt(t);
    // Hüfte für die Sprung-Erkennung als Gerade über die Zeit: wer von der Kamera weggeht, dessen Hüfte steigt im Bild,
    // ohne zu springen. Für die gemessene Sprunghöhe bleibt der Median (so sind die Grenzen in TH eingestellt).
    baseHip = lineFit(w, h => h.hip.y)(t); baseMed = pct(w.map(h=>h.hip.y), 0.5);
    bodyRef = pct(w.map(h=>h.bodyLen), 0.5);
  }
  if(groundY===null || app.state==='cool') return;
  f.cand = (baseHip - f.hip.y) > 0.12*bodyRef && (groundY - f.low) > 0.04*bodyRef;
  const prev = H[H.length-2];
  if(f.cand && prev?.cand) startAir(t);
}

// Boden als Gerade über die Zeit: läuft der Spieler auf die Kamera zu (oder weg), wandert der Fußpunkt
// im Bild nach unten (oben). Ein fester Boden würde den Absprung dann zu spät (zu früh) ansetzen.
// Gerade durch val(h) über die Zeit (kleinste Quadrate) → Funktion t → Wert.
function lineFit(w, val){
  const n = w.length, mt = w.reduce((a,h)=>a+h.t,0)/n, mv = w.reduce((a,h)=>a+val(h),0)/n;
  let sxy = 0, sxx = 0; for(const h of w){ sxy += (h.t-mt)*(val(h)-mv); sxx += (h.t-mt)**2; }
  const b = sxx > 1e-6 ? sxy/sxx : 0;
  return t => mv + b*(t-mt);
}
function groundFit(w){
  const n = w.length, mt = w.reduce((a,h)=>a+h.t,0)/n, ml = w.reduce((a,h)=>a+h.low,0)/n;
  let sxy = 0, sxx = 0; for(const h of w){ sxy += (h.t-mt)*(h.low-ml); sxx += (h.t-mt)**2; }
  const b = sxx > 1e-6 ? sxy/sxx : 0, off = pct(w.map(h => h.low - (ml + b*(h.t-mt))), 0.8);
  return t => ml + b*(t-mt) + off;
}

function startAir(t){
  const ga = groundAt, bl = bodyRef;
  let j = H.length-1;
  while(j > 0 && H[j].low < ga(H[j].t) - 0.035*bl) j--;
  const tf = H[j], gy = ga(tf.t);
  const foot = tf.foot[0].y >= tf.foot[1].y ? 0 : 1;      // 0 = links, 1 = rechts
  const win = H.filter(h => h.t >= tf.t-0.04 && h.t <= tf.t+0.08);
  const armF = win.reduce((b,h) => (h.wr.y-h.nose.y) < (b.wr.y-b.nose.y) ? h : b, tf);
  const late = app.pending ? callLate(t, tf.t) : null;
  ev = {late, ga, breakAt:app.breakAt ?? null, runT:app.state==='runup' ? app.stateT : null, t0:tf.t, target:app.target, gy, base:baseMed, bl, foot, tf, armF, peak:Infinity, peakF:null, throwF:null, vmax:0, prevWr:null};
  for(let k=j; k<H.length; k++) airFrame(H[k], H[k].t, true);
  setState('air', t);
}

// Ziel erst jetzt ansagen (Aufgabe „Entscheidung in der Luft“). Gemessen wird, wie lange nach dem Absprung
// die App das Ziel abschickt (Erkennung) und wann die Sprachausgabe wirklich anfängt (Handy-Verzögerung).
function callLate(t, t0){
  const name = app.pending; app.pending = null;
  app.target = name; hudTarget(name);
  const box = {det:Math.round((t - t0)*1000), speak:null, entry:null};
  const u = say(name);
  if(u) u.onstart = () => { box.speak = Math.round((performance.now()/1000 - t0)*1000); if(box.entry){ box.entry.m.callLag = box.speak; store(); } };
  return box;
}

function airFrame(f, t, replay){
  f.air = true;
  if(f.hip.y < ev.peak){ ev.peak = f.hip.y; ev.peakF = f; }
  // Wurf = schnellstes Handgelenk relativ zur Hüfte (Körperbewegung beim Absprung zählt nicht mit).
  const rw = {x:f.wr.x - f.hip.x, y:f.wr.y - f.hip.y};
  if(ev.prevWr){ const dt = t-ev.prevWr.t; if(dt>0){ const v = dist(rw, ev.prevWr.p)/dt/ev.bl; if(v>ev.vmax){ ev.vmax=v; ev.throwF=f; } } }
  ev.prevWr = {p:rw, t};
  if(replay) return;
  const landed = t-ev.t0 > 0.25 && (f.low >= ev.gy - 0.03*ev.bl || ev.base - f.hip.y < 0.04*ev.bl);
  if(landed || t-ev.t0 > 1.8) finish(t);
}

// Landung: Wurf bewerten, ansagen, speichern, anzeigen.
function finish(t){
  const e = ev; ev = null; if(!e) return;
  app.breakAt = null;
  const r = evaluate(e, t, H);

  if(!settings.session) ensureSession();
  settings.session.last = Date.now();
  const entry = {nr:(log.at(-1)?.nr || 0) + 1, sid:settings.session.id, target:e.target, res:r.res, issues:r.issues, good:r.good, praise:r.praise, main:r.main,
    tip:r.tip, rot:r.rot, noLine:r.noLine, m:r.m, hit:null, time:Date.now(), video:app.source==='file'};
  if(app.task?.callT != null){ Object.assign(entry.m, turnSince(app.task.callT, e.t0)); app.task.callT = null; }   // Kreisläufer
  if(e.breakAt != null) entry.m.breakT = Math.round((e.t0 - e.breakAt)*100)/100;   // Gegenstoß: Ruf → Absprung
  if(e.late){ entry.m.callDet = e.late.det; entry.m.callLag = e.late.speak; e.late.entry = entry; }
  say(taskThrow(entry) ?? r.speech, {queue:!!e.late});   // spätes Ziel nicht abschneiden
  log.push(entry); if(log.length > 1000) log.shift(); store();
  showCard(entry); renderLog();
  if(ringsOn() && app.source==='cam') autoHit(entry, e.throwF ? e.throwF.t : e.t0 + 0.25);
  if(recAge(t)!==null) recFinish(entry.time).then(ok => { if(ok){ entry.clip = true; store(); clipReady(entry); renderLog(); } });
  app.target = null; hudTarget(null);
  setState('cool', t);
  if(taskDone()) setTimeout(onSeriesDone, 1200);   // Serie fertig: nach dem Speichern des letzten Clips stoppen
}

// Drehung der Hüfte (3D-Schätzung) zwischen Ansage und Absprung: Summe der Yaw-Änderungen (°, + = gegen den Uhrzeigersinn
// von oben, also nach links für den Spieler) und Reaktionszeit bis 20° gedreht.
export function turnSince(t0, t1){
  const w = H.filter(h => h.t >= t0 && h.t <= t1 && h.hipYaw != null);
  if(w.length < 3) return {turn:null, react:null};
  let sum = 0, react = null;
  for(let i = 1; i < w.length; i++){ sum += angDiff(w[i].hipYaw, w[i-1].hipYaw); if(react === null && Math.abs(sum) > 20) react = Math.round((w[i].t - t0)*100)/100; }
  return {turn:Math.round(sum*TURN_SIGN), react};
}

// Treffererkennung (C1) und Wurfgeschwindigkeit (B7): warten, bis der Ball am Tor sein muss, dann die Ringe auswerten.
// Ein schon getipptes Treffer/Daneben bleibt; sonst wird es aus der Erkennung gesetzt.
function autoHit(entry, tRel){
  const wait = Math.max(0, (tRel + HIT_WAIT + 0.05 - performance.now()/1000)*1000);
  setTimeout(() => {
    const r = evalHit(tRel); if(!r) return;
    entry.hitAuto = r.ring; entry.m.flight = r.flight; entry.m.speed = r.speed;
    if(entry.target && entry.hit === null){ entry.hit = r.ring === entry.target; say(entry.hit ? 'Treffer.' : 'Daneben.', {queue:true}); taskRecount(entry); }
    store(); cardHit(entry); renderLog();
  }, wait);
}

// Zufälliges Ziel ansagen (nie zweimal dasselbe hintereinander).
export function announce(t){
  const list = settings.targets.filter(x => x.on && x.name.trim());
  if(!list.length){ showHint('Keine Ziele aktiv (Einstellungen)', 2500); return; }
  let c; do{ c = pick(list); } while(list.length > 1 && c.name === lastTarget);
  lastTarget = c.name;
  if(taskCallInAir()){
    // Nur „Los“: das Ziel kommt erst beim Absprung (startAir).
    app.pending = c.name; app.target = null; say('Los'); quiet(1.2); hudTarget('Los!'); setState('runup', t);
    if(app.source==='cam') recStart(t, 'Los');
    return;
  }
  const pre = taskCall();   // Aufgabe „Wurfhöhe“: „Hoch. Orange kurz“
  app.target = c.name; say(pre ? `${pre}. ${c.name}` : c.name); quiet(1.2); hudTarget(pre ? `${pre} · ${c.name}` : c.name); setState('runup', t);
  if(app.source==='cam') recStart(t, c.name);   // Clip ab der Ansage
}

// Steht der Spieler (Hüfte in den letzten 0,6 s kaum bewegt)? Sonst käme die Ansage schon beim
// Zurückgehen, und der Anlauf begänne aus dem Gehen (Absprung und Übertritt werden dann falsch erkannt).
function standing(t){
  const w = H.filter(h => h.t >= t - 0.6);
  if(w.length < 4 || w[0].t > t - 0.5) return false;
  const xs = w.map(h => h.hip.x), ys = w.map(h => h.hip.y), ls = w.map(h => h.bodyLen), bl = pct(ls, 0.5);
  // Auch die Größe im Bild: wer direkt auf die Kamera zu oder von ihr weg geht, bewegt sich im Bild kaum, wird aber größer/kleiner.
  return Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) < 0.15*bl && (Math.max(...ls) - Math.min(...ls)) < 0.06*bl;
}

function tick(t){
  // Wurf ohne Ansage: auch dann aufnehmen. Den Clip kurz halten (nach 6 s neu beginnen), aber nur, wenn
  // der Spieler gerade steht oder nicht im Bild ist, sonst fehlte im Clip der Anlauf. Spätestens nach 15 s.
  if(app.state==='ready' && app.source==='cam' && !app.marking){
    const a = recAge(t), calm = !H.length || t - H.at(-1).t > 0.5 || standing(t);
    if(a===null || (a > 6 && calm) || a > 15) recStart(t);
  }
  if(app.state==='cool' && t-app.stateT >= (app.source==='file' ? 0.6 : taskPause())) setState('ready', t);
  else if(app.state==='ready' && app.source==='cam' && !app.marking && t >= (app.holdUntil || 0)){
    if(taskShout()){}   // Gegenstoß: nur der Ruf startet (heardCall)
    else if(settings.mode==='call'){ if(callAt!==null && t >= callAt){ callAt = null; announce(t); } }
    else if(settings.mode==='timer'){ if(t-app.stateT >= 1.5) announce(t); }
    else if(visSince!==null && t-visSince >= 0.6 && t-app.stateT >= 0.5 && standing(t)) announce(t);
  }
  else if(app.state==='runup' && t-app.stateT > (taskShout() ? 12 : 8)){ app.target=null; app.pending=null; app.breakAt=null; hudTarget(null); setState('ready', t); }
}
