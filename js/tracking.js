// Zustandsautomat pro Wurf: off → ready → runup → air → cool → ready …
// Erkennt Absprung und Landung aus den Pose-Frames und übergibt den Sprung an analysis.js.
import { L } from './config.js';
import { app } from './state.js';
import { settings, log, store, ensureSession } from './store.js';
import { $, canvas, showHint } from './dom.js';
import { dist, mid, pct, pick, angDiff, colorOf } from './utils.js';
import { say } from './speech.js';
import { evaluate } from './analysis.js';
import { showCard } from './ui/card.js';
import { renderLog } from './ui/logView.js';

const LABELS = {off:'Gestoppt', ready:'Bereit', runup:'Anlauf', air:'Sprung', cool:'Pause'};
let H=[], visSince=null, lastSeen=-1, lastTarget=null;
let groundY=null, baseHip=null, bodyRef=null, ev=null;

export function setState(s, t){
  app.state = s; app.stateT = t;
  const el = $('#state'); el.dataset.s = s;
  el.textContent = (s==='ready' && app.source==='file') ? 'Analyse aktiv' : LABELS[s];
}
export function resetTracking(t){ H=[]; app.latest=null; visSince=null; ev=null; groundY=baseHip=bodyRef=null; app.target=null; hudTarget(null); if(app.state!=='off') setState('ready', t); }
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
    groundY = pct(w.map(h=>h.low), 0.8);
    baseHip = pct(w.map(h=>h.hip.y), 0.5);
    bodyRef = pct(w.map(h=>h.bodyLen), 0.5);
  }
  if(groundY===null || app.state==='cool') return;
  f.cand = (baseHip - f.hip.y) > 0.12*bodyRef && (groundY - f.low) > 0.04*bodyRef;
  const prev = H[H.length-2];
  if(f.cand && prev?.cand) startAir(t);
}

function startAir(t){
  const gy = groundY, bl = bodyRef;
  let j = H.length-1;
  while(j > 0 && H[j].low < gy - 0.035*bl) j--;
  const tf = H[j];
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
    tip:r.tip, rot:r.rot, noLine:r.noLine, hit:null, time:Date.now(), video:app.source==='file'};
  log.push(entry); if(log.length > 1000) log.shift(); store();
  showCard(entry); renderLog();
  app.target = null; hudTarget(null);
  setState('cool', t);
}

// Zufälliges Ziel ansagen (nie zweimal dasselbe hintereinander).
export function announce(t){
  const list = settings.targets.filter(x => x.on && x.name.trim());
  if(!list.length){ showHint('Keine Ziele aktiv (Einstellungen)', 2500); return; }
  let c; do{ c = pick(list); } while(list.length > 1 && c.name === lastTarget);
  app.target = lastTarget = c.name; say(c.name); hudTarget(c.name); setState('runup', t);
}

function tick(t){
  if(app.state==='cool' && t-app.stateT >= (app.source==='file' ? 0.6 : settings.pause)) setState('ready', t);
  else if(app.state==='ready' && app.source==='cam' && !app.marking){
    if(settings.mode==='timer'){ if(t-app.stateT >= 1.5) announce(t); }
    else if(visSince!==null && t-visSince >= 0.6 && t-app.stateT >= 0.5) announce(t);
  }
  else if(app.state==='runup' && t-app.stateT > 8){ app.target=null; hudTarget(null); setState('ready', t); }
}
