export const FORMAT_TAG_PREFIX = "vr:";

const PROJECTION_TAGS = new Map([
  ["vr180", "VR180"],
  ["180", "VR180"],
  ["vr360", "VR360"],
  ["360", "VR360"],
]);

const STEREO_TAGS = new Map([
  ["sbs", "SBS"],
  ["sidebyside", "SBS"],
  ["tb", "Top/Bottom"],
  ["topbottom", "Top/Bottom"],
  ["mono", "Mono"],
]);

const CANONICAL_PROJECTION_TAGS = {
  VR180: `${FORMAT_TAG_PREFIX}projection=VR180`,
  VR360: `${FORMAT_TAG_PREFIX}projection=VR360`,
};

const CANONICAL_STEREO_TAGS = {
  SBS: `${FORMAT_TAG_PREFIX}mode=SBS`,
  "Top/Bottom": `${FORMAT_TAG_PREFIX}mode=TB`,
  Mono: `${FORMAT_TAG_PREFIX}mode=Mono`,
};

function normalizeTag(tag) {
  return String(tag ?? "")
    .trim()
    .toLowerCase()
    .replace(/[°_\s/\\-]+/g, "");
}

function isOwnedFormatTag(tag) {
  const normalized = String(tag ?? "").trim().toLowerCase();
  return normalized.startsWith(FORMAT_TAG_PREFIX);
}

function detectPrefixedFormat(tags, prefix) {
  let projection = null;
  let stereo = null;

  for (const tag of tags) {
    const normalized = String(tag ?? "").trim().toLowerCase();
    if (!normalized.startsWith(prefix)) continue;
    const payload = normalized.slice(prefix.length);
    if (payload.startsWith("projection=")) {
      projection = PROJECTION_TAGS.get(normalizeTag(payload.slice("projection=".length))) || projection;
    } else if (payload.startsWith("mode=")) {
      stereo = STEREO_TAGS.get(normalizeTag(payload.slice("mode=".length))) || stereo;
    }
  }

  return { projection, stereo };
}

export function detectFormatFromTags(tags = []) {
  const currentFormat = detectPrefixedFormat(tags, FORMAT_TAG_PREFIX);
  let { projection, stereo } = currentFormat;

  for (const tag of tags) {
    if (isOwnedFormatTag(tag)) continue;
    const normalized = normalizeTag(tag);
    if (!projection && PROJECTION_TAGS.has(normalized)) {
      projection = PROJECTION_TAGS.get(normalized);
    }
    if (!stereo && STEREO_TAGS.has(normalized)) {
      stereo = STEREO_TAGS.get(normalized);
    }
  }

  return { projection, stereo };
}

export function buildFormatTags(tags = [], projection, stereo) {
  const preservedTags = tags.filter((tag) => !isOwnedFormatTag(tag));
  const projectionTag = CANONICAL_PROJECTION_TAGS[projection];
  const stereoTag = CANONICAL_STEREO_TAGS[stereo];
  return [...preservedTags, ...(projectionTag ? [projectionTag] : []), ...(stereoTag ? [stereoTag] : [])];
}
