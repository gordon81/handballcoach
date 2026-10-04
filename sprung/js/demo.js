// Demo-Modus Sprungkraft: Handy frontal, die Person springt auf der Stelle, solange gesprungen werden soll.
// Beidbeinig: Höhen aus HB (m, leicht nachlassend). Einbein: das gerade verlangte Bein steht, das andere ist angezogen;
// links springt sie niedriger als rechts (HL / HR). Was sie tat, steht in demo.done.
import { app, settings } from './state.js';
import { cv, setView, drawFloor, joints, landmarks, drawPerson } from '../../shared/js/demo/scene.js';

const CAM = {pos:[-5, 12.6, 1.3], look:[-5, 7, 0.8]};
export const HB = [0.38, 0.36, 0.37, 0.34, 0.35, 0.33, 0.34, 0.32, 0.31, 0.3], HL = 0.18, HR = 0.24;
export const demo = {done:[]};
const P = {x:-5, y:7, a:Math.PI/2, phi:0, s:0, lift:0, lf:0, rf:0, raise:0, swing:0, twist:0, lean:0.05, ball:false};
let jump = null, k = 0, nextAt = 0, last = null, running = false;

function behave(now){
  const t = now/1000, go = app.state==='go';
  const single = settings.ex==='single' && go, up = single ? (app.leg==='l' ? 'rf' : 'lf') : null;   // angezogenes Bein
  if(!go){ jump = null; P.lift = 0; P.lf = P.rf = 0; return; }
  if(!jump && t >= nextAt){
    const h = single ? (app.leg==='l' ? HL : HR) : HB[k++ % HB.length], T = 2*Math.sqrt(2*h/9.81);   // Flugzeit aus der Höhe
    jump = {t0:t, h, T}; demo.done.push({h, leg:single ? app.leg : 'both'});
  }
  P.lf = P.rf = 0;
  if(jump){
    const u = (t - jump.t0)/jump.T;
    P.lift = u < 1 ? 4*jump.h*u*(1 - u) : 0;
    if(u >= 1){ jump = null; nextAt = t + 0.3; }   // Bodenkontakt 0,3 s
  }
  P.lf = P.lift; P.rf = P.lift;
  if(up) P[up] = P.lift + 0.3;
}
function tick(now){
  requestAnimationFrame(tick);
  behave(now);
  const j = joints(P, true);
  drawFloor(); drawPerson(j, P, true);
  last = landmarks(j);
}
export const detector = { detectForVideo(){ return last; }, close(){} };
export function startDemo(){
  if(!running){ running = true; setView(CAM.pos, CAM.look); requestAnimationFrame(tick); }
  return cv.captureStream(30);
}
