import mongoose, { Schema, Document } from "mongoose";

export interface ISniperWallet extends Document {
  walletAddress: string;

  earlyBuyCount: number;
  successfulTokenCount: number;

  totalTokensSeen: number;

  lastSeen: Date;

  createdAt: Date;
  updatedAt: Date;
}

const SniperWalletSchema = new Schema<ISniperWallet>(
  {
    walletAddress: { type: String, required: true, unique: true },

    earlyBuyCount: { type: Number, default: 0 },

    successfulTokenCount: { type: Number, default: 0 },

    totalTokensSeen: { type: Number, default: 0 },

    lastSeen: Date
  },
  {
    timestamps: true
  }
);

export default mongoose.model<ISniperWallet>(
  "SniperWallet",
  SniperWalletSchema
);