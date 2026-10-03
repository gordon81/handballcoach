// Einrichtung vor dem Training: Kamera prüfen, 6-m-Linie ablaufen oder antippen, dann starten.
// Gibt es schon eine Linie, wird sie angeboten; hat sich die Kamera bewegt, wird neu justiert.
import { app } from '../state.js';
import { settings, store, ensureSession } from '../store.js';
import { $, showHint } from '../dom.js';
import { esc, fmtDate } from '../utils.js';
import { say, beep, unlockBeep } from '../speech.js';
import { syncMic, micUse } from '../micControl.js';
import { mic, onShout } from '../shout.js';
import { keepAwake, releaseWake } from '../wakelock.js';
import { ensureModel } from '../model.js';
import { startCamera, curT } from '../source.js';
import { setState, hudTarget } from '../tracking.js';
import { onLineChange, startTapMarking, finishLinePoints, undoPoint, cancelMarking, clearLine } from '../line.js';
import { wizard, onWizardChange, startWizard, stopWizard, finishWalkNow } from '../lineWizard.js';
import { checkCamera } from '../camCheck.js';

let visible = false, cam = null;   // cam = letztes Ergebnis des Kamera-Checks
let micHits = 0;                   // erkannte Rufe beim Mikro-Test

// Kamera mit dem Bild von der Einrichtung vergleichen; bewegt → Linie neu ausrichten oder neu einrichten lassen.
function runCamCheck(){
  if(app.source!=='cam' || !settings.line) { cam = null; return null; }
  cam = checkCamera();
  if(cam.status==='adjusted'){ showHint('Kamera hat sich bewegt. Linie neu ausgerichtet, bitte prüfen.', 4500); say('Die Kamera hat sich bewegt. Ich habe die Linie neu ausgerichtet. Bitte prüfen.'); }
  else if(cam.status==='moved'){ showHint('Kamera hat sich bewegt. Bitte die Linie neu einrichten.', 4500); say('Die Kamera hat sich bewegt. Bitte die Linie neu einrichten.'); }
  return cam;
}
const frameReady = () => new Promise(r => setTimeout(r, 800));   // erstes Kamerabild abwarten

export function setRunning(on){ const b=$('#btnStart'); b.textContent = on ? 'Stopp' : 'Start'; b.classList.toggle('running', on); }

// Erster Schritt: Kamera und KI laden, Einrichtung zeigen. Training startet erst danach.
export async function openSetup(){
  if(app.source==='none') say('Einrichtung');   // Sprachausgabe im Klick freischalten
  try{
    await ensureModel();
    const fresh = app.source==='none';
    if(fresh) await startCamera();
    showSetup(false);
    if(fresh && settings.line){
      await frameReady();
      if(runCamCheck()?.status==='ok'){ showHint('Linie von der letzten Einrichtung gefunden, Kamera steht gleich. Du kannst direkt starten.', 4500); say('Linie von der letzten Einrichtung gefunden.'); }
      render();
    }
  }catch(e){ console.error(e); showHint('Start fehlgeschlagen: ' + (e.message || e), 7000); }
}
export function startTraining(){
  if(app.source==='cam' && !settings.line){ showSetup(); showHint('Erst die 6-m-Linie einrichten', 2500); return; }
  if(app.source==='cam' && !app.marking && !wizard.phase){
    const prev = cam?.status, c = runCamCheck();
    // Erst prüfen lassen. Wer „bewegt“ schon gesehen hat und trotzdem startet, darf (z. B. nur Licht anders).
    if(c && (c.status==='adjusted' || (c.status==='moved' && prev!=='moved'))){ showSetup(false); return; }
  }
  cancelMarking(); stopWizard(); hideSetup();
  say('Los geht’s'); unlockBeep(); ensureSession(); setState('ready', curT()); setRunning(true); keepAwake(); syncMic();
}
export function stopTraining(){ setState('off', curT()); app.target=null; hudTarget(null); setRunning(false); releaseWake(); syncMic(); }

export function showSetup(check = true){
  const open = visible; visible = true;
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
    const line = settings.line, isCam = app.source==='cam';
    const how = line ? (line.snapped ? 'am Boden erkannt' : 'aus Fußpunkten/angetippt') + (line.at ? `, ${fmtDate(new Date(line.at))}` : '') : '';
    const camLine = !line || !cam ? '' : cam.status==='ok' ? `<li>${icon(true)}<span>Kamera steht wie bei der Einrichtung</span></li>`
      : cam.status==='adjusted' ? `<li><span class="ic mid">!</span><span>Kamera hat sich bewegt: Linie neu ausgerichtet. Passt die rote Linie?</span></li>`
      : cam.status==='moved' ? `<li><span class="ic bad">✗</span><span>Kamera hat sich bewegt: Linie bitte neu ablaufen oder antippen.</span></li>` : '';
    h = `<div class="sheet-h"><h3>Einrichtung</h3><button class="x" data-a="close" aria-label="Schließen">✕</button></div>
      <ul class="checks">
        <li>${icon(app.source!=='none')}<span>${isCam ? 'Kamera läuft' : app.source==='file' ? 'Video geladen' : 'Kamera aus'}. Ganzer Körper und Linie im Bild?</span></li>
        <li>${icon(!!line)}<span>${line ? `6-m-Linie gesetzt (${line.pts.length} Punkte, ${how})` : '6-m-Linie fehlt'}</span></li>
        ${camLine}
      </ul>
      ${wizard.msg ? `<p class="muted">${esc(wizard.msg)}</p>` : ''}
      <div class="btnrow">${btn('wizard','Linie ablaufen')}${btn('tap','Linie antippen')}${line ? btn('fix','Korrigieren') + btn('clear','Löschen') : ''}</div>
      ${isCam && settings.mode==='call' ? micBlock() : ''}
      ${isCam && app.state==='off' ? `<button class="wide primaryBtn" data-a="start" ${line ? '' : 'disabled'}>${line && cam?.status==='ok' ? 'Mit dieser Linie starten' : 'Training starten'}</button>` : ''}`;
  }
  box.innerHTML = h;
}

const ACTIONS = {
  close: hideSetup,
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
  micTest(){ micUse.test = !micUse.test; micHits = 0; syncMic().then(render); render(); },
  sens(el){ settings.sens = el.dataset.v; store(); render(); }
};

export function initSetup(){
  onLineChange(render); onWizardChange(render);
  $('#setup').addEventListener('click', e => { const el = e.target.closest('[data-a]'), a = el?.dataset.a; if(a && ACTIONS[a]) ACTIONS[a](el); });
  // Mikro-Test: erkannter Ruf mit Piep quittieren (im Training macht das tracking.js).
  onShout(() => { if(micUse.test && app.state==='off'){ micHits++; beep(); render(); } });
}
