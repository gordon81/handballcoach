// Linie ablaufen: Eine Person geht auf Sprachansage die 6-m-Linie entlang, die Pose-Erkennung
// sammelt die Fußpunkte als grobe Lage. Im Kamerabild wird dann der gemalte Strich am Boden gesucht
// und die Linie darauf eingerastet (sonst bleiben die Fußpunkte). Danach zwei Schritte in den Torraum = Torraum-Seite.
import { canvas } from './dom.js';
import { dist } from '../../shared/js/utils.js';
import { say } from '../../shared/js/speech.js';
import { curve, saveLine } from './line.js';
import { grabFrame, medianFrame, snapLine, simplify } from './lineDetect.js';
import { makeRef } from './camCheck.js';
import { TXT } from './config.js';

// phase: null | 'wait' (an den Anfang stellen) | 'walk' (Linie entlang) | 'inside' (in den Torraum)
// snapped: Linie am Boden erkannt (true) oder nur aus Fußpunkten (false)
export const wizard = {phase:null, msg:'', path:[], pts:null, snapped:false};
let hist = [], start = null, moved = false, phaseT = 0, lastT = 0, listener = () => {};
let frames = [], frameT = 0, bodyLen = 0, bgImg = null;   // Bilder während des Laufs (Median ohne Person)
export function onWizardChange(fn){ listener = fn; }

function setPhase(phase, msg, speak){
  wizard.phase = phase; wizard.msg = msg; phaseT = lastT; hist = [];
  if(speak) say(speak);
  listener();
}
export function startWizard(){
  wizard.path = []; wizard.pts = null; wizard.snapped = false; moved = false; frames = []; bgImg = null;
  setPhase('wait', `Stell dich ans äußere Ende der ${TXT.line}, Füße auf der Linie, und warte kurz.`,
    `Stell dich ans äußere Ende der ${TXT.lineSay} und warte kurz.`);
}
export function stopWizard(msg){ wizard.phase = null; wizard.path = []; wizard.pts = null; wizard.msg = msg || ''; frames = []; listener(); }
// Lauf vorzeitig beenden (Button „Fertig“).
export function finishWalkNow(){ if(wizard.phase==='walk') finishWalk(); }

// Bodenpunkt des aufstehenden Fußes (der tiefere im Bild), normiert 0–1.
function groundPoint(f){
  const ft = f.foot[0].y >= f.foot[1].y ? f.foot[0] : f.foot[1];
  return {x:(ft.toe.x+ft.heel.x)/2/canvas.width, y:(ft.toe.y+ft.heel.y)/2/canvas.height};
}

// Pro Videobild aus der Hauptschleife.
export function wizardFrame(f, t){
  if(!wizard.phase) return;
  lastT = t;
  if(!f || !f.valid) return;
  const gp = groundPoint(f);
  hist.push({t, hip:f.hip, gp}); while(hist.length && t-hist[0].t > 1.2) hist.shift();
  const still = hist.length >= 5 && t-hist[0].t >= 0.9 && hist.every(h => dist(h.hip, f.hip) < 0.06*f.bodyLen);

  if(wizard.phase==='wait'){
    if(still && t-phaseT > 1.5){
      start = f.hip; moved = false; frames = [grabFrame()]; frameT = t;
      setPhase('walk', 'Langsam auf der Linie nach innen gehen, am Ende stehen bleiben.',
        'Los, langsam auf der Linie gehen. Am Ende stehen bleiben.');
    }
  } else if(wizard.phase==='walk'){
    wizard.path.push(gp); bodyLen = f.bodyLen;
    if(t-frameT > 1.2){ frames.push(grabFrame()); frameT = t; if(frames.length > 6) frames.splice(1, 1); }
    if(!moved && dist(f.hip, start) > 0.8*f.bodyLen) moved = true;
    if((moved && still) || t-phaseT > 30) finishWalk();
  } else if(wizard.phase==='inside'){
    if(start===null) start = f.hip;          // Standpunkt am Ende der Linie
    if(!moved && dist(f.hip, start) > 0.3*f.bodyLen) moved = true;
    if(moved && still){
      const p = gp, c = curve(wizard.pts), ar = canvas.width/canvas.height;
      const dLine = Math.min(...c.map(q => Math.hypot((q.x-p.x)*ar, q.y-p.y)));
      if(dLine > 0.15*f.bodyLen/canvas.height){
        saveLine(wizard.pts, p, {snapped:wizard.snapped, ref:makeRef(bgImg || undefined)});
        stopWizard(wizard.snapped ? 'Linie am Boden erkannt und gespeichert. Passt die rote Linie?' : 'Linie aus den Fußpunkten gespeichert (Strich am Boden nicht sicher erkannt). Passt die rote Linie?');
        say('Linie gespeichert.');
      }
    } else if(t-phaseT > 20){
      stopWizard(`${TXT.insideLabel}-Seite nicht erkannt. Tippe bitte ${TXT.insideTap.replace(' antippen', '')} an.`);
    }
  }
}

function finishWalk(){
  const ar = canvas.width/canvas.height, pts = simplify(wizard.path, ar);
  if(pts.length < 2){ stopWizard('Zu wenig Weg erkannt. Nochmal ablaufen oder Punkte antippen.'); say('Das hat nicht geklappt. Lauf die Linie bitte noch einmal ab, oder tippe sie an.'); return; }
  // Gemalten Strich in der Nähe der Fußpunkte suchen (Bild ohne Person: Median der Lauf-Bilder).
  frames.push(grabFrame()); bgImg = medianFrame(frames); frames = [];
  const sn = snapLine(pts, 0.3*bodyLen/canvas.height, bgImg), sp = sn ? simplify(sn.pts, ar) : [];
  wizard.snapped = sp.length >= 2;
  wizard.pts = wizard.snapped ? sp : pts; start = null; moved = false;
  setPhase('inside', (wizard.snapped ? 'Linie am Boden erkannt (gelb). ' : 'Linie aus den Fußpunkten (gelb). ') + `Jetzt ${TXT.insideSay} und stehen bleiben.`,
    `Gut. Jetzt ${TXT.insideSay} und stehen bleiben.`);
}
