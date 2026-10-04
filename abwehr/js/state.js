// Abwehr-Beinarbeit: Laufzeit-Zustand, Einstellungen und Runden-Log (localStorage, eigene Schlüssel „def-…“).

export const DEMO = new URLSearchParams(globalThis.location?.search ?? '').has('demo');
const KS = DEMO ? 'def-demo-settings' : 'def-settings', KL = DEMO ? 'def-demo-log' : 'def-log';
function load(k, d){ try{ const v = JSON.parse(localStorage.getItem(k)); return v ?? d; }catch(e){ return d; } }

// dur: Dauer einer Runde (s); model: KI-Modell; facing: Kamera (Front-Kamera, wenn man sich selbst sehen will).
export const DEF = {dur:40, model:'lite', facing:'environment', session:null};
export const settings = {...DEF, ...load(KS, {})};
export const log = load(KL, []);
export function store(){ try{ localStorage.setItem(KS, JSON.stringify(settings)); localStorage.setItem(KL, JSON.stringify(log)); }catch(e){} }
export function ensureSession(force){
  const s0 = settings.session;
  if(force || !s0 || Date.now() - (s0.last || s0.start) > 3*3600e3){ settings.session = {id:Date.now(), start:Date.now(), last:Date.now()}; store(); }
}
export const sessionEntries = () => log.filter(e => e.sid === settings.session?.id);

// off | calib (aufrecht stehen, Stand-Höhe messen) | stance (Grundstellung) | cmd (Ruf, Auswertung läuft) | gap (Pause bis zum nächsten Ruf)
export const app = {state:'off', stateT:0, source:'none', cmd:null, tc:null, results:[], last:[], center:null, stand:null, until:0, latest:null};
