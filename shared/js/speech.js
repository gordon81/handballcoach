// Sprachausgabe (Web Speech API, Deutsch) und kurzer Piepton.
// Stimme: die natürlichste verfügbare deutsche Stimme (Bewertung in voiceScore), etwas ruhigeres Tempo, Text vorher
// sprechbar gemacht (spokenText: Abkürzungen und Einheiten ausschreiben, Pausen an Satzzeichen).

const synth = globalThis.speechSynthesis;
let voice = null, actx = null;

// Je höher, desto lieber. Natürliche/neuronale Stimmen klingen weicher als die alten Systemstimmen; de-DE vor de-AT/CH.
export function voiceScore(v){
  if(!/^de/i.test(v.lang)) return -1;
  let s = 1;
  if(/natural|neural|online|premium|enhanced|wavenet/i.test(v.name)) s += 8;
  if(/google/i.test(v.name)) s += 5;
  if(/(anna|petra|helena|katja|amala|seraphina|vicki|marlene|hedda)/i.test(v.name)) s += 2;   // bekannt gut verständliche Stimmen
  if(/^de[-_]DE/i.test(v.lang)) s += 1;
  if(/compact|espeak/i.test(v.name)) s -= 4;   // sehr roboterhaft
  return s;
}
export function pickVoice(list){ return [...list].sort((a, b) => voiceScore(b) - voiceScore(a)).find(v => voiceScore(v) >= 0) || null; }
function choose(){ if(synth) voice = pickVoice(synth.getVoices()); }
if(synth){ choose(); synth.onvoiceschanged = choose; }

// Text so umschreiben, wie er gesprochen werden soll: Abkürzungen und Einheiten aus, Bindestrich-Zahlen als Wörter,
// Zahlen mit Komma bleiben (die Stimme liest „null Komma vier“).
export function spokenText(t){
  return String(t)
    .replace(/\b6-m-Linie\b/g, 'Sechs-Meter-Linie').replace(/\b9-m-Linie\b/g, 'Neun-Meter-Linie').replace(/\b7-m-Linie\b/g, 'Sieben-Meter-Linie')
    .replace(/\b(\d+)\s?km\/h\b/g, '$1 Stundenkilometer').replace(/\b(\d+(?:,\d+)?)\s?s\b/g, '$1 Sekunden')
    .replace(/\b(\d+)\s?cm\b/g, '$1 Zentimeter').replace(/\b(\d+)\s?%/g, '$1 Prozent').replace(/\bz\. ?B\./g, 'zum Beispiel')
    .replace(/\s*·\s*/g, '. ').replace(/\s{2,}/g, ' ').trim();
}

// queue: nicht abbrechen, was gerade gesprochen wird, sondern danach sprechen. → die Äußerung (für onstart) oder null.
export function say(text, {queue = false} = {}){
  if(globalThis.window?.__said) window.__said.push(text);   // Tests: was gesagt wurde
  if(!synth) return null;
  try{
    if(!queue) synth.cancel();
    const u = new SpeechSynthesisUtterance(spokenText(text));
    u.lang = 'de-DE'; if(voice) u.voice = voice;
    u.rate = 0.95; u.pitch = 1.0; u.volume = 1;   // etwas ruhiger als normal: in der Halle besser zu verstehen
    synth.speak(u); return u;
  }catch(e){ return null; }
}

// Piep als Quittung („Zuruf gehört“). Beim ersten Mal aus einem Klick heraus aufrufen (unlock), sonst bleibt es stumm.
export function unlockBeep(){ try{ actx ??= new AudioContext(); actx.resume(); }catch(e){} }
// Weicher Ton: kurzes Ein- und Ausblenden statt hartem Einsatz (klingt nicht nach Knacken).
export function beep(freq = 880, ms = 120){
  try{
    unlockBeep();
    const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime, d = ms/1000;
    o.type = 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + Math.min(0.015, d/4));
    g.gain.exponentialRampToValueAtTime(0.001, t + d);
    o.connect(g).connect(actx.destination); o.start(t); o.stop(t + d + 0.02);
  }catch(e){}
}
