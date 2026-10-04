// 7-m-Trainer: Laufzeit-Zustand, Einstellungen und Wurf-Log (localStorage, eigene Schlüssel „7m-…“).

export const DEMO = new URLSearchParams(globalThis.location?.search ?? '').has('demo');
const KS = DEMO ? '7m-demo-settings' : '7m-settings', KL = DEMO ? '7m-demo-log' : '7m-log';
function load(k, d){ try{ const v = JSON.parse(localStorage.getItem(k)); return v ?? d; }catch(e){ return d; } }

// line: 7-m-Linie normiert (0–1) {a, b, goal}; call: Ziel vor dem Pfiff ansagen; series: Serie mit 10 Würfen.
export const DEF = {hand:'R', line:null, call:true, series:true, pause:4, model:'lite', session:null,
  targets:['Oben links', 'Oben rechts', 'Unten links', 'Unten rechts']};
export const settings = {...DEF, ...load(KS, {})};
export const log = load(KL, []);
export function store(){ try{ localStorage.setItem(KS, JSON.stringify(settings)); localStorage.setItem(KL, JSON.stringify(log)); }catch(e){} }

// Neues Training nach > 3 h Pause oder auf Wunsch.
export function ensureSession(force){
  const s0 = settings.session;
  if(force || !s0 || Date.now() - (s0.last || s0.start) > 3*3600e3){ settings.session = {id:Date.now(), start:Date.now(), last:Date.now()}; store(); }
}
export const sessionEntries = () => log.filter(e => e.sid === settings.session?.id);

// off | ready (wartet: Spieler steht hinter der Linie) | set (Ziel angesagt, Pfiff kommt) | go (nach dem Pfiff) | cool
export const app = {state:'off', stateT:0, source:'none', marking:null, tw:null, whistleAt:null, target:null, series:null, latest:null};
