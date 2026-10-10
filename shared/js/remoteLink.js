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
  const noNet = p.code.split('~').length < 6;
  setStatus(noNet ? 'Kein Netz gefunden: Hotspot an einem Handy einschalten, das andere damit verbinden, dann „Neuer Code“.' : 'Kamera sucht den Code des zweiten Handys …');
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
// Zwei Schritte untereinander; der aktive ist hervorgehoben. Schritt 2 zeigt groß, was die Kamera sieht.
const BTN = 'min-height:44px;padding:0 16px;border-radius:10px;border:1px solid #4a6078;background:#243241;color:#fff;font:600 16px Barlow,sans-serif;cursor:pointer';
function showBox(){
  if(!box){
    box = document.createElement('div'); box.id = 'linkBox';
    box.style.cssText = 'position:fixed;inset:0;z-index:1000;overflow:auto;background:#0a0e16;color:#fff;'
      + 'font-family:Barlow,sans-serif;text-align:center;padding:14px 16px';
    box.innerHTML = `<h2 style="margin:2px 0 10px;font:700 22px 'Barlow Condensed',sans-serif">Zweites Handy als Fernbedienung</h2>
      <div data-k="s1" style="border-radius:12px;padding:10px;margin-bottom:10px">
        <p style="margin:0 0 8px"><b>Schritt 1 · am zweiten Handy:</b> Kamera-App öffnen, diesen Code scannen, den Link öffnen.</p>
        <canvas style="background:#fff;border-radius:8px;max-width:100%;image-rendering:pixelated"></canvas></div>
      <div data-k="s2" style="border-radius:12px;padding:10px">
        <p style="margin:0 0 8px"><b>Schritt 2 · zurück:</b> Das zweite Handy zeigt jetzt <b>seinen eigenen Code</b>. Das zweite Handy mit dem Code
          <b>vor die Kamera dieses Geräts</b> halten (Handy: Rückseite, Laptop: Webcam), 20 bis 40 cm, bis der Code unten im Bild zu sehen ist.</p>
        <div style="position:relative;display:inline-block;max-width:100%">
          <canvas data-k="prev" width="320" height="240" style="width:min(320px,100%);border-radius:8px;background:#222;display:block"></canvas>
          <div style="position:absolute;inset:18% 26%;border:3px dashed rgba(255,209,102,.8);border-radius:8px;pointer-events:none"></div></div>
        <p data-k="st" role="status" style="min-height:2.6em;margin:8px 0 4px;color:#ffd166;font-weight:600"></p>
        <p style="font-size:14px;margin:0 0 8px;color:#c9d3dd">Geht das Scannen nicht: am zweiten Handy „Code teilen“ (z. B. per Messenger an dich selbst), hier kopieren und „Code einfügen“.</p>
        <button data-k="paste" style="${BTN}">Code einfügen</button></div>
      <p style="font-size:14px;margin:12px 0 8px;color:#c9d3dd">Beide Geräte müssen im selben WLAN oder Hotspot sein. Kein Server, kein Konto.</p>
      <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
        <button data-k="new" style="${BTN}">Neuer Code</button>
        <button data-k="close" style="${BTN}">Schließen</button></div>`;
    box.querySelector('[data-k=new]').onclick = () => open();
    box.querySelector('[data-k=close]').onclick = () => { if(!linked) stopPeer(); hideBox(); };
    box.querySelector('[data-k=paste]').onclick = paste;
    (document.querySelector('#stage') || document.body).append(box);
  }
  box.style.display = 'block';
  stepOn(1);
}
// Aktiven Schritt hervorheben.
function stepOn(n){
  [1, 2].forEach(i => { const el = box?.querySelector(`[data-k=s${i}]`); if(el) el.style.cssText = `border-radius:12px;padding:10px;margin-bottom:10px;`
    + (i === n ? 'background:#1d2b3a;outline:2px solid #ff8a1f' : 'outline:1px solid #33465a'); });
}
// Code aus der Zwischenablage, sonst Eingabefeld.
async function paste(){
  let c = '';
  try{ c = (await navigator.clipboard.readText()).trim(); }catch(e){}
  if(!c.startsWith('HC1~A~')) c = prompt('Code der Fernbedienung einfügen (beginnt mit HC1~A~):') || '';
  c = (c.match(/HC1~A~\S+/) || [c.trim()])[0];
  if(c) accept(c);
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
    await video.play();
    const fm = stream.getVideoTracks()[0]?.getSettings?.().facingMode;
    own = {stream, video, front:fm !== 'environment'};   // Laptop-Webcams melden meist nichts = vorn
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
  let busy = false, warned = false, n = 0;
  scan = setInterval(async () => {
    if(++n === 20) stepOn(2);         // nach ~6 s ist Schritt 1 meist erledigt
    const v = liveVideo() || own?.video;
    if(busy || !v || !v.videoWidth) return;
    busy = true;
    try{
      const k = Math.min(1, 960/v.videoWidth); c.width = Math.round(v.videoWidth*k); c.height = Math.round(v.videoHeight*k);
      g.drawImage(v, 0, 0, c.width, c.height);
      preview(c, v === own?.video && own.front);
      const txt = await (await getDecoder())(c);
      if(txt && txt.startsWith('HC1~A~')){ stepOn(2); await accept(txt); }
      else if(txt){ stepOn(2); setStatus(txt.includes('HC1~O~') ? 'Das ist der Code aus Schritt 1. Gebraucht wird der Code, den das zweite Handy danach zeigt.' : 'Fremder QR-Code. Gebraucht wird der Code, den das zweite Handy zeigt.'); }
    }catch(e){ if(!warned){ warned = true; setStatus('Kamera kann hier keinen Code lesen, bitte „Code einfügen“.'); } }
    busy = false;
  }, 300);
}
// Vorschau im Seitenverhältnis der Kamera; Frontkamera/Webcam gespiegelt wie ein Spiegel, damit man sich zurechtfindet.
function preview(c, mirror){
  const pv = box?.querySelector('[data-k=prev]'); if(!pv) return;
  const h = Math.round(320*c.height/c.width); if(pv.height !== h) pv.height = h;
  const g = pv.getContext('2d'); g.save();
  if(mirror){ g.translate(pv.width, 0); g.scale(-1, 1); }
  g.drawImage(c, 0, 0, pv.width, pv.height); g.restore();
}
function stopScan(){
  clearInterval(scan); scan = null;
  if(own){ own.stream.getTracks().forEach(t => t.stop()); own = null; }
}
