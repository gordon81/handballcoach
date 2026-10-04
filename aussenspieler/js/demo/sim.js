// Demo-Modus des Außenwurf-Coachs: Halle und Person kommen aus shared/js/demo/scene.js, hier steht das Verhalten.
// Liefert einen Videostream statt der Kamera und Körperpunkte im MediaPipe-Format statt der KI. Einrichtung,
// Linienerkennung und Wurf-Analyse laufen unverändert. Die Person reagiert auf die Ansagen der App: Linie ablaufen,
// in den Torraum gehen, Würfe.
import { app } from '../state.js';
import { settings } from '../store.js';
import { wizard } from '../lineWizard.js';
import { showHint } from '../dom.js';
import { shoutNow } from '../shout.js';
import { W, H, cv, D2R, linePt, add, sub, setView, proj, drawFloor, joints as rig, landmarks, drawPerson, ball, hand as handOf } from '../../../shared/js/demo/scene.js';

/* ---------- Kamera: Position der Einstellung „camPos“ (siehe CAM_POS in config.js) ---------- */
// base: erhöht auf der Grundlinie zwischen 6-m-Linie und Tor, schräg auf die Absprungzone am linken Flügel.
// court: im Feld hinter dem 7-m-Punkt, zur anderen Seite versetzt; Tor und Absprungzone im Bild.
const CAMS = {base:{pos:[-3.4, -2.4, 2.2], look:[-6.6, 3.0, 0.2]}, court:{pos:[2.5, 10.5, 2.0], look:[-3.5, 2.3, 0.5]}};
const MOVES = [[0, 0, 0], [0.3, 0.15, 4], [-0.25, 0.1, -3.5]];   // dx, dy (m), Schwenk (°) für „Kamera bewegen“
let moveIdx = 0, camKey = null;
function setCamera(){
  camKey = CAMS[settings.camPos] ? settings.camPos : 'base';
  setView(CAMS[camKey].pos, CAMS[camKey].look, MOVES[moveIdx]);
}

/* ---------- Person ---------- */
const S = linePt(150, 8.7);                     // Anlauf-Start am Flügel
const P = {x:S[0], y:S[1], a:-0.7, phi:0, s:0, lift:0, lf:0, rf:0, raise:0, swing:0, twist:0, lean:0.08, ball:true};
let walkTh = null, shot = null, shotNo = 0, ballFly = null, last = null;
const rightHand = () => settings.hand !== 'L';
const hand = () => handOf(rightHand());

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

/* ---------- Ablauf ---------- */
let running = false, tPrev = 0;
function tick(now){
  requestAnimationFrame(tick);
  const dt = Math.min(0.05, (now - tPrev)/1000 || 0); tPrev = now;
  if(camKey !== (CAMS[settings.camPos] ? settings.camPos : 'base')) setCamera();   // Kameraposition gewechselt
  behave(dt);
  const j = rig(P, rightHand());
  drawFloor();
  if(ballFly){   // Ball fliegt Richtung Tor
    ballFly.t += dt; const k = ballFly.t/0.45;
    if(k >= 1) ballFly = null; else ball(add(ballFly.p, sub([-0.9, -0.1, 1.2], ballFly.p), k));
  }
  drawPerson(j, P, rightHand());
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
