// Demo-Modus: gezeichneter Hallenboden mit gebogener 6-m-Linie (plus andere Linien zum Verwechseln)
// und eine simulierte Person. Liefert einen Videostream statt der Kamera und Körperpunkte im
// MediaPipe-Format statt der KI. Einrichtung, Linienerkennung und Wurf-Analyse laufen unverändert.
// Die Person reagiert auf die Ansagen der App: Linie ablaufen, in den Torraum gehen, Würfe.
import { app } from '../state.js';
import { settings } from '../store.js';
import { wizard } from '../lineWizard.js';
import { showHint } from '../dom.js';
import { shoutNow } from '../shout.js';

const W = 1280, H = 720, F = W/2/Math.tan(33*Math.PI/180);   // ca. 66° Bildwinkel
const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
const g = cv.getContext('2d');

/* ---------- Halle: x entlang der Torlinie, y ins Feld, z nach oben (Meter). Tor bei x = ±1,5. ---------- */
const D2R = Math.PI/180;
const linePt = (th, r = 6) => [-1.5 + r*Math.cos(th*D2R), r*Math.sin(th*D2R)];   // linker Bogen um den Pfosten
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

/* ---------- Kamera: Position der Einstellung „camPos“ (siehe CAM_POS in config.js) ---------- */
// base: erhöht auf der Grundlinie zwischen 6-m-Linie und Tor, schräg auf die Absprungzone am linken Flügel.
// court: im Feld hinter dem 7-m-Punkt, zur anderen Seite versetzt; Tor und Absprungzone im Bild.
const CAMS = {base:{pos:[-3.4, -2.4, 2.2], look:[-6.6, 3.0, 0.2]}, court:{pos:[2.5, 10.5, 2.0], look:[-3.5, 2.3, 0.5]}};
const MOVES = [[0, 0, 0], [0.3, 0.15, 4], [-0.25, 0.1, -3.5]];   // dx, dy (m), Schwenk (°) für „Kamera bewegen“
let moveIdx = 0, cam = null, bg = null, camKey = null;
const sub = (a,b) => [a[0]-b[0], a[1]-b[1], a[2]-b[2]], dot = (a,b) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross = (a,b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
const norm = a => { const l = Math.hypot(...a); return [a[0]/l, a[1]/l, a[2]/l]; };
const add = (a, b, s = 1) => [a[0]+b[0]*s, a[1]+b[1]*s, a[2]+b[2]*s];

function setCamera(){
  camKey = CAMS[settings.camPos] ? settings.camPos : 'base';
  const BASE = CAMS[camKey], [mx, my, yaw] = MOVES[moveIdx], pos = [BASE.pos[0]+mx, BASE.pos[1]+my, BASE.pos[2]];
  let f = norm(sub(BASE.look, BASE.pos)); const a = yaw*D2R;
  f = [f[0]*Math.cos(a) - f[1]*Math.sin(a), f[0]*Math.sin(a) + f[1]*Math.cos(a), f[2]];
  const r = norm(cross(f, [0, 0, 1])), u = cross(r, f);
  cam = {pos, f, r, u}; bg = renderHall();
}
function proj(P){ const d = sub(P, cam.pos), z = dot(d, cam.f); return {x:W/2 + F*dot(d, cam.r)/z, y:H/2 - F*dot(d, cam.u)/z, z}; }

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
}

/* ---------- Person ---------- */
const S = linePt(150, 8.7);                     // Anlauf-Start am Flügel
const P = {x:S[0], y:S[1], a:-0.7, phi:0, s:0, lift:0, lf:0, rf:0, raise:0, swing:0, twist:0, lean:0.08, ball:true};
let walkTh = null, shot = null, shotNo = 0, ballFly = null;

// Gehen/Laufen zum Ziel. Gibt true zurück, wenn angekommen.
function moveTo(T, v, dt, stride = 0.75){
  const dx = T[0]-P.x, dy = T[1]-P.y, d = Math.hypot(dx, dy);
  if(d < 0.04){ P.s = Math.max(0, P.s - dt*4); return true; }
  turnTo(Math.atan2(dy, dx), dt);
  const st = Math.min(d, v*dt); P.x += dx/d*st; P.y += dy/d*st;
  P.s = Math.min(1, P.s + dt*4); P.phi += dt*v/stride*Math.PI;
  return false;
}
function turnTo(a, dt){ let da = ((a - P.a + 3*Math.PI) % (2*Math.PI)) - Math.PI; P.a += Math.max(-dt*6, Math.min(dt*6, da)); }
function stand(dt, face){ P.s = Math.max(0, P.s - dt*4); if(face!==undefined) turnTo(face, dt); }
const toward = T => Math.atan2(T[1]-P.y, T[0]-P.x);

let called = false, readyFor = 0, autoCall = true;   // autoCall: Person ruft von selbst (Tests schalten das ab)
export const demo = {calls:[]};   // Zeitpunkte der Zurufe (für Tests)

// Verhalten: reagiert auf die Ansagen der App wie ein Mensch, der zuhört.
function behave(dt){
  if(shot){ shotStep(dt); return; }
  P.lift = 0; P.lf = P.rf = 0; P.raise = Math.max(0, P.raise - dt*3); P.swing = 0; P.twist = 0; P.ball = true;
  const ph = wizard.phase;
  if(ph==='wait'){ walkTh = null; const A = linePt(172); if(moveTo(A, 1.3, dt)) stand(dt, toward(linePt(160))); return; }
  if(ph==='walk'){
    if(walkTh===null) walkTh = 172;
    if(walkTh > 128){
      walkTh = Math.max(128, walkTh - dt*0.7/6/D2R);
      const p = linePt(walkTh), wob = 0.03*Math.sin(walkTh*0.9);
      const th = walkTh*D2R; P.x = p[0] + Math.cos(th)*wob; P.y = p[1] + Math.sin(th)*wob;
      P.a = Math.atan2(-Math.cos(th), Math.sin(th)); P.s = Math.min(1, P.s + dt*4); P.phi += dt*0.7/0.6*Math.PI;
    } else stand(dt);
    return;
  }
  if(ph==='inside'){ const T = linePt(walkTh ?? 128, 5.1); if(moveTo(T, 0.8, dt, 0.6)) stand(dt); return; }
  if(app.state==='runup' && !app.marking){ called = false; startShot(); return; }
  if(moveTo(S, app.state==='cool' ? 2 : 1.4, dt)){
    stand(dt, toward(linePt(150)));
    // Modus „Zuruf“: am Startpunkt kurz stehen, dann rufen (einmal pro Wurf).
    if(app.state==='ready' && settings.mode==='call' && !called && autoCall){ readyFor += dt; if(readyFor > 0.8){ called = true; demo.calls.push(performance.now()); shoutNow(); showHint('Demo: Spieler ruft „Hey!“', 1200); } }
  }
  if(app.state!=='ready') readyFor = 0;
}

// Sprungwurf: Anlauf, Absprung links (Rechtshänder), Ausholen, Drehung, Wurf, Landung.
// Ab und zu ein Fehler: Übertritt, flacher Sprung, Arm unten.
const VAR = [{r:6.3, h:0.5, arm:1}, {r:6.25, h:0.45, arm:1}, {r:5.85, h:0.45, arm:1}, {r:6.3, h:0.28, arm:0.45}];
// Eigene Wurf-Folgen je Aufgabe (settings.task), damit Tests wissen, was herauskommen muss.
// line: nah an der Linie (geschafft), zu weit weg, Übertritt, nah.
export const TASK_VAR = {line:[{r:6.25, h:0.5, arm:1}, {r:7.0, h:0.5, arm:1}, {r:5.85, h:0.45, arm:1}, {r:6.35, h:0.45, arm:1}]};
function startShot(){
  const vs = (app.task && TASK_VAR[app.task.id]) || VAR, v = vs[shotNo++ % vs.length];
  shot = {...v, stage:'run', t:0, K:linePt(150, v.r)};
}
function shotStep(dt){
  const s = shot; s.t += dt;
  const R = settings.hand !== 'L';
  if(s.stage==='run'){
    const d = Math.hypot(s.K[0]-P.x, s.K[1]-P.y);
    P.raise = Math.min(s.arm, Math.max(P.raise, 1.4 - d));   // Arm hoch in den letzten Schritten
    const arrived = moveTo(s.K, 3.2, dt, 1.3);
    // Letzter Schritt: Sprungbein (links bei Rechtshand) steht, Schwungbein-Knie kommt hoch.
    if(d < 0.8){ P.phi = R ? Math.PI : 0; const k = 0.3*(1 - d/0.8); if(R) P.rf = k; else P.lf = k; }
    if(arrived){ s.stage = 'air'; s.t = 0; s.dir = P.a; s.T = 0.38 + s.h*0.5; P.s = 0; }
    return;
  }
  if(s.stage==='air'){
    const u = Math.min(1, s.t/s.T);
    P.lift = 4*s.h*u*(1-u);
    P.lf = P.lift*0.85; P.rf = P.lift*0.85 + 0.3*(1-u) + 0.2*Math.sin(Math.PI*u);   // Schwungbein hoch
    if(!R){ [P.lf, P.rf] = [P.rf, P.lf]; }
    P.x += Math.cos(s.dir)*1.6*dt; P.y += Math.sin(s.dir)*1.6*dt;
    P.raise = s.arm;
    P.swing = u < 0.45 ? 0 : Math.min(1, (u-0.45)/0.22);
    P.twist = (u < 0.45 ? 0.55*Math.min(1, u/0.2) : 0.55 - 0.9*Math.min(1, (u-0.45)/0.25)) * (R ? 1 : -1);
    if(P.swing > 0.8 && P.ball){ P.ball = false; ballFly = {p:hand(), t:0}; }
    if(u >= 1){ s.stage = 'land'; s.t = 0; P.lift = P.lf = P.rf = 0; }
    return;
  }
  if(s.stage==='land'){
    P.swing = Math.max(0, 1 - s.t*2); P.raise = Math.max(0, s.arm - s.t*2); P.twist *= 0.9;
    if(s.t > 0.6 && app.state!=='air' && app.state!=='runup'){ shot = null; P.ball = true; }
    else if(s.t > 3){ shot = null; P.ball = true; }
  }
}

// 3D-Gelenke der Person (Meter).
let J = null;
function joints(){
  const fw = [Math.cos(P.a), Math.sin(P.a), 0], lf = [-Math.sin(P.a), Math.cos(P.a), 0], up = [0, 0, 1];
  const tw = P.twist, fws = [Math.cos(P.a+tw), Math.sin(P.a+tw), 0], ls = [-Math.sin(P.a+tw), Math.cos(P.a+tw), 0];
  const pel = [P.x, P.y, 0.95 + P.lift - 0.04*P.s];
  const j = {};
  j.lHip = add(pel, lf, 0.15); j.rHip = add(pel, lf, -0.15);
  const gait = 0.33*P.s*Math.sin(P.phi), lifts = [0.1*P.s*Math.max(0, Math.cos(P.phi)), 0.1*P.s*Math.max(0, -Math.cos(P.phi))];
  for(const [side, sg, k] of [['l', 1, 0], ['r', -1, 1]]){
    const off = sg*gait, z = 0.08 + lifts[k] + (k ? P.rf : P.lf);
    const ank = [P.x + lf[0]*0.12*sg + fw[0]*off, P.y + lf[1]*0.12*sg + fw[1]*off, z];
    const hip = j[side+'Hip'], dd = Math.hypot(...sub(ank, hip)), m = add(hip, sub(ank, hip), 0.5);
    j[side+'Knee'] = add(m, fw, Math.sqrt(Math.max(0, 0.46*0.46 - dd*dd/4)));
    j[side+'Ank'] = ank; j[side+'Heel'] = add(add(ank, fw, -0.06), up, -0.05); j[side+'Toe'] = add(add(ank, fw, 0.19), up, -0.06);
  }
  const sc = add(pel, add([0,0,0], add(up, fw, Math.tan(P.lean)), 0.5/Math.hypot(1, Math.tan(P.lean))));
  j.lSh = add(sc, ls, 0.2); j.rSh = add(sc, ls, -0.2);
  j.head = add(sc, up, 0.24); j.nose = add(add(sc, up, 0.2), fws, 0.1);
  const R = settings.hand !== 'L', thr = R ? 'r' : 'l', oth = R ? 'l' : 'r', side = R ? -1 : 1;
  // Freier Arm: pendelt beim Gehen
  const sh2 = j[oth+'Sh'], sw = -0.15*P.s*Math.sin(P.phi)*(R ? 1 : -1);
  j[oth+'El'] = add(add(sh2, up, -0.28), fws, sw + 0.05); j[oth+'Wr'] = add(add(j[oth+'El'], up, -0.24), fws, sw*1.2 + 0.12);
  // Wurfarm: hängend → ausgeholt hinter dem Kopf → nach vorn geworfen
  const sh = j[thr+'Sh'];
  const elH = add(add(sh, up, -0.28), fws, 0.05), wrH = add(add(elH, up, -0.22), fws, 0.15);
  const elR = add(add(add(sh, up, 0.1), ls, 0.22*side), fws, -0.12), wrR = add(add(elR, up, 0.28), fws, -0.14);
  const elT = add(add(sh, fws, 0.27), up, 0.12), wrT = add(add(sh, fws, 0.55), up, 0.02);
  const mix = (A, B, k) => add(A, sub(B, A), k);
  j[thr+'El'] = mix(mix(elH, elR, P.raise), elT, P.swing); j[thr+'Wr'] = mix(mix(wrH, wrR, P.raise), wrT, P.swing);
  J = j; return j;
}
const hand = () => J ? J[(settings.hand !== 'L' ? 'r' : 'l') + 'Wr'] : [P.x, P.y, 1];

// MediaPipe-Indizes der 33 Punkte.
const IDX = {nose:0, lSh:11, rSh:12, lEl:13, rEl:14, lWr:15, rWr:16, lHip:23, rHip:24, lKnee:25, rKnee:26, lAnk:27, rAnk:28, lHeel:29, rHeel:30, lToe:31, rToe:32};
let last = null;
function landmarks(j){
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
function drawPerson(j){
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
  if(P.ball) items.push({z:proj(hand()).z - 0.05, draw(){ ball(hand()); }});
  items.sort((a, b) => b.z - a.z).forEach(it => it.draw());
}
function ball(P3){ const p = proj(P3); if(p.z < 0.3) return; g.fillStyle = '#f2d23a'; g.strokeStyle = '#2a4fd0'; g.lineWidth = F*0.015/p.z; g.beginPath(); g.arc(p.x, p.y, F*0.095/p.z, 0, 7); g.fill(); g.stroke(); }

/* ---------- Ablauf ---------- */
let running = false, tPrev = 0;
function tick(now){
  requestAnimationFrame(tick);
  const dt = Math.min(0.05, (now - tPrev)/1000 || 0); tPrev = now;
  if(camKey !== (CAMS[settings.camPos] ? settings.camPos : 'base')) setCamera();   // Kameraposition gewechselt
  behave(dt);
  const j = joints();
  g.drawImage(bg, 0, 0);
  if(ballFly){   // Ball fliegt Richtung Tor
    ballFly.t += dt; const k = ballFly.t/0.45;
    if(k >= 1) ballFly = null; else ball(add(ballFly.p, sub([-0.9, -0.1, 1.2], ballFly.p), k));
  }
  drawPerson(j);
  last = landmarks(j);
}

// Ersatz für den MediaPipe-PoseLandmarker.
export const detector = { detectForVideo(){ return last; }, close(){} };

export function startDemo(){
  if(!running){ running = true; setCamera(); requestAnimationFrame(tick); addBar(); }
  return cv.captureStream(30);
}
export function moveCamera(){ moveIdx = (moveIdx + 1) % MOVES.length; setCamera(); }

function addBar(){
  const bar = document.createElement('div'); bar.id = 'demoBar';
  bar.innerHTML = '<span class="chip">Demo</span><button data-d="move">Kamera bewegen</button><button data-d="call">Zuruf</button><a href="./">Beenden</a>';
  bar.addEventListener('click', e => {
    if(e.target.dataset.d==='call'){ demo.calls.push(performance.now()); shoutNow(); }
    if(e.target.dataset.d==='move'){ moveCamera(); showHint('Kamera bewegt. Tippe auf „Setup“ oder „Start“: die App merkt es und justiert neu.', 4000); }
  });
  document.getElementById('stage').appendChild(bar);
}

// Zum Testen: wahre 6-m-Linie im aktuellen Kamerabild (normiert) und Abstand gespeicherter Punkte dazu (in Bildhöhen).
export function truthError(pts){
  const ref = []; for(let th=100; th<=180; th+=0.25){ const p = proj([...linePt(th), 0]); ref.push({x:p.x/W, y:p.y/H}); }
  return pts.map(p => Math.min(...ref.map(q => Math.hypot((p.x-q.x)*W/H, p.y-q.y))));
}
// Für automatische Tests. shoot(): Wurf ohne Ansage starten.
export const _test = {proj:(...a) => proj(...a), linePt, shoot(){ if(!shot) startShot(); }, autoCall(on){ autoCall = on; }};
