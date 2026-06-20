import PatternSnapshot from "../models/PatternSnapshot";
import PatternStatistics from "../models/PatternStatistics";

function buildPatternKey(snapshot: any): string {
  // Prefer the richer fingerprints saved with the snapshot.
  if (
    snapshot.walletFingerprint &&
    snapshot.marketFingerprint &&
    snapshot.structureFingerprint
  ) {
    return [
      snapshot.walletFingerprint,
      snapshot.marketFingerprint,
      snapshot.structureFingerprint,
    ]
      .filter(Boolean)
      .join("|");
  }

  // Fallback for older snapshots.
  const smartWalletBucket =
    snapshot.smartWalletCount >= 5
      ? "elite"
      : snapshot.smartWalletCount >= 3
      ? "strong"
      : snapshot.smartWalletCount >= 1
      ? "some"
      : "none";

  const momentumBucket =
    snapshot.momentumScore >= 80
      ? "very_high"
      : snapshot.momentumScore >= 60
      ? "high"
      : snapshot.momentumScore >= 40
      ? "medium"
      : "low";

  const breakoutBucket =
    snapshot.breakoutScore >= 80
      ? "very_high"
      : snapshot.breakoutScore >= 60
      ? "high"
      : snapshot.breakoutScore >= 40
      ? "medium"
      : "low";

  const bundleBucket =
    snapshot.bundleScore <= 20
      ? "safe"
      : snapshot.bundleScore <= 50
      ? "moderate"
      : "risky";

  const fundingBucket =
    snapshot.fundingClusterScore <= 20
      ? "safe"
      : snapshot.fundingClusterScore <= 50
      ? "moderate"
      : "clustered";

  const liquidityBucket =
    snapshot.liquidityUsd >= 100000
      ? "100k_plus"
      : snapshot.liquidityUsd >= 50000
      ? "50k_100k"
      : snapshot.liquidityUsd >= 20000
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

function calculateConfidenceScore(
  winRate: number,
  totalSignals: number
): number {
  let sampleMultiplier = 0.25;

  if (totalSignals >= 100) {
    sampleMultiplier = 1;
  } else if (totalSignals >= 50) {
    sampleMultiplier = 0.9;
  } else if (totalSignals >= 20) {
    sampleMultiplier = 0.75;
  } else if (totalSignals >= 10) {
    sampleMultiplier = 0.5;
  }

  return Math.round(winRate * sampleMultiplier);
}

// Give newer signals more influence.
function getTimeWeight(createdAt: Date): number {
  const ageDays =
    (Date.now() - new Date(createdAt).getTime()) /
    (1000 * 60 * 60 * 24);

  if (ageDays <= 30) {
    return 1.0;
  }

  if (ageDays <= 90) {
    return 0.7;
  }

  return 0.4;
}

export async function rebuildPatternStatistics(): Promise<void> {
  const snapshots = await PatternSnapshot.find({
    outcome: {
      $in: ["win", "loss", "neutral"],
    },
  }).lean();

  const grouped = new Map<string, any[]>();

  for (const snapshot of snapshots) {
    const patternKey = buildPatternKey(snapshot);

    if (!grouped.has(patternKey)) {
      grouped.set(patternKey, []);
    }

    grouped.get(patternKey)!.push(snapshot);
  }

  for (const [patternKey, items] of grouped.entries()) {
    const totalSignals = items.length;

    const wins = items.filter(
      (x) => x.outcome === "win"
    ).length;

    const losses = items.filter(
      (x) => x.outcome === "loss"
    ).length;

    const neutrals = items.filter(
      (x) => x.outcome === "neutral"
    ).length;

    const winRate =
      totalSignals > 0
        ? (wins / totalSignals) * 100
        : 0;

    // ----------------------------
    // Time-decay weighted averages
    // ----------------------------

    const totalWeight = items.reduce(
      (sum, item) =>
        sum + getTimeWeight(item.createdAt),
      0
    );

    const averageReturnPct =
      totalWeight > 0
        ? items.reduce(
            (sum, item) =>
              sum +
              (item.returnPct ?? 0) *
                getTimeWeight(item.createdAt),
            0
          ) / totalWeight
        : 0;

    const averageMaxGainPct =
      totalWeight > 0
        ? items.reduce(
            (sum, item) =>
              sum +
              (item.maxGainPct ?? 0) *
                getTimeWeight(item.createdAt),
            0
          ) / totalWeight
        : 0;

    const averageDrawdownPct =
      totalWeight > 0
        ? items.reduce(
            (sum, item) =>
              sum +
              (item.drawdownPct ?? 0) *
                getTimeWeight(item.createdAt),
            0
          ) / totalWeight
        : 0;

    // ----------------------------
    // Additional statistics
    // ----------------------------

    const sortedReturns = items
      .map((item) => item.returnPct ?? 0)
      .sort((a, b) => a - b);

    const medianReturnPct =
      sortedReturns.length === 0
        ? 0
        : sortedReturns.length % 2 === 1
        ? sortedReturns[
            Math.floor(sortedReturns.length / 2)
          ]
        : (
            sortedReturns[
              sortedReturns.length / 2 - 1
            ] +
            sortedReturns[
              sortedReturns.length / 2
            ]
          ) / 2;

    const bestReturnPct =
      sortedReturns.length > 0
        ? sortedReturns[sortedReturns.length - 1]
        : 0;

    const worstReturnPct =
      sortedReturns.length > 0
        ? sortedReturns[0]
        : 0;

    const averageHoldingTimeHours =
      totalSignals > 0
        ? items.reduce((sum, item) => {
            const start = new Date(
              item.createdAt
            ).getTime();

            const end = item.updatedAt
              ? new Date(item.updatedAt).getTime()
              : start;

            return (
              sum +
              (end - start) /
                (1000 * 60 * 60)
            );
          }, 0) / totalSignals
        : 0;

    const confidenceScore =
      calculateConfidenceScore(
        winRate,
        totalSignals
      );

    await PatternStatistics.findOneAndUpdate(
      {
        patternKey,
      },
      {
        $set: {
          totalSignals,

          wins,
          losses,
          neutrals,

          winRate,

          averageReturnPct,
          averageMaxGainPct,
          averageDrawdownPct,

          medianReturnPct,
          bestReturnPct,
          worstReturnPct,
          averageHoldingTimeHours,

          confidenceScore,
        },
      },
      {
        upsert: true,
      }
    );
  }
}