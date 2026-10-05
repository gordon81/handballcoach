// Anleitungsvideo Sprungkraft (shared/js/guide/): Strecksprung beidbeinig (Ausholen bis Knie ~90°, Dreifachstreckung,
// Landung auf den Ballen) und Einbein-Sprung (Standbein links grün, Kniehub rechts bis Oberschenkel waagerecht / Knie 90°,
// Becken waagerecht). Ansicht „Seite“ zeigt die Gelenkwinkel unverzerrt.
import { settings } from './state.js';
import { createGuide } from '../../shared/js/guide/player.js';
import { track } from '../../shared/js/guide/figure.js';
import { sideCam, drawGuideLine } from '../../shared/js/guide/view.js';

const X = -5, Y = 7, A = 90;   // Standort und Blickrichtung (zur Kamera „Vorne“)
const CUES_BOTH = [
  '1. Ausgangsstellung: Füße hüftbreit, aufrecht, Arme locker neben dem Körper.',
  '2. Ausholbewegung: zügig in die Knie bis etwa 90° Kniewinkel, Oberkörper neigt sich vor, Arme schwingen nach hinten-unten.',
  '3. Explosiver Abdruck: Hüfte, Knie und Sprunggelenk gleichzeitig strecken (Dreifachstreckung), Arme schwingen nach oben.',
  '4. Höchster Punkt: Körper voll gestreckt, Fußspitzen nach unten.',
  '5. Landung: zuerst auf den Fußballen, dann über Sprunggelenk und Knie (etwa 120°) weich abfedern, Knie über den Füßen.'
];
const CUES_SINGLE = [
  '1. Einbeiniger Stand: Standbein (grün) leicht gebeugt, freies Knie angehoben, Becken waagerecht.',
  '2. Vorspannung: Standbein bis etwa 120° Kniewinkel beugen, Arme nach hinten.',
  '3. Abdruck mit Kniehub: Standbein ganz strecken, freies Knie explosiv hoch bis der Oberschenkel waagerecht ist (Knie 90°).',
  '4. Körperachse: Rumpf gerade, Becken kippt nicht zur Seite.',
  '5. Landung auf demselben Bein: Ballen zuerst, auf etwa 120° abfedern, Gleichgewicht halten.'
];

const STAND = {x:X, y:Y, a:A, anchor:'both'};
const arms = (u, f) => ({lUpper:u, rUpper:u, lFore:f, rFore:f});
const legs = (t, s, foot = 0) => ({lThigh:t, rThigh:t, lShank:s, rShank:s, lFoot:foot, rFoot:foot});

function both(){
  return {dur:3.4, frame:track([
    {t:0, pose:{...STAND, ...legs([-88, 90], [-90, 0]), ...arms([-85, 90], [-80, 20]), lean:0, air:0}, phase:'1. Ausgangsstellung: aufrecht, Füße hüftbreit'},
    {t:0.5, pose:{}, phase:'1. Ausgangsstellung: aufrecht, Füße hüftbreit'},
    {t:1.0, pose:{...legs([-40, 0], [-50, 180]), ...arms([-45, 180], [-40, 180]), lean:40},
      phase:'2. Ausholen: Knie ~90°, Arme nach hinten', marks:[{j:'lKnee', label:'Knie', target:90}, {j:'lHip', label:'Hüfte'}]},
    {t:1.5, pose:{}, phase:'2. Ausholen: Knie ~90°, Arme nach hinten', marks:[{j:'lKnee', label:'Knie', target:90}, {j:'lHip', label:'Hüfte'}]},
    {t:1.75, pose:{...legs([-90, 0], [-90, 0], 55), ...arms([70, 0], [80, 0]), lean:4, air:0},
      phase:'3. Abdruck: Hüfte, Knie, Fuß strecken', marks:[{j:'lKnee', label:'Knie', target:180}]},
    {t:1.9, pose:{air:0.22, lFoot:60, rFoot:60}, ease:'lin', phase:'3. Abdruck: Hüfte, Knie, Fuß strecken', marks:[{j:'lKnee', label:'Knie', target:180}]},
    {t:2.05, pose:{air:0.40, ...arms([80, 0], [85, 0])}, phase:'4. Höchster Punkt: voll gestreckt', marks:[{j:'lKnee', label:'Knie', target:180}]},
    {t:2.35, pose:{air:0.40}, phase:'4. Höchster Punkt: voll gestreckt'},
    {t:2.55, pose:{air:0.12, lFoot:35, rFoot:35, ...arms([30, 0], [30, 0])}, ease:'lin', phase:'5. Landung: Ballen zuerst'},
    {t:2.65, pose:{air:0, ...legs([-80, 0], [-96, 180], 25), lean:8}, ease:'lin', phase:'5. Landung: Ballen zuerst'},
    {t:2.85, pose:{...legs([-55, 0], [-65, 180], 0), ...arms([-30, 0], [-10, 0]), lean:25},
      phase:'5. Landung: weich abfedern, Knie ~120°', marks:[{j:'lKnee', label:'Knie', target:120}]},
    {t:3.1, pose:{}, phase:'5. Landung: weich abfedern, Knie ~120°', marks:[{j:'lKnee', label:'Knie', target:120}]},
    {t:3.4, pose:{...legs([-88, 90], [-90, 0]), ...arms([-85, 90], [-80, 20]), lean:0}, phase:'1. Ausgangsstellung'}
  ], 3.4)};
}

// Einbein: links Standbein (grün), rechts frei. Der Stand bleibt am linken Fuß (anchor 'l').
function single(){
  const S = {...STAND, anchor:'l'}, HL = ['lThigh', 'lShank', 'lFoot'];
  const free = (t, s) => ({rThigh:t, rShank:s, rFoot:20});
  const f = (t, pose, phase, marks = []) => ({t, pose, phase, marks, hl:HL});
  const fr = track([
    f(0, {...S, lThigh:[-80, 0], lShank:[-96, 180], lFoot:0, ...free([-45, 0], [-90, 0]), ...arms([-75, 90], [-70, 30]), lean:3},
      '1. Einbeiniger Stand: Standbein leicht gebeugt', [{j:'rKnee', label:'freies Knie'}]),
    f(0.6, {}, '1. Einbeiniger Stand: Becken waagerecht', [{j:'rKnee', label:'freies Knie'}]),
    f(1.2, {lThigh:[-50, 0], lShank:[-70, 180], ...free([-58, 0], [-38, 180]), ...arms([-50, 180], [-40, 180]), lean:28},
      '2. Vorspannung: Standbein ~120°', [{j:'lKnee', label:'Standbein', target:120}]),
    f(1.6, {}, '2. Vorspannung: Standbein ~120°', [{j:'lKnee', label:'Standbein', target:120}]),
    f(1.85, {lThigh:[-90, 0], lShank:[-90, 0], lFoot:55, ...free([0, 0], [-90, 0]), ...arms([70, 0], [80, 0]), lean:2, air:0},
      '3. Abdruck mit Kniehub: Oberschenkel waagerecht', [{j:'rKnee', label:'Kniehub', target:90}, {j:'lKnee', label:'Standbein', target:180}]),
    f(2.05, {air:0.28, lFoot:60, ...free([5, 0], [-88, 0])}, '4. Flug: Rumpf gerade, Becken waagerecht', [{j:'rKnee', label:'Kniehub', target:90}]),
    f(2.35, {air:0.28}, '4. Flug: Rumpf gerade, Becken waagerecht', [{j:'rKnee', label:'Kniehub', target:90}]),
    f(2.6, {air:0, lFoot:30, lThigh:[-82, 0], lShank:[-95, 180], ...free([-25, 0], [-90, 0]), ...arms([-40, 90], [-30, 60])},
      '5. Landung auf demselben Bein: Ballen zuerst'),
    f(2.85, {lFoot:0, lThigh:[-55, 0], lShank:[-65, 180], ...free([-40, 0], [-100, 0]), lean:22},
      '5. Landung: auf ~120° abfedern, Gleichgewicht', [{j:'lKnee', label:'Standbein', target:120}]),
    f(3.2, {}, '5. Landung: auf ~120° abfedern, Gleichgewicht', [{j:'lKnee', label:'Standbein', target:120}]),
    f(3.6, {lThigh:[-80, 0], lShank:[-96, 180], ...free([-45, 0], [-90, 0]), ...arms([-75, 90], [-70, 30]), lean:3}, '1. Einbeiniger Stand')
  ], 3.6);
  return {dur:3.6, frame:t => ({...fr(t), hl:HL})};
}

const guide = createGuide({
  id:'sprung',
  title:() => 'Sprungkraft: Korrekte Ausführung',
  sub:v => v === 'single' ? 'Einbein-Sprung: Kniehub und Becken waagerecht' : 'Strecksprung beidbeinig: Ausholen, Dreifachstreckung, Landung',
  cues:v => v === 'single' ? CUES_SINGLE : CUES_BOTH,
  variants:[{id:'both', label:'Strecksprung (beidbeinig)'}, {id:'single', label:'Einbein-Sprung'}],
  views:[
    {id:'side', label:'Seite', cam:v => sideCam(X, Y, A, {side:v === 'single' ? 1 : -1})},
    {id:'front', label:'Vorne', cam:() => ({pos:[X + 1.4, Y + 5.6, 1.25], look:[X, Y, 1.3], fov:50})}
  ],
  motion:v => v === 'single' ? single() : both(),
  // Einbein, Ansicht vorne: Waagerechte auf Beckenhöhe zum Vergleich mit der Hüftlinie.
  overlay(ctx, cam, v, R, st, j, view){
    if(v !== 'single' || view !== 'front') return;
    const m = [(j.lHip[0] + j.rHip[0])/2, (j.lHip[1] + j.rHip[1])/2, (j.lHip[2] + j.rHip[2])/2];
    drawGuideLine(ctx, cam, [m[0] - 0.45, m[1], m[2]], [m[0] + 0.45, m[1], m[2]], 'rgba(255,255,255,.7)', 'Becken waagerecht');
  }
});
export const openGuide = v => guide.openGuide(v ?? settings.ex);
export const closeGuide = guide.closeGuide;
export const guideState = guide.state;
export const guideSeek = guide.seek;
