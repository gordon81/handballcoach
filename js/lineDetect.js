// 6-m-Linie im Kamerabild finden. Die abgelaufenen (oder angetippten) Punkte geben die ungefähre
// Lage vor; in einem schmalen Streifen quer dazu wird der gemalte Strich gesucht (Streifen, der sich
// zu beiden Seiten vom Boden abhebt) und die Linie darauf eingerastet. Ohne sicheren Treffer: null.
import { video } from './dom.js';
import { curve } from './line.js';

const AW = 640;   // Analysebreite in Pixeln
let fc = null;

// Aktuelles Videobild verkleinert als RGBA-Pixel {w, h, d}.
export function grabFrame(){
  const vw = video.videoWidth, vh = video.videoHeight;
  if(!vw || !vh || video.readyState < 2) return null;
  const w = AW, h = Math.round(AW*vh/vw);
  if(!fc) fc = document.createElement('canvas');
  if(fc.width!==w || fc.height!==h){ fc.width = w; fc.height = h; }
  const c = fc.getContext('2d', {willReadFrequently:true});
  c.drawImage(video, 0, 0, w, h);
  return {w, h, d:c.getImageData(0, 0, w, h).data};
}

// Pixelweiser Median mehrerer Bilder: die Person, die durchs Bild läuft, verschwindet.
export function medianFrame(fs){
  fs = fs.filter(f => f && f.w===fs[0]?.w && f.h===fs[0]?.h);
  if(fs.length < 3) return fs.at(-1) || null;
  const n = fs.length, out = new Uint8ClampedArray(fs[0].d.length), v = new Array(n);
  for(let i=0; i<out.length; i++){
    for(let k=0; k<n; k++) v[k] = fs[k].d[i];
    v.sort((a,b) => a-b); out[i] = v[n>>1];
  }
  return {w:fs[0].w, h:fs[0].h, d:out};
}

// Punkte entlang einer Kurve in festen Pixel-Abständen.
function resample(c, step){
  const out = [c[0]]; let carry = 0;
  for(let i=1; i<c.length; i++){
    const a = c[i-1], b = c[i], L = Math.hypot(b.x-a.x, b.y-a.y);
    let s = step - carry;
    while(s <= L){ out.push({x:a.x+(b.x-a.x)*s/L, y:a.y+(b.y-a.y)*s/L}); s += step; }
    carry = L - (s - step);
  }
  return out;
}

// pts normiert (0–1), band = Suchbreite zu jeder Seite in Bildhöhen.
// Ergebnis: {pts (dicht, normiert), conf (Anteil sicherer Stellen), shift (mittlere Verschiebung in Bildhöhen)} oder null.
export function snapLine(pts, band, img = grabFrame()){
  if(!img || !pts || pts.length < 2) return null;
  const {w, h, d} = img;
  const S = resample(curve(pts).map(p => ({x:p.x*w, y:p.y*h})), 5);
  if(S.length < 6) return null;
  const K = Math.max(3, Math.round(band*h)), M = 2*K+1, CAP = 70;
  const col = (x, y) => { const xi = x|0, yi = y|0; if(xi<0 || yi<0 || xi>=w || yi>=h) return null; const o = (yi*w+xi)*4; return [d[o], d[o+1], d[o+2]]; };
  const diff = (a, b) => Math.hypot(a[0]-b[0], a[1]-b[1], a[2]-b[2]);
  const nrm = [], score = [];
  for(let i=0; i<S.length; i++){
    const a = S[Math.max(0, i-1)], b = S[Math.min(S.length-1, i+1)], L = Math.hypot(b.x-a.x, b.y-a.y) || 1;
    const t = {x:(b.x-a.x)/L, y:(b.y-a.y)/L}, n = {x:-t.y, y:t.x};
    // Farbe an einer Stelle, gemittelt längs der Linie (gegen Rauschen)
    const avg = (x, y) => { let r=0, g=0, bl=0, c=0; for(const s of [-2, 0, 2]){ const p = col(x+t.x*s, y+t.y*s); if(p){ r+=p[0]; g+=p[1]; bl+=p[2]; c++; } } return c ? [r/c, g/c, bl/c] : null; };
    const row = new Float32Array(M);
    for(let k=-K; k<=K; k++){
      const qx = S[i].x + n.x*k, qy = S[i].y + n.y*k, C = avg(qx, qy);
      let best = 0;
      if(C) for(const hw of [1, 2, 4, 6]){
        const o = hw + 2, A = avg(qx - n.x*o, qy - n.y*o), B = avg(qx + n.x*o, qy + n.y*o);
        if(!A || !B) continue;
        const s = Math.min(diff(C, A), diff(C, B)) - 0.5*diff(A, B);   // Streifen, beide Seiten gleicher Boden
        if(s > best) best = s;
      }
      row[k+K] = Math.min(best, CAP);
    }
    nrm.push(n); score.push(row);
  }
  // Glatter Pfad durch die besten Stellen (dynamische Programmierung): Sprünge kosten, Abstand zu den
  // Fußpunkten auch. Weil die Stärke gedeckelt ist, gewinnt von mehreren Linien die nächstgelegene.
  const LAM = 4, MU = 60/K, back = [];
  let prev = Float32Array.from(score[0], (s, k) => s - MU*Math.abs(k-K));
  for(let i=1; i<S.length; i++){
    const cur = new Float32Array(M), bk = new Int16Array(M);
    for(let k=0; k<M; k++){
      let bv = -Infinity, bj = k;
      for(let j=Math.max(0, k-4); j<=Math.min(M-1, k+4); j++){ const v = prev[j] - LAM*Math.abs(k-j); if(v > bv){ bv = v; bj = j; } }
      cur[k] = bv + score[i][k] - MU*Math.abs(k-K); bk[k] = bj;
    }
    back.push(bk); prev = cur;
  }
  let k = prev.indexOf(Math.max(...prev));
  const ks = new Array(S.length); ks[S.length-1] = k;
  for(let i=S.length-2; i>=0; i--){ k = back[i][k]; ks[i] = k; }
  const T = 28, out = []; let good = 0, sh = 0;
  for(let i=0; i<S.length; i++){
    const kk = ks[i] - K;
    if(score[i][ks[i]] < T) continue;
    good++; sh += Math.abs(kk);
    out.push({x:(S[i].x + nrm[i].x*kk)/w, y:(S[i].y + nrm[i].y*kk)/h});
  }
  const conf = good/S.length;
  if(conf < 0.5 || out.length < 5) return null;
  return {pts:out, conf, shift:sh/good/h};
}

// Dichte Punkte glätten (gleitender Median) und in gleichen Abständen auf 3–7 Linienpunkte reduzieren.
export function simplify(path, ar){
  if(path.length < 5) return [];
  const med = a => { const s = [...a].sort((x,y) => x-y); return s[s.length>>1]; };
  const sm = path.map((_, i) => { const w = path.slice(Math.max(0, i-3), i+4); return {x:med(w.map(p => p.x)), y:med(w.map(p => p.y))}; });
  const d = [0];
  for(let i=1; i<sm.length; i++) d.push(d[i-1] + Math.hypot((sm[i].x-sm[i-1].x)*ar, sm[i].y-sm[i-1].y));
  const len = d.at(-1); if(len < 0.05) return [];
  const n = Math.max(3, Math.min(7, Math.round(len/0.06) + 1)), out = [];
  for(let k=0; k<n; k++){ let i = d.findIndex(v => v >= len*k/(n-1)); if(i < 0) i = sm.length-1; out.push(sm[i]); }
  return out;
}
