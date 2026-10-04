// Mikrofon-Pegel für alle Trainings: alle STEP ms eine FFT, daraus der Pegel im Stimmbereich (v, 200–1200 Hz) und im
// hohen Bereich (hi, 2,5–6 kHz) in dB. Die Auswertung (Ruf, Ballaufprall) macht, wer sich mit onSample() anmeldet.
// Echo-/Rauschunterdrückung und Pegelautomatik aus, sonst werden Ruf und Knall weggeregelt.
export const STEP = 30;

export function micSampler(){
  const m = {on:false, silent:false, level:-100};
  let stream = null, actx = null, an = null, spec = null, timer = null, gen = 0, starting = null, zeroSince = 0;
  const subs = new Set();
  m.onSample = fn => { subs.add(fn); return () => subs.delete(fn); };

  // Mehrfaches Aufrufen startet nur einmal. Wird währenddessen stop() gerufen (z. B. Stopp, während das Handy noch nach der
  // Erlaubnis fragt), bleibt das Mikrofon aus.
  m.start = () => {
    if(m.on) return Promise.resolve();
    if(starting) return starting;
    const p = open(++gen).finally(() => { if(starting === p) starting = null; });
    return starting = p;
  };
  async function open(g){
    if(!navigator.mediaDevices?.getUserMedia) throw new Error('Kein Mikrofon verfügbar');
    const s = await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false, noiseSuppression:false, autoGainControl:false}, video:false});
    if(g !== gen){ s.getTracks().forEach(t => t.stop()); return; }   // inzwischen gestoppt
    const ac = new AudioContext(); await ac.resume();
    if(g !== gen){ s.getTracks().forEach(t => t.stop()); ac.close().catch(() => {}); return; }
    stream = s; actx = ac;
    an = actx.createAnalyser(); an.fftSize = 2048; an.smoothingTimeConstant = 0;
    spec = new Float32Array(an.frequencyBinCount);
    actx.createMediaStreamSource(stream).connect(an);
    zeroSince = performance.now(); m.silent = false;
    timer = setInterval(sample, STEP); m.on = true;
  }
  m.stop = () => {
    gen++; starting = null;
    clearInterval(timer); timer = null;
    stream?.getTracks().forEach(t => t.stop()); stream = null;
    actx?.close().catch(() => {}); actx = null; an = null; m.on = false; m.level = -100;
  };
  // Pegel eines Frequenzbereichs in dB (Summe der Leistung der FFT-Bins).
  function band(lo, hi){
    const hz = actx.sampleRate/an.fftSize; let s = 0;
    for(let i = Math.ceil(lo/hz); i <= Math.min(spec.length-1, Math.floor(hi/hz)); i++) s += 10**(spec[i]/10);
    return 10*Math.log10(s + 1e-20);
  }
  function sample(){
    an.getFloatFrequencyData(spec);
    const now = performance.now(), v = band(200, 1200), hi = band(2500, 6000);
    m.level = v;
    // Stummes Mikrofon (z. B. Audio blockiert): nach 2 s ohne jeden Ton melden.
    if(v > -150) zeroSince = now; m.silent = now - zeroSince > 2000;
    subs.forEach(fn => fn(v, hi, now));
  }
  return m;
}
