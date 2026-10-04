// Sprungkraft: Laufzeit-Zustand, Einstellungen und Log (localStorage, eigene Schlüssel „jump-…“).

export const DEMO = new URLSearchParams(globalThis.location?.search ?? '').has('demo');
const KS = DEMO ? 'jump-demo-settings' : 'jump-settings', KL = DEMO ? 'jump-demo-log' : 'jump-log';
function load(k, d){ try{ const v = JSON.parse(localStorage.getItem(k)); return v ?? d; }catch(e){ return d; } }

// ex: 'both' (10 Strecksprünge) oder 'single' (je 5 Einbein-Sprünge links und rechts); n: Sprünge (je Bein bei single).
export const DEF = {ex:'both', nBoth:10, nSingle:5, model:'lite', facing:'environment', session:null};
export const settings = {...DEF, ...load(KS, {})};
export const log = load(KL, []);
export function store(){ try{ localStorage.setItem(KS, JSON.stringify(settings)); localStorage.setItem(KL, JSON.stringify(log)); }catch(e){} }
export function ensureSession(force){
  const s0 = settings.session;
  if(force || !s0 || Date.now() - (s0.last || s0.start) > 3*3600e3){ settings.session = {id:Date.now(), start:Date.now(), last:Date.now()}; store(); }
}
export const sessionEntries = () => log.filter(e => e.sid === settings.session?.id);

// off | calib (ruhig stehen) | go (springen) ; leg: Bein, das gerade dran ist (single)
export const app = {state:'off', stateT:0, source:'none', jumps:[], leg:null, stand:null, tracker:null};
