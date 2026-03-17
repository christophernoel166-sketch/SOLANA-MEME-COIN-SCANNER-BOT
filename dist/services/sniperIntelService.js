"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSniperCount = getSniperCount;
const TokenEarlyBuyer_1 = __importDefault(require("../models/TokenEarlyBuyer"));
const SniperWallet_1 = __importDefault(require("../models/SniperWallet"));
async function getSniperCount(mintAddress) {
    const buyers = await TokenEarlyBuyer_1.default.find({
        mintAddress
    }).limit(10);
    let sniperCount = 0;
    for (const buyer of buyers) {
        const sniper = await SniperWallet_1.default.findOne({
            walletAddress: buyer.walletAddress
        });
        if (!sniper)
            continue;
        if (sniper.earlyBuyCount >= 3) {
            sniperCount++;
        }
    }
    return sniperCount;
}
//# sourceMappingURL=sniperIntelService.js.map