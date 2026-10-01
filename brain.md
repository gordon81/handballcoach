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
  - `line.js` – 6-m-Linie markieren, Kurve, `inTorraum()`.
  - `tracking.js` – Zustandsautomat, Absprung-/Landungserkennung, speichert den Wurf.
  - `analysis.js` – `evaluate()`: die sechs Prüfungen und der Sprachtext.
  - `feedback.js` – Labels, `PRIO`, `tips()`.
  - `draw.js` – Overlay (Linie, Skelett). `summary.js` + `report.js` – Auswertung und Bericht.
  - `ui/` – `controls.js` (Buttons, Video-Leiste, Training-Fenster), `settingsView.js`, `card.js` (Ergebnis-Karte), `logView.js`, `sheets.js`.
- `README.md` – Kurzbeschreibung für GitHub.
- `brain.md` – diese Datei.

## Technik
- Pose-Erkennung: `@mediapipe/tasks-vision@0.10.14` (PoseLandmarker, runningMode `VIDEO`, 1 Person), geladen von cdn.jsdelivr.net.
- Modelle von storage.googleapis.com: `lite` (~5,8 MB, Standard) oder `full` (~9,4 MB). GPU-Delegate mit CPU-Fallback.
- 2D-Landmarks (Pixel) für Füße, Hüfte, Arm, Linie; `worldLandmarks` (3D, Meter) nur für die Körperdrehung.
- Sprache: Web Speech API (`speechSynthesis`, de-DE). Muss einmal per Nutzer-Geste freigeschaltet werden (Start-Button sagt „Los geht's“).
- Screen Wake Lock hält den Bildschirm an.
- Schrift: Barlow / Barlow Condensed (Google Fonts) mit System-Fallback.
- Kein Build-Schritt, keine Abhängigkeiten im Repo.

## Ablauf (Zustandsautomat)
`off` → `ready` → `runup` → `air` → `cool` → `ready` …
- **ready**: Kamera-Modus „auto“ sagt ein Ziel an, sobald der Spieler ≥ 0,6 s sichtbar ist; Modus „timer“ nach 1,5 s. Im Video-Modus keine Ansagen.
- **runup**: Ziel angesagt, wartet auf Sprung (Timeout 8 s → zurück zu ready).
- **air**: Sprung erkannt, wenn Hüfte > 0,12 × Körperlänge über Basis UND beide Füße > 0,04 × Körperlänge über Boden, 2 Frames in Folge.
  - Körperlänge = Abstand Schultermitte–Knöchelmitte. Boden = 80. Perzentil des tiefsten Fußpunkts, Basis-Hüfte = Median, jeweils aus Frames 0,8–0,15 s vorher.
  - Absprung-Frame = letzter Frame mit Fuß < 0,035 × Körperlänge über Boden; Sprungbein = der tiefere Fuß dort.
- **Landung**: nach > 0,25 s, wenn Fuß wieder am Boden oder Hüfte < 0,04 über Basis; spätestens nach 1,8 s oder 0,4 s ohne Pose.
- **cool**: Pause nach Wurf (Einstellung, Standard 4 s; im Video-Modus 0,6 s).

## Prüfungen (in `evaluate()`, `js/analysis.js`), Priorität für den Tipp
1. **over – Übertritt**: Fußspitze oder Ferse des Sprungbeins im Absprung-Frame auf der Torraum-Seite der markierten 6-m-Linie. Ohne Linie: nicht geprüft.
   - Die 6-m-Linie ist **gebogen** (Viertelkreise mit 6 m Radius um die Pfosten + 3 m gerades Stück). Markierung daher als beliebig viele Punkte entlang des Bogens (≥ 2, empfohlen 4–6), Button wird zu „Fertig“, danach 1 Punkt im Torraum.
   - `curve()` legt eine Catmull-Rom-Kurve durch die Punkte; `lineSide()` nimmt das Kreuzprodukt zum nächstgelegenen Kurvenstück (Endstücke verlängert, Abstand seitenverhältnis-korrigiert). Funktioniert im perspektivischen Bild ohne Kalibrierung.
2. **leg – Sprungbein**: Rechtshänder links, Linkshänder rechts.
3. **arm – Wurfarm**: bestes Frame im Fenster −0,04 … +0,08 s um den Absprung. Handgelenk über Nase = gut, über Schulter = mittel (Tipp), sonst zu tief.
4. **rot – Körperdrehung**: Schulter-Yaw minus Hüft-Yaw aus worldLandmarks (x/z-Ebene). Wert = max(Spannweite der Verwindung, Änderung Schulter-Yaw) vom Absprung bis Wurf + 0,1 s. Grenze 25°, bei „falscher Seite“ (RH auf RA, LH auf LA) 35°; ≥ Grenze gut, ≥ halbe Grenze mittel (Tipp), darunter schlecht.
5. **jump – Sprunghöhe**: (Basis − Hüft-Höchstpunkt) / Körperlänge: ≥ 0,25 hoch, ≥ 0,17 mittel, sonst flach.
6. **lean – Oberkörper** beim Wurf (Frame mit max. Handgelenk-Geschwindigkeit): < 15° aufrecht; > 25° Richtung Torraum = kippt nach vorn; weg vom Torraum = Rücklage (ok).

Feedback: Sprachansage = zufälliges Lob aus den guten Punkten + Kurz-Tipp des wichtigsten Fehlers. Texte in `tips()` (`js/feedback.js`) (short / tip / drill), Labels in `LABEL_GOOD` / `LABEL_BAD`, Reihenfolge in `PRIO`.

## Daten (localStorage)
- `awc-settings`: `hand` (R/L), `pos` (LA/RA), `mode` (auto/timer), `pause`, `camera`, `model`, `targets[{name,on}]`, `line{pts[],inside}` (normalisiert 0–1; altes Format `{a,b,inside}` wird beim Laden zu `pts:[a,b]`), `session{id,start,last}`.
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
- Zeitlupen-Wiederholung des letzten Wurfs mit eingezeichnetem Skelett.
- PDF-Bericht direkt erzeugen.

## Historie
- 2026-10-01: erste Version (Ansage, Übertritt, Sprungbein, Arm, Sprung, Oberkörper, Log, Video-Analyse).
- 2026-10-01: Körperdrehung, Position LA/RA, Lob + Tipp nach jedem Wurf, Training-Auswertung, Abschlussbericht teilen/herunterladen.
- 2026-10-01: 6-m-Linie als Bogen statt Gerade (mehrere Punkte, glatte Kurve) – vorher wurde am Flügel der Übertritt falsch bewertet.
- 2026-10-01: Aufteilung in `index.html`, `css/` und `js/`-Module (gleiches Verhalten, kein Build).
