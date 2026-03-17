"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchBoostedTokens = fetchBoostedTokens;
exports.fetchBoostedTokenSet = fetchBoostedTokenSet;
exports.isTokenBoosted = isTokenBoosted;
const axios_1 = __importDefault(require("axios"));
const DEX_BOOSTS_URL = "https://api.dexscreener.com/token-boosts/latest/v1";
async function fetchBoostedTokens() {
    try {
        console.log(`🚀 Fetching boosted tokens: ${DEX_BOOSTS_URL}`);
        const response = await axios_1.default.get(DEX_BOOSTS_URL, {
            timeout: 10000
        });
        const tokens = response.data;
        if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
            console.log("⚠️ No boosted tokens returned");
            return [];
        }
        const solanaBoostedTokens = tokens.filter((token) => {
            return token?.chainId === "solana" && !!token?.tokenAddress;
        });
        console.log(`✅ Solana boosted tokens found: ${solanaBoostedTokens.length}`);
        return solanaBoostedTokens;
    }
    catch (error) {
        console.error("❌ Boost fetch error:", error);
        return [];
    }
}
async function fetchBoostedTokenSet() {
    const boostedTokens = await fetchBoostedTokens();
    const boostedSet = new Set();
    for (const token of boostedTokens) {
        if (!token.tokenAddress)
            continue;
        boostedSet.add(token.tokenAddress);
    }
    return boostedSet;
}
async function isTokenBoosted(tokenAddress) {
    const boostedSet = await fetchBoostedTokenSet();
    return boostedSet.has(tokenAddress);
}
//# sourceMappingURL=boostService.js.map