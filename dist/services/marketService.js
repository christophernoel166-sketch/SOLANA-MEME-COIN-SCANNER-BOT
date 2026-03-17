"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchMarketData = fetchMarketData;
const axios_1 = __importDefault(require("axios"));
async function fetchMarketData(tokenAddress) {
    try {
        const url = `https://api.dexscreener.com/token-pairs/v1/solana/${tokenAddress}`;
        console.log(`🌐 Fetching market data: ${url}`);
        const response = await axios_1.default.get(url, {
            timeout: 10000
        });
        const pairs = response.data;
        if (!pairs || !Array.isArray(pairs) || pairs.length === 0) {
            console.log(`⚠️ Empty market response for ${tokenAddress}`);
            return null;
        }
        const validPairs = pairs.filter((pair) => {
            return (pair &&
                pair.chainId === "solana" &&
                !!pair.pairAddress &&
                (pair.baseToken?.address === tokenAddress ||
                    pair.quoteToken?.address === tokenAddress));
        });
        if (validPairs.length === 0) {
            console.log(`⚠️ No valid Solana pairs found for ${tokenAddress}`);
            return null;
        }
        // Pick the strongest pool:
        // 1. Highest liquidity
        // 2. Then highest 5m volume
        const bestPair = validPairs.sort((a, b) => {
            const liquidityA = a.liquidity?.usd ?? 0;
            const liquidityB = b.liquidity?.usd ?? 0;
            if (liquidityB !== liquidityA) {
                return liquidityB - liquidityA;
            }
            const volumeA = a.volume?.m5 ?? 0;
            const volumeB = b.volume?.m5 ?? 0;
            return volumeB - volumeA;
        })[0];
        console.log(`✅ Best pair selected for ${tokenAddress}: ${bestPair.pairAddress}`);
        return bestPair;
    }
    catch (error) {
        console.error(`❌ Market fetch error for ${tokenAddress}:`, error);
        return null;
    }
}
//# sourceMappingURL=marketService.js.map