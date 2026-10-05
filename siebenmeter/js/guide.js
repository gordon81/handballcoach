// Anleitungsvideo 7-m-Wurf (shared/js/guide/): Schlagwurf aus dem Stand, Standfuß (grün) bleibt bis zum Abwurf am Boden,
// Wurfauslage mit Ellbogen auf Schulterhöhe (Oberarm–Rumpf ~90°, Ellbogen ~90°), Rumpf aufgedreht, Peitschenschlag.
// Variante mit Wurffinte. Für Linkshänder gespiegelt.
import { settings } from './state.js';
import { createGuide } from '../../shared/js/guide/player.js';
import { track, body, mirrorFrames, V } from '../../shared/js/guide/figure.js';
import { sideCam, drawGuideLine } from '../../shared/js/guide/view.js';

const X = 0.08, Y = 7.27, A = -90;   // Standfuß-Fußgelenk knapp hinter der Linie (Fußspitze ~2 cm dahinter), Blick zum Tor
const CUES = [
  '1. Stand: Standfuß (links bei Rechtshand, grün) bis zu einem Meter hinter der 7-m-Linie, Linie nicht berühren. Schrittstellung, Gewicht hinten.',
  '2. Standfuß am Boden (Regel 15:1): ab dem Pfiff bis zum Abwurf muss ein Fuß den Boden berühren (Abrollen und Rutschen erlaubt, Abheben nicht).',
  '3. Drei Sekunden: der Ball muss spätestens 3 Sekunden nach dem Pfiff die Hand verlassen (Regel 14:4).',
  '4. Wurfauslage: Ellbogen auf Schulterhöhe (Oberarm etwa 90° zum Rumpf), Ellbogen etwa 90° gebeugt, Rumpf gegen die Hüfte aufgedreht, Gegenarm zeigt Richtung Tor.',
  '5. Abwurf: Hüfte und Rumpf drehen ein, Ellbogen führt vor der Hand, Handgelenk klappt ab; das hintere Bein darf die Ferse heben.'
];
const HL = ['lThigh', 'lShank', 'lFoot'];
const GOAL = [0.95, 0, 1.75];   // Ziel oben, Wurfarmseite (Rechtshand: von hinten gesehen links oben = x > 0, Blick nach −y)

// Rechtshänder. Beine über Winkel, Stand am linken Fuß (anchor 'l').
function frames(delay){
  const base = {x:X, y:Y, a:A, anchor:'l', air:0,
    lThigh:[-74, 8], lShank:[-84, 0], lFoot:0, rThigh:[-72, 170], rShank:[-82, 175], rFoot:0, lean:3, twist:0,
    lUpper:[-55, 15], lFore:[15, -55], rUpper:[-55, 15], rFore:[15, -55], ball:'both'};
  const cock = {twist:-45, lean:-4, rThigh:[-68, 172], rShank:[-86, 178],
    rUpper:[-10, 100], rFore:[78, 165], lUpper:[12, 15], lFore:[8, 0], ball:'r'};
  const mk = [{j:'rShoulder', label:'Oberarm–Rumpf', target:90, tol:15}, {j:'rElbow', label:'Ellbogen', target:90, tol:15}];
  const f = (t, pose, phase, marks = []) => ({t, pose, phase, marks, hl:HL});
  const T = delay ? 0.55 : 0;   // Finte verlängert den Ablauf (Abwurf bei 1,9 s nach dem Pfiff, statt 1,35 s)
  const fr = [
    f(0, base, '1. Stand: Schrittstellung, Standfuß hinter der Linie'),
    f(0.9, {}, '2. Pfiff: ab jetzt 3 Sekunden'),
    f(1.4, cock, '3. Wurfauslage: Ellbogen auf Schulterhöhe', mk),
    f(1.75, {}, '3. Wurfauslage: Ellbogen auf Schulterhöhe', mk)
  ];
  if(delay) fr.push(
    f(1.95, {twist:-15, lean:6, rUpper:[12, 60], rFore:[70, 120]}, '4. Wurffinte: Arm zuckt vor, Standfuß bleibt'),
    f(2.3, {...cock, twist:-48}, '4. Wurffinte: zurück in die Auslage', mk));
  fr.push(
    f(1.9 + T, {twist:0, lean:12, rUpper:[30, 40], rFore:[60, 10], rFoot:25, rThigh:[-70, 175], rShank:[-58, 175]}, '5. Abwurf: Ellbogen führt, Rumpf dreht ein'),
    f(2.05 + T, {twist:35, lean:22, rUpper:[25, 5], rFore:[30, -5], ball:null, rFoot:40, lUpper:[-40, 120], lFore:[-30, 150]}, '5. Abwurf: Handgelenk klappt ab'),
    f(2.4 + T, {twist:45, lean:30, rUpper:[-40, -30], rFore:[-60, -40], rFoot:45, rThigh:[-63, 172], rShank:[-52, 170]}, '6. Ausschwingen: Standfuß noch am Boden'),
    f(3.1 + T, {}, '6. Ausschwingen: Standfuß noch am Boden'),
    f(3.7 + T, base, '1. Stand'));
  return {fr, release:2.05 + T, dur:3.7 + T};
}

function motion(v, R){
  const {fr, release, dur} = frames(v === 'delay');
  const list = R ? fr : mirrorFrames(fr, 0);
  const tr = track(list, dur), hand = body(tr(release).pose)[R ? 'rHand' : 'lHand'];
  const goal = R ? GOAL : [-GOAL[0], GOAL[1], GOAL[2]];
  return {dur, frame(t){
    const st = tr(t), k = (t - release)/0.45;
    // Ball: nach dem Abwurf in 0,45 s ins Toreck (leichter Bogen).
    const ball = k >= 0 && k <= 1 ? V.add(V.mix(hand, goal, k), [0, 0, 1], 0.25*Math.sin(Math.PI*k)) : null;
    return {...st, hl:R ? HL : HL.map(n => 'r' + n.slice(1)), ball};
  }};
}

const guide = createGuide({
  id:'siebenmeter',
  title:() => '7-m-Wurf: Korrekte Ausführung',
  sub:v => v === 'delay' ? 'Mit Wurffinte, Standfuß bleibt am Boden (Regel 15:1)' : 'Schlagwurf aus dem Stand (Regel 14 und 15, DHB-Kriterien)',
  cues:() => CUES,
  variants:[{id:'clean', label:'Schlagwurf'}, {id:'delay', label:'Mit Wurffinte'}],
  isRightHand:() => settings.hand !== 'L',
  views:[
    {id:'side', label:'Seite', cam:(v, R) => sideCam(X*(R ? 1 : -1), Y, A, {side:R ? -1 : 1, dist:6, lookZ:1.15, fwd:-0.3})},
    {id:'back', label:'Hinten', cam:(v, R) => ({pos:[(R ? 1.6 : -1.6), 11.2, 2.1], look:[0, 5.5, 1.0], fov:52})}
  ],
  motion,
  // 7-m-Linie hervorheben und den Standfuß-Bereich (bis 1 m dahinter) andeuten.
  overlay(ctx, cam){
    drawGuideLine(ctx, cam, [-0.5, 7, 0.005], [0.5, 7, 0.005], '#ff5a5a', '7-m-Linie', []);
    drawGuideLine(ctx, cam, [-0.5, 8, 0.005], [0.5, 8, 0.005], 'rgba(255,255,255,.55)', '1 m', [8, 8]);
  }
});
export const openGuide = guide.openGuide;
export const closeGuide = guide.closeGuide;
export const guideState = guide.state;
export const guideSeek = guide.seek;
