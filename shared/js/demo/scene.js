// Demo-Szene für alle Trainings: gezeichnete Halle in Perspektive (Holzboden, 6-m-Bogen, 7-m-Strich, 9-m-Linie,
// Tor und Linien anderer Sportarten als Störer) und eine Person aus Gelenken, die Körperpunkte im MediaPipe-Format liefert.
// Das Verhalten der Person (was sie wann tut) steckt im Demo jedes Trainings, z. B. aussenspieler/js/demo/sim.js.

export const W = 1280, H = 720, F = W/2/Math.tan(33*Math.PI/180);   // ca. 66° Bildwinkel
export const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
export const g = cv.getContext('2d');

/* ---------- Halle: x entlang der Torlinie, y ins Feld, z nach oben (Meter). Tor bei x = ±1,5. ---------- */
export const D2R = Math.PI/180;
export const linePt = (th, r = 6) => [-1.5 + r*Math.cos(th*D2R), r*Math.sin(th*D2R)];   // linker Bogen um den Pfosten
function dArc(x, y, R){
  if(y < 0) return 9;
  if(x < -1.5) return Math.abs(Math.hypot(x+1.5, y) - R);
  if(x > 1.5) return Math.abs(Math.hypot(x-1.5, y) - R);
  return Math.abs(y - R);
}
function dash9(x, y){   // 9-m-Linie gestrichelt
  const d = dArc(x, y, 9); if(d > 0.1) return 9;
  const s = x < -1.5 ? Math.atan2(y, x+1.5)*9 : x > 1.5 ? Math.atan2(y, x-1.5)*9 : x;
  return ((s % 0.3) + 0.3) % 0.3 < 0.15 ? d : 9;
}
const WHITE = [242, 242, 236];
const LINES = [
  {c:WHITE, hw:0.025, d:(x,y) => dArc(x, y, 6)},                                        // 6-m-Linie
  {c:WHITE, hw:0.025, d:dash9},                                                          // 9-m-Linie
  {c:WHITE, hw:0.025, d:(x,y) => Math.abs(x) <= 10 ? Math.abs(y) : 9},                   // Torauslinie
  {c:WHITE, hw:0.025, d:(x,y) => y >= 0 && y <= 20 ? Math.abs(x+10) : 9},                // Seitenlinie
  {c:WHITE, hw:0.025, d:(x,y) => Math.abs(x) <= 0.5 ? Math.abs(y-7) : 9},                // 7-m-Strich
  {c:[60, 120, 215], hw:0.025, d:(x,y) => y >= 1.575 ? Math.abs(Math.hypot(x, y-1.575) - 6.75) : Math.abs(Math.abs(x) - 6.75)},  // Basketball-Dreier
  {c:[235, 200, 40], hw:0.025, d:(x,y) => x >= -10 && x <= -2 ? Math.abs(y-4.6) : 9},   // Volleyball, gelb
  {c:[40, 160, 80], hw:0.025, d:(x,y) => y >= 0 && y <= 9 ? Math.abs(x+6.1) : 9},       // grün
  {c:[230, 230, 225], hw:0.02, d:(x,y) => x >= -10 && x <= -3 ? Math.abs(y-1.0) : 9}     // Badminton, weiß
];
const hash = n => { const s = Math.sin(n*127.1 + 311.7)*43758.5453; return s - Math.floor(s); };

export const sub = (a,b) => [a[0]-b[0], a[1]-b[1], a[2]-b[2]];
export const dot = (a,b) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
export const cross = (a,b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
export const norm = a => { const l = Math.hypot(...a); return [a[0]/l, a[1]/l, a[2]/l]; };
export const add = (a, b, s = 1) => [a[0]+b[0]*s, a[1]+b[1]*s, a[2]+b[2]*s];


let cam = null, bg = null, ringList = [];
// Gummiringe im Tor (für die Treffererkennung): [{p:[x,y,z], r (m), color}]. Werden mit dem Hallenboden gezeichnet.
export function setRings(list){ ringList = list; if(cam) bg = renderHall(); }
// Kamera setzen: Position, Blickpunkt (Meter) und optional Verschiebung [dx, dy, Schwenk °]. Zeichnet den Hallenboden neu.
export function setView(pos0, look, [mx, my, yaw] = [0, 0, 0]){
  const pos = [pos0[0]+mx, pos0[1]+my, pos0[2]];
  let f = norm(sub(look, pos0)); const a = yaw*D2R;
  f = [f[0]*Math.cos(a) - f[1]*Math.sin(a), f[0]*Math.sin(a) + f[1]*Math.cos(a), f[2]];
  const r = norm(cross(f, [0, 0, 1])), u = cross(r, f);
  cam = {pos, f, r, u}; bg = renderHall();
}
export function proj(P){ const d = sub(P, cam.pos), z = dot(d, cam.f); return {x:W/2 + F*dot(d, cam.r)/z, y:H/2 - F*dot(d, cam.u)/z, z}; }
// Hallenboden ins Bild (vor Person und Ball).
export function drawFloor(){ g.drawImage(bg, 0, 0); }

/* ---------- Person ---------- */
// Person P: {x, y, a (Blickrichtung, rad), phi (Schrittphase), s (Gehen 0–1), lift (Sprung, m), lf/rf (Fuß links/rechts hoch, m),
// raise (Wurfarm hoch 0–1), swing (Wurf 0–1), twist (Oberkörper gegen Hüfte, rad), lean (rad), ball (Ball in der Hand)}.
// Optional lfx/rfx: Fuß links/rechts nach vorn versetzt (m), z. B. Ausfallschritt beim 7-m-Wurf; lfy/rfy: Fuß nach rechts versetzt (m,
// beim linken Fuß > 0,24 = Füße gekreuzt); low: Abwurf aus der Hüfte (0–1); fl: Fußhub beim Gehen/Laufen (m, Standard 0,1).

// Boden pixelweise: Strahl durch jedes Pixel mit dem Boden schneiden, Holz + Linien (mit Kantenglättung).
function renderHall(){
  const img = g.createImageData(W, H), D = img.data, {pos, f, r, u} = cam;
  for(let py=0; py<H; py++){
    const b = -(py - H/2)/F;
    for(let px=0; px<W; px++){
      const a = (px - W/2)/F;
      const dx = f[0]+a*r[0]+b*u[0], dy = f[1]+a*r[1]+b*u[1], dz = f[2]+a*r[2]+b*u[2];
      let c;
      const t = dz < -1e-3 ? -pos[2]/dz : Infinity, x = pos[0]+t*dx, y = pos[1]+t*dy;
      if(t===Infinity || x < -14 || x > 14 || y < -4 || y > 24){
        const v = 150 + 40*b; c = [v*0.95, v*0.93, v*0.88];             // Hallenwand
      } else {
        const L = Math.hypot(dx, dy, dz), fp = t*L/F / Math.max(0.15, -dz/L);
        if(x >= -10 && x <= 10 && y >= 0 && y <= 20){
          const k = Math.floor((x+20)/0.14), h1 = hash(k), h2 = hash(k*7 + Math.floor((y + 5 + h1*3)/2.4));
          const v = 0.88 + 0.1*h1 + 0.05*h2 + 0.02*Math.sin(y*23 + h1*40);
          c = [205*v, 155*v, 98*v];
        } else c = [92, 108, 118];                                         // Auslauf
        for(const ln of LINES){
          const dd = ln.d(x, y); if(dd > 0.3) continue;
          const cov = Math.min(1, Math.max(0, 0.5 + (ln.hw - dd)/fp));
          if(cov > 0) c = [c[0] + (ln.c[0]-c[0])*cov, c[1] + (ln.c[1]-c[1])*cov, c[2] + (ln.c[2]-c[2])*cov];
        }
        const light = 1.05 - 0.012*t; c = c.map(v => v*light);
      }
      const n = (Math.random() - 0.5)*10, o = (py*W + px)*4;
      D[o] = c[0]+n; D[o+1] = c[1]+n; D[o+2] = c[2]+n; D[o+3] = 255;
    }
  }
  const off = document.createElement('canvas'); off.width = W; off.height = H;
  const og = off.getContext('2d'); og.putImageData(img, 0, 0);
  drawGoal(og);
  return off;
}
function drawGoal(c){   // Tor: rot-weiße Pfosten und Latte
  const bar = (A, B) => {
    const n = 10;
    for(let i=0; i<n; i++){
      const p = proj(add(A, sub(B, A), i/n)), q = proj(add(A, sub(B, A), (i+1)/n));
      if(p.z < 0.3 || q.z < 0.3) continue;
      c.strokeStyle = i%2 ? '#f4f4f4' : '#d42a2a'; c.lineWidth = F*0.08/p.z; c.lineCap = 'butt';
      c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(q.x, q.y); c.stroke();
    }
  };
  bar([-1.5, 0, 0], [-1.5, 0, 2]); bar([-1.5, 0, 2], [1.5, 0, 2]); bar([1.5, 0, 0], [1.5, 0, 2]);
  for(const rg of ringList){   // Ring als Kreis in der Torebene (Punkte im Kreis projizieren)
    c.strokeStyle = rg.color; c.lineWidth = Math.max(2, F*0.03/proj(rg.p).z); c.beginPath();
    for(let k = 0; k <= 24; k++){ const a = k/24*2*Math.PI, q = proj([rg.p[0] + rg.r*Math.cos(a), rg.p[1], rg.p[2] + rg.r*Math.sin(a)]); k ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y); }
    c.stroke();
  }
}

// 3D-Gelenke der Person (Meter).
let J = null;
// R = Rechtshänder.
export function joints(P, R){
  const fw = [Math.cos(P.a), Math.sin(P.a), 0], lf = [-Math.sin(P.a), Math.cos(P.a), 0], up = [0, 0, 1];
  const tw = P.twist, fws = [Math.cos(P.a+tw), Math.sin(P.a+tw), 0], ls = [-Math.sin(P.a+tw), Math.cos(P.a+tw), 0];
  const pel = [P.x, P.y, 0.95 + P.lift - 0.04*P.s];
  const j = {};
  j.lHip = add(pel, lf, 0.15); j.rHip = add(pel, lf, -0.15);
  const gait = 0.33*P.s*Math.sin(P.phi), fl = P.fl ?? 0.1, lifts = [fl*P.s*Math.max(0, Math.cos(P.phi)), fl*P.s*Math.max(0, -Math.cos(P.phi))];
  for(const [side, sg, k] of [['l', 1, 0], ['r', -1, 1]]){
    const off = sg*gait + ((k ? P.rfx : P.lfx) || 0), ly = 0.12*sg - ((k ? P.rfy : P.lfy) || 0), z = 0.08 + lifts[k] + (k ? P.rf : P.lf);
    const ank = [P.x + lf[0]*ly + fw[0]*off, P.y + lf[1]*ly + fw[1]*off, z];
    const hip = j[side+'Hip'], dd = Math.hypot(...sub(ank, hip)), m = add(hip, sub(ank, hip), 0.5);
    j[side+'Knee'] = add(m, fw, Math.sqrt(Math.max(0, 0.46*0.46 - dd*dd/4)));
    j[side+'Ank'] = ank; j[side+'Heel'] = add(add(ank, fw, -0.06), up, -0.05); j[side+'Toe'] = add(add(ank, fw, 0.19), up, -0.06);
  }
  const sc = add(pel, add([0,0,0], add(up, fw, Math.tan(P.lean)), 0.5/Math.hypot(1, Math.tan(P.lean))));
  j.lSh = add(sc, ls, 0.2); j.rSh = add(sc, ls, -0.2);
  j.head = add(sc, up, 0.24); j.nose = add(add(sc, up, 0.2), fws, 0.1);
  const thr = R ? 'r' : 'l', oth = R ? 'l' : 'r', side = R ? -1 : 1;
  // Freier Arm: pendelt beim Gehen
  const sh2 = j[oth+'Sh'], sw = -0.15*P.s*Math.sin(P.phi)*(R ? 1 : -1);
  j[oth+'El'] = add(add(sh2, up, -0.28), fws, sw + 0.05); j[oth+'Wr'] = add(add(j[oth+'El'], up, -0.24), fws, sw*1.2 + 0.12);
  // Wurfarm: hängend → ausgeholt hinter dem Kopf → nach vorn geworfen
  const sh = j[thr+'Sh'];
  const elH = add(add(sh, up, -0.28), fws, 0.05), wrH = add(add(elH, up, -0.22), fws, 0.15);
  const elR = add(add(add(sh, up, 0.1), ls, 0.22*side), fws, -0.12), wrR = add(add(elR, up, 0.28), fws, -0.14);
  // Abwurf: hoch über dem Kopf (P.low = 0) oder seitlich aus der Hüfte (P.low = 1, Hand zwischen Hüfte und Schulter).
  const mix = (A, B, k) => add(A, sub(B, A), k), lo = P.low || 0;
  const elT = mix(add(add(sh, fws, 0.27), up, 0.15), add(add(add(sh, fws, 0.12), ls, 0.2*side), up, -0.22), lo);
  const wrT = mix(add(add(sh, fws, 0.5), up, 0.3), add(add(add(sh, fws, 0.42), ls, 0.25*side), up, -0.3), lo);
  j[thr+'El'] = mix(mix(elH, elR, P.raise), elT, P.swing); j[thr+'Wr'] = mix(mix(wrH, wrR, P.raise), wrT, P.swing);
  J = j; return j;
}
// Wurfhand (3D) der zuletzt berechneten Gelenke.
export const hand = R => J ? J[(R ? 'r' : 'l') + 'Wr'] : [0, 0, 1];

// MediaPipe-Indizes der 33 Punkte.
const IDX = {nose:0, lSh:11, rSh:12, lEl:13, rEl:14, lWr:15, rWr:16, lHip:23, rHip:24, lKnee:25, rKnee:26, lAnk:27, rAnk:28, lHeel:29, rHeel:30, lToe:31, rToe:32};
export function landmarks(j){
  const lm = new Array(33), wl = new Array(33);
  const hipC = add(j.lHip, sub(j.rHip, j.lHip), 0.5);
  const put = (i, P3) => {
    const p = proj(P3), d = sub(P3, hipC), n = () => (Math.random()-0.5)*1.5;
    lm[i] = {x:(p.x + n())/W, y:(p.y + n())/H, z:0, visibility:0.98};
    wl[i] = {x:dot(d, cam.r), y:-dot(d, cam.u), z:dot(d, cam.f), visibility:0.98};
  };
  for(const k in IDX) put(IDX[k], j[k]);
  for(let i=1; i<=10; i++) put(i, add(j.nose, [0, 0, i <= 6 ? 0.03 : -0.04]));   // Gesicht grob
  for(let i=17; i<=22; i++) put(i, j[i%2 ? 'lWr' : 'rWr']);                       // Hände
  return {landmarks:[lm], worldLandmarks:[wl]};
}

/* ---------- Zeichnen ---------- */
export function drawPerson(j, P, R){
  const shadow = proj([P.x, P.y, 0]);
  g.fillStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.ellipse(shadow.x, shadow.y, F*0.35/shadow.z, F*0.12/shadow.z, 0, 0, 7); g.fill();
  const items = [];
  const limb = (a, b, r, col) => items.push({z:(proj(a).z + proj(b).z)/2, draw(){ const p = proj(a), q = proj(b); g.strokeStyle = col; g.lineWidth = F*r*2/p.z; g.lineCap = 'round'; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(q.x, q.y); g.stroke(); }});
  const SKIN = '#e0b089', SHIRT = '#1f5fbf', SHORTS = '#1a1f2a', SHOE = '#f2f2f2';
  for(const s of ['l', 'r']){
    limb(j[s+'Hip'], j[s+'Knee'], 0.075, SKIN); limb(j[s+'Knee'], j[s+'Ank'], 0.06, SKIN); limb(j[s+'Heel'], j[s+'Toe'], 0.05, SHOE);
    limb(j[s+'Sh'], j[s+'El'], 0.05, SHIRT); limb(j[s+'El'], j[s+'Wr'], 0.042, SKIN);
  }
  items.push({z:proj(add(j.lHip, sub(j.rSh, j.lHip), 0.5)).z, draw(){
    const q = [j.lSh, j.rSh, j.rHip, j.lHip].map(proj);
    g.fillStyle = SHIRT; g.strokeStyle = SHIRT; g.lineWidth = F*0.08/q[0].z; g.lineJoin = 'round';
    g.beginPath(); q.forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)); g.closePath(); g.fill(); g.stroke();
    const h = [j.lHip, j.rHip].map(proj); g.strokeStyle = SHORTS; g.lineWidth = F*0.17/h[0].z; g.beginPath(); g.moveTo(h[0].x, h[0].y); g.lineTo(h[1].x, h[1].y); g.stroke();
  }});
  items.push({z:proj(j.head).z, draw(){ const p = proj(j.head); g.fillStyle = SKIN; g.beginPath(); g.arc(p.x, p.y, F*0.11/p.z, 0, 7); g.fill(); g.fillStyle = '#3a2a1c'; g.beginPath(); g.arc(p.x, p.y - F*0.03/p.z, F*0.1/p.z, Math.PI, 2*Math.PI); g.fill(); }});
  if(P.ball){ const h = hand(R); items.push({z:proj(h).z - 0.05, draw(){ ball(h); }}); }
  items.sort((a, b) => b.z - a.z).forEach(it => it.draw());
}
export function ball(P3){ const p = proj(P3); if(p.z < 0.3) return; g.fillStyle = '#f2d23a'; g.strokeStyle = '#2a4fd0'; g.lineWidth = F*0.015/p.z; g.beginPath(); g.arc(p.x, p.y, F*0.095/p.z, 0, 7); g.fill(); g.stroke(); }

