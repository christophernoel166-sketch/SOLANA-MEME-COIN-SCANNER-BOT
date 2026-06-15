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

    const walletVelocity = await TokenEarlyBuyer.countDocuments({
      mintAddress
    });

    const buyVelocity = snapshot.buys ?? 0;

    const liquidityAcceleration =
      snapshot.liquidityUsd ?? 0;

    const boostAcceleration =
      snapshot.boostsActive ?? 0;

    let momentumScore = 0;

    // =========================
    // BUY MOMENTUM
    // =========================

    if (buyVelocity >= 20) momentumScore += 5;
    if (buyVelocity >= 50) momentumScore += 10;
    if (buyVelocity >= 100) momentumScore += 15;
    if (buyVelocity >= 150) momentumScore += 20;

    // =========================
    // WALLET MOMENTUM
    // =========================

    if (walletVelocity >= 5) momentumScore += 5;
    if (walletVelocity >= 10) momentumScore += 10;
    if (walletVelocity >= 20) momentumScore += 15;
    if (walletVelocity >= 30) momentumScore += 20;

    // =========================
    // LIQUIDITY MOMENTUM
    // =========================

    if (liquidityAcceleration >= 5000)
      momentumScore += 5;

    if (liquidityAcceleration >= 10000)
      momentumScore += 10;

    if (liquidityAcceleration >= 20000)
      momentumScore += 15;

    if (liquidityAcceleration >= 50000)
      momentumScore += 20;

    // =========================
    // BOOST MOMENTUM
    // =========================

    if (boostAcceleration >= 1)
      momentumScore += 3;

    if (boostAcceleration >= 3)
      momentumScore += 5;

    if (boostAcceleration >= 5)
      momentumScore += 10;

    // =========================
    // SCORE CAP
    // =========================

    momentumScore = Math.min(
      Math.round(momentumScore),
      100
    );

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
      {
        upsert: true,
        new: true
      }
    );

    console.log(
      `⚡ Momentum updated for ${mintAddress}: ${momentumScore}`
    );

  } catch (error) {
    console.error(
      "Momentum calculation error:",
      error
    );
  }
}