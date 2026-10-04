// Sprungkraft: Strecksprünge oder Einbein-Sprünge links/rechts zählen, Höhe und Bodenkontakt je Sprung (rules.js),
// Unterschied links/rechts, Vergleich mit dem letzten Mal, Log und Bericht.
import { app, settings, log, store, ensureSession, sessionEntries, DEMO } from './state.js';
import { jumpTracker, summary, cm } from './rules.js';
import { say, beep, unlockBeep } from '../../shared/js/speech.js';
import { keepAwake, releaseWake } from '../../shared/js/wakelock.js';
import { esc, fmtDate } from '../../shared/js/utils.js';
import { $, video, canvas, ctx, now, hint, big, startSource as startStage, bodyPoints, drawSkeleton, initSheets } from '../../shared/js/stage.js';

let pose = null, setupOpen = false, F = [];
const median = a => { const s = [...a].sort((x, y) => x - y); return s[s.length >> 1]; };
const EX = {both:'Strecksprünge', single:'Einbein links und rechts'};
const LEG = {l:'linken', r:'rechten'};

async function startSource(){ pose = await startStage(DEMO ? await import('./demo.js') : null, {model:settings.model, facing:settings.facing}); app.source = 'cam'; }

const LABEL = {off:'Gestoppt', calib:'Ruhig stehen', go:'Springen!'};
function setState(s, t = now()){ app.state = s; app.stateT = t; const el = $('#state'); el.textContent = LABEL[s]; el.dataset.s = s === 'go' ? 'go' : s === 'calib' ? 'set' : s; }
// Ruhig stehen: Hüfte in der letzten Sekunde < 0,05 KL bewegt.
function still(t){
  const w = F.filter(f => f.t >= t - 1); if(w.length < 5 || w[0].t > t - 0.8) return false;
  const ys = w.map(f => f.hipY), bl = median(w.map(f => f.bl));
  return Math.max(...ys) - Math.min(...ys) < 0.05*bl;
}
const target = () => settings.ex === 'single' ? settings.nSingle : settings.nBoth;

function step(t, f){
  if(app.state==='calib'){
    if(f && still(t) && t - app.stateT > 1.2){
      const w = F.filter(x => x.t >= t - 0.8);
      app.stand = {hipY:median(w.map(x => x.hipY)), ground:median(w.map(x => Math.max(x.lY, x.rY))), bl:median(w.map(x => x.bl))};
      app.tracker = jumpTracker(app.stand); app.leg = settings.ex === 'single' ? 'l' : null;
      say(settings.ex === 'single' ? `Fünf Sprünge auf dem linken Bein. Los.` : `${target()} Strecksprünge. Los.`);
      beep(1000, 200); setState('go', t); render();
    }
  } else if(app.state==='go' && f){
    const j = app.tracker.push(f);
    if(!j) return;
    if(settings.ex === 'single' && j.leg !== app.leg){ big(j.leg === 'both' ? 'Beidbeinig' : 'Falsches Bein', 'bad', 900); say(j.leg === 'both' ? 'Nur ein Bein.' : 'Falsches Bein.'); return; }
    app.jumps.push(j);
    big(cm(j.height) + ' cm', 'ok', 900); render();
    const done = app.jumps.filter(x => settings.ex !== 'single' || x.leg === app.leg).length;
    if(done >= target()){
      if(settings.ex === 'single' && app.leg === 'l'){ app.leg = 'r'; say('Wechsel. Fünf auf dem rechten Bein.'); beep(800, 200); render(); }
      else finish();
    }
  }
}

function start(){
  closeSetup(); unlockBeep(); ensureSession(); F = []; app.jumps = []; app.stand = null; app.leg = null;
  say(`${EX[settings.ex]}. Stell dich ruhig hin, ganzer Körper im Bild.`);
  setState('calib'); app.stateT = now() + 1.5;
  $('#btnStart').textContent = 'Stopp'; $('#btnStart').classList.add('running'); keepAwake(); $('#card').hidden = true; $('#countBox').hidden = false; render();
}
function stop(){
  setState('off'); big(''); $('#btnStart').textContent = 'Start'; $('#btnStart').classList.remove('running'); releaseWake();
}
function finish(){
  const prev = [...log].reverse().find(e => e.ex === settings.ex);
  const s = summary(app.jumps, settings.ex, prev);
  ensureSession(); settings.session.last = Date.now();
  const r2 = x => x == null ? null : Math.round(x*100)/100;
  const e = {nr:(log.at(-1)?.nr || 0) + 1, sid:settings.session.id, time:Date.now(), ex:settings.ex, n:s.n, avg:r2(s.avg), best:r2(s.best), contact:r2(s.contact),
    left:r2(s.left), right:r2(s.right), heights:app.jumps.map(j => r2(j.height))};
  log.push(e); if(log.length > 300) log.shift(); store();
  say(s.say); stop(); showCard(e, s); renderLog(); $('#countBox').hidden = true;
}
// Zähler groß im Bild: Sprung n von N (bei Einbein mit Bein).
function render(){
  const n = app.jumps.filter(x => settings.ex !== 'single' || x.leg === app.leg).length;
  $('#count').textContent = `${n}/${target()}`;
  $('#timeLeft').textContent = app.leg ? (app.leg === 'l' ? 'linkes Bein' : 'rechtes Bein') : '';
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
  let f = null;
  if(p?.valid){
    f = {t, hipY:p.hip.y, bl:p.bl, lY:Math.max(p.lAnk.y, p.lHeel.y, p.lToe.y), rY:Math.max(p.rAnk.y, p.rHeel.y, p.rToe.y)};
    F.push(f); while(F.length && t - F[0].t > 4) F.shift();
  }
  if(app.state!=='off' && t >= app.stateT) step(t, f);
  if(lm) drawSkeleton(lm, app.state==='go' ? '#3d8bff' : p.valid ? '#33d17a' : '#f6c445');
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
  const prev = [...log].reverse().find(e => e.ex === settings.ex);
  box.innerHTML = `<div class="sheet-h"><h3>Einrichtung</h3><button class="x" data-a="close" aria-label="Schließen">✕</button></div>
    <p class="muted">Handy frontal vor dir, 3–4 m weg, Hüfthöhe. Ganzer Körper im Bild, auch beim Springen. Auf der Stelle springen.</p>
    <p class="muted">Übung:</p>${choice('ex', [['both', `${settings.nBoth} Strecksprünge`], ['single', `Einbein ${settings.nSingle}+${settings.nSingle}`]], settings.ex)}
    ${prev ? `<p class="muted">Letztes Mal: im Schnitt ${cm(prev.avg)} cm${prev.left != null ? ` (links ${cm(prev.left)}, rechts ${cm(prev.right)})` : ''}.</p>` : ''}
    <p class="muted">Kamera:</p>${choice('facing', [['environment', 'Rückkamera'], ['user', 'Frontkamera']], settings.facing)}
    ${app.state==='off' ? `<button class="wide primaryBtn" data-a="start">Übung starten</button>` : ''}`;
}
const ACT = {
  close: closeSetup, start,
  ex(el){ settings.ex = el.dataset.v; store(); renderSetup(); },
  async facing(el){ settings.facing = el.dataset.v; store(); renderSetup(); if(!DEMO && app.source==='cam'){ try{ await startSource(); }catch(e){ hint('Kamera-Fehler: ' + (e.message || e), 5000); } } }
};
$('#setup').addEventListener('click', e => { const el = e.target.closest('[data-a]'); if(el && ACT[el.dataset.a]) ACT[el.dataset.a](el); });

/* ---------- Karte, Log, Bericht ---------- */
function showCard(e, s){
  const c = $('#card');
  const lines = e.ex === 'single' && e.left != null && e.right != null
    ? `<li><span class="ic ok">•</span><span>Links ${cm(e.left)} cm, rechts ${cm(e.right)} cm</span></li>`
    : `<li><span class="ic ok">•</span><span>Im Schnitt ${cm(e.avg ?? 0)} cm, bester ${cm(e.best ?? 0)} cm</span></li>`;
  c.innerHTML = `<p class="res ok">${e.n} Sprünge · ${esc(EX[e.ex])}</p>
    <ul class="checks">${lines}${e.contact != null ? `<li><span class="ic ok">•</span><span>Bodenkontakt im Schnitt ${e.contact.toFixed(2).replace('.', ',')} s</span></li>` : ''}</ul>
    <p class="muted">${esc(s.say.replace(/^Fertig\. \d+ Sprünge\. /, ''))}</p>
    <div class="btnrow"><button class="primaryBtn" data-c="again">Nochmal</button><button data-c="close">Fertig</button></div>`;
  c.hidden = false;
  c.querySelector('[data-c=again]').onclick = () => { c.hidden = true; start(); };
  c.querySelector('[data-c=close]').onclick = () => { c.hidden = true; };
}
function renderLog(){
  const list = sessionEntries(), box = $('#logBody');
  if(!list.length){ box.innerHTML = '<p class="muted">In diesem Training noch keine Übung.</p>'; return; }
  box.innerHTML = `<p class="muted">${fmtDate(new Date(settings.session.start))} · Höhen sind Schätzungen aus einer Kamera; für den Vergleich mit dem letzten Mal aussagekräftig.</p>` + [...list].reverse().map(e =>
    `<div class="entry"><b>${esc(EX[e.ex])}: ${e.n} Sprünge</b><br><small>${e.ex === 'single' && e.left != null ? `links ${cm(e.left)} cm, rechts ${cm(e.right)} cm` : `Schnitt ${cm(e.avg ?? 0)} cm, bester ${cm(e.best ?? 0)} cm`}${e.contact != null ? ` · Bodenkontakt ${e.contact.toFixed(2).replace('.', ',')} s` : ''}</small><br>
      <small>${e.heights.map(h => cm(h)).join(' · ')} cm</small></div>`).join('');
}
export function reportText(){
  const list = sessionEntries(); if(!list.length) return null;
  const L = [`Sprungkraft vom ${fmtDate(new Date(settings.session.start))}`];
  list.forEach(e => L.push(`${EX[e.ex]}: ${e.n} Sprünge, ` + (e.ex === 'single' && e.left != null ? `links ${cm(e.left)} cm, rechts ${cm(e.right)} cm` : `Schnitt ${cm(e.avg ?? 0)} cm, bester ${cm(e.best ?? 0)} cm`)
    + (e.contact != null ? `, Bodenkontakt ${e.contact.toFixed(2).replace('.', ',')} s` : '')));
  L.push('', 'Höhen geschätzt (Hüfte über der Stand-Höhe). Erstellt mit Handballcoach (Sprungkraft)');
  return L.join('\n');
}
async function share(){
  const text = reportText(); if(!text){ hint('Noch keine Übung in diesem Training'); return; }
  if(navigator.share){ try{ await navigator.share({title:'Sprung-Bericht', text}); return; }catch(e){ if(e.name==='AbortError') return; } }
  try{ await navigator.clipboard.writeText(text); hint('Bericht in die Zwischenablage kopiert'); }catch(e){ hint('Teilen nicht möglich'); }
}

/* ---------- Bedienung ---------- */
$('#btnStart').onclick = async () => {
  if(app.state !== 'off'){ stop(); $('#countBox').hidden = true; return; }
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
$('#logClear').onclick = () => { if(confirm('Alle Sprung-Übungen löschen?')){ log.length = 0; store(); renderLog(); } };
initSheets();
if(DEMO){ const a = $('#demoLink'); a.textContent = 'Demo-Modus aktiv: „Start“ drücken. Hier zurück zur echten Kamera.'; a.href = './'; }
document.addEventListener('visibilitychange', () => { if(document.visibilityState==='visible' && app.state!=='off') keepAwake(); });
