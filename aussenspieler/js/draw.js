// Overlay zeichnen: 6-m-Linie, Markierungspunkte und Skelett.
import { BONES, TXT } from './config.js';
import { app } from './state.js';
import { settings } from './store.js';
import { canvas, ctx } from './dom.js';
import { curve } from './line.js';
import { wizard } from './lineWizard.js';
import { drawRings } from './rings.js';

export function draw(){
  const W = canvas.width, Hh = canvas.height, lw = Math.max(2, W/350);
  ctx.clearRect(0, 0, W, Hh);
  const l = settings.line, marking = app.marking;
  if(l){
    const c = curve(l.pts).map(p => ({x:p.x*W, y:p.y*Hh})), n = c.length;
    const ext = (p, q) => ({x:p.x+(p.x-q.x)*30, y:p.y+(p.y-q.y)*30});   // Endstücke verlängert
    ctx.strokeStyle = '#ff5a5a'; ctx.lineWidth = lw*1.5; ctx.setLineDash([lw*5, lw*3]);
    ctx.beginPath(); const s0 = ext(c[0], c[1]); ctx.moveTo(s0.x, s0.y);
    for(const p of c) ctx.lineTo(p.x, p.y);
    const s1 = ext(c[n-1], c[n-2]); ctx.lineTo(s1.x, s1.y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,90,90,.9)'; ctx.font = `600 ${lw*7}px Barlow, sans-serif`;
    ctx.fillText(TXT.insideLabel, l.inside.x*W + lw*3, l.inside.y*Hh);
  }
  if(marking && marking.length > 1){
    ctx.strokeStyle = 'rgba(255,90,90,.7)'; ctx.lineWidth = lw;
    ctx.beginPath(); curve(marking).forEach((p,i) => i ? ctx.lineTo(p.x*W, p.y*Hh) : ctx.moveTo(p.x*W, p.y*Hh)); ctx.stroke();
  }
  if(marking) for(const p of marking){ ctx.fillStyle = '#ff5a5a'; ctx.beginPath(); ctx.arc(p.x*W, p.y*Hh, lw*4, 0, 7); ctx.fill(); }
  if(wizard.phase){   // Linie ablaufen: gesammelte Fußpunkte und erkannte Linie
    ctx.fillStyle = '#f6c445';
    for(const p of wizard.path){ ctx.beginPath(); ctx.arc(p.x*W, p.y*Hh, lw*1.5, 0, 7); ctx.fill(); }
    if(wizard.pts){
      ctx.strokeStyle = '#f6c445'; ctx.lineWidth = lw*1.5;
      ctx.beginPath(); curve(wizard.pts).forEach((p,i) => i ? ctx.lineTo(p.x*W, p.y*Hh) : ctx.moveTo(p.x*W, p.y*Hh)); ctx.stroke();
    }
  }
  drawRings(ctx, W, Hh, lw);
  if(app.latest){
    const lm = app.latest.lm, R = settings.hand==='R', arm = R ? [12,14,16] : [11,13,15];
    for(const [i,j] of BONES){
      const hot = arm.includes(i) && arm.includes(j);
      ctx.strokeStyle = hot ? '#ff8a1f' : 'rgba(255,255,255,.85)'; ctx.lineWidth = hot ? lw*2 : lw;
      ctx.beginPath(); ctx.moveTo(lm[i].x*W, lm[i].y*Hh); ctx.lineTo(lm[j].x*W, lm[j].y*Hh); ctx.stroke();
    }
    ctx.fillStyle = '#3d8bff';
    for(const i of [0,11,12,13,14,15,16,23,24,25,26,27,28,31,32]){ ctx.beginPath(); ctx.arc(lm[i].x*W, lm[i].y*Hh, lw*1.6, 0, 7); ctx.fill(); }
  }
}
