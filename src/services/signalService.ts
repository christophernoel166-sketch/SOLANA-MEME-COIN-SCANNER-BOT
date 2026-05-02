import TokenSnapshot from "../models/TokenSnapshot";
import TokenWalletStats from "../models/TokenWalletStats";
import TokenBundleStats from "../models/TokenBundleStats";
import TokenFundingCluster from "../models/TokenFundingCluster";
import TokenMomentum from "../models/TokenMomentum";
import TokenVelocity from "../models/TokenVelocity";

import { fetchBoostedTokenSet } from "./boostService";
import { sendTelegramSignal } from "./telegramService";
import { getTokenAgeMinutes } from "../utils/tokenUtils";
import { getSniperCount } from "./sniperIntelService";
import { analyzeChartEntry } from "./chartEntryService";
import SentSignal from "../models/SentSignal";
import SignalWatchlist from "../models/SignalWatchlist";

type SignalProfile = {
  name: string;
  minAge: number;
  maxAge: number;
  description: string;

  minLiquidityUsd: number;
  minMarketCap: number;
  minVolume5m: number;
  requireBuyPressure: boolean;

  maxLargestHolderPercent: number;
  maxTop10HoldingPercent: number;

  maxBotDegenCount: number;
  maxRatTraderCount: number;
  minSniperCount: number;
  maxSniperCount: number;

  maxBundleScore: number;
  maxBundledWalletCount: number;
  requireBundleNotFlagged: boolean;

  minMomentumScore: number;
  minBreakoutScore: number;
  requireVelocityFlagged: boolean;
};

const PASS_SCORE = Number(process.env.PASS_SCORE) || 50;

export async function runSignalEngine(profile?: SignalProfile): Promise<void> {
  try {
    console.log("🧠 Running signal engine...");
    if (profile) {
      console.log(`🧠 Running signal engine for profile: ${profile.name}`);
    }

    const boostedSet = await fetchBoostedTokenSet();
    console.log(`🚀 Boosted tokens loaded: ${boostedSet.size}`);

    const snapshots = await TokenSnapshot.find({
      signalSent: false,
      enrichmentComplete: true,
      pairCreatedAt: { $ne: null },
    })
      .sort({ createdAt: -1 })
      .limit(80);

    const filteredSnapshots = snapshots.filter((snap) => {
  const age = getTokenAgeMinutes(snap.pairCreatedAt);
  if (age === null) return false;

  if (profile) {
    return age >= profile.minAge && age <= profile.maxAge;
  }

  return true;
});

// 🔹 Deduplicate by mintAddress
const dedupedByMint = new Map<string, typeof filteredSnapshots[number]>();

for (const snap of filteredSnapshots) {
  if (!dedupedByMint.has(snap.mintAddress)) {
    dedupedByMint.set(snap.mintAddress, snap);
  }
}

// 🔹 Final unique list
const uniqueSnapshots = Array.from(dedupedByMint.values());

// 🔹 Logs
console.log(
  `📊 ${profile?.name ?? "default"} candidates after age filter: ${filteredSnapshots.length}`
);

console.log(
  `🧹 ${profile?.name ?? "default"} unique candidates after mint dedupe: ${uniqueSnapshots.length}`
);

// 🔹 IMPORTANT: use uniqueSnapshots here
for (const snap of uniqueSnapshots) {
  const age = getTokenAgeMinutes(snap.pairCreatedAt);
  if (age === null) continue;

      const [walletStats, bundleStats, fundingCluster, momentum, velocity] =
        await Promise.all([
          TokenWalletStats.findOne({ mintAddress: snap.mintAddress }).lean(),
          TokenBundleStats.findOne({ mintAddress: snap.mintAddress }).lean(),
          TokenFundingCluster.findOne({ mintAddress: snap.mintAddress }).lean(),
          TokenMomentum.findOne({ mintAddress: snap.mintAddress }).lean(),
          TokenVelocity.findOne({ mintAddress: snap.mintAddress }).lean(),
        ]);

      const sniperCount = await getSniperCount(snap.mintAddress);

      const momentumScore = momentum?.momentumScore ?? 0;
      const breakoutScore = velocity?.breakoutScore ?? 0;
      const velocityFlagged = velocity?.flagged ?? false;

      const smartDegenCount = walletStats?.smartDegenCount ?? 0;
      const botDegenCount = walletStats?.botDegenCount ?? 0;
      const ratTraderCount = walletStats?.ratTraderCount ?? 0;

      const bundleScore = bundleStats?.bundleScore ?? 0;
      const bundledWalletCount = bundleStats?.bundledWalletCount ?? 0;
      const bundleFlagged = bundleStats?.flagged ?? false;

      const fundingClusterScore = fundingCluster?.fundingClusterScore ?? 0;
      const largestFundingClusterSize =
        fundingCluster?.largestFundingClusterSize ?? 0;

      const isBoosted = boostedSet.has(snap.mintAddress);

      const buySellRatio =
        (snap.sells ?? 0) > 0
          ? (snap.buys ?? 0) / (snap.sells ?? 0)
          : (snap.buys ?? 0);

      const hasStrongBuyPressure =
        profile?.name === "fresh_meme"
          ? buySellRatio >= 1.1
          : buySellRatio >= 1.5;

      const walletParticipation =
        (snap.buys ?? 0) > 0 ? sniperCount / (snap.buys ?? 0) : 0;

      const hasHealthyParticipation =
        profile?.name === "fresh_meme"
          ? walletParticipation >= 0.001
          : walletParticipation >= 0.005;

      const sellBuyRatio =
        (snap.buys ?? 0) > 0
          ? (snap.sells ?? 0) / (snap.buys ?? 0)
          : (snap.sells ?? 0);

      const hasHeavySellPressure = sellBuyRatio >= 0.9;

      const hasLiquidityFragility =
        typeof snap.liquidityUsd === "number" &&
        snap.liquidityUsd < (profile?.minLiquidityUsd ?? 15000) * 1.2;

      const hasLargestHolderData =
        typeof snap.largestHolderPercent === "number";

      const hasSafeLargestHolder =
        typeof snap.largestHolderPercent === "number" &&
        snap.largestHolderPercent <=
          (profile?.maxLargestHolderPercent ?? 15);

      const hasSafeTop10Holding =
        typeof snap.top10HoldingPercent === "number" &&
        snap.top10HoldingPercent <
          (profile?.maxTop10HoldingPercent ?? 20);

      const hasHealthyDistribution =
        hasSafeLargestHolder && hasSafeTop10Holding;

      const hasHolderFragility =
        (typeof snap.largestHolderPercent === "number" &&
          snap.largestHolderPercent >=
            (profile?.maxLargestHolderPercent ?? 15) * 0.85) ||
        (typeof snap.top10HoldingPercent === "number" &&
          snap.top10HoldingPercent >=
            (profile?.maxTop10HoldingPercent ?? 20) * 0.9);

      const hasMomentumFailure =
        momentumScore < 50 &&
        breakoutScore < (profile?.minBreakoutScore ?? 50);

      const hasDangerousBundle =
        bundleFlagged ||
        bundleScore >= (profile?.maxBundleScore ?? 7) ||
        bundledWalletCount >= (profile?.maxBundledWalletCount ?? 5);

      let rugRiskScore = 0;
      const rugRiskReasons: string[] = [];

      if (hasHeavySellPressure) {
        rugRiskScore += 25;
        rugRiskReasons.push("heavy_sell_pressure");
      }

      if (hasLiquidityFragility) {
        rugRiskScore += 20;
        rugRiskReasons.push("fragile_liquidity");
      }

      if (hasHolderFragility) {
        rugRiskScore += 25;
        rugRiskReasons.push("holder_fragility");
      }

      if (hasMomentumFailure) {
        rugRiskScore += 15;
        rugRiskReasons.push("momentum_failure");
      }

      if (hasDangerousBundle) {
        rugRiskScore += 25;
        rugRiskReasons.push("dangerous_bundle");
      }

      const hasHighRugRisk = rugRiskScore > 30;

      const hasLiquidity =
        typeof snap.liquidityUsd === "number" &&
        snap.liquidityUsd >= (profile?.minLiquidityUsd ?? 15000);

      const hasMarketCap =
        typeof snap.marketCap === "number" &&
        snap.marketCap >= (profile?.minMarketCap ?? 30000);

      const hasVolume =
        typeof snap.volume5m === "number" &&
        snap.volume5m >= (profile?.minVolume5m ?? 2000);

      const hasBuyPressure =
        !profile?.requireBuyPressure ||
        (typeof snap.buys === "number" &&
          typeof snap.sells === "number" &&
          snap.buys > snap.sells &&
          hasStrongBuyPressure);

      const hasSafeBotCount =
        botDegenCount <= (profile?.maxBotDegenCount ?? 6);

      const hasSafeRatCount =
        ratTraderCount <= (profile?.maxRatTraderCount ?? 10);

      const hasSafeSniperCount =
        sniperCount >= (profile?.minSniperCount ?? 2) &&
        sniperCount <= (profile?.maxSniperCount ?? 15);

      const hasMomentum = momentumScore >= 50;
      const hasLowMomentum = momentumScore < 50;

      const hasVelocityBreakout = profile?.requireVelocityFlagged
        ? breakoutScore >= (profile?.minBreakoutScore ?? 50) &&
          velocityFlagged &&
          momentumScore >= 20
        : breakoutScore >= (profile?.minBreakoutScore ?? 50);

      const hasSafeBundle =
        (!profile?.requireBundleNotFlagged || !bundleFlagged) &&
        bundleScore < (profile?.maxBundleScore ?? 7) &&
        bundledWalletCount < (profile?.maxBundledWalletCount ?? 5);

      const failureReasons: string[] = [];
      const scoreBreakdown: Record<string, number> = {};
      let totalScore = 0;

      // Hard rejection conditions
      if (!hasLiquidity) failureReasons.push("low_liquidity");
      if (!hasLargestHolderData) failureReasons.push("largest_holder_unknown");
      if (hasLowMomentum) failureReasons.push("low_momentum");
      if (hasLiquidityFragility) failureReasons.push("liquidity_fragility");
      if (hasHighRugRisk) failureReasons.push("high_rug_risk");

      // Market quality: 25
      if (hasLiquidity) {
        totalScore += 8;
        scoreBreakdown.liquidity = 8;
      } else {
        scoreBreakdown.liquidity = 0;
      }

      if (hasMarketCap) {
        totalScore += 6;
        scoreBreakdown.marketCap = 6;
      } else {
        failureReasons.push("low_market_cap");
        scoreBreakdown.marketCap = 0;
      }

      if (hasVolume) {
        totalScore += 5;
        scoreBreakdown.volume = 5;
      } else {
        failureReasons.push("low_volume");
        scoreBreakdown.volume = 0;
      }

      if (hasBuyPressure) {
        totalScore += 6;
        scoreBreakdown.buyPressure = 6;
      } else {
        failureReasons.push("weak_buy_pressure");
        scoreBreakdown.buyPressure = 0;
      }

      // Holder safety: 25
      if (hasSafeLargestHolder) {
        totalScore += 12;
        scoreBreakdown.largestHolder = 12;
      } else {
        if (hasLargestHolderData) {
          failureReasons.push("largest_holder_dominance");
        }
        scoreBreakdown.largestHolder = 0;
      }

      if (hasSafeTop10Holding) {
        totalScore += 13;
        scoreBreakdown.top10Holding = 13;
      } else {
        failureReasons.push("bad_holder_distribution");
        scoreBreakdown.top10Holding = 0;
      }

      // Structure safety: 20
      if (hasSafeBundle) {
        totalScore += 10;
        scoreBreakdown.bundle = 10;
      } else {
        failureReasons.push("bundle_risk");
        scoreBreakdown.bundle = 0;
      }

      const hasSafeWalletBehavior = hasSafeBotCount && hasSafeRatCount;
      if (hasSafeWalletBehavior) {
        totalScore += 10;
        scoreBreakdown.walletBehavior = 10;
      } else {
        if (!hasSafeBotCount) failureReasons.push("too_many_bots");
        if (!hasSafeRatCount) failureReasons.push("too_many_rats");
        scoreBreakdown.walletBehavior = 0;
      }

      // Momentum / breakout: 20
      if (hasMomentum) {
        totalScore += 10;
        scoreBreakdown.momentum = 10;
      } else {
        scoreBreakdown.momentum = 0;
      }

      if (hasVelocityBreakout) {
        totalScore += 10;
        scoreBreakdown.velocityBreakout = 10;
      } else {
        failureReasons.push("no_velocity_breakout");
        scoreBreakdown.velocityBreakout = 0;
      }

      // Participation / conviction: 10
      if (hasHealthyParticipation) {
        totalScore += 5;
        scoreBreakdown.walletParticipation = 5;
      } else {
        failureReasons.push("low_wallet_participation");
        scoreBreakdown.walletParticipation = 0;
      }

      if (hasSafeSniperCount) {
        totalScore += 5;
        scoreBreakdown.sniperCount = 5;
      } else {
        failureReasons.push("unsafe_sniper_count");
        scoreBreakdown.sniperCount = 0;
      }

      // Optional boost bonus
      if (isBoosted) {
        totalScore += 2;
        scoreBreakdown.boostedBonus = 2;
      } else {
        scoreBreakdown.boostedBonus = 0;
      }

      // Funding cluster mild penalty
      if (fundingClusterScore >= 50 || largestFundingClusterSize >= 5) {
        totalScore -= 5;
        failureReasons.push("funding_cluster_risk");
      }

      // Rug risk penalty
      let rugPenalty = 0;

      if (profile?.name === "fresh_meme") {
        if (rugRiskScore >= 60) rugPenalty = 18;
        else if (rugRiskScore >= 40) rugPenalty = 10;
        else if (rugRiskScore >= 20) rugPenalty = 5;
      } else {
        if (rugRiskScore >= 60) rugPenalty = 25;
        else if (rugRiskScore >= 40) rugPenalty = 15;
        else if (rugRiskScore >= 20) rugPenalty = 8;
      }

      totalScore -= rugPenalty;
      scoreBreakdown.rugPenalty = -rugPenalty;

      if (totalScore > 100) totalScore = 100;
      if (totalScore < 0) totalScore = 0;

      const hasHardReject =
  momentumScore < 40 ||
  rugRiskScore >30 ||
  (hasLiquidityFragility && rugRiskScore > 20);

      const isMatch =
        totalScore >= PASS_SCORE &&
        !hasHardReject;

      console.log("🧪 Signal check:", {
        profile: profile?.name,
        mint: snap.mintAddress,
        age,

        buySellRatio,
        walletParticipation,
        hasStrongBuyPressure,
        hasHealthyParticipation,
        hasHealthyDistribution,

        sellBuyRatio,
        hasHeavySellPressure,
        hasLiquidityFragility,
        hasHolderFragility,
        hasMomentumFailure,
        hasDangerousBundle,
        rugRiskScore,
        rugRiskReasons,

        largest: snap.largestHolderPercent,
        top10: snap.top10HoldingPercent,
        bundleScore,
        sniperCount,
        smartDegenCount,
        botDegenCount,
        ratTraderCount,
        fundingClusterScore,
        largestFundingClusterSize,
        momentumScore,
        breakoutScore,
        isBoosted,

        totalScore,
        passScore: PASS_SCORE,
        scoreBreakdown,
        hasHardReject,
        isMatch,
      });

      if (!isMatch) {
        console.log(`❌ Rejected ${snap.mintAddress}:`, failureReasons);
        continue;
      }

      let entry;

      try {
        entry = await analyzeChartEntry(snap.mintAddress);
        console.log(`✅ Chart entry analysis complete for ${snap.mintAddress}`, entry);
      } catch (error) {
        console.error(`❌ Chart entry analysis failed for ${snap.mintAddress}`, error);
        continue;
      }

if (
  entry.trend !== "bullish" ||
  entry.action !== "enter_now" ||
  entry.confidence < 6
) {
  await SignalWatchlist.updateOne(
    {
      mintAddress: snap.mintAddress,
      profileName: profile?.name ?? "default",
    },
    {
      $set: {
        status: "watching",
        score: totalScore,
        reason: "waiting_for_bullish_chart",
        lastCheckedAt: new Date(),
        lastTrend: entry.trend,
        lastAction: entry.action,
        lastConfidence: entry.confidence,
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      },
      $setOnInsert: {
        firstSeenAt: new Date(),
      },
    },
    { upsert: true }
  );

  console.log(`👀 Added/updated watchlist ${snap.mintAddress}`, {
    trend: entry.trend,
    action: entry.action,
    confidence: entry.confidence,
    reasons: entry.reasons,
  });

  continue;
}

if ((entry.profitPotentialPct ?? 0) < 30) {
  console.log(`❌ Rejected ${snap.mintAddress}: TP potential below 30%`, {
    profitPotentialPct: entry.profitPotentialPct,
    takeProfitLevel: entry.takeProfitLevel,
  });
  continue;
}

      const message = `
🚀 *${profile?.name?.toUpperCase() ?? "DEFAULT"} SIGNAL*

Score: ${totalScore}/100
Pass Threshold: ${PASS_SCORE}

CA:
\`${snap.mintAddress}\`

Market
• Age: ${age} min
• Liquidity: $${snap.liquidityUsd ?? "N/A"}
• Market Cap: $${snap.marketCap ?? "N/A"}
• Volume(5m): $${snap.volume5m ?? "N/A"}
• Buys / Sells: ${snap.buys ?? 0} / ${snap.sells ?? 0}
• Buy/Sell Ratio: ${buySellRatio.toFixed(2)}

Holders
• Largest: ${
        typeof snap.largestHolderPercent === "number"
          ? snap.largestHolderPercent.toFixed(2)
          : "N/A"
      }%
• Top10: ${
        typeof snap.top10HoldingPercent === "number"
          ? snap.top10HoldingPercent.toFixed(2)
          : "N/A"
      }%

Structure
• Bundle Score: ${bundleScore}
• Bundled Wallets: ${bundledWalletCount}
• Funding Cluster Score: ${fundingClusterScore}
• Largest Funding Cluster: ${largestFundingClusterSize}

Momentum
• Momentum: ${momentumScore}
• Breakout: ${breakoutScore}

Risk
• Rug Risk Score: ${rugRiskScore}
• Boosted: ${isBoosted ? "YES" : "NO"}

📊 *Chart Entry*
• Action: ${entry.action}
• Trend: ${entry.trend}
• Confidence: ${entry.confidence}/10
• Entry Zone: ${entry.entryMin?.toFixed(6)} - ${entry.entryMax?.toFixed(6)}
• Breakout: ${entry.breakoutLevel?.toFixed(6)}
• Invalidation: ${entry.invalidationLevel?.toFixed(6)}
`;

try {
  await SentSignal.create({
    mintAddress: snap.mintAddress,
    profileName: profile?.name ?? "default",
    sentAt: new Date(),
  });
} catch (error: any) {
  if (error?.code === 11000) {
    console.log(`⚠️ Signal already sent for ${snap.mintAddress}`);
    continue;
  }

  throw error;
}

// Mark all current/future duplicate snapshot rows for this mint as sent
await TokenSnapshot.updateMany(
  {
    mintAddress: snap.mintAddress,
  },
  {
    $set: {
      signalSent: true,
      updatedAt: new Date(),
    },
  }
);

await sendTelegramSignal(message, profile?.name);

console.log("🚨 SIGNAL TRIGGERED:", snap.mintAddress, {
  totalScore,
  profile: profile?.name,
});
  } // ← closes: for (const snap ...)
  
} // ← closes: try block

catch (error) {
  console.error("Signal engine error:", error);
}
} // ← closes: runSignalEngine