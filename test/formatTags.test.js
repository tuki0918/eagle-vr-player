import assert from "node:assert/strict";
import test from "node:test";

import {
  buildFormatTags,
  detectFormatFromTags,
  loadFreshEagleItem,
  saveFormatTags,
} from "../src/formatTags.js";

test("replaces only managed format tags and preserves all other tags", () => {
  const originalTags = [
    "travel",
    "vr:creator=yuta",
    "VR:projection=VR360",
    "vr:calibration=custom",
    " vr:mode=TB ",
    "vr:projection-note=keep",
    "vr:mode-note=keep",
  ];

  const result = buildFormatTags(originalTags, "VR180", "SBS");

  assert.deepEqual(result, [
    "travel",
    "vr:creator=yuta",
    "vr:calibration=custom",
    "vr:projection-note=keep",
    "vr:mode-note=keep",
    "vr:projection=VR180",
    "vr:mode=SBS",
  ]);
  assert.deepEqual(originalTags, [
    "travel",
    "vr:creator=yuta",
    "VR:projection=VR360",
    "vr:calibration=custom",
    " vr:mode=TB ",
    "vr:projection-note=keep",
    "vr:mode-note=keep",
  ]);
});

test("collapses duplicate and unrecognized managed tags into canonical tags", () => {
  const result = buildFormatTags(
    [
      "vr:projection=unknown",
      "vr:projection=VR360",
      "vr:mode=unknown",
      "VR:MODE=TB",
      "vr:model=keep",
    ],
    "VR180",
    "Mono",
  );

  assert.deepEqual(result, [
    "vr:model=keep",
    "vr:projection=VR180",
    "vr:mode=Mono",
  ]);
});

test("continues to detect managed and legacy format tags", () => {
  assert.deepEqual(
    detectFormatFromTags(["vr:projection=VR360", "vr:mode=TB"]),
    { projection: "VR360", stereo: "Top/Bottom" },
  );
  assert.deepEqual(
    detectFormatFromTags(["VR180", "Mono", "vr:custom=keep"]),
    { projection: "VR180", stereo: "Mono" },
  );
});

test("saves the narrowed tag update", async () => {
  let savedTags;
  let saveCalls = 0;
  const eagleItem = {
    tags: ["vr:custom=keep", "vr:projection=VR360", "vr:mode=TB"],
    async save() {
      saveCalls += 1;
      savedTags = [...this.tags];
      return true;
    },
  };

  await saveFormatTags(eagleItem, "VR180", "SBS");

  assert.equal(saveCalls, 1);
  assert.deepEqual(savedTags, [
    "vr:custom=keep",
    "vr:projection=VR180",
    "vr:mode=SBS",
  ]);
  assert.deepEqual(eagleItem.tags, savedTags);
});

test("restores the exact original tags when saving rejects", async () => {
  const saveError = new Error("write failed");
  const originalTags = [
    "travel",
    "vr:projection=VR360",
    "vr:custom=keep",
    "vr:mode=TB",
  ];
  const eagleItem = {
    tags: [...originalTags],
    async save() {
      throw saveError;
    },
  };

  await assert.rejects(
    saveFormatTags(eagleItem, "VR180", "Mono"),
    (error) => error === saveError,
  );
  assert.deepEqual(eagleItem.tags, originalTags);
});

test("restores the exact original tags when Eagle reports an unsuccessful save", async () => {
  const originalTags = ["vr:projection=VR360", "vr:custom=keep", "vr:mode=TB"];
  const eagleItem = {
    tags: [...originalTags],
    async save() {
      return false;
    },
  };

  await assert.rejects(
    saveFormatTags(eagleItem, "VR180", "Mono"),
    /Eagle did not save the format tags/,
  );
  assert.deepEqual(eagleItem.tags, originalTags);
});

test("refreshes the Eagle item before saving so newly added tags are preserved", async () => {
  const staleItem = {
    id: "item-1",
    tags: ["vr:projection=VR360", "vr:mode=TB"],
  };
  const freshItem = {
    id: "item-1",
    tags: [
      "added-in-eagle",
      "vr:creator=another-tool",
      "vr:projection=VR360",
      "vr:mode=TB",
    ],
    async save() {
      return true;
    },
  };
  const itemApi = {
    async get(options) {
      assert.deepEqual(options, { id: staleItem.id });
      return [freshItem];
    },
  };

  const writableItem = await loadFreshEagleItem(itemApi, staleItem.id);
  await saveFormatTags(writableItem, "VR180", "Mono");

  assert.deepEqual(writableItem.tags, [
    "added-in-eagle",
    "vr:creator=another-tool",
    "vr:projection=VR180",
    "vr:mode=Mono",
  ]);
  assert.deepEqual(staleItem.tags, ["vr:projection=VR360", "vr:mode=TB"]);
});

test("fails closed when Eagle returns tags in an unexpected shape", async () => {
  let saveCalls = 0;
  const unexpectedTags = new Set(["keep-me", "vr:custom=keep"]);
  const eagleItem = {
    tags: unexpectedTags,
    async save() {
      saveCalls += 1;
      return true;
    },
  };

  await assert.rejects(
    saveFormatTags(eagleItem, "VR180", "Mono"),
    /Eagle item tags must be an array/,
  );
  assert.equal(saveCalls, 0);
  assert.equal(eagleItem.tags, unexpectedTags);
});
