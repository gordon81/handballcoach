// Anleitungsvideo im Außenwurf-Coach (und Rückraum, ?rr=1): Sprungwurf als Lehrbild nach DHB/KNSU (QUELLEN.md), mit der
// Lehrbild-Figur aus shared/js/guide/ (getrennt vom Demo-Modus). Drei-Schritt-Anlauf links–rechts–links (Rechtshand),
// Stemmschritt, Schwungbein-Knie hoch (Knie ~90°), Wurfauslage mit Ellbogen auf Schulterhöhe, Abwurf im höchsten Punkt,
// Landung auf dem Sprungbein. Je Aufgabe eigene Hinweise und Hilfslinien; Linkshänder und rechter Flügel gespiegelt.
import { RR } from '../config.js';
import { settings } from '../store.js';
import { createGuide } from '../../../shared/js/guide/player.js';
import { V, body } from '../../../shared/js/guide/figure.js';
import { sideCam, drawGuideLine } from '../../../shared/js/guide/view.js';

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


/* ---------- Bewegung: Sprungwurf mit Drei-Schritt-Anlauf (Beine über Fußpunkte, IK) ---------- */
const D = Math.PI/180;
const ss = k => k <= 0 ? 0 : k >= 1 ? 1 : k*k*(3 - 2*k);
// Stückweise linear durch [[t, v], …].
const pw = (pts, t) => { if(t <= pts[0][0]) return pts[0][1]; for(let i = 1; i < pts.length; i++) if(t <= pts[i][0]){ const [t0, a] = pts[i-1], [t1, b] = pts[i]; return a + (b - a)*(t - t0)/(t1 - t0); } return pts.at(-1)[1]; };
// Arm- und Rumpfhaltung weich zwischen Stützpunkten [[t, pose], …] (smoothstep je Abschnitt).
function blend(keys, t){
  let i = 0; while(i < keys.length - 1 && keys[i+1][0] <= t) i++;
  const [t0, A] = keys[i], [t1, B] = keys[i+1] || keys[i];
  const k = t1 > t0 ? ss((t - t0)/(t1 - t0)) : 0, o = {};
  for(const key in A) o[key] = Array.isArray(A[key]) ? A[key].map((v, n) => v + (B[key][n] - v)*k) : typeof A[key] === 'number' ? A[key] + (B[key] - A[key])*k : (k < 0.5 ? A[key] : B[key]);
  return o;
}

// Ort auf dem Spielfeld: Absprungpunkt K vor der Linie, Laufrichtung u (zum Tor), w = links davon.
function place(m, wing){
  const rr = RR || !!m.isRR, rad = (rr ? 9 : 6) + m.dr, sg = wing === 'RA' ? 1 : -1;
  const th = (rr ? 125 : 150)*D, K = [sg*(1.5 + rad*Math.cos(Math.PI - th)), rad*Math.sin(th)];
  const back = (rr ? 13.7 : 8.6) - rad, Sx = [sg*(1.5 + (rad + back)*Math.cos(Math.PI - th)), (rad + back)*Math.sin(th)];
  const u = [(K[0] - Sx[0])/back, (K[1] - Sx[1])/back], w = [-u[1], u[0]];
  return {K, u, w, a:Math.atan2(u[1], u[0])/D, rr, line:rad - m.dr};
}

// Pose zur Zeit t. R: Rechtshand (Absprung links, Wurfarm rechts). m: GUIDE_DATA[...].motion, hip: Wurf aus der Hüfte.
function jumpThrow(m, R, wing, hip){
  const P = place(m, wing), {K, u, w} = P, T = R ? 'l' : 'r', S = R ? 'r' : 'l', sg = R ? 1 : -1;
  const h = m.h || 0.54, at = (s, lat, z = 0) => [K[0] + u[0]*s + w[0]*lat, K[1] + u[1]*s + w[1]*lat, z];
  const latOf = side => side === 'l' ? 0.12 : -0.12;
  // Anlauf: Kontakte [t, s] je Fuß (Rechtshand: links –2,4, rechts –1,2, links 0 = Stemmschritt/Absprung).
  const pre = m.startDist ? 3 : 0, dt = m.startDist ? 0.28 : 0;   // Gegenstoß: drei schnelle Schritte mehr
  const cT = [[0, -3.3 - pre*1.3], ...(pre ? [[0.2 + dt, -3.6 - 1.3], [0.2 + 3*dt, -3.6 + 0.0]] : []), [0.45 + pre*dt, -2.4], [1.12 + pre*dt, 0]];
  const cS = [[0, -3.5 - pre*1.3], ...(pre ? [[0.2 + 2*dt, -3.6 - 0.65]] : []), [0.8 + pre*dt, -1.2]];
  const o = pre*dt, tTake = 1.32 + o, tPeak = tTake + 0.33, tRel = tPeak + 0.1, tLand = tPeak + 0.33, dur = 3.4 + o;
  const fly = m.fly === 'in' ? 0.75 : 0, inSign = Math.sign((0 - K[0])*w[0] + (3 - K[1])*w[1]) || 1;
  const sP = t => t < tTake ? pw([[0, -3.4 - pre*1.3], [0.3, -3.3 - pre*1.3], ...(pre ? [[0.3 + 2*dt, -4.0]] : []), [0.45 + o, -2.55], [0.8 + o, -1.35], [1.12 + o, -0.25], [tTake, 0.1]], t)
    : pw([[tTake, 0.1], [tLand, 1.15], [tLand + 0.35, 1.35]], t);
  const latP = t => fly*inSign*ss((t - tTake)/(tLand - tTake));
  const zP = t => t < 0.3 ? 0.97 : t < 1.12 + o ? 0.93 + 0.02*Math.sin((t - 0.3)*18) : t < tTake ? pw([[1.12 + o, 0.93], [1.2 + o, 0.9], [tTake, 0.98]], t)
    : t < tLand ? 0.98 + h*(1 - ((t - tPeak)/(tPeak - tTake))**2) : pw([[tLand, 0.98], [tLand + 0.15, 0.82], [tLand + 0.6, 0.97]], t);
  // Fuß aus Kontaktliste: steht nach dem Aufsetzen 0,15 s, schwingt dann im Bogen zum nächsten Kontakt.
  const foot = (list, side, t) => {
    let i = 0; while(i < list.length - 1 && list[i+1][0] <= t) i++;
    const [t0, s0] = list[i], nx = list[i+1];
    if(!nx || t < t0 + 0.15) return [s0, 0];
    const k = (t - t0 - 0.15)/(nx[0] - t0 - 0.15);
    return [s0 + (nx[1] - s0)*ss(k), 0.22*Math.sin(Math.PI*Math.min(1, k))];
  };
  const throwArm = hip
    ? {cock:{[S+'Upper']:[-48, 100], [S+'Fore']:[5, 140]}, rel:{[S+'Upper']:[-38, 25], [S+'Fore']:[-5, -5]}, tilt:-14*sg}
    : {cock:{[S+'Upper']:[-8, 100], [S+'Fore']:[78, 160]}, rel:{[S+'Upper']:[25, 10], [S+'Fore']:[35, -5]}, tilt:0};
  const carry = {lUpper:[-50, 15], lFore:[20, -55], rUpper:[-50, 15], rFore:[20, -55], twist:0, lean:6, tilt:0};
  const cock = {...carry, ...throwArm.cock, [T+'Upper']:[8, 20], [T+'Fore']:[5, 0], twist:-42*sg, lean:-2, tilt:throwArm.tilt};
  const arms = [[0, carry], [0.75 + o, carry], [1.15 + o, cock], [tRel - 0.12, {...cock, twist:-45*sg}],
    [tRel, {...cock, ...throwArm.rel, twist:30*sg, lean:16, tilt:throwArm.tilt*0.5}],
    [tRel + 0.25, {...cock, [S+'Upper']:[-40, -25], [S+'Fore']:[-55, -35], [T+'Upper']:[-45, 120], [T+'Fore']:[-35, 150], twist:40*sg, lean:22, tilt:0}],
    [tLand + 0.3, {...carry, lUpper:[-40, 25], lFore:[-15, 0], rUpper:[-40, 25], rFore:[-15, 0], lean:15}], [dur - 0.3, carry], [dur, carry]];
  const phase = t => t < 1.12 + o ? `1. Anlauf: Drei-Schritt-Rhythmus ${R ? 'links–rechts–links' : 'rechts–links–rechts'}${pre ? ' aus vollem Tempo' : ''}`
    : t < tTake ? `2. Absprung: Stemmschritt ${R ? 'links' : 'rechts'}, Schwungbein-Knie hoch`
    : t < tRel - 0.12 ? (hip ? '3. Wurfauslage: Hand unter Schulterhöhe (aus der Hüfte)' : m.fly === 'in' ? '3. Flug nach innen, Wurfauslage' : '3. Wurfauslage im höchsten Punkt')
    : t < tRel + 0.15 ? '4. Abwurf im höchsten Punkt' : t < tLand + 0.5 ? `5. Landung auf dem Sprungbein (${R ? 'links' : 'rechts'})` : '✓ Lehrbild abgeschlossen';
  const frame = t => {
    const s = sP(t), lat = latP(t), z = zP(t), pel = at(s, lat);
    let tf, sf;
    if(t < tTake){ const [a1, z1] = foot(cT, T, t); tf = [...at(a1, latOf(T)).slice(0, 2), z1]; }
    else if(t < tLand){ const k = ss((t - tTake)/(tLand - tTake)); tf = [...at(s - 0.3 + 0.35*k, lat + latOf(T)).slice(0, 2), Math.max(0, z - 1.02)]; }
    else tf = [...at(1.2, latOf(T) + fly*inSign).slice(0, 2), 0];
    if(t < tTake - 0.2){ const [a1, z1] = foot(cS, S, t); sf = [...at(a1, latOf(S)).slice(0, 2), z1]; }
    else if(t < tLand + 0.12){
      const k = ss((t - tTake + 0.2)/0.35), back = ss((t - tRel)/(tLand + 0.12 - tRel));
      const knee = [...at(s + 0.28*(1 - back) + 0.15*back, lat + latOf(S)).slice(0, 2), Math.max(0, (z - 0.74)*(1 - back))];
      const start = [...at(-1.2, latOf(S)).slice(0, 2), 0];
      sf = t < tTake + 0.15 ? V.mix(start, knee, k) : knee;
    } else sf = [...at(1.35, latOf(S) + fly*inSign).slice(0, 2), 0];
    const takeoffFoot = t > 1.12 + o && t < tTake ? 25*ss((t - 1.12 - o)/(tTake - 1.12 - o)) : t >= tTake && t < tLand - 0.08 ? 50 : 0;
    const pose = {x:pel[0], y:pel[1], a:P.a, pz:z, [T+'At']:tf, [S+'At']:sf, [T+'Foot']:takeoffFoot, [S+'Foot']:t >= tTake && t < tLand ? 30 : 0,
      ...blend(arms, t), ball:t < tRel ? (t < 1.15 + o ? 'both' : S) : null};
    const marks = t >= 1.12 + o && t < tTake ? [{j:T+'Knee', label:'Sprungbein'}]
      : t >= tTake + 0.1 && t < tRel - 0.05 ? [{j:S+'Knee', label:'Kniehub', target:90, tol:20}, ...(hip ? [] : [{j:S+'Elbow', label:'Ellbogen', target:90, tol:20}])] : [];
    return {pose, phase:phase(t), marks, hl:[T+'Thigh', T+'Shank', T+'Foot']};
  };
  return {dur, frame, P, tRel, S};
}

// Kreisläufer: Rücken zum Tor an der 6-m-Linie, auf Ansage 180° über den linken (Rechtshand) Fuß eindrehen, Sprungwurf.
function pivot(m, R, wing){
  const X0 = wing === 'RA' ? 0.6 : -0.6, Y0 = 6.55, T = R ? 'l' : 'r', S = R ? 'r' : 'l', sg = R ? 1 : -1;
  const aBack = 90, aGoal = -90, dur = 3.4;
  const low = {lUpper:[-40, 30], lFore:[0, 10], rUpper:[-40, 30], rFore:[0, 10], twist:0, lean:25, tilt:0};
  const cock = {...low, [S+'Upper']:[-8, 100], [S+'Fore']:[78, 160], [T+'Upper']:[8, 20], [T+'Fore']:[5, 0], twist:-40*sg, lean:0};
  const rel = {...cock, [S+'Upper']:[25, 10], [S+'Fore']:[35, -5], twist:30*sg, lean:16};
  const arms = [[0, low], [1.1, low], [1.45, cock], [1.85, cock], [2.0, rel], [2.3, {...rel, [S+'Upper']:[-40, -25], [S+'Fore']:[-55, -35], lean:25}], [3.0, low], [3.4, low]];
  const frame = t => {
    const turn = ss((t - 0.9)/0.35), a = aBack + (aGoal - aBack)*turn*sg;   // Linkshand dreht andersherum
    const ar = a*D, fw = [Math.cos(ar), Math.sin(ar)], lt = [-fw[1], fw[0]];
    const piv = [X0 + 0.12*(R ? -1 : 1), Y0];   // Drehfuß bleibt stehen
    const tJ = 1.45, tL = 2.15, hh = m.h || 0.46, air = t > tJ && t < tL ? hh*Math.sin(Math.PI*(t - tJ)/(tL - tJ)) : 0;
    const pz = t < tJ ? (t < 1.35 ? 0.86 : 0.86 + (t - 1.35)*1.2) : t < tL ? 0.98 + air : pw([[tL, 0.98], [tL + 0.15, 0.84], [tL + 0.6, 0.95]], t);
    const fwd = ss((t - 1.25)/1.2)*0.45;   // Absprung leicht nach vorn, bleibt vor der Linie
    const pel = [piv[0] - lt[0]*0.12*(R ? 1 : -1) + fw[0]*(0.05 + fwd), piv[1] - lt[1]*0.12*(R ? 1 : -1) + fw[1]*(0.05 + fwd)];
    const other = [pel[0] - lt[0]*0.12*(R ? 1 : -1)*-1 + fw[0]*(t < 1.0 ? 0 : 0.1), pel[1] - lt[1]*0.12*(R ? 1 : -1)*-1 + fw[1]*(t < 1.0 ? 0 : 0.1)];
    const lift = t > 0.92 && t < 1.2 ? 0.08*Math.sin(Math.PI*(t - 0.92)/0.28) : 0;
    const tf = t < tJ ? [...piv, 0] : [pel[0] - fw[0]*0.15 + lt[0]*0.12*sg, pel[1] - fw[1]*0.15 + lt[1]*0.12*sg, Math.max(0, pz - 0.9)];
    const sfp = t < tJ ? [...other, lift] : [pel[0] + fw[0]*0.25 - lt[0]*0.12*(R ? 1 : -1), pel[1] + fw[1]*0.25 - lt[1]*0.12*(R ? 1 : -1), Math.max(0, pz - (t < tL - 0.15 ? 0.6 : 0.9))];
    const pose = {x:pel[0], y:pel[1], a, pz, [T+'At']:tf, [S+'At']:sfp, [T+'Foot']:t > tJ - 0.1 && t < tL ? 45 : 0, [S+'Foot']:0, ...blend(arms, t), ball:t < 2.0 ? (t < 1.2 ? 'both' : S) : null};
    const phase = t < 0.9 ? '1. Ausgangsstellung: Rücken zum Tor, tief' : t < 1.3 ? `2. Ansage: Drehung über den ${R ? 'linken' : 'rechten'} Fuß` : t < 1.9 ? '3. Absprung vor der Linie, Wurfarm oben' : t < 2.15 ? '4. Abwurf' : '5. Landung';
    return {pose, phase, marks:t < 0.9 ? [{j:'lKnee', label:'Knie'}] : t > 1.6 && t < 1.95 ? [{j:S+'Elbow', label:'Ellbogen', target:90, tol:20}] : [], hl:[T+'Thigh', T+'Shank', T+'Foot']};
  };
  return {dur, frame, P:{K:[X0, Y0], u:[0, -1], w:[1, 0], a:-90, rr:false, line:6}, tRel:2.0, S};
}

const TARGET = {LA:[1.15, 0, 1.65], RA:[-1.15, 0, 1.65]};   // Orange lang: langes Eck vom Flügel
function motionFor(taskId){
  return (variant, R) => {
    const d = GUIDE_DATA[taskId], wing = settings.pos === 'RA' ? 'RA' : 'LA';
    const mv = d.motion.turn ? pivot(d.motion, R, wing) : jumpThrow(d.motion, R, wing, variant === 'hip');
    const rel = mv.frame(mv.tRel);
    return {dur:mv.dur, P:mv.P, frame(t){
      const st = mv.frame(t), k = (t - mv.tRel)/0.4;
      if(k >= 0 && k <= 1){
        const j0 = relHand(rel.pose, mv.S);
        st.ball = V.add(V.mix(j0, TARGET[wing], k), [0, 0, 1], 0.2*Math.sin(Math.PI*k));
      }
      return st;
    }};
  };
}
const relHand = (pose, S) => body(pose)[S + 'Hand'];

// Ansichten: Kamera 1 (Grundlinie, wie im Training), Kamera 2 (Feld), Seite (echte Winkel am Absprung).
function views(taskId){
  const wing = () => settings.pos === 'RA' ? 'RA' : 'LA', mx = p => wing() === 'RA' ? [-p[0], p[1], p[2]] : p;
  const P = () => { const d = GUIDE_DATA[taskId]; return d.motion.turn ? {K:[wing() === 'RA' ? 0.6 : -0.6, 6.55], a:-90} : place(d.motion, wing()); };
  // Seite: schwenkt mit (Mitte auf dem Becken), Höhe fest, damit die Sprunghöhe sichtbar bleibt.
  const side = {id:'side', label:'Seite', cam:(v, R, j) => { const p = P(); return sideCam(j.pelvis[0], j.pelvis[1], p.a, {side:wing() === 'RA' ? 1 : -1, dist:6.2, lookZ:1.35, h:1.3}); }};
  if(RR || GUIDE_DATA[taskId].motion.isRR) return [side, {id:'cam', label:'Kamera', cam:() => ({pos:mx([-3.6, 3.2, 2.2]), look:mx([-7.6, 9.6, 0.3]), fov:66})}];
  return [
    side,
    {id:'cam1', label:'Kamera 1', cam:() => ({pos:mx([-3.4, -2.4, 2.2]), look:mx([-6.6, 3.0, 0.2]), fov:66})},
    {id:'cam2', label:'Kamera 2', cam:() => ({pos:mx([2.5, 10.5, 2.0]), look:mx([-3.5, 2.3, 0.5]), fov:66})}
  ];
}

// Hilfslinien: Absprungpunkt vor der Linie (grün), bei „Winkel vergrößern“ die Flugkurve nach innen.
function overlay(taskId){
  return (ctx, cam) => {
    const d = GUIDE_DATA[taskId], wing = settings.pos === 'RA' ? 'RA' : 'LA';
    if(d.motion.turn) return;
    const p = place(d.motion, wing), K = [...p.K, 0.01];
    const c = cam.proj(K); if(c.z > 0.3){ ctx.strokeStyle = 'rgba(46,204,113,.85)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(c.x, c.y, cam.F*0.22/c.z, cam.F*0.09/c.z, 0, 0, 7); ctx.stroke(); }
    drawGuideLine(ctx, cam, [K[0] - p.w[0]*0.4, K[1] - p.w[1]*0.4, 0.01], [K[0] + p.w[0]*0.4, K[1] + p.w[1]*0.4, 0.01], '#2ecc71', `Absprung ${Math.round(d.motion.dr*100)} cm vor der Linie`, []);
    if(d.motion.fly === 'in'){
      const sg = Math.sign((0 - p.K[0])*p.w[0] + (3 - p.K[1])*p.w[1]) || 1;
      const E = [p.K[0] + p.u[0]*1.15 + p.w[0]*0.75*sg, p.K[1] + p.u[1]*1.15 + p.w[1]*0.75*sg, 0.01];
      drawGuideLine(ctx, cam, K, E, 'rgba(52,152,219,.9)', 'Flug nach innen', [10, 8]);
    }
  };
}

const guides = {};
function guideFor(taskId){
  return guides[taskId] ??= createGuide({
    id:'aussenspieler_' + taskId,
    title:() => GUIDE_DATA[taskId].title,
    sub:() => GUIDE_DATA[taskId].sub,
    cues:() => GUIDE_DATA[taskId].cues,
    variants:GUIDE_DATA[taskId].motion.hasHeightVariant ? [{id:'high', label:'Wurf über Kopf (Hoch)'}, {id:'hip', label:'Wurf aus der Hüfte (Hüfte)'}] : [{id:'std', label:'Lehrbild'}],
    views:views(taskId),
    isRightHand:() => settings.hand !== 'L',
    motion:motionFor(taskId),
    overlay:overlay(taskId)
  });
}
let open = null;
export function openGuide(taskId = 'free'){
  if(RR && (taskId === 'free' || !GUIDE_DATA[taskId])) taskId = 'rr';
  if(!GUIDE_DATA[taskId]) taskId = RR ? 'rr' : 'free';
  open = guideFor(taskId); open.openGuide();
  return open;
}
export function closeGuide(){ open?.closeGuide(); }
export const guideState = () => open?.state();
export const guideSeek = t => open?.seek(t);
