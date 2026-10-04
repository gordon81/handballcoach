// Kleine Helfer ohne Abhängigkeiten.

export const dist = (a,b) => Math.hypot(a.x-b.x, a.y-b.y);
export const mid = (a,b) => ({x:(a.x+b.x)/2, y:(a.y+b.y)/2});
export function pct(a,p){ if(!a.length) return null; const s=[...a].sort((x,y)=>x-y); return s[Math.round(p*(s.length-1))]; }
export const colorOf = n => /blau|blue/i.test(n) ? 'var(--blue)' : /orange/i.test(n) ? 'var(--orange)' : 'var(--text)';
export const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
export const pick = a => a[Math.floor(Math.random()*a.length)];
export const angDiff = (a,b) => ((a-b+540)%360)-180;
export const fmtDate = d => d.toLocaleString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});

if(typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'serviceWorker' in navigator && location.protocol.startsWith('http')){
  window.addEventListener('load', () => {
    try {
      const swUrl = new URL('../../sw.js', import.meta.url).href;
      const scope = new URL('../../', import.meta.url).pathname;
      navigator.serviceWorker.register(swUrl, {scope}).catch(() => {});
    } catch(_){}
  });
}
