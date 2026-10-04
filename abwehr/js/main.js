import { app, settings, log, store, ensureSession, sessionEntries, DEMO } from './state.js';
import { judgeMove, judgeOut, baseFrame, nextCmd, summary, TH_D, fmtS, leadSide, SIDE } from './rules.js';
import { say, beep, unlockBeep } from '../../shared/js/speech.js';
import { keepAwake, releaseWake } from '../../shared/js/wakelock.js';
import { esc, fmtDate } from '../../shared/js/utils.js';
import { $, video, canvas, ctx, now, hint, big, startSource as startStage, bodyPoints, drawSkeleton, initSheets } from '../../shared/js/stage.js';
import { createGuide } from '../../shared/js/demoGuide.js';
import { proj } from '../../shared/js/demo/scene.js';

const CAM_ABW = { pos: [-5, 12.6, 1.4], look: [-5, 7, 0.8] };
const HOME_ABW = { x: -5, y: 7 };

const CUES_BASE = [
  '1. Grundstellung: Beine mehr als schulterbreit auseinander, Knie und Hüfte gebeugt (tiefer Schwerpunkt), Fersen leicht gelöst.',
  '2. Seitlich zur Wurfhand: Der Fuß auf der Wurfarmseite des Gegenspielers steht eine halbe Schuhlänge vorn.',
  '3. Armhaltung (Vorhalte): Arme angewinkelt vor der Brust; führungsbereit auf Schulterhöhe.',
  '4. Verschieben (Side-Steps): Schnelle, flache Gleitschritte seitlich. Die Füße dürfen sich NIEMALS kreuzen!',
  '5. Schwerpunkt tief halten: Bei Richtungswechseln nicht aufrichten, sondern im tiefen Stand weiterarbeiten.'
];

const CUES_OUT = [
  '1. Diagonalschritt nach vorn: Explosives Heraustreten im richtigen Timing auf den anlaufenden Gegenspieler.',
  '2. Fußstellung beim Raus: Der Fuß auf der gegnerischen Wurfarmseite steht stabil vorn (stemmt gegen den Durchbruch).',
  '3. Führarm auf Schulterhöhe: Ballseitiger Arm stoppt/blockt den Wurfarm des Gegners ohne Festhalten.',
  '4. Sicherungsarm am Körper: Der zweite Arm kontrolliert die gegnerische Hüfte und sichert ab.',
  '5. Schnelles Absinken: Nach Ballabgabe oder Stopp sofort rückwärts-diagonal in die Grundstellung absinken.'
];

const GUIDE_ABWEHR_CFG = {
  id: 'abwehr',
  title: () => 'Abwehr-Beinarbeit: Korrekte Ausführung',
  sub: v => v === 'out' ? 'Heraustreten (1-gegen-1 mit Führarm)' : 'Grundposition & Verschieben (Side-Steps)',
  cues: v => v === 'out' ? CUES_OUT : CUES_BASE,
  cam: CAM_ABW,
  variants: [
    { id: 'base', label: 'Grundposition & Verschieben' },
    { id: 'out', label: 'Heraustreten (1 gegen 1)' }
  ],
  duration: 3.4,
  step(loopT, variant){
    const P = {
      x: HOME_ABW.x, y: HOME_ABW.y, a: Math.PI / 2, phi: 0, s: 0,
      lift: -0.13, lf: 0, rf: 0, lfx: 0, rfx: 0, lfy: 0, rfy: 0,
      raise: 0, swing: 0, twist: 0, lean: 0.1, ball: false, guard: null
    };
    let phase = '1. Grundstellung (tief & stabil)';

    if(variant === 'out'){
      if(loopT < 0.8){
        phase = '1. Grundstellung vor dem Angreifer';
        P.lfy = -0.14; P.rfy = 0.14;
        P.lfx = 0.2; P.rfx = -0.1;
        P.guard = { l: -0.12, r: -0.3 };
      } else if(loopT < 1.8){
        phase = '2. Heraustreten: Führarm an Wurfarm, Schritt vor';
        const u = (loopT - 0.8) / 1.0;
        P.y = HOME_ABW.y + 0.6 * u;
        P.lfx = 0.3; P.rfx = -0.1;
        P.lfy = -0.04; P.rfy = 0.04;
        P.lf = 0.06 * Math.sin(u * Math.PI * 2);
        P.rf = 0.06 * -Math.sin(u * Math.PI * 2);
        P.guard = { l: 0.0, r: -0.3 };
      } else if(loopT < 2.6){
        phase = '3. Schnelles Absinken in die Lücke';
        const u = (loopT - 1.8) / 0.8;
        P.y = HOME_ABW.y + 0.6 * (1 - u);
        P.lfx = 0.2; P.rfx = -0.1;
        P.lfy = -0.14; P.rfy = 0.14;
        P.lf = 0.06 * -Math.sin(u * Math.PI * 2);
        P.rf = 0.06 * Math.sin(u * Math.PI * 2);
        P.guard = { l: -0.15, r: -0.3 };
      } else {
        phase = '✓ Grundstellung wieder eingenommen';
        P.lfy = -0.14; P.rfy = 0.14;
        P.lfx = 0.22; P.rfx = -0.1;
        P.guard = { l: -0.12, r: -0.3 };
      }
    } else {
      P.lfy = -0.14; P.rfy = 0.14;
      P.guard = { l: -0.15, r: -0.25 };
      if(loopT < 0.8){
        phase = '1. Grundstellung: Beine breit, Arme in Vorhalte';
        P.lfx = 0.2; P.rfx = -0.1;
      } else if(loopT < 1.8){
        phase = '2. Side-Steps nach links (Füße NIE kreuzen!)';
        const u = (loopT - 0.8) / 1.0;
        P.x = HOME_ABW.x - 0.7 * u;
        P.lf = 0.06 * Math.max(0, Math.sin(u * Math.PI * 4));
        P.rf = 0.06 * Math.max(0, -Math.sin(u * Math.PI * 4));
      } else if(loopT < 2.8){
        phase = '3. Side-Steps nach rechts zurück';
        const u = (loopT - 1.8) / 1.0;
        P.x = (HOME_ABW.x - 0.7) + 0.7 * u;
        P.lf = 0.06 * Math.max(0, -Math.sin(u * Math.PI * 4));
        P.rf = 0.06 * Math.max(0, Math.sin(u * Math.PI * 4));
      } else {
        phase = '✓ Fester Stand in Grundposition';
        P.x = HOME_ABW.x;
      }
    }

    return { P, ballFly: null, phase };
  },
  drawOverlays(ctx, variant){
    ctx.save();
    if(variant === 'out'){
      const p1 = proj([HOME_ABW.x, HOME_ABW.y, 0]);
      const p2 = proj([HOME_ABW.x, HOME_ABW.y + 0.6, 0]);
      ctx.strokeStyle = 'rgba(52, 152, 219, 0.85)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    } else {
      const p1 = proj([HOME_ABW.x, HOME_ABW.y, 0]);
      const p2 = proj([HOME_ABW.x - 0.7, HOME_ABW.y, 0]);
      ctx.strokeStyle = 'rgba(46, 204, 113, 0.85)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
    ctx.restore();
  }
};

const guideAbwehr = createGuide(GUIDE_ABWEHR_CFG);
export const openGuide = guideAbwehr.openGuide;
export const closeGuide = guideAbwehr.closeGuide;

let pose = null, setupOpen = false, F = [], lowN = 0, drillN = 0, lag = null, baseN = {n:0, wide:0, arms:0, upright:0, side:0};
const OPP_SAY = {R:'Rechtshänder', L:'Linkshänder'};
const median = a => { const s = [...a].sort((x, y) => x - y); return s[s.length >> 1]; };

async function startSource(){ pose = await startStage(DEMO ? await import('./demo.js') : null, {model:settings.model, facing:settings.facing}); app.source = 'cam'; }

const LABEL = {off:'Gestoppt', calib:'Aufrecht hinstellen', stance:'Grundposition', cmd:'Los!', gap:'Bereit'};
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
      app.stand = {y:median(w.map(x => x.hip.y)), x:median(w.map(x => x.hip.x)), bl:median(w.map(x => x.bl)),
        torso:median(w.map(x => x.hip.y - (x.lSh.y + x.rSh.y)/2))};
      say(`Grundposition, seitlich zur ${app.curOpp === 'L' ? 'linken' : 'rechten'} Wurfhand.`); setState('stance', t);
    }
  } else if(s==='stance'){
    if(t - app.stateT > 1.8){ app.until = t + settings.dur; lowN = drillN = 0; baseN = {n:0, wide:0, arms:0, upright:0, side:0}; app.out = false; say('Los geht’s.'); setState('gap', t); app.nextAt = t + 1.2; }
  } else if(s==='gap'){
    if(t >= app.until){ finishRound(t); return; }
    if(t >= app.nextAt){
      const b = app.stand, off = f ? (f.hip.x - b.x)/b.bl : 0, dep = f ? (f.bl - b.bl)/b.bl : 0;
      app.cmd = nextCmd(off, dep, app.last); app.last = [...app.last, app.cmd].slice(-3);
      app.tc = t; lag = null;
      // Gegenspieler (Wurfhand): fest eingestellt oder beim Heraustreten zufällig angesagt.
      app.cmdOpp = settings.opp === 'mix' && app.cmd === 'raus' ? (Math.random() < 0.5 ? 'R' : 'L') : app.curOpp;
      app.curOpp = app.cmdOpp;   // ab jetzt seitlich zu dieser Wurfhand stehen
      const text = app.cmd === 'raus' && settings.opp === 'mix' ? `Raus, ${OPP_SAY[app.cmdOpp]}` : app.cmd;
      const u = say(text); if(u){ const tc = t; u.onstart = () => { if(app.tc === tc) lag = now() - tc; }; }
      big(app.cmd.toUpperCase(), 'target'); setState('cmd', t);
    }
  } else if(s==='cmd'){
    if(t - app.tc >= TH_D.window){
      const r = judgeMove(F, app.tc, app.cmd, TH_D, lag ?? 0);
      let extra = 0;
      // Heraustreten: versetzte Fußstellung (Fuß auf der Wurfarmseite des Gegners vorn) und Führarm an seinen Wurfarm.
      if(app.cmd === 'raus' && r.dir === 'raus' && r.react != null){
        r.out = judgeOut(F, app.tc + r.react + 0.45, app.tc + TH_D.window, app.cmdOpp, TH_D); r.opp = app.cmdOpp;
        if(r.out.say){ say(r.out.say); extra = 1.2; }
      }
      if(r.dir === 'raus') app.out = true; else if(r.dir) app.out = false;
      app.results.push({cmd:app.cmd, ...r});
      big(r.ok ? fmtS(r.react) + ' s' : '✗', r.ok && !(r.out && !(r.out.foot && r.out.arm)) ? 'ok' : 'bad', 900);
      if(!r.ok && !extra) beep(330, 160);
      app.nextAt = t + 0.5 + Math.random()*1.0 + extra; setState('gap', t);
    }
  }
  // Körperschwerpunkt: Anteil der Zeit, in der die Hüfte deutlich unter der Stand-Höhe ist.
  if((s==='gap' || s==='cmd') && f && app.stand){ drillN++; if((f.hip.y - app.stand.y)/app.stand.bl >= TH_D.lowDrop) lowN++; }
  // Grundposition (nicht während herausgetreten, da ist die Fußstellung versetzt): breit, Arme vorn, Oberkörper aufrecht.
  if(s==='gap' && f && app.stand && !app.out){ const b = baseFrame(f, app.stand, TH_D, app.curOpp); baseN.n++; for(const k of ['wide', 'arms', 'upright', 'side']) if(b[k]) baseN[k]++; }
}

function start(){
  closeSetup(); unlockBeep(); ensureSession(); F = []; app.results = []; app.last = []; app.stand = null;
  app.curOpp = settings.opp === 'mix' ? (Math.random() < 0.5 ? 'R' : 'L') : settings.opp;
  say(`Abwehr-Beinarbeit, ${settings.dur} Sekunden, Gegenspieler ${OPP_SAY[app.curOpp]}. Stell dich aufrecht hin, Gesicht zum Handy.`);
  setState('calib'); app.stateT = now() + 2.5;
  $('#btnStart').textContent = 'Stopp'; $('#btnStart').classList.add('running'); keepAwake(); $('#card').hidden = true;
}
function stop(){
  setState('off'); big(''); $('#btnStart').textContent = 'Start'; $('#btnStart').classList.remove('running'); releaseWake();
}
function finishRound(){
  const share = k => baseN.n ? Math.round(baseN[k]/baseN.n*100)/100 : null;
  const s = summary(app.results, drillN ? lowN/drillN : null, TH_D, {wide:share('wide'), arms:share('arms'), upright:share('upright'), side:share('side')});
  ensureSession(); settings.session.last = Date.now();
  const e = {nr:(log.at(-1)?.nr || 0) + 1, sid:settings.session.id, time:Date.now(), dur:settings.dur, n:s.n, ok:s.ok, avg:s.avg, crossed:s.crossed,
    low:s.lowShare == null ? null : Math.round(s.lowShare*100)/100, opp:settings.opp, base:s.base, out:s.out,
    moves:app.results.map(r => ({cmd:r.cmd, dir:r.dir, react:r.react, ok:r.ok, crossed:r.crossed, ...(r.out ? {opp:r.opp, foot:r.out.foot, arm:r.out.arm} : {})}))};
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
  if(p?.valid){ F.push({t, hip:p.hip, bl:p.bl, lAnk:p.lAnk, rAnk:p.rAnk, lSh:p.lSh, rSh:p.rSh, lWr:p.lWr, rWr:p.rWr}); while(F.length && t - F[0].t > 6) F.shift(); }
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
    <p class="muted">Handy frontal vor dir, 4–5 m weg, Hüfthöhe: das Handy ist dein Gegenspieler. Ganzer Körper im Bild und Platz für einen großen Schritt in jede Richtung. Die Richtungen gelten aus deiner Sicht.</p>
    <button class="guideBtn" data-a="guide">▶ Video: Korrekte Ausführung</button>
    <p class="muted">Gegenspieler wirft mit:</p>${choice('opp', [['R', 'Rechts'], ['L', 'Links'], ['mix', 'Wechselnd']], settings.opp)}
    <p class="muted">${esc(settings.opp === 'mix' ? 'Ich sage am Anfang und bei jedem „Raus“, ob er Rechts- oder Linkshänder ist. Du stehst immer seitlich zu seiner Wurfhand.' : `Du stehst immer seitlich zu seiner Wurfhand: ${SIDE[leadSide(settings.opp)]} Fuß vorn, ${SIDE[leadSide(settings.opp)]} Hand vorn als Führarm. Beim Heraustreten geht diese Hand an seinen Wurfarm, die andere an seinen Oberkörper.`)}</p>
    <p class="muted">Dauer einer Runde:</p>${choice('dur', [[30, '30 s'], [40, '40 s'], [60, '60 s']], settings.dur)}
    <p class="muted">Kamera:</p>${choice('facing', [['environment', 'Rückkamera'], ['user', 'Frontkamera']], settings.facing)}
    ${app.state==='off' ? `<button class="wide primaryBtn" data-a="start">Runde starten</button>` : ''}`;
}
const ACT = {
  close: closeSetup, start,
  guide(){ openGuide(); },
  dur(el){ settings.dur = +el.dataset.v; store(); renderSetup(); },
  opp(el){ settings.opp = el.dataset.v; store(); renderSetup(); },
  async facing(el){ settings.facing = el.dataset.v; store(); renderSetup(); if(!DEMO && app.source==='cam'){ try{ await startSource(); }catch(e){ hint('Kamera-Fehler: ' + (e.message || e), 5000); } } }
};
$('#setup').addEventListener('click', e => { const el = e.target.closest('[data-a]'); if(el && ACT[el.dataset.a]) ACT[el.dataset.a](el); });

/* ---------- Karte, Log, Bericht ---------- */
function showCard(e, s){
  const c = $('#card'), ic = ok => `<span class="ic ${ok ? 'ok' : 'bad'}">${ok ? '✓' : '✗'}</span>`;
  c.innerHTML = `<p class="res ${e.ok >= e.n*0.8 ? 'ok' : 'bad'}">${e.ok} von ${e.n} richtig</p>
    <ul class="checks"><li>${ic(e.avg != null && e.avg <= 0.6)}<span>Reaktion im Schnitt: ${e.avg != null ? fmtS(e.avg) + ' s' : '–'}</span></li>
      <li>${ic(!e.crossed)}<span>${e.crossed ? `Füße ${e.crossed}× gekreuzt` : 'Füße nie gekreuzt'}</span></li>
      <li>${ic(e.low == null || e.low >= TH_D.lowShare)}<span>Körperschwerpunkt tief: ${e.low == null ? '–' : Math.round(e.low*100) + ' % der Zeit'}</span></li>
      ${e.base?.wide != null ? `<li>${ic(e.base.wide >= TH_D.shareOk && e.base.upright >= TH_D.shareOk && e.base.arms >= TH_D.shareOk && !(e.base.side < TH_D.shareOk))}<span>Grundposition: seitlich zur Wurfhand ${pct(e.base.side)}, breit ${pct(e.base.wide)}, aufrecht ${pct(e.base.upright)}, Arme vorn ${pct(e.base.arms)}</span></li>` : ''}
      ${e.out ? `<li>${ic(e.out.ok === e.out.n)}<span>Heraustreten: ${e.out.ok} von ${e.out.n} mit Fuß und Führarm auf der Wurfarmseite</span></li>` : ''}</ul>
    ${s.tips.length ? `<p class="muted">${esc(s.tips.join(' '))}</p>` : ''}
    <div class="btnrow"><button class="primaryBtn" data-c="again">Nochmal</button><button data-c="close">Fertig</button></div>`;
  c.hidden = false;
  c.querySelector('[data-c=again]').onclick = () => { c.hidden = true; start(); };
  c.querySelector('[data-c=close]').onclick = () => { c.hidden = true; };
}
const NAMES = {links:'links', rechts:'rechts', raus:'raus', zurück:'zurück'};
const pct = x => x == null ? '–' : Math.round(x*100) + ' %';
function renderLog(){
  const list = sessionEntries(), box = $('#logBody');
  if(!list.length){ box.innerHTML = '<p class="muted">In diesem Training noch keine Runde. Start drücken und frontal vors Handy stellen.</p>'; return; }
  box.innerHTML = `<p class="muted">${fmtDate(new Date(settings.session.start))}</p>` + [...list].reverse().map(e =>
    `<div class="entry"><b>Runde ${e.nr}: ${e.ok} von ${e.n} richtig</b><br><small>Reaktion ${e.avg != null ? fmtS(e.avg) + ' s' : '–'} · gekreuzt ${e.crossed}× · tief ${e.low == null ? '–' : Math.round(e.low*100) + ' %'}</small><br>
      ${e.out ? `<small>Heraustreten mit richtiger Stellung: ${e.out.ok}/${e.out.n}${e.base?.wide != null ? ` · Grundposition seitlich ${pct(e.base.side)}, breit ${pct(e.base.wide)}, aufrecht ${pct(e.base.upright)}, Arme vorn ${pct(e.base.arms)}` : ''}</small><br>` : ''}
      <small>${e.moves.map(m => `${m.ok ? '✓' : '✗'} ${NAMES[m.cmd]}${m.react != null ? ' ' + fmtS(m.react) : ''}${m.foot != null ? (m.foot && m.arm ? ' (Stellung ✓)' : ' (Stellung ✗)') : ''}`).join(' · ')}</small></div>`).join('');
}
export function reportText(){
  const list = sessionEntries(); if(!list.length) return null;
  const L = [`Abwehr-Beinarbeit vom ${fmtDate(new Date(settings.session.start))}`];
  list.forEach(e => L.push(`Runde ${e.nr} (${e.dur} s): ${e.ok} von ${e.n} richtig, Reaktion ${e.avg != null ? fmtS(e.avg) + ' s' : '–'}, Füße gekreuzt ${e.crossed}×, tief ${e.low == null ? '–' : Math.round(e.low*100) + ' %'}`
    + (e.out ? `, Heraustreten mit richtiger Stellung ${e.out.ok}/${e.out.n}` : '') + (e.base?.wide != null ? `, Grundposition seitlich ${pct(e.base.side)}, breit ${pct(e.base.wide)}, aufrecht ${pct(e.base.upright)}, Arme vorn ${pct(e.base.arms)}` : '')));
  L.push('', 'Stellung nach den DHB-Technikkriterien 1-gegen-1 (Landeskaderkriterien des DHB).');
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
    say('Einrichtung.'); unlockBeep();
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
$('#emptyGuideBtn')?.addEventListener('click', () => openGuide());
if(DEMO){ const a = $('#demoLink'); a.textContent = 'Demo-Modus aktiv: „Start“ drücken. Hier zurück zur echten Kamera.'; a.href = './'; }
document.addEventListener('visibilitychange', () => { if(document.visibilityState==='visible' && app.state!=='off') keepAwake(); });
