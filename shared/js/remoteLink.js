// Fernbedienung per zweitem Handy (PLAYBOOK C6, Stufe 2), Seite des Kamera-Handys. Chip „📱“ oben im Bild öffnet das
// Koppeln: 1. Das zweite Handy scannt den QR-Code mit seiner Kamera-App und öffnet die Fernbedienung (fern/).
// 2. Die Fernbedienung zeigt ihren Code, das Kamera-Handy liest ihn mit seiner Kamera (Rückseite). Danach gehen Befehle
// (Start/Stopp, Weiter/Zurück wie die Presenter-Tasten, Treffer/Daneben) und der Zustand direkt zwischen den Handys,
// ohne Server. Beide Handys müssen im selben Netz sein (Hotspot oder Hallen-WLAN).
// Angemeldet wird über remote.js (initRemote), das die Befehle ausführt (command) und den Zustand liefert (snapshot).
import { offerPeer, remoteUrl } from './link.js';
import { drawQr } from './qr.js';
import { say } from './speech.js';

let ctx = null, chip = null, box = null, peer = null, linked = false, scan = null, own = null, poll = null, last = '';
const hint = t => ctx?.hint?.(t);

export function initLink(c){
  ctx = c;
  chip = document.createElement('button');
  chip.id = 'linkChip'; chip.className = 'chip';
  chip.style.cssText = 'pointer-events:auto;min-height:44px;color:inherit;cursor:pointer';
  chip.onclick = () => linked ? (confirm('Fernbedienung trennen?') && close('Fernbedienung getrennt.')) : open();
  const hud = document.querySelector('#hud'), after = hud?.querySelector('#leadChip');
  hud?.insertBefore(chip, after ? after.nextSibling : hud.querySelector('#fps'));
  render();
  window.__hcLink = {open, accept, get code(){ return peer?.code; }, get url(){ return peer && remoteUrl(peer.code); }, get linked(){ return linked; }};
}
function render(){
  if(!chip) return;
  chip.textContent = linked ? '📱 verbunden' : '📱';
  chip.setAttribute('aria-label', linked ? 'Fernbedienung verbunden, antippen zum Trennen' : 'Zweites Handy als Fernbedienung koppeln');
}

// Zustand an die Fernbedienung, nur wenn er sich geändert hat.
function send(force){
  if(!peer || peer.ch.readyState !== 'open') return;
  const s = JSON.stringify({t:'s', ...ctx.snapshot()});
  if(force || s !== last){ last = s; try{ peer.ch.send(s); }catch(e){} }
}

async function open(){
  stopPeer();
  showBox();
  setStatus('Code wird erstellt …');
  await camera();                    // vor dem Angebot: mit Kamera-Erlaubnis gibt der Browser die echten Adressen frei
  try{ peer = await offerPeer(); }
  catch(e){ setStatus('Dieser Browser kann keine direkte Verbindung (WebRTC).'); return; }
  const p = peer;
  p.ch.onopen = () => { if(p !== peer) return; linked = true; render(); hideBox(); stopScan(); say('Fernbedienung verbunden.'); hint('Fernbedienung verbunden.'); send(true); poll = setInterval(() => send(), 400); };
  p.ch.onclose = () => { if(p === peer && linked) close('Fernbedienung getrennt. Zum Neu-Koppeln oben auf 📱 tippen.'); };
  p.ch.onmessage = e => { let m; try{ m = JSON.parse(e.data); }catch(x){ return; }
    if(m.t === 'c') ctx.command(m.a); if(m.t === 'c' || m.t === 'hi') send(true); };
  p.pc.onconnectionstatechange = () => { if(p === peer && p.pc.connectionState === 'failed') linked ? close('Fernbedienung getrennt.') : setStatus('Keine Verbindung. Sind beide Handys im selben WLAN oder Hotspot? „Neuer Code“ versucht es noch einmal.'); };
  const url = remoteUrl(p.code);
  drawQr(box.querySelector('canvas'), url, Math.min(300, innerWidth - 80));
  box.querySelector('[data-k=url]').textContent = url;
  const noNet = p.code.split('~').length < 6;
  setStatus(noNet ? 'Kein Netz gefunden: Hotspot an einem Handy einschalten, das andere damit verbinden, dann „Neuer Code“.' : 'Warte auf den Code der Fernbedienung …');
  startScan();
}

async function accept(code){
  if(!peer) return false;
  try{ await peer.accept(code); }
  catch(e){ setStatus('Das ist nicht der Code der Fernbedienung.'); return false; }
  stopScan(); setStatus('Code gelesen, verbinde …'); beepOk();
  return true;
}
function beepOk(){ try{ navigator.vibrate?.(60); }catch(e){} }

function close(msg){
  const was = linked;
  stopPeer(); hideBox();
  if(was){ say('Fernbedienung getrennt.'); hint(msg); }
}
function stopPeer(){
  clearInterval(poll); poll = null; last = '';
  if(peer){ const p = peer; peer = null; try{ p.ch.close(); p.pc.close(); }catch(e){} }
  linked = false; render(); stopScan();
}

/* ---------- Fenster ---------- */
function showBox(){
  if(!box){
    box = document.createElement('div'); box.id = 'linkBox';
    box.style.cssText = 'position:absolute;inset:0;z-index:60;overflow:auto;background:rgba(10,14,22,.94);color:#fff;'
      + 'font-family:Barlow,sans-serif;text-align:center;padding:16px';
    box.innerHTML = `<h2 style="margin:4px 0 8px;font:700 22px 'Barlow Condensed',sans-serif">Zweites Handy als Fernbedienung</h2>
      <p style="margin:0 0 8px"><b>1.</b> Mit der Kamera-App des zweiten Handys diesen Code scannen und die Seite öffnen.</p>
      <canvas style="background:#fff;border-radius:8px;max-width:100%;image-rendering:pixelated"></canvas>
      <p style="margin:10px 0 6px"><b>2.</b> Das zweite Handy zeigt dann einen eigenen Code. Den vor die Kamera <b>dieses</b> Handys (Rückseite) halten, 20 bis 40 cm Abstand.</p>
      <canvas data-k="prev" width="160" height="120" style="width:160px;height:120px;border-radius:6px;background:#222"></canvas>
      <p data-k="st" role="status" style="min-height:2.6em;margin:6px 0;color:#ffd166"></p>
      <p style="font-size:13px;opacity:.75;margin:4px 0">Beide Handys müssen im selben WLAN oder Hotspot sein. Kein Server, kein Konto.</p>
      <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:8px">
        <button data-k="new" style="min-height:44px;padding:0 14px">Neuer Code</button>
        <button data-k="paste" style="min-height:44px;padding:0 14px">Code eingeben</button>
        <button data-k="close" style="min-height:44px;padding:0 14px">Schließen</button></div>
      <p data-k="url" style="font-size:10px;opacity:.4;word-break:break-all;margin-top:10px"></p>`;
    box.querySelector('[data-k=new]').onclick = () => open();
    box.querySelector('[data-k=close]').onclick = () => { if(!linked) stopPeer(); hideBox(); };
    box.querySelector('[data-k=paste]').onclick = () => { const c = prompt('Code der Fernbedienung (beginnt mit HC1~A~):'); if(c) accept(c); };
    (document.querySelector('#stage') || document.body).append(box);
  }
  box.style.display = 'block';
}
function hideBox(){ if(box) box.style.display = 'none'; stopScan(); }
function setStatus(t){ const p = box?.querySelector('[data-k=st]'); if(p) p.textContent = t; }

/* ---------- Code der Fernbedienung mit der Kamera lesen ---------- */
// Läuft schon ein Kamerabild (Training), wird es benutzt, sonst wird die Rückkamera kurz geöffnet.
function liveVideo(){ return [...document.querySelectorAll('video')].find(v => v.videoWidth > 0 && !v.paused && v !== own?.video); }
async function camera(){
  if(liveVideo() || own) return;
  try{
    const stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment', width:{ideal:1280}}, audio:false});
    const video = document.createElement('video'); video.muted = true; video.playsInline = true; video.srcObject = stream;
    await video.play(); own = {stream, video};
  }catch(e){ own = null; }
}
let decoder = null;
async function getDecoder(){
  if(decoder) return decoder;
  if('BarcodeDetector' in window){
    try{ if((await BarcodeDetector.getSupportedFormats()).includes('qr_code')){
      const d = new BarcodeDetector({formats:['qr_code']});
      return decoder = async c => (await d.detect(c))[0]?.rawValue;
    } }catch(e){}
  }
  const jsQR = (await import('https://cdn.jsdelivr.net/npm/jsqr@1.4.0/+esm')).default;   // iPhone: kein BarcodeDetector
  return decoder = async c => { const g = c.getContext('2d'); return jsQR(g.getImageData(0, 0, c.width, c.height).data, c.width, c.height, {inversionAttempts:'dontInvert'})?.data; };
}
function startScan(){
  stopScan();
  const c = document.createElement('canvas'), g = c.getContext('2d', {willReadFrequently:true});
  let busy = false, warned = false;
  scan = setInterval(async () => {
    const v = liveVideo() || own?.video;
    if(busy || !v || !v.videoWidth) return;
    busy = true;
    try{
      const k = Math.min(1, 960/v.videoWidth); c.width = Math.round(v.videoWidth*k); c.height = Math.round(v.videoHeight*k);
      g.drawImage(v, 0, 0, c.width, c.height);
      const pv = box?.querySelector('[data-k=prev]'); pv?.getContext('2d').drawImage(c, 0, 0, pv.width, pv.height);
      const txt = await (await getDecoder())(c);
      if(txt && txt.startsWith('HC1~A~')) await accept(txt);
    }catch(e){ if(!warned){ warned = true; setStatus('Kamera kann hier keinen Code lesen, bitte „Code eingeben“.'); } }
    busy = false;
  }, 300);
}
function stopScan(){
  clearInterval(scan); scan = null;
  if(own){ own.stream.getTracks().forEach(t => t.stop()); own = null; }
}
