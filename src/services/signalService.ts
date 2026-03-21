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

export async function runSignalEngine(): Promise<void> {
  try {
    console.log("🧠 Running signal engine...");

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

      const [walletStats, bundleStats, fundingCluster, momentum, velocity] =
        await Promise.all([
          TokenWalletStats.findOne({
            mintAddress: snap.mintAddress
          }).lean(),

          TokenBundleStats.findOne({
            mintAddress: snap.mintAddress
          }).lean(),

          TokenFundingCluster.findOne({
            mintAddress: snap.mintAddress
          }).lean(),

          TokenMomentum.findOne({
            mintAddress: snap.mintAddress
          }).lean(),

          TokenVelocity.findOne({
            mintAddress: snap.mintAddress
          }).lean()
        ]);

      const sniperCount = await getSniperCount(snap.mintAddress);

      const momentumScore = momentum?.momentumScore ?? 0;

      const breakoutScore = velocity?.breakoutScore ?? 0;
      const velocityFlagged = velocity?.flagged ?? false;

      const smartDegenCount = walletStats?.smartDegenCount ?? 0;
      const smartDegenHoldingPercent =
        walletStats?.smartDegenHoldingPercent ?? 0;

      const botDegenCount = walletStats?.botDegenCount ?? 0;
      const botDegenHoldingPercent =
        walletStats?.botDegenHoldingPercent ?? 0;

      const ratTraderCount = walletStats?.ratTraderCount ?? 0;
      const ratTraderHoldingPercent =
        walletStats?.ratTraderHoldingPercent ?? 0;

      const alphaCallerCount = walletStats?.alphaCallerCount ?? 0;
      const pumpReplyCount = walletStats?.pumpReplyCount ?? null;

      const bundleScore = bundleStats?.bundleScore ?? 0;
      const bundledWalletCount = bundleStats?.bundledWalletCount ?? 0;
      const bundleFlagged = bundleStats?.flagged ?? false;

      const fundingClusterScore =
        fundingCluster?.fundingClusterScore ?? 0;

      const largestFundingClusterSize =
        fundingCluster?.largestFundingClusterSize ?? 0;

      const fundingClusterFlagged =
        fundingCluster?.flagged ?? false;

      const isBoosted = boostedSet.has(snap.mintAddress);

      const hasLiquidity =
        typeof snap.liquidityUsd === "number" &&
        snap.liquidityUsd >= 15000;

      const hasMarketCap =
        typeof snap.marketCap === "number" &&
        snap.marketCap >= 30000;

      const hasVolume =
        typeof snap.volume5m === "number" &&
        snap.volume5m >= 2000;

      const hasBuyPressure =
        typeof snap.buys === "number" &&
        typeof snap.sells === "number" &&
        snap.buys > snap.sells;

      const isFresh = age < 30;

      const hasSafeDevHolding =
        typeof snap.devHoldingPercent === "number" &&
        snap.devHoldingPercent < 4;

      const hasSafeTop10Holding =
        typeof snap.top10HoldingPercent === "number" &&
        snap.top10HoldingPercent < 12;

      const hasSmartWalletSupport = smartDegenCount >= 0;

      const hasSafeBotCount = botDegenCount <= 6;

      const hasSafeRatCount = ratTraderCount <= 10;

      const hasSafeSniperCount =
  sniperCount >= 2 && sniperCount <= 12;

      const hasMomentum = momentumScore >= 40;

      const hasVelocityBreakout =
        breakoutScore >= 50 && velocityFlagged;


      const hasSafeBundle =
        !bundleFlagged &&
        bundleScore < 18 &&
        bundledWalletCount < 4;

const failureReasons: string[] = [];

if (!isFresh) failureReasons.push("not_fresh");
if (!hasLiquidity) failureReasons.push("low_liquidity");
if (!hasMarketCap) failureReasons.push("low_market_cap");
if (!hasVolume) failureReasons.push("low_volume");
if (!hasBuyPressure) failureReasons.push("no_buy_pressure");

if (!hasSafeDevHolding) failureReasons.push("unsafe_dev_holding");
if (!hasSafeTop10Holding) failureReasons.push("high_top10_concentration");

if (!hasSmartWalletSupport) failureReasons.push("no_smart_wallet_support");
if (!hasSafeBotCount) failureReasons.push("too_many_bots");
if (!hasSafeRatCount) failureReasons.push("too_many_rat_traders");

if (!hasSafeBundle) failureReasons.push("bundle_risk");

if (!hasSafeSniperCount) failureReasons.push("unsafe_sniper_count");

if (!hasMomentum) failureReasons.push("low_momentum");

if (!hasVelocityBreakout) failureReasons.push("no_velocity_breakout");


      const isMatch =
        isFresh &&
        hasLiquidity &&
        hasMarketCap &&
        hasVolume &&
        hasBuyPressure &&
        hasSafeDevHolding &&
        hasSafeTop10Holding &&
        hasSmartWalletSupport &&
        hasSafeBotCount &&
        hasSafeRatCount &&
        hasSafeBundle &&
        hasSafeSniperCount &&
        hasMomentum &&
        hasVelocityBreakout;

      console.log("🧪 Signal check:", {
        mintAddress: snap.mintAddress,
        age,
        liquidityUsd: snap.liquidityUsd,
        marketCap: snap.marketCap,
        volume5m: snap.volume5m,
        buys: snap.buys,
        sells: snap.sells,

        devHoldingPercent: snap.devHoldingPercent,
        top10HoldingPercent: snap.top10HoldingPercent,

        smartDegenCount,
        botDegenCount,
        ratTraderCount,

        sniperCount,

        bundleScore,
        bundledWalletCount,
        bundleFlagged,

        fundingClusterScore,
        largestFundingClusterSize,

        momentumScore,

        breakoutScore,
        velocityFlagged,
        hasVelocityBreakout,

        isBoosted,
        hasLiquidity,
        hasMarketCap,
        hasVolume,
        hasBuyPressure,
        isFresh,
        hasSmartWalletSupport,
        hasSafeBotCount,
        hasSafeRatCount,
        hasSafeSniperCount,
        hasMomentum,

        isMatch
      });

      if (!isMatch) {
  console.log(
    `❌ Signal rejected for ${snap.mintAddress}:`,
    failureReasons
  );
  continue;
}

 const message = `
🚨 *BOOSTED MEME SIGNAL*

*Market*
• Age: ${age} minutes
• Liquidity: $${snap.liquidityUsd?.toLocaleString()}
• Market Cap: $${snap.marketCap?.toLocaleString()}
• Volume (5m): $${snap.volume5m?.toLocaleString()}
• Buys / Sells: ${snap.buys} / ${snap.sells}

*Holder Safety*
• Dev Holding: ${snap.devHoldingPercent?.toFixed(2)}%
• Top 10 Holding: ${snap.top10HoldingPercent?.toFixed(2)}%

*Wallet Intelligence*
• Smart Degens: ${smartDegenCount}
• Bot Degens: ${botDegenCount}
• Rat Traders: ${ratTraderCount}
• Alpha Callers: ${alphaCallerCount}
• Sniper Wallets: ${sniperCount}

*Risk / Structure*
• Bundle Score: ${bundleScore}
• Bundled Wallets: ${bundledWalletCount}
• Funding Cluster Score: ${fundingClusterScore}
• Largest Funding Cluster: ${largestFundingClusterSize}

*Momentum*
• Momentum Score: ${momentumScore}
• Velocity Breakout Score: ${breakoutScore}

*Status*
• Boosted: ${isBoosted ? "YES" : "NO"}

*CA*
\`${snap.mintAddress}\`
`;

      await sendTelegramSignal(message);

      snap.signalSent = true;

      await snap.save();

      console.log("🚨 Signal triggered:", snap.mintAddress);
    }
  } catch (error) {
    console.error("Signal engine error:", error);
  }
}