// Zuruf erkennen: das Mikrofon hört auf einen lauten Ruf des Spielers („Hey!“, „Los!“).
// Kein Spracherkenner, nur Lautstärke und Klang (siehe shoutDetect.js): läuft offline, ohne Server, und
// ein Ruf ist im Hallenlärm verlässlicher zu erkennen als ein bestimmtes Wort.
import { DEMO } from './config.js';
import { settings } from './store.js';
import { shoutDetector, SENS, STEP } from './shoutDetect.js';

export { SENS };
// level/floor/thr in dB (Stimmbereich), für Anzeigen. silent = Mikrofon liefert keinen Ton.
export const mic = {on:false, level:-100, floor:-60, thr:-60, silent:false};
let stream = null, actx = null, an = null, spec = null, timer = null, det = null;
let quietUntil = 0, gen = 0, starting = null, zeroSince = 0;
const listeners = new Set();

export function onShout(fn){ listeners.add(fn); return () => listeners.delete(fn); }
const fire = () => listeners.forEach(fn => fn());
// Eigene Ansage oder Piepton nicht als Zuruf werten.
export function quiet(sec){ quietUntil = Math.max(quietUntil, performance.now() + sec*1000); }
// Demo und Tests: Zuruf auslösen, ohne Mikrofon.
export function shoutNow(){ fire(); }

// Mehrfaches Aufrufen startet nur einmal. Wird währenddessen stopMic() gerufen (z. B. Stopp, während
// das Handy noch nach der Erlaubnis fragt), bleibt das Mikrofon aus.
export function startMic(){
  if(mic.on) return Promise.resolve();
  if(starting) return starting;
  const p = open(++gen).finally(() => { if(starting === p) starting = null; });
  return starting = p;
}
async function open(g){
  if(DEMO){ mic.on = true; return; }   // Demo: die simulierte Person „ruft“ per shoutNow()
  if(!navigator.mediaDevices?.getUserMedia) throw new Error('Kein Mikrofon verfügbar');
  // Ohne Rauschunterdrückung/Pegelautomatik, sonst wird der Ruf weggeregelt.
  const s = await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false, noiseSuppression:false, autoGainControl:false}, video:false});
  if(g !== gen){ s.getTracks().forEach(t => t.stop()); return; }   // inzwischen gestoppt
  const ac = new AudioContext(); await ac.resume();
  if(g !== gen){ s.getTracks().forEach(t => t.stop()); ac.close().catch(() => {}); return; }
  stream = s; actx = ac;
  an = actx.createAnalyser(); an.fftSize = 2048; an.smoothingTimeConstant = 0;
  spec = new Float32Array(an.frequencyBinCount);
  actx.createMediaStreamSource(stream).connect(an);
  det = shoutDetector(); zeroSince = performance.now(); mic.silent = false;
  timer = setInterval(sample, STEP); mic.on = true;
}
export function stopMic(){
  gen++; starting = null;
  clearInterval(timer); timer = null;
  stream?.getTracks().forEach(t => t.stop()); stream = null;
  actx?.close().catch(() => {}); actx = null; an = null; mic.on = false; mic.level = -100;
}

// Pegel eines Frequenzbereichs in dB (Summe der Leistung der FFT-Bins).
function band(lo, hi){
  const hz = actx.sampleRate/an.fftSize; let s = 0;
  for(let i = Math.ceil(lo/hz); i <= Math.min(spec.length-1, Math.floor(hi/hz)); i++) s += 10**(spec[i]/10);
  return 10*Math.log10(s + 1e-20);
}

function sample(){
  an.getFloatFrequencyData(spec);
  const now = performance.now(), v = band(200, 1200), hi = band(2500, 6000);
  if(window.speechSynthesis?.speaking) quiet(0.4);
  const hit = det.push(v, hi, now, SENS[settings.sens] ?? SENS.mid, now < quietUntil);
  mic.level = v; mic.floor = det.floor; mic.thr = det.thr;
  // Stummes Mikrofon (z. B. Audio blockiert): nach 2 s ohne jeden Ton melden.
  if(v > -150) zeroSince = now; mic.silent = now - zeroSince > 2000;
  if(hit) fire();
}
