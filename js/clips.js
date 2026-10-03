// Kurze Videos pro Wurf: Kamerabild mit eingezeichneter Linie und Skelett aufnehmen (ab der Zielansage
// bis kurz nach der Landung) und im Browser speichern (IndexedDB, die letzten KEEP Clips).
import { DEMO } from './config.js';
import { app } from './state.js';
import { video, canvas } from './dom.js';

const DB = DEMO ? 'awc-demo-clips' : 'awc-clips', KEEP = 60, MAXW = 720;
const MIME = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4']
  .find(m => window.MediaRecorder?.isTypeSupported?.(m));
const comp = document.createElement('canvas'), cg = comp.getContext('2d');
export const canRecord = !!MIME && !!comp.captureStream;

/* ---------- Speicher ---------- */
let dbP = null;
function db(){
  return dbP ??= new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore('clips');
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
function tx(mode, fn){
  return db().then(d => new Promise((res, rej) => {
    const t = d.transaction('clips', mode), q = fn(t.objectStore('clips'));
    t.oncomplete = () => res(q?.result); t.onerror = () => rej(t.error);
  }));
}
export const getClip = key => tx('readonly', s => s.get(key));
export const clearClips = () => tx('readwrite', s => s.clear()).catch(() => {});
async function putClip(key, blob){
  await tx('readwrite', s => s.put(blob, key));
  const keys = (await tx('readonly', s => s.getAllKeys())).sort((a, b) => a - b);
  if(keys.length > KEEP) await tx('readwrite', s => { for(const k of keys.slice(0, keys.length - KEEP)) s.delete(k); });
}

/* ---------- Aufnahme ---------- */
let rec = null;   // {mr, chunks, t0}

// Pro Videobild aus der Hauptschleife: Kamerabild + Overlay in das Aufnahme-Bild zeichnen.
export function recFrame(){
  if(!rec || !video.videoWidth) return;
  cg.drawImage(video, 0, 0, comp.width, comp.height);
  cg.drawImage(canvas, 0, 0, comp.width, comp.height);
  if(rec.label){ const s = comp.height/24; cg.font = `600 ${s}px Barlow, sans-serif`; cg.fillStyle = 'rgba(0,0,0,.55)';
    cg.fillRect(0, 0, cg.measureText(rec.label).width + s, s*1.6); cg.fillStyle = '#fff'; cg.fillText(rec.label, s/2, s*1.15); }
}
export const recAge = t => rec ? t - rec.t0 : null;

export function recStart(t, label = ''){
  recDrop();
  if(!canRecord || !video.videoWidth) return;
  const k = Math.min(1, MAXW / video.videoWidth);
  comp.width = Math.round(video.videoWidth*k/2)*2; comp.height = Math.round(video.videoHeight*k/2)*2;
  const r = {chunks:[], t0:t, label};
  try{
    r.mr = new MediaRecorder(comp.captureStream(30), {mimeType:MIME, videoBitsPerSecond:2e6});
    r.mr.ondataavailable = e => { if(e.data.size) r.chunks.push(e.data); };
    r.mr.start(500);
  }catch(e){ console.warn('Aufnahme nicht möglich', e); return; }
  rec = r; recFrame();
}
function stopRec(r){ try{ r.mr.stop(); }catch(e){} r.mr.stream.getTracks().forEach(x => x.stop()); }
export function recDrop(){ if(rec){ const r = rec; rec = null; r.mr.onstop = null; stopRec(r); } }

// Wurf vorbei: noch kurz weiter aufnehmen (Landung), dann als Clip unter `key` speichern. → true, wenn gespeichert.
export function recFinish(key, after = 0.8){
  const r = rec; if(!r) return Promise.resolve(false);
  return new Promise(res => setTimeout(() => {
    if(rec !== r){ res(false); return; }   // inzwischen verworfen
    rec = null;
    r.mr.onstop = async () => {
      const blob = new Blob(r.chunks, {type: MIME.split(';')[0]});
      try{ if(blob.size) { await putClip(key, blob); res(true); } else res(false); }catch(e){ console.warn(e); res(false); }
    };
    stopRec(r);
  }, after*1000));
}
