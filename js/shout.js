// Zuruf erkennen: das Mikrofon hört auf einen lauten Ruf des Spielers („Hey!“, „Los!“).
// Kein Spracherkenner, nur Lautstärke über dem Hallen-Grundpegel: läuft offline, ohne Server, und
// ein Ruf ist im Hallenlärm verlässlicher zu erkennen als ein bestimmtes Wort.
import { DEMO } from './config.js';
import { settings } from './store.js';

// Wie viel lauter als der Grundpegel ein Ruf sein muss (dB).
export const SENS = {low:20, mid:14, high:9};
const STEP = 30, HOLD = 120, GAP = 1500;   // ms: Messtakt, Mindestdauer eines Rufs, Sperre danach

export const mic = {on:false, level:-100, floor:-60};
let stream = null, actx = null, an = null, buf = null, timer = null, handler = null;
let above = 0, lastHit = 0, quietUntil = 0, n = 0;

export function onShout(fn){ handler = fn; }
// Eigene Ansage oder Piepton nicht als Zuruf werten.
export function quiet(sec){ quietUntil = Math.max(quietUntil, performance.now() + sec*1000); }
// Demo und Tests: Zuruf auslösen, ohne Mikrofon.
export function shoutNow(){ handler?.(); }

export async function startMic(){
  if(mic.on) return;
  if(DEMO){ mic.on = true; return; }   // Demo: die simulierte Person „ruft“ per shoutNow()
  if(!navigator.mediaDevices?.getUserMedia) throw new Error('Kein Mikrofon verfügbar');
  // Ohne Rauschunterdrückung/Pegelautomatik, sonst wird der Ruf weggeregelt.
  stream = await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false, noiseSuppression:false, autoGainControl:false}, video:false});
  actx = new AudioContext(); await actx.resume();
  an = actx.createAnalyser(); an.fftSize = 1024; buf = new Float32Array(an.fftSize);
  actx.createMediaStreamSource(stream).connect(an);
  n = 0; above = 0; timer = setInterval(sample, STEP); mic.on = true;
}
export function stopMic(){
  clearInterval(timer); timer = null;
  stream?.getTracks().forEach(t => t.stop()); stream = null;
  actx?.close().catch(() => {}); actx = null; mic.on = false;
}

function sample(){
  an.getFloatTimeDomainData(buf);
  let s = 0; for(const v of buf) s += v*v;
  const db = 10*Math.log10(s/buf.length + 1e-12), now = performance.now();
  mic.level = db;
  if(window.speechSynthesis?.speaking) quiet(0.4);
  // Grundpegel: die erste halbe Sekunde Mittelwert, danach langsam nachführen (nach unten schneller).
  if(n < 16){ mic.floor = n ? (mic.floor*n + db)/(n+1) : db; n++; return; }
  const thr = Math.max(mic.floor + (SENS[settings.sens] ?? SENS.mid), -55);
  if(db > thr && now > quietUntil){
    above += STEP;
    if(above >= HOLD && now - lastHit > GAP){ lastHit = now; above = 0; handler?.(); }
  } else above = 0;
  if(db < thr) mic.floor += (db - mic.floor) * (db < mic.floor ? 0.05 : 0.005);
}
