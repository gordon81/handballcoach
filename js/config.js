// Feste Werte: KI-Bibliothek, Modelle, Körperpunkte und Standard-Einstellungen.

export const TV = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";
export const MODELS = {
  lite: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
  full: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task"
};

// MediaPipe-Pose-Indizes der Punkte, die die Prüfungen brauchen.
export const L = {nose:0,lSh:11,rSh:12,lEl:13,rEl:14,lWr:15,rWr:16,lHip:23,rHip:24,lAnk:27,rAnk:28,lHeel:29,rHeel:30,lToe:31,rToe:32};
// Verbindungen für das gezeichnete Skelett.
export const BONES = [[11,12],[11,13],[13,15],[12,14],[14,16],[11,23],[12,24],[23,24],[23,25],[25,27],[24,26],[26,28],[27,29],[29,31],[27,31],[28,30],[30,32],[28,32]];

export const DEF = {hand:'R', pos:'LA', mode:'auto', pause:4, camera:'environment', model:'lite', line:null, session:null,
  targets:[{name:'Orange kurz',on:true},{name:'Orange lang',on:true},{name:'Blau kurz',on:true},{name:'Blau lang',on:true}]};
