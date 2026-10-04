// Fehler-Erfassung für alle Seiten. Klassisches Skript (kein Modul) ganz oben im <head>, damit es vor allem anderen läuft.
//  1. Lokales Fehlerprotokoll im localStorage: funktioniert auch offline in der Halle, Fehler gehen nicht verloren.
//  2. Versand an Sentry (EU-Rechenzentrum Frankfurt). Das SDK (nur Fehler, ohne Tracing/Replay, ~31 KB gzip) wird
//     erst nach dem Laden der Seite geholt, und nur online, nicht lokal und nicht in automatischen Tests.
//     Fehler, die offline oder vor dem Laden passiert sind, werden nachgeschickt.
//  3. „Fehler melden“-Dialog: Beschreibung + Diagnose an Sentry senden oder als Text teilen (WhatsApp, Mail).
//     Öffnen: HC.openReport(), Link auf der Startseite, Adresse mit #fehler-melden oder der Hinweis nach einem Absturz.
// Eigener Code kann Fehler mit Zusatzinfos melden: HC.report(err, {bereich:'kamera'}).
// Lokal testen mit Versand: ?sentry=1 anhängen. Versand abschalten: ?sentry=0.
(function(){
  'use strict';
  // Bei jedem Release anpassen: Sentry zeigt dann, ab welcher Version ein Fehler auftritt bzw. ob er behoben ist.
  const VERSION = 'handballcoach@2026-10-05';
  const DSN = 'https://172b070b5a97d027e289707ad0dbb7dc@o4511277159546880.ingest.de.sentry.io/4512200434188368';
  const SDK_URL = 'https://browser.sentry-cdn.com/11.4.0/bundle.min.js';
  const SDK_SRI = 'sha384-yR8WDlaM5tdf6UYPdUkCyZhW0OUuGNnKT8haW281Se9cj9eZP3z+iKwFvivogWnz';
  const KEY = 'hc-errlog', MAX_KEEP = 30, MAX_SEND = 20;
  // Bedienungs-/Geräteprobleme (Kamera verweigert, keine Kamera …) sind keine Programmfehler → nur Warnung.
  const WARN_NAMES = /^(NotAllowedError|NotFoundError|NotReadableError|OverconstrainedError|AbortError|SecurityError)$/;

  const qs = new URLSearchParams(location.search);
  const isLocal = /^(localhost|127\.\d+\.\d+\.\d+|0\.0\.0\.0|\[::1\]|)$/.test(location.hostname);
  const canSend = location.protocol.startsWith('http') && !navigator.webdriver && qs.get('sentry') !== '0' && (!isLocal || qs.get('sentry') === '1');
  const page = location.pathname.replace(/index\.html$/, '');
  const pageStart = Date.now();
  const standalone = () => matchMedia('(display-mode: standalone)').matches;

  let log = read();
  const seen = new Map();   // Meldung → Eintrag dieser Seite: ein Fehler im Bild-Takt zählt hoch statt 60× pro Sekunde
  let S = null, loading = null, sent = 0, toastShown = false, dlg = null;

  function read(){ try{ const a = JSON.parse(localStorage.getItem(KEY)); return Array.isArray(a) ? a : []; }catch(_){ return []; } }
  function save(){ try{ log = log.slice(-MAX_KEEP); localStorage.setItem(KEY, JSON.stringify(log)); }catch(_){} }
  function str(x){ try{ return typeof x === 'string' ? x : x instanceof Error ? x.message : JSON.stringify(x); }catch(_){ return String(x); } }
  function asError(x){
    if(x instanceof Error) return x;
    const e = new Error(x && x.message ? String(x.message) : str(x));
    if(x && x.name) e.name = String(x.name);
    return e;
  }

  // Fehler lokal speichern und (wenn möglich) an Sentry schicken. opts.quiet: kein Hinweis-Toast.
  function capture(x, kind, ctx, opts){
    opts = opts || {};
    const err = asError(x);
    if(/^Script error\.?$/.test(err.message)) return null;   // fremde Skripte ohne Details, nicht auswertbar
    const key = kind + '|' + err.name + '|' + err.message;
    let en = seen.get(key);
    if(en){ en.n++; save(); return en; }
    en = {t: new Date().toISOString(), kind, level: opts.level || (WARN_NAMES.test(err.name) ? 'warning' : 'error'),
      name: err.name || 'Error', msg: String(err.message || '(ohne Text)').slice(0, 500), stack: String(err.stack || '').slice(0, 3000),
      page: page + location.search, n: 1, sent: false};
    if(ctx) en.ctx = ctx;
    seen.set(key, en); log.push(en); save();
    send(en, err);
    if(!opts.quiet && en.level === 'error') toast();
    return en;
  }

  function send(en, err){
    if(en.sent || !S || !navigator.onLine) return;
    if(en.kind === 'feedback'){
      en.sent = true; save();
      S.captureFeedback({message: en.msg, source: 'fehler-melden', url: location.origin + en.page},
        {attachments: [{filename: 'diagnose.txt', data: en.diag || ''}]});
      return;
    }
    if(sent >= MAX_SEND) return;
    sent++; en.sent = true; save();
    if(!err){ err = new Error(en.msg); err.name = en.name; if(en.stack) err.stack = en.stack; }
    S.withScope(s => {
      s.setLevel(en.level); s.setTag('art', en.kind); s.setTag('seite', en.page.split('?')[0] || '/');
      if(en.ctx) s.setContext('kontext', en.ctx);
      if(Date.parse(en.t) < pageStart){ s.setTag('nachgereicht', 'ja'); s.setExtra('zeitpunkt', en.t); s.setExtra('seite_damals', en.page); }
      S.captureException(err);
    });
  }
  function flush(){ for(const en of log) if(!en.sent) send(en); }

  function loadSdk(){
    if(!canSend || S || !navigator.onLine) return Promise.resolve(S);
    if(loading) return loading;
    loading = new Promise(res => {
      const sc = document.createElement('script');
      sc.src = SDK_URL; sc.integrity = SDK_SRI; sc.crossOrigin = 'anonymous'; sc.async = true;
      sc.onload = () => { try{ init(); }catch(e){ console.warn('Sentry-Start fehlgeschlagen', e); } res(S); };
      sc.onerror = () => { sc.remove(); loading = null; res(null); };   // offline/Werbeblocker: lokal weiter sammeln
      document.head.appendChild(sc);
    });
    return loading;
  }
  function init(){
    const Sn = window.Sentry; if(!Sn || !Sn.init) return;
    Sn.init({
      dsn: DSN, release: VERSION,
      environment: isLocal ? 'development' : /github\.io$/.test(location.hostname) ? 'production' : location.hostname,
      sendDefaultPii: false,
      // Globale Fehler fängt dieses Skript selbst (auch offline). Ohne diese beiden käme jeder Fehler doppelt an.
      integrations: d => d.filter(i => i.name !== 'GlobalHandlers' && i.name !== 'BrowserApiErrors'),
      initialScope: {tags: {demo: qs.has('demo') ? 'ja' : 'nein', app_installiert: standalone() ? 'ja' : 'nein'}}
    });
    S = Sn; flush();
  }

  // ---------- Hinweis nach einem Absturz und Melde-Dialog ----------
  const BTN = 'border:0;border-radius:8px;padding:8px 12px;background:#243241;color:inherit;font:600 15px Barlow,system-ui,sans-serif;cursor:pointer';
  const ORANGE = '#ff8a1f';
  function whenBody(fn){ document.body ? fn() : addEventListener('DOMContentLoaded', fn, {once: true}); }

  function toast(){
    if(toastShown) return; toastShown = true;
    whenBody(() => {
      const t = document.createElement('div');
      t.id = 'hc-toast'; t.setAttribute('role', 'alert');
      t.style.cssText = 'position:fixed;left:50%;bottom:calc(16px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:2147483000;'
        + 'display:flex;gap:10px;align-items:center;max-width:92vw;padding:10px 12px;border-radius:12px;background:#1b2530;color:#eef2f5;'
        + 'border:1px solid #33465a;box-shadow:0 6px 24px #0009;font:15px/1.3 Barlow,system-ui,sans-serif';
      t.innerHTML = '<span>Da ist etwas schiefgelaufen.</span><button type="button" data-k="open">Melden</button><button type="button" data-k="x" aria-label="Schließen">✕</button>';
      t.querySelectorAll('button').forEach(b => b.style.cssText = BTN);
      t.querySelector('[data-k=open]').style.background = ORANGE;
      t.querySelector('[data-k=open]').onclick = () => { t.remove(); openReport(); };
      t.querySelector('[data-k=x]').onclick = () => t.remove();
      document.body.appendChild(t);
      setTimeout(() => t.remove(), 15000);
    });
  }

  function diagnostics(text){
    const L = ['Handballcoach – Fehlerbericht', ''];
    if(text) L.push('Beschreibung: ' + text, '');
    L.push('Version: ' + VERSION, 'Zeit: ' + new Date().toLocaleString('de-DE'), 'Seite: ' + location.href,
      'Browser: ' + navigator.userAgent,
      'Bildschirm: ' + screen.width + '×' + screen.height + ' @' + devicePixelRatio + (standalone() ? ', als App installiert' : ''),
      'Online: ' + (navigator.onLine ? 'ja' : 'nein') + ', Kamera-Zugriff möglich: ' + (navigator.mediaDevices && navigator.mediaDevices.getUserMedia ? 'ja' : 'nein'), '');
    const errs = log.filter(e => e.kind !== 'feedback').slice(-10).reverse();
    L.push(errs.length ? 'Letzte Fehler (neueste zuerst):' : 'Keine Fehler gespeichert.');
    for(const e of errs){
      L.push('- ' + e.t.replace('T', ' ').slice(0, 19) + ' ' + e.page + ' [' + e.kind + (e.n > 1 ? ', ' + e.n + '×' : '') + '] ' + e.name + ': ' + e.msg);
      L.push(...String(e.stack || '').split('\n').slice(1, 4).map(s => '    ' + s.trim()));
    }
    return L.join('\n');
  }

  async function share(text){
    try{ if(navigator.share){ await navigator.share({title: 'Handballcoach – Fehlerbericht', text}); return 'Geteilt.'; } }
    catch(e){ if(e.name === 'AbortError') return ''; }
    try{ await navigator.clipboard.writeText(text); return 'In die Zwischenablage kopiert, z. B. in WhatsApp einfügen.'; }catch(_){}
    return 'Teilen nicht möglich.';
  }

  function refresh(note){
    const errs = log.filter(e => e.kind !== 'feedback'), open = log.filter(e => !e.sent).length;
    let s = note || (errs.length ? errs.length + ' Fehler gespeichert' + (open ? ', ' + open + ' noch nicht gesendet' : '') + '.' : 'Keine Fehler gespeichert.');
    if(!canSend) s += ' Senden ist hier ausgeschaltet (lokal oder Test), bitte als Text teilen.';
    dlg.querySelector('[data-k=info]').textContent = s;
  }

  function buildDialog(){
    const d = document.createElement('dialog');
    d.id = 'hc-report';
    d.style.cssText = 'width:min(92vw,460px);border:1px solid #33465a;border-radius:14px;padding:18px;background:#1b2530;color:#eef2f5;'
      + 'font:16px/1.4 Barlow,system-ui,sans-serif;box-shadow:0 10px 40px #000a';
    d.innerHTML = '<h2 style="margin:0 0 8px;font:800 26px/1 \'Barlow Condensed\',\'Arial Narrow\',sans-serif;text-transform:uppercase">Fehler melden</h2>'
      + '<p style="margin:0 0 10px;color:#93a3b3">Was ist passiert? Mitgeschickt werden Version, Gerät, Browser, Seite und die letzten Fehlermeldungen. Keine Videos, keine Fotos, keine Namen.</p>'
      + '<textarea data-k="text" rows="4" maxlength="2000" placeholder="z. B. Nach dem Start bleibt das Bild schwarz" '
      + 'style="width:100%;box-sizing:border-box;border-radius:8px;border:1px solid #33465a;background:#121a22;color:inherit;padding:8px;font:inherit"></textarea>'
      + '<p data-k="info" aria-live="polite" style="margin:8px 0 12px;font-size:14px;color:#93a3b3"></p>'
      + '<div style="display:flex;flex-wrap:wrap;gap:8px">'
      + '<button type="button" data-k="send">Senden</button><button type="button" data-k="share">Als Text teilen</button>'
      + '<button type="button" data-k="clear">Protokoll löschen</button><button type="button" data-k="close">Schließen</button></div>';
    d.querySelectorAll('button').forEach(b => { b.style.cssText = BTN; b.style.flex = '1 1 auto'; });
    const q = k => d.querySelector('[data-k=' + k + ']');
    q('send').style.background = ORANGE;
    q('close').onclick = () => d.close();
    d.addEventListener('click', e => { if(e.target === d) d.close(); });
    q('clear').onclick = () => { log = []; seen.clear(); save(); refresh('Protokoll gelöscht.'); };
    q('share').onclick = async () => { const r = await share(diagnostics(q('text').value.trim())); if(r) refresh(r); };
    q('send').onclick = async () => {
      const text = q('text').value.trim();
      if(!text){ refresh('Bitte kurz beschreiben, was passiert ist.'); q('text').focus(); return; }
      if(!canSend){ refresh(); return; }
      const fb = {t: new Date().toISOString(), kind: 'feedback', level: 'info', name: 'Feedback', msg: text.slice(0, 2000),
        diag: diagnostics(text), page: page + location.search, n: 1, sent: false};
      log.push(fb); save();
      refresh('Wird gesendet …');
      await loadSdk(); flush();
      if(fb.sent){ q('text').value = ''; refresh('Danke! Die Meldung ist angekommen.'); }
      else refresh('Gerade kein Internet. Die Meldung wird automatisch gesendet, sobald wieder Verbindung da ist.');
    };
    document.body.appendChild(d);
    return d;
  }
  function openReport(){
    whenBody(() => {
      if(!dlg) dlg = buildDialog();
      refresh();
      if(!dlg.open) dlg.showModal();
    });
  }

  // ---------- Start ----------
  addEventListener('error', e => { if(e instanceof ErrorEvent) capture(e.error || e.message, 'error'); });
  addEventListener('unhandledrejection', e => capture(e.reason, 'promise'));
  // Die Trainings fangen Startfehler ab und schreiben sie mit console.error(e) weg → auch diese erfassen (still, ohne Toast).
  // Reine Text-Ausgaben (z. B. Logzeilen der KI-Bibliothek) werden ignoriert.
  const origError = console.error;
  console.error = function(){
    origError.apply(console, arguments);
    try{ const err = Array.prototype.find.call(arguments, a => a instanceof Error); if(err) capture(err, 'console', null, {quiet: true}); }catch(_){}
  };

  if(canSend){
    const go = () => setTimeout(loadSdk, 1500);   // nicht mit dem Laden der Seite und des KI-Modells konkurrieren
    document.readyState === 'complete' ? go() : addEventListener('load', go, {once: true});
    addEventListener('online', () => loadSdk().then(flush));
  }
  if(location.hash === '#fehler-melden') openReport();

  window.HC = Object.assign(window.HC || {}, {
    version: VERSION,
    report: (err, ctx) => capture(err, 'report', ctx, {quiet: true}),
    openReport, diagnostics,
    errors: () => log.slice()
  });
})();
