// Zeichnen der Anleitungsvideos: eigene Kamera, Halle aus Linien (schnell, ohne Pixel-Raytracing), Lehrbild-Figur
// (figure.js) mit Gelenkpunkten und Winkelmarken. Unabhängig vom Demo-Modus (shared/js/demo/), teilt keinen Zustand mit ihm.
import { V, jointAngle, jointPts } from './figure.js';

const {add, sub, dot} = V;
const norm = a => { const l = V.len(a); return [a[0]/l, a[1]/l, a[2]/l]; };
const cross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];

// Kamera: pos, look (Meter), fov (Grad, waagerecht). → {proj(P) → {x, y, z}, F, W, H, pos}
export function camera(ctx, {pos, look, fov = 50}){
  const W = ctx.canvas.width, H = ctx.canvas.height, F = W/2/Math.tan(fov/2*Math.PI/180);
  const f = norm(sub(look, pos)), r = norm(cross(f, [0, 0, 1])), u = cross(r, f);
  const proj = P => { const d = sub(P, pos), z = dot(d, f); return {x:W/2 + F*dot(d, r)/z, y:H/2 - F*dot(d, u)/z, z}; };
  return {proj, F, W, H, pos, f};
}
// Seitenansicht auf einen Punkt: Kamera senkrecht zur Blickrichtung a (Grad) der Figur, von ihrer linken (side 1) oder
// rechten Seite (−1), in Höhe h. Für echte Gelenkwinkel im Bild.
export function sideCam(x, y, a, {side = -1, dist = 5.6, h = 1.2, lookZ = 1.3, fwd = 0, fov = 50} = {}){
  const r = a*Math.PI/180, lt = [-Math.sin(r), Math.cos(r)], fw = [Math.cos(r), Math.sin(r)];
  const c = [x + fw[0]*fwd, y + fw[1]*fwd];
  return {pos:[c[0] + lt[0]*dist*side, c[1] + lt[1]*dist*side, h], look:[c[0], c[1], lookZ], fov};
}

/* ---------- Halle ---------- */
const WOOD = ['#d9a76a', '#b9864f'], WALL = ['#3a4350', '#566170'], LINE = '#f4f4ee';
function seg(ctx, cam, A, B, w, col, n = 1){
  for(let i = 0; i < n; i++){
    const P = V.mix(A, B, i/n), Q = V.mix(A, B, (i+1)/n), p = cam.proj(P), q = cam.proj(Q);
    if(p.z < 0.2 || q.z < 0.2) continue;
    ctx.strokeStyle = col; ctx.lineWidth = Math.max(1, cam.F*w/((p.z + q.z)/2)); ctx.lineCap = 'butt';
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
  }
}
function arc(ctx, cam, cx, R, from, to, w, col, dash = 0){
  const n = 48;
  for(let i = 0; i < n; i++){
    if(dash && i % 2) continue;
    const a1 = (from + (to - from)*i/n)*Math.PI/180, a2 = (from + (to - from)*(i+1)/n)*Math.PI/180;
    seg(ctx, cam, [cx + R*Math.cos(a1), R*Math.sin(a1), 0], [cx + R*Math.cos(a2), R*Math.sin(a2), 0], w, col);
  }
}
// Hallenboden, Wand, Handball-Linien (x entlang der Torlinie, y ins Feld, Tor bei x = ±1,5) und Tor.
export function drawCourt(ctx, cam){
  const {W, H} = cam;
  const far = cam.proj([cam.pos[0] + cam.f[0]*1000, cam.pos[1] + cam.f[1]*1000, 0]);
  const hz = Math.max(0, Math.min(H, far.z > 0 ? far.y : 0));
  let g = ctx.createLinearGradient(0, 0, 0, hz); g.addColorStop(0, WALL[0]); g.addColorStop(1, WALL[1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, hz);
  g = ctx.createLinearGradient(0, hz, 0, H); g.addColorStop(0, WOOD[1]); g.addColorStop(1, WOOD[0]);
  ctx.fillStyle = g; ctx.fillRect(0, hz, W, H - hz);
  const w = 0.05;
  seg(ctx, cam, [-10, 0, 0], [10, 0, 0], w, LINE, 20);                       // Torlinie
  seg(ctx, cam, [-10, 0, 0], [-10, 20, 0], w, LINE, 20); seg(ctx, cam, [10, 0, 0], [10, 20, 0], w, LINE, 20);
  arc(ctx, cam, -1.5, 6, 90, 180, w, LINE); arc(ctx, cam, 1.5, 6, 0, 90, w, LINE); seg(ctx, cam, [-1.5, 6, 0], [1.5, 6, 0], w, LINE, 3);
  arc(ctx, cam, -1.5, 9, 90, 180, w, LINE, 1); arc(ctx, cam, 1.5, 9, 0, 90, w, LINE, 1);
  for(let x = -1.5; x < 1.5; x += 0.3) seg(ctx, cam, [x, 9, 0], [x + 0.15, 9, 0], w, LINE);
  seg(ctx, cam, [-0.5, 7, 0], [0.5, 7, 0], w, LINE);                          // 7-m-Strich
  // Tor: rot-weiße Pfosten und Latte, Netz angedeutet.
  const post = (A, B) => { for(let i = 0; i < 10; i++) seg(ctx, cam, V.mix(A, B, i/10), V.mix(A, B, (i+1)/10), 0.08, i%2 ? '#f4f4f4' : '#d42a2a'); };
  ctx.globalAlpha = 0.25; for(let x = -1.5; x <= 1.5; x += 0.25) seg(ctx, cam, [x, 0, 2], [x, -0.8, 0], 0.01, '#fff'); ctx.globalAlpha = 1;
  post([-1.5, 0, 0], [-1.5, 0, 2]); post([-1.5, 0, 2], [1.5, 0, 2]); post([1.5, 0, 0], [1.5, 0, 2]);
}

/* ---------- Figur ---------- */
const SKIN = '#e3b28a', SHIRT = '#1f5fbf', SHIRT2 = '#174a96', SHORTS = '#1a1f2a', SHOE = '#f5f5f5', HL = '#2ecc71', HL2 = '#ff8a1f';
// j: Gelenke aus body(), pose: für den Ball, hl: hervorgehobene Glieder grün (z. B. ['lThigh', 'lShank'] = Sprungbein),
// hl2: orange (z. B. Wurfarm).
export function drawFigure(ctx, cam, j, pose = {}, {hl = [], hl2 = []} = {}){
  const {proj, F} = cam, items = [];
  const sh = proj([j.pelvis[0], j.pelvis[1], 0]);
  if(sh.z > 0.2){ ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(sh.x, sh.y, F*0.32/sh.z, F*0.1/sh.z, 0, 0, 7); ctx.fill(); }
  const limb = (a, b, r, col, key) => items.push({z:(proj(a).z + proj(b).z)/2, draw(){
    const p = proj(a), q = proj(b); ctx.lineCap = 'round';
    if(hl.includes(key) || hl2.includes(key)){ ctx.strokeStyle = hl.includes(key) ? HL : HL2; ctx.lineWidth = F*(r + 0.03)*2/p.z; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke(); }
    ctx.strokeStyle = col; ctx.lineWidth = F*r*2/p.z; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
  }});
  for(const s of ['l', 'r']){
    limb(j[s+'Hip'], j[s+'Knee'], 0.075, s==='l' ? SKIN : '#d9a47b', s+'Thigh'); limb(j[s+'Knee'], j[s+'Ank'], 0.058, s==='l' ? SKIN : '#d9a47b', s+'Shank');
    limb(j[s+'Heel'], j[s+'Toe'], 0.045, SHOE, s+'Foot'); limb(j[s+'Ank'], j[s+'Heel'], 0.04, SHOE, s+'Foot');
    limb(j[s+'Sh'], j[s+'El'], 0.05, s==='l' ? SHIRT : SHIRT2, s+'Upper'); limb(j[s+'El'], j[s+'Wr'], 0.04, SKIN, s+'Fore'); limb(j[s+'Wr'], j[s+'Hand'], 0.035, SKIN, s+'Fore');
  }
  items.push({z:proj(V.mix(j.pelvis, j.neck, 0.5)).z, draw(){
    const q = [j.lSh, j.rSh, j.rHip, j.lHip].map(proj);
    const pp = proj(j.pelvis), pn = proj(add(j.neck, sub(j.pelvis, j.neck), 0.08));   // Rumpf mit Tiefe (Seitenansicht)
    ctx.strokeStyle = SHIRT; ctx.lineCap = 'round'; ctx.lineWidth = F*0.26/pp.z; ctx.beginPath(); ctx.moveTo(pp.x, pp.y); ctx.lineTo(pn.x, pn.y); ctx.stroke();
    ctx.fillStyle = SHIRT; ctx.strokeStyle = SHIRT; ctx.lineWidth = F*0.09/q[0].z; ctx.lineJoin = 'round';
    ctx.beginPath(); q.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath(); ctx.fill(); ctx.stroke();
    const h = [j.lHip, j.rHip].map(proj); ctx.strokeStyle = SHORTS; ctx.lineWidth = F*0.17/h[0].z; ctx.beginPath(); ctx.moveTo(h[0].x, h[0].y); ctx.lineTo(h[1].x, h[1].y); ctx.stroke();
  }});
  items.push({z:proj(j.head).z, draw(){
    const p = proj(j.head), n = proj(j.nose);
    ctx.fillStyle = SKIN; ctx.beginPath(); ctx.arc(p.x, p.y, F*0.11/p.z, 0, 7); ctx.fill();
    ctx.fillStyle = '#3a2a1c'; ctx.beginPath(); ctx.arc(p.x, p.y - F*0.03/p.z, F*0.1/p.z, Math.PI, 2*Math.PI); ctx.fill();
    if(n.z < p.z){ ctx.fillStyle = '#c98f66'; ctx.beginPath(); ctx.arc(n.x, n.y, F*0.025/n.z, 0, 7); ctx.fill(); }   // Nase (nur von vorn/seitlich): Blickrichtung
  }});
  // Gelenkpunkte (Knie, Hüfte, Ellbogen, Schulter, Fußgelenk) zum Ablesen der Winkel.
  for(const k of ['lKnee', 'rKnee', 'lHip', 'rHip', 'lEl', 'rEl', 'lSh', 'rSh', 'lAnk', 'rAnk']){
    const P = j[k]; items.push({z:proj(P).z - 0.02, draw(){ const p = proj(P); ctx.fillStyle = '#fff'; ctx.strokeStyle = '#222'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(3, F*0.022/p.z), 0, 7); ctx.fill(); ctx.stroke(); }});
  }
  const b = pose.ball === 'r' ? j.rHand : pose.ball === 'l' ? j.lHand : pose.ball === 'both' ? V.mix(j.lHand, j.rHand, 0.5) : null;
  if(b) items.push({z:proj(b).z - 0.05, draw(){ drawBall(ctx, cam, b); }});
  items.sort((a, b2) => b2.z - a.z).forEach(it => it.draw());
}
export function drawBall(ctx, cam, P){
  const p = cam.proj(P); if(p.z < 0.3) return;
  ctx.fillStyle = '#f2d23a'; ctx.strokeStyle = '#2a4fd0'; ctx.lineWidth = cam.F*0.015/p.z;
  ctx.beginPath(); ctx.arc(p.x, p.y, cam.F*0.095/p.z, 0, 7); ctx.fill(); ctx.stroke();
}

// Winkelmarke an einem Gelenk: Bogen zwischen den beiden Gliedern und der gemessene Winkel („Knie 90°“).
// mark: {j:'lKnee' | 'rElbow' | 'lHip' | 'rShoulder', label?: 'Knie', target?: 90 (Sollwert, Toleranz ±tol, Standard 12)}
export function drawMarks(ctx, cam, j, marks){
  for(const m of marks){
    const [A, B, C] = jointPts(j, m.j), deg = jointAngle(j, m.j);
    const p = cam.proj(B), a = cam.proj(A), c = cam.proj(C); if(p.z < 0.3) continue;
    const r = Math.max(28, cam.F*0.13/p.z);
    let a1 = Math.atan2(a.y - p.y, a.x - p.x), a2 = Math.atan2(c.y - p.y, c.x - p.x);
    let d = a2 - a1; while(d > Math.PI) d -= 2*Math.PI; while(d < -Math.PI) d += 2*Math.PI;
    const ok = m.target == null || Math.abs(deg - m.target) <= (m.tol ?? 12), col = ok ? '#ffd23a' : '#ff6b5a';
    ctx.strokeStyle = col; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(p.x, p.y, r, a1, a1 + d, d < 0); ctx.stroke();
    const mid = a1 + d/2 + Math.PI, lx = p.x + Math.cos(mid)*(r + 70), ly = p.y + Math.sin(mid)*(r + 30);   // Beschriftung gegenüber dem Bogen, frei vom Körper
    const txt = `${m.label ? m.label + ' ' : ''}${Math.round(deg)}°`;
    ctx.font = '700 44px Barlow, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const tw = ctx.measureText(txt).width;
    ctx.fillStyle = 'rgba(10,14,22,.85)'; ctx.fillRect(lx - tw/2 - 10, ly - 28, tw + 20, 56);
    ctx.fillStyle = col; ctx.fillText(txt, lx, ly);
  }
}
// Hilfslinie zwischen zwei 3D-Punkten mit Beschriftung (z. B. „Becken waagerecht“).
export function drawGuideLine(ctx, cam, A, B, col = '#ffd23a', label = '', dash = [10, 8]){
  const p = cam.proj(A), q = cam.proj(B); if(p.z < 0.3 || q.z < 0.3) return;
  ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.setLineDash(dash); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke(); ctx.restore();
  if(label){ ctx.font = '600 36px Barlow, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillStyle = col; ctx.fillText(label, Math.max(p.x, q.x) + 8, (p.y + q.y)/2); }
}
