// Anleitungsvideo Pässe gegen die Wand (shared/js/guide/): Schlagwurf-Pass mit Gegenbein vorn (grün), Ellbogen auf
// Schulterhöhe, Rumpf verwringt, Handgelenk klappt ab; Ball prallt zurück und wird mit beiden Händen gefangen (Trichter),
// direkt in die nächste Auslage. Für Linkshänder gespiegelt.
import { settings } from './state.js';
import { createGuide } from '../../shared/js/guide/player.js';
import { track, body, mirrorFrames, V } from '../../shared/js/guide/figure.js';
import { sideCam, drawGuideLine } from '../../shared/js/guide/view.js';

const X = -10.2, Y = 6, A = 180, WALL = -14;   // Spieler 3,8 m vor der Wand, Blick zur Wand (−x)
const CUES = [
  '1. Gegenbein vorn: das Bein auf der Gegenseite des Wurfarms (links bei Rechtshand, grün) steht vorn, Schrittstellung.',
  '2. Ellbogen auf Schulterhöhe: Ball über Kopfhöhe, Oberarm etwa 90° zum Rumpf, Ellbogen etwa 90° gebeugt.',
  '3. Rumpfverwringung: Schulterachse dreht beim Ausholen auf, der Schwung kommt aus Beinen, Hüfte und Rumpf.',
  '4. Peitschenschlag: Ellbogen führt, dann Unterarm und Handgelenk, das in Passrichtung abklappt.',
  '5. Fangen mit beiden Händen: Arme dem Ball entgegen, Hände bilden einen Trichter, Ball weich abfangen und gleich wieder hoch in die Auslage.'
];
const HL = ['lThigh', 'lShank', 'lFoot'];

function frames(fast){
  const k = fast ? 0.6 : 1;   // schnelle Passfolge: alles kürzer, Auslage direkt aus dem Fangen
  const stance = {x:X, y:Y, a:A, anchor:'l', air:0, lThigh:[-72, 10], lShank:[-84, 0], rThigh:[-72, 170], rShank:[-82, 175], lFoot:0, rFoot:0, lean:5};
  const cock = {twist:-45, lean:-2, rUpper:[-8, 100], rFore:[78, 160], lUpper:[10, 20], lFore:[5, 0], ball:'r'};
  const mk = [{j:'rShoulder', label:'Oberarm–Rumpf', target:90, tol:15}, {j:'rElbow', label:'Ellbogen', target:90, tol:15}];
  const catchP = {twist:0, lean:8, lUpper:[-5, 20], lFore:[5, -25], rUpper:[-5, 20], rFore:[5, -25], ball:null};
  const f = (t, pose, phase, marks = []) => ({t:t*k, pose, phase, marks, hl:HL});
  const fr = [
    f(0, {...stance, ...cock}, '1. Auslage: Gegenbein vorn, Ellbogen auf Schulterhöhe', mk),
    f(0.6, {}, '1. Auslage: Gegenbein vorn, Ellbogen auf Schulterhöhe', mk),
    f(0.8, {twist:0, lean:10, rUpper:[25, 40], rFore:[60, 10], rFoot:22, rShank:[-64, 175]}, '2. Peitschenschlag: Ellbogen führt'),
    f(0.92, {twist:30, lean:18, rUpper:[20, 5], rFore:[25, -5], ball:null, rFoot:30, rShank:[-58, 175], lUpper:[-40, 120], lFore:[-30, 150]}, '3. Handgelenk klappt ab'),
    f(1.2, {twist:35, lean:20, rUpper:[-30, -20], rFore:[-45, -30]}, '4. Ball prallt von der Wand zurück'),
    f(1.55, {...catchP, rFoot:0, rShank:[-82, 175]}, '5. Fangen: Arme entgegen, Hände als Trichter'),
    f(1.75, {lUpper:[-25, 20], lFore:[20, -30], rUpper:[-25, 20], rFore:[20, -30], ball:'both'}, '5. Fangen: weich abfedern'),
    f(2.2, {...cock}, '6. Direkt wieder in die Auslage', mk),
    f(2.6, {}, '1. Auslage', mk)
  ];
  return {fr, release:0.92*k, catchT:1.68*k, dur:2.6*k};
}

function motion(v, R){
  const {fr, release, catchT, dur} = frames(v === 'speed');
  const tr = track(R ? fr : mirrorFrames(fr, X), dur);
  const hand = body(tr(release).pose)[R ? 'rHand' : 'lHand'], back = body(tr(catchT).pose);
  const catchAt = V.mix(back.lHand, back.rHand, 0.5), wall = [WALL + 0.12, hand[1] - 0.1, 1.55];
  return {dur, frame(t){
    const st = tr(t);
    let ball = null;
    if(t >= release && t < catchT){
      const mid = release + (catchT - release)*0.45;
      ball = t < mid ? V.mix(hand, wall, (t - release)/(mid - release)) : V.mix(wall, catchAt, (t - mid)/(catchT - mid));
    }
    return {...st, hl:R ? HL : HL.map(n => 'r' + n.slice(1)), ball};
  }};
}

const guide = createGuide({
  id:'passen',
  title:() => 'Pässe gegen die Wand: Korrekte Ausführung',
  sub:v => v === 'speed' ? 'Schnelle Passfolge: Fangen und sofort wieder ausholen' : 'Schlagwurf-Pass und Fangen mit beiden Händen',
  cues:() => CUES,
  variants:[{id:'std', label:'Schlagpass'}, {id:'speed', label:'Schnelle Passfolge'}],
  isRightHand:() => settings.hand !== 'L',
  views:[
    {id:'side', label:'Seite', cam:(v, R) => sideCam(X - 1.3, Y, A, {side:R ? -1 : 1, dist:7.2, lookZ:1.25})},
    {id:'back', label:'Hinten', cam:(v, R) => ({pos:[X + 5.2, Y + (R ? 1.6 : -1.6), 2.2], look:[X - 1.6, Y, 1.0], fov:55})}
  ],
  motion,
  // Wand als senkrechte Fläche mit Zielkreuz.
  overlay(ctx, cam){
    const c = [[WALL, Y - 3, 0], [WALL, Y + 3, 0], [WALL, Y + 3, 3], [WALL, Y - 3, 3]].map(cam.proj);
    if(c.every(p => p.z > 0.2)){ ctx.fillStyle = 'rgba(200,205,212,.35)'; ctx.beginPath(); c.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath(); ctx.fill(); }
    drawGuideLine(ctx, cam, [WALL + 0.02, Y - 0.35, 1.55], [WALL + 0.02, Y + 0.15, 1.55], '#ff8a1f', '', []);
    drawGuideLine(ctx, cam, [WALL + 0.02, Y - 0.1, 1.3], [WALL + 0.02, Y - 0.1, 1.8], '#ff8a1f', 'Ziel', []);
  }
});
export const openGuide = guide.openGuide;
export const closeGuide = guide.closeGuide;
export const guideState = guide.state;
export const guideSeek = guide.seek;
