// Demo-Modus der Abwehr-Beinarbeit: Handy frontal vor der Person (shared/js/demo/scene.js). Die Person stellt sich hin,
// geht in die Grundposition (Beine breiter als die Schultern, tiefer, Oberkörper fast aufrecht, Arme vorn) und reagiert auf
// die Rufe. Im Wechsel: normal, falsche Richtung, zu langsam, Füße gekreuzt. Beim Heraustreten im Wechsel: richtige Stellung,
// falscher Fuß vorn, richtige Stellung, Führarm unten. Was sie wirklich getan hat, steht in demo.done (für Tests).
import { app } from './state.js';
import { cv, setView, drawFloor, joints, landmarks, drawPerson } from '../../shared/js/demo/scene.js';

const CAM = {pos:[-5, 12.6, 1.4], look:[-5, 7, 0.8]}, HOME = {x:-5, y:7};
// d: Reaktion (s), wrong: andere Richtung, cross: beim seitlichen Schritt die Füße kreuzen.
export const VARS = [{d:0.35}, {d:0.4}, {d:0.3, wrong:true}, {d:0.45}, {d:1.25}, {d:0.35, cross:true}];
const OPP = {links:'rechts', rechts:'links', raus:'zurück', zurück:'raus'};
// Bewegung im Hallen-Koordinatensystem: Person schaut zur Kamera (+y), ihre linke Seite ist −x.
const MOVE = {links:[-0.7, 0], rechts:[0.7, 0], raus:[0, 0.6], zurück:[0, -0.6]};
export const OUTS = [{}, {wrongFoot:true}, {}, {wrongArm:true}];
export const demo = {done:[]};

const P = {x:HOME.x, y:HOME.y, a:Math.PI/2, phi:0, s:0, lift:0, lf:0, rf:0, lfy:0, rfy:0, raise:0, swing:0, twist:0, lean:0.05, ball:false};
let mv = null, lastTc = null, k = 0, ko = 0, last = null, running = false, tPrev = 0, pose = null;
// Stellung: base = Grundposition (parallel, breit), out = herausgetreten {lead, foot, arm}.
function setPose(p){ pose = p; }

function behave(dt){
  const low = app.state==='stance' || app.state==='cmd' || app.state==='gap';
  P.lift += ((low ? -0.13 : 0) - P.lift)*Math.min(1, dt*6);   // Grundstellung: tiefer
  P.lean = low ? 0.1 : 0.05;   // Oberkörper fast aufrecht
  P.guard = low ? {l:-0.22, r:-0.22} : null;   // Arme leicht angewinkelt in Vorhalte (Brusthöhe)
  if(low && !pose) setPose({kind:'base'});
  if(app.state==='cmd' && app.tc !== lastTc){
    lastTc = app.tc; const v = VARS[k++ % VARS.length], did = v.wrong ? OPP[app.cmd] : app.cmd;
    mv = {...v, did, cross:!!v.cross && MOVE[did][0] !== 0, t:0, from:[P.x, P.y], to:[P.x + MOVE[did][0], P.y + MOVE[did][1]]};   // kreuzen nur seitlich
    const rec = {tc:app.tc, cmd:app.cmd, did, d:v.d, cross:mv.cross};
    if(did === 'raus' && app.cmd === 'raus'){   // gerufenes Heraustreten: Fuß und Führarm auf der Wurfarmseite (oder absichtlich falsch)
      const o = OUTS[ko++ % OUTS.length], lead = app.cmdOpp === 'L' ? 'r' : 'l', other = lead === 'l' ? 'r' : 'l';
      mv.out = {foot:o.wrongFoot ? other : lead, arm:o.wrongArm ? null : lead};
      if(v.d < 1) rec.stance = {foot:!o.wrongFoot, arm:!o.wrongArm, lead};   // zu spät: Stellung erst nach dem Auswertefenster
    } else mv.out = null;
    demo.done.push(rec);
  }
  if(app.state==='off'){ mv = null; pose = null; Object.assign(P, {x:HOME.x, y:HOME.y, lfy:0, rfy:0, lf:0, rf:0, lfx:0, rfx:0}); }
  applyPose();
  if(!mv) return;
  // Echte Zeit seit dem Ruf (nicht die Summe der Bild-Schritte): bei ruckelnden Bildern bleibt die Reaktion genau.
  mv.t = performance.now()/1000 - app.tc; const u = Math.min(1, Math.max(0, (mv.t - mv.d)/0.45));
  P.x = mv.from[0] + (mv.to[0] - mv.from[0])*u; P.y = mv.from[1] + (mv.to[1] - mv.from[1])*u;
  P.lf = 0.06*Math.max(0, Math.sin(u*Math.PI*2)); P.rf = 0.06*Math.max(0, -Math.sin(u*Math.PI*2));
  if(mv.cross) P.lfy = 0.4*Math.sin(u*Math.PI);   // linker Fuß über den rechten
  if(u >= 1){ setPose(mv.out ? {kind:'out', ...mv.out} : {kind:'base'}); mv = null; }
}
// Füße und Arme nach der Stellung setzen (Füße als Versatz: lfx/rfx nach vorn = Richtung Kamera, lfy/rfy zur Seite).
function applyPose(){
  if(!pose || app.state==='off' || app.state==='calib'){ P.lfx = P.rfx = 0; P.lfy = P.rfy = 0; return; }
  if(pose.kind === 'base'){ P.lfx = P.rfx = 0; P.lfy = -0.12; P.rfy = 0.12; return; }   // parallel, gut schulterbreit
  P.lfy = -0.04; P.rfy = 0.04;
  P.lfx = pose.foot === 'l' ? 0.3 : -0.1; P.rfx = pose.foot === 'r' ? 0.3 : -0.1;   // versetzte Fußstellung
  if(pose.arm) P.guard = {[pose.arm]:0.0, [pose.arm === 'l' ? 'r' : 'l']:-0.3};   // Führarm auf Schulterhöhe, Sicherungsarm tiefer
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
