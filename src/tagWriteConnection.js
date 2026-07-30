export function canActivateTagWriteConnection({
  pendingConnection,
  activeConnection,
  committedGeneration,
  projection,
  stereo,
}) {
  return Boolean(
    pendingConnection &&
      pendingConnection.generation === committedGeneration &&
      isCurrentTagWriteConnection(activeConnection, pendingConnection) &&
      hasTagWriteTarget(pendingConnection) &&
      pendingConnection.projection === projection &&
      pendingConnection.stereo === stereo,
  );
}

function hasTagWriteTarget(connection) {
  return Boolean(
    typeof connection?.libraryPath === "string" &&
      connection.libraryPath.length > 0 &&
      typeof connection.targetItemId === "string" &&
      connection.targetItemId.length > 0 &&
      typeof connection.targetFilePath === "string" &&
      connection.targetFilePath.length > 0,
  );
}

export function isCurrentTagWriteConnection(activeConnection, expectedConnection) {
  return Boolean(
    activeConnection &&
      expectedConnection &&
      activeConnection.generation === expectedConnection.generation &&
      activeConnection.item === expectedConnection.item,
  );
}

export function isCurrentTagWriteTarget({
  connection,
  currentLibraryPath,
  freshItem,
}) {
  if (
    !hasTagWriteTarget(connection) ||
    typeof currentLibraryPath !== "string" ||
    connection.libraryPath !== currentLibraryPath
  ) {
    return false;
  }

  if (freshItem === undefined) return true;

  return Boolean(
    freshItem &&
      freshItem.id === connection.targetItemId &&
      freshItem.isDeleted !== true &&
      freshItem.filePath === connection.targetFilePath,
  );
}

export function isCurrentTagWriteRequest({
  activeConnection,
  expectedConnection,
  blocked,
  writeEnabled,
  currentWriteSession,
  expectedWriteSession,
}) {
  return Boolean(
    !blocked &&
      writeEnabled &&
      currentWriteSession === expectedWriteSession &&
      isCurrentTagWriteConnection(activeConnection, expectedConnection),
  );
}

export function isLatestTagWriteRequest({
  currentRequestSequence,
  expectedRequestSequence,
  ...request
}) {
  return (
    currentRequestSequence === expectedRequestSequence &&
    isCurrentTagWriteRequest(request)
  );
}
