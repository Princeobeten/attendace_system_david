"use client";

/**
 * Browser-side face detection.
 *
 * The neural networks run in the user's browser (WebGL via TensorFlow.js), so
 * camera frames never leave the machine — only the resulting 128-number
 * descriptor is sent to the server for matching. Weights are served from
 * /public/models.
 *
 * Three things keep capture fast and tolerant of real rooms:
 *   - Warm-up: WebGL compiles its shaders on the first inference, which can
 *     take tens of seconds on a modest PC. That cost is paid once while the
 *     "Loading…" message is showing, not when the user expects a capture.
 *   - Lighting correction: each frame's brightness is measured and a dim or
 *     washed-out frame is corrected before detection.
 *   - Two detectors: the fast Tiny Face Detector runs on every frame, and the
 *     more thorough SSD MobileNet is tried when it finds nothing.
 */

let faceapi = null;
let loadPromise = null;
let backend = null;

export const MODEL_URL = "/models";

async function loadLibrary() {
  if (faceapi) return faceapi;
  // Explicit ESM bundle: the package's default entry targets Node.
  const mod = await import("@vladmandic/face-api/dist/face-api.esm.js");
  faceapi = mod.default ?? mod;
  return faceapi;
}

/** Prefer the GPU (WebGL); fall back to the CPU when it is unavailable. */
async function pickBackend(api) {
  for (const name of ["webgl", "cpu"]) {
    try {
      if (await api.tf.setBackend(name)) {
        await api.tf.ready();
        return name;
      }
    } catch {
      // try the next backend
    }
  }
  return api.tf.getBackend();
}

/** Run every network once on a blank image so the first real capture is fast. */
async function warmUp(api) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 160;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, 160, 160);
  await api.nets.tinyFaceDetector.locateFaces(canvas, tinyOptions());
  await api.nets.ssdMobilenetv1.locateFaces(canvas, ssdOptions());
  await api.nets.faceLandmark68Net.detectLandmarks(canvas);
  await api.nets.faceRecognitionNet.computeFaceDescriptor(canvas);
}

/** Loads the library and weights once, shared across the whole app. */
export function loadModels(onProgress) {
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const api = await loadLibrary();
    onProgress?.("Starting the face engine…");
    backend = await pickBackend(api);

    onProgress?.("Loading face detector…");
    await api.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
    await api.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);

    onProgress?.("Loading landmark model…");
    await api.nets.faceLandmark68Net.loadFromUri(MODEL_URL);

    onProgress?.("Loading recognition model…");
    await api.nets.faceRecognitionNet.loadFromUri(MODEL_URL);

    onProgress?.("Preparing the camera engine (first time only)…");
    await warmUp(api);

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

/** `{ backend, accelerated }` — shown on screen so a slow PC can be diagnosed. */
export function engineInfo() {
  return { backend, accelerated: backend === "webgl" };
}

const tinyOptions = () =>
  new (getFaceApi().TinyFaceDetectorOptions)({
    // A smaller input keeps CPU-only machines responsive.
    inputSize: backend === "webgl" ? 416 : 320,
    scoreThreshold: 0.3,
  });

const ssdOptions = () =>
  new (getFaceApi().SsdMobilenetv1Options)({ minConfidence: 0.3 });

/* ------------------------------------------------------------------ */
/* Lighting correction                                                 */
/* ------------------------------------------------------------------ */

const FRAME_WIDTH = 640;
let workCanvas = null;
let probeCanvas = null;
const canvasFilter =
  typeof CanvasRenderingContext2D !== "undefined" &&
  "filter" in CanvasRenderingContext2D.prototype;

/** Average brightness (0–255) of the frame, sampled on a tiny copy. */
function measureLuminance(video) {
  probeCanvas ??= document.createElement("canvas");
  probeCanvas.width = 48;
  probeCanvas.height = 36;
  const ctx = probeCanvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(video, 0, 0, 48, 36);
  const px = ctx.getImageData(0, 0, 48, 36).data;
  let sum = 0;
  for (let i = 0; i < px.length; i += 4) {
    sum += 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
  }
  return sum / (px.length / 4);
}

/**
 * Copy the video frame to a canvas (at most 640px wide), brightening a dark
 * frame or toning down an over-exposed one so the face stands out.
 */
function prepareFrame(video) {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return null;

  const scale = Math.min(1, FRAME_WIDTH / vw);
  const w = Math.round(vw * scale);
  const h = Math.round(vh * scale);
  const luminance = measureLuminance(video);

  let gain = 1;
  if (luminance < 95) gain = Math.min(2.6, 125 / Math.max(luminance, 15));
  else if (luminance > 185) gain = Math.max(0.6, 150 / luminance);

  workCanvas ??= document.createElement("canvas");
  workCanvas.width = w;
  workCanvas.height = h;
  const ctx = workCanvas.getContext("2d", { willReadFrequently: true });

  if (gain !== 1 && canvasFilter) {
    ctx.filter = `brightness(${gain.toFixed(2)}) contrast(1.15)`;
    ctx.drawImage(video, 0, 0, w, h);
    ctx.filter = "none";
  } else {
    ctx.drawImage(video, 0, 0, w, h);
    if (gain !== 1) {
      // Browsers without canvas filters: scale the pixels directly.
      const img = ctx.getImageData(0, 0, w, h);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        d[i] = Math.min(255, d[i] * gain);
        d[i + 1] = Math.min(255, d[i + 1] * gain);
        d[i + 2] = Math.min(255, d[i + 2] * gain);
      }
      ctx.putImageData(img, 0, 0);
    }
  }

  return { canvas: workCanvas, scale, luminance, gain };
}

/* ------------------------------------------------------------------ */
/* Detection                                                           */
/* ------------------------------------------------------------------ */

function toVideoBox(box, scale) {
  return {
    x: box.x / scale,
    y: box.y / scale,
    width: box.width / scale,
    height: box.height / scale,
  };
}

/**
 * Find every face in the current video frame.
 *
 * @param {HTMLVideoElement} video
 * @param {{ thorough?: boolean }} options  `thorough` retries with the SSD
 *        detector when the fast detector finds nothing.
 * @returns {Promise<{ faces: Array<{descriptor:number[], box, score}>,
 *                     luminance:number, corrected:boolean }>}
 *          Boxes are in the video's own pixel coordinates.
 */
export async function detectFaces(video, { thorough = false } = {}) {
  const api = getFaceApi();
  const frame = prepareFrame(video);
  if (!frame) return { faces: [], luminance: 0, corrected: false };

  let results = await api
    .detectAllFaces(frame.canvas, tinyOptions())
    .withFaceLandmarks()
    .withFaceDescriptors();

  if (!results.length && thorough) {
    results = await api
      .detectAllFaces(frame.canvas, ssdOptions())
      .withFaceLandmarks()
      .withFaceDescriptors();
  }

  return {
    faces: results.map((r) => ({
      descriptor: Array.from(r.descriptor),
      box: toVideoBox(r.detection.box, frame.scale),
      score: r.detection.score,
    })),
    luminance: frame.luminance,
    corrected: frame.gain !== 1,
  };
}

/** Live capture: every face in the frame, in video coordinates. */
export async function detectAllFaces(video, options) {
  return (await detectFaces(video, options)).faces;
}

export function euclidean(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
  return Math.sqrt(sum);
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
