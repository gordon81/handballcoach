// Mikrofon-Pegel anzeigen: in der Einrichtung (Mikro testen, Empfindlichkeit wählen) und als kleine
// Anzeige oben im Bild, solange das Mikrofon an ist. Jede `.meter` auf der Seite wird mitgeführt.
import { $ } from '../dom.js';
import { mic, onShout } from '../shout.js';

// Skala vom Grundpegel −6 dB bis 18 dB über der Schwelle, als Anteil 0–1.
const pos = v => Math.max(0, Math.min(1, (v - mic.floor + 6) / (mic.thr - mic.floor + 24)));
let flashUntil = 0;

function update(){
  requestAnimationFrame(update);
  const chip = $('#micChip'), now = performance.now();
  chip.hidden = !mic.on; chip.classList.toggle('silent', mic.silent);
  for(const m of document.querySelectorAll('.meter')){
    m.querySelector('.lvl').style.width = (mic.on ? pos(mic.level)*100 : 0) + '%';
    m.querySelector('.thr').style.left = pos(mic.thr)*100 + '%';
    m.classList.toggle('hot', mic.on && mic.level > mic.thr);
    m.classList.toggle('flash', now < flashUntil);
  }
}
export function initMicMeter(){
  onShout(() => { flashUntil = performance.now() + 700; });   // erkannter Ruf: Anzeige leuchtet kurz grün
  requestAnimationFrame(update);
}
