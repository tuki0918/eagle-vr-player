import { pipeline } from "@huggingface/transformers";

const MODEL_ID = "onnx-community/depth-anything-v2-small";
const MAX_INPUT_DIMENSION = 768;

let estimatorPromise;
let inferenceQueue = Promise.resolve();

function postProgress(requestId, progress) {
  self.postMessage({
    type: "progress",
    requestId,
    progress: {
      file: progress?.file || "",
      progress: Number.isFinite(progress?.progress) ? progress.progress : null,
      status: progress?.status || "loading",
    },
  });
}

async function createEstimator(requestId) {
  const progress_callback = (progress) => postProgress(requestId, progress);

  if (self.navigator?.gpu) {
    try {
      const estimator = await pipeline("depth-estimation", MODEL_ID, {
        device: "webgpu",
        dtype: "fp32",
        progress_callback,
      });
      return { backend: "WebGPU", estimator };
    } catch (error) {
      self.postMessage({
        type: "backend-fallback",
        requestId,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const estimator = await pipeline("depth-estimation", MODEL_ID, {
    device: "wasm",
    dtype: "q8",
    progress_callback,
  });
  return { backend: "WASM", estimator };
}

function getEstimator(requestId) {
  if (!estimatorPromise) {
    estimatorPromise = createEstimator(requestId).catch((error) => {
      estimatorPromise = undefined;
      throw error;
    });
  }
  return estimatorPromise;
}

async function estimateDepth({ imageBitmap, requestId }) {
  const scale = Math.min(
    1,
    MAX_INPUT_DIMENSION / Math.max(imageBitmap.width, imageBitmap.height),
  );
  const width = Math.max(1, Math.round(imageBitmap.width * scale));
  const height = Math.max(1, Math.round(imageBitmap.height * scale));
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext("2d", { alpha: false });
  context.drawImage(imageBitmap, 0, 0, width, height);
  imageBitmap.close();

  const { backend, estimator } = await getEstimator(requestId);
  const output = await estimator(canvas);
  const depthData = new Uint8Array(output.depth.data);

  self.postMessage(
    {
      type: "result",
      requestId,
      backend,
      width: output.depth.width,
      height: output.depth.height,
      data: depthData.buffer,
    },
    [depthData.buffer],
  );
}

self.addEventListener("message", (event) => {
  if (event.data?.type !== "estimate") return;

  inferenceQueue = inferenceQueue
    .catch(() => undefined)
    .then(() => estimateDepth(event.data))
    .catch((error) => {
      event.data.imageBitmap?.close?.();
      self.postMessage({
        type: "error",
        requestId: event.data.requestId,
        message: error instanceof Error ? error.message : String(error),
      });
    });
});
