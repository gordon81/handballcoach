// Auswertung eines Trainings (für Log-Ansicht und Bericht).
import { settings } from './store.js';
import { PRIO } from './feedback.js';

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
export function profileText(){ return `${settings.hand==='R'?'Rechtshänder':'Linkshänder'} auf ${settings.pos==='LA'?'Linksaußen':'Rechtsaußen'}`; }
