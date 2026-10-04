// Einrichtung vor dem Training: Kamera prüfen, 6-m-Linie ablaufen oder antippen, dann starten.
// Gibt es schon eine Linie, wird sie angeboten; hat sich die Kamera bewegt, wird neu justiert.
import { app } from '../state.js';
import { settings, store, ensureSession } from '../store.js';
import { $, showHint } from '../dom.js';
import { esc, fmtDate } from '../../../shared/js/utils.js';
import { say, beep, unlockBeep } from '../../../shared/js/speech.js';
import { syncMic, micUse } from '../micControl.js';
import { mic, onShout } from '../shout.js';
import { keepAwake, releaseWake } from '../../../shared/js/wakelock.js';
import { ensureModel } from '../model.js';
import { startCamera, curT } from '../source.js';
import { setState, hudTarget } from '../tracking.js';
import { onLineChange, startTapMarking, finishLinePoints, undoPoint, cancelMarking, clearLine, setCamPos } from '../line.js';
import { CAM_POS, TXT } from '../config.js';
import { wizard, onWizardChange, startWizard, stopWizard, finishWalkNow } from '../lineWizard.js';
import { checkCamera } from '../camCheck.js';
import { rings, startRingMarking, ringSkip, ringUndo, cancelRings, clearRings, onRingsChange } from '../rings.js';
import { beginTask, endTaskRun, taskBlock, onTaskButtons, chosenTask, hideEnd } from '../taskRun.js';
import { openGuide } from './guideView.js';

let visible = false, cam = null;   // cam = letztes Ergebnis des Kamera-Checks
let micHits = 0;                   // erkannte Rufe beim Mikro-Test
let collapsed = false;             // Einrichtung minimiert/ausgeklappt
let customPos = null;              // Gespeicherte Position {left, top} nach Drag
let moved = false;                 // Unterscheidung Klick vs. Ziehen

// Kamera mit dem Bild von der Einrichtung vergleichen; bewegt → Linie neu ausrichten oder neu einrichten lassen.
function runCamCheck(){
  if(app.source!=='cam' || !settings.line) { cam = null; return null; }
  cam = checkCamera();
  if(cam.status==='adjusted'){ showHint('Kamera hat sich bewegt. Linie neu ausgerichtet, bitte prüfen.', 4500); say('Die Kamera hat sich bewegt. Ich habe die Linie nachgeführt. Schau kurz, ob sie passt.'); }
  else if(cam.status==='moved'){ showHint('Kamera hat sich bewegt. Bitte die Linie neu einrichten.', 4500); say('Die Kamera hat sich bewegt. Bitte richte die Linie neu ein.'); }
  return cam;
}
const frameReady = () => new Promise(r => setTimeout(r, 800));   // erstes Kamerabild abwarten

export function setRunning(on){ const b=$('#btnStart'); b.textContent = on ? 'Stopp' : 'Start'; b.classList.toggle('running', on); }

// Erster Schritt: Kamera und KI laden, Einrichtung zeigen. Training startet erst danach.
export async function openSetup(){
  if(app.source==='none') say('Einrichtung.');   // Sprachausgabe im Klick freischalten
  try{
    await ensureModel();
    const fresh = app.source==='none';
    if(fresh) await startCamera();
    showSetup(false);
    if(fresh && settings.line){
      await frameReady();
      if(runCamCheck()?.status==='ok'){ showHint('Linie von der letzten Einrichtung gefunden, Kamera steht gleich. Du kannst direkt starten.', 4500); say('Die Linie vom letzten Mal passt noch.'); }
      render();
    }
  }catch(e){ console.error(e); showHint('Start fehlgeschlagen: ' + (e.message || e), 7000); }
}
export function startTraining(){
  if(app.source==='cam' && !settings.line){ showSetup(); showHint(`Erst die ${TXT.line} einrichten`, 2500); return; }
  if(app.source==='cam' && !app.marking && !wizard.phase){
    const prev = cam?.status, c = runCamCheck();
    // Erst prüfen lassen. Wer „bewegt“ schon gesehen hat und trotzdem startet, darf (z. B. nur Licht anders).
    if(c && (c.status==='adjusted' || (c.status==='moved' && prev!=='moved'))){ showSetup(false); return; }
  }
  const tk = chosenTask();
  if(app.source==='cam' && tk?.needCam && settings.camPos !== tk.needCam){
    showSetup(false); showHint(`Für „${tk.name}“ die Kameraposition ${CAM_POS[tk.needCam].name} wählen.`, 4500); say('Für diese Aufgabe brauchst du Kameraposition zwei.'); return;
  }
  cancelMarking(); stopWizard(); hideSetup(); hideEnd();
  ensureSession(); setState('ready', curT());
  say(beginTask(curT()) || 'Los geht’s.'); unlockBeep(); setRunning(true); keepAwake(); syncMic();
}
export function stopTraining(){ setState('off', curT()); app.target=null; hudTarget(null); endTaskRun(); setRunning(false); releaseWake(); syncMic(); render(); }

export function showSetup(check = true){
  const open = visible; visible = true; hideEnd();
  collapsed = false;
  if(check && !open && !app.marking && !wizard.phase) runCamCheck();
  render();
}
export function hideSetup(){ visible = false; if(micUse.test){ micUse.test = false; syncMic(); } render(); }
export const refreshSetup = () => render();
export function toggleSetup(){ visible && !app.marking && !wizard.phase ? hideSetup() : showSetup(); }

const icon = ok => ok ? '<span class="ic ok">✓</span>' : '<span class="ic mid">•</span>';
const btn = (a, label, cls='', on=true, v='') => `<button data-a="${a}" ${v ? `data-v="${v}"` : ''} class="${cls}" ${on?'':'disabled'}>${label}</button>`;
const SENS_LABEL = {low:'Laute Halle', mid:'Mittel', high:'Leise Halle'};

// Zuruf-Modus: Mikro vorher testen und die Empfindlichkeit vor Ort wählen.
function micBlock(){
  const msg = micHits ? `✓ Ruf erkannt (${micHits}×). Passt die Empfindlichkeit? Ballaufpralle und Quietschen dürfen nicht zählen.`
    : mic.on ? (mic.silent ? 'Das Mikrofon liefert keinen Ton. Erlaubnis prüfen.' : 'Ruf jetzt laut („Hey!“) von deinem Startpunkt. Der Balken muss über den weißen Strich.')
    : 'Vor dem Training testen, wie laut der Ruf sein muss.';
  return `<div class="mictest"><p><b>Zuruf-Mikrofon:</b> ${esc(msg)}</p><span class="meter"><i class="lvl"></i><i class="thr"></i></span>
    <div class="btnrow">${btn('micTest', micUse.test ? 'Test beenden' : 'Mikro testen')}</div>
    <p class="muted">Empfindlichkeit:</p><div class="btnrow sens">${['low','mid','high'].map(k => btn('sens', SENS_LABEL[k], settings.sens===k ? 'on' : '', true, k)).join('')}</div></div>`;
}
// Kameraposition: 1 Grundlinie (Standard) oder 2 im Feld mit Tor im Bild. Jede Position hat ihre eigene Linie.
function camPosBlock(){
  if(Object.keys(CAM_POS).length < 2) return `<p class="muted">${esc(CAM_POS[settings.camPos]?.where || CAM_POS.base.where)}</p>`;
  return `<p class="muted">Kameraposition:</p><div class="btnrow campos">${Object.keys(CAM_POS).map(k => btn('camPos', CAM_POS[k].name, settings.camPos===k ? 'on' : '', true, k)).join('')}</div>
    <p class="muted">${esc(CAM_POS[settings.camPos]?.where || '')}</p>`;
}
// Treffererkennung (nur Position 2, Tor im Bild): Ringe antippen.
function ringBlock(){
  const n = rings().length;
  return `<p class="muted">Treffererkennung: ${n ? `${n} Ringe gesetzt. Treffer und Wurftempo werden geschätzt.` : 'Ringe im Bild antippen, dann erkennt die App Treffer selbst.'}</p>
    <div class="btnrow">${btn('rings', n ? 'Ringe neu antippen' : 'Ringe antippen')}${n ? btn('ringClear', 'Löschen') : ''}</div>`;
}
const FLIP = '<button data-a="flip" class="flip" aria-label="Leiste oben/unten">⇅</button>';   // falls die Leiste die Linie verdeckt

function render(){
  const box = $('#setup'), busy = !!(app.marking || wizard.phase || app.ringMark);
  box.hidden = !visible && !busy;
  $('#stage').classList.toggle('marking', busy);
  if(box.hidden) return;

  box.classList.toggle('collapsed', collapsed && !busy);
  if(customPos){
    box.style.left = `${customPos.left}px`;
    box.style.top = `${customPos.top}px`;
    box.style.right = 'auto';
    box.style.bottom = 'auto';
    box.style.margin = '0';
  }

  const colBtn = `<button class="collapse-btn" data-a="collapse" aria-label="${collapsed ? 'Einrichtung erweitern' : 'Einrichtung minimieren'}" title="${collapsed ? 'Erweitern' : 'Minimieren'}">${collapsed ? '+' : '−'}</button>`;
  const head = (title, extraActions = '') => `<div class="sheet-h" title="Ziehen zum Verschieben">
    <div class="sheet-title"><span class="drag-handle" aria-hidden="true">⠿</span><h3>${title}</h3></div>
    <div class="sheet-actions">${extraActions}</div>
  </div>`;

  let h;
  if(app.ringMark){
    const m = app.ringMark, k = m.pts.length;
    h = `${head('Ringe antippen', FLIP)}
      <div class="setup-body">
        <p><b>Ringe antippen:</b> Tippe auf die Mitte von „${esc(m.names[k])}“ (${k + 1}/${m.names.length}).</p>
        <div class="btnrow">${btn('ringUndo','↶ Zurück','',k>0)}${btn('ringSkip','Nicht im Bild')}${btn('ringCancel','Abbrechen')}</div>
      </div>`;
  } else if(app.marking && app.markStep==='line'){
    const n = app.marking.length;
    h = `${head('Linie antippen', FLIP)}
      <div class="setup-body">
        <p><b>Linie antippen:</b> Punkte entlang der ${TXT.line} setzen, von außen nach innen, ${TXT.tapHint}. Gesetzt: ${n}</p>
        <div class="btnrow">${btn('undo','↶ Zurück','',n>0)}${btn('done','Fertig','primaryBtn',n>=2)}${btn('cancel','Abbrechen')}</div>
      </div>`;
  } else if(app.marking){
    h = `${head(TXT.insideLabel, FLIP)}
      <div class="setup-body">
        <p><b>${TXT.insideLabel}:</b> Jetzt ${TXT.insideTap}.</p>
        <div class="btnrow">${btn('undo','↶ Zurück')}${btn('cancel','Abbrechen')}</div>
      </div>`;
  } else if(wizard.phase){
    h = `${head('Linie ablaufen', FLIP)}
      <div class="setup-body">
        <p><b>Linie ablaufen:</b> ${esc(wizard.msg)}</p>
        <div class="btnrow">${wizard.phase==='walk' ? btn('walkDone','Fertig','primaryBtn') : ''}${wizard.phase==='inside' ? btn('tapInside', TXT.insideLabel + ' antippen') : ''}${btn('wizCancel','Abbrechen')}</div>
      </div>`;
  } else {
    const line = settings.line, isCam = app.source==='cam';
    const how = line ? (line.snapped ? 'am Boden erkannt' : 'aus Fußpunkten/angetippt') + (line.at ? `, ${fmtDate(new Date(line.at))}` : '') : '';
    const camLine = !line || !cam ? '' : cam.status==='ok' ? `<li>${icon(true)}<span>Kamera steht wie bei der Einrichtung</span></li>`
      : cam.status==='adjusted' ? `<li><span class="ic mid">!</span><span>Kamera hat sich bewegt: Linie neu ausgerichtet. Passt die rote Linie?</span></li>`
      : cam.status==='moved' ? `<li><span class="ic bad">✗</span><span>Kamera hat sich bewegt: Linie bitte neu ablaufen oder antippen.</span></li>` : '';
    h = `${head('Einrichtung', `${colBtn}<button class="x" data-a="close" aria-label="Schließen">✕</button>`)}
      <div class="setup-body">
        ${isCam ? taskBlock(btn) : ''}
        ${isCam ? camPosBlock() : ''}
        <ul class="checks">
          <li>${icon(app.source!=='none')}<span>${isCam ? 'Kamera läuft' : app.source==='file' ? 'Video geladen' : 'Kamera aus'}. ${settings.camPos==='court' ? 'Tor, Linie und Absprungzone' : 'Ganzer Körper und Linie'} im Bild?</span></li>
          <li>${icon(!!line)}<span>${line ? `${TXT.line} gesetzt (${line.pts.length} Punkte, ${how})` : `${TXT.line} fehlt`}</span></li>
          ${camLine}
        </ul>
        ${wizard.msg ? `<p class="muted">${esc(wizard.msg)}</p>` : ''}
        <div class="btnrow">${btn('wizard','Linie ablaufen')}${btn('tap','Linie antippen')}${line ? btn('fix','Korrigieren') + btn('clear','Löschen') : ''}</div>
        ${isCam && settings.camPos==='court' ? ringBlock() : ''}
        ${isCam && (settings.mode==='call' || chosenTask()?.shout) ? micBlock() : ''}
        ${isCam && app.state==='off' ? `<button class="wide primaryBtn" data-a="start" ${line ? '' : 'disabled'}>${chosenTask() ? 'Aufgabe starten' : line && cam?.status==='ok' ? 'Mit dieser Linie starten' : 'Training starten'}</button>` : ''}
      </div>`;
  }
  box.innerHTML = h;
  if(customPos) clampPosition(box);
}

const ACTIONS = {
  close: hideSetup,
  collapse(){
    collapsed = !collapsed;
    render();
  },
  start: startTraining,
  tap(){ if(app.source==='cam' && app.state!=='off') stopTraining(); wizard.msg=''; cam = null; startTapMarking(); },
  wizard(){ if(app.source==='cam' && app.state!=='off') stopTraining(); cam = null; startWizard(); },
  clear(){ clearLine(); cam = null; },
  fix(){ if(app.source==='cam' && app.state!=='off') stopTraining(); wizard.msg=''; cam = null; startTapMarking(settings.line.pts); },
  undo: undoPoint,
  done: finishLinePoints,
  cancel: cancelMarking,
  walkDone: finishWalkNow,
  tapInside(){ const pts = wizard.pts; stopWizard(); startTapMarking(pts, 'inside'); },
  wizCancel(){ stopWizard(); },
  flip(){ $('#stage').classList.toggle('flip'); },
  rings(){ if(app.source==='cam' && app.state!=='off') stopTraining(); $('#card').style.display = 'none'; startRingMarking(); },
  ringUndo, ringSkip, ringCancel: cancelRings, ringClear: clearRings,
  micTest(){ micUse.test = !micUse.test; micHits = 0; syncMic().then(render); render(); },
  guide(){ openGuide(chosenTask()?.id || 'free'); },
  sens(el){ settings.sens = el.dataset.v; store(); render(); },
  task(el){ settings.task = el.dataset.v; store(); render(); },
  // Andere Position: deren Linie laden und prüfen, ob die Kamera so steht wie bei deren Einrichtung.
  camPos(el){
    if(el.dataset.v===settings.camPos) return;
    if(app.source==='cam' && app.state!=='off') stopTraining();
    setCamPos(el.dataset.v); cam = null; wizard.msg = ''; render();
    if(settings.line) frameReady().then(() => { if(visible && !app.marking && !wizard.phase){ runCamCheck(); render(); } });
  }
};

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

export function initSetup(){
  onLineChange(render); onWizardChange(render); onRingsChange(render);
  onTaskButtons(startTraining, stopTraining);
  const box = $('#setup');
  box.addEventListener('click', e => {
    if(moved){ moved = false; return; }
    const el = e.target.closest('[data-a]'), a = el?.dataset.a;
    if(a && ACTIONS[a]){ ACTIONS[a](el); return; }
    // Wenn minimiert: Antippen der Kopfzeile klappt es wieder auf
    if(collapsed && !e.target.closest('[data-a=close]')){
      collapsed = false;
      render();
    }
  });
  // Mikro-Test: erkannter Ruf mit Piep quittieren (im Training macht das tracking.js).
  onShout(() => { if(micUse.test && app.state==='off'){ micHits++; beep(); render(); } });
  initDraggable(box);
}
