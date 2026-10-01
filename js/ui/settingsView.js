// Einstellungen: Wurfhand, Position, Ansage, Kamera, Modell und Ziel-Liste.
import { app } from '../state.js';
import { settings, store } from '../store.js';
import { $, showHint } from '../dom.js';
import { esc, colorOf } from '../utils.js';
import { landmarker, ensureModel } from '../model.js';
import { startCamera } from '../source.js';
import { clearLine } from '../line.js';
import { openSheet } from './sheets.js';

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

export function initSettings(){
  $('#btnSet').onclick = () => {
    $('#sHand').value = settings.hand; $('#sPos').value = settings.pos; $('#sMode').value = settings.mode; $('#sPause').value = settings.pause;
    $('#sCam').value = settings.camera; $('#sModel').value = settings.model; renderTargets(); openSheet('#setSheet');
  };
  $('#sHand').onchange = e => { settings.hand = e.target.value; store(); };
  $('#sPos').onchange = e => { settings.pos = e.target.value; store(); };
  $('#sMode').onchange = e => { settings.mode = e.target.value; store(); };
  $('#sPause').onchange = e => { settings.pause = Math.max(1, +e.target.value || 4); store(); };
  $('#sCam').onchange = async e => { settings.camera = e.target.value; store(); if(app.source==='cam'){ try{ await startCamera(); }catch(err){ showHint('Kamera-Fehler: ' + err.message, 5000); } } };
  $('#sModel').onchange = async e => { settings.model = e.target.value; store(); if(landmarker){ try{ await ensureModel(); }catch(err){ showHint('Modell-Fehler: ' + err.message, 5000); } } };
  $('#sAddT').onclick = () => { settings.targets.push({name:'Neues Ziel', on:true}); store(); renderTargets(); };
  $('#sClearLine').onclick = clearLine;
}
