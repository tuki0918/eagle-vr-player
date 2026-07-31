let depthWorker;
let requestSequence = 0;
const pendingRequests = new Map();
const depthCache = new Map();
const CACHE_LIMIT = 3;

function ensureWorker() {
  if (depthWorker) return depthWorker;

  depthWorker = new Worker(new URL("./depthWorker.js", import.meta.url), {
    type: "module",
  });
  depthWorker.addEventListener("message", (event) => {
    const request = pendingRequests.get(event.data?.requestId);
    if (!request) return;

    if (event.data.type === "progress") {
      request.onProgress?.(event.data.progress);
      return;
    }

    if (event.data.type === "backend-fallback") {
      request.onFallback?.(event.data.message);
      return;
    }

    pendingRequests.delete(event.data.requestId);
    if (event.data.type === "error") {
      request.reject(new Error(event.data.message || "Depth estimation failed."));
      return;
    }

    if (event.data.type === "result") {
      const result = {
        backend: event.data.backend,
        data: new Uint8Array(event.data.data),
        height: event.data.height,
        width: event.data.width,
      };
      depthCache.set(request.cacheKey, result);
      while (depthCache.size > CACHE_LIMIT) {
        depthCache.delete(depthCache.keys().next().value);
      }
      request.resolve(result);
    }
  });
  depthWorker.addEventListener("error", (event) => {
    const error = new Error(event.message || "The AI depth worker stopped unexpectedly.");
    pendingRequests.forEach(({ reject }) => reject(error));
    pendingRequests.clear();
    depthWorker?.terminate();
    depthWorker = undefined;
  });

  return depthWorker;
}

export function estimateImageDepth({ cacheKey, imageBitmap, onFallback, onProgress }) {
  const cached = depthCache.get(cacheKey);
  if (cached) {
    imageBitmap.close();
    return Promise.resolve(cached);
  }

  const requestId = requestSequence + 1;
  requestSequence = requestId;
  return new Promise((resolve, reject) => {
    pendingRequests.set(requestId, {
      cacheKey,
      onFallback,
      onProgress,
      reject,
      resolve,
    });
    ensureWorker().postMessage(
      { type: "estimate", imageBitmap, requestId },
      [imageBitmap],
    );
  });
}
