# brain.md – Handballcoach (Außenwurf-Coach)

Projektgedächtnis für Menschen und KI-Assistenten. Vor Änderungen lesen, nach größeren Änderungen aktualisieren.

## Ziel
Handy-Web-App für das Außenwurf-Training (Links-/Rechtsaußen) ohne Torwart:
- Zielansage per Sprache während des Anlaufs (Gummiringe: 2× orange 16 cm, 2× blau 10 cm; z. B. „Orange kurz“, „Blau lang“).
- KI prüft per Kamera die Technik und gibt nach jedem Wurf Feedback: ein Lob + ein Verbesserungstipp.
- Auswertung pro Training mit Abschlussbericht zum Teilen/Herunterladen.
- Videoclips (z. B. Bundesliga) mit denselben Prüfungen analysieren.
- Null Kosten: alles läuft im Browser, kein Server, keine Uploads.

## Ort, Repo, Hosting
- Lokal: `/home/gordon/Projekte/handballcoach`
- Repo: https://github.com/gordon81/handballcoach (Branch `main`)
- Live: https://gordon81.github.io/handballcoach/ (GitHub Pages, Deploy from branch `main` / root)
- Kamera und ES-Module funktionieren nur über https oder localhost, nicht per `file://`. Lokal testen: `python3 -m http.server` im Projektordner, dann http://localhost:8000.

## Dateien
- `index.html` – nur das HTML-Gerüst; bindet die CSS-Dateien und `js/main.js` ein.
- `css/` – `base.css` (Farben, Schriften, Grundstil), `stage.css` (Kamerabild, HUD, Zielansage, Hinweis, Ergebnis-Karte), `controls.css` (Video- und Button-Leiste), `sheets.css` (Einstellungen, Training).
- `js/` – ES-Module, ohne Build direkt vom Browser geladen:
  - `main.js` – Einstieg: verbindet die Bedienung, Hauptschleife (ein KI-Durchlauf pro Videobild).
  - `config.js` – feste Werte: MediaPipe-URLs, Modelle, Körperpunkt-Indizes, Skelett, Standard-Einstellungen.
  - `state.js` – gemeinsamer Laufzeit-Zustand `app` (Zustand, Quelle, Ziel, letzter Frame, Linien-Markierung). Als Objekt, weil importierte Variablen nicht neu zugewiesen werden können.
  - `store.js` – `settings` und `log` im localStorage, Trainings-Sitzungen.
  - `utils.js`, `dom.js` – Helfer, Seitenelemente, Hinweis-Einblendung.
  - `speech.js`, `wakelock.js`, `model.js`, `source.js` – Sprache, Bildschirm wach, KI-Modell laden, Kamera/Video + Layout.
  - `line.js` – 6-m-Linie: Antippen (mit „Zurück“), Kurve, `inTorraum()`, `saveLine()`.
  - `lineWizard.js` – Linie ablaufen: Person geht auf Sprachansage die Linie entlang, Fußpunkte geben die grobe Lage, dann Einrasten auf den Strich am Boden.
  - `lineDetect.js` – Bodenlinie im Kamerabild finden (`snapLine`), Bild ohne Person (`medianFrame`), Punkte glätten/reduzieren (`simplify`).
  - `camCheck.js` – Referenzbild bei der Einrichtung, Kamera-Check beim Öffnen der Einrichtung und beim Start, automatisches Nachjustieren.
  - `shout.js` + `shoutDetect.js` + `micControl.js` – Zuruf per Mikrofon erkennen (Pegel im Stimmbereich, Dauer, Klang; `shoutDetect.js` ist die reine Logik ohne Browser), Mikro nur im Modus „Zuruf“ während des Trainings an.
  - `clips.js` – Wurf-Videos aufnehmen (MediaRecorder) und in IndexedDB speichern. `ui/clipView.js` – Video ansehen (Zeitlupe, Speichern/Teilen). `ui/micMeter.js` – Mikrofon-Pegel anzeigen.
  - `demo/sim.js` – Demo-Modus: gezeichnete Halle, simulierte Person, Ersatz für Kamera und KI.
  - `tracking.js` – Zustandsautomat, Absprung-/Landungserkennung, speichert den Wurf.
  - `analysis.js` – `evaluate()`: die sechs Prüfungen und der Sprachtext.
  - `feedback.js` – Labels, `PRIO`, `tips()`.
  - `draw.js` – Overlay (Linie, Skelett). `summary.js` + `report.js` – Auswertung und Bericht.
  - `ui/` – `setupView.js` (Einrichtung vor dem Training, Start/Stopp), `controls.js` (Buttons, Video-Leiste, Training-Fenster), `settingsView.js`, `card.js` (Ergebnis-Karte), `logView.js`, `sheets.js`.
- `tests/` – automatische Tests (siehe „Tests“), nicht Teil der App.
- `README.md` – Kurzbeschreibung für GitHub.
- `brain.md` – diese Datei.

## Technik
- Pose-Erkennung: `@mediapipe/tasks-vision@0.10.14` (PoseLandmarker, runningMode `VIDEO`, 1 Person), erst bei Bedarf per `import()` von cdn.jsdelivr.net geladen (Demo braucht es nicht).
- Modelle von storage.googleapis.com: `lite` (~5,8 MB, Standard) oder `full` (~9,4 MB). GPU-Delegate mit CPU-Fallback.
- 2D-Landmarks (Pixel) für Füße, Hüfte, Arm, Linie; `worldLandmarks` (3D, Meter) nur für die Körperdrehung.
- Sprache: Web Speech API (`speechSynthesis`, de-DE). Muss einmal per Nutzer-Geste freigeschaltet werden (Start-Button sagt „Los geht's“).
- Screen Wake Lock hält den Bildschirm an.
- Schrift: Barlow / Barlow Condensed (Google Fonts) mit System-Fallback.
- Kein Build-Schritt, keine Abhängigkeiten im Repo.

## Einrichtung (vor dem Training)
- **Start** lädt KI und Kamera und öffnet die Einrichtung; erst danach „Training starten“ (im Kamera-Modus nur mit gesetzter 6-m-Linie). Der Button „Setup“ öffnet die Einrichtung jederzeit. Video-Modus: Analyse startet direkt, Linie optional.
- **Linie antippen**: Punkte entlang des Bogens, „↶ Zurück“ nimmt den letzten Punkt (bzw. den Torraum-Schritt) zurück, „Fertig“, dann 1 Punkt im Torraum. Die Leiste steht dabei oben, „⇅“ schiebt sie nach unten.
- **Linie ablaufen** (`lineWizard.js`): Ansage „ans äußere Ende stellen“ → steht die Person 1,5 s still, „los, langsam auf der Linie gehen“ → gesammelt wird der Bodenpunkt des aufstehenden Fußes (Mitte Ferse/Spitze) → nach ≥ 0,8 Körperlängen Weg und ~1 s Stillstand (oder „Fertig“, max. 30 s) werden die Punkte geglättet (gleitender Median) und auf 3–7 Punkte in gleichen Abständen reduziert → „zwei Schritte in den Torraum und stehen bleiben“ → Stillstand mit genug Abstand zur Linie = Torraum-Punkt. Klappt das nicht (20 s), Torraum-Punkt antippen.
- **Strich am Boden erkennen** (`lineDetect.js`): Während des Ablaufens werden alle ~1,2 s Bilder gesammelt, der pixelweise Median entfernt die Person. Quer zur Fußpunkt-Kurve wird in ±0,3 Körperlängen nach einem Streifen gesucht, der sich zu beiden Seiten vom Boden abhebt (Farbabstand, Breiten 1–6 px bei 640 px Bildbreite). Die Stärke ist gedeckelt, ein glatter Pfad (dynamische Programmierung) mit Strafe für Sprünge und für Abstand zu den Fußpunkten wählt den Strich: von mehreren Linien gewinnt die nächstgelegene (Basketball-, Volleyball-Linien). Sicher (≥ 50 % der Stellen klar) → Linie eingerastet („am Boden erkannt“), sonst bleiben die Fußpunkte. Angetippte Punkte werden ebenso eingerastet (Band ±3 % Bildhöhe).
- **Gespeicherte Linie**: `line.at` (Datum), `line.snapped`, `line.ref` (Referenzbild 160 px Graustufen, base64). Beim Start mit vorhandener Linie: Hinweis „Linie von der letzten Einrichtung gefunden“, Button „Mit dieser Linie starten“, „Korrigieren“ = Antippen mit den alten Punkten.
- **Kamera bewegt** (`camCheck.js`): beim Öffnen der Einrichtung und bei „Training starten“ wird das aktuelle Bild mit der Referenz verglichen (weichgezeichnete Kanten). Unterschied < 0,4 × mittlere Kantenstärke = unverändert. Sonst: beste Verschiebung suchen, Linie mitschieben und neu einrasten (Band ±6 %) → „neu ausgerichtet, bitte prüfen“ (Start erst beim zweiten Tippen). Klappt das nicht → „bitte neu einrichten“ (zweites Tippen auf Start startet trotzdem, z. B. wenn nur das Licht anders ist).
- Noch nicht in der Halle getestet; geprüft im Demo-Modus (siehe unten).

## Demo-Modus (am Schreibtisch testen)
- `?demo=1` an die Adresse hängen (oder auf der Startseite „Demo ohne Kamera“). Eigener Speicher (`awc-demo-settings`, `awc-demo-log`), das echte Training bleibt unberührt.
- `demo/sim.js` zeichnet eine Halle in Perspektive (Holzboden, gebogene 6-m-Linie, gestrichelte 9-m-Linie, Tor, dazu Basketball-, Volleyball-, Badminton- und grüne Linien als Störer) und eine Person. Das Bild geht per `canvas.captureStream()` ins `<video>`, die Körperpunkte kommen im MediaPipe-Format (`landmarks` + `worldLandmarks`) statt aus der KI. Einrichtung, Linienerkennung, Kamera-Check und Analyse laufen unverändert.
- Im Modus „Zuruf“ ruft die Person am Startpunkt (Hinweis „Demo: Spieler ruft“), Button „Zuruf“ in der Demo-Leiste ruft von Hand.
- Die Person reagiert auf die Ansagen: ans Ende der Linie, Linie entlanggehen, zwei Schritte in den Torraum; im Training bei Ansage Anlauf und Sprungwurf. Würfe im Wechsel: gut, gut, Übertritt, flach mit Arm unten.
- „Kamera bewegen“ verschiebt/schwenkt die Kamera (3 Stellungen) → Einrichtung/Start merkt es und richtet die Linie neu aus.
- Automatische Tests laufen über den Demo-Modus, siehe „Tests“.

## Tests (`tests/`)
- Einmalig: `cd tests && npm install` (Playwright), Browser bei Bedarf `npx playwright install chromium`. Dann `npm test` (~2 min) oder nur `npm run unit` (Sekunden, ohne Browser).
- `unit.mjs` (Node): Ruf-Erkennung mit künstlichen Pegelverläufen: Ruf, Ballaufpralle, Quietschen, Pfiff, Dauerlärm + Ruf darüber, Sperre, eigene Ansage, Empfindlichkeit.
- `browser.mjs` (Playwright, headless Chromium, eigener kleiner Webserver `server.mjs`):
  - Demo von vorn bis hinten (Pause 1 s): Linie ablaufen (eingerastet, Median < 4 px, max < 12 px), 8 Würfe genau wie simuliert bewertet (gut, gut, Übertritt, flach + Arm unten), Videos gespeichert und abspielbar (MP4), „Videos aus“ → keine Clips, Zuruf-Modus (Ziel 2 s nach dem Ruf), Zuruf ohne Spieler im Bild ignoriert, „Kamera bewegen“ → Linie neu ausgerichtet, Mikro-Test in der Einrichtung (an, Ruf gezählt, Empfindlichkeit, aus); keine Fehler in der Konsole.
  - Mikrofon über das Fake-Mikrofon von Chromium mit der künstlichen Hallen-Tonspur aus `wav.mjs`: genau die 3 Rufe; Stopp während des Starts → Mikro bleibt aus.
- Nach jeder Änderung an Erkennung, Ablauf oder Zuruf `npm test` laufen lassen.

## Ablauf (Zustandsautomat)
`off` → `ready` → `runup` → `air` → `cool` → `ready` …
- **ready**: Kamera-Modus „auto“ sagt ein Ziel an, sobald der Spieler ≥ 0,6 s sichtbar ist und steht (Hüfte in den letzten 0,6 s < 0,15 Körperlängen bewegt; vorher kam die Ansage schon beim Zurückgehen, der Anlauf begann aus dem Gehen, und Übertritt/Sprunghöhe wurden falsch erkannt – im Demo mit 1 s Pause gefunden); Modus „timer“ nach 1,5 s; Modus „call“ (Nach Zuruf): Spieler ruft laut, Piep als Quittung, Ziel nach fest 1/2/3/4/5 s oder zufällig 1–5 s (Auswahl „Ziel nach Zuruf“, gespeichert als `callMin`…`callMax`, Standard zufällig 1–5). Ein Ruf in der Pause nach dem Wurf zählt auch, die Ansage kommt dann frühestens nach der Pause. Im Video-Modus keine Ansagen.
- **runup**: Ziel angesagt, wartet auf Sprung (Timeout 8 s → zurück zu ready).
- **air**: Sprung erkannt, wenn Hüfte > 0,12 × Körperlänge über Basis UND beide Füße > 0,04 × Körperlänge über Boden, 2 Frames in Folge.
  - Körperlänge = Abstand Schultermitte–Knöchelmitte. Boden = Gerade über die Zeit durch den tiefsten Fußpunkt (Regression + 80. Perzentil der Abweichung), Basis-Hüfte = Median, jeweils aus Frames 0,8–0,15 s vorher. Die Gerade nötig, weil der Fußpunkt im Bild wandert, wenn der Spieler auf die Kamera zuläuft; mit festem Boden lag der Absprung-Frame dann schon in der Luft (im Demo gefunden: Übertritt übersehen).
  - Absprung-Frame = letzter Frame mit Fuß < 0,035 × Körperlänge über Boden; Sprungbein = der tiefere Fuß dort.
- **Landung**: nach > 0,25 s, wenn Fuß wieder am Boden oder Hüfte < 0,04 über Basis; spätestens nach 1,8 s oder 0,4 s ohne Pose.
- **cool**: Pause nach Wurf (Einstellung, Standard 4 s; im Video-Modus 0,6 s).

## Zuruf (Mikrofon, `shout.js`, `shoutDetect.js`)
- Kein Spracherkenner, nur Pegel und Klang. Alle 30 ms eine FFT (2048 Punkte): Pegel im Stimmbereich 200–1200 Hz (`v`) und im hohen Bereich 2,5–6 kHz (`hi`). Grundpegel = Mittel der ersten 0,5 s, danach unterhalb der Schwelle langsam nachgeführt (nach unten schneller). Schwelle = Grundpegel + Empfindlichkeit (`sens`: low 20 / mid 14 / high 9 dB, mindestens −75 dB).
- Ein Ruf zählt am **Ende** des lauten Abschnitts, wenn er
  - mindestens 120 ms nahe seinem Höchstwert bleibt (Ballaufprall = kurzer Knall + Nachhall, zählt nicht),
  - höchstens 2 s dauert (länger = Dauerlärm: der Grundpegel zieht dann mit, ~1,5 s),
  - nach Stimme klingt: in ≥ 60 % der Messungen `v` > `hi` (Schuhquietschen und Pfiffe sind hoch),
  - aus der Ruhe kommt: davor ≥ 0,3 s unter der Schwelle (sonst sind es Spitzen im Dauerlärm),
  - und 1,5 s Sperre nach dem letzten Ruf.
- Zusätzlich muss der Spieler im Bild sein (in den letzten 2 s erkannt), sonst Hinweis „Zuruf gehört, aber niemand im Bild“. So lösen Rufe von anderen Feldern nicht aus.
- Echo-/Rauschunterdrückung und Pegelautomatik aus (sonst wird der Ruf weggeregelt). Während der eigenen Sprachausgabe (+0,4 s) und 1,2 s nach einer Zielansage wird nicht gehört.
- **Mikro testen** (Einrichtung, nur im Modus „Zuruf“): Pegel-Balken, weißer Strich = Schwelle, grün + Piep = Ruf erkannt (mit Zähler). Darunter die Empfindlichkeit „Laute Halle / Mittel / Leise Halle“ (= `sens` low/mid/high), direkt vor Ort einstellbar. Im Training kleine Anzeige „Mikro“ oben im Bild (rot = Mikro liefert keinen Ton).
- Mikro an/aus nur über `syncMic()` (`micUse.test` für den Mikro-Test) (Start/Stopp, Moduswechsel, Wechsel Kamera ↔ Videodatei). Stopp während der Erlaubnis-Abfrage: das Mikro bleibt aus. Liefert das Mikro 2 s lang gar keinen Ton → Hinweis.
- Warum kein Wort-Erkenner: Web Speech Recognition braucht auf Android Netz (Google-Server), ist in der lauten Halle unzuverlässig und hat Verzögerung. Lautstärke geht offline und sofort.
- Getestet (siehe Tests): künstliche Pegelverläufe und eine künstliche Hallen-Tonspur über das Fake-Mikrofon von Chromium (Rauschen, Ballaufpralle mit Nachhall, Schuhquietschen, Pfiff, 8 s zweite Gruppe 20 dB lauter, 3 Rufe): genau die 3 Rufe erkannt. In der Halle noch nicht getestet.

## Wurf-Videos (`clips.js`)
- Aufnahme ab der Zielansage bis 0,8 s nach der Landung (ohne Ansage: laufend, alle 6 s neu begonnen). Aufgenommen wird ein Bild aus Kamerabild + Overlay (Linie, Skelett) + Zielname, max. 720 px breit, 30 fps, 2 Mbit/s (~350 KB pro Wurf).
- Format: H.264 bevorzugt (`video/mp4;codecs=avc1…`, sonst WebM H.264, dann VP8). Grund: H.264 läuft auf Handys meist im Hardware-Encoder und nimmt der Pose-Erkennung keine Rechenzeit weg, und MP4 lässt sich überall abspielen und teilen (WhatsApp, Galerie). VP9 nicht mehr (oft Software-Kodierung).
- Einstellung „Wurf-Videos: Aufnehmen / Aus“ (`clips`). Aus spart Rechenzeit und Speicher. In der Halle die fps-Anzeige mit und ohne Videos vergleichen: fällt sie deutlich (z. B. von 30 auf 20), Videos ausschalten oder Modell „Lite“ nehmen.
- Gespeichert in IndexedDB `awc-clips` (Demo: `awc-demo-clips`), Schlüssel = `entry.time`, Log-Eintrag bekommt `clip:true`. Nur die letzten 60 Clips bleiben. „Gesamtes Log löschen“ löscht auch die Clips.
- Ansehen: Button „▶︎ Video ansehen“ auf der Ergebnis-Karte und „▶︎ Video“ pro Wurf im Training-Fenster. Startet in 0,5×, Schleife, 1× / 0,5× / 0,25×, „Speichern“ teilt die Datei (Android) oder lädt sie herunter.
- Nur Kamera-Modus (bei Video-Dateien gibt es das Video ja schon).

## Prüfungen (in `evaluate()`, `js/analysis.js`), Priorität für den Tipp
1. **over – Übertritt**: Fußspitze oder Ferse des Sprungbeins im Absprung-Frame auf der Torraum-Seite der markierten 6-m-Linie. Ohne Linie: nicht geprüft.
   - Die 6-m-Linie ist **gebogen** (Viertelkreise mit 6 m Radius um die Pfosten + 3 m gerades Stück). Markierung daher als beliebig viele Punkte entlang des Bogens (≥ 2, empfohlen 4–6) oder per Ablaufen, danach 1 Punkt im Torraum (siehe Einrichtung).
   - `curve()` legt eine Catmull-Rom-Kurve durch die Punkte; `lineSide()` nimmt das Kreuzprodukt zum nächstgelegenen Kurvenstück (Endstücke verlängert, Abstand seitenverhältnis-korrigiert). Funktioniert im perspektivischen Bild ohne Kalibrierung.
2. **leg – Sprungbein**: Rechtshänder links, Linkshänder rechts.
3. **arm – Wurfarm**: bestes Frame im Fenster −0,04 … +0,08 s um den Absprung. Handgelenk über Nase = gut, über Schulter = mittel (Tipp), sonst zu tief.
4. **rot – Körperdrehung**: Schulter-Yaw minus Hüft-Yaw aus worldLandmarks (x/z-Ebene). Wert = max(Spannweite der Verwindung, Änderung Schulter-Yaw) vom Absprung bis Wurf + 0,1 s. Grenze 25°, bei „falscher Seite“ (RH auf RA, LH auf LA) 35°; ≥ Grenze gut, ≥ halbe Grenze mittel (Tipp), darunter schlecht.
5. **jump – Sprunghöhe**: (Basis − Hüft-Höchstpunkt) / Körperlänge: ≥ 0,25 hoch, ≥ 0,17 mittel, sonst flach.
6. **lean – Oberkörper** beim Wurf (Frame mit max. Handgelenk-Geschwindigkeit): < 15° aufrecht; > 25° Richtung Torraum = kippt nach vorn; weg vom Torraum = Rücklage (ok).

Feedback: Sprachansage = zufälliges Lob aus den guten Punkten + Kurz-Tipp des wichtigsten Fehlers. Texte in `tips()` (`js/feedback.js`) (short / tip / drill), Labels in `LABEL_GOOD` / `LABEL_BAD`, Reihenfolge in `PRIO`.

## Daten (localStorage)
- `awc-settings`: `hand` (R/L), `pos` (LA/RA), `mode` (auto/timer/call), `callMin`, `callMax`, `sens` (low/mid/high), `clips` (Wurf-Videos an/aus), `pause`, `camera`, `model`, `targets[{name,on}]`, `line{pts[],inside,at,snapped,ref{w,h,g}}` (normalisiert 0–1; altes Format `{a,b,inside}` wird beim Laden zu `pts:[a,b]`), `session{id,start,last}`.
- Demo-Modus: dieselben Daten unter `awc-demo-settings` / `awc-demo-log`.
- `awc-log`: Array von Würfen `{nr, sid, target, res[{ok,txt}], issues[], good[], praise, main, tip, rot, noLine, hit, time, video}`; max. 1000 Einträge.
- Neues Training automatisch nach > 3 h Pause oder per Button.

## Bericht
- `reportText()` → Text für Teilen-Menü (`navigator.share`, Fallback Zwischenablage).
- `reportHTML()` → eigenständige HTML-Seite (`Wurfbericht-JJJJ-MM-TT.html`), teilen per `navigator.share({files})` oder Download.

## Bekannte Grenzen
- Eine Kamera: Drehung, Sprunghöhe und Oberkörper sind Schätzungen. Übertritt hängt von Kamerawinkel und Linienmarkierung ab.
- Treffer werden nicht automatisch erkannt, sondern per Tippen erfasst.
- Schwellenwerte noch nicht in der Halle kalibriert.
- Kamera am besten erhöht (1,5–2 m), schräg von vorn auf die Absprungzone, gutes Licht, möglichst 60 fps.

## Ideen / offene Punkte
- Schwellenwerte nach ersten Hallentests anpassen.
- Ballflug/Treffer automatisch erkennen (Farberkennung der Ringe).
- PDF-Bericht direkt erzeugen.

## Historie
- 2026-10-01: erste Version (Ansage, Übertritt, Sprungbein, Arm, Sprung, Oberkörper, Log, Video-Analyse).
- 2026-10-01: Körperdrehung, Position LA/RA, Lob + Tipp nach jedem Wurf, Training-Auswertung, Abschlussbericht teilen/herunterladen.
- 2026-10-01: 6-m-Linie als Bogen statt Gerade (mehrere Punkte, glatte Kurve) – vorher wurde am Flügel der Übertritt falsch bewertet.
- 2026-10-01: Aufteilung in `index.html`, `css/` und `js/`-Module (gleiches Verhalten, kein Build).
- 2026-10-01: Fix: Startanleitung (`#empty`) blieb trotz `hidden` sichtbar (CSS `display:flex`) und fing alle Tipps ab; Hinweis-Text ist jetzt durchlässig (`pointer-events:none`) und steht beim Linie-Markieren oben.
- 2026-10-01: Einrichtung vor dem Training (Start → Einrichtung → Training starten), „Zurück“ beim Antippen, Linie ablaufen mit Sprachansage.
- 2026-10-03: Strich am Boden erkennen und Linie einrasten (Ablaufen und Antippen), Hinweis auf gespeicherte Linie, Kamera-Check mit automatischem Nachjustieren, Demo-Modus (`?demo=1`) mit gezeichneter Halle und simulierter Person. Fix: Absprung-Frame beim Anlauf auf die Kamera zu (Boden als Gerade über die Zeit).
- 2026-10-03: Ansage „Nach Zuruf“ (Mikrofon, Ziel 1–5 s nach dem Ruf, einstellbar) und kurze Videos pro Wurf (Zeitlupe, speichern/teilen).
