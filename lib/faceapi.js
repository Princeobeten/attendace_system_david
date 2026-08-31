"use client";

/**
 * Browser-side face detection.
 *
 * The neural networks run in the user's browser (WebGL via TensorFlow.js), so
 * camera frames never leave the machine — only the resulting 128-number
 * descriptor is sent to the server for matching. Weights are served from
 * /public/models.
 *
 * Two detectors are used deliberately:
 *   - SSD MobileNet V1  : slower, more accurate  -> face enrolment (one face)
 *   - Tiny Face Detector: fast enough for video  -> live classroom capture
 */

let faceapi = null;
let loadPromise = null;

export const MODEL_URL = "/models";

async function loadLibrary() {
  if (faceapi) return faceapi;
  // Explicit ESM bundle: the package's default entry targets Node.
  const mod = await import("@vladmandic/face-api/dist/face-api.esm.js");
  faceapi = mod.default ?? mod;
  return faceapi;
}

/** Loads the library and weights once, shared across the whole app. */
export function loadModels(onProgress) {
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const api = await loadLibrary();
    onProgress?.("Starting TensorFlow…");
    await api.tf.setBackend("webgl").catch(() => api.tf.setBackend("cpu"));
    await api.tf.ready();

    onProgress?.("Loading face detector…");
    await api.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
    await api.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);

    onProgress?.("Loading landmark model…");
    await api.nets.faceLandmark68Net.loadFromUri(MODEL_URL);

    onProgress?.("Loading recognition model…");
    await api.nets.faceRecognitionNet.loadFromUri(MODEL_URL);

    onProgress?.("Ready");
    return api;
  })().catch((err) => {
    loadPromise = null; // let the caller retry
    throw err;
  });

  return loadPromise;
}

export function getFaceApi() {
  if (!faceapi) throw new Error("Face models are not loaded yet");
  return faceapi;
}

const accurateOptions = () =>
  new (getFaceApi().SsdMobilenetv1Options)({ minConfidence: 0.5 });

const fastOptions = () =>
  new (getFaceApi().TinyFaceDetectorOptions)({ inputSize: 416, scoreThreshold: 0.4 });

/**
 * Enrolment: expect exactly one clear face and return its descriptor.
 * @returns {{descriptor: number[], box: object}|null}
 */
export async function detectSingleFace(input) {
  const api = getFaceApi();
  const result = await api
    .detectSingleFace(input, accurateOptions())
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!result) return null;
  return {
    descriptor: Array.from(result.descriptor),
    box: result.detection.box,
    score: result.detection.score,
  };
}

/**
 * Live capture: find every face in the frame.
 * @returns {Array<{descriptor: number[], box: object}>}
 */
export async function detectAllFaces(input) {
  const api = getFaceApi();
  const results = await api
    .detectAllFaces(input, fastOptions())
    .withFaceLandmarks()
    .withFaceDescriptors();

  return results.map((r) => ({
    descriptor: Array.from(r.descriptor),
    box: r.detection.box,
    score: r.detection.score,
  }));
}

/** Crop the detected face out of the video frame as a small JPEG thumbnail. */
export function cropFace(video, box, size = 160) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  // Pad the box a little so the crop includes hair and chin, not just features.
  const pad = box.width * 0.25;
  const sx = Math.max(0, box.x - pad);
  const sy = Math.max(0, box.y - pad);
  const sw = Math.min(video.videoWidth - sx, box.width + pad * 2);
  const sh = Math.min(video.videoHeight - sy, box.height + pad * 2);

  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, size, size);
  return canvas.toDataURL("image/jpeg", 0.8);
}
