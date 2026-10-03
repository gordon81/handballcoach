// Einstellungen und Wurf-Log im localStorage, Trainings-Sitzungen.
import { DEF, DEMO, TH, TH_POS } from './config.js';

// Im Demo-Modus eigene Schlüssel, damit Demo-Linie und Demo-Würfe nicht ins echte Training gehen.
const KS = DEMO ? 'awc-demo-settings' : 'awc-settings', KL = DEMO ? 'awc-demo-log' : 'awc-log';

function load(k, d){ try{ const v = JSON.parse(localStorage.getItem(k)); return v ?? d; }catch(e){ return d; } }

export const settings = {...DEF, ...load(KS, {})};
export const log = load(KL, []);

// Grenzwerte für die gewählte Kameraposition.
export const th = () => ({...TH, ...TH_POS[settings.camPos]});

export function store(){ try{ localStorage.setItem(KS, JSON.stringify(settings)); localStorage.setItem(KL, JSON.stringify(log)); }catch(e){} }
export function clearLog(){ log.length = 0; store(); }

// Neues Training nach > 3 h Pause oder auf Wunsch.
export function ensureSession(force){
  const s0 = settings.session;
  if(force || !s0 || Date.now() - (s0.last || s0.start) > 3*3600e3){ settings.session = {id:Date.now(), start:Date.now(), last:Date.now()}; store(); }
}
export function sessionEntries(){ const sid = settings.session?.id; return sid ? log.filter(e => e.sid === sid) : []; }
