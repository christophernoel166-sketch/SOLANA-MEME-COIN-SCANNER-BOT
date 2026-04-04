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
      enrichmentComplete: true
    })
      .sort({ createdAt: -1 })
      .limit(30);

    for (const snap of snapshots) {
      const age = getTokenAgeMinutes(snap.pairCreatedAt);
      if (age === null) continue;

      if (profile) {
        if (age < profile.minAge || age > profile.maxAge) {
          console.log(`⏭️ Skipping ${snap.mintAddress} (${profile.name})`);
          continue;
        }
      }

      const [walletStats, bundleStats, fundingCluster, momentum, velocity] =
        await Promise.all([
          TokenWalletStats.findOne({ mintAddress: snap.mintAddress }).lean(),
          TokenBundleStats.findOne({ mintAddress: snap.mintAddress }).lean(),
          TokenFundingCluster.findOne({ mintAddress: snap.mintAddress }).lean(),
          TokenMomentum.findOne({ mintAddress: snap.mintAddress }).lean(),
          TokenVelocity.findOne({ mintAddress: snap.mintAddress }).lean()
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

      const isBoosted = boostedSet.has(snap.mintAddress);

      // 🔥 ANTI-FAKE METRICS
      const buySellRatio =
        snap.sells && snap.sells > 0
          ? (snap.buys ?? 0) / snap.sells
          : (snap.buys ?? 0);

      const hasStrongBuyPressure = buySellRatio >= 1.5;

      const walletParticipation =
        (snap.buys ?? 0) > 0 ? sniperCount / (snap.buys ?? 0) : 0;

      const hasHealthyParticipation = walletParticipation >= 0.02;

      // 🔥 RUG-RISK METRICS
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
        hasLargestHolderData &&
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
        momentumScore < (profile?.minMomentumScore ?? 40) &&
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

      const hasHighRugRisk = rugRiskScore >= 40;

      // MARKET CHECKS
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
        (
          typeof snap.buys === "number" &&
          typeof snap.sells === "number" &&
          snap.buys > snap.sells &&
          hasStrongBuyPressure
        );

      const hasSafeBotCount =
        botDegenCount <= (profile?.maxBotDegenCount ?? 6);

      const hasSafeRatCount =
        ratTraderCount <= (profile?.maxRatTraderCount ?? 10);

      const hasSafeSniperCount =
        sniperCount >= (profile?.minSniperCount ?? 2) &&
        sniperCount <= (profile?.maxSniperCount ?? 15);

      const hasMomentum =
        momentumScore >= (profile?.minMomentumScore ?? 40);

      const hasVelocityBreakout = profile?.requireVelocityFlagged
        ? breakoutScore >= (profile?.minBreakoutScore ?? 50) &&
          velocityFlagged &&
          momentumScore >= 20
        : breakoutScore >= (profile?.minBreakoutScore ?? 50);

      const hasSafeBundle =
        (!profile?.requireBundleNotFlagged || !bundleFlagged) &&
        bundleScore < (profile?.maxBundleScore ?? 7) &&
        bundledWalletCount < (profile?.maxBundledWalletCount ?? 5) &&
        (profile?.name === "fresh_meme" ? bundleScore <= 5 : true);

      const failureReasons: string[] = [];

      if (!hasLiquidity) failureReasons.push("low_liquidity");
      if (!hasMarketCap) failureReasons.push("low_market_cap");
      if (!hasVolume) failureReasons.push("low_volume");
      if (!hasBuyPressure) failureReasons.push("weak_buy_pressure");
      if (!hasHealthyParticipation) {
        failureReasons.push("low_wallet_participation");
      }

      if (!hasLargestHolderData) {
        failureReasons.push("largest_holder_unknown");
      } else if (!hasSafeLargestHolder) {
        failureReasons.push("largest_holder_dominance");
      }

      if (!hasHealthyDistribution) {
        failureReasons.push("bad_holder_distribution");
      }

      if (!hasSafeBotCount) failureReasons.push("too_many_bots");
      if (!hasSafeRatCount) failureReasons.push("too_many_rats");
      if (!hasSafeBundle) failureReasons.push("bundle_risk");
      if (!hasSafeSniperCount) {
        failureReasons.push("unsafe_sniper_count");
      }
      if (!hasMomentum) failureReasons.push("low_momentum");
      if (!hasVelocityBreakout) {
        failureReasons.push("no_velocity_breakout");
      }
      if (hasHighRugRisk) {
        failureReasons.push("high_rug_risk");
      }

      const isMatch =
        hasLiquidity &&
        hasMarketCap &&
        hasVolume &&
        hasBuyPressure &&
        hasHealthyParticipation &&
        hasHealthyDistribution &&
        hasSafeBotCount &&
        hasSafeRatCount &&
        hasSafeBundle &&
        hasSafeSniperCount &&
        hasMomentum &&
        hasVelocityBreakout &&
        !hasHighRugRisk;

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
        momentumScore,
        breakoutScore,
        isMatch
      });

      if (!isMatch) {
        console.log("❌ Rejected:", failureReasons);
        continue;
      }

      const message = `
🚀 *${profile?.name.toUpperCase()} SIGNAL*

CA:
\`${snap.mintAddress}\`

Liquidity: $${snap.liquidityUsd}
MarketCap: $${snap.marketCap}
Volume(5m): $${snap.volume5m}

Holders:
Largest: ${snap.largestHolderPercent?.toFixed(2)}%
Top10: ${snap.top10HoldingPercent?.toFixed(2)}%

Momentum: ${momentumScore}
Breakout: ${breakoutScore}

Rug Risk Score: ${rugRiskScore}
`;

      await sendTelegramSignal(message, profile?.name);

      snap.signalSent = true;
      await snap.save();

      console.log("🚨 SIGNAL TRIGGERED:", snap.mintAddress);
    }
  } catch (error) {
    console.error("Signal engine error:", error);
  }
}