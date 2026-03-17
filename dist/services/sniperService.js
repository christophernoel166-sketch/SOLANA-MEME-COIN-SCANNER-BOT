"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.trackSniperWallets = trackSniperWallets;
const SniperWallet_1 = __importDefault(require("../models/SniperWallet"));
const TokenEarlyBuyer_1 = __importDefault(require("../models/TokenEarlyBuyer"));
async function trackSniperWallets(mintAddress) {
    try {
        const earlyBuyers = await TokenEarlyBuyer_1.default.find({
            mintAddress
        }).limit(10);
        for (const buyer of earlyBuyers) {
            const wallet = buyer.walletAddress;
            let sniper = await SniperWallet_1.default.findOne({
                walletAddress: wallet
            });
            if (!sniper) {
                sniper = await SniperWallet_1.default.create({
                    walletAddress: wallet,
                    earlyBuyCount: 1,
                    totalTokensSeen: 1,
                    lastSeen: new Date()
                });
                continue;
            }
            sniper.earlyBuyCount += 1;
            sniper.totalTokensSeen += 1;
            sniper.lastSeen = new Date();
            await sniper.save();
        }
    }
    catch (error) {
        console.error("Sniper tracking error:", error);
    }
}
//# sourceMappingURL=sniperService.js.map