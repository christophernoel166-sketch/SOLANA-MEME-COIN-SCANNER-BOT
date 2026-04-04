import Token from "../models/Token";
import TokenSnapshot from "../models/TokenSnapshot";
import { fetchMarketData } from "../services/marketService";
import { fetchHolderAnalysis } from "../services/holderService";
import { analyzeAndSaveTokenWalletStats } from "../services/walletIntelligenceService";
import { detectBundlesForToken } from "../services/bundleDetectionService";
import { detectFundingClusters } from "../services/fundingClusterService";
import {
  getEarlyBuyers,
  recordApproximateEarlyBuyers
} from "../services/earlyBuyerService";
import { getTokenAgeMinutes } from "../utils/tokenUtils";
import { trackSniperWallets } from "../services/sniperService";
import { calculateMomentum } from "../services/momentumService";
import { calculateVelocityBreakout } from "../services/velocityService";

let isEnrichmentRunning = false;

export function startEnrichmentJob(): void {
  console.log("📊 Market enrichment engine started");

  setInterval(async () => {
    if (isEnrichmentRunning) {
      console.log("⏳ Enrichment job still running, skipping this cycle");
      return;
    }

    isEnrichmentRunning = true;

    try {
      const tokens = await Token.find()
        .sort({ createdAt: -1 })
        .limit(10);

      console.log(`📦 Tokens found for enrichment: ${tokens.length}`);

      if (tokens.length === 0) {
        console.log("⚠️ No tokens available for enrichment");
        return;
      }

      for (const token of tokens) {
        console.log(`🔍 Enriching token: ${token.mintAddress}`);

        const market = await fetchMarketData(token.mintAddress);

        if (!market) {
          console.log(`⚠️ No market data for: ${token.mintAddress}`);
          continue;
        }

        console.log(`✅ Market data found for: ${token.mintAddress}`);

        const priceUsd =
          market.priceUsd !== undefined && market.priceUsd !== null
            ? Number(market.priceUsd)
            : null;

        const liquidityUsd = market.liquidity?.usd ?? null;
        const marketCap = market.marketCap ?? null;
        const buys = market.txns?.m5?.buys ?? null;
        const sells = market.txns?.m5?.sells ?? null;
        const volume5m = market.volume?.m5 ?? null;
        const pairCreatedAt = market.pairCreatedAt ?? null;
        const boostsActive = market.boosts?.active ?? 0;

        const ageMinutes = getTokenAgeMinutes(pairCreatedAt);

        if (typeof ageMinutes === "number" && ageMinutes > 240) {
          console.log(
            `⏭️ Skipping ${token.mintAddress} in enrichment (older than 60 minutes)`
          );
          continue;
        }

        const isFresh =
  typeof ageMinutes === "number" && ageMinutes <= 240;

        const hasLiquidity =
          typeof liquidityUsd === "number" && liquidityUsd >= 15000;

        const hasMarketCap =
          typeof marketCap === "number" && marketCap >= 60000;

        const hasVolume =
          typeof volume5m === "number" && volume5m >= 3000;

        const hasBuyPressure =
          typeof buys === "number" &&
          typeof sells === "number" &&
          buys > sells;

        const isBoosted =
          typeof boostsActive === "number" && boostsActive >= 0;

        const passesMarketFilters =
          isFresh &&
          hasLiquidity &&
          hasMarketCap &&
          hasVolume &&
          hasBuyPressure;

        const rejectionReasons: string[] = [];

        if (!isFresh) rejectionReasons.push("not_fresh");
        if (!hasLiquidity) rejectionReasons.push("low_liquidity");
        if (!hasMarketCap) rejectionReasons.push("low_market_cap");
        if (!hasVolume) rejectionReasons.push("low_volume");
        if (!hasBuyPressure) rejectionReasons.push("no_buy_pressure");

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
          passesMarketFilters,
          rejectionReasons
        });

        let holderCount: number | null = null;
        let largestHolderPercent: number | null = null;
        let devHoldingPercent: number | null = null;
        let top10HoldingPercent: number | null = null;

        if (passesMarketFilters) {
          let holderAnalysis: Awaited<ReturnType<typeof fetchHolderAnalysis>> | null =
            null;

          const now = Date.now();
          const cacheDuration = 5 * 60 * 1000; // 5 minutes

          const existingSnapshot = await TokenSnapshot.findOne({
            mintAddress: token.mintAddress
          });

          if (
            existingSnapshot &&
            existingSnapshot.holderLastCheckedAt &&
            now - new Date(existingSnapshot.holderLastCheckedAt).getTime() <
              cacheDuration
          ) {
            console.log(`⏭️ Using cached holder data for ${token.mintAddress}`);

            holderCount = existingSnapshot.holderCount ?? null;
            largestHolderPercent =
              existingSnapshot.largestHolderPercent ?? null;
            devHoldingPercent = existingSnapshot.devHoldingPercent ?? null;
            top10HoldingPercent =
              existingSnapshot.top10HoldingPercent ?? null;
          } else {
            console.log(`👥 Running holder analysis for ${token.mintAddress}`);

            holderAnalysis = await fetchHolderAnalysis(token.mintAddress, {
              marketContext: {
                dexId: market.dexId ?? null,
                pairAddress: market.pairAddress ?? null,
                labels: market.labels ?? null
              }
            });

            holderCount = holderAnalysis.holderCount ?? null;
            largestHolderPercent =
              holderAnalysis.largestHolderPercent ?? null;
            devHoldingPercent = holderAnalysis.devHoldingPercent ?? null;
            top10HoldingPercent =
              holderAnalysis.top10HoldingPercent ?? null;
          }

          console.log(
            `👥 Holder analysis complete for ${token.mintAddress} | holders=${holderCount} largest=${largestHolderPercent} dev=${devHoldingPercent} top10=${top10HoldingPercent}`
          );

          if (holderAnalysis && holderAnalysis.topHolders.length > 0) {
            const tokenLaunchTime = pairCreatedAt
              ? new Date(pairCreatedAt)
              : null;

            await recordApproximateEarlyBuyers({
              mintAddress: token.mintAddress,
              tokenLaunchTime,
              buyers: holderAnalysis.topHolders.map((holder) => ({
                owner: holder.address,
                amount: holder.amount,
                percentage: holder.percent
              })),
              priceUsd
            });

            console.log(
              `⏱️ Approximate early buyers recorded for ${token.mintAddress}: ${holderAnalysis.topHolders.length}`
            );

            await calculateMomentum(token.mintAddress);
            console.log(`⚡ Momentum calculated for ${token.mintAddress}`);

            await trackSniperWallets(token.mintAddress);
            console.log(`🎯 Sniper wallets tracked for ${token.mintAddress}`);

            const walletStats = await analyzeAndSaveTokenWalletStats({
              mintAddress: token.mintAddress,
              holders: holderAnalysis.topHolders.map((holder) => ({
                owner: holder.address,
                amount: holder.amount,
                percentage: holder.percent
              }))
            });

            console.log(
              `🧠 Wallet intelligence saved for ${token.mintAddress}`,
              walletStats.result
            );
          }

          const bundleStats = await detectBundlesForToken(token.mintAddress);

          console.log(`📦 Bundle stats saved for ${token.mintAddress}`, {
            bundledWalletCount: bundleStats.bundledWalletCount,
            bundleScore: bundleStats.bundleScore,
            flagged: bundleStats.flagged
          });

          const earlyBuyers = await getEarlyBuyers(token.mintAddress, 20);

          if (earlyBuyers.length > 0) {
            const buyerFunders = earlyBuyers.map((buyer) => ({
              walletAddress: buyer.walletAddress,
              funder: null as string | null
            }));

            const fundingCluster = await detectFundingClusters(
              token.mintAddress,
              buyerFunders
            );

            console.log(
              `🏦 Funding cluster stats saved for ${token.mintAddress}`,
              {
                uniqueFundingWalletCount:
                  fundingCluster.uniqueFundingWalletCount,
                largestFundingClusterSize:
                  fundingCluster.largestFundingClusterSize,
                fundingClusterScore:
                  fundingCluster.fundingClusterScore,
                flagged: fundingCluster.flagged
              }
            );
          } else {
            console.log(
              `🏦 Skipping funding cluster analysis for ${token.mintAddress} (no early buyers yet)`
            );
          }

          console.log(`[ENRICH] Snapshot values for ${token.mintAddress}`, {
            holderCount,
            largestHolderPercent,
            devHoldingPercent,
            top10HoldingPercent
          });

          const snapshot = await TokenSnapshot.findOneAndUpdate(
            { mintAddress: token.mintAddress },
            {
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

              holderCount: holderCount ?? null,
              largestHolderPercent: largestHolderPercent ?? null,
              devHoldingPercent: devHoldingPercent ?? null,
              top10HoldingPercent: top10HoldingPercent ?? null,
              holderLastCheckedAt: new Date(),

              signalSent: false,
              enrichmentComplete: true
            },
            {
              upsert: true,
              new: true
            }
          );

          console.log(`📊 Snapshot saved for ${token.mintAddress}`, snapshot._id);

          await calculateVelocityBreakout(token.mintAddress);
          console.log(`📈 Velocity breakout calculated for ${token.mintAddress}`);
        } else {
          console.log(
            `⏭️ Skipping advanced analysis for ${token.mintAddress} (market filters not passed)`
          );

          console.log(
            `🚫 Snapshot skipped for ${token.mintAddress} (did not pass market filters)`
          );
        }
      }
    } catch (error) {
      console.error("Enrichment error:", error);
    } finally {
      isEnrichmentRunning = false;
    }
  }, 15000);
}