// Demo-Modus „Pässe gegen die Wand“: Kamera seitlich, die Person steht 4 m vor der Hallenwand (im Bild links) und passt,
// solange die Runde läuft. Der Aufprall an der Wand wird direkt gemeldet (onImpact), statt ihn per Mikro zu hören.
// Würfe im Wechsel: sauber, sauber, Arm unten (aus der Hüfte), falsches Bein vorn. Was sie tat, steht in demo.done.
import { app } from './state.js';
import { cv, setView, drawFloor, joints, landmarks, drawPerson, ball, add, sub, hand } from '../../shared/js/demo/scene.js';

const CAM = {pos:[-11.6, -0.5, 1.5], look:[-11.9, 6, 0.9]}, HOME = {x:-10.2, y:6}, WALL = -14;
export const VARS = [{}, {}, {low:true}, {wrongFoot:true}];
export const demo = {done:[]};
let onImpact = () => {};
export function setImpactHandler(fn){ onImpact = fn; }

const P = {x:HOME.x, y:HOME.y, a:Math.PI, phi:0, s:0, lift:0, lf:0, rf:0, lfx:0.25, rfx:-0.2, raise:0, swing:0, twist:0, lean:0.05, ball:true, low:0};
let th = null, k = 0, fly = null, last = null, running = false, tPrev = 0, nextAt = 0;
const R = true;

function behave(now){
  if(app.state!=='run'){ th = null; fly = null; P.ball = true; P.raise = P.swing = P.twist = P.low = 0; return; }
  const t = now/1000;
  if(!th && !fly && t >= nextAt){ th = {...VARS[k++ % VARS.length], t0:t}; P.lfx = th.wrongFoot ? -0.2 : 0.25; P.rfx = th.wrongFoot ? 0.25 : -0.2; }
  if(th){
    const u = t - th.t0;
    P.low = th.low ? 1 : 0;
    P.raise = th.low ? 0 : Math.min(1, u/0.3);   // Hüftwurf: Hand bleibt unten
    P.swing = Math.min(1, Math.max(0, (u - 0.35)/(th.low ? 0.06 : 0.1)));   // Hüftwurf: kürzerer Weg, schneller
    P.twist = 0.4*Math.min(1, u/0.3) - 0.8*P.swing;
    if(P.swing > 0.8 && P.ball){ P.ball = false; fly = {p:hand(R), t0:t, hit:false}; demo.done.push({low:!!th.low, wrongFoot:!!th.wrongFoot}); }
    if(u > 0.7){ th = null; P.raise = P.swing = P.twist = 0; }
  }
  if(fly){
    const u = t - fly.t0, wall = [WALL, HOME.y - 0.3, 1.6];
    if(u < 0.3){ fly.pos = add(fly.p, sub(wall, fly.p), u/0.3); }
    else { if(!fly.hit){ fly.hit = true; onImpact(performance.now()/1000); } const back = (u - 0.3)/0.4; fly.pos = add(wall, sub([HOME.x - 0.4, HOME.y, 1.2], wall), Math.min(1, back)); }
    if(u > 0.7){ fly = null; P.ball = true; nextAt = t + 0.35; }
  }
}
function tick(now){
  requestAnimationFrame(tick);
  behave(now);
  const j = joints(P, R);
  drawFloor(); if(fly?.pos) ball(fly.pos); drawPerson(j, P, R);
  last = landmarks(j);
}
export const detector = { detectForVideo(){ return last; }, close(){} };
export function startDemo(){
  if(!running){ running = true; setView(CAM.pos, CAM.look); requestAnimationFrame(tick); }
  return cv.captureStream(30);
}
