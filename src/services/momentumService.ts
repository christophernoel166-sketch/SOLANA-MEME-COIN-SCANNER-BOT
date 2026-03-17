import TokenSnapshot from "../models/TokenSnapshot";
import TokenMomentum from "../models/TokenMomentum";
import TokenEarlyBuyer from "../models/TokenEarlyBuyer";

export async function calculateMomentum(
  mintAddress: string
): Promise<void> {
  try {
    const snapshot = await TokenSnapshot.findOne({ mintAddress })
      .sort({ createdAt: -1 })
      .lean();

    if (!snapshot) return;

    const earlyBuyers = await TokenEarlyBuyer.find({ mintAddress });

    const buyVelocity = snapshot.buys ?? 0;

    const walletVelocity = earlyBuyers.length;

    const liquidityAcceleration = snapshot.liquidityUsd ?? 0;

    const boostAcceleration = snapshot.boostsActive ?? 0;

    let momentumScore = 0;

    if (buyVelocity > 150) momentumScore += 25;
    if (walletVelocity > 30) momentumScore += 25;
    if (liquidityAcceleration > 20000) momentumScore += 25;
    if (boostAcceleration > 5) momentumScore += 25;

    await TokenMomentum.findOneAndUpdate(
      { mintAddress },
      {
        mintAddress,
        buyVelocity,
        walletVelocity,
        liquidityAcceleration,
        boostAcceleration,
        momentumScore,
        analyzedAt: new Date()
      },
      { upsert: true }
    );
  } catch (error) {
    console.error("Momentum calculation error:", error);
  }
}