/**
 * Display aggregates for public tutor ratings (abuse-resistant: prior smooths small samples).
 */

/** Bayesian average for 1–5 star ratings; pulls toward prior when count is low. */
export function bayesianAverageStars(
  sumRatings: number,
  count: number,
  priorMean = 3.5,
  priorWeight = 6,
): number {
  if (count <= 0) return priorMean;
  return (sumRatings + priorMean * priorWeight) / (count + priorWeight);
}

/**
 * Wilson score lower bound for "positive" proportion (e.g. 4–5 stars).
 * Returns 0–1; multiply by 5 for a star-like display if desired.
 */
export function wilsonLowerBound(positive: number, total: number, z = 1.96): number {
  if (total <= 0) return 0;
  const phat = positive / total;
  const z2 = z * z;
  const denom = 1 + z2 / total;
  const center = phat + z2 / (2 * total);
  const margin = z * Math.sqrt((phat * (1 - phat) + z2 / (4 * total)) / total);
  return Math.max(0, Math.min(1, (center - margin) / denom));
}

export function formatStarsOneDecimal(value: number): string {
  return value.toFixed(1);
}
