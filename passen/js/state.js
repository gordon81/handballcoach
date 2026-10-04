// Pässe gegen die Wand: Laufzeit-Zustand, Einstellungen und Runden-Log (localStorage, eigene Schlüssel „pass-…“).

export const DEMO = new URLSearchParams(globalThis.location?.search ?? '').has('demo');
const KS = DEMO ? 'pass-demo-settings' : 'pass-settings', KL = DEMO ? 'pass-demo-log' : 'pass-log';
function load(k, d){ try{ const v = JSON.parse(localStorage.getItem(k)); return v ?? d; }catch(e){ return d; } }

// dur: Dauer (s); wall: Wand im Bild links/rechts; count: 'mic' (Aufprall hören) oder 'cam' (Wurfbewegung); sens: Mikro-Empfindlichkeit.
export const DEF = {dur:30, hand:'R', wall:'left', count:'mic', sens:'mid', model:'lite', session:null, best:0};
export const settings = {...DEF, ...load(KS, {})};
export const log = load(KL, []);
export function store(){ try{ localStorage.setItem(KS, JSON.stringify(settings)); localStorage.setItem(KL, JSON.stringify(log)); }catch(e){} }
export function ensureSession(force){
  const s0 = settings.session;
  if(force || !s0 || Date.now() - (s0.last || s0.start) > 3*3600e3){ settings.session = {id:Date.now(), start:Date.now(), last:Date.now()}; store(); }
}
export const sessionEntries = () => log.filter(e => e.sid === settings.session?.id);

// off | count (3-2-1) | run (Runde läuft)
export const app = {state:'off', stateT:0, source:'none', until:0, hits:[], passes:[], latest:null, test:false, testHits:0};
