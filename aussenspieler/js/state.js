// Gemeinsamer Laufzeit-Zustand, den mehrere Module lesen und ändern.
// (Bewusst ein Objekt: importierte Variablen kann ein anderes Modul nicht neu zuweisen.)

export const app = {
  state: 'off',     // off | ready | runup | air | cool (siehe tracking.js)
  stateT: 0,        // Zeitpunkt des letzten Zustandswechsels (s)
  source: 'none',   // none | cam | file
  target: null,     // aktuell angesagtes Ziel
  latest: null,     // letzter erkannter Frame (fürs Zeichnen)
  marking: null,    // Punkte, während die 6-m-Linie markiert wird
  markStep: null    // 'line' (Punkte auf der Linie) | 'inside' (Punkt im Torraum)
};
