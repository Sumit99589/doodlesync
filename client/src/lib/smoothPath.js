/**
 * Chaikin's corner-cutting algorithm for smoothing freehand paths.
 * Takes an array of {x, y} points and returns a smoothed array.
 *
 * @param {Array<{x: number, y: number}>} points - Input points
 * @param {number} iterations - Number of smoothing passes (default: 3)
 * @returns {Array<{x: number, y: number}>} Smoothed points
 */
export function smoothPath(points, iterations = 3) {
  if (points.length < 3) return points;

  let result = points;

  for (let iter = 0; iter < iterations; iter++) {
    const smoothed = [];

    // Keep the first point
    smoothed.push(result[0]);

    for (let i = 0; i < result.length - 1; i++) {
      const p0 = result[i];
      const p1 = result[i + 1];

      // Q = 3/4 * P_i + 1/4 * P_(i+1)
      smoothed.push({
        x: 0.75 * p0.x + 0.25 * p1.x,
        y: 0.75 * p0.y + 0.25 * p1.y,
      });

      // R = 1/4 * P_i + 3/4 * P_(i+1)
      smoothed.push({
        x: 0.25 * p0.x + 0.75 * p1.x,
        y: 0.25 * p0.y + 0.75 * p1.y,
      });
    }

    // Keep the last point
    smoothed.push(result[result.length - 1]);

    result = smoothed;
  }

  return result;
}
