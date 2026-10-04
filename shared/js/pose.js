// KI-Körpererkennung (MediaPipe PoseLandmarker) laden: GPU mit CPU-Fallback. Für alle Trainings gleich.
export const TV = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";
export const MODELS = {
  lite: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
  full: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task"
};

// → PoseLandmarker im Modus VIDEO für eine Person. model = 'lite' | 'full'.
export async function createPose(model){
  const { PoseLandmarker, FilesetResolver } = await import(TV + '/vision_bundle.mjs');
  const fs = await FilesetResolver.forVisionTasks(TV + '/wasm');
  const opt = d => ({baseOptions:{modelAssetPath:MODELS[model] || MODELS.lite, delegate:d}, runningMode:'VIDEO', numPoses:1,
    minPoseDetectionConfidence:.5, minPosePresenceConfidence:.5, minTrackingConfidence:.5});
  try{ return await PoseLandmarker.createFromOptions(fs, opt('GPU')); }
  catch(e){ console.warn('GPU nicht verfügbar, nutze CPU', e); return await PoseLandmarker.createFromOptions(fs, opt('CPU')); }
}
