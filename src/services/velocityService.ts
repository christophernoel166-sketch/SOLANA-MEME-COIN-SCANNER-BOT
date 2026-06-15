import TokenSnapshot from "../models/TokenSnapshot";
import TokenVelocity from "../models/TokenVelocity";

export async function calculateVelocityBreakout(
  mintAddress: string
): Promise<void> {
  try {
    const snapshots = await TokenSnapshot.find({ mintAddress })
      .sort({ createdAt: -1 })
      .limit(2)
      .lean();

    if (snapshots.length < 2) return;

    const current = snapshots[0];
    const previous = snapshots[1];

    const currentBuys = current?.buys ?? 0;
    const previousBuys = previous?.buys ?? 0;

    const currentVolume5m = current?.volume5m ?? 0;
    const previousVolume5m = previous?.volume5m ?? 0;

    const buyDelta = currentBuys - previousBuys;
    const volumeDelta =
      currentVolume5m - previousVolume5m;

    const buyGrowthPct =
      previousBuys > 0
        ? ((currentBuys - previousBuys) /
            previousBuys) *
          100
        : currentBuys > 0
        ? 100
        : 0;

    const volumeGrowthPct =
      previousVolume5m > 0
        ? ((currentVolume5m - previousVolume5m) /
            previousVolume5m) *
          100
        : currentVolume5m > 0
        ? 100
        : 0;

    let breakoutScore = 0;

    // =========================
    // BUY VELOCITY
    // =========================

    if (buyGrowthPct >= 25)
      breakoutScore += 10;

    if (buyGrowthPct >= 50)
      breakoutScore += 15;

    if (buyGrowthPct >= 100)
      breakoutScore += 20;

    if (buyGrowthPct >= 200)
      breakoutScore += 25;

    // =========================
    // VOLUME VELOCITY
    // =========================

    if (volumeGrowthPct >= 25)
      breakoutScore += 10;

    if (volumeGrowthPct >= 50)
      breakoutScore += 15;

    if (volumeGrowthPct >= 100)
      breakoutScore += 20;

    if (volumeGrowthPct >= 200)
      breakoutScore += 25;

    // =========================
    // RAW DELTA BONUS
    // =========================

    if (buyDelta >= 20)
      breakoutScore += 5;

    if (volumeDelta >= 1000)
      breakoutScore += 5;

    breakoutScore = Math.min(
      breakoutScore,
      100
    );

    const flagged = breakoutScore >= 40;

    await TokenVelocity.findOneAndUpdate(
      { mintAddress },
      {
        $set: {
          previousBuys,
          currentBuys,
          buyDelta,
          buyGrowthPct,

          previousVolume5m,
          currentVolume5m,
          volumeDelta,
          volumeGrowthPct,

          breakoutScore,
          flagged,

          analyzedAt: new Date()
        }
      },
      {
        upsert: true,
        new: true
      }
    );

    console.log(
      `🚀 Velocity breakout updated for ${mintAddress}: ${breakoutScore}`
    );

  } catch (error) {
    console.error(
      "Velocity breakout calculation error:",
      error
    );
  }
}