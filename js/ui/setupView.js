// Einrichtung vor dem Training: Kamera prüfen, 6-m-Linie ablaufen oder antippen, dann starten.
import { app } from '../state.js';
import { settings, ensureSession } from '../store.js';
import { $, showHint } from '../dom.js';
import { esc } from '../utils.js';
import { say } from '../speech.js';
import { keepAwake, releaseWake } from '../wakelock.js';
import { ensureModel } from '../model.js';
import { startCamera, curT } from '../source.js';
import { setState, hudTarget } from '../tracking.js';
import { onLineChange, startTapMarking, finishLinePoints, undoPoint, cancelMarking, clearLine } from '../line.js';
import { wizard, onWizardChange, startWizard, stopWizard, finishWalkNow } from '../lineWizard.js';

let visible = false;

export function setRunning(on){ const b=$('#btnStart'); b.textContent = on ? 'Stopp' : 'Start'; b.classList.toggle('running', on); }

// Erster Schritt: Kamera und KI laden, Einrichtung zeigen. Training startet erst danach.
export async function openSetup(){
  if(app.source==='none') say('Einrichtung');   // Sprachausgabe im Klick freischalten
  try{
    await ensureModel();
    if(app.source==='none') await startCamera();
    showSetup();
  }catch(e){ console.error(e); showHint('Start fehlgeschlagen: ' + (e.message || e), 7000); }
}
export function startTraining(){
  if(app.source==='cam' && !settings.line){ showSetup(); showHint('Erst die 6-m-Linie einrichten', 2500); return; }
  cancelMarking(); stopWizard(); hideSetup();
  say('Los geht’s'); ensureSession(); setState('ready', curT()); setRunning(true); keepAwake();
}
export function stopTraining(){ setState('off', curT()); app.target=null; hudTarget(null); setRunning(false); releaseWake(); }

export function showSetup(){ visible = true; render(); }
export function hideSetup(){ visible = false; render(); }
export function toggleSetup(){ visible && !app.marking && !wizard.phase ? hideSetup() : showSetup(); }

const icon = ok => ok ? '<span class="ic ok">✓</span>' : '<span class="ic mid">•</span>';
const btn = (a, label, cls='', on=true) => `<button data-a="${a}" class="${cls}" ${on?'':'disabled'}>${label}</button>`;
const FLIP = '<button data-a="flip" class="flip" aria-label="Leiste oben/unten">⇅</button>';   // falls die Leiste die Linie verdeckt

function render(){
  const box = $('#setup'), busy = !!(app.marking || wizard.phase);
  box.hidden = !visible && !busy;
  $('#stage').classList.toggle('marking', busy);
  if(box.hidden) return;
  let h;
  if(app.marking && app.markStep==='line'){
    const n = app.marking.length;
    h = `<p><b>Linie antippen:</b> Punkte entlang der 6-m-Linie setzen, beim Bogen 4–6. Gesetzt: ${n}</p>
      <div class="btnrow">${btn('undo','↶ Zurück','',n>0)}${btn('done','Fertig','primaryBtn',n>=2)}${btn('cancel','Abbrechen')}${FLIP}</div>`;
  } else if(app.marking){
    h = `<p><b>Torraum:</b> Jetzt 1 Punkt im Torraum antippen.</p>
      <div class="btnrow">${btn('undo','↶ Zurück')}${btn('cancel','Abbrechen')}${FLIP}</div>`;
  } else if(wizard.phase){
    h = `<p><b>Linie ablaufen:</b> ${esc(wizard.msg)}</p>
      <div class="btnrow">${wizard.phase==='walk' ? btn('walkDone','Fertig','primaryBtn') : ''}${wizard.phase==='inside' ? btn('tapInside','Torraum antippen') : ''}${btn('wizCancel','Abbrechen')}${FLIP}</div>`;
  } else {
    const line = settings.line, cam = app.source==='cam';
    h = `<div class="sheet-h"><h3>Einrichtung</h3><button class="x" data-a="close" aria-label="Schließen">✕</button></div>
      <ul class="checks">
        <li>${icon(app.source!=='none')}<span>${cam ? 'Kamera läuft' : app.source==='file' ? 'Video geladen' : 'Kamera aus'}. Ganzer Körper und Linie im Bild?</span></li>
        <li>${icon(!!line)}<span>${line ? `6-m-Linie gesetzt (${line.pts.length} Punkte)` : '6-m-Linie fehlt'}</span></li>
      </ul>
      ${wizard.msg ? `<p class="muted">${esc(wizard.msg)}</p>` : ''}
      <div class="btnrow">${btn('wizard','Linie ablaufen')}${btn('tap','Linie antippen')}${line ? btn('clear','Löschen') : ''}</div>
      ${cam && app.state==='off' ? `<button class="wide primaryBtn" data-a="start" ${line ? '' : 'disabled'}>Training starten</button>` : ''}`;
  }
  box.innerHTML = h;
}

const ACTIONS = {
  close: hideSetup,
  start: startTraining,
  tap(){ if(app.source==='cam' && app.state!=='off') stopTraining(); wizard.msg=''; startTapMarking(); },
  wizard(){ if(app.source==='cam' && app.state!=='off') stopTraining(); startWizard(); },
  clear(){ clearLine(); },
  undo: undoPoint,
  done: finishLinePoints,
  cancel: cancelMarking,
  walkDone: finishWalkNow,
  tapInside(){ const pts = wizard.pts; stopWizard(); startTapMarking(pts, 'inside'); },
  wizCancel(){ stopWizard(); },
  flip(){ $('#stage').classList.toggle('flip'); }
};

export function initSetup(){
  onLineChange(render); onWizardChange(render);
  $('#setup').addEventListener('click', e => { const a = e.target.closest('[data-a]')?.dataset.a; if(a && ACTIONS[a]) ACTIONS[a](); });
}
