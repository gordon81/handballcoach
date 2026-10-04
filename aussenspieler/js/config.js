// Feste Werte: KI-Bibliothek, Modelle, Körperpunkte und Standard-Einstellungen.

// KI-Bibliothek und Modelle: shared/js/pose.js.

// MediaPipe-Pose-Indizes der Punkte, die die Prüfungen brauchen.
export const L = {nose:0,lSh:11,rSh:12,lEl:13,rEl:14,lWr:15,rWr:16,lHip:23,rHip:24,lAnk:27,rAnk:28,lHeel:29,rHeel:30,lToe:31,rToe:32};
// Verbindungen für das gezeichnete Skelett.
export const BONES = [[11,12],[11,13],[13,15],[12,14],[14,16],[11,23],[12,24],[23,24],[23,25],[25,27],[24,26],[26,28],[27,29],[29,31],[27,31],[28,30],[30,32],[28,32]];

export const DEF = {hand:'R', pos:'LA', camPos:'base', lines:{}, mode:'auto', pause:4, callMin:1, callMax:5, sens:'mid', clips:true, camera:'environment', model:'lite', line:null, session:null, task:'free', taskHist:{},
  targets:[{name:'Orange kurz',on:true},{name:'Orange lang',on:true},{name:'Blau kurz',on:true},{name:'Blau lang',on:true}]};

// Kamerapositionen (Einrichtung). Jede Position hat ihre eigene 6-m-Linie (settings.lines).
export const CAM_POS = {
  base: {name:'1 · Grundlinie', where:'Auf der Grundlinie zwischen 6-m-Linie und Tor, erhöht (1,5–2 m), schräg auf die Absprungzone.'},
  court: {name:'2 · Feld mit Tor', where:'Im Feld hinter dem 7-m-Punkt, zur anderen Seite versetzt, erhöht (1,5–2 m). Tor und Absprungzone im Bild.'}
};

// Grenzwerte der Prüfungen in Körperlängen (KL = Schulter–Knöchel) bzw. Grad. Nach den ersten Hallentests
// anpassen: die Messwerte jedes Wurfs stehen im Training-Fenster und im Bericht (siehe brain.md, Kalibrieren).
export const TH = {jumpHigh:0.25, jumpMid:0.17, rot:25, rotWrongSide:35, leanUpright:15, leanForward:25, leanStrong:35,
  // Aufgabe „Absprung an der Linie“: geschafft, wenn der Fuß höchstens so weit vor der Linie abspringt (KL, ~30 cm).
  taskLineFar:-0.2};
// Abweichende Grenzen je Kameraposition (sonst TH). Position 2 sieht den Sprung von der Seite und misst ihn größer:
// auf Position 1 läuft der Spieler in der Luft auf die erhöhte Kamera zu, die Hüfte sinkt im Bild (im Demo ~1,5× weniger).
export const TH_POS = {court:{jumpHigh:0.36, jumpMid:0.30}};
// Für die cm-Angaben angenommene Körperlänge (Schulter–Knöchel eines Erwachsenen).
export const KL_CM = 140;

// Demo-Modus (gezeichnete Halle, simulierte Person statt Kamera und KI): Seite mit ?demo=1 öffnen.
export const DEMO = new URLSearchParams(globalThis.location?.search ?? '').has('demo');   // ohne location (Node-Tests): kein Demo
