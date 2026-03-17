import mongoose, { Schema, Document } from "mongoose";

export interface ITokenWalletStats extends Document {
  mintAddress: string;

  smartDegenCount: number;
  smartDegenHoldingPercent: number;

  botDegenCount: number;
  botDegenHoldingPercent: number;

  ratTraderCount: number;
  ratTraderHoldingPercent: number;

  alphaCallerCount: number;

  pumpReplyCount?: number | null;

  analyzedAt: Date;

  createdAt: Date;
  updatedAt: Date;
}

const TokenWalletStatsSchema = new Schema<ITokenWalletStats>(
  {
    mintAddress: {
      type: String,
      required: true,
      index: true
    },

    smartDegenCount: {
      type: Number,
      default: 0
    },

    smartDegenHoldingPercent: {
      type: Number,
      default: 0
    },

    botDegenCount: {
      type: Number,
      default: 0
    },

    botDegenHoldingPercent: {
      type: Number,
      default: 0
    },

    ratTraderCount: {
      type: Number,
      default: 0
    },

    ratTraderHoldingPercent: {
      type: Number,
      default: 0
    },

    alphaCallerCount: {
      type: Number,
      default: 0
    },

    pumpReplyCount: {
      type: Number,
      default: null
    },

    analyzedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model<ITokenWalletStats>(
  "TokenWalletStats",
  TokenWalletStatsSchema
);