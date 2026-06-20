import WalletPerformance from "../models/WalletPerformance";

export async function updateWalletPerformance({
  walletAddress,
  returnPct,
  maxGainPct,
  drawdownPct
}: {
  walletAddress: string;
  returnPct: number;
  maxGainPct: number;
  drawdownPct: number;
}) {
  const existing =
    await WalletPerformance.findOne({
      walletAddress
    });

  if (!existing) {
    const wins = returnPct >= 50 ? 1 : 0;
    const losses = returnPct < 0 ? 1 : 0;

    const totalSignals = 1;

    const winRate =
      totalSignals > 0
        ? (wins / totalSignals) * 100
        : 0;

    const performanceScore =
      calculatePerformanceScore({
        winRate,
        avgReturnPct: returnPct,
        avgMaxGainPct: maxGainPct,
        avgDrawdownPct: drawdownPct
      });

    return WalletPerformance.create({
      walletAddress,

      totalSignals,

      wins,
      losses,

      winRate,

      avgReturnPct: returnPct,
      avgMaxGainPct: maxGainPct,
      avgDrawdownPct: drawdownPct,

      performanceScore,

      lastSignalAt: new Date()
    });
  }

  const totalSignals =
    existing.totalSignals + 1;

  const wins =
    existing.wins +
    (returnPct >= 50 ? 1 : 0);

  const losses =
    existing.losses +
    (returnPct < 0 ? 1 : 0);

  const winRate =
    totalSignals > 0
      ? (wins / totalSignals) * 100
      : 0;

  const avgReturnPct =
    (
      existing.avgReturnPct *
        existing.totalSignals +
      returnPct
    ) / totalSignals;

  const avgMaxGainPct =
    (
      existing.avgMaxGainPct *
        existing.totalSignals +
      maxGainPct
    ) / totalSignals;

  const avgDrawdownPct =
    (
      existing.avgDrawdownPct *
        existing.totalSignals +
      drawdownPct
    ) / totalSignals;

  const performanceScore =
    calculatePerformanceScore({
      winRate,
      avgReturnPct,
      avgMaxGainPct,
      avgDrawdownPct
    });

  return WalletPerformance.findOneAndUpdate(
    { walletAddress },
    {
      $set: {
        totalSignals,

        wins,
        losses,

        winRate,

        avgReturnPct,
        avgMaxGainPct,
        avgDrawdownPct,

        performanceScore,

        lastSignalAt: new Date()
      }
    },
    {
      new: true
    }
  );
}

export function calculatePerformanceScore({
  winRate,
  avgReturnPct,
  avgMaxGainPct,
  avgDrawdownPct
}: {
  winRate: number;
  avgReturnPct: number;
  avgMaxGainPct: number;
  avgDrawdownPct: number;
}) {
  let score = 0;

  score += Math.min(winRate, 50);

  score += Math.min(
    avgReturnPct / 2,
    20
  );

  score += Math.min(
    avgMaxGainPct / 10,
    20
  );

  score -= Math.min(
    Math.abs(avgDrawdownPct) / 5,
    10
  );

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(score)
    )
  );
}