// Browser-Tests der Anleitungsvideos (shared/js/guide/, ohne Demo-Modus): Bedienung (Varianten, Ansichten, Tempo)
// und vor allem die Lehrbild-Merkmale als gemessene Gelenkwinkel der Figur (guideState()), z. B. Knie 90° beim Ausholen.
// Dazu: im Demo-Modus gibt es keine Anleitungsvideos.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { serve } from './server.mjs';

let srv, browser;
before(async () => { srv = await serve(); browser = await chromium.launch({args:['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']}); });
after(async () => { await browser?.close(); srv?.close(); });

async function open(path, mod, init = null){
  const page = await browser.newPage({viewport:{width:390, height:800}});
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if(m.type()==='error' && !/fonts\.g|net::ERR/.test(m.text())) errors.push(m.text()); });
  if(init) await page.addInitScript(init);
  await page.goto(srv.url + path);
  await page.evaluate(async mod => { window.G = await import(mod); window.F = await import('/shared/js/guide/figure.js'); }, mod);
  return {page, errors};
}
// Gelenkwinkel und Fußpunkte zur Zeit t (Wiedergabe angehalten).
const at = (page, t) => page.evaluate(t => {
  G.guideSeek(t); const s = G.guideState(), j = s.j, A = n => F.jointAngle(j, n);
  return {phase:s.phase, lKnee:A('lKnee'), rKnee:A('rKnee'), lElbow:A('lElbow'), rElbow:A('rElbow'), lShoulder:A('lShoulder'), rShoulder:A('rShoulder'),
    lAnk:j.lAnk, rAnk:j.rAnk, lToe:j.lToe, rToe:j.rToe, lHeel:j.lHeel, rHeel:j.rHeel, pelvis:j.pelvis, lHip:j.lHip, rHip:j.rHip, rHand:j.rHand, rSh:j.rSh, head:j.head};
}, t);
const near = (v, want, tol, what) => assert.ok(Math.abs(v - want) <= tol, `${what}: ${v.toFixed(1)}° (soll ${want}° ±${tol})`);

test('Sprungkraft: Ausholen mit Knie ~90°, Einbein mit Kniehub 90° und Becken waagerecht, Bedienung', {timeout:60000}, async () => {
  const {page, errors} = await open('sprung/', '/sprung/js/guide.js');
  await page.click('#emptyGuideBtn');
  assert.equal(await page.isVisible('#guideSheet'), true);
  assert.match(await page.textContent('#guideTitle'), /Sprungkraft: Korrekte Ausführung/);
  assert.equal(await page.$$eval('#guideCues li', els => els.length), 5);
  assert.deepEqual(await page.$$eval('#guideSheet [data-view]', b => b.map(x => x.textContent)), ['Seite', 'Vorne']);
  assert.ok(await page.$$eval('#guideSheet button', bs => bs.filter(b => b.offsetParent).every(b => b.getBoundingClientRect().height >= 44)), 'Tippflächen ≥ 44 px');
  let s = await at(page, 1.3);
  assert.match(s.phase, /Ausholen/); near(s.lKnee, 90, 3, 'Knie beim Ausholen'); near(s.rKnee, 90, 3, 'rechtes Knie');
  s = await at(page, 2.2);
  assert.match(s.phase, /Höchster Punkt/); near(s.lKnee, 180, 3, 'Knie im höchsten Punkt'); assert.ok(Math.min(s.lToe[2], s.rToe[2]) > 0.3, 'in der Luft');
  s = await at(page, 3.0); near(s.lKnee, 120, 5, 'Knie bei der Landung');

  await page.click('#guideVariantSwitch [data-variant=single]');
  assert.match(await page.textContent('#guideSub'), /Einbein/);
  s = await at(page, 1.95);
  near(s.rKnee, 90, 5, 'Kniehub'); assert.ok(Math.abs(s.rKnee - 90) < 6 && s.lKnee > 170, `Standbein gestreckt ${s.lKnee}`);
  assert.ok(Math.abs(s.lHip[2] - s.rHip[2]) < 0.01, 'Becken waagerecht');
  // Standbein (links) bleibt am Ort, solange es den Boden berührt.
  const a = await at(page, 0.2), b = await at(page, 1.4);
  assert.ok(Math.hypot(a.lAnk[0] - b.lAnk[0], a.lAnk[1] - b.lAnk[1]) < 0.01, 'Standfuß rutscht nicht');
  await page.click('#guideSheet [data-view=front]');
  await page.click('#guideSheet [data-speed="0.25"]');
  await page.click('#guideSheet [data-close]');
  assert.equal(await page.isVisible('#guideSheet'), false);
  assert.deepEqual(errors, []);
  await page.close();
});

test('7-m-Wurf: Standfuß bleibt bis zum Abwurf hinter der Linie, Wurfauslage 90/90, Finte, Linkshand gespiegelt', {timeout:60000}, async () => {
  const {page, errors} = await open('siebenmeter/', '/siebenmeter/js/guide.js');
  await page.click('#emptyGuideBtn');
  assert.match(await page.textContent('#guideTitle'), /7-m-Wurf/);
  assert.equal(await page.$$eval('#guideCues li', els => els.length), 5);
  const s0 = await at(page, 0.2), s = await at(page, 1.6), r = await at(page, 2.05);
  assert.match(s.phase, /Wurfauslage/); near(s.rShoulder, 90, 15, 'Oberarm–Rumpf'); near(s.rElbow, 90, 15, 'Ellbogen');
  for(const x of [s0, s, r]){
    assert.ok(Math.hypot(x.lAnk[0] - s0.lAnk[0], x.lAnk[1] - s0.lAnk[1]) < 0.01 && x.lHeel[2] < 0.01, 'Standfuß fest am Boden');
    assert.ok(x.lToe[1] > 7.0, `Fußspitze hinter der 7-m-Linie (y ${x.lToe[1].toFixed(3)})`);
  }
  await page.click('#guideVariantSwitch [data-variant=delay]');
  assert.match(await page.textContent('#guideSub'), /Wurffinte/);
  assert.match((await at(page, 2.1)).phase, /Wurffinte/);
  await page.click('#guideSheet [data-close]');
  // Linkshänder: rechter Fuß ist Standfuß, linker Arm wirft.
  await page.evaluate(async () => { (await import('/siebenmeter/js/state.js')).settings.hand = 'L'; G.openGuide('clean'); });
  const L = await at(page, 1.6);
  near(L.lElbow, 90, 15, 'Ellbogen links'); assert.ok(L.rAnk[1] < L.lAnk[1], 'rechter Fuß vorn');
  assert.deepEqual(errors, []);
  await page.close();
});

test('Abwehr: seitlich zur Wurfhand, Knie ~128°, Side-Steps ohne Kreuzen, gegen Linkshänder gespiegelt', {timeout:60000}, async () => {
  const {page, errors} = await open('abwehr/', '/abwehr/js/guide.js');
  await page.click('#emptyGuideBtn');
  assert.match(await page.textContent('#guideSub'), /gegen Rechtshänder/);
  const s = await at(page, 0.3);
  near(s.lKnee, 128, 10, 'Knie Grundstellung'); assert.ok(s.lAnk[1] > s.rAnk[1] + 0.1, 'linker Fuß vorn gegen Rechtshänder');
  assert.ok(Math.abs(s.lAnk[0] - s.rAnk[0]) > 0.7, 'mehr als schulterbreit');
  // Während der ganzen Runde: linker Fuß bleibt links vom rechten (Blick +y: links = −x), Becken bleibt tief.
  for(let t = 0; t < 3.6; t += 0.05){
    const x = await at(page, t);
    assert.ok(x.lAnk[0] < x.rAnk[0] - 0.3, `Füße gekreuzt bei ${t.toFixed(2)} s`);
    assert.ok(x.pelvis[2] < 0.86, `aufgerichtet bei ${t.toFixed(2)} s`);
  }
  await page.click('#guideVariantSwitch [data-variant=out]');
  assert.match(await page.textContent('#guideSub'), /Heraustreten/);
  const o = await at(page, 1.6);
  assert.ok(o.pelvis[1] > 7.4, 'nach vorn herausgetreten');
  await page.click('#guideSheet [data-close]');
  await page.evaluate(async () => { (await import('/abwehr/js/state.js')).settings.opp = 'L'; G.openGuide('base'); });
  assert.match(await page.textContent('#guideSub'), /gegen Linkshänder/);
  const m = await at(page, 0.3);
  assert.ok(m.rAnk[1] > m.lAnk[1] + 0.1, 'rechter Fuß vorn gegen Linkshänder');
  assert.deepEqual(errors, []);
  await page.close();
});

test('Pässe: Gegenbein vorn, Wurfauslage 90/90, Fangen mit beiden Händen', {timeout:60000}, async () => {
  const {page, errors} = await open('passen/', '/passen/js/guide.js');
  await page.click('#emptyGuideBtn');
  assert.match(await page.textContent('#guideTitle'), /Pässe gegen die Wand/);
  const s = await at(page, 0.3);
  near(s.rShoulder, 90, 15, 'Oberarm–Rumpf'); near(s.rElbow, 90, 15, 'Ellbogen');
  assert.ok(s.lAnk[0] < s.rAnk[0] - 0.3, 'linkes Bein vorn (Blick zur Wand, −x)');
  const c = await at(page, 1.6);
  assert.match(c.phase, /Fangen/);
  await page.click('#guideVariantSwitch [data-variant=speed]');
  await page.click('#guideSheet [data-close]');
  assert.deepEqual(errors, []);
  await page.close();
});

test('Außenwurf und Rückraum: Drei-Schritt-Anlauf, Absprung links, Kniehub ~90°, Ellbogen ~90°, Aufgaben-Lehrbilder', {timeout:90000}, async () => {
  const {page, errors} = await open('aussenspieler/', '/aussenspieler/js/ui/guideView.js');
  // Über die Einrichtung (Kamera ist hier ein Testbild).
  await page.click('#btnStart');
  await page.waitForSelector('#setup [data-a=guide]');
  await page.click('#setup [data-a=guide]');
  assert.match(await page.textContent('#guideTitle'), /Außen-Sprungwurf/);
  assert.equal(await page.$$eval('#guideCues li', els => els.length), 5);
  assert.deepEqual(await page.$$eval('#guideSheet [data-view]', b => b.map(x => x.textContent)), ['Seite', 'Kamera 1', 'Kamera 2']);
  assert.equal(await page.evaluate(() => document.querySelector('#guideCam').hidden), true, 'alte Kamera-Taste ersetzt');
  // Kontakte des linken Fußes: zuletzt beim Absprung (Stemmschritt), danach in der Luft.
  let s = await at(page, 0.5); assert.match(s.phase, /Anlauf/);
  s = await at(page, 1.2); assert.match(s.phase, /Absprung: Stemmschritt links/); assert.ok(s.lToe[2] < 0.02, 'links am Boden');
  s = await at(page, 1.55);
  near(s.rKnee, 90, 20, 'Kniehub'); near(s.rElbow, 90, 20, 'Ellbogen'); assert.ok(Math.min(s.lToe[2], s.rToe[2]) > 0.2, 'in der Luft');
  assert.ok(s.rHip[2] > 1.3, 'hoch gesprungen');
  await page.click('#guideSheet [data-close]');
  await page.evaluate(() => G.openGuide('height'));
  assert.match(await page.textContent('#guideTitle'), /Wurfhöhe auf Ansage/);
  await page.click('#guideHeightSwitch [data-variant=hip]');
  const h = await at(page, 1.55);
  assert.match(h.phase, /Hüfte/); assert.ok(h.rHand[2] < h.rSh[2], 'Wurfhand unter Schulterhöhe');
  for(const [task, re] of [['angle', /Winkel vergrößern/], ['pivot', /Kreisläufer/], ['fastbreak', /Gegenstoß/], ['line', /Absprung an der Linie/]]){
    await page.evaluate(t => G.openGuide(t), task);
    assert.match(await page.textContent('#guideTitle'), re);
    await at(page, 1.0); await at(page, 2.0);
  }
  await page.evaluate(() => G.closeGuide());
  assert.deepEqual(errors, []);
  await page.close();

  const p2 = await open('aussenspieler/?rr=1', '/aussenspieler/js/ui/guideView.js');
  await p2.page.evaluate(() => G.openGuide('free'));
  assert.match(await p2.page.textContent('#guideTitle'), /Rückraum-Sprungwurf/);
  const r = await at(p2.page, 1.55);
  near(r.rKnee, 90, 20, 'Kniehub Rückraum');
  assert.deepEqual(p2.errors, []);
  await p2.page.close();
});

test('Im Demo-Modus gibt es keine Anleitungsvideos', {timeout:60000}, async () => {
  for(const path of ['sprung/?demo=1', 'siebenmeter/?demo=1', 'abwehr/?demo=1', 'passen/?demo=1']){
    const page = await browser.newPage({viewport:{width:390, height:800}});
    await page.goto(srv.url + path);
    await page.waitForSelector('#emptyGuideBtn', {state:'attached'});
    assert.equal(await page.isVisible('#emptyGuideBtn'), false, path);
    await page.evaluate(() => document.querySelector('#emptyGuideBtn').click());
    assert.equal(await page.isVisible('#guideSheet'), false, path);
    await page.close();
  }
});

test('Kein Fuß unter dem Hallenboden, in keinem Lehrbild und keiner Variante', {timeout:120000}, async () => {
  const list = [['sprung/', '/sprung/js/guide.js', ['both', 'single']], ['siebenmeter/', '/siebenmeter/js/guide.js', ['clean', 'delay']],
    ['abwehr/', '/abwehr/js/guide.js', ['base', 'out']], ['passen/', '/passen/js/guide.js', ['std', 'speed']],
    ['aussenspieler/', '/aussenspieler/js/ui/guideView.js', ['free', 'line', 'angle', 'height', 'fastbreak', 'pivot', 'tired', 'air']]];
  for(const [path, mod, vars] of list){
    const {page, errors} = await open(path, mod);
    for(const v of vars){
      const low = await page.evaluate(v => {
        G.openGuide(v); let m = {z:9};
        for(let t = 0; t < 4.5; t += 0.02){ G.guideSeek(t); const j = G.guideState().j; for(const k of ['lHeel', 'lToe', 'rHeel', 'rToe']) if(j[k][2] < m.z) m = {z:j[k][2], k, t}; }
        G.closeGuide(); return m;
      }, v);
      assert.ok(low.z > -0.03, `${path} ${v}: ${low.k} ${(low.z*100).toFixed(1)} cm unter dem Boden bei ${low.t.toFixed(2)} s`);
    }
    assert.deepEqual(errors, []);
    await page.close();
  }
});
