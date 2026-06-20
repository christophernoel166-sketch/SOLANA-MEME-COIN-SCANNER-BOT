import PatternStatistics from "../models/PatternStatistics";

export interface PatternConfidenceInput {
  smartWalletCount: number;
  momentumScore: number;
  breakoutScore: number;
  bundleScore: number;
  fundingClusterScore: number;
  liquidityUsd: number;
}

function buildPatternKey(
  input: PatternConfidenceInput
): string {
  const smartWalletBucket =
    input.smartWalletCount >= 5
      ? "elite"
      : input.smartWalletCount >= 3
      ? "strong"
      : input.smartWalletCount >= 1
      ? "some"
      : "none";

  const momentumBucket =
    input.momentumScore >= 80
      ? "very_high"
      : input.momentumScore >= 60
      ? "high"
      : input.momentumScore >= 40
      ? "medium"
      : "low";

  const breakoutBucket =
    input.breakoutScore >= 80
      ? "very_high"
      : input.breakoutScore >= 60
      ? "high"
      : input.breakoutScore >= 40
      ? "medium"
      : "low";

  const bundleBucket =
    input.bundleScore <= 20
      ? "safe"
      : input.bundleScore <= 50
      ? "moderate"
      : "risky";

  const fundingBucket =
    input.fundingClusterScore <= 20
      ? "safe"
      : input.fundingClusterScore <= 50
      ? "moderate"
      : "clustered";

  const liquidityBucket =
    input.liquidityUsd >= 100000
      ? "100k_plus"
      : input.liquidityUsd >= 50000
      ? "50k_100k"
      : input.liquidityUsd >= 20000
      ? "20k_50k"
      : "under_20k";

  return [
    `smart_${smartWalletBucket}`,
    `momentum_${momentumBucket}`,
    `breakout_${breakoutBucket}`,
    `bundle_${bundleBucket}`,
    `funding_${fundingBucket}`,
    `liquidity_${liquidityBucket}`,
  ].join("|");
}

export async function getPatternConfidence(
  input: PatternConfidenceInput
) {
  const patternKey = buildPatternKey(input);

  const stats = await PatternStatistics.findOne({
    patternKey,
  }).lean();

  if (!stats) {
    return {
      patternKey,
      historicalConfidence: 50,
      totalSignals: 0,
      winRate: 0,
      confidenceScore: 50,
    };
  }

  return {
    patternKey,
    historicalConfidence:
      stats.confidenceScore ?? Math.round(stats.winRate),

    confidenceScore:
      stats.confidenceScore ?? Math.round(stats.winRate),

    totalSignals: stats.totalSignals,

    winRate: stats.winRate,
  };
}