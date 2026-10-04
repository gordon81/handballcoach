# Handballcoach – Außenwurf-Coach, 7-m-Trainer, Abwehr-Beinarbeit

Web-App fürs Handy: Zielansage per Sprache, KI-Technik-Check (Übertritt, Sprungbein, Wurfarm, Körperdrehung, Sprunghöhe, Oberkörper), nach jedem Wurf ein Lob und ein Verbesserungstipp, Abschlussbericht zum Teilen oder Herunterladen. Läuft komplett im Browser mit Google MediaPipe Pose, ohne Server und ohne Kosten.

**Startmenü (alle Trainings):** https://gordon81.github.io/handballcoach/

**Außenwurf-Coach öffnen:** https://gordon81.github.io/handballcoach/aussenspieler/

**Abwehr-Beinarbeit öffnen:** https://gordon81.github.io/handballcoach/abwehr/ (Demo: `abwehr/?demo=1`)

**7-m-Trainer öffnen:** https://gordon81.github.io/handballcoach/siebenmeter/ (Demo: `siebenmeter/?demo=1`)

## Einrichtung GitHub Pages
Settings → Pages → Deploy from a branch → `main` / `(root)` → Save.

## Nutzung
1. Handy aufs Stativ, schräg auf die Absprungzone, ganzer Körper im Bild.
2. **Start** → Kamera erlauben.
3. **Einrichtung**: eine Person läuft die 6-m-Linie auf Ansage ab (die App sucht dabei den Strich am Boden und rastet die Linie ein) oder Punkte antippen. Gespeicherte Linie wird wiederverwendet; hat sich die Kamera bewegt, richtet die App die Linie neu aus.
4. Spieler stellt sich ins Bild → Ziel wird angesagt → Wurf → Sprach-Feedback.
5. **Video**: Clips (z. B. Bundesliga) laden und mit 0,5× analysieren.
6. **Log**: Stärken, Schwerpunkte mit Übungen, Trefferquote je Ziel. **Bericht teilen** (Text, z. B. WhatsApp) oder **Bericht als Datei** (HTML, im Browser öffnen oder als PDF drucken).

## Ohne Halle testen (Demo-Modus)
https://gordon81.github.io/handballcoach/aussenspieler/?demo=1 (oder lokal http://localhost:8000/aussenspieler/?demo=1): gezeichnete Halle mit gebogener 6-m-Linie und einer simulierten Person, die die Linie abläuft und wirft. „Kamera bewegen“ prüft das Nachjustieren.

## Automatische Tests
`cd tests && npm install && npm test` (Node + Playwright, headless Chromium): Demo-Modus von der Linie bis zu den Würfen, Wurf-Videos, Zuruf-Modus und Ruf-Erkennung mit Fake-Mikrofon. Details in `brain.md`.
