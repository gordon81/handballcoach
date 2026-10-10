// Fernbedienung (PLAYBOOK C6, Stufe 2): das zweite Handy öffnet diese Seite über den QR-Code des Kamera-Handys.
// Das Angebot steht im Fragment (#HC1~O~…). Die Seite erstellt die Antwort und zeigt sie als QR-Code, den das
// Kamera-Handy mit seiner Kamera liest. Danach: Knöpfe schicken Befehle, das Kamera-Handy schickt seinen Zustand.
import { answerPeer } from '../../shared/js/link.js';
import { drawQr } from '../../shared/js/qr.js';
import { keepAwake, releaseWake } from '../../shared/js/wakelock.js';
import '../../shared/js/utils.js';   // Service Worker (offline)

const $ = s => document.querySelector(s);
const show = id => ['#vNoCode', '#vPair', '#vCtl', '#vGone'].forEach(v => $(v).hidden = v !== id);
let peer = null, st = null;
window.__fern = {get code(){ return peer?.code; }, get state(){ return st; }};

function send(a){
  if(peer?.ch.readyState !== 'open') return;
  try{ navigator.vibrate?.(25); }catch(e){}
  peer.ch.send(JSON.stringify({t:'c', a}));
}

async function pair(code){
  show('#vPair');
  try{ peer = await answerPeer(code); }
  catch(e){ $('#pairMsg').textContent = 'Dieser Code passt nicht. Bitte am Kamera-Handy auf „Neuer Code“ tippen und neu scannen.'; return; }
  const p = peer;
  if(p.code.split('~').length < 6){ $('#pairMsg').textContent = 'Kein Netz gefunden. Hotspot einschalten, beide Handys verbinden und neu scannen.'; return; }
  $('#pairMsg').hidden = true;
  $('#pairStep').hidden = false;
  drawQr($('#qr'), p.code, Math.min(340, innerWidth - 32));
  $('#qr').dataset.code = p.code;
  $('#btnShare').hidden = !navigator.share;
  $('#btnShare').onclick = () => navigator.share({text:p.code}).catch(() => {});
  $('#btnCopy').hidden = !navigator.clipboard;
  $('#btnCopy').onclick = () => navigator.clipboard.writeText(p.code).then(() => $('#btnCopy').textContent = 'Kopiert ✓');
  p.ch.onopen = () => { show('#vCtl'); keepAwake(); p.ch.send(JSON.stringify({t:'hi'})); };
  p.ch.onmessage = e => { let m; try{ m = JSON.parse(e.data); }catch(x){ return; } if(m.t === 's'){ st = m; render(); } };
  p.ch.onclose = gone;
  p.pc.onconnectionstatechange = () => { if(['failed', 'closed'].includes(p.pc.connectionState)) gone(); };
  p.pc.oniceconnectionstatechange = () => {
    if(p.pc.iceConnectionState === 'failed' && !$('#vPair').hidden){ $('#pairMsg').hidden = false; $('#pairMsg').textContent = 'Code wurde gelesen, aber keine Verbindung. Sind beide Geräte im selben WLAN oder Hotspot? Am Kamera-Handy „Neuer Code“ und neu scannen.'; }
  };
}
function gone(){ if(!peer) return; try{ peer.pc.close(); }catch(e){} peer = null; releaseWake(); show('#vGone'); }

function render(){
  document.title = `Fernbedienung · ${st.title}`;
  $('#status .st').textContent = st.count ? `Start in ${st.count} s` : st.state || '–';
  $('#status .card').textContent = st.card;
  $('#status .hint').textContent = st.hint;
  const b = $('#btnStart'), stop = st.run || st.count > 0;
  b.textContent = st.count ? 'Abbrechen' : st.run ? 'Stopp' : st.lead ? `Start (${st.lead} s)` : 'Start';
  b.classList.toggle('stop', stop);
  b.disabled = !stop && !st.can;
  $('#btnNext').hidden = !st.next; $('#btnNext').textContent = st.next || '';
  $('#btnPrev').hidden = !st.prev; $('#btnPrev').textContent = st.prev || '';
  $('#btnNext').disabled = $('#btnPrev').disabled = !st.run;
  $('#hitRow').hidden = !st.hit;
  $('#btnHit').classList.toggle('on', st.hit === 'hit'); $('#btnMiss').classList.toggle('on', st.hit === 'miss');
}

$('#btnStart').onclick = () => send(st?.run || st?.count ? 'stop' : 'start');
$('#btnNext').onclick = () => send('next');
$('#btnPrev').onclick = () => send('prev');
$('#btnHit').onclick = () => send('hit');
$('#btnMiss').onclick = () => send('miss');
$('#btnBye').onclick = () => { if(confirm('Fernbedienung trennen?')) gone(); };
document.addEventListener('visibilitychange', () => { if(document.visibilityState === 'visible' && $('#vCtl').hidden === false) keepAwake(); });

const code = decodeURIComponent(location.hash.slice(1));
history.replaceState(null, '', location.pathname);   // alter Code taugt nach Neuladen nicht mehr
if(code) pair(code); else show('#vNoCode');
