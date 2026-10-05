// Bedienung aus der Ferne ohne Netz (PLAYBOOK C6, Stufe 1), für alle Trainings:
//  - Start mit Vorlauf: Chip oben „⏱ 10 s“ an/aus (gilt für alle Trainings). Mit Vorlauf zählt die App nach „Start“
//    10 Sekunden herunter (Zeit zum Hinstellen oder das Handy aufhängen), dann startet das Training.
//  - Bluetooth-Presenter (Funk-Klicker für Präsentationen) oder Tastatur: er sendet Tasten, die die Seite empfängt.
//    Weiter (Bild ab, →, ↓): Start, im Training „bereit“ (z. B. 7-m-Pause). Zurück (Bild auf, ←, ↑): im Training
//    „Pause“ / „weiter“. Bildschirm schwarz (B, Punkt) oder Esc: Stopp bzw. Vorlauf abbrechen.
//    Selfie-Auslöser senden meist „Lauter“; das bekommt eine Webseite nicht.
// Die Trainings melden sich mit initRemote() an. Klicks auf „Start“ (#btnStart, „Training starten“ in der Einrichtung)
// werden abgefangen, wenn der Vorlauf an ist und gestartet werden kann.
import { say, beep } from './speech.js';

export const LEAD = 10;   // Sekunden Vorlauf
const KEY = 'hc-lead';
export const NEXT = ['PageDown', 'ArrowRight', 'ArrowDown'], PREV = ['PageUp', 'ArrowLeft', 'ArrowUp'], STOP = ['Escape', 'b', 'B', '.'];
// Welche Taste was bedeutet (ohne Browser, unit-getestet).
export const keyAction = k => NEXT.includes(k) ? 'next' : PREV.includes(k) ? 'prev' : STOP.includes(k) ? 'stop' : null;

let cfg = null, timer = null, box = null, chip = null, until = 0;
const leadOn = () => { try{ return localStorage.getItem(KEY) === '1'; }catch(e){ return false; } };
function setLead(on){ try{ localStorage.setItem(KEY, on ? '1' : '0'); }catch(e){} renderChip(); }
export const counting = () => !!timer;

// cfg: canStart() (Kamera bereit, gestoppt), running(), start(), stop(), next() / prev() im Training (optional),
// hint(text) (optional).
export function initRemote(c){
  cfg = c;
  document.addEventListener('keydown', onKey);
  // Start-Klicks abfangen (Capture-Phase, vor den Klick-Handlern der Trainings).
  document.addEventListener('click', e => {
    const el = e.target.closest?.('#btnStart, #setup [data-a=start]');
    if(!el) return;
    if(timer){ e.stopImmediatePropagation(); e.preventDefault(); cancel('Start abgebrochen.'); return; }
    if(leadOn() && !cfg.running() && cfg.canStart()){ e.stopImmediatePropagation(); e.preventDefault(); countdown(); }
  }, true);
  chip = document.createElement('button');
  chip.id = 'leadChip'; chip.className = 'chip';
  chip.style.cssText = 'pointer-events:auto;min-height:44px;color:inherit;cursor:pointer';
  chip.onclick = () => setLead(!leadOn());
  const hud = document.querySelector('#hud'), fps = hud?.querySelector('#fps');
  hud?.insertBefore(chip, fps || null);
  renderChip();
}
function renderChip(){
  if(!chip) return;
  const on = leadOn();
  chip.textContent = on ? `⏱ ${LEAD} s` : '⏱ aus';
  chip.setAttribute('aria-pressed', on ? 'true' : 'false');
  chip.setAttribute('aria-label', on ? `Start mit ${LEAD} Sekunden Vorlauf, antippen zum Ausschalten` : 'Start ohne Vorlauf, antippen für 10 Sekunden Vorlauf');
}

function onKey(e){
  if(!cfg || e.target.closest?.('input, select, textarea, [contenteditable]') || e.ctrlKey || e.metaKey || e.altKey) return;
  const a = keyAction(e.key); if(!a) return;
  e.preventDefault();
  if(a==='stop'){ if(timer) cancel('Start abgebrochen.'); else if(cfg.running()) cfg.stop(); return; }
  if(timer) return;
  if(cfg.running()){ (a==='next' ? cfg.next : cfg.prev)?.(); return; }
  if(a!=='next') return;
  if(!cfg.canStart()){ cfg.hint?.('Erst am Handy die Kamera starten und einrichten.'); return; }
  if(leadOn()) countdown(); else cfg.start();
}

// Vorlauf: große Zahl im Bild, Ansage am Anfang, Piep in den letzten drei Sekunden. Antippen bricht ab.
function countdown(){
  until = performance.now() + LEAD*1000;
  say(`Start in ${LEAD} Sekunden.`);
  if(!box){
    box = document.createElement('div'); box.id = 'leadBox';
    box.style.cssText = 'position:absolute;inset:0;z-index:50;display:flex;flex-direction:column;align-items:center;justify-content:center;'
      + 'background:rgba(10,14,22,.55);color:#fff;font-family:Barlow,sans-serif;text-align:center';
    box.onclick = () => cancel('Start abgebrochen.');
    (document.querySelector('#stage') || document.body).append(box);
  }
  box.style.display = 'flex';
  let last = null;
  const tick = () => {
    const left = Math.ceil((until - performance.now())/1000);
    if(left <= 0){ stopTimer(); cfg.start(); return; }
    if(left !== last){
      last = left; if(left <= 3) beep(1000, 120);
      box.innerHTML = `<div style="font:800 clamp(96px,34vw,200px)/1 'Barlow Condensed',sans-serif">${left}</div><p style="font-size:18px;margin:8px 16px">Start gleich. Antippen oder Esc bricht ab.</p>`;
    }
  };
  timer = setInterval(tick, 100); tick();
}
function stopTimer(){ clearInterval(timer); timer = null; if(box) box.style.display = 'none'; }
function cancel(msg){ stopTimer(); cfg?.hint?.(msg); }
