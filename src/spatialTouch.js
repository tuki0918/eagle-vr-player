export const SPATIAL_TOUCH_RADIUS = 0.34;

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function getSpatialTouchWeight(distance, radius, depthDifference = 0) {
  if (!Number.isFinite(distance) || !Number.isFinite(radius) || radius <= 0 || distance >= radius) {
    return 0;
  }

  const proximity = 1 - clamp(distance / radius, 0, 1);
  const smoothProximity = proximity * proximity * (3 - 2 * proximity);
  const depthAffinity = Math.exp(-Math.max(0, depthDifference) / 34);
  return smoothProximity * depthAffinity;
}

export function stepSpatialTouchSpring(
  state,
  deltaSeconds,
  { damping = 8.5, stiffness = 62 } = {},
) {
  const delta = clamp(Number.isFinite(deltaSeconds) ? deltaSeconds : 0, 0, 1 / 30);
  const nextVelocityX = (state.velocityX - state.offsetX * stiffness * delta)
    * Math.exp(-damping * delta);
  const nextVelocityY = (state.velocityY - state.offsetY * stiffness * delta)
    * Math.exp(-damping * delta);

  return {
    offsetX: state.offsetX + nextVelocityX * delta,
    offsetY: state.offsetY + nextVelocityY * delta,
    velocityX: nextVelocityX,
    velocityY: nextVelocityY,
  };
}

export function getTapJiggleStrength(pointerTravel) {
  if (!Number.isFinite(pointerTravel)) return 0;
  return pointerTravel < 9 ? 1 : clamp(0.34 + pointerTravel / 180, 0.34, 0.82);
}
