// Videoquelle: Live-Kamera oder geladene Videodatei, plus Bildgröße/Overlay-Layout.
import { app } from './state.js';
import { settings } from './store.js';
import { $, video, canvas } from './dom.js';
import { resetTracking } from './tracking.js';

let stream = null, fileURL = null;

export async function startCamera(){
  stopSource();
  if(!navigator.mediaDevices?.getUserMedia) throw new Error('Keine Kamera verfügbar. Die Seite muss über https geöffnet werden.');
  stream = await navigator.mediaDevices.getUserMedia({audio:false, video:{facingMode:{ideal:settings.camera}, width:{ideal:1280}, height:{ideal:720}, frameRate:{ideal:60}}});
  video.srcObject = stream; app.source = 'cam';
  await video.play(); afterSource();
}
export function loadFile(file){
  stopSource();
  fileURL = URL.createObjectURL(file); app.source = 'file';
  video.src = fileURL; video.loop = false;
  video.addEventListener('loadeddata', () => { afterSource(); }, {once:true});
}
function stopSource(){
  if(stream){ stream.getTracks().forEach(t=>t.stop()); stream=null; }
  video.pause(); video.srcObject = null;
  if(fileURL){ video.removeAttribute('src'); video.load(); URL.revokeObjectURL(fileURL); fileURL=null; }
  app.source = 'none';
}
function afterSource(){
  $('#empty').hidden = true;
  $('#filebar').hidden = app.source !== 'file';
  video.playbackRate = app.source==='file' ? +$('#fRate').value : 1;
  layout(); resetTracking(curT());
}
// Zeitbasis: Videozeit bei Dateien, sonst Echtzeit.
export function curT(){ return app.source==='file' ? video.currentTime : performance.now()/1000; }

// Video und Canvas gleich groß und zentriert in die Bühne legen.
function layout(){
  const st = $('#stage').getBoundingClientRect();
  const vw = video.videoWidth || 16, vh = video.videoHeight || 9;
  const s = Math.min(st.width/vw, st.height/vh);
  const w = vw*s, h = vh*s, x = (st.width-w)/2, y = (st.height-h)/2;
  for(const el of [video, canvas]){ Object.assign(el.style, {left:x+'px', top:y+'px', width:w+'px', height:h+'px'}); }
  if(canvas.width!==vw || canvas.height!==vh){ canvas.width = vw; canvas.height = vh; }
}
window.addEventListener('resize', layout);
video.addEventListener('loadedmetadata', layout);
