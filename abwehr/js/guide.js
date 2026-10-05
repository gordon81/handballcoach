// Anleitungsvideo Abwehr-Beinarbeit (shared/js/guide/): Grundstellung seitlich zur Wurfhand des Gegners (gegen
// Rechtshänder linker Fuß vorn, linke Hand auf Schulterhöhe zum Wurfarm, rechte Hand an die Hüfte; QUELLEN.md),
// Side-Steps ohne Kreuzen und Heraustreten. Der Gegner steht halbdurchsichtig davor. Gegen Linkshänder gespiegelt.
import { settings } from './state.js';
import { createGuide } from '../../shared/js/guide/player.js';
import { track, body, mirror, mirrorFrames } from '../../shared/js/guide/figure.js';
import { sideCam, drawFigure, drawGuideLine } from '../../shared/js/guide/view.js';

const X = -5, Y = 7, A = 90;   // Abwehrspieler, Blick zum Gegner (+y)
const CUES_BASE = [
  '1. Grundstellung: Füße deutlich mehr als schulterbreit, Knie gebeugt (etwa 120–130°), Oberkörper leicht vor, Fersen leicht gelöst.',
  '2. Seitlich zur Wurfhand: gegen einen Rechtshänder steht der linke Fuß eine halbe Schuhlänge vorn (gegen Linkshänder der rechte).',
  '3. Arme: die Hand auf der Wurfarmseite des Gegners etwa auf Schulterhöhe (Führarm), die andere Hand tiefer Richtung Hüfte.',
  '4. Verschieben: flache, schnelle Nachstellschritte zur Seite. Der Fuß in Laufrichtung geht zuerst, die Füße kreuzen nie.',
  '5. Tief bleiben: beim Richtungswechsel nicht aufrichten, die Beckenhöhe bleibt gleich.'
];
const CUES_OUT = [
  '1. Heraustreten: explosiver Schritt nach vorn Richtung Wurfarm des Gegners, zuerst mit dem vorderen Fuß.',
  '2. Fußstellung: der Fuß auf der Wurfarmseite des Gegners bleibt vorn und stemmt gegen den Durchbruch.',
  '3. Führarm: die Hand auf der Wurfarmseite geht an den Wurfarm (Schulter/Oberarm), ohne Festhalten.',
  '4. Sicherungsarm: die andere Hand an die Hüfte des Gegners.',
  '5. Zurück: nach Abspiel oder Stopp sofort rückwärts in die Grundstellung absinken.'
];
const PZ = 0.81;   // Beckenhöhe in der Grundstellung (Knie ~128°)
const ARMS = {lUpper:[2, 40], lFore:[35, 15], rUpper:[-62, 30], rFore:[-12, 0]};   // Führarm links, Sicherungsarm rechts
const base = (dx = 0, dy = 0) => ({x:X + dx, y:Y + dy, a:A, pz:PZ, lean:20, lAt:[X - 0.42 + dx, Y + 0.13 + dy, 0], rAt:[X + 0.42 + dx, Y - 0.07 + dy, 0], lFoot:8, rFoot:8, ...ARMS});
const MK = [{j:'lKnee', label:'Knie', target:128, tol:12}];

function sideSteps(){
  const fr = [{t:0, pose:base(), phase:'1. Grundstellung: tief, seitlich zur Wurfhand', marks:MK}, {t:0.7, pose:{}, phase:'1. Grundstellung: tief, seitlich zur Wurfhand', marks:MK}];
  // Zwei Nachstellschritte nach links (−x), dann zwei nach rechts. Erst der Fuß in Laufrichtung, dann der andere.
  let t = 0.7, x = 0;
  const step = (lead, d, phase) => {
    const [L, Rr] = lead === 'l' ? ['lAt', 'rAt'] : ['rAt', 'lAt'];
    const cur = base(x), lx = lead === 'l' ? cur.lAt : cur.rAt, tx = lead === 'l' ? cur.rAt : cur.lAt, S = 0.55;
    fr.push({t:t += 0.13, ease:'lin', phase, pose:{x:X + x + d*S*0.25, [L]:[lx[0] + d*S*0.5, lx[1], 0.05]}});
    fr.push({t:t += 0.13, ease:'lin', phase, pose:{x:X + x + d*S*0.5, [L]:[lx[0] + d*S, lx[1], 0]}});
    fr.push({t:t += 0.13, ease:'lin', phase, pose:{x:X + x + d*S*0.75, [Rr]:[tx[0] + d*S*0.5, tx[1], 0.05]}});
    fr.push({t:t += 0.13, ease:'lin', phase, pose:{x:X + x + d*S, [Rr]:[tx[0] + d*S, tx[1], 0]}});
    x += d*0.55;
  };
  step('l', -1, '2. Nachstellschritt: Fuß in Laufrichtung zuerst, nie kreuzen');
  step('l', -1, '2. Nachstellschritt: Fuß in Laufrichtung zuerst, nie kreuzen');
  fr.push({t:t += 0.4, pose:{}, phase:'3. Tief bleiben, Beckenhöhe gleich', marks:MK});
  step('r', 1, '4. Zurück: wieder der Fuß in Laufrichtung zuerst');
  step('r', 1, '4. Zurück: wieder der Fuß in Laufrichtung zuerst');
  fr.push({t:t += 0.5, pose:base(), phase:'✓ Grundstellung', marks:MK});
  return {fr, dur:t + 0.4};
}

function stepOut(){
  const b = base(), fr = [
    {t:0, pose:b, phase:'1. Grundstellung vor dem Gegner', marks:MK},
    {t:0.7, pose:{}, phase:'1. Grundstellung vor dem Gegner', marks:MK},
    {t:0.9, ease:'lin', pose:{y:Y + 0.15, lAt:[X - 0.38, Y + 0.45, 0.07], lean:16}, phase:'2. Heraustreten: vorderer Fuß zuerst'},
    {t:1.05, ease:'lin', pose:{y:Y + 0.32, lAt:[X - 0.34, Y + 0.72, 0], lUpper:[18, 25], lFore:[35, 5], rUpper:[-25, 15], rFore:[-8, -15]}, phase:'2. Heraustreten: vorderer Fuß zuerst'},
    {t:1.25, ease:'lin', pose:{y:Y + 0.45, rAt:[X + 0.38, Y + 0.2, 0.06]}, phase:'3. Führarm an den Wurfarm, Sicherungsarm an die Hüfte'},
    {t:1.4, pose:{y:Y + 0.5, rAt:[X + 0.4, Y + 0.33, 0], pz:PZ + 0.02}, phase:'3. Führarm an den Wurfarm, Sicherungsarm an die Hüfte'},
    {t:1.9, pose:{}, phase:'3. Führarm an den Wurfarm, Sicherungsarm an die Hüfte'},
    {t:2.05, ease:'lin', pose:{y:Y + 0.32, rAt:[X + 0.42, Y + 0.02, 0.05], ...ARMS}, phase:'4. Zurück: rückwärts absinken'},
    {t:2.2, ease:'lin', pose:{y:Y + 0.18, rAt:[X + 0.42, Y - 0.07, 0]}, phase:'4. Zurück: rückwärts absinken'},
    {t:2.4, ease:'lin', pose:{y:Y + 0.05, lAt:[X - 0.4, Y + 0.3, 0.05]}, phase:'4. Zurück: rückwärts absinken'},
    {t:2.6, pose:b, phase:'✓ Grundstellung', marks:MK}
  ];
  return {fr, dur:3.2};
}

// Gegner: Rechtshänder in Wurfauslage, Blick zum Abwehrspieler.
const OPP = {x:X, y:Y + 1.35, a:-90, anchor:'both', lThigh:[-80, 20], rThigh:[-82, 160], lShank:[-88, 0], rShank:[-88, 180],
  twist:-35, rUpper:[-5, 100], rFore:[75, 165], lUpper:[-30, 30], lFore:[0, 0], ball:'r', lean:5};

function motion(v, R){
  const {fr, dur} = v === 'out' ? stepOut() : sideSteps();
  return {dur, frame:track(R ? fr : mirrorFrames(fr, X), dur)};
}

const R = () => settings.opp !== 'L';
const guide = createGuide({
  id:'abwehr',
  title:() => 'Abwehr-Beinarbeit: Korrekte Ausführung',
  sub:v => (v === 'out' ? 'Heraustreten (1 gegen 1)' : 'Grundstellung und Verschieben') + (R() ? ' gegen Rechtshänder' : ' gegen Linkshänder'),
  cues:v => v === 'out' ? CUES_OUT : CUES_BASE,
  variants:[{id:'base', label:'Grundstellung & Verschieben'}, {id:'out', label:'Heraustreten (1 gegen 1)'}],
  isRightHand:R,
  views:[
    {id:'front', label:'Schräg vorn', cam:(v, r) => ({pos:[X + (r ? 3.9 : -3.9), Y + 3.4, 1.7], look:[X, Y + 0.4, 0.85], fov:55})},
    {id:'side', label:'Seite', cam:(v, r) => sideCam(X, Y, A, {side:r ? 1 : -1, dist:5.6, lookZ:1.0, h:1.1, fwd:0.4})}
  ],
  motion,
  overlay(ctx, cam, v, r, st, j){
    // Gegner halbdurchsichtig, Wurfarm auf der Seite des vorderen Fußes.
    const op = body(r ? OPP : {...mirror(OPP), x:X});
    ctx.save(); ctx.globalAlpha = 0.4; drawFigure(ctx, cam, op, r ? OPP : mirror(OPP)); ctx.restore();
    // Fußstellung: Linie zwischen den Fußgelenken am Boden.
    drawGuideLine(ctx, cam, [j.lAnk[0], j.lAnk[1], 0.01], [j.rAnk[0], j.rAnk[1], 0.01], '#ffd23a', r ? 'linker Fuß vorn' : 'rechter Fuß vorn', []);
  }
});
export const openGuide = guide.openGuide;
export const closeGuide = guide.closeGuide;
export const guideState = guide.state;
export const guideSeek = guide.seek;
