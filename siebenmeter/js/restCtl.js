// 7-m-Trainer, Pause zwischen den Würfen: Mikrofon mit Ruf-Erkennung (nur Lautstärke und Klang, siehe
// aussenspieler/js/shoutDetect.js) und die Pausen-Anzeige mit Zähler und zwei großen Tipp-Flächen als Ersatz für den Zuruf.
// Die Abläufe (wann bereit, wann Pause) stehen in main.js, die Regeln in rest.js.
import { DEMO } from './state.js';
import { fmtLeft } from './rest.js';
import { shoutDetector, SENS } from '../../aussenspieler/js/shoutDetect.js';
import { micSampler } from '../../shared/js/mic.js';
import { esc } from '../../shared/js/utils.js';

const sampler = micSampler();
let det = null, quietUntil = 0, handler = () => {};
// fn(kind, t): kind = 'shout' (Zuruf erkannt), 'ready' oder 'hold' (angetippt); t in s wie performance.now()/1000.
export function onCall(fn){ handler = fn; }
const fire = (kind) => handler(kind, performance.now()/1000);
// Eigene Ansage oder Pfiff nicht als Zuruf werten.
export function quietCall(sec){ quietUntil = Math.max(quietUntil, performance.now() + sec*1000); }
// Demo und Tests: Zuruf auslösen, ohne Mikrofon.
export function shoutNow(){ fire('shout'); }
export const callMic = {on:false};

// → Fehlertext, wenn das Mikrofon nicht geht (dann bleibt nur Antippen).
export async function startCall(){
  if(DEMO){ callMic.on = true; return null; }
  if(!sampler.on) det = shoutDetector();
  try{ await sampler.start(); callMic.on = sampler.on; return null; }
  catch(e){ callMic.on = false; return 'Mikrofon nicht verfügbar. Tippe auf „Bereit“, wenn du so weit bist.'; }
}
export function stopCall(){ sampler.stop(); callMic.on = false; }
sampler.onSample((v, hi, now) => {
  if(window.speechSynthesis?.speaking) quietCall(0.4);
  if(det?.push(v, hi, now, SENS.mid, now < quietUntil)) fire('shout');
});

/* ---------- Anzeige ---------- */
let box = null, shown = '';
function ensureBox(){
  if(box) return box;
  const st = document.createElement('style');
  st.textContent = `#restBox{position:absolute;left:50%;top:22%;transform:translateX(-50%);z-index:6;min-width:min(86vw,340px);padding:14px 16px;
      border-radius:16px;background:rgba(10,14,22,.82);color:#fff;text-align:center;font-family:Barlow,sans-serif}
    #restBox .left{font:800 clamp(64px,22vw,120px)/1 'Barlow Condensed',sans-serif;letter-spacing:.02em}
    #restBox .left.held{color:#f6c445}
    #restBox p{margin:6px 0;font-size:17px}
    #restBox .tgt{color:#ffb35c;font-weight:600}
    #restBox .btnrow{display:flex;gap:10px;margin-top:10px}
    #restBox button{flex:1;min-height:56px;font-size:19px;font-weight:600;border-radius:12px;border:0;background:#2b3445;color:#fff}
    #restBox button.go{background:#2f9e5b}`;
  document.head.append(st);
  box = document.createElement('div'); box.id = 'restBox'; box.hidden = true; box.setAttribute('aria-live', 'polite');
  box.addEventListener('click', e => { const b = e.target.closest('[data-r]'); if(b) fire(b.dataset.r); });
  document.querySelector('#stage').append(box);
  return box;
}
// r: restClock oder null (ausblenden). armed: Pfiff steht an (bereit gemeldet). target: nächstes Ziel.
export function renderRest(r, t, {armed = false, target = null, mic = false} = {}){
  const b = ensureBox();
  if(!r && !armed){ if(!b.hidden){ b.hidden = true; shown = ''; } return; }
  const left = r?.left(t), held = !!r?.held && !armed;
  const head = armed ? 'Achtung …' : left == null ? (held ? 'Pause' : 'Ball holen') : fmtLeft(left);
  const how = armed ? 'Pfiff kommt gleich.'
    : held ? `Angehalten. ${mic ? 'Ruf unterwegs: weiter. Ruf an der Linie: bereit.' : 'Tippe „Weiter“ oder „Bereit“.'}`
    : `${mic ? 'Ruf an der Linie: bereit. Ruf unterwegs: Pause.' : 'Tippe „Bereit“, wenn du so weit bist.'}`;
  const key = [head, how, target, held, armed].join('|');
  if(key === shown && !b.hidden) return;
  shown = key; b.hidden = false;
  b.innerHTML = `<div class="left ${held ? 'held' : ''}">${head}</div>${target ? `<p class="tgt">Nächstes Ziel: ${esc(target)}</p>` : ''}<p>${how}</p>
    ${armed ? '' : `<div class="btnrow"><button class="go" data-r="ready">Bereit</button><button data-r="hold">${held ? 'Weiter' : 'Anhalten'}</button></div>`}`;
}
