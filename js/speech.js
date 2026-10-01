// Sprachausgabe (Web Speech API, Deutsch).

const synth = window.speechSynthesis;
let voice = null;
function pickVoice(){ if(!synth) return; const vs=synth.getVoices(); voice = vs.find(v=>/^de/i.test(v.lang)) || null; }
if(synth){ pickVoice(); synth.onvoiceschanged = pickVoice; }

export function say(text){
  if(!synth) return;
  try{ synth.cancel(); const u=new SpeechSynthesisUtterance(text); u.lang='de-DE'; if(voice) u.voice=voice; u.rate=1.05; synth.speak(u); }catch(e){}
}
