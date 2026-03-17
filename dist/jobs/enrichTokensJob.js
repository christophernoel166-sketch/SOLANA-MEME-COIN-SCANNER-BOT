"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startEnrichmentJob = startEnrichmentJob;
const Token_1 = __importDefault(require("../models/Token"));
const TokenSnapshot_1 = __importDefault(require("../models/TokenSnapshot"));
const marketService_1 = require("../services/marketService");
const holderService_1 = require("../services/holderService");
const walletIntelligenceService_1 = require("../services/walletIntelligenceService");
const bundleDetectionService_1 = require("../services/bundleDetectionService");
const fundingClusterService_1 = require("../services/fundingClusterService");
const earlyBuyerService_1 = require("../services/earlyBuyerService");
const tokenUtils_1 = require("../utils/tokenUtils");
const sniperService_1 = require("../services/sniperService");
const momentumService_1 = require("../services/momentumService");
const velocityService_1 = require("../services/velocityService");
let isEnrichmentRunning = false;
function startEnrichmentJob() {
    console.log("📊 Market enrichment engine started");
    setInterval(async () => {
        if (isEnrichmentRunning) {
            console.log("⏳ Enrichment job still running, skipping this cycle");
            return;
        }
        isEnrichmentRunning = true;
        try {
            const tokens = await Token_1.default.find()
                .sort({ createdAt: -1 })
                .limit(10);
            console.log(`📦 Tokens found for enrichment: ${tokens.length}`);
            if (tokens.length === 0) {
                console.log("⚠️ No tokens available for enrichment");
                return;
            }
            for (const token of tokens) {
                console.log(`🔍 Enriching token: ${token.mintAddress}`);
                const market = await (0, marketService_1.fetchMarketData)(token.mintAddress);
                if (!market) {
                    console.log(`⚠️ No market data for: ${token.mintAddress}`);
                    continue;
                }
                console.log(`✅ Market data found for: ${token.mintAddress}`);
                const priceUsd = market.priceUsd !== undefined && market.priceUsd !== null
                    ? Number(market.priceUsd)
                    : null;
                const liquidityUsd = market.liquidity?.usd ?? null;
                const marketCap = market.marketCap ?? null;
                const buys = market.txns?.m5?.buys ?? null;
                const sells = market.txns?.m5?.sells ?? null;
                const volume5m = market.volume?.m5 ?? null;
                const pairCreatedAt = market.pairCreatedAt ?? null;
                const boostsActive = market.boosts?.active ?? 0;
                const ageMinutes = (0, tokenUtils_1.getTokenAgeMinutes)(pairCreatedAt);
                const isFresh = typeof ageMinutes === "number" && ageMinutes < 30;
                const hasLiquidity = typeof liquidityUsd === "number" && liquidityUsd >= 15000;
                const hasMarketCap = typeof marketCap === "number" && marketCap >= 30000;
                const hasVolume = typeof volume5m === "number" && volume5m >= 1000;
                const hasBuyPressure = typeof buys === "number" &&
                    typeof sells === "number" &&
                    buys > sells;
                const isBoosted = typeof boostsActive === "number" && boostsActive >= 0;
                const passesMarketFilters = isFresh &&
                    hasLiquidity &&
                    hasMarketCap &&
                    hasVolume &&
                    hasBuyPressure;
                console.log("🧪 Market filter check:", {
                    mintAddress: token.mintAddress,
                    ageMinutes,
                    liquidityUsd,
                    marketCap,
                    volume5m,
                    buys,
                    sells,
                    boostsActive,
                    isFresh,
                    hasLiquidity,
                    hasMarketCap,
                    hasVolume,
                    hasBuyPressure,
                    isBoosted,
                    passesMarketFilters
                });
                let holderCount = null;
                let devHoldingPercent = null;
                let top10HoldingPercent = null;
                if (passesMarketFilters) {
                    console.log(`👥 Running holder analysis for ${token.mintAddress}`);
                    const holderAnalysis = await (0, holderService_1.fetchHolderAnalysis)(token.mintAddress, priceUsd, marketCap);
                    holderCount = holderAnalysis.holderCount;
                    devHoldingPercent = holderAnalysis.devHoldingPercent;
                    top10HoldingPercent = holderAnalysis.top10HoldingPercent;
                    console.log(`👥 Holder analysis complete for ${token.mintAddress} | holders=${holderCount} dev=${devHoldingPercent} top10=${top10HoldingPercent}`);
                    if (holderAnalysis.top10Wallets.length > 0) {
                        const tokenLaunchTime = pairCreatedAt
                            ? new Date(pairCreatedAt)
                            : null;
                        await (0, earlyBuyerService_1.recordApproximateEarlyBuyers)({
                            mintAddress: token.mintAddress,
                            tokenLaunchTime,
                            buyers: holderAnalysis.top10Wallets,
                            priceUsd
                        });
                        console.log(`⏱️ Approximate early buyers recorded for ${token.mintAddress}: ${holderAnalysis.top10Wallets.length}`);
                        await (0, momentumService_1.calculateMomentum)(token.mintAddress);
                        console.log(`⚡ Momentum calculated for ${token.mintAddress}`);
                        await (0, sniperService_1.trackSniperWallets)(token.mintAddress);
                        console.log(`🎯 Sniper wallets tracked for ${token.mintAddress}`);
                        const walletStats = await (0, walletIntelligenceService_1.analyzeAndSaveTokenWalletStats)({
                            mintAddress: token.mintAddress,
                            holders: holderAnalysis.top10Wallets
                        });
                        console.log(`🧠 Wallet intelligence saved for ${token.mintAddress}`, walletStats.result);
                    }
                    const bundleStats = await (0, bundleDetectionService_1.detectBundlesForToken)(token.mintAddress);
                    console.log(`📦 Bundle stats saved for ${token.mintAddress}`, {
                        bundledWalletCount: bundleStats.bundledWalletCount,
                        bundleScore: bundleStats.bundleScore,
                        flagged: bundleStats.flagged
                    });
                    const earlyBuyers = await (0, earlyBuyerService_1.getEarlyBuyers)(token.mintAddress, 20);
                    if (earlyBuyers.length > 0) {
                        const buyerFunders = earlyBuyers.map((buyer) => ({
                            walletAddress: buyer.walletAddress,
                            funder: null
                        }));
                        const fundingCluster = await (0, fundingClusterService_1.detectFundingClusters)(token.mintAddress, buyerFunders);
                        console.log(`🏦 Funding cluster stats saved for ${token.mintAddress}`, {
                            uniqueFundingWalletCount: fundingCluster.uniqueFundingWalletCount,
                            largestFundingClusterSize: fundingCluster.largestFundingClusterSize,
                            fundingClusterScore: fundingCluster.fundingClusterScore,
                            flagged: fundingCluster.flagged
                        });
                    }
                    else {
                        console.log(`🏦 Skipping funding cluster analysis for ${token.mintAddress} (no early buyers yet)`);
                    }
                }
                else {
                    console.log(`⏭️ Skipping advanced analysis for ${token.mintAddress} (market filters not passed)`);
                }
                const snapshot = await TokenSnapshot_1.default.create({
                    mintAddress: token.mintAddress,
                    pairAddress: market.pairAddress ?? null,
                    priceUsd,
                    liquidityUsd,
                    marketCap,
                    buys,
                    sells,
                    volume5m,
                    pairCreatedAt,
                    boostsActive,
                    holderCount,
                    devHoldingPercent,
                    top10HoldingPercent,
                    signalSent: false
                });
                console.log(`📊 Snapshot saved for ${token.mintAddress}`, snapshot._id);
                await (0, velocityService_1.calculateVelocityBreakout)(token.mintAddress);
                console.log(`📈 Velocity breakout calculated for ${token.mintAddress}`);
            }
        }
        catch (error) {
            console.error("Enrichment error:", error);
        }
        finally {
            isEnrichmentRunning = false;
        }
    }, 15000);
}
//# sourceMappingURL=enrichTokensJob.js.map