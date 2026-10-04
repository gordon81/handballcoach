// Pässe gegen die Wand: Runde auf Zeit, Aufprall an der Wand zählen (Mikrofon, shared/js/bounceDetect.js; sonst Kamera),
// Technik je Pass (Arm über der Schulter, Gegenbein vorn), Bestwert, Log und Bericht.
import { app, settings, log, store, ensureSession, sessionEntries, DEMO } from './state.js';
import { judgePass, throwsFromPose, summary, TH_P } from './rules.js';
import { say, beep, unlockBeep } from '../../shared/js/speech.js';
import { keepAwake, releaseWake } from '../../shared/js/wakelock.js';
import { micSampler } from '../../shared/js/mic.js';
import { bounceDetector, SENS } from '../../shared/js/bounceDetect.js';
import { esc, fmtDate } from '../../shared/js/utils.js';
import { $, video, canvas, ctx, now, hint, big, startSource as startStage, bodyPoints, drawSkeleton, initSheets } from '../../shared/js/stage.js';

let pose = null, setupOpen = false, F = [], demoMod = null, det = null, quietUntil = 0;
const mic = micSampler();

async function startSource(){
  demoMod = DEMO ? await import('./demo.js') : null;
  pose = await startStage(demoMod, {model:settings.model});
  app.source = 'cam';
  demoMod?.setImpactHandler(t => onHit(t));
}

/* ---------- Zählen ---------- */
// Mikrofon an, solange eine Runde läuft oder getestet wird (nur im Modus „Mikrofon“, nicht im Demo).
async function syncMic(){
  const want = !DEMO && settings.count==='mic' && (app.state!=='off' || app.test);
  if(!want){ mic.stop(); return; }
  if(mic.on) return;
  det = bounceDetector();
  try{ await mic.start(); }
  catch(e){ hint('Mikrofon nicht verfügbar. Ich zähle mit der Kamera.', 4000); settings.count = 'cam'; store(); renderSetup(); }
}
mic.onSample((v, hi, t, pk, lvl) => {
  if(window.speechSynthesis?.speaking) quietUntil = Math.max(quietUntil, t + 400);
  if(det.push(v, hi, t, SENS[settings.sens] ?? SENS.mid, t < quietUntil, pk, lvl)) onHit(t/1000);
  const m = $('#setup .meter .lvl'); if(m) m.style.width = Math.max(0, Math.min(100, (pk - det.floor)*2.5)) + '%';
});

function onHit(t){
  if(app.test){ app.testHits++; beep(1200, 60); renderSetup(); return; }
  if(app.state!=='run') return;
  const p = judgePass(F, t, settings.wall, settings.hand==='R', TH_P);
  // Knall ohne Wurf davor, obwohl der Spieler im Bild war: Fangen oder Lärm vom Nachbarfeld, zählt nicht.
  const seen = F.filter(f => f.t >= t - TH_P.before && f.t <= t - TH_P.flight).length >= 5;
  if(p.ok === null && seen){ app.ignored = (app.ignored || 0) + 1; return; }
  app.hits.push(t); app.passes.push(p);
  showCount(p);
}
// Kamera-Zählung: Würfe aus der Wurfbewegung (ohne Mikro oder bei lautem Nachbarfeld).
function camCount(t){
  const ts = throwsFromPose(F.filter(f => f.t > (app.lastCam ?? -Infinity) - 0.2));
  for(const tt of ts) if(tt > (app.lastCam ?? -Infinity) + TH_P.gap - 1e-6 && t - tt > 0.2){ app.lastCam = tt; onHit(tt + TH_P.flight + 0.2); }
}
function showCount(p){
  $('#count').textContent = app.passes.length;
  $('#count').className = p.ok === false ? 'bad' : 'ok';
}

/* ---------- Ablauf ---------- */
const LABEL = {off:'Gestoppt', count:'Gleich geht’s los', run:'Pässe!'};
function setState(s, t = now()){ app.state = s; app.stateT = t; const el = $('#state'); el.textContent = LABEL[s]; el.dataset.s = s === 'run' ? 'go' : s === 'count' ? 'set' : s; }

function start(){
  closeSetup(); unlockBeep(); ensureSession(); F = []; app.hits = []; app.passes = []; app.lastCam = now();
  $('#card').hidden = true; $('#count').textContent = '0'; $('#count').className = ''; $('#countBox').hidden = false;
  say(`${settings.dur} Sekunden Pässe gegen die Wand. Auf den Piep.`);
  setState('count'); app.stateT = now();
  $('#btnStart').textContent = 'Stopp'; $('#btnStart').classList.add('running'); keepAwake(); syncMic();
}
function stop(){
  setState('off'); big(''); $('#btnStart').textContent = 'Start'; $('#btnStart').classList.remove('running'); releaseWake(); syncMic();
}
function step(t){
  if(app.state==='count' && t - app.stateT > 3.2){ beep(1000, 300); quietUntil = performance.now() + 500; app.until = t + settings.dur; app.lastCam = t; setState('run', t); }
  else if(app.state==='run'){
    if(settings.count==='cam' && !DEMO) camCount(t);
    const left = Math.ceil(app.until - t); $('#timeLeft').textContent = left > 0 ? left + ' s' : '';
    if(left === 10 && !app.said10){ app.said10 = true; say('Noch zehn Sekunden.'); }
    if(t >= app.until) finishRound();
  }
}
function finishRound(){
  app.said10 = false;
  const s = summary(app.passes, settings.dur), best = s.n > (settings.best || 0);
  if(best) settings.best = s.n;
  ensureSession(); settings.session.last = Date.now();
  const e = {nr:(log.at(-1)?.nr || 0) + 1, sid:settings.session.id, time:Date.now(), dur:settings.dur, n:s.n, seen:s.seen, arm:s.arm, foot:s.foot, count:DEMO ? 'demo' : settings.count, best};
  log.push(e); if(log.length > 300) log.shift(); store();
  beep(600, 400);
  say(s.say + (best ? ' Neuer Bestwert!' : '')); stop(); showCard(e, s); renderLog(); $('#timeLeft').textContent = '';
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
  if(p?.valid){
    const R = settings.hand==='R';
    F.push({t, wr:R ? p.rWr : p.lWr, wsh:R ? p.rSh : p.lSh, hip:p.hip, bl:p.bl, lAnk:p.lAnk, rAnk:p.rAnk});
    while(F.length && t - F[0].t > 4) F.shift();
  }
  if(app.state!=='off') step(t);
  if(lm) drawSkeleton(lm, p.valid ? '#33d17a' : '#f6c445');
  fpsN++; if(pn - fpsT0 > 1000){ $('#fps').textContent = Math.round(fpsN*1000/(pn-fpsT0)) + ' fps'; fpsN = 0; fpsT0 = pn; }
}
requestAnimationFrame(loop);

/* ---------- Einrichtung ---------- */
const btn = (a, label, cls = '', v = '') => `<button data-a="${a}" ${v !== '' ? `data-v="${v}"` : ''} class="${cls}">${label}</button>`;
const choice = (a, opts, cur) => `<div class="btnrow">${opts.map(([v, l]) => btn(a, l, String(cur)===String(v) ? 'on' : '', v)).join('')}</div>`;
function openSetup(){ setupOpen = true; renderSetup(); }
function closeSetup(){ setupOpen = false; if(app.test){ app.test = false; syncMic(); } renderSetup(); }
function renderSetup(){
  const box = $('#setup'); box.hidden = !setupOpen; if(box.hidden) return;
  const micPart = settings.count==='mic' && !DEMO ? `<div class="mictest"><p><b>Mikro:</b> ${app.test ? (app.testHits ? `✓ ${app.testHits}× Aufprall gehört. Zählt jeder Pass genau einmal?` : 'Wirf ein paar Pässe gegen die Wand.') : 'Vorher testen, ob jeder Aufprall zählt.'}</p>
      ${app.test ? '<span class="meter"><i class="lvl"></i></span>' : ''}
      <div class="btnrow">${btn('test', app.test ? 'Test beenden' : 'Mikro testen')}</div>
      <p class="muted">Empfindlichkeit:</p>${choice('sens', [['low', 'Laute Halle'], ['mid', 'Mittel'], ['high', 'Leise Halle']], settings.sens)}</div>` : '';
  box.innerHTML = `<div class="sheet-h"><h3>Einrichtung</h3><button class="x" data-a="close" aria-label="Schließen">✕</button></div>
    <p class="muted">Ziel an die Wand kleben, 4–6 m davor stellen. Handy seitlich, ganzer Körper im Bild.${settings.best ? ` Bestwert: ${settings.best} Pässe.` : ''}</p>
    <p class="muted">Wand im Bild:</p>${choice('wall', [['left', '← Links'], ['right', 'Rechts →']], settings.wall)}
    <p class="muted">Wurfhand:</p>${choice('hand', [['R', 'Rechts'], ['L', 'Links']], settings.hand)}
    <p class="muted">Dauer:</p>${choice('dur', [[30, '30 s'], [60, '60 s']], settings.dur)}
    <p class="muted">Pässe zählen über:</p>${choice('count', [['mic', 'Mikrofon (Aufprall)'], ['cam', 'Kamera (Wurf)']], settings.count)}
    ${micPart}
    ${app.state==='off' ? `<button class="wide primaryBtn" data-a="start">Runde starten</button>` : ''}`;
}
const ACT = {
  close: closeSetup, start,
  wall(el){ settings.wall = el.dataset.v; store(); renderSetup(); },
  hand(el){ settings.hand = el.dataset.v; store(); renderSetup(); },
  dur(el){ settings.dur = +el.dataset.v; store(); renderSetup(); },
  count(el){ settings.count = el.dataset.v; store(); if(settings.count!=='mic' && app.test){ app.test = false; syncMic(); } renderSetup(); },
  sens(el){ settings.sens = el.dataset.v; store(); renderSetup(); },
  test(){ app.test = !app.test; app.testHits = 0; syncMic().then(renderSetup); renderSetup(); }
};
$('#setup').addEventListener('click', e => { const el = e.target.closest('[data-a]'); if(el && ACT[el.dataset.a]) ACT[el.dataset.a](el); });

/* ---------- Karte, Log, Bericht ---------- */
function showCard(e, s){
  const c = $('#card'), ic = ok => `<span class="ic ${ok ? 'ok' : 'bad'}">${ok ? '✓' : '✗'}</span>`;
  c.innerHTML = `<p class="res ok">${e.n} Pässe in ${e.dur} s${e.best ? ' · Bestwert!' : ''}</p>
    ${s.seen ? `<ul class="checks"><li>${ic(s.arm >= s.seen*0.8)}<span>Arm über der Schulter: ${s.arm} von ${s.seen}</span></li>
      <li>${ic(s.foot >= s.seen*0.8)}<span>Gegenbein vorn: ${s.foot} von ${s.seen}</span></li></ul>` : '<p class="muted">Technik nicht gesehen (ganzer Körper im Bild?).</p>'}
    ${s.tips.length ? `<p class="muted">${esc(s.tips.join(' '))}</p>` : ''}
    <div class="btnrow"><button class="primaryBtn" data-c="again">Nochmal</button><button data-c="close">Fertig</button></div>`;
  c.hidden = false; $('#countBox').hidden = true;
  c.querySelector('[data-c=again]').onclick = () => { c.hidden = true; start(); };
  c.querySelector('[data-c=close]').onclick = () => { c.hidden = true; };
}
function renderLog(){
  const list = sessionEntries(), box = $('#logBody');
  if(!list.length){ box.innerHTML = '<p class="muted">In diesem Training noch keine Runde.</p>'; return; }
  box.innerHTML = `<p class="muted">${fmtDate(new Date(settings.session.start))} · Bestwert ${settings.best || 0} Pässe</p>` + [...list].reverse().map(e =>
    `<div class="entry"><b>Runde ${e.nr}: ${e.n} Pässe in ${e.dur} s</b>${e.best ? ' <small class="tok">Bestwert</small>' : ''}<br>
      <small>Arm oben ${e.arm}/${e.seen} · Gegenbein vorn ${e.foot}/${e.seen} · gezählt: ${e.count==='cam' ? 'Kamera' : e.count==='demo' ? 'Demo' : 'Mikrofon'}</small></div>`).join('');
}
export function reportText(){
  const list = sessionEntries(); if(!list.length) return null;
  const L = [`Pässe gegen die Wand vom ${fmtDate(new Date(settings.session.start))}`, `Bestwert: ${settings.best || 0} Pässe`];
  list.forEach(e => L.push(`Runde ${e.nr}: ${e.n} Pässe in ${e.dur} s, Arm oben ${e.arm}/${e.seen}, Gegenbein vorn ${e.foot}/${e.seen}`));
  L.push('', 'Erstellt mit Handballcoach (Pässe gegen die Wand)');
  return L.join('\n');
}
async function share(){
  const text = reportText(); if(!text){ hint('Noch keine Runde in diesem Training'); return; }
  if(navigator.share){ try{ await navigator.share({title:'Pass-Bericht', text}); return; }catch(e){ if(e.name==='AbortError') return; } }
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
$('#logClear').onclick = () => { if(confirm('Alle Pass-Runden löschen?')){ log.length = 0; settings.best = 0; store(); renderLog(); } };
initSheets();
if(DEMO){ const a = $('#demoLink'); a.textContent = 'Demo-Modus aktiv: „Start“ drücken. Hier zurück zur echten Kamera.'; a.href = './'; }
document.addEventListener('visibilitychange', () => { if(document.visibilityState==='visible' && app.state!=='off') keepAwake(); });
