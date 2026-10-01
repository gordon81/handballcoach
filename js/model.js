// KI-Modell (MediaPipe PoseLandmarker) laden, GPU mit CPU-Fallback.
import { PoseLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs";
import { TV, MODELS } from './config.js';
import { settings } from './store.js';
import { showHint, hideHint } from './dom.js';

export let landmarker = null;
let modelName = null, loading = null;

export async function ensureModel(){
  if(landmarker && modelName===settings.model) return;
  if(loading) return loading;
  loading = (async () => {
    showHint('KI-Modell wird geladen … (einmalig einige MB)');
    if(landmarker){ try{ landmarker.close(); }catch(e){} landmarker=null; }
    const fs = await FilesetResolver.forVisionTasks(TV + '/wasm');
    const opt = d => ({baseOptions:{modelAssetPath:MODELS[settings.model], delegate:d}, runningMode:'VIDEO', numPoses:1,
      minPoseDetectionConfidence:.5, minPosePresenceConfidence:.5, minTrackingConfidence:.5});
    try{ landmarker = await PoseLandmarker.createFromOptions(fs, opt('GPU')); }
    catch(e){ console.warn('GPU nicht verfügbar, nutze CPU', e); landmarker = await PoseLandmarker.createFromOptions(fs, opt('CPU')); }
    modelName = settings.model; hideHint();
  })();
  try{ await loading; } finally { loading = null; }
}
