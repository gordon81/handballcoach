// Auswertung eines Trainings (für Log-Ansicht und Bericht).
import { settings, th } from './store.js';
import { PRIO } from './feedback.js';
import { KL_CM, RR, TXT } from './config.js';

const cm = x => Math.round(x*KL_CM), sgn = x => (x > 0 ? '+' : '') + x;
// Messwerte eines Wurfs (zum Kalibrieren der Grenzen). cm sind über KL_CM geschätzt.
export function measures(m){
  if(!m) return null;
  return {line: m.line!=null ? sgn(cm(m.line)) + ' cm' : '–', arm: sgn(cm(m.arm)) + ' cm', rot: m.rot!=null ? m.rot + '°' : '–',
    jump: cm(m.jump) + ' cm', lean: sgn(m.lean) + '°', fps: m.fps + '', cam: m.cam==='court' ? '2' : '1',
    steps: m.steps!=null ? m.steps + '' : '–', peak: m.peakDt!=null ? sgn(Math.round(m.peakDt*1000)) + ' ms' : '–',
    call: m.callDet!=null ? `${m.callDet} ms` + (m.callLag!=null ? ` / ${m.callLag} ms` : '') : '–'};
}
export function measureText(m){
  const s = measures(m); if(!s) return '';
  return `Kamera ${s.cam} · Linie ${s.line} · Arm ${s.arm} · Drehung ${s.rot} · Sprung ${s.jump} · Oberkörper ${s.lean} · ${s.fps} fps` + (m.callDet!=null ? ` · Ansage ${s.call}` : '')
    + (RR ? ` · Schritte ${s.steps} · Abwurf ${s.peak}` : '') + (m.speed ? ` · Tempo ca. ${m.speed} km/h` : '');
}
export const MEASURE_HELP = (RR ? 'Linie: Fuß beim Absprung zur 9-m-Linie (+ = innerhalb der 9 m). Schritte: Bodenkontakte ab der Zielansage bis zum Absprung. Abwurf: Zeit vom höchsten Punkt der Hüfte bis zum Abwurf (− = früher). '
  : 'Linie: Fuß beim Absprung zur 6-m-Linie (+ = im Torraum, also Übertritt). ') + 'Arm: Handgelenk beim Absprung über (+) oder unter (−) der Nase. '
  + 'Sprung: Hüfte über der Anlauf-Höhe. Oberkörper im höchsten Punkt, also in der Wurfauslage (+ = Richtung Torraum). fps: Bilder pro Sekunde der Pose-Erkennung. Kamera: Position 1 (Grundlinie) oder 2 (Feld mit Tor). '
  + 'Ansage (nur „Entscheidung in der Luft“): wie lange nach dem Absprung die App das Ziel abschickt / die Sprachausgabe wirklich zu sprechen beginnt. '
  + 'Tempo (nur mit angetippten Ringen, Kamera 2): Wurfentfernung / Zeit vom Abwurf bis zum Ball im Ring, grobe Schätzung. '
  + `cm geschätzt (Schulter–Knöchel = ${KL_CM} cm angenommen).`;
export const LIMITS_TEXT = (TH = th()) => `Grenzen${settings.camPos==='court' ? ' (Kamera 2)' : ''}: Sprung hoch ab ${cm(TH.jumpHigh)} cm, mittel ab ${cm(TH.jumpMid)} cm; Drehung ab ${TH.rot}° (falsche Seite ${TH.rotWrongSide}°); `
  + `Oberkörper aufrecht unter ${TH.leanUpright}°, kippt nach vorn ab ${TH.leanForward}°; Arm über der Nase = oben.`;

export function summarize(list){
  const n = list.length, counts = {}, byT = {};
  for(const e of list){
    (e.issues || []).forEach(k => counts[k] = (counts[k] || 0) + 1);
    if(e.target){ const s = byT[e.target] ||= {n:0, hit:0, rated:0, clean:0}; s.n++; if(e.hit!==null){ s.rated++; if(e.hit) s.hit++; } if(!(e.issues || []).length) s.clean++; }
  }
  const clean = list.filter(e => !(e.issues || []).length).length;
  const top = Object.entries(counts).sort((x,y) => y[1] - x[1]);
  const lineN = list.filter(e => !e.noLine).length;
  const rots = list.map(e => e.rot).filter(x => x != null);
  const strengths = n < 3 ? [] : PRIO.filter(k => {
    if(k==='over') return lineN >= 3 && (counts.over || 0)/lineN <= 0.2;
    if(k==='rot' && rots.length < 3) return false;
    return (counts[k] || 0)/n <= 0.2;
  });
  const rotAvg = rots.length ? Math.round(rots.reduce((x,y) => x+y, 0)/rots.length) : null;
  return {n, clean, top, byT, strengths, rotAvg};
}
export function profileText(){ return `${settings.hand==='R'?'Rechtshänder':'Linkshänder'} ${RR ? 'im Rückraum' : 'auf ' + (settings.pos==='LA'?'Linksaußen':'Rechtsaußen')}`; }
