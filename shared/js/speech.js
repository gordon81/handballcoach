// Sprachausgabe (Web Speech API, Deutsch) und kurzer Piepton.

const synth = window.speechSynthesis;
let voice = null, actx = null;
function pickVoice(){ if(!synth) return; const vs=synth.getVoices(); voice = vs.find(v=>/^de/i.test(v.lang)) || null; }
if(synth){ pickVoice(); synth.onvoiceschanged = pickVoice; }

// queue: nicht abbrechen, was gerade gesprochen wird, sondern danach sprechen. → die Äußerung (für onstart) oder null.
export function say(text, {queue = false} = {}){
  if(window.__said) window.__said.push(text);   // Tests: was gesagt wurde
  if(!synth) return null;
  try{ if(!queue) synth.cancel(); const u=new SpeechSynthesisUtterance(text); u.lang='de-DE'; if(voice) u.voice=voice; u.rate=1.05; synth.speak(u); return u; }catch(e){ return null; }
}

// Piep als Quittung („Zuruf gehört“). Beim ersten Mal aus einem Klick heraus aufrufen (unlock), sonst bleibt es stumm.
export function unlockBeep(){ try{ actx ??= new AudioContext(); actx.resume(); }catch(e){} }
export function beep(freq = 880, ms = 120){
  try{
    unlockBeep();
    const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime;
    o.frequency.value = freq; g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.001, t + ms/1000);
    o.connect(g).connect(actx.destination); o.start(t); o.stop(t + ms/1000);
  }catch(e){}
}
