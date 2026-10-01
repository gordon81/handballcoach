// Button-Leiste (Start, Linie, Ansage, Video, Log), Video-Leiste und Training-Fenster.
import { app } from '../state.js';
import { settings, ensureSession, clearLog } from '../store.js';
import { $, video, showHint } from '../dom.js';
import { say } from '../speech.js';
import { keepAwake, releaseWake } from '../wakelock.js';
import { ensureModel } from '../model.js';
import { startCamera, loadFile, curT } from '../source.js';
import { setState, hudTarget, announce } from '../tracking.js';
import { onLineButton, cancelMarking } from '../line.js';
import { shareText, shareFile } from '../report.js';
import { renderLog } from './logView.js';
import { openSheet } from './sheets.js';

function setRunning(on){ const b=$('#btnStart'); b.textContent = on ? 'Stopp' : 'Start'; b.classList.toggle('running', on); }

export function initControls(){
  /* Button-Leiste */
  $('#btnStart').onclick = async () => {
    if(app.state !== 'off'){ setState('off', curT()); app.target=null; hudTarget(null); setRunning(false); releaseWake(); return; }
    say('Los geht’s');
    try{
      await ensureModel();
      if(app.source==='none') await startCamera();
      ensureSession(); setState('ready', curT()); setRunning(true); keepAwake();
      if(app.source==='cam' && !settings.line) showHint('Tipp: Mit „Linie“ die 6-m-Linie markieren', 4000);
    }catch(e){ console.error(e); showHint('Start fehlgeschlagen: ' + (e.message || e), 7000); }
  };
  $('#btnLine').onclick = onLineButton;
  $('#btnCall').onclick = () => {
    if(app.source!=='cam' || app.state==='off'){ showHint('Ansagen gibt es im Kamera-Modus nach Start', 2500); return; }
    if(app.state!=='air') announce(curT());
  };
  $('#btnVideo').onclick = () => $('#file').click();
  $('#file').onchange = async e => {
    const f = e.target.files[0]; if(!f) return;
    try{ await ensureModel(); ensureSession(); loadFile(f); setState('ready', 0); setRunning(true); showHint('Video geladen. Mit ▶︎ abspielen, Linie bei Bedarf markieren.', 3500); }
    catch(err){ showHint('Fehler: ' + (err.message || err), 6000); }
    e.target.value = '';
  };

  /* Video-Leiste */
  $('#fPlay').onclick = () => { if(video.paused){ cancelMarking(); video.play(); } else video.pause(); };
  video.addEventListener('play', () => $('#fPlay').textContent = '❚❚');
  video.addEventListener('pause', () => $('#fPlay').textContent = '▶︎');
  $('#fBack').onclick = () => { video.currentTime = Math.max(0, video.currentTime - 2); };
  $('#fRate').onchange = e => { video.playbackRate = +e.target.value; };
  $('#fSeek').oninput = e => { if(video.duration) video.currentTime = e.target.value/1000*video.duration; };
  $('#fCam').onclick = async () => { try{ await startCamera(); if(app.state!=='off') setState('ready', curT()); }catch(e){ showHint('Kamera-Fehler: ' + (e.message||e), 6000); } };

  /* Training-Fenster */
  $('#btnLog').onclick = () => { renderLog(); openSheet('#logSheet'); };
  $('#logClear').onclick = () => { if(confirm('Alle Würfe aller Trainings löschen?')){ clearLog(); renderLog(); } };
  $('#repShare').onclick = shareText;
  $('#repFile').onclick = shareFile;
  $('#newSession').onclick = () => { if(confirm('Neues Training starten? Das aktuelle bleibt im Speicher.')){ ensureSession(true); renderLog(); showHint('Neues Training gestartet', 1800); } };
}
