// 6-m-Linie: markieren, als Kurve darstellen und prüfen, ob ein Punkt im Torraum liegt.
// Die 6-m-Linie ist ein Bogen (Viertelkreise um die Pfosten + 3 m gerade). Im Bild wird sie
// als glatte Kurve durch beliebig viele angetippte Punkte (Catmull-Rom) nachgebildet.
import { app } from './state.js';
import { settings, store } from './store.js';
import { $, video, canvas } from './dom.js';
import { snapLine, simplify } from './lineDetect.js';
import { makeRef } from './camCheck.js';

// Altes Format {a, b, inside} (gerade Linie aus 2 Punkten) übernehmen.
if(settings.line && settings.line.a) settings.line = {pts:[settings.line.a, settings.line.b], inside:settings.line.inside};

export function curve(pts){
  if(pts.length < 3) return pts.slice();
  const out = [], n = pts.length, P = i => pts[Math.max(0, Math.min(n-1, i))];
  for(let i=0; i<n-1; i++){
    const p0=P(i-1), p1=P(i), p2=P(i+1), p3=P(i+2);
    for(let k=0; k<8; k++){
      const t=k/8, t2=t*t, t3=t2*t;
      const f = (a,b,c,d) => 0.5*(2*b + (c-a)*t + (2*a-5*b+4*c-d)*t2 + (3*b-a-3*c+d)*t3);
      out.push({x:f(p0.x,p1.x,p2.x,p3.x), y:f(p0.y,p1.y,p2.y,p3.y)});
    }
  }
  out.push(pts[n-1]); return out;
}
function lineSide(c, p){
  // Seite relativ zum nächstgelegenen Kurvenstück; Endstücke gelten als verlängert.
  const ar = canvas.width && canvas.height ? canvas.width/canvas.height : 1;
  let best = Infinity, s = 0;
  for(let i=0; i<c.length-1; i++){
    const a=c[i], b=c[i+1], dx=(b.x-a.x)*ar, dy=b.y-a.y, L=dx*dx+dy*dy || 1e-12;
    let t = ((p.x-a.x)*ar*dx + (p.y-a.y)*dy) / L;
    if(i>0) t = Math.max(0, t); if(i<c.length-2) t = Math.min(1, t);
    const qx=(a.x-p.x)*ar + t*dx, qy=a.y-p.y + t*dy, d=qx*qx+qy*qy;
    if(d < best){ best = d; s = Math.sign(dx*(p.y-a.y) - dy*(p.x-a.x)*ar); }
  }
  return s;
}
// p in normierten Koordinaten (0–1). null, wenn keine Linie markiert ist.
export function inTorraum(p){
  const l=settings.line; if(!l) return null;
  const c = curve(l.pts), s = lineSide(c, p);
  return s===lineSide(c, l.inside) || s===0;
}
export function lineCenter(l){ return {x:l.pts.reduce((a,p)=>a+p.x,0)/l.pts.length, y:l.pts.reduce((a,p)=>a+p.y,0)/l.pts.length}; }

/* ---------- Antippen ---------- */
let listener = () => {};
export function onLineChange(fn){ listener = fn; }

// meta: snapped (am Boden eingerastet), ref (Referenzbild für den Kamera-Check, sonst aktuelles Bild).
export function saveLine(pts, inside, meta = {}){
  settings.line = {pts, inside, at:Date.now(), snapped:false, ...meta};
  if(!settings.line.ref) settings.line.ref = makeRef();
  store(); listener();
}
export function clearLine(){ settings.line = null; store(); listener(); }

// Antippen starten; optional mit schon vorhandenen Punkten (z. B. vom Ablaufen).
export function startTapMarking(points = [], step = 'line'){
  if(app.source==='file') video.pause();
  app.marking = points.slice(); app.markStep = step;
  $('#stage').classList.add('marking'); $('#card').style.display = 'none';
  listener();
}
export function finishLinePoints(){ if(app.marking?.length >= 2){ app.markStep = 'inside'; listener(); } }
// Letzten Punkt zurücknehmen; im Torraum-Schritt zurück zu den Linienpunkten.
export function undoPoint(){
  if(!app.marking) return;
  if(app.markStep==='inside') app.markStep = 'line'; else app.marking.pop();
  listener();
}
export function cancelMarking(){ app.marking=null; app.markStep=null; $('#stage').classList.remove('marking'); listener(); }

export function initLineMarking(){
  canvas.addEventListener('pointerdown', e => {
    if(!app.marking) return;
    const r = canvas.getBoundingClientRect(), p = {x:(e.clientX-r.left)/r.width, y:(e.clientY-r.top)/r.height};
    if(app.markStep==='inside'){
      // Angetippte Punkte auf den gemalten Strich in der Nähe einrasten, wenn er sicher gefunden wird.
      const pts = app.marking, sn = snapLine(pts, 0.03), sp = sn ? simplify(sn.pts, canvas.width/canvas.height) : [];
      cancelMarking(); saveLine(sp.length >= 2 ? sp : pts, p, {snapped:sp.length >= 2}); return;
    }
    app.marking.push(p); listener();
  });
}
