// Zuruf erkennen: das Mikrofon hört auf einen lauten Ruf des Spielers („Hey!“, „Los!“).
// Kein Spracherkenner, nur Lautstärke und Klang (siehe shoutDetect.js): läuft offline, ohne Server, und
// ein Ruf ist im Hallenlärm verlässlicher zu erkennen als ein bestimmtes Wort.
import { DEMO } from './config.js';
import { settings } from './store.js';
import { shoutDetector, SENS } from './shoutDetect.js';
import { micSampler } from '../../shared/js/mic.js';

export { SENS };
// level/floor/thr in dB (Stimmbereich), für Anzeigen. silent = Mikrofon liefert keinen Ton.
export const mic = {on:false, level:-100, floor:-60, thr:-60, silent:false};
const sampler = micSampler();
let det = null, quietUntil = 0;
const listeners = new Set();

export function onShout(fn){ listeners.add(fn); return () => listeners.delete(fn); }
const fire = () => listeners.forEach(fn => fn());
// Eigene Ansage oder Piepton nicht als Zuruf werten.
export function quiet(sec){ quietUntil = Math.max(quietUntil, performance.now() + sec*1000); }
// Demo und Tests: Zuruf auslösen, ohne Mikrofon.
export function shoutNow(){ fire(); }

// Mikrofon (shared/js/mic.js) mit der Ruf-Erkennung verbinden. Mehrfaches Aufrufen startet nur einmal; stopMic()
// während des Starts lässt es aus.
export async function startMic(){
  if(DEMO){ mic.on = true; return; }   // Demo: die simulierte Person „ruft“ per shoutNow()
  if(!sampler.on) det = shoutDetector();
  await sampler.start();
  mic.on = sampler.on; mic.silent = false;
}
export function stopMic(){ sampler.stop(); mic.on = false; mic.level = -100; }

sampler.onSample((v, hi, now) => {
  if(window.speechSynthesis?.speaking) quiet(0.4);
  const hit = det.push(v, hi, now, SENS[settings.sens] ?? SENS.mid, now < quietUntil);
  mic.level = v; mic.floor = det.floor; mic.thr = det.thr; mic.silent = sampler.silent; mic.on = sampler.on;
  if(hit) fire();
});
