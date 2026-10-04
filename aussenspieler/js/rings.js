// Treffererkennung im Außenwurf-Coach (C1): Ringe im Bild antippen (nur Kameraposition 2, Tor im Bild), pro Videobild
// kleine Graubild-Ausschnitte um jeden Ring sammeln und nach dem Wurf auswerten (shared/js/hitDetect.js).
// Dazu die Wurfgeschwindigkeit (B7) aus Abwurf und Ankunft am Ring und der eingestellten Wurfentfernung.
import { app } from './state.js';
import { settings, store } from './store.js';
import { video, canvas } from './dom.js';
import { detectHit, speedKmh, TH_HIT } from '../../shared/js/hitDetect.js';

const AW = 640;   // Breite des Analysebilds
const cv = document.createElement('canvas'), g = cv.getContext('2d', {willReadFrequently:true});
let buf = {};     // Ring-Name → [{t, px}]
let listener = () => {};
export function onRingsChange(fn){ listener = fn; }

// Ringe der aktuellen Kameraposition: [{name, x, y}] normiert (0–1). Nur Position 2 hat das Tor im Bild.
export const rings = () => settings.camPos === 'court' ? (settings.rings?.court || []) : [];
export const ringsOn = () => app.source === 'cam' && rings().length > 0;
// Ring-Radius als Anteil der Bildhöhe (Einstellung, Standard 0,02 ≈ 15 px bei 720p).
const R = () => +settings.ringSize || 0.02;

/* ---------- Antippen ---------- */
// Nacheinander die Mitte jedes aktiven Ziels antippen. „Überspringen“, wenn ein Ring nicht im Bild ist.
export function startRingMarking(){
  const names = settings.targets.filter(x => x.on && x.name.trim()).map(x => x.name);
  app.ringMark = {names, pts:[]}; listener();
}
export function ringTap(p){
  const m = app.ringMark; if(!m) return;
  m.pts.push({name:m.names[m.pts.length], x:p.x, y:p.y});
  if(m.pts.length >= m.names.length) finishRings(); else listener();
}
export function ringSkip(){ const m = app.ringMark; if(!m) return; m.pts.push(null); if(m.pts.length >= m.names.length) finishRings(); else listener(); }
export function ringUndo(){ const m = app.ringMark; if(m?.pts.length){ m.pts.pop(); listener(); } }
export function cancelRings(){ app.ringMark = null; listener(); }
function finishRings(){
  settings.rings = {...settings.rings, court:app.ringMark.pts.filter(Boolean)};
  app.ringMark = null; buf = {}; store(); listener();
}
export function clearRings(){ settings.rings = {...settings.rings, court:[]}; store(); listener(); }
canvas.addEventListener('pointerdown', e => {
  if(!app.ringMark) return;
  const r = canvas.getBoundingClientRect(); ringTap({x:(e.clientX - r.left)/r.width, y:(e.clientY - r.top)/r.height});
});

/* ---------- Sammeln ---------- */
// Pro Videobild aus der Hauptschleife.
export function ringFrame(t){
  if(!ringsOn() || !video.videoWidth) return;
  const ah = Math.round(AW*video.videoHeight/video.videoWidth);
  if(cv.width !== AW || cv.height !== ah){ cv.width = AW; cv.height = ah; }
  g.drawImage(video, 0, 0, AW, ah);
  const size = Math.max(7, Math.round(2*R()*ah) | 1);
  for(const ring of rings()){
    const x0 = Math.round(ring.x*AW - size/2), y0 = Math.round(ring.y*ah - size/2);
    const d = g.getImageData(x0, y0, size, size).data, px = new Uint8Array(size*size);
    for(let i = 0; i < px.length; i++) px[i] = (d[i*4]*77 + d[i*4+1]*150 + d[i*4+2]*29) >> 8;
    const a = (buf[ring.name] ||= []); a.push({t, px, size});
    while(a.length && t - a[0].t > 2.5) a.shift();
  }
}

/* ---------- Auswerten ---------- */
// Nach dem Wurf (tRelease = Abwurf-Zeit), wenn das Suchfenster vorbei ist. → {ring, flight, speed, scores} oder null.
export function evalHit(tRelease){
  if(!ringsOn()) return null;
  const list = rings().map(r => ({name:r.name, size:buf[r.name]?.at(-1)?.size || 7, samples:buf[r.name] || []}));
  const res = detectHit(list, tRelease, TH_HIT);
  const flight = res.t != null ? Math.round((res.t - tRelease)*100)/100 : null;
  return {...res, flight, speed:flight != null ? speedKmh(+settings.throwDist || 7, flight) : null};
}
export const HIT_WAIT = TH_HIT.after[1];   // so lange nach dem Abwurf warten, bis ausgewertet wird

/* ---------- Zeichnen ---------- */
export function drawRings(ctx, W, H, lw){
  const list = app.ringMark ? app.ringMark.pts.filter(Boolean) : rings();
  for(const r of list){
    ctx.strokeStyle = /blau/i.test(r.name) ? '#3d8bff' : '#ff8a1f'; ctx.lineWidth = lw;
    ctx.beginPath(); ctx.arc(r.x*W, r.y*H, R()*H*1.0, 0, 7); ctx.stroke();
    ctx.fillStyle = ctx.strokeStyle; ctx.font = `600 ${lw*5}px Barlow, sans-serif`; ctx.fillText(r.name, r.x*W + R()*H + lw, r.y*H);
  }
}
