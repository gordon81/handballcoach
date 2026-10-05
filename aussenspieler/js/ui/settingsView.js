// Einstellungen: Wurfhand, Position, Ansage, Kamera, Modell und Ziel-Liste.
import { app } from '../state.js';
import { settings, store } from '../store.js';
import { $, showHint } from '../dom.js';
import { esc, colorOf } from '../../../shared/js/utils.js';
import { landmarker, ensureModel } from '../model.js';
import { startCamera } from '../source.js';
import { clearLine } from '../line.js';
import { openSheet } from './sheets.js';
import { syncMic } from '../micControl.js';
import { recDrop } from '../clips.js';
import { refreshSetup } from './setupView.js';

function renderTargets(){
  const box = $('#sTargets'); box.innerHTML = '';
  settings.targets.forEach((tg, i) => {
    const row = document.createElement('div'); row.className = 'trow';
    row.innerHTML = `<input type="checkbox" ${tg.on?'checked':''} aria-label="aktiv"><span class="dot" style="border-color:${colorOf(tg.name)}"></span><input type="text" value="${esc(tg.name)}" aria-label="Ziel-Name"><button class="x" aria-label="Entfernen">✕</button>`;
    const [cb, , tx, del] = row.children;
    cb.onchange = () => { tg.on = cb.checked; store(); };
    tx.oninput = () => { tg.name = tx.value; row.children[1].style.borderColor = colorOf(tx.value); store(); };
    del.onclick = () => { settings.targets.splice(i, 1); store(); renderTargets(); };
    box.appendChild(row);
  });
}

function showCallRows(){ document.querySelectorAll('.callOnly').forEach(el => el.hidden = settings.mode!=='call'); }

export function initSettings(){
  $('#btnSet').onclick = () => {
    $('#sHand').value = settings.hand; $('#sPos').value = settings.pos; $('#sMode').value = settings.mode; $('#sPause').value = settings.pause;
    $('#sCallDelay').value = settings.callMin===settings.callMax && [1,2,3,4,5].includes(+settings.callMin) ? String(settings.callMin) : 'r'; $('#sSens').value = settings.sens; $('#sClips').value = settings.clips ? '1' : '0'; showCallRows();
    $('#sDist').value = settings.throwDist; $('#sRing').value = String(settings.ringSize); $('#sCam').value = settings.camera; $('#sModel').value = settings.model; renderTargets(); openSheet('#setSheet');
  };
  // Wurfhand und Seite gelten auch für Startseite, Einrichtung und Anleitungsvideo.
  const whoChanged = () => document.dispatchEvent(new CustomEvent('awc:who'));
  $('#sHand').onchange = e => { settings.hand = e.target.value; store(); whoChanged(); };
  $('#sPos').onchange = e => { settings.pos = e.target.value; store(); whoChanged(); };
  $('#sMode').onchange = e => { settings.mode = e.target.value; store(); showCallRows(); syncMic(); refreshSetup(); };
  // Feste 1–5 s oder zufällig 1–5 s (gespeichert als Bereich callMin…callMax).
  $('#sCallDelay').onchange = e => { const v = e.target.value; [settings.callMin, settings.callMax] = v==='r' ? [1, 5] : [+v, +v]; store(); };
  $('#sSens').onchange = e => { settings.sens = e.target.value; store(); refreshSetup(); };
  // Videos aus: spart Rechenzeit (höhere Bildrate für die Pose-Erkennung) und Speicher.
  $('#sClips').onchange = e => { settings.clips = e.target.value==='1'; store(); if(!settings.clips) recDrop(); };
  $('#sDist').onchange = e => { settings.throwDist = Math.min(15, Math.max(3, +e.target.value || 7)); store(); };
  $('#sRing').onchange = e => { settings.ringSize = +e.target.value; store(); };
  $('#sPause').onchange = e => { settings.pause = Math.max(1, +e.target.value || 4); store(); };
  $('#sCam').onchange = async e => { settings.camera = e.target.value; store(); if(app.source==='cam'){ try{ await startCamera(); }catch(err){ showHint('Kamera-Fehler: ' + err.message, 5000); } } };
  $('#sModel').onchange = async e => { settings.model = e.target.value; store(); if(landmarker){ try{ await ensureModel(); }catch(err){ showHint('Modell-Fehler: ' + err.message, 5000); } } };
  $('#sAddT').onclick = () => { settings.targets.push({name:'Neues Ziel', on:true}); store(); renderTargets(); };
  $('#sClearLine').onclick = () => { clearLine(); showHint('Linie gelöscht', 1500); };
}
