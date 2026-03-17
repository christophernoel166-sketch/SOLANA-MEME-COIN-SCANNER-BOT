import mongoose, { Schema, Document } from "mongoose";

export interface ITokenBundleStats extends Document {
  mintAddress: string;

  bundledWalletCount: number;
  bundleScore: number;

  sameSecondClusterCount: number;
  firstThirtySecondBuyers: number;
  similarSizeClusterCount: number;

  flagged: boolean;
  analyzedAt: Date;

  createdAt: Date;
  updatedAt: Date;
}

const TokenBundleStatsSchema = new Schema<ITokenBundleStats>(
  {
    mintAddress: {
      type: String,
      required: true,
      index: true
    },

    bundledWalletCount: {
      type: Number,
      default: 0
    },

    bundleScore: {
      type: Number,
      default: 0
    },

    sameSecondClusterCount: {
      type: Number,
      default: 0
    },

    firstThirtySecondBuyers: {
      type: Number,
      default: 0
    },

    similarSizeClusterCount: {
      type: Number,
      default: 0
    },

    flagged: {
      type: Boolean,
      default: false
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

export default mongoose.model<ITokenBundleStats>(
  "TokenBundleStats",
  TokenBundleStatsSchema
);