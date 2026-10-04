// Browser-Tests mit Playwright (headless Chromium):
//  1. Demo-Modus von vorn bis hinten: Linie ablaufen, Würfe, Wurf-Videos, Zuruf-Modus, Wurf ohne Ansage,
//     Kamera bewegt, Mikro-Test in der Einrichtung. Dazu Kameraposition 2 (Feld, Tor im Bild): Linie, Würfe, Linie je Position.
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
    window.M = {store:await im('/aussenspieler/js/store.js'), app:(await im('/aussenspieler/js/state.js')).app, sim:await im('/aussenspieler/js/demo/sim.js'),
      clips:await im('/aussenspieler/js/clips.js'), shout:await im('/aussenspieler/js/shout.js')};
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
  await page.goto(srv.url + 'aussenspieler/?demo=1');
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
    const log = await page.evaluate(() => M.store.log.slice(0, 8).map(e => ({issues:e.issues, target:e.target, m:e.m})));
    // Die simulierte Person wirft im Wechsel: gut, gut, Übertritt, flach mit Arm unten.
    log.forEach((e, i) => {
      const k = i % 4, has = x => e.issues.includes(x);
      assert.ok(e.target, `Wurf ${i+1}: Ziel angesagt`);
      assert.equal(has('over'), k===2, `Wurf ${i+1}: Übertritt ${JSON.stringify(e.issues)}`);
      assert.equal(has('jump'), k===3, `Wurf ${i+1}: Sprung flach ${JSON.stringify(e.issues)}`);
      assert.equal(has('arm'), k===3, `Wurf ${i+1}: Arm ${JSON.stringify(e.issues)}`);
      assert.ok(!has('leg'), `Wurf ${i+1}: Sprungbein`);
      // Rohe Messwerte zum Kalibrieren passen zur Bewertung.
      assert.equal(e.m.line > 0, k===2, `Wurf ${i+1}: Messwert Linie ${e.m.line}`);
      assert.equal(e.m.jump < 0.17, k===3, `Wurf ${i+1}: Messwert Sprung ${e.m.jump}`);
      assert.equal(e.m.arm < 0, k===3, `Wurf ${i+1}: Messwert Arm ${e.m.arm}`);
      assert.ok(e.m.fps >= 20, `Wurf ${i+1}: ${e.m.fps} fps`);
    });
    await page.click('#btnLog');
    assert.ok(await page.locator('#logBody .meas').count() >= 8, 'Messwerte im Training-Fenster');
    await page.click('#logSheet [data-close]');
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
    // Person ruft nicht mehr von selbst; ein schon gehörter Ruf läuft vorher ab (Ansage, Wurf, Pause).
    await page.evaluate(() => M.sim._test.autoCall(false));
    await until(page, () => M.app.state==='ready', null, 15000, 'bereit');
    await sleep(2500);
    await until(page, () => M.app.state==='ready', null, 15000, 'bereit ohne offenen Zuruf');
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
    await page.evaluate(() => M.sim._test.autoCall(true));
  });

  await t.test('Wurf ohne Ansage: Aufnahme beginnt nicht mitten im Anlauf neu', async () => {
    await page.evaluate(() => { M.store.settings.callMin = M.store.settings.callMax = 60; });   // Zuruf ohne Ansage
    // Laufende Aufnahme fast 6 s alt (danach würde sie neu beginnen), dann ohne Ansage werfen.
    await until(page, () => M.app.state==='ready' && M.clips.recAge(performance.now()/1000) > 5.6, null, 40000, 'Aufnahme ~6 s alt');
    const r = await page.evaluate(async () => {
      const ages = [], n = M.store.log.length, iv = setInterval(() => ages.push(M.clips.recAge(performance.now()/1000)), 30);
      M.sim._test.shoot();
      await new Promise(res => { const c = setInterval(() => { if(M.store.log.length > n){ clearInterval(c); res(); } }, 50); setTimeout(res, 8000); });
      clearInterval(iv);
      const restarts = ages.filter((a, i) => i && a !== null && ages[i-1] !== null && a < ages[i-1] - 0.5).length;
      return {restarts, n, n1:M.store.log.length};
    });
    assert.equal(r.n1, r.n + 1, 'Wurf ohne Ansage erkannt');
    assert.equal(r.restarts, 0, 'Aufnahme wurde während des Anlaufs neu begonnen');
    await until(page, () => M.store.log.at(-1).clip, null, 3000, 'Clip gespeichert');
    assert.equal(await page.evaluate(() => M.store.log.at(-1).target), null);
    await page.evaluate(() => { M.store.settings.callMin = M.store.settings.callMax = 2; });
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

  await t.test('Mikro-Test in der Einrichtung', async () => {
    assert.ok(await page.isVisible('#setup .mictest'), 'Mikro-Test im Zuruf-Modus sichtbar');
    await page.click('#setup [data-a=micTest]');
    await until(page, () => M.shout.mic.on, null, 3000, 'Mikro an');
    assert.ok(await page.isVisible('#micChip'), 'Mikro-Anzeige oben im Bild');
    await page.evaluate(() => M.shout.shoutNow());
    assert.match(await page.textContent('#setup .mictest'), /Ruf erkannt \(1×\)/);
    await page.click('#setup [data-a=sens][data-v=low]');
    assert.equal(await page.evaluate(() => M.store.settings.sens), 'low');
    await page.click('#setup [data-a=micTest]');
    await until(page, () => !M.shout.mic.on, null, 3000, 'Mikro aus nach „Test beenden“');
  });

  assert.deepEqual(errors, [], 'Fehler in der Browser-Konsole');
  await page.close();
});

test('Demo Kameraposition 2 (Feld, Tor im Bild): Linie, Würfe, eigene Linie je Position', {timeout:200000}, async t => {
  const page = await browser.newPage({viewport:{width:1280, height:800}});
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if(m.type()==='error') errors.push(m.text()); });
  await page.addInitScript(() => { if(!sessionStorage.getItem('init')){ sessionStorage.setItem('init', '1'); localStorage.clear(); localStorage.setItem('awc-demo-settings', JSON.stringify({pause:1})); } });
  await page.goto(srv.url + 'aussenspieler/?demo=1');
  await modules(page);

  await t.test('Position 2 wählen, Linie ablaufen: am Boden erkannt, genau', async () => {
    await page.click('#btnStart');
    await page.click('#setup [data-a=camPos][data-v=court]');
    assert.equal(await page.evaluate(() => M.store.settings.camPos), 'court');
    assert.match(await page.textContent('#setup'), /Tor, Linie und Absprungzone/);
    await sleep(1000);   // Demo-Kamera auf Position 2
    await page.click('#setup [data-a=wizard]');
    await until(page, () => M.store.settings.line?.pts?.length >= 2, null, 90000, 'Linie gespeichert');
    const line = await page.evaluate(() => M.store.settings.line);
    assert.ok(line.snapped, 'Linie sollte am Boden eingerastet sein');
    const e = stats(await px(page, line.pts));
    assert.ok(e.med < 4 && e.max < 12, `Linienfehler Median ${e.med.toFixed(1)} px, max ${e.max.toFixed(1)} px`);
  });

  await t.test('4 Würfe, Bewertung wie simuliert', async () => {
    await page.click('#setup [data-a=start]');
    await until(page, () => M.store.log.length >= 4, null, 90000, '4 Würfe');
    const log = await page.evaluate(() => M.store.log.slice(0, 4).map(e => ({issues:e.issues, m:e.m})));
    log.forEach((e, i) => {
      const has = x => e.issues.includes(x);
      assert.equal(has('over'), i===2, `Wurf ${i+1}: Übertritt ${JSON.stringify(e.issues)} ${JSON.stringify(e.m)}`);
      assert.equal(has('jump'), i===3, `Wurf ${i+1}: Sprung flach ${JSON.stringify(e.issues)} ${JSON.stringify(e.m)}`);
      assert.equal(has('arm'), i===3, `Wurf ${i+1}: Arm ${JSON.stringify(e.issues)}`);
      assert.ok(!has('leg'), `Wurf ${i+1}: Sprungbein`);
      assert.equal(e.m.cam, 'court', `Wurf ${i+1}: Kameraposition im Messwert`);
    });
  });

  await t.test('Jede Position behält ihre Linie', async () => {
    await page.click('#btnStart');   // Stopp
    const p2 = await page.evaluate(() => M.store.settings.line.pts);
    await page.click('#btnLine');
    await page.click('#setup [data-a=camPos][data-v=base]');
    assert.equal(await page.evaluate(() => M.store.settings.line), null, 'Position 1 hat noch keine Linie');
    assert.match(await page.textContent('#setup'), /6-m-Linie fehlt/);
    await page.click('#setup [data-a=camPos][data-v=court]');
    assert.deepEqual(await page.evaluate(() => M.store.settings.line.pts), p2, 'Linie von Position 2 wieder da');
    await until(page, () => /Kamera steht wie bei der Einrichtung/.test(document.querySelector('#setup').textContent), null, 5000, 'Kamera-Check ok');
  });

  assert.deepEqual(errors, [], 'Fehler in der Browser-Konsole');
  await page.close();
});

// Neue Seite im Demo-Modus mit frischem Speicher; init = Start-Einstellungen. Ansagen landen in window.__said.
async function demoPage(init, viewport = {width:1280, height:800}){
  const page = await browser.newPage({viewport});
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if(m.type()==='error') errors.push(m.text()); });
  await page.addInitScript(init => { window.__said = []; if(!sessionStorage.getItem('init')){ sessionStorage.setItem('init', '1'); localStorage.clear(); localStorage.setItem('awc-demo-settings', JSON.stringify(init)); } }, init);
  await page.goto(srv.url + 'aussenspieler/?demo=1');
  await modules(page);
  await page.evaluate(async () => { M.tasks = await import('/aussenspieler/js/tasks.js'); });
  return {page, errors};
}
async function walkLine(page){
  await page.click('#setup [data-a=wizard]');
  await until(page, () => M.store.settings.line?.pts?.length >= 2, null, 90000, 'Linie gespeichert');
}
// Höhe der sichtbaren Buttons in einem Bereich (Tipp-Flächen am Handy).
const minHeight = (page, sel) => page.$$eval(sel, els => Math.min(...els.filter(e => e.offsetParent).map(e => e.getBoundingClientRect().height)));

test('Aufgabe „Absprung an der Linie“ (Handy-Größe): Zähler, Ansagen, Ende, Log, Bericht', {timeout:200000}, async t => {
  const {page, errors} = await demoPage({pause:1}, {width:390, height:800});
  await page.evaluate(() => { M.tasks.TASKS.line.reps = 4; M.tasks.TASKS.line.goal = 2; });

  await t.test('Aufgabe in der Einrichtung wählen', async () => {
    await page.click('#btnStart');
    await page.click('#setup [data-a=task][data-v=line]');
    assert.equal(await page.evaluate(() => M.store.settings.task), 'line');
    assert.match(await page.textContent('#setup'), /4 Würfe, geschafft bei 2/);
    assert.ok(await minHeight(page, '#setup .tasks button') >= 44, 'Aufgaben-Buttons groß genug');
    await walkLine(page);
    assert.match(await page.textContent('#setup [data-a=start]'), /Aufgabe starten/);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'kein Querscrollen');
  });

  await t.test('4 Würfe: nah, zu weit, Übertritt, nah', async () => {
    await page.click('#setup [data-a=start]');
    assert.match(await page.evaluate(() => __said.at(-1)), /^Aufgabe Absprung an der Linie/, 'Anleitung statt „Los geht’s“');
    assert.equal(await page.textContent('#taskBox b'), '1/4');
    await until(page, () => M.store.log.length >= 4, null, 90000, '4 Würfe');
    const log = await page.evaluate(() => M.store.log.map(e => ({ok:e.task?.ok, why:e.task?.why, line:e.m.line})));
    assert.deepEqual(log.map(e => e.ok), [true, false, false, true], JSON.stringify(log));
    assert.match(log[1].why, /zu weit weg/); assert.equal(log[2].why, 'Übertritt');
    const said = await page.evaluate(() => __said);
    assert.ok(said.some(x => /^Geschafft\. .*Noch 3\.$/.test(x)), said.join(' | '));
    assert.ok(said.some(x => /Näher ran\. Noch 2\./.test(x)), said.join(' | '));
    assert.ok(said.some(x => /Aufgabe geschafft: 2 von 4\./.test(x)), said.join(' | '));
  });

  await t.test('Ende: Karte mit Ergebnis, Training gestoppt, Verlauf gespeichert', async () => {
    await until(page, () => !document.querySelector('#taskEnd').hidden && M.app.state==='off', null, 5000, 'Ende-Karte, gestoppt');
    assert.match(await page.textContent('#taskEnd'), /2 von 4[\s\S]*Aufgabe geschafft/);
    assert.ok(await minHeight(page, '#taskEnd button') >= 48, 'Nochmal/Fertig groß genug');
    const h = await page.evaluate(() => M.store.settings.taskHist.line);
    assert.equal(h.length, 1); assert.deepEqual([h[0].hits, h[0].n, h[0].passed], [2, 4, true]);
    await page.click('#btnLog');
    assert.match(await page.textContent('#logBody'), /Aufgaben[\s\S]*Absprung an der Linie 2 von 4/);
    await page.click('#logSheet [data-close]');
    const rep = await page.evaluate(async () => { const r = await import('/aussenspieler/js/report.js'); return {text:r.reportText(), html:r.reportHTML()}; });
    assert.match(rep.text, /Aufgaben:\n- Absprung an der Linie: 2 von 4 \(Ziel 2\) geschafft/);
    assert.match(rep.html, /<h2>Aufgaben<\/h2>/); assert.match(rep.html, /✗ Übertritt/);
  });

  await t.test('Nochmal startet eine neue Serie', async () => {
    await page.click('#taskEnd [data-t=again]');
    await until(page, () => M.app.state!=='off' && M.app.task && !M.app.task.done, null, 5000, 'neue Serie');
    assert.equal(await page.textContent('#taskBox b'), '1/4');
    await page.click('#btnStart');   // Stopp mitten in der Serie: Zähler weg
    assert.equal(await page.isVisible('#taskBox'), false);
  });

  assert.deepEqual(errors, [], 'Fehler in der Browser-Konsole');
  await page.close();
});

test('Aufgabe „Entscheidung in der Luft“: „Los“, Ziel erst beim Absprung, Verzögerung gemessen', {timeout:200000}, async t => {
  const {page, errors} = await demoPage({pause:1, task:'air'});
  await page.evaluate(() => {
    M.tasks.TASKS.air.reps = 4; M.tasks.TASKS.air.goal = 2;
    // Zustand bei jeder Ansage mitschreiben: das Ziel muss im Sprung kommen.
    const push = __said.push.bind(__said); window.__sayState = [];
    __said.push = x => { __sayState.push({x, s:M.app.state}); return push(x); };
  });
  await page.click('#btnStart');
  await walkLine(page);
  assert.match(await page.textContent('#setup'), /Ziel kommt erst beim Absprung/);

  await t.test('4 Würfe: Ziel im Sprung angesagt, Bewertung sauber / Übertritt / Arm', async () => {
    await page.click('#setup [data-a=start]');
    await until(page, () => M.store.log.length >= 1, null, 40000, 'erster Wurf');
    await page.click('#card [data-h="0"]');   // erster Wurf: daneben getippt → zählt nicht
    await until(page, () => M.store.log.length >= 4, null, 90000, '4 Würfe');
    const log = await page.evaluate(() => M.store.log.map(e => ({target:e.target, ok:e.task?.ok, why:e.task?.why, det:e.m.callDet, hit:e.hit})));
    log.forEach((e, i) => { assert.ok(e.target, `Wurf ${i+1}: Ziel gesetzt`); assert.ok(e.det >= 0 && e.det < 250, `Wurf ${i+1}: Ansage ${e.det} ms nach dem Absprung`); });
    assert.deepEqual(log.slice(1).map(e => e.ok), [true, false, false], JSON.stringify(log));
    const ss = await page.evaluate(() => __sayState);
    const targets = ss.filter(x => log.some(e => e.target === x.x));
    assert.ok(targets.length >= 4 && targets.every(x => x.s === 'runup'), 'Ziel beim Absprung (Zustand wechselt direkt danach auf Sprung): ' + JSON.stringify(targets));
    assert.ok(ss.filter(x => x.x === 'Los').length >= 4, '„Los“ vor jedem Wurf');
    const iLos = ss.findIndex(x => x.x === 'Los'), iT = ss.findIndex(x => x.x === log[0].target);
    assert.ok(iLos >= 0 && iT > iLos, 'erst „Los“, dann das Ziel');
  });

  await t.test('Ende: nachträglich getipptes „Daneben“ zählt, Messwert im Log', async () => {
    await until(page, () => !document.querySelector('#taskEnd').hidden, null, 5000, 'Ende-Karte');
    assert.match(await page.textContent('#taskEnd'), /1 von 4/);
    await page.click('#taskEnd [data-t=end]');
    await page.click('#btnLog');
    assert.match(await page.textContent('#logBody'), /Ansage \d+ ms/);
    assert.deepEqual(await page.evaluate(() => [M.store.log[0].task.ok, M.store.log[0].task.why]), [false, 'Ziel verfehlt'], 'Log-Eintrag nachgezogen');
    await page.click('#logSheet [data-close]');
  });

  assert.deepEqual(errors, [], 'Fehler in der Browser-Konsole');
  await page.close();
});

test('7-m-Trainer (Demo, Handy-Größe): Linie antippen, Pfiff, Bewertung, Serie, Log, Bericht', {timeout:200000}, async t => {
  const page = await browser.newPage({viewport:{width:390, height:800}});
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if(m.type()==='error') errors.push(m.text()); });
  await page.addInitScript(() => { window.__said = []; if(!sessionStorage.getItem('init')){ sessionStorage.setItem('init', '1'); localStorage.clear(); localStorage.setItem('7m-demo-settings', JSON.stringify({pause:1})); } });
  await page.goto(srv.url + 'siebenmeter/?demo=1');
  await page.evaluate(async () => {
    window.M = {st:await import('/siebenmeter/js/state.js'), rules:await import('/siebenmeter/js/rules.js'), demo:await import('/siebenmeter/js/demo.js')};
    M.rules.SERIES.reps = 4; M.rules.SERIES.goal = 2;
    // Zustand und Zeit jeder Ansage mitschreiben (Pfiff vs. Ansage).
    const push = __said.push.bind(__said); window.__sayAt = [];
    __said.push = x => { __sayAt.push({x, s:M.st.app.state}); return push(x); };
  });

  await t.test('Einrichtung: 7-m-Linie antippen (2 Enden, 1 Punkt Richtung Tor)', async () => {
    await page.click('#btnStart');
    await page.waitForSelector('#setup [data-a=tap]');
    assert.ok(await page.isDisabled('#setup [data-a=start]'), 'ohne Linie kein Start');
    await page.click('#setup [data-a=tap]');
    await sleep(800);
    const tl = await page.evaluate(() => M.demo.truthLine()), box = await page.locator('#overlay').boundingBox();
    for(const p of [tl.a, tl.b, tl.goal]) await page.mouse.click(box.x + p.x*box.width, box.y + p.y*box.height);
    const l = await page.evaluate(() => M.st.settings.line);
    assert.ok(l && Math.hypot(l.a.x - tl.a.x, l.a.y - tl.a.y) < 0.01, JSON.stringify(l));
    assert.ok(await minHeight(page, '#setup button') >= 44, 'Buttons der Einrichtung groß genug');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'kein Querscrollen');
  });

  await t.test('Serie mit 4 Würfen: sauber, zu langsam, Linie, Standbein', async () => {
    await page.click('#setup [data-a=start]');
    await until(page, () => M.st.log.length >= 4, null, 120000, '4 Würfe');
    const log = await page.evaluate(() => M.st.log.map(e => ({ok:e.ok, issues:e.issues, m:e.m, target:e.target})));
    assert.deepEqual(log.map(e => e.issues), [[], ['slow'], ['line'], ['foot']], JSON.stringify(log));
    assert.ok(log[0].m.time > 1.0 && log[0].m.time < 1.4, `Zeit ${log[0].m.time} (simuliert 1,2 s)`);
    assert.ok(log[1].m.time > 3.2 && log[1].m.time < 3.6, `Zeit ${log[1].m.time} (simuliert 3,4 s)`);
    log.forEach((e, i) => assert.ok(e.target, `Wurf ${i+1}: Ziel angesagt`));
    const sa = await page.evaluate(() => __sayAt);
    assert.ok(sa.filter(x => log.some(e => e.target === x.x)).every(x => x.s === 'ready'), 'Ziel vor dem Pfiff');
    assert.ok(sa.some(x => /^Sauber\. 1,\d Sekunden\. Noch 3\.$/.test(x.x)), sa.map(x => x.x).join(' | '));
    assert.ok(sa.some(x => /^Zu langsam\. 3,\d Sekunden\./.test(x.x)));
    assert.ok(sa.some(x => x.x === 'Standbein bewegt. 1 von 4. Ziel war 2.'), sa.map(x => x.x).join(' | '));
  });

  await t.test('Ende der Serie, Log und Bericht', async () => {
    await until(page, () => !document.querySelector('#endCard').hidden && M.st.app.state==='off', null, 5000, 'Ende-Karte');
    assert.match(await page.textContent('#endCard'), /1 von 4/);
    assert.ok(await minHeight(page, '#endCard button') >= 48);
    await page.click('#endCard [data-e=end]');
    await page.click('#btnLog');
    assert.match(await page.textContent('#logBody'), /1 von 4[\s\S]*regelgerecht[\s\S]*Serien/);
    await page.click('#logSheet [data-close]');
    const rep = await page.evaluate(async () => (await import('/siebenmeter/js/main.js')).reportText());
    assert.match(rep, /1 von 4 regelgerecht/); assert.match(rep, /Linie übertreten: 1, Standbein bewegt: 1/);
  });

  assert.deepEqual(errors, [], 'Fehler in der Browser-Konsole');
  await page.close();
});

test('Mikrofon: Rufe erkannt, Lärm nicht (Fake-Mikrofon)', {timeout:120000}, async t => {
  const page = await browser.newPage();
  await page.goto(srv.url + 'aussenspieler/');
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

test('Startmenü: Karten öffnen Außenwurf-Coach und 7-m-Trainer, „Alle Trainings“ führt zurück', {timeout:60000}, async () => {
  const page = await browser.newPage({viewport:{width:390, height:800}});
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(srv.url);
  await page.click('#trainings a[href="aussenspieler/"]');
  await page.waitForSelector('#btnStart');
  assert.ok(page.url().endsWith('/aussenspieler/'), page.url());
  await page.click('a[href="../"]');
  await page.waitForSelector('#trainings');
  assert.equal(new URL(page.url()).pathname, '/');
  await page.click('#trainings a[href="siebenmeter/"]');
  await page.waitForSelector('#btnStart');
  assert.ok(page.url().endsWith('/siebenmeter/'), page.url());
  await page.click('a[href="../"]');
  await page.waitForSelector('#trainings');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'kein Querscrollen am Handy');
  assert.deepEqual(errors, []);
  await page.close();
});
