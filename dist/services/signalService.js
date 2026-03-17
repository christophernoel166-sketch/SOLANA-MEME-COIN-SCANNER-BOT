"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runSignalEngine = runSignalEngine;
const TokenSnapshot_1 = __importDefault(require("../models/TokenSnapshot"));
const TokenWalletStats_1 = __importDefault(require("../models/TokenWalletStats"));
const TokenBundleStats_1 = __importDefault(require("../models/TokenBundleStats"));
const TokenFundingCluster_1 = __importDefault(require("../models/TokenFundingCluster"));
const TokenMomentum_1 = __importDefault(require("../models/TokenMomentum"));
const TokenVelocity_1 = __importDefault(require("../models/TokenVelocity"));
const boostService_1 = require("./boostService");
const telegramService_1 = require("./telegramService");
const tokenUtils_1 = require("../utils/tokenUtils");
const sniperIntelService_1 = require("./sniperIntelService");
async function runSignalEngine() {
    try {
        console.log("🧠 Running signal engine...");
        const boostedSet = await (0, boostService_1.fetchBoostedTokenSet)();
        console.log(`🚀 Boosted tokens loaded: ${boostedSet.size}`);
        const snapshots = await TokenSnapshot_1.default.find({ signalSent: false })
            .sort({ createdAt: -1 })
            .limit(30);
        for (const snap of snapshots) {
            const age = (0, tokenUtils_1.getTokenAgeMinutes)(snap.pairCreatedAt);
            if (age === null)
                continue;
            const [walletStats, bundleStats, fundingCluster, momentum, velocity] = await Promise.all([
                TokenWalletStats_1.default.findOne({
                    mintAddress: snap.mintAddress
                }).lean(),
                TokenBundleStats_1.default.findOne({
                    mintAddress: snap.mintAddress
                }).lean(),
                TokenFundingCluster_1.default.findOne({
                    mintAddress: snap.mintAddress
                }).lean(),
                TokenMomentum_1.default.findOne({
                    mintAddress: snap.mintAddress
                }).lean(),
                TokenVelocity_1.default.findOne({
                    mintAddress: snap.mintAddress
                }).lean()
            ]);
            const sniperCount = await (0, sniperIntelService_1.getSniperCount)(snap.mintAddress);
            const momentumScore = momentum?.momentumScore ?? 0;
            const breakoutScore = velocity?.breakoutScore ?? 0;
            const velocityFlagged = velocity?.flagged ?? false;
            const smartDegenCount = walletStats?.smartDegenCount ?? 0;
            const smartDegenHoldingPercent = walletStats?.smartDegenHoldingPercent ?? 0;
            const botDegenCount = walletStats?.botDegenCount ?? 0;
            const botDegenHoldingPercent = walletStats?.botDegenHoldingPercent ?? 0;
            const ratTraderCount = walletStats?.ratTraderCount ?? 0;
            const ratTraderHoldingPercent = walletStats?.ratTraderHoldingPercent ?? 0;
            const alphaCallerCount = walletStats?.alphaCallerCount ?? 0;
            const pumpReplyCount = walletStats?.pumpReplyCount ?? null;
            const bundleScore = bundleStats?.bundleScore ?? 0;
            const bundledWalletCount = bundleStats?.bundledWalletCount ?? 0;
            const bundleFlagged = bundleStats?.flagged ?? false;
            const fundingClusterScore = fundingCluster?.fundingClusterScore ?? 0;
            const largestFundingClusterSize = fundingCluster?.largestFundingClusterSize ?? 0;
            const fundingClusterFlagged = fundingCluster?.flagged ?? false;
            const isBoosted = boostedSet.has(snap.mintAddress);
            const hasLiquidity = typeof snap.liquidityUsd === "number" &&
                snap.liquidityUsd >= 25000;
            const hasMarketCap = typeof snap.marketCap === "number" &&
                snap.marketCap >= 60000;
            const hasVolume = typeof snap.volume5m === "number" &&
                snap.volume5m >= 2000;
            const hasBuyPressure = typeof snap.buys === "number" &&
                typeof snap.sells === "number" &&
                snap.buys > snap.sells;
            const isFresh = age < 30;
            const hasSafeDevHolding = typeof snap.devHoldingPercent === "number" &&
                snap.devHoldingPercent < 5;
            const hasSafeTop10Holding = typeof snap.top10HoldingPercent === "number" &&
                snap.top10HoldingPercent < 10;
            const hasSmartWalletSupport = smartDegenCount >= 2;
            const hasSafeBotCount = botDegenCount <= 2;
            const hasSafeRatCount = ratTraderCount <= 1;
            const hasSniperSupport = sniperCount >= 2;
            const hasMomentum = momentumScore >= 50;
            const hasVelocityBreakout = breakoutScore >= 50 && velocityFlagged;
            const hasSafeBundle = !bundleFlagged &&
                bundleScore < 18 &&
                bundledWalletCount < 4;
            const isMatch = isFresh &&
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
                hasSniperSupport &&
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
                hasSniperSupport,
                hasMomentum,
                isMatch
            });
            if (!isMatch)
                continue;
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
• Boosted: "YES" : "NO"}

*CA*
\`${snap.mintAddress}\`
`;
            await (0, telegramService_1.sendTelegramSignal)(message);
            snap.signalSent = true;
            await snap.save();
            console.log("🚨 Signal triggered:", snap.mintAddress);
        }
    }
    catch (error) {
        console.error("Signal engine error:", error);
    }
}
//# sourceMappingURL=signalService.js.map