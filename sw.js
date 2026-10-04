// Service Worker für Handballcoach: Offline-Betrieb in der Halle
const CACHE_NAME = "handballcoach-v3";

const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./shared/icon.svg",
  "./shared/css/base.css",
  "./shared/css/trainer.css",
  "./shared/js/stage.js",
  "./shared/js/speech.js",
  "./shared/js/wakelock.js",
  "./shared/js/utils.js",
  "./shared/js/errorlog.js",
  "./shared/js/mic.js",
  "./shared/js/bounceDetect.js",
  "./shared/js/hitDetect.js",
  "./shared/js/pose.js",
  "./shared/js/demo/scene.js",
  "./aussenspieler/index.html",
  "./aussenspieler/css/stage.css",
  "./aussenspieler/css/controls.css",
  "./aussenspieler/css/sheets.css",
  "./aussenspieler/js/main.js",
  "./aussenspieler/js/config.js",
  "./aussenspieler/js/state.js",
  "./aussenspieler/js/store.js",
  "./aussenspieler/js/dom.js",
  "./aussenspieler/js/model.js",
  "./aussenspieler/js/source.js",
  "./aussenspieler/js/line.js",
  "./aussenspieler/js/lineWizard.js",
  "./aussenspieler/js/lineDetect.js",
  "./aussenspieler/js/camCheck.js",
  "./aussenspieler/js/shout.js",
  "./aussenspieler/js/shoutDetect.js",
  "./aussenspieler/js/micControl.js",
  "./aussenspieler/js/clips.js",
  "./aussenspieler/js/demo/sim.js",
  "./aussenspieler/js/tracking.js",
  "./aussenspieler/js/analysis.js",
  "./aussenspieler/js/rings.js",
  "./aussenspieler/js/steps.js",
  "./aussenspieler/js/tasks.js",
  "./aussenspieler/js/taskRun.js",
  "./aussenspieler/js/feedback.js",
  "./aussenspieler/js/draw.js",
  "./aussenspieler/js/summary.js",
  "./aussenspieler/js/report.js",
  "./aussenspieler/js/ui/setupView.js",
  "./aussenspieler/js/ui/controls.js",
  "./aussenspieler/js/ui/settingsView.js",
  "./aussenspieler/js/ui/card.js",
  "./aussenspieler/js/ui/logView.js",
  "./aussenspieler/js/ui/sheets.js",
  "./aussenspieler/js/ui/clipView.js",
  "./aussenspieler/js/ui/micMeter.js",
  "./siebenmeter/index.html",
  "./siebenmeter/js/rules.js",
  "./siebenmeter/js/state.js",
  "./siebenmeter/js/main.js",
  "./siebenmeter/js/demo.js",
  "./abwehr/index.html",
  "./abwehr/js/rules.js",
  "./abwehr/js/state.js",
  "./abwehr/js/main.js",
  "./abwehr/js/demo.js",
  "./passen/index.html",
  "./passen/js/rules.js",
  "./passen/js/state.js",
  "./passen/js/main.js",
  "./passen/js/demo.js",
  "./sprung/index.html",
  "./sprung/js/rules.js",
  "./sprung/js/state.js",
  "./sprung/js/main.js",
  "./sprung/js/demo.js"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE_URLS).catch(err => {
        console.warn("Einige Dateien konnten nicht vorab gecached werden:", err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if(req.method !== "GET") return;

  const url = new URL(req.url);

  // Gleiche Origin: Stale-While-Revalidate (sofort aus Cache, Update im Hintergrund)
  if(url.origin === self.location.origin){
    event.respondWith(
      caches.open(CACHE_NAME).then(async cache => {
        const cached = await cache.match(req);
        const fetchPromise = fetch(req).then(networkResponse => {
          if(networkResponse && networkResponse.status === 200){
            cache.put(req, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => null);

        return cached || fetchPromise;
      })
    );
    return;
  }

  // Externe Ressourcen (CDNs, Google Fonts): Network-first mit Cache-Fallback
  event.respondWith(
    fetch(req).then(res => {
      if(res && res.status === 200){
        const resClone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, resClone));
      }
      return res;
    }).catch(async () => {
      const match = await caches.match(req);
      if(match) return match;
      throw new Error("Offline und nicht im Cache: " + req.url);
    })
  );
});
