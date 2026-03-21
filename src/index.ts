import "dotenv/config";

import express from "express";
import cors from "cors";

import { connectDB } from "./config/db";
import Token from "./models/Token";
import TokenSnapshot from "./models/TokenSnapshot";
import { startDiscoveryJob } from "./jobs/discoverTokensJob";
import { startEnrichmentJob } from "./jobs/enrichTokensJob";
import { startSignalJob } from "./jobs/signalJob";
import { sendTelegramSignal } from "./services/telegramService";
import { fetchBoostedTokens } from "./services/boostService";
import WalletLabel from "./models/WalletLabel";
import { recordEarlyBuyer, getEarlyBuyers } from "./services/earlyBuyerService";
import TokenWalletStats from "./models/TokenWalletStats";
import { analyzeAndSaveTokenWalletStats } from "./services/walletIntelligenceService";
import TokenBundleStats from "./models/TokenBundleStats";
import { detectBundlesForToken } from "./services/bundleDetectionService";
import TokenFundingCluster from "./models/TokenFundingCluster";
import { detectFundingClusters } from "./services/fundingClusterService";
import TokenEarlyBuyer from "./models/TokenEarlyBuyer";
import { getSniperCount } from "./services/sniperIntelService";

const app = express();
const PORT = Number(process.env.PORT) || 5000;

app.use(cors());
app.use(express.json());
/*
|--------------------------------------------------------------------------
| Root Route
|--------------------------------------------------------------------------
*/

app.get("/", (_req, res) => {
  res.send("Meme Scanner Bot API is running...");
});

/*
|--------------------------------------------------------------------------
| Telegram Test Route
|--------------------------------------------------------------------------
*/

app.get("/test-signal", async (_req, res) => {
  try {
    await sendTelegramSignal("🚀 Meme Scanner Bot Test Signal");

    res.send("Signal sent to Telegram");
  } catch (error) {
    console.error("Test signal error:", error);

    res.status(500).send("Failed to send signal");
  }
});

/*
|--------------------------------------------------------------------------
| Test MongoDB Token Insert
|--------------------------------------------------------------------------
*/

app.get("/test-token", async (_req, res) => {
  try {
    const token = await Token.create({
      mintAddress: "TEST_" + Date.now(),
      name: "Test Token",
      symbol: "TEST"
    });

    res.json({
      success: true,
      token
    });
  } catch (error) {
    console.error("Error creating token:", error);

    res.status(500).json({
      success: false,
      error: "Failed to create token"
    });
  }
});

/*
|--------------------------------------------------------------------------
| Debug Recent Snapshots
|--------------------------------------------------------------------------
*/

app.get("/debug-snapshots", async (_req, res) => {
  try {
    const snapshots = await TokenSnapshot.find()
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({
      success: true,
      count: snapshots.length,
      snapshots
    });
  } catch (error) {
    console.error("Debug snapshots error:", error);

    res.status(500).json({
      success: false,
      error: "Failed to fetch snapshots"
    });
  }
});

// TEST SNIPER COUNT
app.get("/test-sniper-count/:mintAddress", async (req, res) => {
  try {
    const { mintAddress } = req.params;

    const sniperCount = await getSniperCount(mintAddress);

    res.json({
      success: true,
      mintAddress,
      sniperCount
    });
  } catch (error) {
    console.error("Sniper count test error:", error);

    res.status(500).json({
      success: false,
      error: "Failed to get sniper count"
    });
  }
});

// TEST BUNDLE DETECTION
app.get("/test-bundle-detection", async (_req, res) => {
  try {
    const mintAddress = "BUNDLE_TEST_" + Date.now();

    const buyers = [
      { walletAddress: "WALLET_1", amount: 100000, delay: 5 },
      { walletAddress: "WALLET_2", amount: 101000, delay: 5 },
      { walletAddress: "WALLET_3", amount: 100500, delay: 5 },
      { walletAddress: "WALLET_4", amount: 99000, delay: 7 },
      { walletAddress: "WALLET_5", amount: 25000, delay: 40 }
    ];

    for (let i = 0; i < buyers.length; i++) {
      await TokenEarlyBuyer.create({
        mintAddress,
        walletAddress: buyers[i].walletAddress,
        amount: buyers[i].amount,
        priceUsd: 0.00001,
        entryTime: new Date(),
        entryDelaySeconds: buyers[i].delay,
        sequence: i + 1
      });
    }

    const result = await detectBundlesForToken(mintAddress);
    const saved = await TokenBundleStats.findOne({ mintAddress }).lean();

    res.json({
      success: true,
      mintAddress,
      bundleStats: result,
      saved
    });
  } catch (error) {
    console.error("Bundle detection test error:", error);

    res.status(500).json({
      success: false,
      error: "Failed to test bundle detection"
    });
  }
});

// DEBUG ROUTE
app.get("/debug-wallet-stats", async (_req, res) => {
  try {
    const stats = await TokenWalletStats.find()
      .sort({ updatedAt: -1 })
      .limit(20);

    res.json({
      success: true,
      count: stats.length,
      stats
    });
  } catch (error) {
    console.error("Debug wallet stats error:", error);

    res.status(500).json({
      success: false,
      error: "Failed to fetch wallet stats"
    });
  }
});

// TEST EARLY BUYERS
app.get("/test-early-buyers", async (_req, res) => {
  try {

    const mintAddress = "TEST_TOKEN_" + Date.now();

    const buyers = [
      "SMART_WALLET_1",
      "SMART_WALLET_2",
      "BOT_WALLET_1",
      "RANDOM_WALLET_1",
      "RANDOM_WALLET_2"
    ];

    for (const wallet of buyers) {
      await recordEarlyBuyer({
        mintAddress,
        walletAddress: wallet,
        amount: Math.random() * 100000,
        priceUsd: Math.random() * 0.0001,
        entryTime: new Date(),
        tokenLaunchTime: new Date(Date.now() - 20000)
      });
    }

    const stored = await getEarlyBuyers(mintAddress, 20);

    res.json({
      success: true,
      mintAddress,
      earlyBuyers: stored
    });

  } catch (error) {

    console.error("Early buyer test error:", error);

    res.status(500).json({
      success: false
    });

  }
});

// DEBUG TOKEN MINT ADDRESS
app.get("/debug-token/:mintAddress", async (req, res) => {
  try {
    const { mintAddress } = req.params;

    const snapshot = await TokenSnapshot.findOne({ mintAddress })
      .sort({ createdAt: -1 })
      .lean();

    const earlyBuyers = await TokenEarlyBuyer.find({ mintAddress })
      .sort({ sequence: 1 })
      .limit(20)
      .lean();

    const walletStats = await TokenWalletStats.findOne({ mintAddress }).lean();
    const bundleStats = await TokenBundleStats.findOne({ mintAddress }).lean();
    const fundingCluster = await TokenFundingCluster.findOne({ mintAddress }).lean();

    res.json({
      success: true,
      mintAddress,
      snapshot,
      earlyBuyers,
      walletStats,
      bundleStats,
      fundingCluster
    });
  } catch (error) {
    console.error("Debug token error:", error);

    res.status(500).json({
      success: false,
      error: "Failed to fetch token debug data"
    });
  }
});

// TEST FUNDING CLUTER
app.get("/test-funding-clusters", async (_req, res) => {
  try {
    const mintAddress = "FUNDING_TEST_" + Date.now();

    const buyerFunders = [
      { walletAddress: "BUYER_1", funder: "FUNDER_A" },
      { walletAddress: "BUYER_2", funder: "FUNDER_A" },
      { walletAddress: "BUYER_3", funder: "FUNDER_A" },
      { walletAddress: "BUYER_4", funder: "FUNDER_B" },
      { walletAddress: "BUYER_5", funder: "FUNDER_C" }
    ];

    const result = await detectFundingClusters(mintAddress, buyerFunders);
    const saved = await TokenFundingCluster.findOne({ mintAddress }).lean();

    res.json({
      success: true,
      mintAddress,
      fundingCluster: result,
      saved
    });
  } catch (error) {
    console.error("Funding cluster test error:", error);

    res.status(500).json({
      success: false,
      error: "Failed to test funding clusters"
    });
  }
});

// TEST WALLET INTELLIGENCE
app.get("/test-wallet-intelligence", async (_req, res) => {
  try {
    const mintAddress = "TEST_TOKEN_" + Date.now();

    const buyers = [
      {
        walletAddress: "SMART_WALLET_1",
        amount: 100000,
        percentage: 4.5
      },
      {
        walletAddress: "SMART_WALLET_2",
        amount: 90000,
        percentage: 3.8
      },
      {
        walletAddress: "BOT_WALLET_1",
        amount: 85000,
        percentage: 2.9
      },
      {
        walletAddress: "RAT_WALLET_1",
        amount: 60000,
        percentage: 2.1
      },
      {
        walletAddress: "CALLER_WALLET_1",
        amount: 75000,
        percentage: 3.2
      },
      {
        walletAddress: "RANDOM_WALLET_1",
        amount: 30000,
        percentage: 1.0
      }
    ];

    for (const buyer of buyers) {
      await recordEarlyBuyer({
        mintAddress,
        walletAddress: buyer.walletAddress,
        amount: buyer.amount,
        priceUsd: 0.00001,
        entryTime: new Date(),
        tokenLaunchTime: new Date(Date.now() - 20000)
      });
    }

    const earlyBuyers = await getEarlyBuyers(mintAddress, 20);

    const holders = buyers.map((buyer) => ({
      owner: buyer.walletAddress,
      amount: buyer.amount,
      percentage: buyer.percentage
    }));

    const analysis = await analyzeAndSaveTokenWalletStats({
      mintAddress,
      holders
    });

    const savedStats = await TokenWalletStats.findOne({ mintAddress }).lean();

    res.json({
      success: true,
      mintAddress,
      earlyBuyers,
      walletStats: analysis.result,
      savedStats
    });
  } catch (error) {
    console.error("Wallet intelligence test error:", error);

    res.status(500).json({
      success: false,
      error: "Failed to test wallet intelligence"
    });
  }
});

// DEBUG LATEST MINT
app.get("/debug-latest-mints", async (_req, res) => {
  try {
    const snapshots = await TokenSnapshot.find()
      .sort({ createdAt: -1 })
      .limit(20)
      .select("mintAddress createdAt liquidityUsd marketCap volume5m boostsActive")
      .lean();

    res.json({
      success: true,
      count: snapshots.length,
      snapshots
    });
  } catch (error) {
    console.error("Debug latest mints error:", error);

    res.status(500).json({
      success: false,
      error: "Failed to fetch latest mints"
    });
  }
});

// DEBUG EARLY BUYER
app.get("/debug-early-buyers", async (_req, res) => {
  try {
    const buyers = await TokenEarlyBuyer.find()
      .sort({ updatedAt: -1 })
      .limit(50);

    res.json({
      success: true,
      count: buyers.length,
      buyers
    });
  } catch (error) {
    console.error("Debug early buyers error:", error);

    res.status(500).json({
      success: false,
      error: "Failed to fetch early buyers"
    });
  }
});

// DEBUG FUNDING CLUSTER
app.get("/debug-funding-clusters", async (_req, res) => {
  try {
    const stats = await TokenFundingCluster.find()
      .sort({ updatedAt: -1 })
      .limit(20);

    res.json({
      success: true,
      count: stats.length,
      stats
    });
  } catch (error) {
    console.error("Debug funding cluster error:", error);

    res.status(500).json({
      success: false,
      error: "Failed to fetch funding cluster stats"
    });
  }
});

// DEBUG BUNDLE STATS
app.get("/debug-bundle-stats", async (_req, res) => {
  try {
    const stats = await TokenBundleStats.find()
      .sort({ updatedAt: -1 })
      .limit(20);

    res.json({
      success: true,
      count: stats.length,
      stats
    });
  } catch (error) {
    console.error("Debug bundle stats error:", error);

    res.status(500).json({
      success: false,
      error: "Failed to fetch bundle stats"
    });
  }
});
app.get("/debug-boosts", async (_req, res) => {
  try {
    const boosts = await fetchBoostedTokens();

    res.json({
      success: true,
      count: boosts.length,
      boosts
    });
  } catch (error) {
    console.error("Debug boosts error:", error);

    res.status(500).json({
      success: false,
      error: "Failed to fetch boosted tokens"
    });
  }
});
// WALLET LABELS
app.get("/test-wallet-labels", async (_req, res) => {
  try {
    const wallets = [
      {
        walletAddress: "SMART_WALLET_1",
        labels: ["smart_degen"],
        smartScore: 90
      },
      {
        walletAddress: "SMART_WALLET_2",
        labels: ["smart_degen"],
        smartScore: 85
      },
      {
        walletAddress: "BOT_WALLET_1",
        labels: ["bot_degen"],
        botScore: 80
      },
      {
        walletAddress: "RAT_WALLET_1",
        labels: ["rat_trader"],
        ratScore: 70
      },
      {
        walletAddress: "CALLER_WALLET_1",
        labels: ["alpha_caller"],
        alphaCallerScore: 95
      }
    ];

    const result = await WalletLabel.insertMany(wallets, {
      ordered: false
    }).catch(() => null);

    res.json({
      success: true,
      inserted: result?.length || 0
    });

  } catch (error) {
    console.error("Wallet label insert error:", error);

    res.status(500).json({
      success: false
    });
  }
});

/*
|--------------------------------------------------------------------------
| Start Server
|--------------------------------------------------------------------------
*/

async function startServer(): Promise<void> {
  await connectDB();


  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });

  startDiscoveryJob();
  startEnrichmentJob();
  startSignalJob();
}

startServer();