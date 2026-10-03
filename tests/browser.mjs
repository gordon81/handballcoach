// Browser-Tests mit Playwright (headless Chromium):
//  1. Demo-Modus von vorn bis hinten: Linie ablaufen, Würfe, Wurf-Videos, Zuruf-Modus, Kamera bewegt.
//  2. Mikrofon: echte Web-Audio-Kette mit Fake-Mikrofon (künstliche Hallen-Tonspur aus wav.mjs).
// Start: im Ordner tests „npm test“ (einmalig vorher „npm install“, Browser: „npx playwright install chromium“).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { serve } from './server.mjs';
import { hallWav, SHOUTS, DURATION } from './wav.mjs';

let srv, browser;
before(async () => {
  const wav = join(mkdtempSync(join(tmpdir(), 'awc-')), 'halle.wav');
  writeFileSync(wav, hallWav());
  srv = await serve();
  browser = await chromium.launch({args:['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream',
    `--use-file-for-fake-audio-capture=${wav}`, '--autoplay-policy=no-user-gesture-required']});
});
after(async () => { await browser?.close(); srv?.close(); });

const sleep = ms => new Promise(r => setTimeout(r, ms));
// Module der Seite unter window.M (dieselben Instanzen wie in der App).
async function modules(page){
  await page.evaluate(async () => {
    const im = p => import(p);
    window.M = {store:await im('/js/store.js'), app:(await im('/js/state.js')).app, sim:await im('/js/demo/sim.js'),
      clips:await im('/js/clips.js'), shout:await im('/js/shout.js')};
  });
}
async function until(page, fn, arg, ms, what){
  const t0 = Date.now();
  while(Date.now() - t0 < ms){ if(await page.evaluate(fn, arg)) return; await sleep(250); }
  throw new Error('Zeit abgelaufen: ' + what);
}
const px = (page, pts) => page.evaluate(p => M.sim.truthError(p).map(e => e*720), pts);
const stats = a => { const s = [...a].sort((x, y) => x - y); return {med:s[s.length >> 1], max:s.at(-1)}; };

test('Demo: Einrichtung, Würfe, Videos, Zuruf, Kamera bewegt', {timeout:300000}, async t => {
  const page = await browser.newPage({viewport:{width:1280, height:800}});
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if(m.type()==='error') errors.push(m.text()); });
  await page.addInitScript(() => { if(!sessionStorage.getItem('init')){ sessionStorage.setItem('init', '1'); localStorage.clear(); localStorage.setItem('awc-demo-settings', JSON.stringify({pause:1})); } });
  await page.goto(srv.url + '?demo=1');
  await modules(page);

  await t.test('Linie ablaufen: am Boden erkannt, genau', async () => {
    await page.click('#btnStart');
    await page.click('#setup [data-a=wizard]');
    await until(page, () => M.store.settings.line?.pts?.length >= 2, null, 90000, 'Linie gespeichert');
    const line = await page.evaluate(() => M.store.settings.line);
    assert.ok(line.snapped, 'Linie sollte am Boden eingerastet sein');
    const e = stats(await px(page, line.pts));
    assert.ok(e.med < 4 && e.max < 12, `Linienfehler Median ${e.med.toFixed(1)} px, max ${e.max.toFixed(1)} px`);
  });

  await t.test('8 Würfe, Bewertung wie simuliert', async () => {
    await page.click('#setup [data-a=start]');
    await until(page, () => M.store.log.length >= 8, null, 150000, '8 Würfe');
    const log = await page.evaluate(() => M.store.log.slice(0, 8).map(e => ({issues:e.issues, target:e.target})));
    // Die simulierte Person wirft im Wechsel: gut, gut, Übertritt, flach mit Arm unten.
    log.forEach((e, i) => {
      const k = i % 4, has = x => e.issues.includes(x);
      assert.ok(e.target, `Wurf ${i+1}: Ziel angesagt`);
      assert.equal(has('over'), k===2, `Wurf ${i+1}: Übertritt ${JSON.stringify(e.issues)}`);
      assert.equal(has('jump'), k===3, `Wurf ${i+1}: Sprung flach ${JSON.stringify(e.issues)}`);
      assert.equal(has('arm'), k===3, `Wurf ${i+1}: Arm ${JSON.stringify(e.issues)}`);
      assert.ok(!has('leg'), `Wurf ${i+1}: Sprungbein`);
    });
  });

  await t.test('Wurf-Videos gespeichert und abspielbar', async () => {
    await until(page, () => M.store.log.slice(0, 8).filter(e => e.clip).length >= 6, null, 5000, 'Clips');
    const v = await page.evaluate(async () => {
      const en = M.store.log.findLast(e => e.clip), blob = await M.clips.getClip(en.time);
      const el = document.createElement('video'); el.muted = true; el.src = URL.createObjectURL(blob);
      await new Promise((res, rej) => { el.onloadeddata = res; el.onerror = () => rej(new Error('Video nicht abspielbar')); });
      return {size:blob.size, type:blob.type, w:el.videoWidth};
    });
    assert.ok(v.size > 20000 && v.w > 0, JSON.stringify(v));
    assert.match(v.type, /mp4/, 'H.264/MP4 bevorzugt');
  });

  await t.test('Videos aus: keine neuen Clips', async () => {
    await page.click('#btnSet'); await page.selectOption('#sClips', '0'); await page.click('#setSheet [data-close]');
    const n0 = await page.evaluate(() => M.store.log.length);
    await until(page, n => M.store.log.length >= n + 2, n0, 30000, '2 Würfe ohne Video');
    await sleep(1200);
    assert.equal(await page.evaluate(n => M.store.log.slice(n).filter(e => e.clip).length, n0), 0);
    await page.click('#btnSet'); await page.selectOption('#sClips', '1'); await page.click('#setSheet [data-close]');
  });

  await t.test('Zuruf-Modus: Ziel 2 s nach dem Ruf', async () => {
    await page.evaluate(() => {
      window.T = []; let s = null;
      setInterval(() => { if(M.app.state !== s){ s = M.app.state; T.push({s, t:performance.now()}); } }, 20);
    });
    await page.click('#btnSet'); await page.selectOption('#sMode', 'call'); await page.selectOption('#sCallDelay', '2');
    await page.click('#setSheet [data-close]');
    const n0 = await page.evaluate(() => M.store.log.length);
    await until(page, n => M.store.log.length >= n + 3, n0, 60000, '3 Würfe nach Zuruf');
    const d = await page.evaluate(() => {
      const calls = M.sim.demo.calls;
      return T.filter(x => x.s==='runup' && x.t > calls[0]).map(x => (x.t - Math.max(...calls.filter(c => c < x.t)))/1000);
    });
    assert.ok(d.length >= 3, `${d.length} Ansagen nach Zuruf`);
    d.forEach(x => assert.ok(x > 1.85 && x < 2.6, `Ziel ${x.toFixed(2)} s nach dem Ruf (soll 2 s)`));
  });

  await t.test('Zuruf ohne Spieler im Bild wird ignoriert', async () => {
    await until(page, () => M.app.state==='ready', null, 15000, 'bereit');
    await page.evaluate(() => { window.origDetect = M.sim.detector.detectForVideo; M.sim.detector.detectForVideo = () => null; });
    await sleep(2500);
    await page.evaluate(() => M.shout.shoutNow());
    assert.match(await page.textContent('#hint'), /niemand im Bild/);
    await sleep(3000);
    assert.notEqual(await page.evaluate(() => M.app.state), 'runup', 'ohne Spieler im Bild keine Ansage');
    await page.evaluate(() => { M.sim.detector.detectForVideo = origDetect; });
    await sleep(1000);
    await page.evaluate(() => M.shout.shoutNow());
    await until(page, () => M.app.state==='runup', null, 4000, 'Ansage nach Zuruf mit Spieler im Bild');
  });

  await t.test('Kamera bewegt: Linie wird neu ausgerichtet', async () => {
    await until(page, () => M.app.state==='ready' || M.app.state==='cool', null, 20000, 'Wurf fertig');
    await page.click('#btnStart');   // Stopp
    await page.click('#demoBar [data-d=move]');
    await sleep(1500);
    await page.click('#btnLine');
    await until(page, () => /neu ausgerichtet/.test(document.querySelector('#setup').textContent), null, 10000, 'Hinweis neu ausgerichtet');
    const e = stats(await px(page, await page.evaluate(() => M.store.settings.line.pts)));
    assert.ok(e.med < 4 && e.max < 12, `Linienfehler nach Bewegung: Median ${e.med.toFixed(1)} px, max ${e.max.toFixed(1)} px`);
  });

  assert.deepEqual(errors, [], 'Fehler in der Browser-Konsole');
  await page.close();
});

test('Mikrofon: Rufe erkannt, Lärm nicht (Fake-Mikrofon)', {timeout:120000}, async t => {
  const page = await browser.newPage();
  await page.goto(srv.url);
  await modules(page);

  await t.test('Stopp während des Starts: Mikrofon bleibt aus', async () => {
    const r = await page.evaluate(async () => { const p = M.shout.startMic(); M.shout.stopMic(); await p; return M.shout.mic.on; });
    assert.equal(r, false);
  });

  await t.test(`Tonspur ${DURATION} s: genau die ${SHOUTS.length} Rufe`, async () => {
    const r = await page.evaluate(async ms => {
      const hits = [], lv = [];
      M.shout.onShout(() => hits.push(performance.now()));
      await M.shout.startMic(); const t0 = performance.now();
      const iv = setInterval(() => lv.push([M.shout.mic.level, M.shout.mic.floor, M.shout.mic.thr]), 500);
      await new Promise(r => setTimeout(r, ms)); clearInterval(iv); M.shout.stopMic();
      return {hits:hits.map(h => (h - t0)/1000), lv, silent:M.shout.mic.silent};
    }, (DURATION - 0.5)*1000);
    const lv = r.lv.map(x => x.map(v => Math.round(v)).join('/'));
    assert.equal(r.hits.length, SHOUTS.length, `erkannt bei ${r.hits.map(h => h.toFixed(1))} s; Pegel/Grund/Schwelle: ${lv.join(' ')}`);
    r.hits.forEach((h, i) => assert.ok(h > SHOUTS[i] && h < SHOUTS[i] + 1.8, `Ruf ${i+1} bei ${h.toFixed(2)} s, erwartet kurz nach ${SHOUTS[i]} s`));
  });
  await page.close();
});
