// Mikrofon nur an, solange im Modus „Zuruf“ trainiert wird.
import { app } from './state.js';
import { settings } from './store.js';
import { showHint } from './dom.js';
import { mic, startMic, stopMic } from './shout.js';

export async function syncMic(){
  const want = settings.mode==='call' && app.source==='cam' && app.state!=='off';
  if(want && !mic.on){
    try{ await startMic(); showHint('Zuruf-Modus: laut rufen, dann kommt das Ziel nach ' + (settings.callMin===settings.callMax ? settings.callMin : settings.callMin + '–' + settings.callMax) + ' s', 3500); }
    catch(e){ showHint('Mikrofon nicht verfügbar (' + (e.message || e) + '). Ansage per Button oder anderen Modus wählen.', 6000); }
  } else if(!want && mic.on) stopMic();
}
