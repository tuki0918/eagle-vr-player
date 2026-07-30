function getRuntimeRequire(requireFn) {
  if (typeof requireFn === "function") return requireFn;
  return typeof globalThis.require === "function" ? globalThis.require : null;
}

function loadRuntimeModule(requireFn, specifiers) {
  const runtimeRequire = getRuntimeRequire(requireFn);
  if (!runtimeRequire) return null;

  for (const specifier of specifiers) {
    try {
      const module = runtimeRequire(specifier);
      if (module) return module;
    } catch {
      // Electron and Node integrations vary by Eagle version. Missing runtime
      // modules are treated as unavailable rather than linking an unsafe item.
    }
  }

  return null;
}

export function getNativeDroppedPath(file, requireFn) {
  if (!file) return null;

  const electron = loadRuntimeModule(requireFn, ["electron"]);
  const getPathForFile = electron?.webUtils?.getPathForFile;
  if (typeof getPathForFile === "function") {
    try {
      const filePath = getPathForFile.call(electron.webUtils, file);
      if (typeof filePath === "string" && filePath.length > 0) {
        return filePath;
      }
    } catch {
      // Fall through to Eagle 4's legacy File.path support.
    }
  }

  try {
    if (typeof file.path === "string" && file.path.length > 0) {
      return file.path;
    }
  } catch {
    return null;
  }

  return null;
}

function getPathApi(pathApi, requireFn) {
  if (pathApi) return pathApi;
  return loadRuntimeModule(requireFn, ["node:path", "path"]);
}

function isUsablePathApi(pathApi) {
  return (
    typeof pathApi?.normalize === "function" &&
    typeof pathApi?.parse === "function" &&
    typeof pathApi?.relative === "function" &&
    typeof pathApi?.isAbsolute === "function" &&
    typeof pathApi?.sep === "string"
  );
}

function normalizePath(filePath, pathApi) {
  if (typeof filePath !== "string" || filePath.length === 0) return null;

  let normalized = pathApi.normalize(filePath);
  const root = pathApi.parse(normalized).root;
  while (normalized.length > root.length && normalized.endsWith(pathApi.sep)) {
    normalized = normalized.slice(0, -pathApi.sep.length);
  }
  return normalized;
}

function pathsMatch(left, right, pathApi) {
  const normalizedLeft = normalizePath(left, pathApi);
  const normalizedRight = normalizePath(right, pathApi);
  if (normalizedLeft === null || normalizedRight === null) return false;
  return pathApi.sep === "\\"
    ? normalizedLeft.toLowerCase() === normalizedRight.toLowerCase()
    : normalizedLeft === normalizedRight;
}

function pathsMatchExactly(left, right, pathApi) {
  const normalizedLeft = normalizePath(left, pathApi);
  const normalizedRight = normalizePath(right, pathApi);
  return normalizedLeft !== null && normalizedLeft === normalizedRight;
}

function segmentMatches(left, right, pathApi) {
  if (pathApi.sep === "\\") {
    return left.toLowerCase() === right.toLowerCase();
  }
  return left === right;
}

function isInsideLibrary(relativePath, pathApi) {
  return Boolean(
    relativePath &&
      !pathApi.isAbsolute(relativePath) &&
      relativePath !== ".." &&
      !relativePath.startsWith(`..${pathApi.sep}`),
  );
}

function parseItemId(relativePath, pathApi) {
  const segments = relativePath.split(pathApi.sep);
  if (
    segments.length !== 3 ||
    !segmentMatches(segments[0], "images", pathApi) ||
    !segments[2]
  ) {
    return null;
  }

  const infoDirectory = segments[1];
  const infoSuffix = ".info";
  const hasInfoSuffix =
    pathApi.sep === "\\"
      ? infoDirectory.toLowerCase().endsWith(infoSuffix)
      : infoDirectory.endsWith(infoSuffix);
  if (!hasInfoSuffix) return null;

  const itemId = infoDirectory.slice(0, -infoSuffix.length);
  return itemId || null;
}

async function loadSelectedItems(itemApi) {
  if (typeof itemApi?.getSelected === "function") {
    try {
      const selectedItems = await itemApi.getSelected();
      if (Array.isArray(selectedItems)) return selectedItems;
    } catch {
      // Selection is only a fast path. The item ID can still be verified below.
    }
  }

  if (typeof itemApi?.get === "function") {
    try {
      const selectedItems = await itemApi.get({ isSelected: true });
      if (Array.isArray(selectedItems)) return selectedItems;
    } catch {
      // Selection is only a fast path. The item ID can still be verified below.
    }
  }

  return [];
}

async function loadItemById(itemApi, itemId) {
  if (typeof itemApi?.getById === "function") {
    const item = await itemApi.getById(itemId);
    return item ? [item] : [];
  }
  if (typeof itemApi?.get !== "function") return null;
  return itemApi.get({ id: itemId });
}

export async function loadDroppedEagleItem({
  file,
  eagleApi,
  expectedLibraryPath,
  selectedItems,
  pathApi,
  requireFn,
} = {}) {
  const libraryPath = eagleApi?.library?.path;
  if (typeof libraryPath !== "string" || libraryPath.length === 0) return null;

  const droppedPath = getNativeDroppedPath(file, requireFn);
  if (!droppedPath) return null;

  const nativePath = getPathApi(pathApi, requireFn);
  if (
    !isUsablePathApi(nativePath) ||
    !nativePath.isAbsolute(libraryPath) ||
    !nativePath.isAbsolute(droppedPath) ||
    (expectedLibraryPath !== undefined &&
      (typeof expectedLibraryPath !== "string" ||
        !nativePath.isAbsolute(expectedLibraryPath) ||
        !pathsMatch(libraryPath, expectedLibraryPath, nativePath)))
  ) {
    return null;
  }

  const relativePath = nativePath.relative(libraryPath, droppedPath);
  if (!isInsideLibrary(relativePath, nativePath)) return null;

  const currentSelectedItems = Array.isArray(selectedItems)
    ? selectedItems
    : await loadSelectedItems(eagleApi?.item);
  const selectedMatches = currentSelectedItems.filter(
    (item) => item && pathsMatch(item.filePath, droppedPath, nativePath),
  );
  if (selectedMatches.length > 1) return null;

  const selectedMatch = selectedMatches[0];
  const itemId = selectedMatch
    ? String(selectedMatch.id ?? "")
    : parseItemId(relativePath, nativePath);
  if (!itemId) return null;

  const items = await loadItemById(eagleApi?.item, itemId);
  if (!Array.isArray(items)) return null;

  const refreshedItem = items.find(
    (item) =>
      item &&
      segmentMatches(String(item.id ?? ""), itemId, nativePath) &&
      item.isDeleted !== true,
  );
  if (!refreshedItem) return null;

  const currentLibraryPath = eagleApi?.library?.path;
  if (
    !pathsMatch(currentLibraryPath, libraryPath, nativePath) ||
    !pathsMatchExactly(refreshedItem.filePath, droppedPath, nativePath)
  ) {
    return null;
  }

  return refreshedItem;
}
