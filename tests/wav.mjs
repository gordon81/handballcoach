// Künstliche Hallen-Tonspur als WAV für das Fake-Mikrofon von Chromium: Rauschen, Ballaufpralle mit
// Nachhall, Schuhquietschen, Pfiff, eine zweite Gruppe (lauter Dauerlärm) und Rufe.
// SHOUTS = Zeitpunkte (s), an denen ein Ruf beginnt; nur diese sollen erkannt werden.
const SR = 48000;
export const DURATION = 26;
export const SHOUTS = [5.5, 12.5, 21.0];
// Ballaufpralle (s): nur diese soll die Aufprall-Erkennung zählen.
export const BOUNCES = [3.0, 4.2, 11.0];

let seed = 7;
const rnd = () => ((seed = (seed*16807) % 2147483647) / 2147483647)*2 - 1;
const db = x => 10**(x/20);

function pinkNoise(n, rms){
  const out = new Float32Array(n); let b0=0, b1=0, b2=0, b3=0, b4=0, b5=0, b6=0, s=0;
  for(let i=0; i<n; i++){
    const w = rnd();
    b0 = 0.99886*b0 + w*0.0555179; b1 = 0.99332*b1 + w*0.0750759; b2 = 0.969*b2 + w*0.153852;
    b3 = 0.8665*b3 + w*0.3104856; b4 = 0.55*b4 + w*0.5329522; b5 = -0.7616*b5 - w*0.016898;
    out[i] = b0+b1+b2+b3+b4+b5+b6 + w*0.5362; b6 = w*0.115926; s += out[i]**2;
  }
  const k = rms/Math.sqrt(s/n); for(let i=0; i<n; i++) out[i] *= k;
  return out;
}
// Nachhall: tiefpassgefiltertes Rauschen, fällt um 60 dB in rt Sekunden.
function addTail(buf, at, amp, rt = 1.6){
  let lp = 0;
  for(let i = Math.round(at*SR), k = 0; i < buf.length && k < rt*SR; i++, k++){ lp += 0.25*(rnd() - lp); buf[i] += amp*lp*2*Math.exp(-6.9*k/SR/rt); }
}
function addShout(buf, at, dur, rms){
  const n = Math.round(dur*SR), s0 = Math.round(at*SR), out = new Float32Array(n);
  let ph = 0, e = 0;
  for(let i=0; i<n; i++){
    const t = i/SR, f0 = 280 + 25*Math.sin(2*Math.PI*5*t) + 40*t;
    ph += 2*Math.PI*f0/SR;
    let v = 0;
    for(let k=1; k<=14; k++){ const f = k*f0, form = 1 + 2.5*Math.exp(-(((f-750)/250)**2)) + 1.5*Math.exp(-(((f-1250)/300)**2)); v += Math.sin(k*ph)*form/k; }
    const env = Math.min(1, t/0.04, (dur - t)/0.06);
    out[i] = v*Math.max(0, env); e += out[i]**2;
  }
  const k = rms/Math.sqrt(e/n);
  for(let i=0; i<n && s0+i < buf.length; i++) buf[s0+i] += out[i]*k;
  addTail(buf, at + dur, rms*0.35);
}
function addBounce(buf, at, amp){
  const s0 = Math.round(at*SR); let lp = 0;
  for(let i=0; i < 0.015*SR; i++){ lp += 0.3*(rnd() - lp); buf[s0+i] += amp*lp*3*Math.exp(-i/(0.004*SR)); }
  addTail(buf, at + 0.01, amp*0.12);
}
function addTone(buf, at, dur, rms, f, wob, wobHz, am = 0){
  const s0 = Math.round(at*SR); let ph = 0;
  for(let i=0; i < dur*SR; i++){
    const t = i/SR; ph += 2*Math.PI*(f + wob*Math.sin(2*Math.PI*wobHz*t))/SR;
    const env = Math.min(1, t/0.02, (dur - t)/0.02) * (1 - am + am*Math.abs(Math.sin(2*Math.PI*12*t)));
    buf[s0+i] += rms*Math.SQRT2*env*(Math.sin(ph) + 0.4*Math.sin(2*ph));
  }
  addTail(buf, at + dur, rms*0.1);
}

export function hallWav(){
  const N = DURATION*SR, buf = pinkNoise(N, db(-42));
  // Zweite Gruppe: 15–23 s, ~20 dB lauter, stimmähnlich (tiefpassgefiltert, leicht schwankend).
  const babble = pinkNoise(8*SR, db(-22)); let lp = 0;
  for(let i=0; i<babble.length; i++){
    lp += 0.2*(babble[i] - lp);
    const t = i/SR, env = Math.min(1, t/0.3, (8 - t)/0.3)*(1 + 0.25*Math.sin(2*Math.PI*0.7*t));
    buf[15*SR + i] += lp*2.2*env;
  }
  addBounce(buf, BOUNCES[0], db(-4)); addBounce(buf, BOUNCES[1], db(-6)); addBounce(buf, BOUNCES[2], db(-3));
  addTone(buf, 8.0, 0.25, db(-18), 2600, 150, 30);            // Schuhquietschen
  addTone(buf, 9.5, 0.5, db(-14), 3300, 40, 6, 0.6);          // Pfiff (trillernd)
  addShout(buf, SHOUTS[0], 0.4, db(-16));
  addShout(buf, SHOUTS[1], 0.6, db(-18));
  addShout(buf, SHOUTS[2], 0.5, db(-8));                      // über dem Lärm der zweiten Gruppe
  // 16-Bit-PCM, mono
  const out = Buffer.alloc(44 + N*2);
  out.write('RIFF', 0); out.writeUInt32LE(36 + N*2, 4); out.write('WAVE', 8); out.write('fmt ', 12);
  out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(1, 22); out.writeUInt32LE(SR, 24);
  out.writeUInt32LE(SR*2, 28); out.writeUInt16LE(2, 32); out.writeUInt16LE(16, 34); out.write('data', 36); out.writeUInt32LE(N*2, 40);
  for(let i=0; i<N; i++) out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, buf[i]))*32767), 44 + i*2);
  return out;
}
