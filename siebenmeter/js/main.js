// 7-m-Trainer: Kamera und KI, 7-m-Linie antippen, Ablauf mit Pfiff, Bewertung (rules.js), Serie, Log und Bericht.
import { app, settings, log, store, ensureSession, sessionEntries, DEMO } from './state.js';
import { judge7, throwDone, lineDist, seriesSpeech, SERIES, TH7, fmtS } from './rules.js';
import { say, beep, unlockBeep } from '../../shared/js/speech.js';
import { keepAwake, releaseWake } from '../../shared/js/wakelock.js';
import { esc, pick, fmtDate } from '../../shared/js/utils.js';
import { $, video, canvas, ctx, now, hint, big, startSource as startStage, bodyPoints, drawSkeleton, initSheets } from '../../shared/js/stage.js';
import { openGuide } from './guide.js';
import { REST, REST_MODES, restLen, restClock, nearLine, callAction, restIntro } from './rest.js';
import { onCall, quietCall, startCall, stopCall, renderRest, callMic, press } from './restCtl.js';
import { initRemote } from '../../shared/js/remote.js';
let pose = null, cardTimer = null, setupOpen = false;
let collapsed = false, customPos = null, moved = false;
let F = [];   // Frames der letzten Sekunden (Pixel)

/* ---------- Kamera und KI ---------- */
async function startSource(){ pose = await startStage(DEMO ? await import('./demo.js') : null, {model:settings.model}); app.source = 'cam'; }

/* ---------- Körperpunkte → Frame ---------- */
function makeFrame(lm, t){
  const p = bodyPoints(lm);
  return {t, lm, lToe:p.lToe, lHeel:p.lHeel, rToe:p.rToe, rHeel:p.rHeel, wr:settings.hand==='L' ? p.lWr : p.rWr, hip:p.hip, bl:p.bl, valid:p.valid};
}
const linePx = () => { const l = settings.line, W = canvas.width, H = canvas.height, s = p => ({x:p.x*W, y:p.y*H}); return l ? {a:s(l.a), b:s(l.b), goal:s(l.goal)} : null; };
// Steht der Spieler still (Hüfte in der letzten Sekunde < 0,1 KL bewegt) und ganz hinter der Linie?
function readyPose(t){
  const w = F.filter(f => f.t >= t - 1); if(w.length < 5 || w[0].t > t - 0.8) return false;
  const bl = w.at(-1).bl, xs = w.map(f => f.hip.x), ys = w.map(f => f.hip.y);
  if(Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) > 0.1*bl) return false;
  const L = linePx(), f = w.at(-1);
  return !L || ['lToe','lHeel','rToe','rHeel'].every(k => lineDist(L, f[k]) <= TH7.lineTouch*f.bl);   // nicht auf der Linie
}

/* ---------- Ablauf ---------- */
const LABEL = {off:'Gestoppt', ready:'Stell dich hinter die Linie', set:'Achtung …', go:'Pfiff!', cool:'Pause'};
function setState(s, t = now()){ app.state = s; app.stateT = t; const el = $('#state'); el.textContent = LABEL[s]; el.dataset.s = s; }

function step(t){
  const s = app.state, last = F.at(-1), seen = last && t - last.t < 0.5;
  if(s==='ready'){
    if(seen && readyPose(t)){
      if(app.quick) app.tw = t + REST.lead - Math.min(REST.lead, t - (app.armT ?? t));   // bereit gemeldet: Pfiff 1 s nach dem Zuruf
      else {
        app.target = settings.call ? pick(settings.targets) : null;
        if(app.target){ say(app.target); big(app.target, 'target'); }
        app.tw = t + (app.target ? 1.6 : 1.0) + Math.random()*1.4;   // Pfiff nach einer kurzen, zufälligen Pause
      }
      setState('set', t);
    }
  } else if(s==='set'){
    if(!seen || !readyPose(t)){ hint('Zu früh bewegt. Ruhig hinter der Linie stehen, dann kommt der Pfiff.', 2500); big(''); setState('ready', t); return; }
    if(t >= app.tw){ beep(2800, 450); quietCall(0.8); app.whistleAt = t; app.rest = null; app.quick = false; app.armT = null; big('Pfiff!', 'whistle', 700); setState('go', t); }
  } else if(s==='go'){
    if(throwDone(F, app.whistleAt) || t - app.whistleAt > TH7.waitThrow) finish(t);
  } else if(s==='cool' && app.rest){
    // Pause mit Zähler: abgelaufen → Pfiff, sobald der Spieler ruhig hinter der Linie steht. Vorher einmal warnen.
    const left = app.rest.left(t);
    if(app.rest.done(t)){ app.quick = true; app.armT = null; setState('ready', t); }
    else if(left != null && app.rest.len >= 2*REST.warn && left <= REST.warn && !app.rest.warned){ app.rest.warned = true; say('Noch zehn Sekunden.'); }
  } else if(s==='cool' && t - app.stateT >= settings.pause && !app.series?.done) setState('ready', t);
  renderRest(app.state==='cool' ? app.rest : null, t, {armed:app.quick && (s==='ready' || s==='set'), target:app.target, mic:callMic.on});
}

// Zuruf oder Antippen während der Pause (restCtl.js, Regeln in rest.js). kind: 'shout' | 'ready' | 'hold'.
// Ein Ruf heißt „bereit“, wenn der Spieler an der Linie steht, sonst „Pause“ bzw. „weiter“.
function atLine(t){
  const f = F.at(-1), L = linePx();
  if(!f || t - f.t > 0.5) return false;
  return !L || nearLine(['lToe','lHeel','rToe','rHeel'].map(k => lineDist(L, f[k])), f.bl);
}
onCall((kind, t) => {
  if(restLen(settings.rest) === undefined || app.state==='off') return;
  const s = app.state, armed = app.quick && (s==='ready' || s==='set');
  if(!armed && !(s==='cool' && app.rest)) return;
  const a = callAction(kind, {armed, atLine:atLine(t), held:!!app.rest?.held});
  if(a==='ready'){ app.rest.hold(t); app.quick = true; app.armT = t; setState('ready', t); }   // Pfiff nach REST.lead s
  else if(a==='hold'){ app.rest.hold(t); say('Pause.'); }
  else if(a==='resume'){ app.rest.resume(t); say('Weiter.'); }
  else if(a==='pause'){   // Pfiff abbrechen, Zähler hält an
    app.rest ??= restClock(restLen(settings.rest), t); app.rest.hold(t);
    app.quick = false; app.armT = null; big(''); setState('cool', t); say('Pause.');
  }
});

function finish(t){
  const r = judge7(F.filter(f => f.t >= app.whistleAt - 0.6), app.whistleAt, linePx());
  ensureSession(); settings.session.last = Date.now();
  const e = {nr:(log.at(-1)?.nr || 0) + 1, sid:settings.session.id, time:Date.now(), target:app.target, ok:r.ok, issues:r.issues, why:r.why, m:r.m, hit:null};
  log.push(e); if(log.length > 1000) log.shift();
  let speech = r.say;
  const S = app.series;
  if(S){
    S.n++; if(r.ok) S.hits++; e.series = S.run;
    speech = seriesSpeech(r, S.n, S.hits, SERIES);
    if(S.n >= SERIES.reps){ S.done = true; settings.seriesHist = [...(settings.seriesHist || []), {at:Date.now(), run:S.run, sid:e.sid, hits:S.hits, n:S.n, goal:SERIES.goal}].slice(-30); }
  }
  // Pause mit Zuruf: Zähler starten, nächstes Ziel gleich mit ansagen (vor dem Pfiff stört keine Ansage den Zuruf).
  const len = restLen(settings.rest);
  app.rest = len !== undefined && !S?.done ? restClock(len, t) : null;
  if(app.rest && settings.call){ app.nextTarget = pick(settings.targets); speech += ` Nächstes Ziel: ${app.nextTarget}.`; }
  store(); say(speech); app.whistleAt = null; app.target = app.rest ? app.nextTarget ?? null : null; big(r.ok ? fmtS(r.m.time) + ' s' : '', r.ok ? 'ok' : '', 2500);
  showCard(e); renderSeries(); renderLog();
  setState('cool', t);
  if(S?.done){ stop(); setTimeout(() => showEnd(S), 400); }
}

function start(){
  if(!settings.line){ openSetup(); hint('Erst die 7-m-Linie antippen', 2500); return; }
  closeSetup(); $('#endCard').hidden = true; unlockBeep(); ensureSession();
  app.series = settings.series ? {run:Date.now(), n:0, hits:0, done:false} : null;
  const intro = restIntro(settings.rest);
  say((settings.series ? `Serie mit ${SERIES.reps} Siebenmetern. Stell dich ruhig hinter die Linie. Nach dem Pfiff hast du drei Sekunden.` : 'Stell dich ruhig hinter die Linie. Nach dem Pfiff hast du drei Sekunden.') + (intro ? ' ' + intro : ''));
  app.rest = null; app.quick = false; app.armT = null;
  if(intro) startCall().then(err => { if(err) hint(err, 5000); });
  setState('ready'); app.stateT = now() + 3 + intro.length/14;   // Ansage ausreden lassen
  F = []; $('#btnStart').textContent = 'Stopp'; $('#btnStart').classList.add('running'); keepAwake(); renderSeries();
}
function stop(){
  setState('off'); big(''); app.whistleAt = null; app.rest = null; app.quick = false; app.armT = null; stopCall(); renderRest(null, 0);
  if(app.series && !app.series.done) app.series = null;
  $('#btnStart').textContent = 'Start'; $('#btnStart').classList.remove('running'); releaseWake(); renderSeries();
}

/* ---------- Hauptschleife ---------- */
let fpsN = 0, fpsT0 = performance.now();
function loop(){
  requestAnimationFrame(loop);
  if(app.source==='none' || !pose || video.readyState < 2){ draw(); return; }
  const pn = performance.now(), t = pn/1000;
  let res = null; try{ res = pose.detectForVideo(video, pn); }catch(e){ console.warn(e); }
  const lm = res?.landmarks?.[0], f = lm ? makeFrame(lm, t) : null;
  app.latest = f;
  if(f?.valid){ F.push(f); while(F.length && t - F[0].t > 8) F.shift(); }
  if(app.state!=='off' && (app.state!=='ready' || t >= app.stateT)) step(t);
  draw();
  fpsN++; if(pn - fpsT0 > 1000){ $('#fps').textContent = Math.round(fpsN*1000/(pn-fpsT0)) + ' fps'; fpsN = 0; fpsT0 = pn; }
}
requestAnimationFrame(loop);

function draw(){
  const W = canvas.width, H = canvas.height, lw = Math.max(2, W/350);
  ctx.clearRect(0, 0, W, H);
  const L = linePx(), mk = app.marking;
  if(L){
    const dx = L.b.x - L.a.x, dy = L.b.y - L.a.y;
    ctx.strokeStyle = '#ff5a5a'; ctx.lineWidth = lw*1.5; ctx.setLineDash([lw*5, lw*3]);
    ctx.beginPath(); ctx.moveTo(L.a.x - dx*2, L.a.y - dy*2); ctx.lineTo(L.b.x + dx*2, L.b.y + dy*2); ctx.stroke(); ctx.setLineDash([]);
    ctx.lineWidth = lw*3; ctx.beginPath(); ctx.moveTo(L.a.x, L.a.y); ctx.lineTo(L.b.x, L.b.y); ctx.stroke();
    ctx.fillStyle = 'rgba(255,90,90,.9)'; ctx.font = `600 ${lw*7}px Barlow, sans-serif`; ctx.fillText('Tor', L.goal.x, L.goal.y);
  }
  if(mk) for(const p of mk.pts){ ctx.fillStyle = '#ff5a5a'; ctx.beginPath(); ctx.arc(p.x*W, p.y*H, lw*4, 0, 7); ctx.fill(); }
  const f = app.latest;
  if(f) drawSkeleton(f.lm, app.state==='go' ? '#3d8bff' : f.valid ? '#33d17a' : '#f6c445');
}

/* ---------- Linie antippen ---------- */
canvas.addEventListener('pointerdown', e => {
  const mk = app.marking; if(!mk) return;
  const r = canvas.getBoundingClientRect(), p = {x:(e.clientX-r.left)/r.width, y:(e.clientY-r.top)/r.height};
  mk.pts.push(p);
  if(mk.pts.length === 3){ settings.line = {a:mk.pts[0], b:mk.pts[1], goal:mk.pts[2], at:Date.now()}; store(); app.marking = null; say('Linie gespeichert.'); }
  renderSetup();
});

/* ---------- Einrichtung ---------- */
const btn = (a, label, cls = '', v = '', on = true) => `<button data-a="${a}" ${v !== '' ? `data-v="${v}"` : ''} class="${cls}" ${on ? '' : 'disabled'}>${label}</button>`;
const choice = (a, opts, cur) => `<div class="btnrow">${opts.map(([v, l]) => btn(a, l, String(cur)===String(v) ? 'on' : '', v)).join('')}</div>`;
function clampPosition(box = $('#setup')){
  if(!box || box.hidden || !customPos) return;
  const stageRect = $('#stage').getBoundingClientRect();
  const boxRect = box.getBoundingClientRect();
  const maxL = Math.max(8, stageRect.width - boxRect.width - 8);
  const maxT = Math.max(8, stageRect.height - boxRect.height - 8);
  customPos.left = Math.max(8, Math.min(customPos.left, maxL));
  customPos.top = Math.max(8, Math.min(customPos.top, maxT));
  box.style.left = `${customPos.left}px`;
  box.style.top = `${customPos.top}px`;
}

function initDraggable(box){
  let startX = 0, startY = 0, origLeft = 0, origTop = 0, dragging = false;

  function onPointerDown(e){
    if(e.target.closest('button, input, select, a')) return;
    const handle = e.target.closest('.sheet-h');
    if(!handle && !box.classList.contains('collapsed')) return;

    dragging = true;
    moved = false;
    startX = e.clientX;
    startY = e.clientY;

    const boxRect = box.getBoundingClientRect();
    const stageRect = $('#stage').getBoundingClientRect();
    origLeft = boxRect.left - stageRect.left;
    origTop = boxRect.top - stageRect.top;

    box.classList.add('dragging');
    try { e.target.setPointerCapture(e.pointerId); } catch(_) {}
    e.preventDefault();
  }

  function onPointerMove(e){
    if(!dragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if(Math.hypot(dx, dy) > 4) moved = true;

    const stageRect = $('#stage').getBoundingClientRect();
    const boxRect = box.getBoundingClientRect();
    let l = origLeft + dx;
    let t = origTop + dy;

    const maxL = Math.max(8, stageRect.width - boxRect.width - 8);
    const maxT = Math.max(8, stageRect.height - boxRect.height - 8);
    l = Math.max(8, Math.min(l, maxL));
    t = Math.max(8, Math.min(t, maxT));

    customPos = { left: l, top: t };
    box.style.left = `${l}px`;
    box.style.top = `${t}px`;
    box.style.right = 'auto';
    box.style.bottom = 'auto';
    box.style.margin = '0';
  }

  function onPointerUp(e){
    if(!dragging) return;
    dragging = false;
    box.classList.remove('dragging');
    try { e.target.releasePointerCapture(e.pointerId); } catch(_) {}
    if(moved) setTimeout(() => { moved = false; }, 60);
  }

  box.addEventListener('pointerdown', onPointerDown);
  box.addEventListener('pointermove', onPointerMove);
  box.addEventListener('pointerup', onPointerUp);
  box.addEventListener('pointercancel', onPointerUp);

  box.addEventListener('dblclick', e => {
    if(e.target.closest('.sheet-h')){
      customPos = null;
      box.style.left = '';
      box.style.top = '';
      box.style.right = '';
      box.style.bottom = '';
      box.style.margin = '';
    }
  });

  window.addEventListener('resize', () => clampPosition(box));
}

function openSetup(){ setupOpen = true; collapsed = false; renderSetup(); }
function closeSetup(){ setupOpen = false; app.marking = null; renderSetup(); }
function renderSetup(){
  const box = $('#setup'); box.hidden = !setupOpen && !app.marking;
  $('#stage').classList.toggle('marking', !!app.marking);
  if(box.hidden) return;
  box.classList.toggle('collapsed', collapsed && !app.marking);
  const mk = app.marking;
  if(mk){
    const n = mk.pts.length;
    box.innerHTML = `<p class="step"><b>${n < 2 ? `Tippe auf ${n ? 'das andere' : 'ein'} Ende der 7-m-Linie.` : 'Tippe jetzt auf einen Punkt Richtung Tor.'}</b> (${n}/3)</p>
      <div class="btnrow">${btn('undo', '↶ Zurück', '', '', n > 0)}${btn('cancel', 'Abbrechen')}</div>`;
    if(customPos) clampPosition(box);
    return;
  }
  const l = settings.line;
  box.innerHTML = `
    <div class="sheet-h">
      <div class="sheet-title"><span class="drag-handle">⠿</span><h3>Einrichtung</h3></div>
      <div class="sheet-actions">
        <button class="collapse-btn" data-a="collapse" aria-label="${collapsed ? 'Aufklappen' : 'Minimieren'}">${collapsed ? '+' : '−'}</button>
        <button class="x" data-a="close" aria-label="Schließen">✕</button>
      </div>
    </div>
    <div class="setup-body collapse-hide">
      <p class="muted">Handy auf dem Stativ seitlich hinter der 7-m-Linie, erhöht (1–1,5 m). Linie, Füße und Wurfarm müssen im Bild sein.</p>
      <button class="guideBtn" data-a="guide">▶ Video: Korrekte Ausführung</button>
      <ul class="checks"><li><span class="ic ${l ? 'ok' : 'mid'}">${l ? '✓' : '•'}</span><span>${l ? `7-m-Linie gesetzt (${fmtDate(new Date(l.at))})` : '7-m-Linie fehlt'}</span></li></ul>
      <div class="btnrow">${btn('tap', l ? 'Linie neu antippen' : 'Linie antippen', l ? '' : 'primaryBtn')}</div>
      <p class="muted">Wurfhand:</p>${choice('hand', [['R', 'Rechts'], ['L', 'Links']], settings.hand)}
      <p class="muted">Ziel vor dem Pfiff ansagen:</p>${choice('call', [[1, 'Ja'], [0, 'Nein']], settings.call ? 1 : 0)}
      <p class="muted">Übung:</p>${choice('series', [[1, `Serie ${SERIES.reps} Würfe, Ziel ${SERIES.goal}`], [0, 'Frei']], settings.series ? 1 : 0)}
      <p class="muted">Pause zwischen den Würfen (alleine: Ball holen, dann rufen):</p>${choice('rest', REST_MODES, settings.rest || 0)}
      <button class="wide" data-a="config">⚙︎ Konfiguration & Pause</button>
      ${app.state==='off' ? `<button class="wide primaryBtn" data-a="start" ${l ? '' : 'disabled'}>Training starten</button>` : ''}
    </div>`;
  if(customPos) clampPosition(box);
}

function renderConfig(){
  const box = $('#configBody');
  if(!box) return;
  const l = settings.line;
  box.innerHTML = `
    <p class="muted">Wurfhand:</p>
    ${choice('hand', [['R', 'Rechtshänder'], ['L', 'Linkshänder']], settings.hand)}
    <p class="muted">Ziel vor dem Pfiff ansagen:</p>
    ${choice('call', [[1, 'Ja'], [0, 'Nein']], settings.call ? 1 : 0)}
    <p class="muted">Übung:</p>
    ${choice('series', [[1, `Serie ${SERIES.reps} Würfe (Ziel ${SERIES.goal})`], [0, 'Freies Training']], settings.series ? 1 : 0)}
    <p class="muted">Pause zwischen den Würfen:</p>
    ${choice('pause', [[2, '2 s'], [3, '3 s'], [4, '4 s'], [6, '6 s']], settings.pause || 4)}
    <p class="muted">7-m-Linie:</p>
    <div class="btnrow">
      <button class="wide ${l ? '' : 'primaryBtn'}" data-c="lineTap">${l ? `Linie neu antippen (gesetzt ${fmtDate(new Date(l.at))})` : '7-m-Linie antippen'}</button>
    </div>
    <p class="muted">Anleitung:</p>
    <button class="guideBtn wide" data-c="guide">▶ Video: Korrekte Ausführung</button>
  `;
}

const ACT = {
  close: closeSetup,
  collapse(){ collapsed = !collapsed; renderSetup(); },
  start,
  guide(){ openGuide(); },
  tap(){ if(app.state!=='off') stop(); app.marking = {pts:[]}; $('#card').hidden = true; renderSetup(); },
  undo(){ app.marking.pts.pop(); renderSetup(); },
  cancel(){ app.marking = null; renderSetup(); },
  hand(el){ settings.hand = el.dataset.v; store(); renderSetup(); renderConfig(); },
  call(el){ settings.call = el.dataset.v === '1'; store(); renderSetup(); renderConfig(); },
  series(el){ settings.series = el.dataset.v === '1'; store(); renderSetup(); renderConfig(); },
  rest(el){ settings.rest = Number(el.dataset.v); store(); renderSetup(); },
  config(){ closeSetup(); renderConfig(); $('#configSheet').hidden = false; }
};
$('#setup').addEventListener('click', e => {
  if(moved){ moved = false; return; }
  const el = e.target.closest('[data-a]');
  if(el && ACT[el.dataset.a]){ ACT[el.dataset.a](el); return; }
  if(collapsed && !e.target.closest('[data-a=close]')){
    collapsed = false;
    renderSetup();
  }
});

/* ---------- Karte nach dem Wurf, Serie, Ende ---------- */
function showCard(e){
  const c = $('#card'), ic = ok => `<span class="ic ${ok ? 'ok' : 'bad'}">${ok ? '✓' : '✗'}</span>`, has = k => e.issues.includes(k);
  c.innerHTML = `<p class="res ${e.ok ? 'ok' : 'bad'}">${e.ok ? '✓' : '✗'} ${esc(e.why)}</p>
    <ul class="checks"><li>${ic(!has('slow') && !has('none'))}<span>Zeit nach dem Pfiff: ${e.m.time != null ? fmtS(e.m.time) + ' s' : 'kein Wurf erkannt'} (erlaubt ${fmtS(TH7.maxTime)} s)</span></li>
      <li>${ic(!has('line'))}<span>${has('line') ? 'Fuß auf oder über der Linie' : 'Linie nicht berührt'}</span></li>
      <li>${ic(!has('foot'))}<span>${has('foot') ? 'Beide Füße vom Boden (ein Fuß muss am Boden bleiben)' : 'Ein Fuß blieb am Boden'}</span></li></ul>
    ${e.target ? `<div class="hitrow"><span>Ziel ${esc(e.target)} getroffen?</span><button data-h="1">Treffer</button><button class="no" data-h="0">Daneben</button></div>` : ''}`;
  c.querySelectorAll('[data-h]').forEach(b => b.onclick = () => { e.hit = b.dataset.h === '1'; store(); renderLog(); c.querySelectorAll('[data-h]').forEach(x => x.classList.toggle('on', x===b)); clearTimeout(cardTimer); cardTimer = setTimeout(() => c.hidden = true, 1200); });
  c.hidden = false; clearTimeout(cardTimer); cardTimer = setTimeout(() => c.hidden = true, 9000);
}
function renderSeries(){
  const b = $('#seriesBox'), S = app.series;
  if(!S){ b.hidden = true; return; }
  b.hidden = false; b.innerHTML = `<b>${Math.min(S.n + (S.done ? 0 : 1), SERIES.reps)}<small>/${SERIES.reps}</small></b><span>✓ ${S.hits} · Ziel ${SERIES.goal}</span>`;
}
function showEnd(S){
  const c = $('#endCard'), ok = S.hits >= SERIES.goal;
  c.innerHTML = `<h3>Serie 7 m</h3><p class="big ${ok ? 'ok' : 'bad'}">${S.hits} von ${S.n}</p><p>${ok ? 'Serie geschafft!' : `Ziel war ${SERIES.goal}. Gleich nochmal?`}</p>
    <div class="btnrow"><button class="primaryBtn" data-e="again">Nochmal</button><button data-e="end">Fertig</button></div>`;
  c.hidden = false; $('#card').hidden = true;
  c.querySelector('[data-e=again]').onclick = () => { c.hidden = true; start(); };
  c.querySelector('[data-e=end]').onclick = () => { c.hidden = true; app.series = null; renderSeries(); };
}

/* ---------- Log und Bericht ---------- */
function summary(list){
  const n = list.length, ok = list.filter(e => e.ok).length, times = list.map(e => e.m.time).filter(x => x != null);
  const cnt = k => list.filter(e => e.issues.includes(k)).length, rated = list.filter(e => e.hit !== null);
  return {n, ok, avg:times.length ? times.reduce((a, b) => a + b, 0)/times.length : null, slow:cnt('slow') + cnt('none'), line:cnt('line'), foot:cnt('foot'),
    hit:rated.filter(e => e.hit).length, rated:rated.length};
}
const runs = () => (settings.seriesHist || []).filter(r => r.sid === settings.session?.id);
function renderLog(){
  const list = sessionEntries(), box = $('#logBody');
  if(!list.length){ box.innerHTML = '<p class="muted">In diesem Training noch keine Würfe. Start drücken, hinter die Linie stellen, auf den Pfiff warten.</p>'; return; }
  const s = summary(list);
  box.innerHTML = `<p class="muted">${fmtDate(new Date(settings.session.start))}</p>
    <p><b>${s.ok} von ${s.n}</b> regelgerecht${s.avg != null ? `, im Schnitt ${fmtS(s.avg)} s nach dem Pfiff` : ''}${s.rated ? `, Treffer ${s.hit}/${s.rated}` : ''}</p>
    <p class="muted">Zu langsam: ${s.slow} · Linie: ${s.line} · kein Fuß am Boden: ${s.foot}</p>
    ${runs().length ? `<h3>Serien</h3>${runs().map(r => `<div class="entry"><b>${r.hits} von ${r.n}</b> <small>Ziel ${r.goal}, ${r.hits >= r.goal ? 'geschafft' : 'nicht geschafft'}</small></div>`).join('')}` : ''}
    <h3>Würfe</h3>${[...list].reverse().map(e => `<div class="entry"><b>Wurf ${e.nr}</b> ${e.target ? esc(e.target) : ''} <small>${e.hit===true ? 'Treffer' : e.hit===false ? 'daneben' : ''}</small><br>
      <small class="${e.ok ? 'tok' : 'tbad'}">${e.ok ? '✓' : '✗'} ${esc(e.why)}</small> <small>· Linie ${e.m.line ?? '–'} KL · Fuß ${e.m.foot ?? '–'} KL</small></div>`).join('')}`;
}
export function reportText(){
  const list = sessionEntries(); if(!list.length) return null;
  const s = summary(list), L = [`7-m-Training vom ${fmtDate(new Date(settings.session.start))}`, `${s.ok} von ${s.n} regelgerecht` + (s.avg != null ? `, im Schnitt ${fmtS(s.avg)} s nach dem Pfiff` : '')];
  L.push(`Zu langsam: ${s.slow}, Linie übertreten: ${s.line}, kein Fuß am Boden: ${s.foot}`);
  if(s.rated) L.push(`Treffer: ${s.hit} von ${s.rated}`);
  if(runs().length){ L.push('', 'Serien:'); runs().forEach(r => L.push(`- ${r.hits} von ${r.n} (Ziel ${r.goal}) ${r.hits >= r.goal ? 'geschafft' : 'nicht geschafft'}`)); }
  L.push('', 'Würfe:'); list.forEach(e => L.push(`${e.nr}. ${e.target ? e.target + ': ' : ''}${e.why}${e.hit===true ? ', Treffer' : e.hit===false ? ', daneben' : ''}`));
  L.push('', 'Erstellt mit dem 7-m-Trainer (Handballcoach)');
  return L.join('\n');
}
async function share(){
  const text = reportText(); if(!text){ hint('Noch keine Würfe in diesem Training'); return; }
  if(navigator.share){ try{ await navigator.share({title:'7-m-Bericht', text}); return; }catch(e){ if(e.name==='AbortError') return; } }
  try{ await navigator.clipboard.writeText(text); hint('Bericht in die Zwischenablage kopiert'); }catch(e){ hint('Teilen nicht möglich'); }
}

/* ---------- Bedienung ---------- */
$('#btnStart').onclick = async () => {
  if(app.state !== 'off'){ stop(); return; }
  if(app.source==='none'){
    say('Einrichtung.'); unlockBeep();
    try{ await startSource(); openSetup(); }catch(e){ console.error(e); hint('Start fehlgeschlagen: ' + (e.message || e), 7000); }
    return;
  }
  start();
};
$('#btnSetup').onclick = async () => { if(app.source==='none'){ $('#btnStart').click(); return; } setupOpen ? closeSetup() : openSetup(); };
$('#btnConfig').onclick = () => { renderConfig(); $('#configSheet').hidden = false; };
$('#btnLog').onclick = () => { renderLog(); $('#logSheet').hidden = false; };
$('#repShare').onclick = share;
$('#newSession').onclick = () => { if(confirm('Neues Training starten? Das aktuelle bleibt im Speicher.')){ ensureSession(true); renderLog(); } };
$('#logClear').onclick = () => { if(confirm('Alle 7-m-Würfe löschen?')){ log.length = 0; store(); renderLog(); } };
$('#configSheet').addEventListener('click', e => {
  const btnEl = e.target.closest('[data-a]');
  if(btnEl){
    const a = btnEl.dataset.a, v = btnEl.dataset.v;
    if(a === 'hand'){ settings.hand = v; store(); renderConfig(); renderSetup(); }
    else if(a === 'call'){ settings.call = v === '1'; store(); renderConfig(); renderSetup(); }
    else if(a === 'series'){ settings.series = v === '1'; store(); renderConfig(); renderSetup(); }
    else if(a === 'pause'){ settings.pause = Number(v); store(); renderConfig(); renderSetup(); }
    return;
  }
  const actEl = e.target.closest('[data-c]');
  if(actEl){
    const c = actEl.dataset.c;
    if(c === 'guide'){ $('#configSheet').hidden = true; openGuide(); }
    else if(c === 'lineTap'){
      $('#configSheet').hidden = true;
      if(app.source === 'none'){ $('#btnStart').click(); return; }
      openSetup();
      ACT.tap();
    }
  }
});
initDraggable($('#setup'));
initSheets();
$('#emptyGuideBtn')?.addEventListener('click', () => openGuide());
if(DEMO){ const a = $('#demoLink'); a.textContent = 'Demo-Modus aktiv: „Start“ drücken. Hier zurück zur echten Kamera.'; a.href = './'; }
document.addEventListener('visibilitychange', () => { if(document.visibilityState==='visible' && app.state!=='off') keepAwake(); });
// Presenter-Tasten und Start mit Vorlauf (shared/js/remote.js): Weiter = bereit, Zurück = Pause/weiter in der Pause.
initRemote({canStart:() => app.source!=='none' && app.state==='off' && !!settings.line, running:() => app.state!=='off', start, stop,
  next:() => press('ready'), prev:() => press('hold'), labels:{next:'Bereit', prev:'Anhalten'}, hint:t => hint(t, 2500)});
