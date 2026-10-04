// Demo-Modus des Außenwurf-Coachs: Halle und Person kommen aus shared/js/demo/scene.js, hier steht das Verhalten.
// Liefert einen Videostream statt der Kamera und Körperpunkte im MediaPipe-Format statt der KI. Einrichtung,
// Linienerkennung und Wurf-Analyse laufen unverändert. Die Person reagiert auf die Ansagen der App: Linie ablaufen,
// in den Torraum gehen, Würfe.
import { app } from '../state.js';
import { settings } from '../store.js';
import { wizard } from '../lineWizard.js';
import { showHint } from '../dom.js';
import { shoutNow } from '../shout.js';
import { RR } from '../config.js';
import { W, H, cv, D2R, linePt, add, sub, setView, proj, drawFloor, joints as rig, landmarks, drawPerson, ball, hand as handOf } from '../../../shared/js/demo/scene.js';

/* ---------- Kamera: Position der Einstellung „camPos“ (siehe CAM_POS in config.js) ---------- */
// base: erhöht auf der Grundlinie zwischen 6-m-Linie und Tor, schräg auf die Absprungzone am linken Flügel.
// court: im Feld hinter dem 7-m-Punkt, zur anderen Seite versetzt; Tor und Absprungzone im Bild.
// rr (Rückraum-Modus): schräg von vorn (am Torraum) auf den Rückraum links, der Spieler läuft auf die Kamera zu.
const CAMS = RR ? {base:{pos:[-3.6, 3.2, 2.2], look:[-7.6, 9.6, 0.3]}}
  : {base:{pos:[-3.4, -2.4, 2.2], look:[-6.6, 3.0, 0.2]}, court:{pos:[2.5, 10.5, 2.0], look:[-3.5, 2.3, 0.5]}};
// Linie und Wege: Außen am 6-m-Bogen (Winkel 150° = linker Flügel), Rückraum am 9-m-Bogen (125° = Rückraum links).
// walk: Winkel beim Linie-Ablaufen von … bis, inside: Radius für „in den Torraum / Richtung Tor“.
const G = RR ? {R:9, th:125, start:13.3, walk:[150, 110], inside:7.6} : {R:6, th:150, start:8.7, walk:[172, 128], inside:5.1};
const onLine = (th, dr = 0) => linePt(th, G.R + dr);
const MOVES = [[0, 0, 0], [0.3, 0.15, 4], [-0.25, 0.1, -3.5]];   // dx, dy (m), Schwenk (°) für „Kamera bewegen“
let moveIdx = 0, camKey = null;
function setCamera(){
  camKey = CAMS[settings.camPos] ? settings.camPos : 'base';
  setView(CAMS[camKey].pos, CAMS[camKey].look, MOVES[moveIdx]);
}

/* ---------- Person ---------- */
// Anlauf-Start (Flügel bzw. Rückraum). Im Rückraum liegt er 4,7 m vor dem Absprungpunkt des nächsten Wurfs (drei Schritte).
const RUN_RR = 4.7;
let S = RR ? onLine(G.th, 0.4 + RUN_RR) : linePt(G.th, G.start), faceTo = onLine(G.th, RR ? 0.4 : 0);   // Blick beim Warten: Absprungpunkt
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
export const demo = {calls:[], shots:[]};   // Zeitpunkte der Zurufe (für Tests)

// Verhalten: reagiert auf die Ansagen der App wie ein Mensch, der zuhört.
function behave(dt){
  if(shot){ shotStep(dt); return; }
  P.lift = 0; P.lf = P.rf = 0; P.raise = Math.max(0, P.raise - dt*3); P.swing = 0; P.twist = 0; P.ball = true; P.low = 0;
  const ph = wizard.phase;
  const [w0, w1] = G.walk;
  if(ph==='wait'){ walkTh = null; const A = onLine(w0); if(moveTo(A, 1.3, dt)) stand(dt, toward(onLine(w0 - 12))); return; }
  if(ph==='walk'){
    if(walkTh===null) walkTh = w0;
    if(walkTh > w1){
      walkTh = Math.max(w1, walkTh - dt*0.7/G.R/D2R);
      const p = onLine(walkTh), wob = 0.03*Math.sin(walkTh*0.9);
      const th = walkTh*D2R; P.x = p[0] + Math.cos(th)*wob; P.y = p[1] + Math.sin(th)*wob;
      P.a = Math.atan2(-Math.cos(th), Math.sin(th)); P.s = Math.min(1, P.s + dt*4); P.phi += dt*0.7/0.6*Math.PI;
    } else stand(dt);
    return;
  }
  if(ph==='inside'){ const T = linePt(walkTh ?? w1, G.inside); if(moveTo(T, 0.8, dt, 0.6)) stand(dt); return; }
  if(app.state==='runup' && !app.marking){ called = false; startShot(); return; }
  // Gegenstoß: weit weg starten (11 m vor der Linie) und beim Loslaufen rufen.
  const fb = app.task?.id==='fastbreak' && !app.task.done, home = fb ? onLine(G.th, 11) : S;
  if(moveTo(home, app.state==='cool' ? 3 : 1.4, dt)){
    stand(dt, toward(faceTo));
    if(fb && app.state==='ready' && !called){ readyFor += dt; if(readyFor > 0.6){ called = true; demo.calls.push(performance.now()); shoutNow(); } }
    // Modus „Zuruf“: am Startpunkt kurz stehen, dann rufen (einmal pro Wurf).
    if(app.state==='ready' && settings.mode==='call' && !called && autoCall){ readyFor += dt; if(readyFor > 0.8){ called = true; demo.calls.push(performance.now()); shoutNow(); showHint('Demo: Spieler ruft „Hey!“', 1200); } }
  }
  if(app.state!=='ready') readyFor = 0;
}

// Sprungwurf: Anlauf, Absprung links (Rechtshänder), Ausholen, Drehung, Wurf, Landung.
// Ab und zu ein Fehler: Übertritt, flacher Sprung, Arm unten.
// dr: Absprung so weit außerhalb der Linie (m, − = innerhalb), h: Sprunghöhe, arm: Wurfarm oben (0–1).
const VAR = [{dr:0.3, h:0.5, arm:1}, {dr:0.25, h:0.45, arm:1}, {dr:-0.15, h:0.45, arm:1}, {dr:0.3, h:0.28, arm:0.45}];
// Rückraum: gut, vier statt drei Schritte (kürzere Schritte), innerhalb der 9 m, Abwurf zu spät (schon im Fallen).
// steps: Schritte im Anlauf (der letzte setzt das Sprungbein auf).
export const VAR_RR = [{dr:0.4, h:0.5, arm:1, steps:3}, {dr:0.4, h:0.5, arm:1, steps:4}, {dr:-0.35, h:0.5, arm:1, steps:3}, {dr:0.4, h:0.5, arm:1, steps:3, swingAt:0.72}];
// Eigene Wurf-Folgen je Aufgabe (settings.task), damit Tests wissen, was herauskommen muss.
// line: nah an der Linie (geschafft), zu weit weg, Übertritt, nah.
// height: folgt der Ansage „Hoch“/„Hüfte“ (follow) oder macht absichtlich das Gegenteil. tired: Sprung wird ab Wurf 3 flacher.
export const TASK_VAR = {line:[{dr:0.25, h:0.5, arm:1}, {dr:1.0, h:0.5, arm:1}, {dr:-0.15, h:0.45, arm:1}, {dr:0.35, h:0.45, arm:1}],
  height:[{dr:0.3, h:0.5, arm:1, follow:true}, {dr:0.3, h:0.5, arm:1, follow:true}, {dr:0.3, h:0.5, arm:1, follow:false}, {dr:0.3, h:0.5, arm:1, follow:true}],
  // fastbreak: aus 11 m Entfernung, schnell (v m/s), langsam, schnell, Übertritt.
  fastbreak:[{dr:0.3, h:0.5, arm:1, v:5.5}, {dr:0.3, h:0.5, arm:1, v:2.0}, {dr:0.3, h:0.5, arm:1, v:5.5}, {dr:-0.15, h:0.45, arm:1, v:5.5}],
  // angle: Flug Richtung Tormitte (in), geradeaus, Richtung Tormitte, Übertritt.
  angle:[{dr:0.3, h:0.5, arm:1, fly:'in'}, {dr:0.3, h:0.5, arm:1}, {dr:0.3, h:0.5, arm:1, fly:'in'}, {dr:-0.15, h:0.5, arm:1, fly:'in'}],
  tired:[{dr:0.3, h:0.5, arm:1}, {dr:0.3, h:0.5, arm:1}, {dr:0.3, h:0.32, arm:1}, {dr:0.3, h:0.3, arm:1}]};
function startShot(){
  const vs = (app.task && TASK_VAR[app.task.id]) || (RR ? VAR_RR : VAR), v = {...vs[shotNo++ % vs.length]};
  if(v.follow !== undefined){ const hip = app.task?.call === 'Hüfte'; v.low = (hip === v.follow) ? 1 : 0; if(v.low) v.arm = 0.35; }
  const s0 = v; shot = {...v, stage:'run', t:0, K:onLine(G.th, v.dr)};
  demo.shots.push({from:[+P.x.toFixed(2), +P.y.toFixed(2)], v});
  if(RR && !app.task){ const nx = VAR_RR[shotNo % VAR_RR.length]; S = onLine(G.th, nx.dr + RUN_RR); faceTo = onLine(G.th, nx.dr); }
  if(RR && s0.steps){ const L = Math.hypot(shot.K[0]-P.x, shot.K[1]-P.y); Object.assign(shot, {from:[P.x, P.y], L, T:L/3.2, a:Math.atan2(shot.K[1]-P.y, shot.K[0]-P.x), ft:[0, 0]}); }
}
function shotStep(dt){
  const s = shot; s.t += dt;
  const R = settings.hand !== 'L';
  if(s.stage==='run' && s.T){ stepRun(s, dt, R); return; }
  if(s.stage==='run'){
    const d = Math.hypot(s.K[0]-P.x, s.K[1]-P.y);
    P.raise = Math.min(s.arm, Math.max(P.raise, 1.4 - d));   // Arm hoch in den letzten Schritten
    const arrived = moveTo(s.K, s.v || 3.2, dt, s.stride || 1.3);
    // Letzter Schritt: Sprungbein (links bei Rechtshand) steht, Schwungbein-Knie kommt hoch.
    if(d < 0.8){ P.phi = R ? Math.PI : 0; const k = 0.3*(1 - d/0.8); if(R) P.rf = k; else P.lf = k;
    }
    // fly 'in': im Sprung entlang der Linie nach innen (Richtung Tormitte), sonst geradeaus weiter.
    if(arrived){ s.stage = 'air'; s.t = 0; s.dir = s.fly==='in' ? Math.atan2(-Math.cos(G.th*D2R), Math.sin(G.th*D2R)) : P.a; s.T = 0.38 + s.h*0.5; P.s = 0; }
    return;
  }
  if(s.stage==='air'){
    const u = Math.min(1, s.t/s.T);
    P.lift = 4*s.h*u*(1-u);
    P.lf = P.lift*0.85; P.rf = P.lift*0.85 + 0.3*(1-u) + 0.2*Math.sin(Math.PI*u);   // Schwungbein hoch
    if(!R){ [P.lf, P.rf] = [P.rf, P.lf]; }
    P.x += Math.cos(s.dir)*1.6*dt; P.y += Math.sin(s.dir)*1.6*dt;
    P.raise = s.arm; P.low = s.low || 0;
    const sa = s.swingAt ?? 0.45;   // ab hier wird geworfen (Anteil der Flugzeit)
    P.swing = u < sa ? 0 : Math.min(1, (u-sa)/0.22);
    P.twist = (u < sa ? 0.55*Math.min(1, u/0.2) : 0.55 - 0.9*Math.min(1, (u-sa)/0.25)) * (R ? 1 : -1);
    if(P.swing > 0.8 && P.ball){ P.ball = false; ballFly = {p:hand(), t:0}; }
    if(u >= 1){ s.stage = 'land'; s.t = 0; P.lift = P.lf = P.rf = 0; }
    return;
  }
  if(s.stage==='land'){
    P.swing = Math.max(0, 1 - s.t*2); P.raise = Math.max(0, s.arm - s.t*2); P.twist *= 0.9;
    if(s.t > 0.6 && app.state!=='air' && app.state!=='runup'){ shot = null; P.ball = true; P.low = 0; }
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

// Rückraum-Anlauf mit echten Schritten: die Füße stehen fest am Boden, je Schritt schwingt einer nach vorn
// (Sprungbein zuletzt). Der Körper läuft gleichmäßig zum Absprungpunkt K. Füße als Versatz entlang der Laufrichtung (lfx/rfx).
function stepRun(s, dt, R){
  const u = Math.min(s.L, s.t*3.2), N = s.steps, sl = s.L/N, PL = 0.15, tk = (s.T - PL)/N;   // PL: Stand auf dem Sprungbein
  const take = R ? 0 : 1, other = 1 - take;
  if(s.t < N*tk){
    const k = Math.floor(s.t/tk), f = (s.t - k*tk)/tk, sw = (N - 1 - k) % 2 === 0 ? take : other;   // der letzte Schritt ist das Sprungbein
    if(s.k !== k){ if(s.k !== undefined) s.ft[s.sw] = (s.k + 1)*sl; s.k = k; s.sw = sw; s.ft0 = s.ft[sw]; }
    s.ft[sw] = s.ft0 + ((k + 1)*sl - s.ft0)*f;
    P.lf = sw===0 ? 0.15*Math.sin(Math.PI*f) : 0; P.rf = sw===1 ? 0.15*Math.sin(Math.PI*f) : 0;
  } else {
    // Sprungbein steht, das Schwungbein-Knie kommt nach vorn und hoch.
    if(s.k !== N){ s.ft[s.sw] = s.L; s.k = N; s.ft0 = s.ft[other]; }
    const f = Math.min(1, (s.t - N*tk)/PL);
    s.ft[other] = s.ft0 + (s.L + 0.2 - s.ft0)*f;
    P[take ? 'rf' : 'lf'] = 0; P[other ? 'rf' : 'lf'] = 0.3*f;
  }
  P.a = s.a; P.s = 0; P.x = s.from[0] + Math.cos(s.a)*u; P.y = s.from[1] + Math.sin(s.a)*u;
  P.lfx = s.ft[0] - u; P.rfx = s.ft[1] - u;
  const d = s.L - u; P.raise = Math.min(s.arm, Math.max(P.raise, 1.4 - d));
  if(s.t >= s.T){ P.lfx = P.rfx = 0; P.lf = P.rf = 0; s.stage = 'air'; s.t = 0; s.dir = P.a; s.T = 0.38 + s.h*0.5; }
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
  bar.innerHTML = `<span class="chip">Demo</span><button data-d="move">Kamera bewegen</button><button data-d="call">Zuruf</button><a href="${RR ? './?rr=1' : './'}">Beenden</a>`;
  bar.addEventListener('click', e => {
    if(e.target.dataset.d==='call'){ demo.calls.push(performance.now()); shoutNow(); }
    if(e.target.dataset.d==='move'){ moveCamera(); showHint('Kamera bewegt. Tippe auf „Setup“ oder „Start“: die App merkt es und justiert neu.', 4000); }
  });
  document.getElementById('stage').appendChild(bar);
}

// Zum Testen: wahre 6-m-Linie im aktuellen Kamerabild (normiert) und Abstand gespeicherter Punkte dazu (in Bildhöhen).
export function truthError(pts){
  const ref = []; for(let th=95; th<=180; th+=0.25){ const p = proj([...onLine(th), 0]); ref.push({x:p.x/W, y:p.y/H}); }
  return pts.map(p => Math.min(...ref.map(q => Math.hypot((p.x-q.x)*W/H, p.y-q.y))));
}
// Für automatische Tests. shoot(): Wurf ohne Ansage starten.
export const _test = {proj:(...a) => proj(...a), linePt, shoot(){ if(!shot) startShot(); }, autoCall(on){ autoCall = on; }};
