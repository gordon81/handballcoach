// Gemeinsame Bühne der einfachen Trainings (7-m-Trainer, Abwehr): Kamera oder Demo-Stream mit KI, Bild und Overlay
// passend legen, Hinweis und große Anzeige, Skelett zeichnen. Erwartet die Elemente #stage, #video, #overlay, #empty,
// #hint und #big (siehe siebenmeter/index.html).
import { createPose } from './pose.js';

export const $ = s => document.querySelector(s);
export const video = $('#video'), canvas = $('#overlay'), ctx = canvas.getContext('2d');
export const now = () => performance.now()/1000;

let hintTimer = null;
export function hint(t, ms = 2500){ const h = $('#hint'); h.textContent = t; h.hidden = false; clearTimeout(hintTimer); if(ms) hintTimer = setTimeout(() => h.hidden = true, ms); }
export function big(text, cls = '', ms = 0){ const b = $('#big'); b.textContent = text || ''; b.className = cls; if(ms) setTimeout(() => { if(b.textContent === text) b.textContent = ''; }, ms); }

// Kamera und KI starten. demo = Modul mit startDemo() und detector (Demo-Modus) oder null. facing: 'environment' | 'user'.
// → Erkenner mit detectForVideo(video, ms).
export async function startSource(demo, {model = 'lite', facing = 'environment'} = {}){
  let pose, stream;
  if(demo){ pose = demo.detector; stream = demo.startDemo(); }
  else {
    if(!navigator.mediaDevices?.getUserMedia) throw new Error('Keine Kamera verfügbar. Die Seite muss über https geöffnet werden.');
    hint('KI-Modell wird geladen … (einmalig einige MB)', 0);
    pose = await createPose(model);
    stream = await navigator.mediaDevices.getUserMedia({audio:false, video:{facingMode:{ideal:facing}, width:{ideal:1280}, height:{ideal:720}, frameRate:{ideal:60}}});
    $('#hint').hidden = true;
  }
  video.srcObject = stream; await video.play();
  $('#empty').hidden = true; layout();
  return pose;
}
export function layout(){
  const st = $('#stage').getBoundingClientRect(), vw = video.videoWidth || 16, vh = video.videoHeight || 9;
  const s = Math.min(st.width/vw, st.height/vh), w = vw*s, h = vh*s;
  for(const el of [video, canvas]) Object.assign(el.style, {left:(st.width-w)/2+'px', top:(st.height-h)/2+'px', width:w+'px', height:h+'px'});
  if(canvas.width !== vw || canvas.height !== vh){ canvas.width = vw; canvas.height = vh; }
}
addEventListener('resize', layout); video.addEventListener('loadedmetadata', layout);

// Körperpunkte (MediaPipe-Indizes) in Pixeln; valid, wenn Rumpf und Beine sicher erkannt sind. bl = Körperlänge (Schulter–Knöchel).
const IX = {nose:0, lSh:11, rSh:12, lEl:13, rEl:14, lWr:15, rWr:16, lHip:23, rHip:24, lAnk:27, rAnk:28, lHeel:29, rHeel:30, lToe:31, rToe:32};
export function bodyPoints(lm){
  const W = canvas.width, H = canvas.height, p = {};
  for(const k in IX){ const q = lm[IX[k]]; p[k] = {x:q.x*W, y:q.y*H, v:q.visibility ?? 1}; }
  const mid = (a, b) => ({x:(a.x+b.x)/2, y:(a.y+b.y)/2});
  p.sh = mid(p.lSh, p.rSh); p.hip = mid(p.lHip, p.rHip); p.ank = mid(p.lAnk, p.rAnk);
  p.bl = Math.hypot(p.sh.x - p.ank.x, p.sh.y - p.ank.y);
  p.valid = Math.min(p.lHip.v, p.rHip.v, p.lAnk.v, p.rAnk.v, p.lSh.v, p.rSh.v) > 0.35 && p.bl > 20;
  return p;
}

const BONES = [[11,12],[11,13],[13,15],[12,14],[14,16],[11,23],[12,24],[23,24],[23,25],[25,27],[24,26],[26,28],[27,29],[29,31],[27,31],[28,30],[30,32],[28,32]];
export function drawSkeleton(lm, color){
  const W = canvas.width, H = canvas.height; ctx.strokeStyle = color; ctx.lineWidth = Math.max(2, W/350);
  for(const [a, b] of BONES){ const p = lm[a], q = lm[b]; ctx.beginPath(); ctx.moveTo(p.x*W, p.y*H); ctx.lineTo(q.x*W, q.y*H); ctx.stroke(); }
}
// Bedienung der Ausklapp-Fenster (✕ oder Tippen auf den dunklen Rand schließt).
export function initSheets(){ document.querySelectorAll('.sheet').forEach(s => s.addEventListener('click', e => { if(e.target===s || e.target.hasAttribute('data-close')) s.hidden = true; })); }
