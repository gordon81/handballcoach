// KI-Modell (MediaPipe PoseLandmarker) laden, GPU mit CPU-Fallback. Im Demo-Modus liefert die
// simulierte Person die Körperpunkte im selben Format.
import { DEMO } from './config.js';
import { createPose } from '../../shared/js/pose.js';
import { settings } from './store.js';
import { showHint, hideHint } from './dom.js';

export let landmarker = null;
let modelName = null, loading = null;

export async function ensureModel(){
  if(landmarker && modelName===settings.model) return;
  if(loading) return loading;
  if(DEMO){ landmarker = (await import('./demo/sim.js')).detector; modelName = settings.model; return; }
  loading = (async () => {
    showHint('KI-Modell wird geladen … (einmalig einige MB)');
    if(landmarker){ try{ landmarker.close(); }catch(e){} landmarker=null; }
    landmarker = await createPose(settings.model);
    modelName = settings.model; hideHint();
  })();
  try{ await loading; } finally { loading = null; }
}
