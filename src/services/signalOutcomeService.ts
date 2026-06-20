import SignalOutcome from "../models/SignalOutcome";
import SignalWalletLink from "../models/SignalWalletLink";
import { updateWalletPerformance } from "./walletPerformanceService";
import { fetchMarketData } from "./marketService";
import PatternSnapshot from "../models/PatternSnapshot";

// Configurable thresholds
const EVALUATION_HOURS = Number(
  process.env.EVALUATION_HOURS ?? 24
);

const WIN_THRESHOLD = Number(
  process.env.WIN_THRESHOLD ?? 50
);

const LOSS_THRESHOLD = Number(
  process.env.LOSS_THRESHOLD ?? -20
);

export async function evaluateSignalOutcome(
  mintAddress: string
) {
  const signal = await SignalOutcome.findOne({
    mintAddress,
    outcome: "pending",
  });

  if (!signal) {
    return null;
  }

  const market = await fetchMarketData(mintAddress);

  if (!market?.priceUsd) {
    return null;
  }

  const currentPrice = Number(market.priceUsd);

  // Prevent invalid calculations
  if (!signal.entryPrice || signal.entryPrice <= 0) {
    return null;
  }

  // Track highest price seen since signal
  const maxPrice = Math.max(
    signal.maxPrice ?? signal.entryPrice,
    currentPrice
  );

  // Track lowest price seen since signal
  const minPrice = Math.min(
    signal.minPrice ?? signal.entryPrice,
    currentPrice
  );

  // Calculate metrics
  const returnPct =
    ((currentPrice - signal.entryPrice) /
      signal.entryPrice) *
    100;

  const maxGainPct =
    ((maxPrice - signal.entryPrice) /
      signal.entryPrice) *
    100;

  const drawdownPct =
    ((minPrice - signal.entryPrice) /
      signal.entryPrice) *
    100;

  // Calculate age of the signal
  const ageHours =
    (Date.now() -
      new Date(signal.signalSentAt).getTime()) /
    (1000 * 60 * 60);

  // Determine outcome
  let outcome:
    | "pending"
    | "win"
    | "loss"
    | "neutral" = "pending";

  if (ageHours >= EVALUATION_HOURS) {
    if (maxGainPct >= WIN_THRESHOLD) {
      outcome = "win";
    } else if (returnPct <= LOSS_THRESHOLD) {
      outcome = "loss";
    } else {
      outcome = "neutral";
    }
  }

  // Save updated signal metrics
  await SignalOutcome.updateOne(
    { _id: signal._id },
    {
      $set: {
        currentPrice,
        maxPrice,
        minPrice,

        returnPct,
        maxGainPct,
        drawdownPct,

        exitPrice: currentPrice,
        evaluationVersion: 1,

        outcome,
        evaluatedAt: new Date(),
      },
    }
  );

await PatternSnapshot.updateOne(
  {
    mintAddress,
  },
  {
    $set: {
      outcome,
      returnPct,
      maxGainPct,
      drawdownPct,
    },
  }
);

  // Only score wallets after the outcome is finalized
  if (outcome !== "pending") {
    const links = await SignalWalletLink.find({
      mintAddress,
    }).lean();

    for (const link of links) {
      await updateWalletPerformance({
        walletAddress: link.walletAddress,
        returnPct,
        maxGainPct,
        drawdownPct,
      });
    }
  }

  return {
    mintAddress,
    outcome,
    returnPct,
    maxGainPct,
    drawdownPct,
    maxPrice,
    minPrice,
    ageHours,
  };
}