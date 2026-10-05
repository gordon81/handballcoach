// Player der Anleitungsvideos („▶ Video: Korrekte Ausführung“) für alle Trainings: Lehrbild-Figur aus Gelenkwinkeln
// (figure.js), eigene Kamera und Halle (view.js), Winkelmarken, Varianten, Ansichten (Seite = echte Winkel), Tempo,
// Video speichern. Ganz getrennt vom Demo-Modus: eigener Zeichenstand, und im Demo (?demo=1) gibt es keine Anleitungsvideos.
//
// cfg: {id, title(v), sub(v), cues(v), variants:[{id, label}], views:[{id, label, cam(v, R, j)}], isRightHand(),
//       motion(v, R) → {dur, frame(t) → {pose, phase, marks, hl, ball}}, overlay(ctx, cam, v, R, st, j, viewId)}
// ball: 3D-Punkt eines fliegenden Balls oder null. Elemente im Fenster #guideSheet wie bisher.
import { esc } from '../utils.js';
import { body } from './figure.js';
import { camera, drawCourt, drawFigure, drawMarks, drawBall } from './view.js';

export const GUIDE_IN_DEMO = false;
const DEMO = new URLSearchParams(globalThis.location?.search ?? '').has('demo');
if(DEMO && !GUIDE_IN_DEMO && globalThis.document){
  const st = document.createElement('style'); st.textContent = '.guideBtn{display:none!important}'; document.head.append(st);
}
const $ = s => document.querySelector(s);
// Mehrere Anleitungen (z. B. je Aufgabe) teilen sich #guideSheet: Klicks gehen an die zuletzt geöffnete.
let current = null;
function initEvents(){
  const sheet = $('#guideSheet');
  if(!sheet || sheet.dataset.guideInit) return;
  sheet.dataset.guideInit = '1';
  sheet.addEventListener('click', e => { const b = e.target.closest('button'); if(b) current?.(b); });
}

export function createGuide(cfg){
  let variant = cfg.variants?.[0]?.id || 'default', view = cfg.views?.[0]?.id || 'side';
  let speed = 1, playing = true, animId = null, tSim = 0, lastNow = 0, motion = null, rec = null;
  const R = () => (cfg.isRightHand ? cfg.isRightHand() : true);
  const pick = (f, ...a) => typeof f === 'function' ? f(...a) : f;

  function openGuide(v){
    if(DEMO && !GUIDE_IN_DEMO) return;
    if(v && cfg.variants?.some(x => x.id === v)) variant = v;
    else if(cfg.variants?.length && !cfg.variants.some(x => x.id === variant)) variant = cfg.variants[0].id;
    const sheet = $('#guideSheet'); if(!sheet) return;
    sheet.hidden = false; playing = true; tSim = 0;
    motion = cfg.motion(variant, R());
    current = onButton; initEvents(); renderInfo(); start();
  }
  function closeGuide(){
    const sheet = $('#guideSheet'); if(sheet) sheet.hidden = true;
    if(animId) cancelAnimationFrame(animId); animId = null;
    if(rec?.state === 'recording') rec.stop();
  }

  function renderInfo(){
    if($('#guideTitle')) $('#guideTitle').textContent = pick(cfg.title, variant);
    if($('#guideSub')) $('#guideSub').textContent = pick(cfg.sub, variant);
    if($('#guideCues')) $('#guideCues').innerHTML = (pick(cfg.cues, variant) || []).map(c => `<li>${esc(c)}</li>`).join('');
    const vs = $('#guideVariantSwitch') || $('#guideHeightSwitch');
    if(vs){
      vs.hidden = !(cfg.variants?.length > 1);
      vs.innerHTML = (cfg.variants || []).map(x => `<button data-variant="${esc(x.id)}" class="${x.id===variant ? 'on' : ''}">${esc(x.label)}</button>`).join('');
    }
    const bar = $('#guideSheet .guidebar');
    if($('#guideCam')) $('#guideCam').hidden = true;   // alte Kamera-Taste (Außenwurf) ersetzt durch die Ansichten
    if(bar){
      bar.querySelectorAll('[data-view]').forEach(b => b.remove());
      if(cfg.views?.length > 1) for(const w of cfg.views){
        const b = document.createElement('button'); b.dataset.view = w.id; b.textContent = w.label; b.classList.toggle('on', w.id===view);
        bar.insertBefore(b, $('#guideSave'));
      }
    }
    const pb = $('#guidePlay'); if(pb) pb.textContent = playing ? '❚❚' : '▶︎';
  }

  function start(){
    if(animId) cancelAnimationFrame(animId);
    lastNow = performance.now();
    const loop = now => {
      animId = requestAnimationFrame(loop);
      const dt = Math.min(0.08, (now - lastNow)/1000 || 0); lastNow = now;
      if(playing) tSim += dt*speed;
      render();
    };
    animId = requestAnimationFrame(loop);
  }

  // Ein Bild: Halle, Hilfslinien des Trainings, Figur, Winkelmarken, fliegender Ball, Phase.
  function render(){
    const cv = $('#guideCanvas'); if(!cv || !motion) return;
    const ctx = cv.getContext('2d'), r = R();
    const st = motion.frame(tSim % motion.dur), j = body(st.pose);
    const w = cfg.views?.find(x => x.id===view) || cfg.views?.[0];
    const cam = camera(ctx, w.cam(variant, r, j));   // j: Kamera darf mitschwenken (Anlauf)
    drawCourt(ctx, cam);
    cfg.overlay?.(ctx, cam, variant, r, st, j, w.id);
    drawFigure(ctx, cam, j, st.pose, {hl:st.hl || []});
    if(st.ball) drawBall(ctx, cam, st.ball);
    drawMarks(ctx, cam, j, st.marks || []);
    const ph = $('#guidePhase'); if(ph && st.phase) ph.textContent = st.phase;
  }
  // Für Tests: aktueller Stand (Phase, Gelenkwinkel im Bild).
  function state(){ const st = motion?.frame(tSim % motion.dur); return st && {t:tSim % motion.dur, phase:st.phase, pose:st.pose, j:body(st.pose), variant, view}; }
  function seek(t){ tSim = t; playing = false; render(); renderInfo(); }

  function onButton(b){
    const sheet = $('#guideSheet');
    if(b.matches('[data-close]')) closeGuide();
    else if(b.id === 'guidePlay'){ playing = !playing; renderInfo(); }
    else if(b.dataset.speed){ speed = +b.dataset.speed; sheet.querySelectorAll('[data-speed]').forEach(x => x.classList.toggle('on', x === b)); }
    else if(b.dataset.variant){ variant = b.dataset.variant; tSim = 0; motion = cfg.motion(variant, R()); renderInfo(); }
    else if(b.dataset.view){ view = b.dataset.view; renderInfo(); }
    else if(b.id === 'guideSave') save(b);
  }

  // Einen Durchlauf als Video speichern.
  function save(btn){
    const cv = $('#guideCanvas'); if(!cv?.captureStream || !window.MediaRecorder) return;
    btn.disabled = true; btn.textContent = 'Aufnahme…';
    const chunks = [], mime = ['video/mp4;codecs=avc1', 'video/webm;codecs=vp8', 'video/webm'].find(m => MediaRecorder.isTypeSupported(m)) || 'video/webm';
    try{
      rec = new MediaRecorder(cv.captureStream(30), {mimeType:mime});
      rec.ondataavailable = e => { if(e.data.size) chunks.push(e.data); };
      rec.onstop = () => {
        btn.disabled = false; btn.textContent = 'Speichern';
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(chunks, {type:mime.split(';')[0]}));
        a.download = `handballcoach_${cfg.id || 'anleitung'}_${variant}.${mime.includes('mp4') ? 'mp4' : 'webm'}`; a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      };
      tSim = 0; playing = true; rec.start();
      setTimeout(() => { if(rec?.state === 'recording') rec.stop(); }, Math.round(motion.dur/speed*1000));
    }catch(e){ console.warn('Videoaufnahme fehlgeschlagen', e); btn.disabled = false; btn.textContent = 'Speichern'; }
  }

  return {openGuide, closeGuide, state, seek};
}
