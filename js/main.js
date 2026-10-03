// Einstieg: Bedienung verbinden und Hauptschleife starten (ein KI-Durchlauf pro Videobild).
import { app } from './state.js';
import { $, video } from './dom.js';
import { landmarker } from './model.js';
import { keepAwake } from './wakelock.js';
import { processFrame } from './tracking.js';
import { wizardFrame } from './lineWizard.js';
import { initLineMarking } from './line.js';
import { draw } from './draw.js';
import { initSheets } from './ui/sheets.js';
import { initControls } from './ui/controls.js';
import { initSettings } from './ui/settingsView.js';
import { initSetup } from './ui/setupView.js';
import { DEMO } from './config.js';

initLineMarking();
initSheets();
initControls();
initSettings();
initSetup();
if(DEMO){ const a = $('#demoLink'); a.textContent = 'Demo-Modus aktiv: „Start“ drücken. Hier zurück zur echten Kamera.'; a.href = './'; }
document.addEventListener('visibilitychange', () => { if(document.visibilityState==='visible' && app.state!=='off') keepAwake(); });

let fpsN = 0, fpsT0 = performance.now(), lastVT = -1;
function loop(){
  requestAnimationFrame(loop);
  if(app.source==='none' || !landmarker || video.readyState < 2){ draw(); return; }
  const vt = video.currentTime;
  if(app.source==='file' && vt===lastVT) return;
  lastVT = vt;
  const pn = performance.now();
  let res = null; try{ res = landmarker.detectForVideo(video, pn); }catch(e){ console.warn(e); }
  const t = app.source==='file' ? vt : pn/1000;
  processFrame(res, t);
  wizardFrame(app.latest, t);
  draw();
  fpsN++; if(pn - fpsT0 > 1000){ $('#fps').textContent = Math.round(fpsN*1000/(pn-fpsT0)) + ' fps'; fpsN = 0; fpsT0 = pn; }
  if(app.source==='file' && video.duration) $('#fSeek').value = Math.round(vt/video.duration*1000);
}
requestAnimationFrame(loop);
