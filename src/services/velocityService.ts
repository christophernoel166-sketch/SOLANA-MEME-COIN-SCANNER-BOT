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

    if (!snapshots.length) return;

    const current = snapshots[0];
    const previous = snapshots[1];

    const currentBuys = current?.buys ?? 0;
    const previousBuys = previous?.buys ?? 0;

    const currentVolume5m = current?.volume5m ?? 0;
    const previousVolume5m = previous?.volume5m ?? 0;

    const buyDelta = currentBuys - previousBuys;
    const volumeDelta = currentVolume5m - previousVolume5m;

    let breakoutScore = 0;

    if (buyDelta >= 20) breakoutScore += 25;
    if (buyDelta >= 50) breakoutScore += 25;

    if (volumeDelta >= 1000) breakoutScore += 20;
    if (volumeDelta >= 5000) breakoutScore += 30;

    const flagged = breakoutScore >= 50;

    await TokenVelocity.findOneAndUpdate(
      { mintAddress },
      {
        $set: {
          previousBuys,
          currentBuys,
          buyDelta,
          previousVolume5m,
          currentVolume5m,
          volumeDelta,
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
  } catch (error) {
    console.error("Velocity breakout calculation error:", error);
  }
}