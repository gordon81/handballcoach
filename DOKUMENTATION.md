# Außenwurf-Coach – Dokumentation

Anleitung für Trainer und Spieler: was die App macht, wie man sie bedient und wo sie ihre Daten ablegt.
Technische Details für Änderungen am Code stehen in [`brain.md`](brain.md).

**App:** https://gordon81.github.io/handballcoach/aussenspieler/ (Startmenü mit allen Trainings: https://gordon81.github.io/handballcoach/)
**Demo ohne Kamera:** https://gordon81.github.io/handballcoach/aussenspieler/?demo=1

---

## 1. Was die App macht

Ein Spieler trainiert allein Außenwürfe (Links- oder Rechtsaußen) ohne Torwart. Das Handy steht auf dem Stativ und

1. sagt per Sprache ein Ziel an (Standard: die Gummiringe „Orange kurz“, „Orange lang“, „Blau kurz“, „Blau lang“),
2. beobachtet Anlauf, Absprung und Wurf mit der Kamera (KI-Körpererkennung MediaPipe Pose),
3. sagt nach jedem Wurf ein Lob und den wichtigsten Verbesserungstipp an und zeigt eine Ergebnis-Karte,
4. nimmt pro Wurf ein kurzes Video auf (Zeitlupe zum Nachschauen),
5. fasst das Training zusammen und erstellt einen Bericht zum Teilen.

Alles läuft im Browser auf dem Handy. Es gibt keinen Server, kein Konto und keine Uploads. Aus dem Netz geladen werden nur die App selbst, die KI-Bibliothek und das KI-Modell (einmalig einige MB) sowie die Schriftart.

### Die sechs Prüfungen

| Prüfung | Was gemessen wird | Gut, wenn … |
|---|---|---|
| **Übertritt** | Fußspitze oder Ferse des Sprungbeins beim letzten Bodenkontakt gegenüber der markierten 6-m-Linie | der Fuß ganz vor der Linie bleibt. Die Linie gehört zum Torraum: ein Fuß **auf** dem Strich ist schon Übertritt (gerechnet ab der halben Linienbreite, ~2,5 cm vor der markierten Mitte). Ohne eingerichtete Linie wird nicht geprüft. |
| **Sprungbein** | welcher Fuß zuletzt am Boden war | Rechtshänder links, Linkshänder rechts abspringen |
| **Wurfarm** | Höhe des Wurf-Handgelenks beim Absprung | Handgelenk über der Nase (über der Schulter = mittel) |
| **Körperdrehung** | wie weit die Schultern gegen die Hüfte aufdrehen (3D-Schätzung) | ab 25°, auf der „falschen Seite“ (Rechtshänder auf Rechtsaußen bzw. Linkshänder auf Linksaußen) ab 35° |
| **Sprunghöhe** | Hüfte im höchsten Punkt über der Anlauf-Höhe | hoch genug (Grenzen je Kameraposition) |
| **Oberkörper** | Neigung im höchsten Punkt des Sprungs (Wurfauslage) | in der Luft aufgerichtet oder leichte Rücklage; schon in der Luft nach vorn Richtung Torraum fallen ist ein Fehler (nach dem Abwurf darf er nach vorn klappen) |

Angesagt wird immer nur **ein** Tipp, und zwar der wichtigste Fehler in dieser Reihenfolge: Übertritt, Sprungbein, Wurfarm, Drehung, Sprung, Oberkörper.
Drehung, Sprunghöhe und Oberkörper sind Schätzungen aus einer einzigen Kamera. Treffer erkennt die App nur mit Kameraposition 2 und angetippten Ringen selbst (Abschnitt 4.6); sonst tippt man sie auf der Ergebnis-Karte an.

---

## 2. Voraussetzungen

- Handy mit Chrome (Android) oder Safari (iPhone); am PC geht ein aktueller Chrome/Edge/Firefox.
- Die Seite muss über **https** (die Live-Adresse) oder `http://localhost` laufen. Als Datei (`file://`) geöffnet gehen Kamera und Mikrofon nicht.
- Beim ersten Start fragt der Browser nach **Kamera**, im Modus „Nach Zuruf“ auch nach dem **Mikrofon**. Beides erlauben.
- Stativ, das Handy erhöht (1,5–2 m). Gutes Licht hilft der Erkennung, 60 fps sind besser als 30.
- Ton am Handy an, damit man die Ansagen hört (Sprachausgabe auf Deutsch).
- Während des Trainings hält die App den Bildschirm wach.

---

## 3. Bedienung im Überblick

### Der Ablauf auf einen Blick
Die Startseite führt in vier Schritten zum Training, oben stehen sie als Leiste (antippen springt hin):

1. **Übung:** Freies Training oder eine Aufgabe (mit Regeln, Anzahl der Würfe, Bestwert).
2. **Seite & Hand:** Linksaußen oder Rechtsaußen (aus deiner Sicht mit Blick aufs Tor) und Rechts- oder Linkshand. Darunter steht, was das heißt: Anlauf (z. B. *links – rechts – links*), **Sprungbein** und **Wurfarm**.
3. **Ablauf:** der Bewegungsablauf Schritt für Schritt für genau diese Seite und Hand, dazu **▶ Anleitungsvideo ansehen**.
4. **Kamera:** wo das Handy hinkommt. **Kamera starten** lädt Kamera und KI und öffnet die Einrichtung (Kameraposition, 6-m-Linie), dann **Training starten**.

Die Wahl bleibt gespeichert. Wer schon eingerichtet hat, drückt unten direkt **Start**. In der Einrichtung steht oben, was gewählt ist (z. B. *Absprung an der Linie · Linksaußen · Rechtshand*); **Ändern** öffnet die vier Schritte wieder.

### Untere Button-Leiste

| Button | Funktion |
|---|---|
| **Start / Stopp** | Erster Druck: KI und Kamera laden, Einrichtung öffnen (mit der Übung, Seite und Hand von der Startseite). In der Einrichtung startet „Training starten“. Während des Trainings wird der Button zu **Stopp**. |
| **Setup** | Einrichtung öffnen oder schließen (Kameraposition, 6-m-Linie, Mikro-Test). |
| **Ansage** | Sofort ein Ziel ansagen (nur im Kamera-Modus bei laufendem Training). Nützlich, wenn die automatische Ansage nicht kommt. |
| **Video** | Eine Videodatei vom Handy laden und analysieren (siehe Abschnitt 6). |
| **Log** | Fenster „Training“: Auswertung, alle Würfe, Videos, Bericht. |
| **⚙︎** | Einstellungen. |

### Anzeigen oben im Bild

- **Zustand:** *Gestoppt*, *Bereit*, *Anlauf* (Ziel angesagt), *Sprung*, *Pause* (nach dem Wurf); im Zuruf-Modus *Warte auf Zuruf* bzw. *Zuruf gehört*; bei Videodateien *Analyse aktiv*.
- **Mikro** mit kleinem Pegel-Balken: nur sichtbar, solange das Mikrofon an ist. Rot = das Mikrofon liefert keinen Ton.
- **fps:** wie viele Bilder pro Sekunde die KI auswertet. Ziel: 25 oder mehr.
- **⏱ aus / ⏱ 10 s:** Start mit Vorlauf an/aus (in allen Trainings gleich, siehe 5.7).
- **📱 / 📱 verbunden:** zweites Handy als Fernbedienung koppeln bzw. trennen (in allen Trainings, siehe 5.7).
- **Zielname** groß in der Mitte, solange ein Ziel angesagt ist.
- Im Bild: die **rote 6-m-Linie** (eingerichtet) und das **Skelett** des Spielers.

### Ergebnis-Karte nach jedem Wurf

Zeigt alle Prüfungen (✓ gut, • mittel, ✗ Fehler), „Gut:“ (Lob) und „Besser:“ (Tipp). Darunter:
- **▶︎ Video ansehen** (erscheint, sobald das Video gespeichert ist),
- **Treffer / Daneben**, wenn ein Ziel angesagt war. Das Ergebnis geht in die Trefferquote je Ziel ein.

Die Karte verschwindet nach 10 s von selbst (nach dem Antippen von Treffer/Daneben nach 1,5 s).

---

## 4. Einrichtung (vor jedem Training)

Auf der Startseite **Kamera starten** (Schritt 4) oder unten **Start** drücken. Die App lädt KI und Kamera und öffnet die Einrichtung „Kamera einrichten“. Darin:

### 4.1 Kameraposition wählen

| | Position 1 · Grundlinie (Standard) | Position 2 · Feld mit Tor |
|---|---|---|
| Wo | Auf der Grundlinie zwischen 6-m-Linie und Tor, erhöht, schräg von vorn auf die Absprungzone | Im Feld hinter dem 7-m-Punkt, zur anderen Seite versetzt (vom Flügel aus gesehen), erhöht |
| Im Bild | Ganzer Körper und Linie | Tor, Linie und Absprungzone; der Sprung wird von der Seite gesehen |
| Hinweis | | Spieler ist weiter weg und kleiner im Bild: auf gutes Licht achten, bei Erkennungsproblemen in den Einstellungen das KI-Modell „Full“ wählen |

Jede Position hat ihre **eigene gespeicherte 6-m-Linie**. Beim Wechsel lädt die App die Linie dieser Position und prüft, ob die Kamera noch so steht wie damals. Die Prüfungen sind für beide Positionen gleich, nur die Grenzen für die Sprunghöhe unterscheiden sich.

### 4.2 Die 6-m-Linie einrichten

Ohne Linie kann das Training im Kamera-Modus nicht starten (der Übertritt braucht sie). Zwei Wege:

**Linie ablaufen (empfohlen)**
1. „Linie ablaufen“ tippen. Ansage: *„Stell dich ans äußere Ende der Sechs-Meter-Linie und warte kurz.“*
2. Eine Person stellt sich mit den Füßen auf das äußere Ende der Linie und bleibt ca. 1,5 s still stehen.
3. Ansage „los“: langsam auf der Linie nach innen gehen, am Ende stehen bleiben (oder „Fertig“ tippen; nach 30 s ist automatisch Schluss).
4. Die App sucht dabei den gemalten Strich am Boden und rastet die Linie darauf ein („am Boden erkannt“). Findet sie ihn nicht sicher, nimmt sie die Fußpunkte.
5. Ansage: zwei Schritte in den Torraum gehen und stehen bleiben. Damit weiß die App, auf welcher Seite der Torraum liegt. Klappt das nicht innerhalb von 20 s, „Torraum antippen“ und einen Punkt im Torraum antippen.
6. Ansage „Linie gespeichert.“ Prüfen, ob die rote Linie auf dem Strich liegt.

**Linie antippen**
1. „Linie antippen“, dann Punkte entlang der 6-m-Linie im Bild antippen (Bogen: 4–6 Punkte), **von außen nach innen**.
2. „↶ Zurück“ nimmt den letzten Punkt zurück, „⇅“ schiebt die Leiste nach unten, falls sie die Linie verdeckt.
3. „Fertig“, dann **einen Punkt im Torraum** antippen. Auch hier rastet die App auf den Strich am Boden ein, wenn sie ihn sicher findet.

Weitere Buttons: **Korrigieren** (Antippen mit den bisherigen Punkten), **Löschen** (Linie der aktuellen Kameraposition entfernen). In den Einstellungen gibt es zusätzlich „6-m-Linie löschen“.

### 4.3 Gespeicherte Linie und Nachjustieren

Die Linie bleibt gespeichert, zusammen mit einem kleinen Referenzbild der Kamera. Beim nächsten Start:
- **Kamera steht gleich:** Hinweis „Linie von der letzten Einrichtung gefunden“, Button **„Mit dieser Linie starten“**.
- **Kamera leicht verschoben:** die App schiebt die Linie mit und rastet sie neu ein: „Linie neu ausgerichtet, bitte prüfen“. Erst prüfen, dann noch einmal auf Start tippen.
- **Kamera stark bewegt:** „Bitte die Linie neu einrichten“. Neu ablaufen oder antippen. Wer sicher ist, dass nur das Licht anders ist, tippt ein zweites Mal auf Start und trainiert trotzdem.

Dieser Kamera-Check läuft beim Öffnen der Einrichtung, beim Wechsel der Kameraposition und bei „Training starten“.

### 4.4 Mikro testen (nur im Modus „Nach Zuruf“)

Erscheint in der Einrichtung, wenn in den Einstellungen „Ansage: Nach Zuruf“ gewählt ist.
1. „Mikro testen“ tippen.
2. Vom Startpunkt laut rufen („Hey!“). Der Balken muss über den weißen Strich (Schwelle). Erkannte Rufe: grün, Piep, Zähler.
3. Ball prellen, Schuhe quietschen lassen, pfeifen: das darf **nicht** zählen.
4. Empfindlichkeit direkt darunter anpassen: **Laute Halle** (braucht lauteren Ruf), **Mittel**, **Leise Halle**.
5. „Test beenden“ oder Training starten (der Test endet dann automatisch).

### 4.5 Übung wählen: freies Training oder Aufgabe

Die Übung wählst du auf der Startseite im ersten Schritt **Übung** (in der Einrichtung: **Ändern**):
- **Freies Training** (Standard): Würfe mit Zielansage und Technik-Feedback, ohne feste Anzahl.
- **Absprung an der Linie:** 10 Würfe, so nah wie möglich an der 6-m-Linie abspringen, ohne überzutreten. Geschafft ist ein Wurf, wenn der Fuß beim Absprung höchstens ca. 30 cm vor der Linie ist und nicht übertritt. Die Aufgabe ist geschafft bei **7 von 10**.

- **Entscheidung in der Luft:** die App sagt nur **„Los“**. Der Spieler läuft ohne Ziel an, das Ziel kommt erst, **wenn er abspringt**. So lernt man, die Ecke erst in der Luft zu wählen (wie gegen einen Torwart). Geschafft ist ein Wurf mit richtigem Sprungbein, Wurfarm oben und ohne Übertritt; wer auf der Ergebnis-Karte „Daneben“ tippt, hat ihn nicht geschafft. 10 Würfe, Ziel **7 von 10**.

- **Wurfhöhe auf Ansage:** vor dem Ziel sagt die App **„Hoch.“** (über dem Kopf abwerfen) oder **„Hüfte.“** (seitlich, Hand zwischen Hüfte und Schulter), z. B. *„Hüfte. Blau lang“*. Geprüft wird die Hand im Moment des Abwurfs. 10 Würfe, Ziel **7 von 10**.
- **Winkel vergrößern:** nur mit **Kameraposition 2 · Feld mit Tor**. Im Sprung Richtung Tormitte fliegen statt geradeaus, damit der Wurfwinkel größer wird. Nach jedem Wurf *„Geschafft. Gut nach innen.“* oder *„Zu gerade. Mehr Richtung Tormitte.“* 10 Würfe, Ziel **7 von 10**. Mit Kameraposition 1 startet die Aufgabe nicht und die App sagt, dass Position 2 nötig ist. Beim Antippen der Linie von außen nach innen tippen.
- **Gegenstoß auf Zeit:** weit weg starten (z. B. Mittellinie) und **beim Loslaufen laut rufen**. Die App piept, sagt sofort das Ziel und misst die Zeit bis zum Absprung: *„Geschafft. 3,2 Sekunden.“* oder *„4,6 Sekunden. Schneller.“* Geschafft bei höchstens 4,0 s, ohne Übertritt und mit richtigem Sprungbein. 5 Würfe, Ziel **4 von 5**. Das Mikrofon ist in dieser Aufgabe immer an; vorher in der Einrichtung „Mikro testen“ und prüfen, ob der Ruf vom Startpunkt gehört wird.
- **Kreisläufer: Drehen auf Ansage:** mit dem Rücken zum Tor an der 6-m-Linie stehen (Ball in der Hand). Die App sagt **„Links.“** oder **„Rechts.“** und das Ziel; in diese Richtung (aus deiner Sicht) aufdrehen und vor der Linie abspringen. Danach *„Richtig. Reaktion 0,4 Sekunden.“* oder *„Falsche Richtung.“* 10 Würfe, Ziel **7 von 10**. Die Drehrichtung kommt aus der 3D-Schätzung der KI; im Hallentest prüfen.
- **Serie unter Ermüdung:** 20 Würfe mit nur 2 s Pause. Ab dem 6. Wurf warnt die App *„Sprung wird flacher. Knie hoch.“*, wenn ein Sprung deutlich niedriger ist als am Anfang. Geschafft, wenn die letzten 5 Sprünge im Schnitt mindestens **90 %** so hoch sind wie die ersten 5 und kein Übertritt dabei war. Das Ergebnis steht in Prozent.

Bei jeder Übung stehen kurz die Regeln und, sobald es sie gibt, **Bestwert** und **letztes Ergebnis**. Der Start-Button in der Einrichtung heißt dann „Aufgabe starten“.

So läuft eine Aufgabe:
1. Die App liest die Aufgabe vor, danach kommt die erste Zielansage.
2. Oben rechts steht groß, der wievielte Wurf es ist („3/10“), darunter wie viele geschafft sind und das Ziel.
3. Nach jedem Wurf sagt die App das Ergebnis an, z. B. *„Geschafft. 15 Zentimeter vor der Linie. Noch 7.“* oder *„40 Zentimeter vor der Linie. Näher ran.“* oder *„Übertritt.“* Die Ergebnis-Karte zeigt es oben in Grün/Rot, darunter wie gewohnt die Technik.
4. Nach dem letzten Wurf: *„Aufgabe geschafft: 8 von 10.“* bzw. *„6 von 10. Ziel war 7.“* Das Training stoppt, eine große Karte zeigt das Ergebnis mit **Nochmal** (gleich die nächste Serie) und **Fertig**.
5. **Stopp** mitten in der Serie bricht sie ab; sie zählt dann nicht im Verlauf.

Die cm-Angaben sind Schätzungen aus dem Kamerabild (siehe Messwerte). Aufgaben gibt es nur mit Kamera, nicht bei Videodateien.

### 4.6 Treffer automatisch erkennen (nur Kameraposition 2)

Mit **Kameraposition 2 · Feld mit Tor** sind die Ringe im Bild. In der Einrichtung **Ringe antippen**: für jedes Ziel nacheinander die Mitte des Rings antippen („Nicht im Bild“, wenn einer fehlt). Danach erkennt die App nach jedem Wurf, ob der Ball in einem Ring war, sagt *„Treffer.“* oder *„Daneben.“* und trägt es ein. Auf der Karte steht *„Erkannt: Ball im Ring Orange kurz · ca. 62 km/h“*; mit **Treffer/Daneben** kann man es jederzeit korrigieren.

Das **Tempo** ist eine grobe Schätzung: Wurfentfernung (Einstellungen, Standard 7 m) geteilt durch die Zeit vom Abwurf bis der Ball im Ring ist. Gut für „schneller als letzte Woche“, nicht für Rekorde. In den Einstellungen gibt es außerdem die **Ring-Größe im Bild** (klein/mittel/groß), falls die gezeichneten Kreise nicht zu den Ringen passen.

Beides ist bisher nur im Demo geprüft; siehe Hallentest.

### 4.7 Training starten

„Training starten“ bzw. „Mit dieser Linie starten“. Die App sagt *„Los geht's“*. Ab jetzt läuft der Wurfzyklus (Abschnitt 5). **Stopp** beendet das Training, Mikrofon und Bildschirm-wach gehen aus.

---

## 5. Training

### 5.1 Ablauf eines Wurfs

1. **Bereit:** die App wartet auf den Auslöser für die Ansage (siehe Modi).
2. **Anlauf:** Ziel wird angesagt, das Video läuft. Kommt innerhalb von 8 s kein Sprung, geht es zurück auf „Bereit“.
3. **Sprung:** Absprung erkannt; die App merkt sich Absprung, Arm, höchsten Punkt und Wurf.
4. **Landung:** Bewertung, Sprachfeedback (Lob + Tipp), Ergebnis-Karte, Video wird 0,8 s nach der Landung gespeichert.
5. **Pause:** Standard 4 s (einstellbar), dann wieder „Bereit“.

Würfe ohne Ansage (z. B. wenn der Spieler einfach losläuft) werden trotzdem erkannt, bewertet und aufgenommen.

### 5.2 Ansage-Modi (Einstellungen → „Ansage“)

| Modus | Wann kommt das Ziel? |
|---|---|
| **Wenn Spieler im Bild steht** (Standard) | sobald der Spieler mindestens 0,6 s im Bild ist **und still steht**. Wer noch zurückgeht, bekommt noch keine Ansage. |
| **Nach fester Pause** | 1,5 s nach Ende der Pause, unabhängig vom Spieler. |
| **Nach Zuruf (Mikrofon)** | der Spieler ruft laut, wenn er bereit ist. Ein **Piep** bestätigt, das Ziel kommt nach der eingestellten Zeit: fest 1, 2, 3, 4 oder 5 s oder **zufällig 1–5 s** (Standard, „Ziel nach Zuruf“). |

Unabhängig vom Modus sagt der Button **Ansage** jederzeit sofort ein Ziel an. Dasselbe Ziel kommt nie zweimal hintereinander.

### 5.3 „Nach Zuruf“ im Detail

- Der Spieler ruft vom Startpunkt laut, kurz und deutlich („Hey!“, „Los!“). **Welches Wort, ist egal.**
- Ein Ruf zählt nur, wenn er nach Stimme klingt, mindestens kurz anhält, nicht länger als 2 s dauert und aus der Ruhe kommt. Ballaufpralle, Schuhquietschen, Pfiffe und Dauerlärm zählen deshalb nicht.
- Der Spieler muss **im Bild** sein. Ruft jemand, der nicht zu sehen ist, kommt nur der Hinweis „Zuruf gehört, aber niemand im Bild“. So lösen Rufe von anderen Feldern nichts aus.
- Nach einem Ruf ist 1,5 s Sperre. Während die App selbst spricht und kurz nach einer Zielansage hört sie nicht hin.
- Ein Ruf während der Pause nach dem Wurf zählt auch; das Ziel kommt dann frühestens nach der Pause.
- Das Mikrofon ist nur an, solange im Zuruf-Modus trainiert wird (oder beim Mikro-Test). Nach Stopp ist es aus.
- Liefert das Mikrofon keinen Ton (z. B. Erlaubnis verweigert), erscheint ein Hinweis; dann per Button **Ansage** weitermachen oder einen anderen Modus wählen.

### 5.4 Sprachsteuerung: was geht und was nicht

**Was die App spricht** (Sprachausgabe des Handys, Deutsch): Zielansagen, Lob und Tipp nach jedem Wurf, die Anweisungen beim Linie-Ablaufen, Hinweise beim Kamera-Check, „Los geht's“.

**Stimme:** Die App nimmt die natürlichste deutsche Stimme, die das Handy hat (natürliche/„Online“-Stimmen vor den alten Systemstimmen), spricht etwas ruhiger als normal und schreibt Einheiten aus („Stundenkilometer“ statt „km/h“). Nach jedem Wurf sagt sie erst, was gut war, dann einen Tipp, z. B. *„Gut: Richtiges Sprungbein. Tipp: Arm früher hoch.“* Klingt die Stimme blechern: auf Android in den Einstellungen unter *Sprachausgabe* die Google-Sprachausgabe wählen und die deutsche Stimme in hoher Qualität herunterladen; auf dem iPhone unter *Bedienungshilfen → Gesprochene Inhalte → Stimmen → Deutsch* eine „Erweiterte“ Stimme laden.

**Was die App hört:** nur, *dass* laut gerufen wurde (Lautstärke und Klang), im Modus „Nach Zuruf“. Es gibt **keine Spracherkennung**: die App versteht keine Wörter. Man kann also nicht per Stimme stoppen, ein bestimmtes Ziel verlangen, Treffer melden oder Einstellungen ändern. Das geht nur über die Buttons.

Warum so: Worterkennung braucht auf Android eine Internetverbindung zu Google, ist in einer lauten Halle unzuverlässig und reagiert verzögert. Die Lautstärke-Erkennung läuft offline und sofort.

### 5.5 Einstellungen (⚙︎)

| Einstellung | Bedeutung |
|---|---|
| Wurfhand | Rechts / Links (bestimmt das richtige Sprungbein und den Wurfarm) |
| Position | Linksaußen / Rechtsaußen (für die Drehungs-Grenze auf der „falschen Seite“) |
| Ansage | siehe 5.2 |
| Ziel nach Zuruf | 1–5 s fest oder zufällig 1–5 s (nur im Zuruf-Modus sichtbar) |
| Mikrofon-Empfindlichkeit | Niedrig (laute Halle) / Mittel / Hoch (leise Halle); dieselbe Einstellung wie im Mikro-Test |
| Wurf-Videos | Aufnehmen / Aus. „Aus“ spart Rechenzeit und Speicher. |
| Pause nach Wurf | 1–30 s, Standard 4 |
| Kamera | Rückkamera / Frontkamera |
| KI-Modell | Lite (schneller, Standard) / Full (genauer, langsamer) |
| Ziele für die Ansage | an-/abhaken, umbenennen, entfernen, „Ziel hinzufügen“ |
| 6-m-Linie löschen | löscht die Linie der aktuellen Kameraposition |

Alle Einstellungen werden sofort gespeichert und gelten auch beim nächsten Öffnen.

### 5.6 Trainings (Sitzungen)

Würfe werden zu „Trainings“ zusammengefasst. Ein neues Training beginnt automatisch, wenn seit dem letzten Wurf mehr als **3 Stunden** vergangen sind, oder per Button „Neues Training starten“ im Log. Das alte Training bleibt gespeichert.

---

### 5.7 Bedienung aus der Ferne: Start mit Vorlauf, Presenter-Klicker, zweites Handy
Für alle Trainings, wenn das Handy zu hoch hängt oder steht, um es während des Trainings zu bedienen.

**Start mit Vorlauf:** Oben im Bild den Chip **⏱** antippen, bis er **⏱ 10 s** zeigt. Dann zählt die App nach „Start“ (oder „Training starten“ in der Einrichtung) **10 Sekunden** groß herunter, sagt *„Start in 10 Sekunden.“* und piept bei 3, 2, 1. Zeit genug, das Handy aufzuhängen und sich hinzustellen. Antippen der großen Zahl bricht ab. Die Einstellung gilt für alle Trainings.

**Bluetooth-Presenter** (Funk-Klicker für Präsentationen, ca. 10–20 €, mit dem Handy per Bluetooth verbunden) oder eine Bluetooth-Tastatur:

| Taste am Klicker | gestoppt | im Training |
|---|---|---|
| **Weiter** (Bild ab, → oder ↓) | Start (mit Vorlauf, wenn ⏱ an) | 7-m-Pause: **bereit** (Pfiff 1 s später) · Außenwurf-Coach „Nach Zuruf“ und Gegenstoß: zählt wie ein **Zuruf** |
| **Zurück** (Bild auf, ← oder ↑) | – | 7-m-Pause: **anhalten / weiter** |
| **Bildschirm schwarz** (B oder Punkt) oder **Esc** | Vorlauf abbrechen | **Stopp** |

Die Kamera und die Einrichtung (Linie) müssen vorher einmal am Handy gestartet sein. Selfie-Fernauslöser funktionieren meist nicht: sie senden „Lauter“, und das bekommt eine Webseite nicht.

**Anleitung Schritt für Schritt**
1. **Klicker koppeln (einmalig):** Klicker einschalten (bei manchen Modellen USB-Stick abziehen bzw. Schalter auf „BT“), am Handy *Einstellungen → Bluetooth → Neues Gerät koppeln*, den Klicker auswählen. Er erscheint dort als Tastatur oder Eingabegerät. Ein Klicker mit USB-Funkstick ohne Bluetooth geht nur mit USB-C-Adapter am Handy.
2. **Training öffnen**, z. B. Außenwurf-Coach oder 7-m-Trainer, wie gewohnt **Kamera starten** und die Einrichtung machen (Linie ablaufen bzw. antippen). Das geht nur am Handy selbst.
3. **Vorlauf einschalten:** oben im Bild auf **⏱ aus** tippen, bis **⏱ 10 s** dasteht. Die Einstellung bleibt gespeichert, auch für die anderen Trainings.
4. **Klicker testen:** in der Einrichtung einmal **Weiter** drücken. Startet der Vorlauf (große 10 im Bild, Ansage *„Start in 10 Sekunden.“*), kommt die Taste an. Mit **Esc / Bildschirm schwarz** wieder abbrechen. Passiert nichts, sendet der Klicker andere Tasten (manche z. B. F5); die App kennt bisher Bild ab/auf, die Pfeiltasten, B, Punkt und Esc. Dann das Modell melden, die Taste lässt sich in `shared/js/remote.js` ergänzen.
5. **Handy aufstellen oder aufhängen.** Der Bildschirm muss an bleiben und die Seite vorn sein, sonst kommen die Tasten nicht an. Ab dem Start hält die App den Bildschirm wach, vorher nicht: die automatische Bildschirmsperre am Handy so lang stellen, dass sie bis zum Start nicht zuschlägt (z. B. 5 Minuten).
6. **Starten aus der Ferne:** an deinen Startpunkt gehen und **Weiter** drücken. Die App zählt 10 Sekunden herunter, piept bei 3, 2, 1 und startet. Ohne Vorlauf startet sie sofort.
7. **Im Training:** im Außenwurf-Coach mit „Nach Zuruf“ und in der Aufgabe „Gegenstoß auf Zeit“ zählt **Weiter** wie ein Zuruf (Piep, dann kommt das Ziel). Im 7-m-Trainer in der Pause: **Weiter** = bereit (Pfiff 1 s später), **Zurück** = Pause anhalten bzw. weiter. In den anderen Trainings tun Weiter und Zurück während des Trainings nichts.
8. **Aufhören:** **Esc** oder **Bildschirm schwarz** stoppt das Training. Auswertung, Log und Videos danach wie gewohnt am Handy.

Bisher ist der Klicker nur am Schreibtisch mit der Tastatur geprüft, noch nicht mit einem echten Klicker in der Halle.

**Zweites Handy als Fernbedienung**

Ein zweites Handy (oder Tablet) wird zur Fernbedienung: großer Knopf **Start / Stopp**, im 7-m-Trainer **Bereit** und **Anhalten** für die Pause, im Außenwurf-Coach **Zuruf**, und nach einem Wurf mit Ziel **Treffer / Daneben**. Darüber steht, was das Kamera-Handy gerade macht (Zustand, Ergebnis des letzten Wurfs, Countdown, Hinweise). Die beiden Handys sprechen direkt miteinander, ohne Server, ohne Konto, ohne App: gekoppelt wird mit zwei QR-Codes.

Voraussetzung: **beide Handys im selben Netz.** In der Halle am einfachsten: am Kamera-Handy (oder am zweiten) den **Hotspot** einschalten und das andere Handy damit verbinden. Mobile Daten braucht es dafür nicht. Hallen-WLAN geht auch, wenn es Geräte untereinander verbinden lässt (Gäste-WLANs tun das oft nicht).

1. **Netz:** Hotspot an einem Handy einschalten, das andere damit verbinden.
2. **Am Kamera-Handy** das Training öffnen, **Kamera starten** und die Einrichtung machen (Linie) wie gewohnt.
3. Oben im Bild auf **📱** tippen. Es erscheint ein QR-Code.
4. **Am zweiten Handy** die normale **Kamera-App** öffnen, den QR-Code scannen und den Link öffnen. Die Seite „Fernbedienung“ zeigt jetzt ihrerseits einen QR-Code.
5. Diesen Code **vor die Kamera des Kamera-Handys** halten (Rückseite, 20 bis 40 cm). Das kleine Vorschaubild zeigt, was die Kamera sieht. Sobald der Code gelesen ist, sagt das Kamera-Handy *„Fernbedienung verbunden.“*, oben steht **📱 verbunden**, und das zweite Handy zeigt die Knöpfe.
6. Kamera-Handy aufhängen, mit dem zweiten Handy zum Startpunkt gehen, **Start** drücken (mit **⏱ 10 s** zählt das Kamera-Handy erst herunter; **Abbrechen** stoppt den Countdown).
7. **Aufhören:** **Stopp**. Mit **Trennen** am zweiten Handy oder Antippen von **📱 verbunden** am Kamera-Handy endet die Verbindung.

Gut zu wissen:
- Beide Bildschirme müssen an bleiben und die Seite vorn sein. Die Fernbedienung hält ihren Bildschirm selbst wach; wird ein Handy gesperrt oder die Seite gewechselt, kann die Verbindung abreißen. Dann sagt das Kamera-Handy *„Fernbedienung getrennt.“* und man muss neu koppeln (Schritte 3 bis 5).
- Klappt die Verbindung nicht („Keine Verbindung …“): sind beide wirklich im selben Hotspot? Am Kamera-Handy **Neuer Code** tippen und noch einmal scannen. Kann das Kamera-Handy den Code nicht lesen, am zweiten Handy **Code kopieren**, irgendwie aufs Kamera-Handy bringen und dort **Code eingeben**.
- iPhone als Kamera-Handy: zum Lesen des QR-Codes lädt die App beim ersten Mal ein kleines Lese-Programm aus dem Internet (danach aus dem Speicher). Android liest den Code ohne Nachladen.
- Die Codes gelten nur für eine Kopplung. Ein alter QR-Code oder ein Neuladen der Fernbedienungs-Seite funktioniert nicht mehr, dann einfach neu koppeln.
- Ein Live-Bild auf dem zweiten Handy gibt es noch nicht.
- Bisher am Schreibtisch mit zwei Browserfenstern geprüft, noch nicht mit zwei Handys in der Halle.

### 5.8 Anleitungsvideos „▶ Video: Korrekte Ausführung“
In jeder Einrichtung und auf dem Startbildschirm jedes Trainings. Eine Lehrbild-Figur zeigt die Technik nach DHB/KNSU (siehe `QUELLEN.md`) mit den wichtigen **Gelenkwinkeln als gelbe Bögen und Zahlen** (gelb = im Sollbereich), z. B. Knie etwa 90° beim Ausholen, Kniehub mit Oberschenkel waagerecht, Ellbogen und Oberarm etwa 90° in der Wurfauslage. Das Bein, das am Boden bleiben oder abspringen muss, ist **grün umrandet**.
- **Ansichten:** „Seite“ zeigt die Winkel unverzerrt; dazu je nach Training „Vorne“, „Hinten“, „Schräg vorn“ oder die Kamerapositionen des Außenwurf-Coachs.
- **Tempo** 1×, 0,5×, 0,25×, **Pause** zum Anhalten in einer Phase; **Speichern** legt einen Durchlauf als Video ab.
- **Varianten:** Strecksprung / Einbein, Schlagwurf / mit Wurffinte, Grundstellung / Heraustreten, Schlagpass / schnelle Passfolge, im Außenwurf je Aufgabe (z. B. Wurf hoch / aus der Hüfte).
- Wurfhand (Außenwurf, 7 m, Pässe), Position links/rechts außen und bei der Abwehr die Wurfhand des Gegners werden übernommen; die Figur ist dann gespiegelt.
- **Außenwurf-Coach:** im Video direkt **Linksaußen / Rechtsaußen** und **Rechtshand / Linkshand** umschalten (gilt dann auch fürs Training). Unten links im Bild steht, wer wirft (*LINKSAUSSEN · RECHTSHAND, Sprungbein links, Wurfarm rechts*), oben rechts eine **Draufsicht** mit Tor, Anlaufweg und Spieler. **Sprungbein grün, Wurfarm orange**, die drei Schritte als Fußabdrücke am Boden (*1 L, 2 R, 3 L*). Unter dem Video steht der **Bewegungsablauf in 9 Schritten**; der laufende ist markiert, Antippen springt an die Stelle und hält an.

## 6. Videodatei analysieren

Mit **Video** eine Videodatei vom Handy wählen (z. B. ein Bundesliga-Clip oder eine eigene Aufnahme). Die Analyse startet sofort, es gibt keine Ansagen, die Linie ist optional (über „Setup“; ohne Linie wird der Übertritt nicht geprüft).

Video-Leiste: **▶︎/❚❚** abspielen/anhalten, **−2 s** zurück, Geschwindigkeit **0,25× / 0,5× / 1×** (Standard 0,5×, langsamer ist genauer), Schieberegler zum Spulen, **Kamera** zurück zur Live-Kamera.

Aus Videodateien werden keine eigenen Clips aufgenommen. Die Würfe landen aber im Log wie im Training.

---

## 7. Auswertung und Bericht (Button „Log“)

Das Fenster „Training“ zeigt **das aktuelle Training**:
- Zusammenfassung: Anzahl Würfe, davon technisch sauber, Drehung im Schnitt,
- **Aufgaben:** jede Serie in diesem Training mit Ergebnis („8 von 10, geschafft“), bei den Würfen steht „Aufgabe ✓/✗“ und der Grund,
- **Stärken** (ab 3 Würfen) und **Daran arbeiten** (die 3 häufigsten Fehler mit Tipp und Übung),
- **Ziele:** Technik ok und Treffer je Ziel,
- **Würfe:** neueste oben, mit Lob, Hauptfehler, **Messwerten** und **▶︎ Video**.

Buttons:
- **Bericht teilen:** Text über das Teilen-Menü (z. B. WhatsApp). Ohne Teilen-Menü wird der Text in die Zwischenablage kopiert.
- **Bericht als Datei:** HTML-Seite `Wurfbericht-JJJJ-MM-TT.html` mit allen Würfen und der Tabelle „Messwerte“. Wird geteilt (Handy) oder heruntergeladen (PC). Im Browser öffnen oder als PDF drucken.
- **Neues Training starten:** beginnt ein neues Training, das alte bleibt gespeichert.
- **Gesamtes Log löschen:** löscht nach Rückfrage **alle Würfe aller Trainings und alle Wurf-Videos**.

Hinweis: Die App zeigt und berichtet nur das **aktuelle** Training. Frühere Trainings bleiben im Speicher (bis zu 1000 Würfe insgesamt), lassen sich in der App aber nicht mehr aufrufen. Wer ein Training aufheben will, erstellt am Ende den Bericht als Datei.

### Messwerte

Bei „Entscheidung in der Luft“ zusätzlich **Ansage**: wie viele Millisekunden nach dem Absprung die App das Ziel abschickt und wann die Sprachausgabe des Handys wirklich zu sprechen beginnt. Ist der zweite Wert deutlich über 300 ms, kommt das Ziel zu spät.

Pro Wurf: Kameraposition (1/2), **Linie** (Fuß zur 6-m-Linie beim Absprung, + = im Torraum, also Übertritt), **Arm** (Handgelenk über + oder unter − der Nase), **Drehung** (°), **Sprung** (Hüfte über Anlauf-Höhe), **Oberkörper** (°, + = Richtung Torraum), **fps**. Die cm-Werte sind Schätzungen (angenommen 140 cm von Schulter bis Knöchel); sie dienen zum Einstellen der Grenzen nach dem Hallentest.

### Wurf-Videos ansehen

„▶︎ Video ansehen“ auf der Ergebnis-Karte oder „▶︎ Video“ im Log. Das Video startet in 0,5× und läuft in Schleife; Buttons 1× / 0,5× / 0,25×. **Speichern** öffnet auf dem Handy das Teilen-Menü (z. B. Galerie, WhatsApp, Dateien), am PC wird die Datei heruntergeladen. Dateiname: `Wurf-<Nr>-JJJJ-MM-TT.mp4` (je nach Browser `.webm`).

Ein Video zeigt das Kamerabild mit eingezeichneter Linie, Skelett und Zielname, ab der Zielansage bis kurz nach der Landung (max. 720 px breit, ca. 350 KB pro Wurf).

---

## 8. Wo die Daten liegen

Die App schreibt **keine Log-Dateien** und schickt nichts an einen Server. Alles liegt im **Speicher des Browsers** für die Adresse, unter der die App geöffnet wurde. Das heißt:
- Die Daten gibt es nur auf diesem einen Gerät und in diesem einen Browser. Handy und PC haben getrennte Daten.
- Live-Seite (`gordon81.github.io`), lokaler Test (`localhost:8000`) und Demo-Modus haben jeweils getrennte Daten.
- Ein privates/Inkognito-Fenster vergisst alles beim Schließen.

| Was | Wo im Browser | Name | Umfang | Löschen in der App |
|---|---|---|---|---|
| Einstellungen, 6-m-Linien (je Kameraposition, mit Referenzbild), aktuelles Training, gewählte Übung, Verlauf der Aufgaben (je Aufgabe die letzten 30 Serien) | localStorage | `awc-settings` | wenige KB | Linie: „Löschen“ in der Einrichtung / „6-m-Linie löschen“; Einstellungen: nur über die Browser-Daten |
| Wurf-Log (alle Würfe mit Bewertung, Treffer, Messwerten) | localStorage | `awc-log` | die letzten 1000 Würfe | „Gesamtes Log löschen“ |
| Wurf-Videos | IndexedDB | Datenbank `awc-clips` | die letzten **60** Videos (ca. 20 MB), ältere werden automatisch gelöscht | „Gesamtes Log löschen“ (löscht Log **und** Videos) |
| Demo-Modus | localStorage / IndexedDB | `awc-demo-settings`, `awc-demo-log`, `awc-demo-clips` | wie oben | wie oben, im Demo-Modus |
| Berichte | nicht in der App | `Wurfbericht-JJJJ-MM-TT.html` | | liegt dort, wo man ihn hin geteilt hat, bzw. im Download-Ordner |
| Gespeicherte Videos | nicht in der App | `Wurf-<Nr>-JJJJ-MM-TT.mp4` | | Galerie/Dateien bzw. Download-Ordner |
| KI-Modell | Browser-Cache | | ca. 6 MB (Lite) bzw. 9 MB (Full) | lädt der Browser bei Bedarf neu |

### Rankommen an die Daten

- **Handy (Android/Chrome):** über die App selbst: Log → „Bericht als Datei“, einzelne Videos über „Speichern“. Heruntergeladene Dateien liegen in der App „Dateien“ unter *Downloads*. Direkten Zugriff auf localStorage/IndexedDB gibt es am Handy nicht.
- **PC (Chrome/Edge):** F12 → Reiter *Application* (Anwendung) → *Local Storage* → `https://gordon81.github.io` zeigt `awc-settings` und `awc-log` als Text; *IndexedDB* → `awc-clips` → `clips` enthält die Videos. Das komplette Log kopieren: in der Konsole (F12 → *Console*) `copy(localStorage['awc-log'])` eingeben und in eine Textdatei einfügen.
- **Handy-Daten am PC ansehen (Android):** Handy per USB verbinden, USB-Debugging an, am PC in Chrome `chrome://inspect` öffnen, die App-Seite auswählen, dann wie beim PC.

### Komplett löschen

- **In der App:** „Gesamtes Log löschen“ entfernt alle Würfe und Videos; Einstellungen und Linien bleiben.
- **Alles inkl. Einstellungen, Handy (Chrome):** Einstellungen → Website-Einstellungen → Alle Websites → `gordon81.github.io` → Daten löschen. **Achtung:** das löscht auch die Daten anderer Seiten unter `gordon81.github.io`.
- **Alles, PC (Chrome/Edge):** F12 → *Application* → *Storage* → „Clear site data“, oder Schloss-Symbol in der Adresszeile → Website-Einstellungen → Daten löschen.
- **iPhone (Safari):** Einstellungen → Safari → Erweitert → Website-Daten → `github.io` löschen.

Der Browser kann gespeicherte Daten selbst entfernen, wenn das Handy sehr wenig Speicher hat. Wichtige Trainings deshalb als Bericht sichern.

---

## 9. Demo-Modus (am Schreibtisch testen)

Adresse mit `?demo=1` öffnen oder auf der Startseite „Demo ohne Kamera“ tippen. Statt Kamera und KI gibt es eine gezeichnete Halle (Holzboden, gebogene 6-m-Linie, 9-m-Linie, Tor und Linien anderer Sportarten als Störer) und eine simulierte Person, die auf die Ansagen reagiert:
- Einrichtung: geht ans Ende der Linie, läuft sie ab, macht zwei Schritte in den Torraum,
- Training: Anlauf und Sprungwurf nach jeder Ansage, im Wechsel *gut, gut, Übertritt, flach mit Arm unten*,
- Zuruf-Modus: die Person ruft selbst am Startpunkt („Demo: Spieler ruft“).

Die Demo folgt der gewählten Kameraposition 1 oder 2. Zusatz-Leiste oben:
- **Kamera bewegen:** verschiebt/schwenkt die Kamera (3 Stellungen). Danach „Setup“ oder „Start“: die App merkt es und richtet die Linie neu aus.
- **Zuruf:** löst von Hand einen Ruf aus (ohne Mikrofon).
- **Beenden:** zurück zur echten App.

Im Demo gibt es **keine Anleitungsvideos** (die Knöpfe „▶ Video: Korrekte Ausführung“ sind ausgeblendet); sie gehören zur echten App (siehe 5.8).

Die Demo hat ihren eigenen Speicher (siehe Abschnitt 8); das echte Training bleibt unberührt. Einrichtung, Linienerkennung, Kamera-Check, Analyse, Videos und Bericht laufen genauso wie mit Kamera.

---

## 10. Checkliste für den ersten Hallentest

Die Grenzwerte der Prüfungen sind bisher nur im Demo geprüft. Beim ersten Hallentest:

1. **Aufbau:** Handy erhöht (1,5–2 m) auf Position 1 (oder 2). Linie ablaufen, prüfen, ob die rote Linie auf dem Strich liegt.
2. **Bildrate:** fps oben rechts ansehen, einmal mit Wurf-Videos an, einmal aus. Ziel ≥ 25 fps. Fällt sie mit Videos deutlich (z. B. von 30 auf 20), Videos ausschalten oder Modell „Lite“ nehmen.
3. **Zuruf:** Modus „Nach Zuruf“, in der Einrichtung „Mikro testen“. Vom Startpunkt rufen → grün und Piep. Ball prellen, Schuhe quietschen lassen, pfeifen → darf nicht zählen. Sonst Empfindlichkeit ändern.
4. **Würfe für die Grenzen,** je 5–10 und bewusst: saubere Würfe, knapper Übertritt (Fuß auf/hinter der Linie), flache Sprünge, Arm unten, wenig Drehung, Oberkörper nach vorn fallen lassen. Reihenfolge notieren.
5. **Auswerten:** im Log die Messwerte pro Wurf ansehen (Zweifelsfälle mit „▶︎ Video“ prüfen) und „Bericht als Datei“ teilen; der Bericht enthält die Tabelle „Messwerte“.
6. **Grenzen anpassen:** zwischen die Werte der guten und der bewusst schlechten Würfe legen (im Code `TH` bzw. `TH_POS.court` in `aussenspieler/js/config.js`, siehe `brain.md`). Beim Übertritt zuerst die Linie prüfen, wenn echte Übertritte nur knapp im Plus oder saubere Absprünge im Plus liegen.
7. Beide Kamerapositionen getrennt testen (Spalte „Kamera“ im Bericht).
8. **Aufgabe „Entscheidung in der Luft“:** 10 Würfe, dann im Bericht die Spalte „Ansage“ ansehen und notieren, ob man das Ziel in der Luft noch rechtzeitig gehört hat.
9. **Treffererkennung (Position 2):** Ringe antippen, je 10 Würfe in die Ringe und bewusst daneben. Stimmt *„Treffer.“/„Daneben.“*? Tempo mit einer Radar-App vergleichen und die Wurfentfernung einstellen.
10. **Aufgabe „Winkel vergrößern“ (Position 2):** je 5 Würfe bewusst gerade und bewusst Richtung Tormitte; sagt die App das richtig an?
11. **Aufgaben „Wurfhöhe“ und „Ermüdung“:** je 5 Würfe bewusst hoch und aus der Hüfte; prüfen, ob die Ansage stimmt. Bei der Ermüdung prüfen, ob 2 s Pause reichen, um zurück zum Anlauf zu kommen.
12. **Aufgabe „Absprung an der Linie“:** Klebeband 10, 20, 30 und 40 cm vor die Linie kleben, an jedem ein paar Mal abspringen und notieren, was die App ansagt. Passen die cm nicht, wird die Grenze (heute ca. 30 cm) im Code angepasst.

---

## 11. Probleme und Lösungen

| Problem | Lösung |
|---|---|
| „Keine Kamera verfügbar“ | Seite über https (Live-Adresse) öffnen, Kamera-Erlaubnis in den Website-Einstellungen prüfen. |
| KI lädt nicht | Internet nötig beim ersten Laden des Modells; danach aus dem Browser-Cache. |
| Keine Sprachausgabe | Medienlautstärke hochdrehen; Sprachausgabe des Handys (Google-Sprachausgabe, Deutsch) prüfen. Die Sprache wird mit dem ersten Tipp auf Start freigeschaltet. |
| Keine Ansage im Modus „Wenn Spieler im Bild steht“ | Ganzer Körper im Bild? Still stehen. Notfalls Button **Ansage**. |
| Zuruf wird nicht erkannt | Mikro testen, Empfindlichkeit auf „Leise Halle“, lauter und kürzer rufen, im Bild stehen. |
| Zuruf löst zu oft aus | Empfindlichkeit „Laute Halle“. |
| Mikro-Anzeige rot | Mikrofon liefert keinen Ton: Erlaubnis prüfen, andere App mit Mikrofon schließen. |
| Übertritt falsch erkannt | Liegt die rote Linie auf dem Strich? Neu ablaufen; Kamera fester stellen. |
| „Kamera hat sich bewegt“ | Linie prüfen bzw. neu einrichten; bei reinem Lichtwechsel zweites Mal auf Start. |
| fps niedrig | Wurf-Videos aus, Modell „Lite“, besseres Licht. |
| „Video nicht mehr gespeichert“ | Es bleiben nur die letzten 60 Videos. |
| Fernbedienung verbindet nicht | Beide Handys im selben Hotspot? Am Kamera-Handy „Neuer Code“, neu scannen (siehe 5.7). |

---

## 12. 7-m-Trainer

**App:** https://gordon81.github.io/handballcoach/siebenmeter/ (im Startmenü die Karte „7-m-Wurf“) · **Demo:** `siebenmeter/?demo=1`

Der 7-m-Trainer prüft den Strafwurf nach den Regeln (IHF-Regeln, DHB-Fassung): Wurf **innerhalb von 3 Sekunden nach dem Pfiff** (14:4), die **7-m-Linie weder berühren noch überschreiten**, bevor der Ball die Hand verlassen hat (14:5), und **ein Fuß bleibt ununterbrochen am Boden** (15:1). Der andere Fuß darf abheben, Rutschen ist erlaubt.

### Aufbau und Einrichtung
1. Handy aufs Stativ, **seitlich hinter der 7-m-Linie**, erhöht (1–1,5 m). Linie, Füße und Wurfarm müssen im Bild sein.
2. **Start** drücken (Kamera und KI laden), die Einrichtung öffnet sich.
3. **Linie antippen:** auf das eine Ende der 7-m-Linie tippen, dann auf das andere Ende, dann auf **einen Punkt Richtung Tor**. „↶ Zurück“ nimmt den letzten Punkt zurück. Die rote Linie muss auf dem Strich liegen.
4. In der Einrichtung wählen: **Wurfhand**, **Ziel vor dem Pfiff ansagen** (Ja/Nein) und **Übung**: Serie mit 10 Würfen (geschafft bei 8 sauberen) oder frei.
5. **Training starten.**

### Ablauf eines Wurfs
1. Hinter die Linie stellen und **ruhig stehen**. Nach einer Sekunde sagt die App das Ziel an („Oben links“ …).
2. Kurz danach, nach einer zufälligen Pause, kommt der **Pfiff** (hoher Ton, „Pfiff!“ groß im Bild). Wer sich vorher bewegt, bekommt „Zu früh bewegt“ und es geht von vorn los.
3. Werfen. Die App erkennt den Abwurf an der schnellen Armbewegung.
4. Ansage: *„Sauber. 1,4 Sekunden.“* oder der wichtigste Fehler: *„Zu langsam. 3,4 Sekunden.“*, *„Linie übertreten.“*, *„Ein Fuß muss am Boden bleiben.“*, *„Kein Wurf erkannt.“* In der Serie dazu, wie viele Würfe noch fehlen.
5. Die Karte zeigt Zeit, Linie und Standfuß, darunter **Treffer / Daneben** für das angesagte Ziel.
6. Nach der Serie: *„Serie geschafft: 8 von 10.“* bzw. *„6 von 10. Ziel war 8.“* und eine große Karte mit **Nochmal** und **Fertig**.

### Pause zwischen den Würfen (alleine trainieren)
In der Einrichtung unter **„Pause zwischen den Würfen“**: **Kurz** (wie bisher, nach wenigen Sekunden geht es weiter), **30 s**, **45 s** oder **Nur Zuruf** (ohne Zähler). Mit 30/45 s/Nur Zuruf hört das Mikrofon in der Pause zu, und groß im Bild steht der Zähler mit dem nächsten Ziel.
- **Ball holen.** Die App sagt nach dem Wurf gleich das nächste Ziel an.
- **An der Linie rufen** („Ready!“): genau **1 Sekunde später kommt der Pfiff**. Ruhig hinter der Linie stehen, sonst wartet der Pfiff, bis du stehst.
- **Unterwegs rufen** („Pause!“): der Zähler **hält an** (gelb). Noch ein Ruf unterwegs: er **läuft weiter**. Ein Ruf an der Linie: bereit, Pfiff nach 1 s.
- **Ohne Ruf** pfeift es, wenn der Zähler abgelaufen ist (10 s vorher: *„Noch zehn Sekunden.“*), sobald du hinter der Linie stehst.
- Die App erkennt **keine Wörter**, nur einen lauten Ruf. Was er bedeutet, entscheidet, **wo du stehst** (an der Linie oder nicht). Zwei Rufe schnell hintereinander gehen in der Halle nicht, der Nachhall verbindet sie.
- **Ersatz zum Rufen:** die großen Flächen **Bereit** und **Anhalten/Weiter** antippen (oder wenn das Mikrofon nicht geht).

Ein Fehler ist es nur, wenn **beide** Füße vor dem Abwurf den Boden verlassen (z. B. ein Hüpfer). Abrollen, Ferse heben und Rutschen des Standfußes sind erlaubt; ein angehobener Fuß über der Linie zählt nicht als Berührung. Die Grenzen sind bisher nur im Demo geprüft (siehe Hallentest).

### Log und Bericht
**Log** zeigt das aktuelle Training: wie viele Würfe regelgerecht waren, die Zeit im Schnitt, wie oft zu langsam / Linie / kein Fuß am Boden, die Serien und alle Würfe. **Bericht teilen** schickt den Text übers Teilen-Menü. Daten: localStorage `7m-settings` und `7m-log` (Demo: `7m-demo-…`), getrennt vom Außenwurf-Coach. Wurf-Videos gibt es im 7-m-Trainer noch nicht.

### Hallentest 7 m
Je 5 Würfe: sauber, bewusst zu langsam, Fuß auf die Linie, mit beiden Füßen kurz hochspringen, Standfuß nur rutschen lassen (darf kein Fehler sein). Notieren, was die App ansagt, und prüfen, ob man den Pfiff in der Halle gut hört. Danach im Log die Werte „Linie“ und „Fuß“ ansehen; daraus werden die Grenzen eingestellt.

---

## 13. Abwehr-Beinarbeit

**App:** https://gordon81.github.io/handballcoach/abwehr/ (Karte „Abwehr-Beinarbeit“ im Startmenü) · **Demo:** `abwehr/?demo=1`

Schnelle Abwehrbewegung ohne Ball: seitlich verschieben, heraustreten und zurück, auf Zuruf der App.

### Aufbau
- Handy aufs Stativ, **frontal vor dir**, 4–5 m weg, etwa Hüfthöhe. Ganzer Körper im Bild und Platz für einen großen Schritt nach links, rechts, vorn und hinten. Zwei Hütchen ca. 3 m auseinander helfen.
- **Start** drücken, in der Einrichtung die **Dauer** (30, 40 oder 60 s) und die **Kamera** wählen (Frontkamera, wenn du dich selbst sehen willst), dann **Runde starten**.

### Die richtige Stellung (nach den Technikkriterien des DHB)

Das Handy ist dein **Gegenspieler**. In der Einrichtung stellst du ein, mit welcher Hand er wirft: **Rechts**, **Links** oder **Wechselnd**.

- **Grundposition:** immer **seitlich zur Wurfhand** des Gegners: der Fuß auf seiner Wurfarmseite steht vorn, die Hand auf dieser Seite ist vorn und etwas höher (Führarm). Beine etwas mehr als schulterbreit, Hüfte und Knie gebeugt (Körperschwerpunkt tief), Oberkörper fast aufrecht, Arme leicht angewinkelt vor dem Körper.
- **Heraustreten („Raus“):** in derselben seitlichen Stellung zum Gegner heraus. **Vorn steht der Fuß auf seiner Wurfarmseite**, die Hand auf dieser Seite geht als „Führarm“ an seinen Wurfarm (etwa Schulterhöhe), die andere als „Sicherungsarm“ an seinen Oberkörper.
  - **Gegen einen Rechtshänder:** linker Fuß vorn, linke Hand an seinen Wurfarm, rechte Hand an seinen Oberkörper.
  - **Gegen einen Linkshänder:** rechter Fuß vorn, rechte Hand an seinen Wurfarm, linke Hand an seinen Oberkörper.
- Seitlich mit Nachstellschritten verschieben, die Füße nicht kreuzen. Zwischen Gegner und eigenem Tor bleiben.

Quellen und Unterschiede zwischen den Quellen: [`QUELLEN.md`](QUELLEN.md).

### Ablauf
1. *„Stell dich aufrecht hin, Gesicht zum Handy.“* Kurz still stehen: die App misst deine Stand-Höhe.
2. *„Grundposition, seitlich zur rechten Wurfhand.“* Wie oben beschrieben. Bei „Wechselnd“ sagt die App am Anfang und bei jedem *„Raus“*, mit welcher Hand der Gegner wirft; danach stehst du seitlich zu dieser Hand.
3. Die App ruft **links**, **rechts**, **raus** (zum Handy) oder **zurück**. Die Richtungen gelten **aus deiner Sicht**. Bei „Wechselnd“ sagt sie beim Heraustreten dazu, ob der Gegner Rechts- oder Linkshänder ist (*„Raus, Linkshänder“*).
4. Nach dem Heraustreten prüft die App die Stellung und korrigiert kurz, z. B. *„Linker Fuß vor.“* oder *„Linke Hand hoch zum Wurfarm.“* Ein tiefer Piep heißt: falsche Richtung, zu langsam oder keine Bewegung.
5. Stehst du zu weit außen, ruft die App dich zur Mitte zurück.
6. Am Ende: *„Fertig. 12 von 14 richtig. Reaktion im Schnitt 0,45 Sekunden. Heraustreten 3 von 4 mit richtiger Stellung.“* und, wenn nötig, Tipps wie *„Seitlich zur Wurfhand stehen …“* oder *„Beine etwas mehr als schulterbreit.“* Die Karte zeigt dazu, wie viel der Zeit du seitlich zur Wurfhand, breit, aufrecht und mit den Armen vorn standst.

Richtig ist eine Bewegung in die gerufene Richtung, die innerhalb von 1 Sekunde beginnt. Die Reaktionszeit zählt vom Ruf bis zur ersten deutlichen Bewegung der Hüfte; wenn das Handy meldet, wann die Sprachausgabe wirklich anfängt, wird diese Verzögerung abgezogen.

### Log und Bericht
**Log** zeigt jede Runde: richtig, Reaktion im Schnitt, wie oft die Füße gekreuzt waren, wie viel der Zeit du tief warst, und jeden Ruf einzeln. **Bericht teilen** schickt das als Text. Daten: localStorage `def-settings` und `def-log` (Demo: `def-demo-…`).

### Hallentest Abwehr
Eine Runde machen und prüfen: stimmen links und rechts (auch mit der Frontkamera)? Sind die Reaktionszeiten plausibel? Kommt „gekreuzt“ nur, wenn du wirklich kreuzt? Dazu je 5× bewusst richtig und falsch heraustreten (falscher Fuß vorn, Führarm unten), gegen Rechts- und Linkshänder: stimmt die Korrektur? Danach werden die Grenzen eingestellt.

---

## 14. Rückraum-Coach (Sprungwurf aus 9 m)

**App:** https://gordon81.github.io/handballcoach/aussenspieler/?rr=1 (Karte „Rückraum: Sprungwurf“ im Startmenü) · **Demo:** `aussenspieler/?rr=1&demo=1`

Das ist der Außenwurf-Coach im Rückraum-Modus: gleiche Bedienung (Start, Einrichtung, Ziele, Videos, Log, Bericht, Aufgaben), aber für den Sprungwurf aus dem Rückraum und mit eigenem Speicher (die Außenwurf-Daten bleiben getrennt).

### Aufbau
Handy erhöht (1,5–2 m) **schräg von vorn** auf den Rückraum, z. B. am Torraum zur Seite versetzt, so dass der Spieler beim Anlauf **auf das Handy zu** läuft. 9-m-Linie, Anlauf und Absprung müssen im Bild sein. In der Einrichtung die **9-m-Linie ablaufen** (wie beim Außenwurf, am Ende zwei Schritte Richtung Tor) oder antippen: bei der gestrichelten Linie auf die Striche tippen.

### Was geprüft wird
| Prüfung | Gut, wenn … |
|---|---|
| **Absprung** | vor (außerhalb) der 9-m-Linie abgesprungen |
| **Sprungbein** | Rechtshänder links, Linkshänder rechts |
| **Schritte** | drei Bodenkontakte vom Anlauf bis zum Absprung (Dreischritt); mehr oder weniger gibt den Tipp „Drei Schritte, dann hoch.“ |
| **Wurfarm** | beim Absprung über dem Kopf |
| **Abwurf** | im höchsten Punkt (höchstens 0,15 s davor oder danach); sonst „zu früh“ oder „zu spät“ |
| **Sprunghöhe, Oberkörper** | wie beim Außenwurf |

Die Körperdrehung wird nur angezeigt, sie zählt im Rückraum nicht. Die Schritte zählt die App ab der Zielansage; wer vorher noch geht, sollte nach der Ansage stehen und dann anlaufen.

### Hallentest Rückraum
Je 5 Würfe mit drei Schritten, mit zwei und vier Schritten, bewusst früh und spät abwerfen, knapp innerhalb der 9 m abspringen. Danach im Bericht die Spalten „Schritte“ und „Abwurf“ ansehen; daraus werden die Grenzen eingestellt.

---

## 15. Pässe gegen die Wand

**App:** https://gordon81.github.io/handballcoach/passen/ (Karte „Pässe gegen die Wand“ im Startmenü) · **Demo:** `passen/?demo=1`

So viele saubere Pässe wie möglich in 30 oder 60 Sekunden. Das Handy **hört den Aufprall an der Wand** und zählt; die Kamera prüft bei jedem Pass, ob der **Arm über der Schulter** ist und das **Gegenbein vorn** (Rechtshänder links).

### Aufbau
- Ziel an die Wand (Klebeband-Kreuz oder Ring), 4–6 m davor stellen.
- Handy seitlich aufs Stativ, ganzer Körper im Bild. In der Einrichtung angeben, ob die **Wand links oder rechts** im Bild ist.
- **Mikro testen:** ein paar Pässe werfen, jeder Aufprall soll genau einmal zählen (Piep). Zählt das Fangen oder Lärm vom Nachbarfeld mit, Empfindlichkeit „Laute Halle“ wählen oder **Zählen über Kamera** (dann zählt die Wurfbewegung).

### Ablauf
1. **Runde starten:** *„30 Sekunden Pässe gegen die Wand. Auf den Piep.“* Nach drei Sekunden kommt der Piep.
2. Passen. Groß im Bild: die Zahl der Pässe (gelb, wenn der letzte nicht sauber war) und die Restzeit. Bei 10 s: *„Noch zehn Sekunden.“*
3. Schluss-Piep, dann z. B. *„Fertig. 24 Pässe in 30 Sekunden. 20 mit Arm oben, 18 mit dem richtigen Bein vorn.“* und bei Rekord *„Neuer Bestwert!“*. Die Karte zeigt dasselbe mit **Nochmal**.

**Log** zeigt alle Runden des Trainings und den Bestwert, **Bericht teilen** schickt sie als Text. Daten: localStorage `pass-settings`, `pass-log` (Demo `pass-demo-…`).

### Hallentest Pässe
Mikro-Test vor der Wand (zählt jeder Aufprall, das Fangen nicht?), einmal mit Lärm vom Nachbarfeld. Eine Runde mit Absicht ein paar Pässe aus der Hüfte und mit dem falschen Bein vorn: erkennt die App das?

---

## 16. Sprungkraft

**App:** https://gordon81.github.io/handballcoach/sprung/ (Karte „Sprungkraft“ im Startmenü) · **Demo:** `sprung/?demo=1`

Sprungkraft für den Wurf: die App zählt Sprünge auf der Stelle, schätzt die Höhe jedes Sprungs und vergleicht links mit rechts.

### Aufbau und Ablauf
1. Handy frontal, 3–4 m weg, etwa Hüfthöhe; der ganze Körper muss auch im Sprung im Bild sein.
2. **Start**, Übung wählen: **10 Strecksprünge** (beidbeinig) oder **Einbein 5+5** (erst links, dann rechts).
3. **Übung starten**, ruhig hinstellen. Nach *„… Los.“* und Piep auf der Stelle springen. Die Höhe jedes Sprungs steht groß im Bild, oben der Zähler.
4. Einbein: nach fünf Sprüngen *„Wechsel. Fünf auf dem rechten Bein.“* Sprünge auf dem falschen Bein oder mit beiden Beinen zählen nicht.
5. Am Ende z. B. *„Fertig. 10 Sprünge. Im Schnitt 35 Zentimeter, bester 39. Bodenkontakt 0,32 Sekunden. 3 Zentimeter mehr als letztes Mal.“* bzw. *„Links 19, rechts 25 Zentimeter. Rechts 25 Prozent stärker, das schwächere Bein extra trainieren.“*

Die Höhe ist geschätzt (wie weit die Hüfte über die Stand-Höhe steigt). Absolut ist sie ungenau, für den Vergleich mit dem letzten Mal und zwischen den Beinen aber aussagekräftig. **Log** zeigt jede Übung mit allen Höhen, **Bericht teilen** als Text. Daten: localStorage `jump-settings`, `jump-log`.
