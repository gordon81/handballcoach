// Anleitungsvideo im Außenwurf-Coach (und Rückraum, ?rr=1): Sprungwurf als Lehrbild nach DHB/KNSU (QUELLEN.md), mit der
// Lehrbild-Figur aus shared/js/guide/ (getrennt vom Demo-Modus). Drei-Schritt-Anlauf links–rechts–links (Rechtshand),
// Stemmschritt, Schwungbein-Knie hoch (Knie ~90°), Wurfauslage mit Ellbogen auf Schulterhöhe, Abwurf im höchsten Punkt,
// Landung auf dem Sprungbein. Je Aufgabe eigene Hinweise und Hilfslinien; Linkshänder und rechter Flügel gespiegelt.
import { RR } from '../config.js';
import { settings, store } from '../store.js';
import { createGuide } from '../../../shared/js/guide/player.js';
import { V, body } from '../../../shared/js/guide/figure.js';
import { sideCam, drawGuideLine } from '../../../shared/js/guide/view.js';

// Platzhalter in den Texten (je nach Wurfhand eingesetzt, siehe fill()): {seq} Schrittfolge, {T} Sprungbein-Seite,
// {S} Wurfarm-Seite, {Tadj}/{Sadj} als Adjektiv („linke“/„rechte“).
export const GUIDE_DATA = {
  rr: {
    title: 'Rückraum-Sprungwurf: Korrekte Ausführung',
    sub: 'Lehrbild Sprungwurf aus dem Rückraum (DHB / KNSU)',
    cues: [
      'Drei-Schritt-Anlauf {seq}: raumgreifend und mit Tempo Richtung 9-m-Linie.',
      'Absprung vor 9 m: Stemmschritt mit dem {Tadj}n Bein vor der gestrichelten Linie, kein Übertritt.',
      'Kniehub: das {Sadj} Knie schwingt explosiv nach vorn-oben.',
      'Wurfauslage im höchsten Punkt: Ball mit dem {Sadj}n Arm hoch, Ellbogen auf Schulterhöhe, Rumpf aufrecht.',
      'Abwurf im höchsten Punkt: Schlagwurf über den Block, Handgelenk klappt ab.'
    ],
    motion: { dr: 0.4, h: 0.58, speed: 3.4, swingAt: 0.48, fly: 'straight', isRR: true }
  },
  free: {
    title: 'Außen-Sprungwurf: Korrekte Ausführung',
    sub: 'Lehrbild Sprungwurf von Außen (DHB / KNSU)',
    cues: [
      'Anlauf mit drei Schritten {seq}, Blick aufs Tor.',
      'Stemmschritt mit dem {Tadj}n Bein (Sprungbein), 10–20 cm vor der 6-m-Linie, kein Übertritt.',
      'Das {Sadj} Knie schwingt explosiv nach vorn-oben (Kniehub ~90°).',
      'Wurfauslage im höchsten Punkt: {Sadj}r Ellbogen auf Schulterhöhe, Oberkörper gegen die Hüfte aufgedreht.',
      'Abwurf mit dem {Sadj}n Arm über Kopfhöhe ins Toreck, Landung auf dem {Tadj}n Bein im Torraum.'
    ],
    motion: { dr: 0.22, h: 0.54, speed: 3.2, swingAt: 0.45, fly: 'straight' }
  },
  line: {
    title: 'Absprung an der Linie: Korrekte Ausführung',
    sub: 'Timing & Absprungpunkt am 6-m-Bogen',
    cues: [
      'Schrittrhythmus {seq}: der letzte Schritt ({T}) ist ein flacher Stemmschritt.',
      'Absprungfenster: der {Tadj} Fuß setzt 10–25 cm vor der Linie auf. Kein Übertritt.',
      'Kniehub: das {Sadj} Knie schwingt sofort hoch und macht aus Tempo Höhe.',
      'Volle Streckung im Sprunggelenk, Knie und Rumpf.',
      'Abwurf vor dem tiefsten Punkt, weich auf dem {Tadj}n Bein landen.'
    ],
    motion: { dr: 0.18, h: 0.55, speed: 3.3, swingAt: 0.45, fly: 'straight' }
  },
  air: {
    title: 'Entscheidung in der Luft: Korrekte Ausführung',
    sub: 'Reaktionsschnelligkeit & Wurfwinkel-Auswahl im Flug',
    cues: [
      'Neutraler Anlauf {seq}, ohne die Ecke vorwegzunehmen.',
      'Absprung vom {Tadj}n Bein, im Sprung Blick auf Tor und Ziel.',
      'Wurfauslage halten: der {Sadj} Arm bleibt oben und wurfbereit.',
      'Späte Ecke: Handgelenk und Arm gehen erst im letzten Moment ins freie Eck.',
      'Schneller Armzug trotz später Entscheidung.'
    ],
    motion: { dr: 0.22, h: 0.55, speed: 3.3, swingAt: 0.52, fly: 'straight' }
  },
  height: {
    title: 'Wurfhöhe auf Ansage: Korrekte Ausführung',
    sub: 'Variabler Wurf: Über dem Kopf („Hoch“) vs. Aus der Hüfte („Hüfte“)',
    cues: [
      '„Hoch“: {Sadj} Hand deutlich über Kopfhöhe, Ellbogen hoch, Oberkörper aufgedreht.',
      '„Hüfte“: Hand unter Schulterhöhe, Oberkörper neigt sich seitlich, Arm zieht flach am Block vorbei.',
      'Gleicher Anlauf {seq}: der Abwehrspieler darf die Wurfart bis zum Absprung nicht erkennen.',
      'Bei beiden Höhen klappt das Handgelenk aktiv ab.'
    ],
    motion: { dr: 0.22, h: 0.52, speed: 3.2, swingAt: 0.45, fly: 'straight', hasHeightVariant: true }
  },
  angle: {
    title: 'Winkel vergrößern: Korrekte Ausführung',
    sub: 'Flugkurve nach innen zur Vergrößerung des Wurfwinkels',
    cues: [
      'Leicht gebogener Anlauf {seq} von der Seitenlinie zur 6-m-Linie.',
      'Absprung vom {Tadj}n Bein aktiv Richtung Tormitte (7-m-Punkt) lenken.',
      'Der Flug nach innen öffnet das Tor, der Wurfwinkel wird größer.',
      'Der Oberkörper dreht gegen die Flugrichtung wieder aufs Tor.',
      'Kein Übertritt: trotz schräger Flugbahn sauber vor der 6-m-Linie abspringen.'
    ],
    motion: { dr: 0.25, h: 0.55, speed: 3.4, swingAt: 0.48, fly: 'in' }
  },
  fastbreak: {
    title: 'Gegenstoß auf Zeit: Korrekte Ausführung',
    sub: 'Temposprint mit flüssigem Übergang in den Sprungwurf',
    cues: [
      'Explosiver Start aus der Distanz (z. B. Mittellinie) mit vollem Tempo.',
      'Die letzten drei Schritte {seq} rhythmisch und raumgreifend.',
      'Das Tempo in einen weiten Sprung vom {Tadj}n Bein mitnehmen.',
      'Ziel sofort erfassen und vor dem Bodenkontakt mit dem {Sadj}n Arm werfen.',
      'Im Torraum weich abfedern.'
    ],
    motion: { dr: 0.28, h: 0.52, speed: 5.2, swingAt: 0.42, fly: 'straight', startDist: 11.5 }
  },
  pivot: {
    title: 'Kreisläufer: Drehen auf Ansage: Korrekte Ausführung',
    sub: '180°-Drehung an der 6-m-Linie und Wurf',
    cues: [
      'Ausgangsstellung: tief, Rücken zum Tor direkt vor der 6-m-Linie.',
      'Auf Zuruf (Links/Rechts) über den {Tadj}n Fuß um 180° zum Tor drehen.',
      'Aus der Drehung vor der Linie abspringen, ohne überzutreten.',
      'Den {Sadj}n Arm sofort hoch und an den Abwehrarmen vorbei werfen.',
      'Abwurf vor dem Bodenkontakt, sicher abfangen.'
    ],
    motion: { dr: 0.22, h: 0.46, speed: 2.8, swingAt: 0.45, turn: 1 }
  },
  tired: {
    title: 'Serie unter Ermüdung: Korrekte Ausführung',
    sub: 'Technik-Stabilität & Sprunghöhe unter Belastung',
    cues: [
      'Auch müde dieselbe saubere Schrittfolge {seq}.',
      'Das {Sadj} Knie weiter aktiv hochziehen, auch wenn die Beine schwer werden.',
      'Rumpfspannung: Oberkörper im höchsten Punkt aufrecht, nicht nach vorn abknicken.',
      'Kein Übertritt trotz Erschöpfung.',
      'Die kurze Pause zum Konzentrieren nutzen.'
    ],
    motion: { dr: 0.22, h: 0.54, speed: 3.2, swingAt: 0.45, fly: 'straight' }
  }
};

// Seite und Hand in Worten. R = Rechtshand: Sprungbein links, Wurfarm rechts.
const side = s => s === 'l' ? 'links' : 'rechts';
export function who(R = settings.hand !== 'L', wing = settings.pos === 'RA' ? 'RA' : 'LA'){
  const T = R ? 'l' : 'r', S = R ? 'r' : 'l';
  return {T:side(T), S:side(S), Tadj:T === 'l' ? 'linke' : 'rechte', Sadj:S === 'l' ? 'linke' : 'rechte',
    seq:`${side(T)} – ${side(S)} – ${side(T)}`, hand:R ? 'Rechtshand' : 'Linkshand',
    wing:RR ? 'Rückraum' : wing === 'RA' ? 'Rechtsaußen' : 'Linksaußen',
    // Rechtshand auf Rechtsaußen (Linkshand auf Linksaußen): der Wurfarm ist außen, mehr Aufdrehen nötig.
    hard:!RR && (R ? wing === 'RA' : wing === 'LA')};
}
export const fill = (txt, w = who()) => txt.replace(/\{(\w+)\}/g, (m, k) => w[k] ?? m);

/* ---------- Bewegung: Sprungwurf mit Drei-Schritt-Anlauf (Beine über Fußpunkte, IK) ---------- */
const D = Math.PI/180;
const ARM = '#ff8a1f', LEG = '#2ecc71';   // Wurfarm orange, Sprungbein grün (wie in der Figur hervorgehoben)
const phaseAt = (list, t) => { let i = 0; while(i < list.length - 1 && list[i+1][0] <= t) i++; return list[i][1]; };
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
// x entlang der Torlinie, y ins Feld. Der Angreifer blickt zum Tor (−y), seine linke Seite ist +x: Linksaußen steht bei +x.
function place(m, wing){
  const rr = RR || !!m.isRR, rad = (rr ? 9 : 6) + m.dr, sg = wing === 'LA' ? 1 : -1;   // Blick zum Tor (−y): links = +x
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
  // Bewegungsablauf Schritt für Schritt (gleiche Texte im Video, in der Zeitleiste und auf der Startseite).
  const L = side, Sadj = S === 'l' ? 'linke' : 'rechte';
  const phases = [
    [0, pre ? 'Antritt aus vollem Tempo, Ball sicher vor der Brust' : 'Anlauf: Ball vor der Brust, Blick aufs Tor'],
    [0.45 + o, `Schritt 1: ${L(T)} aufsetzen`],
    [0.8 + o, `Schritt 2: ${L(S)}, Ball geht hoch in die ${Sadj} Wurfhand`],
    [1.12 + o, `Schritt 3: ${L(T)} = Stemmschritt vor der Linie`],
    [tTake, `Absprung vom ${T === 'l' ? 'linken' : 'rechten'} Bein, ${Sadj}s Knie hoch`],
    [tTake + 0.15, hip ? 'Wurfauslage: Hand unter Schulterhöhe (aus der Hüfte)' : m.fly === 'in' ? 'Flug nach innen, Ellbogen auf Schulterhöhe' : 'Wurfauslage: Ellbogen auf Schulterhöhe, Oberkörper aufgedreht'],
    [tRel - 0.12, `Abwurf im höchsten Punkt: ${Sadj}r Arm peitscht, Handgelenk klappt ab`],
    [tRel + 0.15, `Landung auf dem Sprungbein (${L(T)}), weich abfedern`],
    [tLand + 0.5, '✓ Fertig: nochmal in Zeitlupe ansehen']
  ];
  // Fußabdrücke der Schritte (ohne Startstellung), die letzten drei sind Schritt 1–3.
  const steps = [...cT.map(c => [c, T]), ...cS.map(c => [c, S])].filter(([c]) => c[0] > 0).sort((a, b) => a[0][0] - b[0][0])
    .map(([[t, s], f], i, all) => ({t, side:f, n:i - all.length + 4, p:at(s, latOf(f))}));
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
    const tags = [...(t >= 0.8 + o && t < tRel + 0.15 ? [{j:S+'Hand', label:`Wurfarm ${L(S)}`, col:ARM}] : []),
      ...(t >= 0.45 + o && t < tTake + 0.25 ? [{j:T+'Ank', label:`Sprungbein ${L(T)}`, col:LEG}] : [])];
    return {pose, phase:phaseAt(phases, t), marks, tags, hl:[T+'Thigh', T+'Shank', T+'Foot'], hl2:[S+'Upper', S+'Fore']};
  };
  return {dur, frame, P, tRel, S, T, phases, steps};
}

// Kreisläufer: Rücken zum Tor an der 6-m-Linie, auf Ansage 180° über den linken (Rechtshand) Fuß eindrehen, Sprungwurf.
function pivot(m, R, wing){
  const X0 = wing === 'LA' ? 0.6 : -0.6, Y0 = 6.55, T = R ? 'l' : 'r', S = R ? 'r' : 'l', sg = R ? 1 : -1;
  const aBack = 90, aGoal = -90, dur = 3.4;
  const phases = [[0, 'Ausgangsstellung: Rücken zum Tor, tief'], [0.9, `Ansage: Drehung über den ${R ? 'linken' : 'rechten'} Fuß`],
    [1.3, `Absprung vor der Linie, ${R ? 'rechter' : 'linker'} Wurfarm oben`], [1.9, 'Abwurf'], [2.15, 'Landung'], [2.8, '✓ Fertig: nochmal in Zeitlupe ansehen']];
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
    return {pose, phase:phaseAt(phases, t), hl2:[S+'Upper', S+'Fore'], marks:t < 0.9 ? [{j:'lKnee', label:'Knie'}] : t > 1.6 && t < 1.95 ? [{j:S+'Elbow', label:'Ellbogen', target:90, tol:20}] : [], hl:[T+'Thigh', T+'Shank', T+'Foot']};
  };
  return {dur, frame, P:{K:[X0, Y0], u:[0, -1], w:[1, 0], a:-90, rr:false, line:6}, tRel:2.0, S, T, phases, steps:[]};
}

const TARGET = {LA:[-1.15, 0, 1.65], RA:[1.15, 0, 1.65]};   // Orange lang: langes Eck vom Flügel
function motionFor(taskId){
  return (variant, R) => {
    const d = GUIDE_DATA[taskId], wing = settings.pos === 'RA' ? 'RA' : 'LA';
    const mv = d.motion.turn ? pivot(d.motion, R, wing) : jumpThrow(d.motion, R, wing, variant === 'hip');
    const rel = mv.frame(mv.tRel);
    return {dur:mv.dur, P:mv.P, phases:mv.phases, steps:mv.steps, frame(t){
      const st = mv.frame(t), k = (t - mv.tRel)/0.4; st.t = t;
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
  const wing = () => settings.pos === 'RA' ? 'RA' : 'LA', mx = p => wing() === 'LA' ? [-p[0], p[1], p[2]] : p;   // Grundwerte für Rechtsaußen (−x)
  const P = () => { const d = GUIDE_DATA[taskId]; return d.motion.turn ? {K:[wing() === 'LA' ? 0.6 : -0.6, 6.55], a:-90} : place(d.motion, wing()); };
  // Seite: schwenkt mit (Mitte auf dem Becken), Höhe fest, damit die Sprunghöhe sichtbar bleibt.
  const side = {id:'side', label:'Seite', cam:(v, R, j) => { const p = P(); return sideCam(j.pelvis[0], j.pelvis[1], p.a, {side:wing() === 'LA' ? 1 : -1, dist:6.2, lookZ:1.35, h:1.3}); }};
  if(RR || GUIDE_DATA[taskId].motion.isRR) return [side, {id:'cam', label:'Kamera', cam:() => ({pos:mx([-3.6, 3.2, 2.2]), look:mx([-7.6, 9.6, 0.3]), fov:66})}];
  return [
    side,
    {id:'cam1', label:'Kamera 1', cam:() => ({pos:mx([-3.4, -2.4, 2.2]), look:mx([-6.6, 3.0, 0.2]), fov:66})},
    {id:'cam2', label:'Kamera 2', cam:() => ({pos:mx([2.5, 10.5, 2.0]), look:mx([-3.5, 2.3, 0.5]), fov:66})}
  ];
}

// Hilfslinien: Fußabdrücke der drei Schritte (Sprungbein grün), Absprungpunkt vor der Linie, bei „Winkel vergrößern“ die
// Flugkurve nach innen.
const motions = {};
const motionOf = (taskId, variant, R, wing) => motions[[taskId, variant, R, wing]] ??= motionFor(taskId)(variant, R);
function overlay(taskId){
  return (ctx, cam, variant, R, st) => {
    const d = GUIDE_DATA[taskId], wing = settings.pos === 'RA' ? 'RA' : 'LA';
    if(d.motion.turn) return;
    const p = place(d.motion, wing), K = [...p.K, 0.01], t = st.t ?? 0;
    for(const f of motionOf(taskId, variant, R, wing).steps) footprint(ctx, cam, f, p, R ? 'l' : 'r', f.t <= t ? 1 : 0.35);
    const c = cam.proj(K); if(c.z > 0.3){ ctx.strokeStyle = 'rgba(46,204,113,.85)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(c.x, c.y, cam.F*0.22/c.z, cam.F*0.09/c.z, 0, 0, 7); ctx.stroke(); }
    drawGuideLine(ctx, cam, [K[0] - p.w[0]*0.4, K[1] - p.w[1]*0.4, 0.01], [K[0] + p.w[0]*0.4, K[1] + p.w[1]*0.4, 0.01], '#2ecc71', `Absprung ${Math.round(d.motion.dr*100)} cm vor der Linie`, []);
    if(d.motion.fly === 'in'){
      const sg = Math.sign((0 - p.K[0])*p.w[0] + (3 - p.K[1])*p.w[1]) || 1;
      const E = [p.K[0] + p.u[0]*1.15 + p.w[0]*0.75*sg, p.K[1] + p.u[1]*1.15 + p.w[1]*0.75*sg, 0.01];
      drawGuideLine(ctx, cam, K, E, 'rgba(52,152,219,.9)', 'Flug nach innen', [10, 8]);
    }
  };
}
// Fußabdruck am Boden mit Nummer und Seite („1 L“), Sprungbein grün, der andere Fuß weiß.
function footprint(ctx, cam, f, P, T, alpha){
  const [x, y] = f.p, u = P.u, w = P.w, pt = (a, b) => cam.proj([x + u[0]*a + w[0]*b, y + u[1]*a + w[1]*b, 0.01]);
  const q = [pt(0.16, 0.05), pt(0.16, -0.05), pt(-0.1, -0.055), pt(-0.1, 0.055)];
  if(q.some(v => v.z < 0.3)) return;
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = f.side === T ? 'rgba(46,204,113,.75)' : 'rgba(255,255,255,.7)';
  ctx.beginPath(); q.forEach((v, i) => i ? ctx.lineTo(v.x, v.y) : ctx.moveTo(v.x, v.y)); ctx.closePath(); ctx.fill();
  if(f.n >= 1){
    const c = pt(0.03, 0), txt = `${f.n} ${f.side === 'l' ? 'L' : 'R'}`;
    ctx.font = '800 34px Barlow, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(10,14,22,.85)'; ctx.strokeText(txt, c.x, c.y - 8);
    ctx.fillStyle = f.side === T ? '#2ecc71' : '#fff'; ctx.fillText(txt, c.x, c.y - 8);
  }
  ctx.restore();
}

// Über der Figur: Beschriftung „Wurfarm“/„Sprungbein“, unten links wer wirft, oben rechts die Draufsicht mit Laufweg.
function hud(taskId){
  return (ctx, cam, variant, R, st, j) => {
    const w = who(R), {W, H} = cam, d = GUIDE_DATA[taskId], wing = settings.pos === 'RA' ? 'RA' : 'LA';
    for(const tg of st.tags || []){
      const p = cam.proj(j[tg.j]); if(p.z < 0.3) continue;
      ctx.font = '800 40px Barlow, sans-serif'; const tw = ctx.measureText(tg.label).width, lx = p.x + 30, ly = p.y - 30;
      ctx.strokeStyle = tg.col; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(lx, ly + 18); ctx.stroke();
      ctx.fillStyle = 'rgba(10,14,22,.85)'; ctx.fillRect(lx - 8, ly - 26, tw + 16, 52);
      ctx.fillStyle = tg.col; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(tg.label, lx, ly);
    }
    // Wer: Seite und Hand, Farben wie an der Figur.
    const l1 = `${w.wing} · ${w.hand}`.toUpperCase(), l2a = `Sprungbein ${w.T}`, l2b = `Wurfarm ${w.S}`;
    ctx.font = '800 46px Barlow, sans-serif'; const w1 = ctx.measureText(l1).width;
    ctx.font = '700 38px Barlow, sans-serif'; const wa = ctx.measureText(l2a + '   ').width, w2 = wa + ctx.measureText(l2b).width;
    const bw = Math.max(w1, w2) + 32, by = H - 132;
    ctx.fillStyle = 'rgba(10,14,22,.82)'; ctx.fillRect(16, by, bw, 116);
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = '800 46px Barlow, sans-serif'; ctx.fillStyle = '#fff'; ctx.fillText(l1, 32, by + 34);
    ctx.font = '700 38px Barlow, sans-serif'; ctx.fillStyle = LEG; ctx.fillText(l2a, 32, by + 84); ctx.fillStyle = ARM; ctx.fillText(l2b, 32 + wa, by + 84);
    if(!d.motion.turn) miniMap(ctx, W, place(d.motion, wing), j, w, RR || !!d.motion.isRR);
  };
}
// Draufsicht wie auf der Taktiktafel: Tor oben, aus Sicht des Angreifers (seine linke Seite links).
function miniMap(ctx, W, P, j, w, rr){
  const bw = 330, bh = rr ? 260 : 220, x0 = W - bw - 16, y0 = 16, s = (bw - 20)/20, cx = x0 + bw/2, top = y0 + 30;
  const m = (x, y) => [cx - x*s, top + y*s];
  ctx.save();
  ctx.fillStyle = 'rgba(10,14,22,.82)'; ctx.fillRect(x0, y0, bw, bh);
  ctx.beginPath(); ctx.rect(x0, y0, bw, bh); ctx.clip();
  ctx.font = '700 26px Barlow, sans-serif'; ctx.fillStyle = '#93a3b3'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText('Draufsicht', cx, y0 + 4);
  ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 2;
  const path = pts => { ctx.beginPath(); pts.forEach(([x, y], i) => { const [a, b] = m(x, y); i ? ctx.lineTo(a, b) : ctx.moveTo(a, b); }); ctx.stroke(); };
  path([[-10, 0], [10, 0]]);
  const arcPts = (R0, dash) => { const out = []; for(let k = 0; k <= 24; k++){ const a = Math.PI*k/24; out.push([(Math.cos(a) >= 0 ? 1.5 : -1.5) + R0*Math.cos(a), R0*Math.sin(a)]); } return out; };
  path(arcPts(6)); ctx.setLineDash([6, 6]); path(arcPts(9)); ctx.setLineDash([]);
  ctx.strokeStyle = '#d42a2a'; ctx.lineWidth = 6; path([[-1.5, 0], [1.5, 0]]);
  ctx.fillStyle = '#fff'; ctx.font = '700 18px Barlow, sans-serif'; ctx.textBaseline = 'bottom'; const [gx, gy] = m(0, 0); ctx.fillText('Tor', gx, gy - 2);
  // Laufweg: Anlauf zum Absprungpunkt, Spieler als Punkt.
  const S0 = [P.K[0] - P.u[0]*3.6, P.K[1] - P.u[1]*3.6], [ax, ay] = m(...S0), [kx, ky] = m(...P.K);
  ctx.strokeStyle = '#ff8a1f'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(kx, ky); ctx.stroke();
  const ang = Math.atan2(ky - ay, kx - ax); ctx.fillStyle = '#ff8a1f'; ctx.beginPath(); ctx.moveTo(kx, ky);
  ctx.lineTo(kx - 14*Math.cos(ang - 0.45), ky - 14*Math.sin(ang - 0.45)); ctx.lineTo(kx - 14*Math.cos(ang + 0.45), ky - 14*Math.sin(ang + 0.45)); ctx.fill();
  ctx.fillStyle = '#2ecc71'; ctx.beginPath(); ctx.arc(kx, ky, 5, 0, 7); ctx.fill();
  const [px, py] = m(j.pelvis[0], j.pelvis[1]); ctx.fillStyle = '#3d8bff'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(px, py, 8, 0, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.font = '700 26px Barlow, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillText(w.wing, Math.max(x0 + 70, Math.min(x0 + bw - 70, ax)), Math.min(ay + 10, y0 + bh - 30));
  ctx.restore();
}

const guides = {};
function guideFor(taskId){
  return guides[taskId] ??= createGuide({
    id:'aussenspieler_' + taskId,
    title:() => GUIDE_DATA[taskId].title,
    sub:() => { const w = who(); return `${w.wing}, ${w.hand}: Sprungbein ${w.T}, Wurfarm ${w.S}`; },
    cues:() => GUIDE_DATA[taskId].cues.map(c => fill(c)),
    variants:GUIDE_DATA[taskId].motion.hasHeightVariant ? [{id:'high', label:'Wurf über Kopf (Hoch)'}, {id:'hip', label:'Wurf aus der Hüfte (Hüfte)'}] : [{id:'std', label:'Lehrbild'}],
    views:views(taskId),
    isRightHand:() => settings.hand !== 'L',
    motion:motionFor(taskId),
    overlay:overlay(taskId),
    hud:hud(taskId)
  });
}
const taskOf = taskId => !GUIDE_DATA[taskId] || (RR && taskId === 'free') ? (RR ? 'rr' : 'free') : taskId;
// Bewegungsablauf als Liste (Startseite): dieselben Schritte wie im Video.
export const phasesFor = (taskId, variant = 'std') => motionOf(taskOf(taskId), variant, settings.hand !== 'L', settings.pos === 'RA' ? 'RA' : 'LA').phases.map(p => p[1]);

// Seite und Wurfhand direkt im Video umschalten (gilt auch fürs Training).
function renderWho(){
  const box = document.querySelector('#guideWho'); if(!box) return;
  const b = (k, v, label, on) => `<button data-who="${k}" data-v="${v}" class="${on ? 'on' : ''}">${label}</button>`;
  box.innerHTML = (RR ? '' : `<div class="btnrow">${b('pos', 'LA', 'Linksaußen', settings.pos !== 'RA')}${b('pos', 'RA', 'Rechtsaußen', settings.pos === 'RA')}</div>`)
    + `<div class="btnrow">${b('hand', 'R', 'Rechtshand', settings.hand !== 'L')}${b('hand', 'L', 'Linkshand', settings.hand === 'L')}</div>`;
  if(!box.dataset.init){
    box.dataset.init = '1';
    box.addEventListener('click', e => {
      const el = e.target.closest('[data-who]'); if(!el) return;
      settings[el.dataset.who] = el.dataset.v; store(); renderWho(); open?.openGuide();
      document.dispatchEvent(new CustomEvent('awc:who'));
    });
  }
}

let open = null;
export function openGuide(taskId = 'free'){
  open = guideFor(taskOf(taskId)); open.openGuide(); renderWho();
  return open;
}
export function closeGuide(){ open?.closeGuide(); }
export const guideState = () => open?.state();
export const guideSeek = t => open?.seek(t);
