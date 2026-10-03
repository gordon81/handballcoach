// Mikrofon nur an, solange im Modus „Zuruf“ trainiert wird.
import { app } from './state.js';
import { settings } from './store.js';
import { showHint } from './dom.js';
import { mic, startMic, stopMic } from './shout.js';

export async function syncMic(){
  const want = settings.mode==='call' && app.source==='cam' && app.state!=='off';
  if(!want){ stopMic(); return; }   // stoppt auch einen Start, der noch auf die Erlaubnis wartet
  if(mic.on) return;
  try{ await startMic(); }
  catch(e){ showHint('Mikrofon nicht verfügbar (' + (e.message || e) + '). Ansage per Button oder anderen Modus wählen.', 6000); return; }
  if(!mic.on) return;   // inzwischen gestoppt
  showHint('Zuruf-Modus: laut rufen, dann kommt das Ziel nach ' + (settings.callMin===settings.callMax ? settings.callMin : settings.callMin + '–' + settings.callMax) + ' s', 3500);
  setTimeout(() => { if(mic.on && mic.silent) showHint('Das Mikrofon liefert keinen Ton. Erlaubnis prüfen oder Ansage per Button.', 6000); }, 2500);
}
