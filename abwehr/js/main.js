// Abwehr-Beinarbeit: Kamera frontal, Rufe „links / rechts / raus / zurück“, Reaktionszeit und Richtung (rules.js),
// gekreuzte Füße, Tiefe der Grundstellung; Runde mit fester Dauer, Log und Bericht.
import { app, settings, log, store, ensureSession, sessionEntries, DEMO } from './state.js';
import { judgeMove, nextCmd, summary, TH_D, fmtS } from './rules.js';
import { say, beep, unlockBeep } from '../../shared/js/speech.js';
import { keepAwake, releaseWake } from '../../shared/js/wakelock.js';
import { esc, fmtDate } from '../../shared/js/utils.js';
import { $, video, canvas, ctx, now, hint, big, startSource as startStage, bodyPoints, drawSkeleton, initSheets } from '../../shared/js/stage.js';

let pose = null, setupOpen = false, F = [], lowN = 0, drillN = 0, lag = null;
const median = a => { const s = [...a].sort((x, y) => x - y); return s[s.length >> 1]; };

async function startSource(){ pose = await startStage(DEMO ? await import('./demo.js') : null, {model:settings.model, facing:settings.facing}); app.source = 'cam'; }

const LABEL = {off:'Gestoppt', calib:'Aufrecht hinstellen', stance:'Grundstellung', cmd:'Los!', gap:'Bereit'};
function setState(s, t = now()){ app.state = s; app.stateT = t; const el = $('#state'); el.textContent = LABEL[s]; el.dataset.s = s === 'cmd' ? 'go' : s === 'stance' ? 'set' : s; }
// Still stehen: Hüfte in der letzten Sekunde < 0,08 KL bewegt.
function still(t){
  const w = F.filter(f => f.t >= t - 1); if(w.length < 5 || w[0].t > t - 0.8) return false;
  const bl = median(w.map(f => f.bl)), xs = w.map(f => f.hip.x), ys = w.map(f => f.hip.y);
  return Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) < 0.08*bl;
}

function step(t){
  const s = app.state, f = F.at(-1), seen = f && t - f.t < 0.5;
  if(s==='calib'){
    if(seen && still(t) && t - app.stateT > 1.5){
      const w = F.filter(x => x.t >= t - 0.8);
      app.stand = {y:median(w.map(x => x.hip.y)), x:median(w.map(x => x.hip.x)), bl:median(w.map(x => x.bl))};
      say('Grundstellung.'); setState('stance', t);
    }
  } else if(s==='stance'){
    if(t - app.stateT > 1.8){ app.until = t + settings.dur; lowN = drillN = 0; say('Los geht’s.'); setState('gap', t); app.nextAt = t + 1.2; }
  } else if(s==='gap'){
    if(t >= app.until){ finishRound(t); return; }
    if(t >= app.nextAt){
      const b = app.stand, off = f ? (f.hip.x - b.x)/b.bl : 0, dep = f ? (f.bl - b.bl)/b.bl : 0;
      app.cmd = nextCmd(off, dep, app.last); app.last = [...app.last, app.cmd].slice(-3);
      app.tc = t; lag = null;
      const u = say(app.cmd); if(u){ const tc = t; u.onstart = () => { if(app.tc === tc) lag = now() - tc; }; }
      big(app.cmd.toUpperCase(), 'target'); setState('cmd', t);
    }
  } else if(s==='cmd'){
    if(t - app.tc >= TH_D.window){
      const r = judgeMove(F, app.tc, app.cmd, TH_D, lag ?? 0);
      app.results.push({cmd:app.cmd, ...r});
      big(r.ok ? fmtS(r.react) + ' s' : '✗', r.ok ? 'ok' : 'bad', 900);
      if(!r.ok) beep(330, 160);
      app.nextAt = t + 0.5 + Math.random()*1.0; setState('gap', t);
    }
  }
  // Grundstellung: Anteil der Zeit, in der die Hüfte deutlich unter der Stand-Höhe ist.
  if((s==='gap' || s==='cmd') && f && app.stand){ drillN++; if((f.hip.y - app.stand.y)/app.stand.bl >= TH_D.lowDrop) lowN++; }
}

function start(){
  closeSetup(); unlockBeep(); ensureSession(); F = []; app.results = []; app.last = []; app.stand = null;
  say(`Abwehr-Beinarbeit, ${settings.dur} Sekunden. Stell dich aufrecht hin, Gesicht zum Handy.`);
  setState('calib'); app.stateT = now() + 2.5;
  $('#btnStart').textContent = 'Stopp'; $('#btnStart').classList.add('running'); keepAwake(); $('#card').hidden = true;
}
function stop(){
  setState('off'); big(''); $('#btnStart').textContent = 'Start'; $('#btnStart').classList.remove('running'); releaseWake();
}
function finishRound(){
  const s = summary(app.results, drillN ? lowN/drillN : null);
  ensureSession(); settings.session.last = Date.now();
  const e = {nr:(log.at(-1)?.nr || 0) + 1, sid:settings.session.id, time:Date.now(), dur:settings.dur, n:s.n, ok:s.ok, avg:s.avg, crossed:s.crossed,
    low:s.lowShare == null ? null : Math.round(s.lowShare*100)/100, moves:app.results.map(r => ({cmd:r.cmd, dir:r.dir, react:r.react, ok:r.ok, crossed:r.crossed}))};
  log.push(e); if(log.length > 300) log.shift(); store();
  say(s.say); stop(); showCard(e, s); renderLog();
}

/* ---------- Hauptschleife ---------- */
let fpsN = 0, fpsT0 = performance.now();
function loop(){
  requestAnimationFrame(loop);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if(app.source==='none' || !pose || video.readyState < 2) return;
  const pn = performance.now(), t = pn/1000;
  let res = null; try{ res = pose.detectForVideo(video, pn); }catch(e){ console.warn(e); }
  const lm = res?.landmarks?.[0], p = lm ? bodyPoints(lm) : null;
  app.latest = p && {lm, valid:p.valid};
  if(p?.valid){ F.push({t, hip:p.hip, bl:p.bl, lAnk:p.lAnk, rAnk:p.rAnk}); while(F.length && t - F[0].t > 6) F.shift(); }
  if(app.state!=='off' && t >= app.stateT) step(t);
  if(lm) drawSkeleton(lm, app.state==='cmd' ? '#3d8bff' : p.valid ? '#33d17a' : '#f6c445');
  fpsN++; if(pn - fpsT0 > 1000){ $('#fps').textContent = Math.round(fpsN*1000/(pn-fpsT0)) + ' fps'; fpsN = 0; fpsT0 = pn; }
}
requestAnimationFrame(loop);

/* ---------- Einrichtung ---------- */
const btn = (a, label, cls = '', v = '') => `<button data-a="${a}" ${v !== '' ? `data-v="${v}"` : ''} class="${cls}">${label}</button>`;
const choice = (a, opts, cur) => `<div class="btnrow">${opts.map(([v, l]) => btn(a, l, String(cur)===String(v) ? 'on' : '', v)).join('')}</div>`;
function openSetup(){ setupOpen = true; renderSetup(); }
function closeSetup(){ setupOpen = false; renderSetup(); }
function renderSetup(){
  const box = $('#setup'); box.hidden = !setupOpen; if(box.hidden) return;
  box.innerHTML = `<div class="sheet-h"><h3>Einrichtung</h3><button class="x" data-a="close" aria-label="Schließen">✕</button></div>
    <p class="muted">Handy frontal vor dir, 4–5 m weg, Hüfthöhe. Ganzer Körper im Bild und Platz für einen großen Schritt in jede Richtung. Die Richtungen gelten aus deiner Sicht.</p>
    <p class="muted">Dauer einer Runde:</p>${choice('dur', [[30, '30 s'], [40, '40 s'], [60, '60 s']], settings.dur)}
    <p class="muted">Kamera:</p>${choice('facing', [['environment', 'Rückkamera'], ['user', 'Frontkamera']], settings.facing)}
    ${app.state==='off' ? `<button class="wide primaryBtn" data-a="start">Runde starten</button>` : ''}`;
}
const ACT = {
  close: closeSetup, start,
  dur(el){ settings.dur = +el.dataset.v; store(); renderSetup(); },
  async facing(el){ settings.facing = el.dataset.v; store(); renderSetup(); if(!DEMO && app.source==='cam'){ try{ await startSource(); }catch(e){ hint('Kamera-Fehler: ' + (e.message || e), 5000); } } }
};
$('#setup').addEventListener('click', e => { const el = e.target.closest('[data-a]'); if(el && ACT[el.dataset.a]) ACT[el.dataset.a](el); });

/* ---------- Karte, Log, Bericht ---------- */
function showCard(e, s){
  const c = $('#card'), ic = ok => `<span class="ic ${ok ? 'ok' : 'bad'}">${ok ? '✓' : '✗'}</span>`;
  c.innerHTML = `<p class="res ${e.ok >= e.n*0.8 ? 'ok' : 'bad'}">${e.ok} von ${e.n} richtig</p>
    <ul class="checks"><li>${ic(e.avg != null && e.avg <= 0.6)}<span>Reaktion im Schnitt: ${e.avg != null ? fmtS(e.avg) + ' s' : '–'}</span></li>
      <li>${ic(!e.crossed)}<span>${e.crossed ? `Füße ${e.crossed}× gekreuzt` : 'Füße nie gekreuzt'}</span></li>
      <li>${ic(e.low == null || e.low >= TH_D.lowShare)}<span>Grundstellung: ${e.low == null ? '–' : Math.round(e.low*100) + ' % der Zeit tief'}</span></li></ul>
    ${s.tips.length ? `<p class="muted">${esc(s.tips.join(' '))}</p>` : ''}
    <div class="btnrow"><button class="primaryBtn" data-c="again">Nochmal</button><button data-c="close">Fertig</button></div>`;
  c.hidden = false;
  c.querySelector('[data-c=again]').onclick = () => { c.hidden = true; start(); };
  c.querySelector('[data-c=close]').onclick = () => { c.hidden = true; };
}
const NAMES = {links:'links', rechts:'rechts', raus:'raus', zurück:'zurück'};
function renderLog(){
  const list = sessionEntries(), box = $('#logBody');
  if(!list.length){ box.innerHTML = '<p class="muted">In diesem Training noch keine Runde. Start drücken und frontal vors Handy stellen.</p>'; return; }
  box.innerHTML = `<p class="muted">${fmtDate(new Date(settings.session.start))}</p>` + [...list].reverse().map(e =>
    `<div class="entry"><b>Runde ${e.nr}: ${e.ok} von ${e.n} richtig</b><br><small>Reaktion ${e.avg != null ? fmtS(e.avg) + ' s' : '–'} · gekreuzt ${e.crossed}× · tief ${e.low == null ? '–' : Math.round(e.low*100) + ' %'}</small><br>
      <small>${e.moves.map(m => `${m.ok ? '✓' : '✗'} ${NAMES[m.cmd]}${m.react != null ? ' ' + fmtS(m.react) : ''}`).join(' · ')}</small></div>`).join('');
}
export function reportText(){
  const list = sessionEntries(); if(!list.length) return null;
  const L = [`Abwehr-Beinarbeit vom ${fmtDate(new Date(settings.session.start))}`];
  list.forEach(e => L.push(`Runde ${e.nr} (${e.dur} s): ${e.ok} von ${e.n} richtig, Reaktion ${e.avg != null ? fmtS(e.avg) + ' s' : '–'}, Füße gekreuzt ${e.crossed}×, tief ${e.low == null ? '–' : Math.round(e.low*100) + ' %'}`));
  L.push('', 'Erstellt mit Handballcoach (Abwehr-Beinarbeit)');
  return L.join('\n');
}
async function share(){
  const text = reportText(); if(!text){ hint('Noch keine Runde in diesem Training'); return; }
  if(navigator.share){ try{ await navigator.share({title:'Abwehr-Bericht', text}); return; }catch(e){ if(e.name==='AbortError') return; } }
  try{ await navigator.clipboard.writeText(text); hint('Bericht in die Zwischenablage kopiert'); }catch(e){ hint('Teilen nicht möglich'); }
}

/* ---------- Bedienung ---------- */
$('#btnStart').onclick = async () => {
  if(app.state !== 'off'){ stop(); return; }
  if(app.source==='none'){
    say('Einrichtung'); unlockBeep();
    try{ await startSource(); openSetup(); }catch(e){ console.error(e); hint('Start fehlgeschlagen: ' + (e.message || e), 7000); }
    return;
  }
  start();
};
$('#btnSetup').onclick = () => { if(app.source==='none'){ $('#btnStart').click(); return; } setupOpen ? closeSetup() : openSetup(); };
$('#btnLog').onclick = () => { renderLog(); $('#logSheet').hidden = false; };
$('#repShare').onclick = share;
$('#newSession').onclick = () => { if(confirm('Neues Training starten? Das aktuelle bleibt im Speicher.')){ ensureSession(true); renderLog(); } };
$('#logClear').onclick = () => { if(confirm('Alle Abwehr-Runden löschen?')){ log.length = 0; store(); renderLog(); } };
initSheets();
if(DEMO){ const a = $('#demoLink'); a.textContent = 'Demo-Modus aktiv: „Start“ drücken. Hier zurück zur echten Kamera.'; a.href = './'; }
document.addEventListener('visibilitychange', () => { if(document.visibilityState==='visible' && app.state!=='off') keepAwake(); });
