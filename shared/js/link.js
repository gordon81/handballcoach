// Direkte Verbindung Kamera-Handy ↔ Fernbedienung (PLAYBOOK C6, Stufe 2) über WebRTC, ohne Server und ohne
// Vermittlungsdienst: Angebot und Antwort gehen als QR-Code von Bildschirm zu Kamera. Damit die Codes klein bleiben,
// wird aus der SDP nur das Nötige gepackt (ICE-Kennung, Passwort, Fingerabdruck, Adressen) und auf der anderen Seite
// wieder zu einer SDP für einen reinen Datenkanal zusammengesetzt. Ohne STUN gibt es nur lokale Adressen: beide
// Handys müssen im selben Netz sein (Hotspot eines der beiden Handys oder Hallen-WLAN).
//   pack(sdp, 'O'|'A') → "HC1~O~ufrag~pwd~fingerprint~adresse,port~…"   unpack(code) → {kind, sdp} oder null.
//   offerPeer() / answerPeer(code) bauen die Verbindung auf (Browser).

const TAG = 'HC1';
const b64 = hex => btoa(String.fromCharCode(...hex.split(':').map(h => parseInt(h, 16)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const hex = s => [...atob(s.replace(/-/g, '+').replace(/_/g, '/'))].map(c => c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')).join(':');

// Nur UDP-Kandidaten, höchstens 4: zuerst typische Heim-/Hotspot-Netze (192.168.x, 10.x, iPhone-Hotspot 172.20.10.x),
// dann mDNS-Namen (*.local), dann übrige 172.x (oft Docker-Netze am Rechner), zuletzt IPv6.
const rank = c => /^192\.168\./.test(c) ? 0 : /^10\./.test(c) ? 1 : /^172\.20\.10\./.test(c) ? 2 : /\.local,/.test(c) ? 3 : c.includes(':') ? 5 : 4;
export function pack(sdp, kind){
  const get = k => (sdp.match(new RegExp('^a=' + k + ':(.+)$', 'm')) || [])[1]?.trim();
  const fp = (sdp.match(/^a=fingerprint:sha-256 (.+)$/m) || [])[1]?.trim();
  if(!get('ice-ufrag') || !get('ice-pwd') || !fp) return null;
  const cands = [];
  for(const m of sdp.matchAll(/^a=candidate:\S+ \d+ (\S+) \d+ (\S+) (\d+) typ (\S+)/gm)){
    if(m[1].toLowerCase() !== 'udp') continue;
    const c = `${m[2]},${m[3]}`; if(!cands.includes(c)) cands.push(c);
  }
  cands.sort((a, b) => rank(a) - rank(b));
  return [TAG, kind, get('ice-ufrag'), get('ice-pwd'), b64(fp), ...cands.slice(0, 4)].join('~');
}

export function unpack(code){
  const p = String(code || '').trim().split('~');
  if(p[0] !== TAG || !['O', 'A'].includes(p[1]) || p.length < 5) return null;
  const [, kind, ufrag, pwd, fp, ...cands] = p;
  let fingerprint; try{ fingerprint = hex(fp); }catch(e){ return null; }
  const L = ['v=0', 'o=- 1 2 IN IP4 127.0.0.1', 's=-', 't=0 0', 'a=group:BUNDLE 0', 'a=msid-semantic: WMS',
    'm=application 9 UDP/DTLS/SCTP webrtc-datachannel', 'c=IN IP4 0.0.0.0',
    `a=ice-ufrag:${ufrag}`, `a=ice-pwd:${pwd}`, `a=fingerprint:sha-256 ${fingerprint}`,
    `a=setup:${kind === 'O' ? 'actpass' : 'active'}`, 'a=mid:0', 'a=sctp-port:5000', 'a=max-message-size:262144'];
  cands.forEach((c, i) => {
    const k = c.lastIndexOf(','), addr = c.slice(0, k), port = c.slice(k + 1);
    if(addr && /^\d+$/.test(port)) L.push(`a=candidate:${i + 1} 1 udp ${2122260223 - i} ${addr} ${port} typ host`);
  });
  L.push('a=end-of-candidates');
  return {kind, sdp:L.join('\r\n') + '\r\n'};
}

// Adresse der Fernbedienungs-Seite mit dem Angebot im Fragment (wird nicht an den Server geschickt).
export const remoteUrl = code => new URL('../../fern/', import.meta.url).href + '#' + code;

// Warten, bis alle Adressen gesammelt sind (ohne STUN geht das schnell), höchstens 3 s.
function gathered(pc){
  return new Promise(res => {
    if(pc.iceGatheringState === 'complete') return res();
    const t = setTimeout(res, 3000);
    pc.addEventListener('icegatheringstatechange', () => { if(pc.iceGatheringState === 'complete'){ clearTimeout(t); res(); } });
  });
}
// Beide Seiten öffnen denselben ausgehandelten Kanal (id 0), so braucht es keine weitere Nachricht.
const channel = pc => pc.createDataChannel('fern', {negotiated:true, id:0});

// Kamera-Handy: Angebot erstellen. → {pc, ch, code, accept(answerCode)}
export async function offerPeer(){
  const pc = new RTCPeerConnection({iceServers:[]}), ch = channel(pc);
  await pc.setLocalDescription(await pc.createOffer());
  await gathered(pc);
  const code = pack(pc.localDescription.sdp, 'O');
  return {pc, ch, code, async accept(ans){
    const a = unpack(ans);
    if(!a || a.kind !== 'A') throw new Error('Kein Code der Fernbedienung');
    await pc.setRemoteDescription({type:'answer', sdp:a.sdp});
  }};
}

// Fernbedienung: Angebot annehmen, Antwort erstellen. → {pc, ch, code}
export async function answerPeer(offerCode){
  const o = unpack(offerCode);
  if(!o || o.kind !== 'O') throw new Error('Kein Code des Kamera-Handys');
  const pc = new RTCPeerConnection({iceServers:[]}), ch = channel(pc);
  await pc.setRemoteDescription({type:'offer', sdp:o.sdp});
  await pc.setLocalDescription(await pc.createAnswer());
  await gathered(pc);
  return {pc, ch, code:pack(pc.localDescription.sdp, 'A')};
}
