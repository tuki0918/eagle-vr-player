import assert from "node:assert/strict";
import test from "node:test";

import {
  getPhotoGeometrySegments,
  getPhotoPlaneSize,
  getSpatialCameraPosition,
} from "../src/spatialPhoto.js";

test("fits landscape and portrait photos into the same two-unit frame", () => {
  assert.deepEqual(getPhotoPlaneSize(1600, 800), { width: 2, height: 1 });
  assert.deepEqual(getPhotoPlaneSize(800, 1600), { width: 1, height: 2 });
});

test("keeps enough mesh detail on the short photo edge", () => {
  assert.deepEqual(getPhotoGeometrySegments(3200, 400), { x: 192, y: 64 });
  assert.deepEqual(getPhotoGeometrySegments(400, 3200), { x: 64, y: 192 });
});

test("maps full drag limits to noticeable camera travel", () => {
  assert.deepEqual(getSpatialCameraPosition(7, 5), { x: 0.48, y: -0.28 });
  assert.deepEqual(getSpatialCameraPosition(-7, -5), { x: -0.48, y: 0.28 });
});
