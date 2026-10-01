// Einstellungen und Wurf-Log im localStorage, Trainings-Sitzungen.
import { DEF } from './config.js';

function load(k, d){ try{ const v = JSON.parse(localStorage.getItem(k)); return v ?? d; }catch(e){ return d; } }

export const settings = {...DEF, ...load('awc-settings', {})};
export const log = load('awc-log', []);

export function store(){ try{ localStorage.setItem('awc-settings', JSON.stringify(settings)); localStorage.setItem('awc-log', JSON.stringify(log)); }catch(e){} }
export function clearLog(){ log.length = 0; store(); }

// Neues Training nach > 3 h Pause oder auf Wunsch.
export function ensureSession(force){
  const s0 = settings.session;
  if(force || !s0 || Date.now() - (s0.last || s0.start) > 3*3600e3){ settings.session = {id:Date.now(), start:Date.now(), last:Date.now()}; store(); }
}
export function sessionEntries(){ const sid = settings.session?.id; return sid ? log.filter(e => e.sid === sid) : []; }
