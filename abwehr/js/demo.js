// Demo-Modus der Abwehr-Beinarbeit: Handy frontal vor der Person (shared/js/demo/scene.js). Die Person stellt sich hin,
// geht in die Grundstellung und reagiert auf die Rufe. Im Wechsel: normal, falsche Richtung, zu langsam, Füße gekreuzt.
// Was sie wirklich getan hat, steht in demo.done (für Tests).
import { app } from './state.js';
import { cv, setView, drawFloor, joints, landmarks, drawPerson } from '../../shared/js/demo/scene.js';

const CAM = {pos:[-5, 12.6, 1.4], look:[-5, 7, 0.8]}, HOME = {x:-5, y:7};
// d: Reaktion (s), wrong: andere Richtung, cross: beim seitlichen Schritt die Füße kreuzen.
export const VARS = [{d:0.35}, {d:0.4}, {d:0.3, wrong:true}, {d:0.45}, {d:1.25}, {d:0.35, cross:true}];
const OPP = {links:'rechts', rechts:'links', raus:'zurück', zurück:'raus'};
// Bewegung im Hallen-Koordinatensystem: Person schaut zur Kamera (+y), ihre linke Seite ist −x.
const MOVE = {links:[-0.7, 0], rechts:[0.7, 0], raus:[0, 0.6], zurück:[0, -0.6]};
export const demo = {done:[]};

const P = {x:HOME.x, y:HOME.y, a:Math.PI/2, phi:0, s:0, lift:0, lf:0, rf:0, lfy:0, rfy:0, raise:0, swing:0, twist:0, lean:0.05, ball:false};
let mv = null, lastTc = null, k = 0, last = null, running = false, tPrev = 0;

function behave(dt){
  const low = app.state==='stance' || app.state==='cmd' || app.state==='gap';
  P.lift += ((low ? -0.13 : 0) - P.lift)*Math.min(1, dt*6);   // Grundstellung: tiefer
  P.lean = low ? 0.25 : 0.05;
  if(app.state==='cmd' && app.tc !== lastTc){
    lastTc = app.tc; const v = VARS[k++ % VARS.length], did = v.wrong ? OPP[app.cmd] : app.cmd;
    mv = {...v, did, cross:!!v.cross && MOVE[did][0] !== 0, t:0, from:[P.x, P.y], to:[P.x + MOVE[did][0], P.y + MOVE[did][1]]};   // kreuzen nur seitlich
    demo.done.push({tc:app.tc, cmd:app.cmd, did, d:v.d, cross:mv.cross});
  }
  if(app.state==='off'){ mv = null; Object.assign(P, {x:HOME.x, y:HOME.y, lfy:0, rfy:0, lf:0, rf:0}); }
  if(!mv) return;
  // Echte Zeit seit dem Ruf (nicht die Summe der Bild-Schritte): bei ruckelnden Bildern bleibt die Reaktion genau.
  mv.t = performance.now()/1000 - app.tc; const u = Math.min(1, Math.max(0, (mv.t - mv.d)/0.45));
  P.x = mv.from[0] + (mv.to[0] - mv.from[0])*u; P.y = mv.from[1] + (mv.to[1] - mv.from[1])*u;
  P.lf = 0.06*Math.max(0, Math.sin(u*Math.PI*2)); P.rf = 0.06*Math.max(0, -Math.sin(u*Math.PI*2));
  P.lfy = mv.cross ? 0.4*Math.sin(u*Math.PI) : 0;   // linker Fuß über den rechten
  if(u >= 1) mv = null;
}
function tick(now){
  requestAnimationFrame(tick);
  const dt = Math.min(0.05, (now - tPrev)/1000 || 0); tPrev = now;
  behave(dt);
  const j = joints(P, true);
  drawFloor(); drawPerson(j, P, true);
  last = landmarks(j);
}
export const detector = { detectForVideo(){ return last; }, close(){} };
export function startDemo(){
  if(!running){ running = true; setView(CAM.pos, CAM.look); requestAnimationFrame(tick); }
  return cv.captureStream(30);
}
