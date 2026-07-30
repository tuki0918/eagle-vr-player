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

function isManagedFormatTag(tag) {
  const normalized = String(tag ?? "").trim().toLowerCase();
  return (
    normalized.startsWith(`${FORMAT_TAG_PREFIX}projection=`) ||
    normalized.startsWith(`${FORMAT_TAG_PREFIX}mode=`)
  );
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
    if (isManagedFormatTag(tag)) continue;
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
  const preservedTags = tags.filter((tag) => !isManagedFormatTag(tag));
  const projectionTag = CANONICAL_PROJECTION_TAGS[projection];
  const stereoTag = CANONICAL_STEREO_TAGS[stereo];
  return [...preservedTags, ...(projectionTag ? [projectionTag] : []), ...(stereoTag ? [stereoTag] : [])];
}

export async function loadFreshEagleItem(itemApi, itemId) {
  if (!itemApi?.get || !itemId) {
    throw new TypeError("An Eagle item API and item ID are required.");
  }

  const items = await itemApi.get({ id: itemId });
  const eagleItem = Array.isArray(items)
    ? items.find((item) => item?.id === itemId)
    : null;

  if (!eagleItem) {
    throw new Error("The Eagle item could not be refreshed before saving.");
  }

  return eagleItem;
}

export async function saveFormatTags(eagleItem, projection, stereo) {
  if (!eagleItem?.save) {
    throw new TypeError("An Eagle item with a save method is required.");
  }
  if (!Array.isArray(eagleItem.tags)) {
    throw new TypeError("Eagle item tags must be an array.");
  }

  const originalTags = [...eagleItem.tags];
  eagleItem.tags = buildFormatTags(originalTags, projection, stereo);

  try {
    const saved = await eagleItem.save();
    if (saved !== true) {
      throw new Error("Eagle did not save the format tags.");
    }
  } catch (error) {
    eagleItem.tags = originalTags;
    throw error;
  }
}
