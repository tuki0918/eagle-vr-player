import assert from "node:assert/strict";
import test from "node:test";

import {
  canActivateTagWriteConnection,
  isCurrentTagWriteConnection,
  isCurrentTagWriteRequest,
  isCurrentTagWriteTarget,
  isLatestTagWriteRequest,
} from "../src/tagWriteConnection.js";

const itemA = { id: "A", filePath: "/Library A/images/A.info/a.jpg" };
const itemB = { id: "B", filePath: "/Library A/images/B.info/b.jpg" };

function createConnection(item, generation) {
  return {
    item,
    generation,
    libraryPath: "/Library A",
    targetItemId: item.id,
    targetFilePath: item.filePath,
  };
}

test("does not activate a future connection from an older render", () => {
  const pendingConnection = {
    ...createConnection(itemB, 2),
    projection: "VR360",
    stereo: "SBS",
  };

  assert.equal(
    canActivateTagWriteConnection({
      pendingConnection,
      activeConnection: pendingConnection,
      committedGeneration: 1,
      projection: "VR360",
      stereo: "SBS",
    }),
    false,
  );
});

test("waits for the detected format and connection generation to commit together", () => {
  const pendingConnection = {
    ...createConnection(itemB, 2),
    projection: "VR360",
    stereo: "SBS",
  };

  assert.equal(
    canActivateTagWriteConnection({
      pendingConnection,
      activeConnection: pendingConnection,
      committedGeneration: 2,
      projection: "VR180",
      stereo: "Mono",
    }),
    false,
  );
  assert.equal(
    canActivateTagWriteConnection({
      pendingConnection,
      activeConnection: pendingConnection,
      committedGeneration: 2,
      projection: "VR360",
      stereo: "SBS",
    }),
    true,
  );
});

test("rejects stale A-to-B-to-A writes even when Eagle reuses the item object", () => {
  const firstAConnection = createConnection(itemA, 1);
  const secondAConnection = createConnection(itemA, 3);

  assert.equal(
    isCurrentTagWriteConnection(secondAConnection, firstAConnection),
    false,
  );
  assert.equal(
    isCurrentTagWriteConnection(secondAConnection, secondAConnection),
    true,
  );
});

test("invalidates an in-flight write when writing is turned off", () => {
  const connection = createConnection(itemA, 1);

  assert.equal(
    isCurrentTagWriteRequest({
      activeConnection: connection,
      expectedConnection: connection,
      blocked: false,
      writeEnabled: true,
      currentWriteSession: 2,
      expectedWriteSession: 1,
    }),
    false,
  );
  assert.equal(
    isCurrentTagWriteRequest({
      activeConnection: connection,
      expectedConnection: connection,
      blocked: false,
      writeEnabled: false,
      currentWriteSession: 1,
      expectedWriteSession: 1,
    }),
    false,
  );
});

test("accepts a write only for the current connection and write session", () => {
  const connection = createConnection(itemA, 1);

  assert.equal(
    isCurrentTagWriteRequest({
      activeConnection: connection,
      expectedConnection: connection,
      blocked: false,
      writeEnabled: true,
      currentWriteSession: 1,
      expectedWriteSession: 1,
    }),
    true,
  );
});

test("updates completion status only for the latest write request", () => {
  const connection = createConnection(itemA, 1);
  const request = {
    activeConnection: connection,
    expectedConnection: connection,
    blocked: false,
    writeEnabled: true,
    currentWriteSession: 1,
    expectedWriteSession: 1,
    currentRequestSequence: 2,
  };

  assert.equal(
    isLatestTagWriteRequest({
      ...request,
      expectedRequestSequence: 1,
    }),
    false,
  );
  assert.equal(
    isLatestTagWriteRequest({
      ...request,
      expectedRequestSequence: 2,
    }),
    true,
  );
});

test("binds tag writes to the library and item path captured at connection time", () => {
  const connection = createConnection(itemA, 1);
  const freshItem = {
    id: itemA.id,
    filePath: itemA.filePath,
    isDeleted: false,
  };

  assert.equal(
    isCurrentTagWriteTarget({
      connection,
      currentLibraryPath: "/Library A",
      freshItem,
    }),
    true,
  );
  assert.equal(
    isCurrentTagWriteTarget({
      connection,
      currentLibraryPath: "/Library B",
      freshItem: {
        ...freshItem,
        filePath: "/Library B/images/A.info/a.jpg",
      },
    }),
    false,
  );
  assert.equal(
    isCurrentTagWriteTarget({
      connection,
      currentLibraryPath: "/library a",
      freshItem,
    }),
    false,
  );
  assert.equal(
    isCurrentTagWriteTarget({
      connection,
      currentLibraryPath: "/Library A/",
      freshItem,
    }),
    false,
  );
  assert.equal(
    isCurrentTagWriteTarget({
      connection,
      currentLibraryPath: "",
      freshItem,
    }),
    false,
  );
  assert.equal(
    isCurrentTagWriteTarget({
      connection,
      currentLibraryPath: "/Library A",
      freshItem: {
        ...freshItem,
        id: "B",
      },
    }),
    false,
  );
  assert.equal(
    isCurrentTagWriteTarget({
      connection,
      currentLibraryPath: "/Library A",
      freshItem: {
        ...freshItem,
        filePath: "/Library A/images/A.info/renamed.jpg",
      },
    }),
    false,
  );
  assert.equal(
    isCurrentTagWriteTarget({
      connection,
      currentLibraryPath: "/Library A",
      freshItem: {
        ...freshItem,
        isDeleted: true,
      },
    }),
    false,
  );
});

test("does not activate tag writing without a complete target identity", () => {
  const pendingConnection = {
    item: itemA,
    generation: 1,
    projection: "VR180",
    stereo: "Mono",
  };

  assert.equal(
    canActivateTagWriteConnection({
      pendingConnection,
      activeConnection: pendingConnection,
      committedGeneration: 1,
      projection: "VR180",
      stereo: "Mono",
    }),
    false,
  );
});
