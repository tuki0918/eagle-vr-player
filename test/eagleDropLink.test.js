import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import {
  getNativeDroppedPath,
  loadDroppedEagleItem,
} from "../src/eagleDropLink.js";

const libraryPath = "/Users/test/VR.library";
const itemPath = `${libraryPath}/images/ABC123.info/panorama.mp4`;

function createEagle({
  currentLibraryPath = libraryPath,
  items = [],
  get = async () => items,
  getSelected,
  getById,
} = {}) {
  return {
    library: { path: currentLibraryPath },
    item: {
      get,
      ...(getSelected ? { getSelected } : {}),
      ...(getById ? { getById } : {}),
    },
  };
}

test("returns a refreshed item for a dropped file inside the current library", async () => {
  const item = {
    id: "ABC123",
    filePath: itemPath,
    isDeleted: false,
  };
  const calls = [];
  const eagleApi = createEagle({
    get: async (options) => {
      calls.push(options);
      return [item];
    },
  });

  const result = await loadDroppedEagleItem({
    file: { path: itemPath },
    eagleApi,
    selectedItems: [],
    pathApi: path.posix,
  });

  assert.equal(result, item);
  assert.deepEqual(calls, [{ id: "ABC123" }]);
});

test("rejects dropped files outside the current library without querying items", async () => {
  let getCalls = 0;
  const eagleApi = createEagle({
    get: async () => {
      getCalls += 1;
      return [];
    },
  });

  const result = await loadDroppedEagleItem({
    file: { path: "/Users/test/other/clip.mp4" },
    eagleApi,
    selectedItems: [],
    pathApi: path.posix,
  });

  assert.equal(result, null);
  assert.equal(getCalls, 0);
});

test("rejects library prefix collisions", async () => {
  let getCalls = 0;
  const eagleApi = createEagle({
    get: async () => {
      getCalls += 1;
      return [];
    },
  });

  const result = await loadDroppedEagleItem({
    file: {
      path: "/Users/test/VR.library-copy/images/ABC123.info/panorama.mp4",
    },
    eagleApi,
    selectedItems: [],
    pathApi: path.posix,
  });

  assert.equal(result, null);
  assert.equal(getCalls, 0);
});

test("rejects thumbnails and other non-item paths after exact verification", async () => {
  const item = {
    id: "ABC123",
    filePath: itemPath,
    isDeleted: false,
  };
  const eagleApi = createEagle({ items: [item] });

  const thumbnailResult = await loadDroppedEagleItem({
    file: { path: `${libraryPath}/images/ABC123.info/thumbnail.png` },
    eagleApi,
    pathApi: path.posix,
  });
  const nestedResult = await loadDroppedEagleItem({
    file: { path: `${libraryPath}/images/ABC123.info/previews/panorama.mp4` },
    eagleApi,
    pathApi: path.posix,
  });

  assert.equal(thumbnailResult, null);
  assert.equal(nestedResult, null);
});

test("uses an exact selected-item path as the candidate ID", async () => {
  const selectedItem = {
    id: "ABC123",
    filePath: itemPath,
    isDeleted: false,
  };
  const calls = [];
  const eagleApi = createEagle({
    get: async (options) => {
      calls.push(options);
      return [selectedItem];
    },
  });

  const result = await loadDroppedEagleItem({
    file: { path: itemPath },
    eagleApi,
    selectedItems: [selectedItem],
    pathApi: path.posix,
  });

  assert.equal(result, selectedItem);
  assert.deepEqual(calls, [{ id: "ABC123" }]);
});

test("loads selected items internally when they are not supplied", async () => {
  const selectedItem = {
    id: "ABC123",
    filePath: itemPath,
    isDeleted: false,
  };
  let idLookupCalls = 0;
  const eagleApi = createEagle({
    getSelected: async () => [selectedItem],
    get: async (options) => {
      if ("id" in options) {
        idLookupCalls += 1;
        return [selectedItem];
      }
      return [];
    },
  });

  const result = await loadDroppedEagleItem({
    file: { path: itemPath },
    eagleApi,
    pathApi: path.posix,
  });

  assert.equal(result, selectedItem);
  assert.equal(idLookupCalls, 1);
});

test("finds the exact path among multiple selected items", async () => {
  const firstItem = {
    id: "OTHER",
    filePath: `${libraryPath}/images/OTHER.info/panorama.mp4`,
  };
  const matchingItem = {
    id: "ABC123",
    filePath: itemPath,
  };

  const result = await loadDroppedEagleItem({
    file: { path: itemPath },
    eagleApi: createEagle({ items: [matchingItem] }),
    selectedItems: [firstItem, matchingItem],
    pathApi: path.posix,
  });

  assert.equal(result, matchingItem);
});

test("fails closed when multiple selected items have the exact dropped path", async () => {
  const firstMatch = {
    id: "ABC123",
    filePath: itemPath,
  };
  const secondMatch = {
    id: "OTHER",
    filePath: itemPath,
  };
  let getCalls = 0;
  const eagleApi = createEagle({
    get: async () => {
      getCalls += 1;
      return [];
    },
  });

  const result = await loadDroppedEagleItem({
    file: { path: itemPath },
    eagleApi,
    selectedItems: [firstMatch, secondMatch],
    pathApi: path.posix,
  });

  assert.equal(result, null);
  assert.equal(getCalls, 0);
});

test("falls back to ID verification when selected-item lookup fails", async () => {
  const item = {
    id: "ABC123",
    filePath: itemPath,
    isDeleted: false,
  };
  const calls = [];
  const eagleApi = createEagle({
    getSelected: async () => {
      throw new Error("selection unavailable");
    },
    get: async (options) => {
      calls.push(options);
      if (options.isSelected) throw new Error("selection unavailable");
      return [item];
    },
  });

  const result = await loadDroppedEagleItem({
    file: { path: itemPath },
    eagleApi,
    pathApi: path.posix,
  });

  assert.equal(result, item);
  assert.deepEqual(calls, [{ isSelected: true }, { id: "ABC123" }]);
});

test("rejects an item whose path changed before the ID lookup completed", async () => {
  const movedItem = {
    id: "ABC123",
    filePath: `${libraryPath}/images/ABC123.info/renamed.mp4`,
    isDeleted: false,
  };

  const result = await loadDroppedEagleItem({
    file: { path: itemPath },
    eagleApi: createEagle({ items: [movedItem] }),
    pathApi: path.posix,
  });

  assert.equal(result, null);
});

test("rejects an item that is in the trash", async () => {
  const deletedItem = {
    id: "ABC123",
    filePath: itemPath,
    isDeleted: true,
  };

  const result = await loadDroppedEagleItem({
    file: { path: itemPath },
    eagleApi: createEagle({ items: [deletedItem] }),
    pathApi: path.posix,
  });

  assert.equal(result, null);
});

test("rejects an exact selected path outside the current library", async () => {
  const outsidePath = "/Users/test/other/panorama.mp4";
  const selectedItem = {
    id: "OUTSIDE",
    filePath: outsidePath,
  };
  let getCalls = 0;
  const eagleApi = createEagle({
    get: async () => {
      getCalls += 1;
      return [selectedItem];
    },
  });

  const result = await loadDroppedEagleItem({
    file: { path: outsidePath },
    eagleApi,
    selectedItems: [selectedItem],
    pathApi: path.posix,
  });

  assert.equal(result, null);
  assert.equal(getCalls, 0);
});

test("rejects a match if the active library changes during verification", async () => {
  const item = {
    id: "ABC123",
    filePath: itemPath,
    isDeleted: false,
  };
  const eagleApi = createEagle();
  eagleApi.item.get = async () => {
    eagleApi.library.path = "/Users/test/Other.library";
    return [item];
  };

  const result = await loadDroppedEagleItem({
    file: { path: itemPath },
    eagleApi,
    selectedItems: [],
    pathApi: path.posix,
  });

  assert.equal(result, null);
});

test("uses Electron webUtils when the legacy File.path property is unavailable", async () => {
  const file = { name: "panorama.mp4" };
  const seenSpecifiers = [];
  const requireFn = (specifier) => {
    seenSpecifiers.push(specifier);
    if (specifier === "electron") {
      return {
        webUtils: {
          getPathForFile(candidate) {
            assert.equal(candidate, file);
            return itemPath;
          },
        },
      };
    }
    throw new Error(`Unexpected module: ${specifier}`);
  };

  assert.equal(getNativeDroppedPath(file, requireFn), itemPath);
  assert.deepEqual(seenSpecifiers, ["electron"]);
});

test("prefers Electron webUtils over the legacy File.path property", () => {
  const file = {
    name: "panorama.mp4",
    path: "/Users/test/outside/panorama.mp4",
  };
  const requireFn = (specifier) => {
    assert.equal(specifier, "electron");
    return {
      webUtils: {
        getPathForFile(candidate) {
          assert.equal(candidate, file);
          return itemPath;
        },
      },
    };
  };

  assert.equal(getNativeDroppedPath(file, requireFn), itemPath);
});

test("does not fall back to File.path when webUtils returns no native path", () => {
  const file = {
    name: "synthetic.mp4",
    path: itemPath,
  };
  const requireFn = (specifier) => {
    assert.equal(specifier, "electron");
    return {
      webUtils: {
        getPathForFile(candidate) {
          assert.equal(candidate, file);
          return "";
        },
      },
    };
  };

  assert.equal(getNativeDroppedPath(file, requireFn), null);
});

test("does not fall back to File.path when webUtils rejects a file", () => {
  const file = {
    name: "synthetic.mp4",
    path: itemPath,
  };
  const requireFn = (specifier) => {
    assert.equal(specifier, "electron");
    return {
      webUtils: {
        getPathForFile() {
          throw new TypeError("Not a native File");
        },
      },
    };
  };

  assert.equal(getNativeDroppedPath(file, requireFn), null);
});

test("uses legacy File.path only when webUtils is unavailable", () => {
  const file = {
    name: "panorama.mp4",
    path: itemPath,
  };
  const requireFn = (specifier) => {
    assert.equal(specifier, "electron");
    return {};
  };

  assert.equal(getNativeDroppedPath(file, requireFn), itemPath);
});

test("matches Windows library paths case-insensitively after exact item verification", async () => {
  const windowsLibraryPath = "C:\\Users\\Test\\VR.library";
  const droppedPath =
    "c:\\users\\test\\vr.library\\IMAGES\\abc123.INFO\\PANORAMA.MP4";
  const item = {
    id: "ABC123",
    filePath: droppedPath,
    isDeleted: false,
  };

  const result = await loadDroppedEagleItem({
    file: { path: droppedPath },
    eagleApi: createEagle({
      currentLibraryPath: windowsLibraryPath,
      items: [item],
    }),
    pathApi: path.win32,
  });

  assert.equal(result, item);
});

test("rejects Windows item paths that differ only by case", async () => {
  const windowsLibraryPath = "C:\\Users\\test\\VR.library";
  const droppedPath =
    "C:\\Users\\test\\VR.library\\images\\ABC123.info\\panorama.mp4";
  const item = {
    id: "ABC123",
    filePath:
      "C:\\Users\\test\\VR.library\\images\\ABC123.info\\Panorama.mp4",
    isDeleted: false,
  };

  const result = await loadDroppedEagleItem({
    file: { path: droppedPath },
    eagleApi: createEagle({
      currentLibraryPath: windowsLibraryPath,
      items: [item],
    }),
    selectedItems: [],
    pathApi: path.win32,
  });

  assert.equal(result, null);
});

test("rejects normalized-equivalent item paths containing parent segments", async () => {
  const nonLiteralPath =
    `${libraryPath}/images/unused/../ABC123.info/panorama.mp4`;
  const item = {
    id: "ABC123",
    filePath: itemPath,
    isDeleted: false,
  };

  const result = await loadDroppedEagleItem({
    file: { path: nonLiteralPath },
    eagleApi: createEagle({ items: [item] }),
    selectedItems: [],
    pathApi: path.posix,
  });

  assert.equal(result, null);
});

test("does not collapse distinct Unicode path spellings", async () => {
  const composedPath =
    "C:\\Users\\test\\VR.library\\images\\ABC123.info\\café.mp4";
  const decomposedPath =
    "C:\\Users\\test\\VR.library\\images\\ABC123.info\\café.mp4";
  const item = {
    id: "ABC123",
    filePath: composedPath,
    isDeleted: false,
  };

  const result = await loadDroppedEagleItem({
    file: { path: decomposedPath },
    eagleApi: createEagle({
      currentLibraryPath: "C:\\Users\\test\\VR.library",
      items: [item],
    }),
    selectedItems: [],
    pathApi: path.win32,
  });

  assert.equal(result, null);
});

test("accepts an equivalent documented library-change path on Windows", async () => {
  const windowsLibraryPath = "C:\\Users\\test\\VR.library";
  const windowsItemPath =
    "C:\\Users\\test\\VR.library\\images\\ABC123.info\\panorama.mp4";
  const item = {
    id: "ABC123",
    filePath: windowsItemPath,
    isDeleted: false,
  };

  const result = await loadDroppedEagleItem({
    file: { path: windowsItemPath },
    eagleApi: createEagle({
      currentLibraryPath: windowsLibraryPath,
      items: [item],
    }),
    expectedLibraryPath: "c:\\users\\test\\vr.library\\",
    selectedItems: [],
    pathApi: path.win32,
  });

  assert.equal(result, item);
});

test("rejects a library-change callback for a different library", async () => {
  let getCalls = 0;
  const eagleApi = createEagle({
    get: async () => {
      getCalls += 1;
      return [];
    },
  });

  const result = await loadDroppedEagleItem({
    file: { path: itemPath },
    eagleApi,
    expectedLibraryPath: "/Users/test/Other.library",
    selectedItems: [],
    pathApi: path.posix,
  });

  assert.equal(result, null);
  assert.equal(getCalls, 0);
});

test("fails closed when required runtime data is unavailable", async () => {
  assert.equal(
    await loadDroppedEagleItem({
      file: { path: itemPath },
      eagleApi: createEagle({ currentLibraryPath: "" }),
      pathApi: path.posix,
    }),
    null,
  );
  assert.equal(
    await loadDroppedEagleItem({
      file: { name: "panorama.mp4" },
      eagleApi: createEagle(),
      pathApi: path.posix,
      requireFn: () => {
        throw new Error("unavailable");
      },
    }),
    null,
  );
  assert.equal(
    await loadDroppedEagleItem({
      file: { path: itemPath },
      eagleApi: createEagle(),
      requireFn: () => {
        throw new Error("unavailable");
      },
    }),
    null,
  );
});

test("lets Eagle item API exceptions propagate", async () => {
  const apiError = new Error("Eagle query failed");

  await assert.rejects(
    loadDroppedEagleItem({
      file: { path: itemPath },
      eagleApi: createEagle({
        get: async () => {
          throw apiError;
        },
      }),
      pathApi: path.posix,
    }),
    (error) => error === apiError,
  );
});

test("uses getById when available and lets its exceptions propagate", async () => {
  const apiError = new Error("Eagle getById failed");

  await assert.rejects(
    loadDroppedEagleItem({
      file: { path: itemPath },
      eagleApi: createEagle({
        getById: async () => {
          throw apiError;
        },
      }),
      selectedItems: [],
      pathApi: path.posix,
    }),
    (error) => error === apiError,
  );
});
