"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const db_1 = require("./config/db");
const Token_1 = __importDefault(require("./models/Token"));
const TokenSnapshot_1 = __importDefault(require("./models/TokenSnapshot"));
const discoverTokensJob_1 = require("./jobs/discoverTokensJob");
const enrichTokensJob_1 = require("./jobs/enrichTokensJob");
const signalJob_1 = require("./jobs/signalJob");
const telegramService_1 = require("./services/telegramService");
const boostService_1 = require("./services/boostService");
const WalletLabel_1 = __importDefault(require("./models/WalletLabel"));
const earlyBuyerService_1 = require("./services/earlyBuyerService");
const TokenWalletStats_1 = __importDefault(require("./models/TokenWalletStats"));
const walletIntelligenceService_1 = require("./services/walletIntelligenceService");
const TokenBundleStats_1 = __importDefault(require("./models/TokenBundleStats"));
const bundleDetectionService_1 = require("./services/bundleDetectionService");
const TokenFundingCluster_1 = __importDefault(require("./models/TokenFundingCluster"));
const fundingClusterService_1 = require("./services/fundingClusterService");
const TokenEarlyBuyer_1 = __importDefault(require("./models/TokenEarlyBuyer"));
const sniperIntelService_1 = require("./services/sniperIntelService");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = Number(process.env.PORT) || 5000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
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
        await (0, telegramService_1.sendTelegramSignal)("🚀 Meme Scanner Bot Test Signal");
        res.send("Signal sent to Telegram");
    }
    catch (error) {
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
        const token = await Token_1.default.create({
            mintAddress: "TEST_" + Date.now(),
            name: "Test Token",
            symbol: "TEST"
        });
        res.json({
            success: true,
            token
        });
    }
    catch (error) {
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
        const snapshots = await TokenSnapshot_1.default.find()
            .sort({ createdAt: -1 })
            .limit(20);
        res.json({
            success: true,
            count: snapshots.length,
            snapshots
        });
    }
    catch (error) {
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
        const sniperCount = await (0, sniperIntelService_1.getSniperCount)(mintAddress);
        res.json({
            success: true,
            mintAddress,
            sniperCount
        });
    }
    catch (error) {
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
            await TokenEarlyBuyer_1.default.create({
                mintAddress,
                walletAddress: buyers[i].walletAddress,
                amount: buyers[i].amount,
                priceUsd: 0.00001,
                entryTime: new Date(),
                entryDelaySeconds: buyers[i].delay,
                sequence: i + 1
            });
        }
        const result = await (0, bundleDetectionService_1.detectBundlesForToken)(mintAddress);
        const saved = await TokenBundleStats_1.default.findOne({ mintAddress }).lean();
        res.json({
            success: true,
            mintAddress,
            bundleStats: result,
            saved
        });
    }
    catch (error) {
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
        const stats = await TokenWalletStats_1.default.find()
            .sort({ updatedAt: -1 })
            .limit(20);
        res.json({
            success: true,
            count: stats.length,
            stats
        });
    }
    catch (error) {
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
            await (0, earlyBuyerService_1.recordEarlyBuyer)({
                mintAddress,
                walletAddress: wallet,
                amount: Math.random() * 100000,
                priceUsd: Math.random() * 0.0001,
                entryTime: new Date(),
                tokenLaunchTime: new Date(Date.now() - 20000)
            });
        }
        const stored = await (0, earlyBuyerService_1.getEarlyBuyers)(mintAddress, 20);
        res.json({
            success: true,
            mintAddress,
            earlyBuyers: stored
        });
    }
    catch (error) {
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
        const snapshot = await TokenSnapshot_1.default.findOne({ mintAddress })
            .sort({ createdAt: -1 })
            .lean();
        const earlyBuyers = await TokenEarlyBuyer_1.default.find({ mintAddress })
            .sort({ sequence: 1 })
            .limit(20)
            .lean();
        const walletStats = await TokenWalletStats_1.default.findOne({ mintAddress }).lean();
        const bundleStats = await TokenBundleStats_1.default.findOne({ mintAddress }).lean();
        const fundingCluster = await TokenFundingCluster_1.default.findOne({ mintAddress }).lean();
        res.json({
            success: true,
            mintAddress,
            snapshot,
            earlyBuyers,
            walletStats,
            bundleStats,
            fundingCluster
        });
    }
    catch (error) {
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
        const result = await (0, fundingClusterService_1.detectFundingClusters)(mintAddress, buyerFunders);
        const saved = await TokenFundingCluster_1.default.findOne({ mintAddress }).lean();
        res.json({
            success: true,
            mintAddress,
            fundingCluster: result,
            saved
        });
    }
    catch (error) {
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
            await (0, earlyBuyerService_1.recordEarlyBuyer)({
                mintAddress,
                walletAddress: buyer.walletAddress,
                amount: buyer.amount,
                priceUsd: 0.00001,
                entryTime: new Date(),
                tokenLaunchTime: new Date(Date.now() - 20000)
            });
        }
        const earlyBuyers = await (0, earlyBuyerService_1.getEarlyBuyers)(mintAddress, 20);
        const holders = buyers.map((buyer) => ({
            owner: buyer.walletAddress,
            amount: buyer.amount,
            percentage: buyer.percentage
        }));
        const analysis = await (0, walletIntelligenceService_1.analyzeAndSaveTokenWalletStats)({
            mintAddress,
            holders
        });
        const savedStats = await TokenWalletStats_1.default.findOne({ mintAddress }).lean();
        res.json({
            success: true,
            mintAddress,
            earlyBuyers,
            walletStats: analysis.result,
            savedStats
        });
    }
    catch (error) {
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
        const snapshots = await TokenSnapshot_1.default.find()
            .sort({ createdAt: -1 })
            .limit(20)
            .select("mintAddress createdAt liquidityUsd marketCap volume5m boostsActive")
            .lean();
        res.json({
            success: true,
            count: snapshots.length,
            snapshots
        });
    }
    catch (error) {
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
        const buyers = await TokenEarlyBuyer_1.default.find()
            .sort({ updatedAt: -1 })
            .limit(50);
        res.json({
            success: true,
            count: buyers.length,
            buyers
        });
    }
    catch (error) {
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
        const stats = await TokenFundingCluster_1.default.find()
            .sort({ updatedAt: -1 })
            .limit(20);
        res.json({
            success: true,
            count: stats.length,
            stats
        });
    }
    catch (error) {
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
        const stats = await TokenBundleStats_1.default.find()
            .sort({ updatedAt: -1 })
            .limit(20);
        res.json({
            success: true,
            count: stats.length,
            stats
        });
    }
    catch (error) {
        console.error("Debug bundle stats error:", error);
        res.status(500).json({
            success: false,
            error: "Failed to fetch bundle stats"
        });
    }
});
app.get("/debug-boosts", async (_req, res) => {
    try {
        const boosts = await (0, boostService_1.fetchBoostedTokens)();
        res.json({
            success: true,
            count: boosts.length,
            boosts
        });
    }
    catch (error) {
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
        const result = await WalletLabel_1.default.insertMany(wallets, {
            ordered: false
        }).catch(() => null);
        res.json({
            success: true,
            inserted: result?.length || 0
        });
    }
    catch (error) {
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
async function startServer() {
    await (0, db_1.connectDB)();
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
    (0, discoverTokensJob_1.startDiscoveryJob)();
    (0, enrichTokensJob_1.startEnrichmentJob)();
    (0, signalJob_1.startSignalJob)();
}
startServer();
//# sourceMappingURL=index.js.map