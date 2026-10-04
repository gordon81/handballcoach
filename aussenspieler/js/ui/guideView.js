// Anleitungsvideo: interaktiver 3D-Player für die korrekte Ausführung der Übungen im Außenwurf-Coach.
// Zeigt die simulierte Person in Lehrbild-Technik (DHB / KNSU nach QUELLEN.md).
import { $ } from '../dom.js';
import { esc } from '../../../shared/js/utils.js';
import { RR } from '../config.js';
import { settings } from '../store.js';
import { TASKS } from '../tasks.js';
import {
  W, H, linePt, setView, proj, drawFloor, joints as rig, drawPerson, ball, hand as handOf, add, sub
} from '../../../shared/js/demo/scene.js';

const CAMS = {
  base: { pos: [-3.4, -2.4, 2.2], look: [-6.6, 3.0, 0.2] },
  court: { pos: [2.5, 10.5, 2.0], look: [-3.5, 2.3, 0.5] },
  rr: { pos: [-3.6, 3.2, 2.2], look: [-7.6, 9.6, 0.3] }
};

const RINGS = {
  'Orange kurz': [-1.15, 0, 1.65],
  'Orange lang': [1.15, 0, 1.65]
};

export const GUIDE_DATA = {
  rr: {
    title: 'Rückraum-Sprungwurf: Korrekte Ausführung',
    sub: 'Lehrbild Sprungwurf aus dem Rückraum (DHB / KNSU)',
    cues: [
      '1. Drei-Schritt-Anlauf: Raumgreifender Anlauf (links–rechts–links bei Rechtshand) mit hohem Vorwärtstempo Richtung 9-m-Linie.',
      '2. Absprung vor 9 m: Kraftvoller Stemmschritt links vor der gestrichelten Linie ohne Übertritt; Umwandlung in maximale Höhe.',
      '3. Schwungbein-Kniehub: Rechtes Knie reißt explosiv nach vorn-oben zur Unterstützung der Sprunghöhe.',
      '4. Wurfauslage im Zenit: Ball beidhändig hochführen, im höchsten Punkt maximale Bogenspannung mit aufrechtem Rumpf.',
      '5. Abwurf im höchsten Punkt: Peitschenartiger Schlagwurf über den Abwehrblock genau im Zenit der Flugphase.'
    ],
    motion: { dr: 0.4, h: 0.58, speed: 3.4, swingAt: 0.48, fly: 'straight', isRR: true }
  },
  free: {
    title: 'Außen-Sprungwurf: Korrekte Ausführung',
    sub: 'Lehrbild Sprungwurf von Außen (DHB / KNSU)',
    cues: [
      '1. Anlauf: Dynamischer Drei-Schritt-Rhythmus (links–rechts–links bei Rechtshand) mit Blick auf das Tor.',
      '2. Absprung: Kraftvoller Stemmschritt links knapp (10–20 cm) vor der 6-m-Linie ohne Übertritt.',
      '3. Schwungbein: Rechtes Knie zieht explosiv nach vorn-oben zur Unterstützung der Sprunghöhe.',
      '4. Wurfauslage: Im höchsten Punkt (Zenit) voll aufgerichteter und gegen die Hüfte verwundener Oberkörper.',
      '5. Abwurf & Landung: Peitschenartiger Wurf über Kopfhöhe ins Toreck; kontrollierte Landung im Torraum.'
    ],
    motion: { dr: 0.22, h: 0.54, speed: 3.2, swingAt: 0.45, fly: 'straight' }
  },
  line: {
    title: 'Absprung an der Linie: Korrekte Ausführung',
    sub: 'Timing & Absprungpunkt am 6-m-Bogen',
    cues: [
      '1. Schrittrhythmus: Letzter Schritt als flacher Stemmschritt für maximale Vorwärts-Aufwärts-Kraft.',
      '2. Absprungfenster: Absprungfuß setzt 10–25 cm vor der Linie auf. Kein Übertritt der 6-m-Markierung.',
      '3. Kniehub: Schwungbein-Knie reißt sofort hoch, um horizontalen Schwung in Höhe umzuwandeln.',
      '4. Hoher Körperschwerpunkt: Vollständige Streckung im Sprunggelenk, Knie und Rumpf.',
      '5. Sicherer Abschluss: Ballabgabe vor dem tiefsten Punkt; weiches Abfedern bei der Landung.'
    ],
    motion: { dr: 0.18, h: 0.55, speed: 3.3, swingAt: 0.45, fly: 'straight' }
  },
  air: {
    title: 'Entscheidung in der Luft: Korrekte Ausführung',
    sub: 'Reaktionsschnelligkeit & Wurfwinkel-Auswahl im Flug',
    cues: [
      '1. Neutraler Anlauf: Anlauf und Absprung ohne Vorwegnahme der Wurfecke.',
      '2. Absprung & Übersicht: Blick fixiert im Sprung den Torwart und das Ziel.',
      '3. Wurfauslage halten: Wurfarm bleibt bis zum Zenit hochgeführt und wurfbereit.',
      '4. Späte Ecke: Handgelenk und Wurfarm peitschen erst im letzten Moment in das freie Toreck.',
      '5. Ballbeschleunigung: Schneller Armzug trotz verzögerter Entscheidung.'
    ],
    motion: { dr: 0.22, h: 0.55, speed: 3.3, swingAt: 0.52, fly: 'straight' }
  },
  height: {
    title: 'Wurfhöhe auf Ansage: Korrekte Ausführung',
    sub: 'Variabler Wurf: Über dem Kopf („Hoch“) vs. Aus der Hüfte („Hüfte“)',
    cues: [
      '• „Hoch“: Handgelenk deutlich über Kopfhöhe, hoher Ellbogen, Verwringung im Oberkörper.',
      '• „Hüfte“: Hand unter Schulterhöhe, Oberkörper neigt sich seitlich vor, Arm peitscht flach am Block vorbei.',
      '• Gleicher Anlauf: Der Abwehrspieler darf die Wurfart bis zum Absprung nicht erahnen.',
      '• Handgelenkseinsatz: Bei beiden Wurfhöhen sorgt ein aktives Abklappen des Handgelenks für Präzision.'
    ],
    motion: { dr: 0.22, h: 0.52, speed: 3.2, swingAt: 0.45, fly: 'straight', hasHeightVariant: true }
  },
  angle: {
    title: 'Winkel vergrößern: Korrekte Ausführung',
    sub: 'Flugkurve nach innen zur Vergrößerung des Wurfwinkels',
    cues: [
      '1. Anlaufbogen: Leicht geschwungener Anlauf von der Seitenlinie zur 6-m-Linie.',
      '2. Flugrichtung: Absprung aktiv in die Hallenmitte (Richtung 7-m-Punkt/Tormitte) lenken.',
      '3. Raumgewinn: Durch den Flug nach innen öffnet sich das Tor und der Wurfwinkel vergrößert sich enorm.',
      '4. Verwringung: Der Oberkörper dreht gegen die Flugrichtung wieder auf das Tor ein.',
      '5. Kein Übertritt: Trotz diagonaler Flugbahn erfolgt der Absprung sauber vor der 6-m-Linie.'
    ],
    motion: { dr: 0.25, h: 0.55, speed: 3.4, swingAt: 0.48, fly: 'in' }
  },
  fastbreak: {
    title: 'Gegenstoß auf Zeit: Korrekte Ausführung',
    sub: 'Temposprint mit flüssigem Übergang in den Sprungwurf',
    cues: [
      '1. Antritt: Explosiver Start aus der Distanz (z. B. Mittellinie) mit maximalem Tempo.',
      '2. Rhythmus: Letzte drei Schritte rhythmisch und raumgreifend zur Schrittfrequenz-Steigerung.',
      '3. Dynamischer Absprung: Vorwärtsgeschwindigkeit in weiten, dynamischen Sprung mitnehmen.',
      '4. Schneller Wurf: Ziel sofort erfassen und vor dem Bodenkontakt sauber einnetzen.',
      '5. Landung im Fluss: Weites Vorwärts-Abrollen oder Abfedern im Torraum.'
    ],
    motion: { dr: 0.28, h: 0.52, speed: 5.2, swingAt: 0.42, fly: 'straight', startDist: 11.5 }
  },
  pivot: {
    title: 'Kreisläufer: Drehen auf Ansage: Korrekte Ausführung',
    sub: '180°-Drehung an der 6-m-Linie und Wurf',
    cues: [
      '1. Ausgangsstellung: Tiefer Körperschwerpunkt, Rücken zum Tor direkt vor der 6-m-Linie.',
      '2. Blitzdrehung: Auf Zuruf (Links/Rechts) über den ballfernen Fuß um 180° zum Tor eindrehen.',
      '3. Absprung & Verwringung: Aus der Drehung vor der Linie abspringen, ohne überzutreten.',
      '4. Wurfarm oben: Hand sofort in Wurfposition führen und an den Abwehrarmen vorbei werfen.',
      '5. Fallwurf/Sprung: Abwurf vor dem Bodenkontakt, sicheres Abfangen mit den Händen.'
    ],
    motion: { dr: 0.22, h: 0.46, speed: 2.8, swingAt: 0.45, turn: 1 }
  },
  tired: {
    title: 'Serie unter Ermüdung: Korrekte Ausführung',
    sub: 'Technik-Stabilität & Sprunghöhe unter Belastung',
    cues: [
      '1. Technik-Konstanz: Auch bei Laktat und Ermüdung die identische saubere Schrittfolge einhalten.',
      '2. Kniehub beibehalten: Das Schwungbein aktiv nach oben reißen, wenn die Beine schwerer werden.',
      '3. Rumpfspannung: Oberkörper nicht müde nach vorn abknicken lassen; aufrecht im Zenit bleiben.',
      '4. Konzentration auf die Linie: Kein Übertritt trotz Erschöpfung.',
      '5. Rhythmus: Pause zwischen den Würfen zur kurzen mentalen Fokussierung nutzen.'
    ],
    motion: { dr: 0.22, h: 0.54, speed: 3.2, swingAt: 0.45, fly: 'straight' }
  }
};

let activeTaskId = 'free';
let heightVariant = 'high';   // 'high' | 'hip' für Wurfhöhe
let activeCam = 'base';
let speed = 1.0;
let playing = true;
let animId = null;
let tSim = 0;
let lastNow = 0;
let mediaRecorder = null;
let recordedChunks = [];

const rightHand = () => settings.hand !== 'L';

export function openGuide(taskId = 'free'){
  if(RR && (taskId === 'free' || !GUIDE_DATA[taskId])) taskId = 'rr';
  activeTaskId = GUIDE_DATA[taskId] ? taskId : (RR ? 'rr' : 'free');
  activeCam = RR ? 'rr' : (settings.camPos === 'court' ? 'court' : 'base');
  playing = true;
  tSim = 0;
  lastNow = performance.now();

  const sheet = $('#guideSheet');
  if(!sheet) return;
  sheet.hidden = false;

  renderInfo();
  updateCam();
  initEvents();
  startLoop();
}

export function closeGuide(){
  const sheet = $('#guideSheet');
  if(sheet) sheet.hidden = true;
  stopLoop();
  if(mediaRecorder && mediaRecorder.state === 'recording') mediaRecorder.stop();
  // Kamera auf Einstellung des Trainings zurücksetzen
  const cam = RR ? 'rr' : (CAMS[settings.camPos] ? settings.camPos : 'base');
  setView(CAMS[cam].pos, CAMS[cam].look);
}

function renderInfo(){
  const data = GUIDE_DATA[activeTaskId] || (RR ? GUIDE_DATA.rr : GUIDE_DATA.free);
  const title = $('#guideTitle'), sub = $('#guideSub'), cues = $('#guideCues');
  if(title) title.textContent = data.title;
  if(sub) sub.textContent = data.sub;
  if(cues){
    cues.innerHTML = data.cues.map(c => `<li>${esc(c)}</li>`).join('');
  }
  const hSwitch = $('#guideHeightSwitch');
  if(hSwitch){
    hSwitch.hidden = !data.motion.hasHeightVariant;
    hSwitch.querySelectorAll('button').forEach(b => {
      b.classList.toggle('on', b.dataset.hvariant === heightVariant);
    });
  }
  const camBtn = $('#guideCam');
  if(camBtn){
    camBtn.hidden = RR;
    camBtn.textContent = activeCam === 'court' ? 'Kamera 1 (Grundlinie)' : 'Kamera 2 (Feld)';
  }
}

function updateCam(){
  const c = CAMS[activeCam] || (RR ? CAMS.rr : CAMS.base);
  setView(c.pos, c.look);
}

function startLoop(){
  if(animId) cancelAnimationFrame(animId);
  lastNow = performance.now();
  const loop = now => {
    animId = requestAnimationFrame(loop);
    const dt = Math.min(0.08, (now - lastNow) / 1000 || 0);
    lastNow = now;
    if(playing){
      tSim += dt * speed;
      stepMotion();
    }
    renderFrame();
  };
  animId = requestAnimationFrame(loop);
}

function stopLoop(){
  if(animId){
    cancelAnimationFrame(animId);
    animId = null;
  }
}

// Simulierte Person & Ball für das Lehrbild
const P = {
  x: 0, y: 0, a: 0, phi: 0, s: 0,
  lift: 0, lf: 0, rf: 0, lfx: 0, rfx: 0,
  raise: 0, swing: 0, twist: 0, lean: 0.08, low: 0, ball: true
};
let ballFly = null;
let currentPhaseName = 'Anlauf';

function stepMotion(){
  const data = (GUIDE_DATA[activeTaskId] || (RR ? GUIDE_DATA.rr : GUIDE_DATA.free)).motion;
  const R = rightHand();
  const isHip = data.hasHeightVariant && heightVariant === 'hip';
  P.low = isHip ? 1 : 0;

  // Gesamtdauer einer Lehrbild-Schleife: 3.4 s
  const CYCLE = 3.4;
  const loopT = tSim % CYCLE;

  const isRR = RR || !!data.isRR;
  const R_line = isRR ? 9 : 6;
  const thBase = isRR ? 125 : 150;
  const K = linePt(thBase, R_line + data.dr);   // Absprungpunkt
  const startDist = data.startDist || (isRR ? 13.7 : 8.6);
  const S = linePt(thBase, startDist);

  // Phasen:
  // 0.0 - 1.1s: Anlauf
  // 1.1 - 1.35s: Stemmschritt / Absprung
  // 1.35 - 1.85s: Flug & Wurfauslage im Zenit
  // 1.85 - 2.15s: Peitschenwurf
  // 2.15 - 2.65s: Landung
  // 2.65 - 3.4s: Stand / Lehrbild-Freeze
  if(loopT < 1.1){
    currentPhaseName = '1. Anlauf (Drei-Schritt)';
    const u = loopT / 1.1;
    P.x = S[0] + (K[0] - S[0]) * u;
    P.y = S[1] + (K[1] - S[1]) * u;
    P.a = Math.atan2(K[1] - S[1], K[0] - S[0]);
    P.s = 1;
    P.phi = u * 4.5 * Math.PI;
    P.lift = 0; P.lf = 0; P.rf = 0;
    P.lfx = 0; P.rfx = 0;
    P.raise = Math.min(1, u * 1.2);
    P.swing = 0; P.twist = 0.1 * u;
    P.ball = true;
    ballFly = null;
  } else if(loopT < 1.35){
    currentPhaseName = '2. Absprung (Schwungbein hoch)';
    const u = (loopT - 1.1) / 0.25;
    P.x = K[0]; P.y = K[1];
    P.s = 0;
    // Sprungbein steht (links bei Rechtshand), Schwungbein (rechts) reißt hoch
    if(R){ P.lf = 0; P.rf = 0.35 * u; } else { P.rf = 0; P.lf = 0.35 * u; }
    P.lift = 0.1 * u;
    P.raise = 1;
    P.twist = 0.3 * u;
    P.ball = true;
  } else if(loopT < 1.85){
    currentPhaseName = '3. Wurfauslage im Zenit';
    const u = (loopT - 1.35) / 0.5;   // 0 .. 1 in der Flugphase vor dem Wurf
    const h = data.h || 0.52;
    P.lift = 4 * h * (u * 0.7) * (1 - u * 0.7 * 0.5);
    // Beine in der Luft
    P.lf = P.lift * 0.8;
    P.rf = P.lift * 0.8 + 0.25 * Math.sin(Math.PI * u);
    if(!R) { const tmp = P.lf; P.lf = P.rf; P.rf = tmp; }

    // Flugrichtung: bei 'in' zieht der Flug aktiv nach innen zur Tormitte
    const flyIn = data.fly === 'in';
    const fwd = flyIn ? 1.4 : 1.1;
    const side = flyIn ? -0.7 : 0;
    P.x = K[0] + Math.cos(P.a) * fwd * u + Math.sin(P.a) * side * u;
    P.y = K[1] + Math.sin(P.a) * fwd * u - Math.cos(P.a) * side * u;

    // Kreisläufer-Drehung
    if(data.turn) P.a += Math.PI * u * 0.5;

    P.raise = isHip ? 0.35 : 1.0;
    P.twist = 0.45;
    P.swing = 0;
    P.ball = true;
  } else if(loopT < 2.15){
    currentPhaseName = '4. Abwurf im höchsten Punkt';
    const u = (loopT - 1.85) / 0.3;   // Wurfzug
    P.lift = data.h || 0.52;
    P.swing = Math.min(1, u * 1.4);
    P.twist = 0.45 - 0.7 * u;
    if(P.swing > 0.6 && P.ball){
      P.ball = false;
      const targetPos = RINGS['Orange lang'] || [1.15, 0, 1.65];
      ballFly = { from: handOf(R), to: targetPos, t: 0 };
    }
  } else if(loopT < 2.65){
    currentPhaseName = '5. Sichere Landung';
    const u = (loopT - 2.15) / 0.5;
    P.lift = Math.max(0, (data.h || 0.52) * (1 - u));
    P.lf = P.lift; P.rf = P.lift;
    P.swing = Math.max(0, 1 - u * 2);
    P.raise = Math.max(0, 1 - u * 2);
    P.twist = 0;
  } else {
    currentPhaseName = '✓ Lehrbild abgeschlossen';
    P.lift = 0; P.lf = 0; P.rf = 0;
    P.raise = 0; P.swing = 0; P.twist = 0;
    P.s = 0; P.ball = true;
  }

  if(ballFly){
    ballFly.t += 0.03 * speed;
    const k = Math.min(1, ballFly.t / 0.35);
    ballFly.cur = add(ballFly.from, sub(ballFly.to, ballFly.from), k);
  }
}

function renderFrame(){
  const canvas = $('#guideCanvas');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  const R = rightHand();

  // 1. Hallenboden & Linien
  drawFloor(ctx);

  // 2. Coaching-Overlays auf dem Boden zeichnen (Absprungzone / Flugkurve)
  drawCoachingOverlays(ctx);

  // 3. Person aus Gelenken zeichnen
  const j = rig(P, R);
  drawPerson(j, P, R, ctx);

  // 4. Fliegender Ball
  if(ballFly && ballFly.cur){
    ball(ballFly.cur, ctx);
  }

  // 5. Phase-Badge im UI aktualisieren
  const phaseEl = $('#guidePhase');
  if(phaseEl) phaseEl.textContent = currentPhaseName;
}

function drawCoachingOverlays(ctx){
  const data = (GUIDE_DATA[activeTaskId] || (RR ? GUIDE_DATA.rr : GUIDE_DATA.free)).motion;

  // Absprung-Markierung (grüner Bogen / Band vor der 6-m- oder 9-m-Linie)
  ctx.save();
  const isRR = RR || !!data.isRR;
  const R_line = isRR ? 9 : 6;
  const thBase = isRR ? 125 : 150;
  const pLine = proj([...linePt(thBase, R_line), 0]);
  const pTakeoff = proj([...linePt(thBase, R_line + data.dr), 0]);

  // Zeigt visualisierten Sicherheitsabstand zur Linie
  ctx.strokeStyle = 'rgba(46, 204, 113, 0.7)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(pTakeoff.x, pTakeoff.y, 22, 0, Math.PI * 2);
  ctx.stroke();

  // Bei "Winkel vergrößern": Flugkurve nach innen anzeigen
  if(data.fly === 'in'){
    const pStart = pTakeoff;
    const pEnd = proj([-1.5, 3.2, 0.4]);
    ctx.strokeStyle = 'rgba(52, 152, 219, 0.85)';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(pStart.x, pStart.y);
    ctx.quadraticCurveTo((pStart.x + pEnd.x) / 2 + 50, (pStart.y + pEnd.y) / 2 - 30, pEnd.x, pEnd.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
}

function initEvents(){
  const sheet = $('#guideSheet');
  if(!sheet || sheet.dataset.ready) return;
  sheet.dataset.ready = '1';

  sheet.addEventListener('click', e => {
    const b = e.target.closest('button');
    if(!b) return;

    if(b.matches('[data-close]')){
      closeGuide();
      return;
    }
    if(b.id === 'guidePlay'){
      playing = !playing;
      b.textContent = playing ? '❚❚' : '▶︎';
      return;
    }
    if(b.dataset.speed){
      speed = +b.dataset.speed;
      sheet.querySelectorAll('[data-speed]').forEach(el => el.classList.toggle('on', el === b));
      return;
    }
    if(b.id === 'guideCam'){
      activeCam = activeCam === 'base' ? 'court' : 'base';
      updateCam();
      renderInfo();
      return;
    }
    if(b.dataset.hvariant){
      heightVariant = b.dataset.hvariant;
      renderInfo();
      return;
    }
    if(b.id === 'guideSave'){
      saveVideoClip(b);
    }
  });
}

// 1 Lehrbild-Zyklus als Video (.webm / .mp4) aufzeichnen und herunterladen
function saveVideoClip(btnEl){
  const canvas = $('#guideCanvas');
  if(!canvas || !canvas.captureStream) return;

  btnEl.disabled = true;
  btnEl.textContent = 'Aufnahme…';

  recordedChunks = [];
  const stream = canvas.captureStream(30);
  const mime = ['video/mp4;codecs=avc1', 'video/webm;codecs=vp8', 'video/webm']
    .find(m => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || 'video/webm';

  try {
    mediaRecorder = new MediaRecorder(stream, { mimeType: mime });
    mediaRecorder.ondataavailable = e => { if(e.data.size) recordedChunks.push(e.data); };
    mediaRecorder.onstop = () => {
      btnEl.disabled = false;
      btnEl.textContent = 'Speichern';
      const blob = new Blob(recordedChunks, { type: mime.split(';')[0] });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `handballcoach_anleitung_${activeTaskId}.webm`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    };
    // Genau einen vollen Zyklus (3.4 s) aufnehmen
    tSim = 0;
    playing = true;
    mediaRecorder.start();
    setTimeout(() => {
      if(mediaRecorder && mediaRecorder.state === 'recording') mediaRecorder.stop();
    }, 3400);
  } catch(e){
    console.warn('Videoaufnahme fehlgeschlagen', e);
    btnEl.disabled = false;
    btnEl.textContent = 'Speichern';
  }
}
