// Hat sich die Kamera seit der Einrichtung bewegt? Beim Speichern der Linie wird ein kleines
// Graubild als Referenz abgelegt. Später wird das aktuelle Bild dagegen verschoben, bis die Kanten
// am besten passen. Verschoben: Linie mitschieben und am Boden neu einrasten.
import { settings } from './store.js';
import { canvas } from './dom.js';
import { grabFrame, snapLine, simplify } from './lineDetect.js';
import { saveLine } from './line.js';

const RW = 160;

// Kleines Graubild (160 px breit) aus einem Analysebild.
function gray(img){
  const f = img.w/RW, RH = Math.round(img.h/f), g = new Uint8Array(RW*RH);
  for(let y=0; y<RH; y++) for(let x=0; x<RW; x++){
    let s = 0, c = 0;
    for(let yy=Math.floor(y*f); yy<Math.floor((y+1)*f); yy++) for(let xx=Math.floor(x*f); xx<Math.floor((x+1)*f); xx++){
      const o = (yy*img.w+xx)*4; s += img.d[o]*0.3 + img.d[o+1]*0.59 + img.d[o+2]*0.11; c++;
    }
    g[y*RW+x] = c ? s/c : 0;
  }
  return {w:RW, h:RH, g};
}
export function makeRef(img = grabFrame()){
  if(!img) return null;
  const r = gray(img); let s = '';
  for(let i=0; i<r.g.length; i++) s += String.fromCharCode(r.g[i]);
  return {w:r.w, h:r.h, g:btoa(s)};
}
function loadRef(ref){
  const s = atob(ref.g), g = new Uint8Array(s.length);
  for(let i=0; i<s.length; i++) g[i] = s.charCodeAt(i);
  return {w:ref.w, h:ref.h, g};
}
// Kantenstärke, leicht weichgezeichnet (Holzmaserung und Rauschen sollen nicht zählen).
function grad({w, h, g}){
  const G = new Float32Array(w*h), B = new Float32Array(w*h);
  for(let y=1; y<h-1; y++) for(let x=1; x<w-1; x++){ const i = y*w+x; G[i] = Math.abs(g[i+1]-g[i-1]) + Math.abs(g[i+w]-g[i-w]); }
  for(let y=1; y<h-1; y++) for(let x=1; x<w-1; x++){ const i = y*w+x; let s = 0; for(let k=-1; k<=1; k++) s += G[i+k*w-1] + G[i+k*w] + G[i+k*w+1]; B[i] = s/9; }
  return B;
}

// Beste Verschiebung (dx, dy in Pixeln des kleinen Bildes): aktuelles Bild an (x+dx, y+dy) = Referenz an (x, y).
function bestShift(A, B, w, h){
  const MX = 20, MY = 12, cost = (dx, dy) => {
    let s = 0, n = 0;
    for(let y=MY+1; y<h-MY-1; y+=1) for(let x=MX+1; x<w-MX-1; x+=1){ s += Math.abs(A[y*w+x] - B[(y+dy)*w+x+dx]); n++; }
    return s/n;
  };
  const c0 = cost(0, 0); let best = {dx:0, dy:0, c:c0};
  for(let dy=-MY; dy<=MY; dy++) for(let dx=-MX; dx<=MX; dx++){ const c = cost(dx, dy); if(c < best.c) best = {dx, dy, c}; }
  return {...best, c0};
}

// Ergebnis: {status:'none'|'ok'|'adjusted'|'moved'}. 'adjusted' = Linie automatisch neu ausgerichtet,
// 'moved' = Kamera bewegt, aber Linie nicht sicher wiedergefunden (neu einrichten).
export function checkCamera(){
  const l = settings.line; if(!l?.ref) return {status:'none'};
  const img = grabFrame(); if(!img) return {status:'none'};
  const ref = loadRef(l.ref), cur = gray(img);
  if(cur.w!==ref.w || cur.h!==ref.h) return {status:'moved'};
  const Gr = grad(ref), s = bestShift(Gr, grad(cur), ref.w, ref.h);
  let mean = 0; for(const v of Gr) mean += v; mean /= Gr.length;
  // Gleiche Kamera: Unterschied nur durch Rauschen und die Person (klein gegenüber der Kantenstärke).
  if(s.c0 < 0.4*mean) return {status:'ok', ...s};
  // Linie und Torraum-Punkt um die geschätzte Verschiebung mitschieben, dann am Boden neu einrasten.
  const ar = canvas.width/canvas.height;
  let best = null;
  for(const [dx, dy] of [[s.dx, s.dy], [0, 0]]){
    const mv = p => ({x:p.x + dx/ref.w, y:p.y + dy/ref.h});
    const sn = snapLine(l.pts.map(mv), 0.06, img);
    if(sn && (!best || sn.conf > best.sn.conf)) best = {sn, inside:mv(l.inside)};
  }
  const np = best ? simplify(best.sn.pts, ar) : [];
  if(np.length >= 2){ saveLine(np, best.inside, {snapped:true, ref:makeRef(img)}); return {status:'adjusted', ...s}; }
  return {status:'moved', ...s};
}
