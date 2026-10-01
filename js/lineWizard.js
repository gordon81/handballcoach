// Linie ablaufen: Eine Person geht auf Sprachansage die 6-m-Linie entlang, die Pose-Erkennung
// sammelt die Fußpunkte und macht daraus die Linie. Danach zwei Schritte in den Torraum = Torraum-Seite.
import { canvas } from './dom.js';
import { dist } from './utils.js';
import { say } from './speech.js';
import { curve, saveLine } from './line.js';

// phase: null | 'wait' (an den Anfang stellen) | 'walk' (Linie entlang) | 'inside' (in den Torraum)
export const wizard = {phase:null, msg:'', path:[], pts:null};
let hist = [], start = null, moved = false, phaseT = 0, lastT = 0, listener = () => {};
export function onWizardChange(fn){ listener = fn; }

function setPhase(phase, msg, speak){
  wizard.phase = phase; wizard.msg = msg; phaseT = lastT; hist = [];
  if(speak) say(speak);
  listener();
}
export function startWizard(){
  wizard.path = []; wizard.pts = null; moved = false;
  setPhase('wait', 'Stell dich ans äußere Ende der 6-m-Linie, Füße auf der Linie, und warte kurz.',
    'Stell dich ans äußere Ende der Sechs-Meter-Linie und warte kurz.');
}
export function stopWizard(msg){ wizard.phase = null; wizard.path = []; wizard.pts = null; wizard.msg = msg || ''; listener(); }
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
      start = f.hip; moved = false;
      setPhase('walk', 'Langsam auf der Linie nach innen gehen, am Ende stehen bleiben.',
        'Los, langsam auf der Linie gehen. Am Ende stehen bleiben.');
    }
  } else if(wizard.phase==='walk'){
    wizard.path.push(gp);
    if(!moved && dist(f.hip, start) > 0.8*f.bodyLen) moved = true;
    if((moved && still) || t-phaseT > 30) finishWalk();
  } else if(wizard.phase==='inside'){
    if(start===null) start = f.hip;          // Standpunkt am Ende der Linie
    if(!moved && dist(f.hip, start) > 0.3*f.bodyLen) moved = true;
    if(moved && still){
      const p = gp, c = curve(wizard.pts), ar = canvas.width/canvas.height;
      const dLine = Math.min(...c.map(q => Math.hypot((q.x-p.x)*ar, q.y-p.y)));
      if(dLine > 0.15*f.bodyLen/canvas.height){
        saveLine(wizard.pts, p);
        stopWizard('Linie gespeichert. Prüfe im Bild, ob die rote Linie passt.');
        say('Linie gespeichert.');
      }
    } else if(t-phaseT > 20){
      stopWizard('Torraum nicht erkannt. Tippe den Punkt im Torraum bitte an.');
    }
  }
}

function finishWalk(){
  const pts = reduce(wizard.path);
  if(pts.length < 2){ stopWizard('Zu wenig Weg erkannt. Nochmal ablaufen oder Punkte antippen.'); say('Das hat nicht geklappt.'); return; }
  wizard.pts = pts; start = null; moved = false;
  setPhase('inside', 'Jetzt zwei Schritte in den Torraum gehen und stehen bleiben.',
    'Gut. Jetzt zwei Schritte in den Torraum gehen und stehen bleiben.');
}

// Fußpunkte glätten und in gleichen Abständen auf 3–7 Linienpunkte reduzieren.
function reduce(path){
  if(path.length < 5) return [];
  const med = a => { const s = [...a].sort((x,y) => x-y); return s[s.length>>1]; };
  const sm = path.map((_, i) => { const w = path.slice(Math.max(0, i-3), i+4); return {x:med(w.map(p => p.x)), y:med(w.map(p => p.y))}; });
  const ar = canvas.width/canvas.height, d = [0];
  for(let i=1; i<sm.length; i++) d.push(d[i-1] + Math.hypot((sm[i].x-sm[i-1].x)*ar, sm[i].y-sm[i-1].y));
  const len = d.at(-1); if(len < 0.05) return [];
  const n = Math.max(3, Math.min(7, Math.round(len/0.06) + 1)), out = [];
  for(let k=0; k<n; k++){ let i = d.findIndex(v => v >= len*k/(n-1)); if(i < 0) i = sm.length-1; out.push(sm[i]); }
  return out;
}
