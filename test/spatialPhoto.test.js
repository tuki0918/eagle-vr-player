import assert from "node:assert/strict";
import test from "node:test";

import {
  getPhotoGeometrySegments,
  getPhotoPlaneSize,
  getSpatialCameraPosition,
} from "../src/spatialPhoto.js";
import {
  getSpatialTouchWeight,
  getTapJiggleStrength,
  stepSpatialTouchSpring,
} from "../src/spatialTouch.js";

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

test("limits touch deformation to a soft local region and similar depth", () => {
  assert.equal(getSpatialTouchWeight(0.34, 0.34, 0), 0);
  assert.equal(getSpatialTouchWeight(0, 0.34, 0), 1);
  assert.ok(getSpatialTouchWeight(0.1, 0.34, 0) > getSpatialTouchWeight(0.1, 0.34, 70));
});

test("returns elastic touch offsets toward rest", () => {
  const next = stepSpatialTouchSpring(
    { offsetX: 0.2, offsetY: -0.1, velocityX: 0, velocityY: 0 },
    1 / 60,
  );
  assert.ok(next.offsetX < 0.2);
  assert.ok(next.offsetY > -0.1);
  assert.ok(next.velocityX < 0);
  assert.ok(next.velocityY > 0);
});

test("gives taps a stronger jiggle than long pulls", () => {
  assert.equal(getTapJiggleStrength(2), 1);
  assert.ok(getTapJiggleStrength(60) < 1);
});
