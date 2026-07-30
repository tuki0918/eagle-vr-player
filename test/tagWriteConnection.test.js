import assert from "node:assert/strict";
import test from "node:test";

import {
  canActivateTagWriteConnection,
  isCurrentTagWriteConnection,
  isCurrentTagWriteRequest,
  isLatestTagWriteRequest,
} from "../src/tagWriteConnection.js";

const itemA = { id: "A" };
const itemB = { id: "B" };

test("does not activate a future connection from an older render", () => {
  const pendingConnection = {
    item: itemB,
    generation: 2,
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
    item: itemB,
    generation: 2,
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
  const firstAConnection = { item: itemA, generation: 1 };
  const secondAConnection = { item: itemA, generation: 3 };

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
  const connection = { item: itemA, generation: 1 };

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
  const connection = { item: itemA, generation: 1 };

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
  const connection = { item: itemA, generation: 1 };
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
