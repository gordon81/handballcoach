// Zustandsautomat pro Wurf: off → ready → runup → air → cool → ready …
// Erkennt Absprung und Landung aus den Pose-Frames und übergibt den Sprung an analysis.js.
import { L } from './config.js';
import { app } from './state.js';
import { settings, log, store, ensureSession } from './store.js';
import { $, canvas, showHint } from './dom.js';
import { dist, mid, pct, pick, angDiff, colorOf } from './utils.js';
import { say, beep } from './speech.js';
import { quiet } from './shout.js';
import { recStart, recDrop, recFinish, recAge } from './clips.js';
import { evaluate } from './analysis.js';
import { showCard, clipReady } from './ui/card.js';
import { renderLog } from './ui/logView.js';

const LABELS = {off:'Gestoppt', ready:'Bereit', runup:'Anlauf', air:'Sprung', cool:'Pause'};
let H=[], visSince=null, lastSeen=-1, lastTarget=null;
let callAt=null;   // Modus „Zuruf“: Zeitpunkt der Zielansage nach dem Ruf
let groundY=null, groundAt=null, baseHip=null, bodyRef=null, ev=null;

export function setState(s, t){
  app.state = s; app.stateT = t;
  if(s==='off' || s==='air'){ callAt = null; }
  if(s==='off') recDrop();
  stateText();
}
function stateText(){
  const el = $('#state'), s = app.state; el.dataset.s = s;
  el.textContent = (s==='ready' && app.source==='file') ? 'Analyse aktiv'
    : callAt!==null && (s==='ready' || s==='cool') ? 'Zuruf gehört'
    : s==='ready' && settings.mode==='call' && app.source==='cam' ? 'Warte auf Zuruf' : LABELS[s];
}

// Zuruf des Spielers (Mikrofon): Ziel nach zufälligen callMin…callMax Sekunden ansagen.
// Nur wenn der Spieler gerade im Bild ist (in den letzten 2 s erkannt): Lärm von anderen Feldern zählt so nicht.
export function heardCall(){
  if(app.source!=='cam' || app.marking || settings.mode!=='call' || callAt!==null) return;
  if(app.state!=='ready' && app.state!=='cool') return;
  const now = performance.now()/1000;
  if(now - lastSeen > 2){ showHint('Zuruf gehört, aber niemand im Bild. Stell dich so hin, dass die Kamera dich sieht.', 2500); return; }
  const lo = Math.max(0, +settings.callMin || 0), hi = Math.max(lo, +settings.callMax || lo);
  callAt = now + lo + Math.random()*(hi - lo);
  quiet(0.3); beep(); stateText();
}
export function resetTracking(t){ H=[]; app.latest=null; visSince=null; ev=null; groundY=groundAt=baseHip=bodyRef=null; app.target=null; hudTarget(null); if(app.state!=='off') setState('ready', t); }
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
    f.shYaw = yaw(11,12); f.twist = angDiff(f.shYaw, yaw(23,24));
  } else { f.shYaw = f.twist = null; }
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
    baseHip = pct(w.map(h=>h.hip.y), 0.5);
    bodyRef = pct(w.map(h=>h.bodyLen), 0.5);
  }
  if(groundY===null || app.state==='cool') return;
  f.cand = (baseHip - f.hip.y) > 0.12*bodyRef && (groundY - f.low) > 0.04*bodyRef;
  const prev = H[H.length-2];
  if(f.cand && prev?.cand) startAir(t);
}

// Boden als Gerade über die Zeit: läuft der Spieler auf die Kamera zu (oder weg), wandert der Fußpunkt
// im Bild nach unten (oben). Ein fester Boden würde den Absprung dann zu spät (zu früh) ansetzen.
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
  ev = {t0:tf.t, target:app.target, gy, base:baseHip, bl, foot, tf, armF, peak:Infinity, peakF:null, throwF:null, vmax:0, prevWr:null};
  for(let k=j; k<H.length; k++) airFrame(H[k], H[k].t, true);
  setState('air', t);
}

function airFrame(f, t, replay){
  f.air = true;
  if(f.hip.y < ev.peak){ ev.peak = f.hip.y; ev.peakF = f; }
  if(ev.prevWr){ const dt = t-ev.prevWr.t; if(dt>0){ const v = dist(f.wr, ev.prevWr.p)/dt/ev.bl; if(v>ev.vmax){ ev.vmax=v; ev.throwF=f; } } }
  ev.prevWr = {p:f.wr, t};
  if(replay) return;
  const landed = t-ev.t0 > 0.25 && (f.low >= ev.gy - 0.03*ev.bl || ev.base - f.hip.y < 0.04*ev.bl);
  if(landed || t-ev.t0 > 1.8) finish(t);
}

// Landung: Wurf bewerten, ansagen, speichern, anzeigen.
function finish(t){
  const e = ev; ev = null; if(!e) return;
  const r = evaluate(e, t, H);
  say(r.speech);

  if(!settings.session) ensureSession();
  settings.session.last = Date.now();
  const entry = {nr:(log.at(-1)?.nr || 0) + 1, sid:settings.session.id, target:e.target, res:r.res, issues:r.issues, good:r.good, praise:r.praise, main:r.main,
    tip:r.tip, rot:r.rot, noLine:r.noLine, m:r.m, hit:null, time:Date.now(), video:app.source==='file'};
  log.push(entry); if(log.length > 1000) log.shift(); store();
  showCard(entry); renderLog();
  if(recAge(t)!==null) recFinish(entry.time).then(ok => { if(ok){ entry.clip = true; store(); clipReady(entry); renderLog(); } });
  app.target = null; hudTarget(null);
  setState('cool', t);
}

// Zufälliges Ziel ansagen (nie zweimal dasselbe hintereinander).
export function announce(t){
  const list = settings.targets.filter(x => x.on && x.name.trim());
  if(!list.length){ showHint('Keine Ziele aktiv (Einstellungen)', 2500); return; }
  let c; do{ c = pick(list); } while(list.length > 1 && c.name === lastTarget);
  app.target = lastTarget = c.name; say(c.name); quiet(1.2); hudTarget(c.name); setState('runup', t);
  if(app.source==='cam') recStart(t, c.name);   // Clip ab der Ansage
}

// Steht der Spieler (Hüfte in den letzten 0,6 s kaum bewegt)? Sonst käme die Ansage schon beim
// Zurückgehen, und der Anlauf begänne aus dem Gehen (Absprung und Übertritt werden dann falsch erkannt).
function standing(t){
  const w = H.filter(h => h.t >= t - 0.6);
  if(w.length < 4 || w[0].t > t - 0.5) return false;
  const xs = w.map(h => h.hip.x), ys = w.map(h => h.hip.y), bl = pct(w.map(h => h.bodyLen), 0.5);
  return Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) < 0.15*bl;
}

function tick(t){
  // Wurf ohne Ansage: auch dann aufnehmen. Den Clip kurz halten (nach 6 s neu beginnen), aber nur, wenn
  // der Spieler gerade steht oder nicht im Bild ist, sonst fehlte im Clip der Anlauf. Spätestens nach 15 s.
  if(app.state==='ready' && app.source==='cam' && !app.marking){
    const a = recAge(t), calm = !H.length || t - H.at(-1).t > 0.5 || standing(t);
    if(a===null || (a > 6 && calm) || a > 15) recStart(t);
  }
  if(app.state==='cool' && t-app.stateT >= (app.source==='file' ? 0.6 : settings.pause)) setState('ready', t);
  else if(app.state==='ready' && app.source==='cam' && !app.marking){
    if(settings.mode==='call'){ if(callAt!==null && t >= callAt){ callAt = null; announce(t); } }
    else if(settings.mode==='timer'){ if(t-app.stateT >= 1.5) announce(t); }
    else if(visSince!==null && t-visSince >= 0.6 && t-app.stateT >= 0.5 && standing(t)) announce(t);
  }
  else if(app.state==='runup' && t-app.stateT > 8){ app.target=null; hudTarget(null); setState('ready', t); }
}
