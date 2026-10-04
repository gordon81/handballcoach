// Demo-Modus des 7-m-Trainers: gezeichnete Halle (shared/js/demo/scene.js), Kamera schräg hinter der 7-m-Linie,
// eine Person steht hinter der Linie und wirft nach dem Pfiff. Würfe im Wechsel:
// sauber (1,2 s), zu langsam (3,4 s), Linie übertreten, beide Füße in der Luft (Hüpfer nach vorn).
// Pause mit Zuruf (Einstellung „rest“): die Person holt den Ball und ruft (shoutNow), siehe REST_VARS.
import { app, settings } from './state.js';
import { shoutNow } from './restCtl.js';
import { cv, setView, proj, drawFloor, joints, landmarks, drawPerson, ball, add, sub, hand } from '../../shared/js/demo/scene.js';

const CAM = {pos:[4.2, 10.6, 1.7], look:[-0.3, 7.0, 0.5]};
const HOME = {x:0.1, y:7.75};
// t: Wurf so viele Sekunden nach dem Pfiff. step: vorderer Fuß rutscht nach vorn (m), hop: beide Füße (m).
export const VARS = [{t:1.2}, {t:3.4}, {t:1.4, step:0.35}, {t:1.3, hop:0.05}];
// Pausen im Wechsel, calls = Rufe in s ab Pausenbeginn: an der Linie (bereit) | unterwegs (anhalten), unterwegs (weiter),
// an der Linie (bereit) | gar nicht (Zähler läuft ab; ohne Zähler ruft sie bei `late` s doch).
export const REST_VARS = [{calls:[7.3]}, {calls:[2.0, 5.0, 7.3]}, {calls:[], late:7.3}];
const FETCH = {d:3, walk:2.4, pick:0.6, back:7};   // Ball 3 m vor der Linie holen: hin, aufheben, zurück; ab `back` s ruhig
const P = {x:HOME.x, y:HOME.y, a:-Math.PI/2, phi:0, s:0, lift:0, lf:0, rf:0, lfx:0.3, rfx:-0.25, raise:0, swing:0, twist:0, lean:0.05, ball:true};
let rest = null, restNo = 0, shot = null, shotNo = 0, ballFly = null, last = null, running = false, tPrev = 0;
const R = () => settings.hand !== 'L';

export function resetDemo(){ shot = null; shotNo = 0; rest = null; restNo = 0; reset(); }
function reset(){ Object.assign(P, {x:HOME.x, y:HOME.y, lift:0, lf:0, rf:0, lfx:R() ? 0.3 : -0.25, rfx:R() ? -0.25 : 0.3, raise:0, swing:0, twist:0, ball:true}); }
function behave(dt){
  if(app.state==='off'){ shot = null; shotNo = 0; rest = null; restNo = 0; reset(); return; }
  if(app.state==='go') rest = null;
  else if(!shot && (app.rest || rest)){ fetchBall(dt); return; }
  if(app.state==='go' && !shot && app.whistleAt != null){ shot = {...VARS[shotNo++ % VARS.length], t0:0}; }
  if(!shot){ if(app.state!=='go') reset(); return; }
  shot.t0 += dt; const u = shot.t0, front = R() ? 'lfx' : 'rfx';
  P.raise = Math.min(1, Math.max(0, (u - (shot.t - 0.6))/0.4));
  P.swing = Math.min(1, Math.max(0, (u - shot.t + 0.04)/0.08));   // Abwurf schnell wie in echt (Hand ~10 m/s)
  P.twist = (R() ? 1 : -1)*(0.4*P.raise - 0.8*P.swing);
  if(shot.step && u > shot.t - 0.4) P[front] = 0.3 + shot.step*Math.min(1, (u - shot.t + 0.4)/0.2);
  if(shot.hop && u > shot.t - 0.5){ const k = Math.min(1, (u - shot.t + 0.5)/0.2); P.y = HOME.y - shot.hop*k; P.lift = 0.2*Math.sin(Math.PI*k); P.lf = P.rf = P.lift; }   // beide Füße vom Boden
  if(P.swing > 0.8 && P.ball){ P.ball = false; ballFly = {p:hand(R()), t:0}; }
  if(u > shot.t + 1.5 && app.state!=='go'){ shot = null; reset(); }
}

// Pause: zum Ball gehen, aufheben, zurück hinter die Linie, ruhig stehen und rufen.
function fetchBall(dt){
  if(!rest) rest = {...REST_VARS[restNo++ % REST_VARS.length], u:0, fired:0};
  const u = rest.u += dt, {d, walk, pick, back} = FETCH, v = d/walk;
  reset(); P.a = -Math.PI/2; P.s = 0; P.lean = 0.05;
  if(u < 0.8 || u >= back){ /* steht hinter der Linie */ }
  else if(u < 0.8 + walk){ P.y = HOME.y - v*(u - 0.8); P.s = 1; P.phi += dt*v/0.6*Math.PI; P.ball = false; }
  else if(u < 0.8 + walk + pick){ P.y = HOME.y - d; P.lean = 0.45*Math.sin(Math.PI*(u - 0.8 - walk)/pick); P.ball = u > 0.8 + walk + pick/2; }
  else if(u < 0.8 + 2*walk + pick){ P.a = Math.PI/2; P.y = HOME.y - d + v*(u - 0.8 - walk - pick); P.s = 1; P.phi += dt*v/0.6*Math.PI; }
  const calls = rest.calls.length || app.rest?.len != null ? rest.calls : [rest.late];
  while(rest.fired < calls.length && u >= calls[rest.fired]){ rest.fired++; shoutNow(); }
}

function tick(now){
  requestAnimationFrame(tick);
  const dt = Math.min(0.05, (now - tPrev)/1000 || 0); tPrev = now;
  behave(dt);
  const j = joints(P, R());
  drawFloor();
  if(ballFly){ ballFly.t += dt; const k = ballFly.t/0.4; if(k >= 1) ballFly = null; else ball(add(ballFly.p, sub([0.6, 0.0, 1.6], ballFly.p), k)); }
  drawPerson(j, P, R());
  last = landmarks(j);
}

export const detector = { detectForVideo(){ return last; }, close(){} };
export function startDemo(){
  if(!running){ running = true; setView(CAM.pos, CAM.look); requestAnimationFrame(tick); }
  return cv.captureStream(30);
}
// Für Tests: wahre Lage der 7-m-Linie und ein Punkt Richtung Tor, normiert (0–1).
export function truthLine(){
  const n = p => { const q = proj(p); return {x:q.x/cv.width, y:q.y/cv.height}; };
  return {a:n([-0.5, 7, 0]), b:n([0.5, 7, 0]), goal:n([0, 5.5, 0])};
}
