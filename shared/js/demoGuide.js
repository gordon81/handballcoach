// Wiederverwendbarer interaktiver 3D-Player für Anleitungsvideos („Korrekte Ausführung“).
// Zeigt die simulierte Person in Lehrbild-Technik (DHB / KNSU nach QUELLEN.md).
import { esc } from './utils.js';
import { setView, drawFloor, joints as rig, drawPerson, ball } from './demo/scene.js';

const $ = s => document.querySelector(s);

export function createGuide(cfg){
  let activeVariant = cfg.variants?.[0]?.id || 'default';
  let speed = 1.0;
  let playing = true;
  let animId = null;
  let tSim = 0;
  let lastNow = 0;
  let mediaRecorder = null;
  let recordedChunks = [];

  const getR = () => (typeof cfg.isRightHand === 'function' ? cfg.isRightHand() : true);
  const getDuration = () => (typeof cfg.duration === 'function' ? cfg.duration(activeVariant) : (cfg.duration || 3.2));

  function openGuide(variantId){
    if(variantId && cfg.variants?.some(v => v.id === variantId)){
      activeVariant = variantId;
    } else if(cfg.variants?.length){
      activeVariant = cfg.variants[0].id;
    }
    playing = true;
    tSim = 0;
    lastNow = performance.now();

    const sheet = $('#guideSheet');
    if(!sheet) return;
    sheet.hidden = false;

    renderInfo();
    updateCam();
    initEvents();
    startLoop();
  }

  function closeGuide(){
    const sheet = $('#guideSheet');
    if(sheet) sheet.hidden = true;
    stopLoop();
    if(mediaRecorder && mediaRecorder.state === 'recording') mediaRecorder.stop();
    const cam = cfg.restoreCam || cfg.cam;
    if(cam) setView(cam.pos, cam.look);
  }

  function renderInfo(){
    const titleText = typeof cfg.title === 'function' ? cfg.title(activeVariant) : cfg.title;
    const subText = typeof cfg.sub === 'function' ? cfg.sub(activeVariant) : cfg.sub;
    const cuesList = typeof cfg.cues === 'function' ? cfg.cues(activeVariant) : cfg.cues;

    const titleEl = $('#guideTitle'), subEl = $('#guideSub'), cuesEl = $('#guideCues');
    if(titleEl && titleText) titleEl.textContent = titleText;
    if(subEl && subText) subEl.textContent = subText;
    if(cuesEl && cuesList){
      cuesEl.innerHTML = cuesList.map(c => `<li>${esc(c)}</li>`).join('');
    }

    const vSwitch = $('#guideVariantSwitch');
    if(vSwitch){
      if(cfg.variants && cfg.variants.length > 1){
        vSwitch.hidden = false;
        vSwitch.innerHTML = cfg.variants.map(v =>
          `<button data-variant="${esc(v.id)}" class="${v.id === activeVariant ? 'on' : ''}">${esc(v.label)}</button>`
        ).join('');
      } else {
        vSwitch.hidden = true;
      }
    }
  }

  function updateCam(){
    const cam = typeof cfg.cam === 'function' ? cfg.cam(activeVariant) : cfg.cam;
    if(cam) setView(cam.pos, cam.look);
  }

  function startLoop(){
    if(animId) cancelAnimationFrame(animId);
    lastNow = performance.now();
    const loop = now => {
      animId = requestAnimationFrame(loop);
      const dt = Math.min(0.08, (now - lastNow) / 1000 || 0);
      lastNow = now;
      if(playing){
        tSim += dt * speed;
      }
      renderFrame();
    };
    animId = requestAnimationFrame(loop);
  }

  function stopLoop(){
    if(animId){
      cancelAnimationFrame(animId);
      animId = null;
    }
  }

  function renderFrame(){
    const canvas = $('#guideCanvas');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    const R = getR();
    const cycle = getDuration();
    const loopT = tSim % cycle;

    // Simulation-Step aus der Konfiguration
    const simState = cfg.step(loopT, activeVariant, R);
    const P = simState.P;

    // 1. Hallenboden
    drawFloor(ctx);

    // 2. Modul-spezifische Overlays
    if(typeof cfg.drawOverlays === 'function'){
      cfg.drawOverlays(ctx, activeVariant, R, simState);
    }

    // 3. Person aus Gelenken zeichnen
    const j = rig(P, R);
    drawPerson(j, P, R, ctx);

    // 4. Fliegender Ball
    if(simState.ballFly?.cur){
      ball(simState.ballFly.cur, ctx);
    }

    // 5. Phasenbadge
    const phaseEl = $('#guidePhase');
    if(phaseEl && simState.phase){
      phaseEl.textContent = simState.phase;
    }
  }

  function initEvents(){
    const sheet = $('#guideSheet');
    if(!sheet || sheet.dataset.guideInit) return;
    sheet.dataset.guideInit = '1';

    sheet.addEventListener('click', e => {
      const b = e.target.closest('button');
      if(!b) return;

      if(b.matches('[data-close]')){
        closeGuide();
        return;
      }
      if(b.id === 'guidePlay'){
        playing = !playing;
        b.textContent = playing ? '❚❚' : '▶︎';
        return;
      }
      if(b.dataset.speed){
        speed = +b.dataset.speed;
        sheet.querySelectorAll('[data-speed]').forEach(el => el.classList.toggle('on', el === b));
        return;
      }
      if(b.dataset.variant){
        activeVariant = b.dataset.variant;
        tSim = 0;
        renderInfo();
        updateCam();
        return;
      }
      if(b.id === 'guideSave'){
        saveVideoClip(b);
      }
    });
  }

  function saveVideoClip(btnEl){
    const canvas = $('#guideCanvas');
    if(!canvas || !canvas.captureStream) return;

    btnEl.disabled = true;
    btnEl.textContent = 'Aufnahme…';

    recordedChunks = [];
    const stream = canvas.captureStream(30);
    const mime = ['video/mp4;codecs=avc1', 'video/webm;codecs=vp8', 'video/webm']
      .find(m => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || 'video/webm';

    try {
      mediaRecorder = new MediaRecorder(stream, { mimeType: mime });
      mediaRecorder.ondataavailable = e => { if(e.data.size) recordedChunks.push(e.data); };
      mediaRecorder.onstop = () => {
        btnEl.disabled = false;
        btnEl.textContent = 'Speichern';
        const blob = new Blob(recordedChunks, { type: mime.split(';')[0] });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `handballcoach_${cfg.id || 'anleitung'}_${activeVariant}.webm`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      };
      tSim = 0;
      playing = true;
      mediaRecorder.start();
      const durMs = Math.round(getDuration() * 1000);
      setTimeout(() => {
        if(mediaRecorder && mediaRecorder.state === 'recording') mediaRecorder.stop();
      }, durMs);
    } catch(e){
      console.warn('Videoaufnahme fehlgeschlagen', e);
      btnEl.disabled = false;
      btnEl.textContent = 'Speichern';
    }
  }

  return { openGuide, closeGuide };
}
