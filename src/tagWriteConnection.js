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
      pendingConnection.projection === projection &&
      pendingConnection.stereo === stereo,
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
