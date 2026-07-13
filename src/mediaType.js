export const VIDEO_EXTENSIONS = new Set(["mp4", "mov", "m4v", "webm", "mkv", "avi"]);

export const IMAGE_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "jfif",
  "png",
  "apng",
  "webp",
  "avif",
  "gif",
  "bmp",
  "svg",
]);

function extensionFromName(name) {
  const dotIndex = String(name || "").lastIndexOf(".");
  return dotIndex >= 0 ? String(name).slice(dotIndex + 1).toLowerCase() : "";
}

export function detectMediaType({ name = "", type = "", ext = "" } = {}) {
  const mimeType = String(type).toLowerCase();
  const extension = String(ext).replace(/^\./, "").toLowerCase() || extensionFromName(name);

  if (mimeType.startsWith("video/") || VIDEO_EXTENSIONS.has(extension)) return "video";
  if (mimeType.startsWith("image/") || IMAGE_EXTENSIONS.has(extension)) return "image";
  return null;
}
