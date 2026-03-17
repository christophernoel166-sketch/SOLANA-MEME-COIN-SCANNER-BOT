"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchTokenPairs = fetchTokenPairs;
const axios_1 = __importDefault(require("axios"));
async function fetchTokenPairs(mintAddress) {
    try {
        const url = `https://api.dexscreener.com/latest/dex/tokens/${mintAddress}`;
        const response = await axios_1.default.get(url);
        if (!response.data || !response.data.pairs) {
            return null;
        }
        return response.data.pairs;
    }
    catch (error) {
        console.error("DEX Screener error:", error);
        return null;
    }
}
//# sourceMappingURL=dexscreenerService.js.map