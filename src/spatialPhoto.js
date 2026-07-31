export const SPATIAL_MAX_YAW = 7;
export const SPATIAL_MAX_PITCH = 5;

export function getPhotoPlaneSize(width, height) {
  const safeWidth = Number.isFinite(width) && width > 0 ? width : 1;
  const safeHeight = Number.isFinite(height) && height > 0 ? height : 1;
  const aspect = safeWidth / safeHeight;

  if (aspect >= 1) {
    return { height: 2 / aspect, width: 2 };
  }
  return { height: 2, width: 2 * aspect };
}

export function getPhotoGeometrySegments(width, height) {
  const { width: planeWidth, height: planeHeight } = getPhotoPlaneSize(width, height);
  const longestSideSegments = 192;

  if (planeWidth >= planeHeight) {
    return {
      x: longestSideSegments,
      y: Math.max(64, Math.round(longestSideSegments * (planeHeight / planeWidth))),
    };
  }
  return {
    x: Math.max(64, Math.round(longestSideSegments * (planeWidth / planeHeight))),
    y: longestSideSegments,
  };
}

export function getSpatialCameraPosition(yaw, pitch) {
  return {
    x: (yaw / SPATIAL_MAX_YAW) * 0.48,
    y: (-pitch / SPATIAL_MAX_PITCH) * 0.28,
  };
}
