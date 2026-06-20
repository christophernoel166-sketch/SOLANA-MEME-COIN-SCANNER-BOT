import mongoose, { Schema, Document } from "mongoose";

export interface IPatternSnapshot extends Document {
  mintAddress: string;

  smartWalletCount: number;

  walletPerformanceScore: number;

  momentumScore: number;

  breakoutScore: number;

  bundleScore: number;

  fundingClusterScore: number;

  liquidityUsd: number;

  marketCap: number;

  volume5m: number;
returnPct: number;

maxGainPct: number;

drawdownPct: number;
  outcome: "pending" | "win" | "loss" | "neutral";

  createdAt: Date;
  updatedAt: Date;
}

const PatternSnapshotSchema =
  new Schema<IPatternSnapshot>(
    {
      mintAddress: {
        type: String,
        required: true,
        unique: true,
        index: true,
      },

      smartWalletCount: {
        type: Number,
        default: 0,
      },

      walletPerformanceScore: {
        type: Number,
        default: 0,
      },

      momentumScore: {
        type: Number,
        default: 0,
      },

      breakoutScore: {
        type: Number,
        default: 0,
      },

      bundleScore: {
        type: Number,
        default: 0,
      },

      fundingClusterScore: {
        type: Number,
        default: 0,
      },

      liquidityUsd: {
        type: Number,
        default: 0,
      },

      marketCap: {
        type: Number,
        default: 0,
      },

      volume5m: {
        type: Number,
        default: 0,
      },

returnPct: {
  type: Number,
  default: 0,
},

maxGainPct: {
  type: Number,
  default: 0,
},

drawdownPct: {
  type: Number,
  default: 0,
},

      outcome: {
        type: String,
        enum: [
          "pending",
          "win",
          "loss",
          "neutral",
        ],
        default: "pending",
      },
    },
    {
      timestamps: true,
    }
  );

export default mongoose.model<IPatternSnapshot>(
  "PatternSnapshot",
  PatternSnapshotSchema
);