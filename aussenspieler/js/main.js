// Einstieg: Bedienung verbinden und Hauptschleife starten (ein KI-Durchlauf pro Videobild).
import { app } from './state.js';
import { $, video } from './dom.js';
import { landmarker } from './model.js';
import { keepAwake } from '../../shared/js/wakelock.js';
import { processFrame, heardCall } from './tracking.js';
import { onShout } from './shout.js';
import { recFrame } from './clips.js';
import { ringFrame } from './rings.js';
import { initClipView } from './ui/clipView.js';
import { initMicMeter } from './ui/micMeter.js';
import { wizardFrame } from './lineWizard.js';
import { initLineMarking } from './line.js';
import { draw } from './draw.js';
import { initSheets } from './ui/sheets.js';
import { initControls } from './ui/controls.js';
import { initSettings } from './ui/settingsView.js';
import { initSetup } from './ui/setupView.js';
import { initFlow } from './ui/startView.js';
import { DEMO, RR, TXT } from './config.js';

initLineMarking();
initSheets();
initControls();
initSettings();
initSetup();
initFlow();
initClipView();
initMicMeter();
onShout(heardCall);
// Rückraum-Modus: Startseite und Einstellungen umbeschriften (gleiche App, eigener Speicher).
if(RR){
  document.title = TXT.app; document.body.classList.add('rr');
  $('#empty h1').innerHTML = `${TXT.app}<span>${TXT.sub}</span>`;
  $('#demoLink').href = '?rr=1&demo=1';
  $('#sPos').closest('label').hidden = true;
  $('#sClearLine').textContent = '9-m-Linie löschen';
  $('#howTo').textContent = 'Absprung: Fußspitze oder Ferse des Sprungbeins beim letzten Bodenkontakt vor (außerhalb) der markierten 9-m-Linie. Sprungbein: Rechtshänder links, Linkshänder rechts. Schritte: Bodenkontakte vom Anlauf bis zum Absprung, Ziel drei. Wurfarm beim Absprung über dem Kopf. Abwurf höchstens 0,15 s vom höchsten Punkt der Hüfte. Sprunghöhe und Oberkörper sind Schätzungen aus einer Kamera.';
}
if(DEMO){ const a = $('#demoLink'); a.textContent = 'Demo-Modus aktiv: „Start“ drücken. Hier zurück zur echten Kamera.'; a.href = RR ? './?rr=1' : './'; }
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
  recFrame();
  if(app.source==='cam') ringFrame(t);
  fpsN++; if(pn - fpsT0 > 1000){ $('#fps').textContent = Math.round(fpsN*1000/(pn-fpsT0)) + ' fps'; fpsN = 0; fpsT0 = pn; }
  if(app.source==='file' && video.duration) $('#fSeek').value = Math.round(vt/video.duration*1000);
}
requestAnimationFrame(loop);
