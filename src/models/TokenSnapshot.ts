import mongoose, { Schema, Document } from "mongoose";

export interface ITokenSnapshot extends Document {
  mintAddress: string;
  pairAddress?: string | null;

  priceUsd?: number | null;
  liquidityUsd?: number | null;
  marketCap?: number | null;

  buys?: number | null;
  sells?: number | null;
  volume5m?: number | null;

  pairCreatedAt?: number | null;
  boostsActive?: number;

  holderCount?: number | null;
  largestHolderPercent?: number | null;
  devHoldingPercent?: number | null;
  top10HoldingPercent?: number | null;

  holderLastCheckedAt?: Date | null;

  // ✅ NEW (IMPORTANT)
  topHolders?: {
    address: string;
    amount: number;
    percent: number;
  }[];

  excludedAccounts?: {
    address: string;
    amount: number;
    percent: number;
    reason: string;
  }[];

  signalSent: boolean;
  enrichmentComplete: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const TokenSnapshotSchema = new Schema<ITokenSnapshot>(
  {
    mintAddress: {
      type: String,
      required: true,
      index: true
    },

    pairAddress: {
      type: String,
      default: null
    },

    priceUsd: {
      type: Number,
      default: null
    },

    liquidityUsd: {
      type: Number,
      default: null
    },

    marketCap: {
      type: Number,
      default: null
    },

    buys: {
      type: Number,
      default: null
    },

    sells: {
      type: Number,
      default: null
    },

    volume5m: {
      type: Number,
      default: null
    },

    pairCreatedAt: {
      type: Number,
      default: null
    },

    boostsActive: {
      type: Number,
      default: 0
    },

    holderCount: {
      type: Number,
      default: null
    },

    largestHolderPercent: {
      type: Number,
      default: null
    },

    devHoldingPercent: {
      type: Number,
      default: null
    },

    top10HoldingPercent: {
      type: Number,
      default: null
    },

    holderLastCheckedAt: {
      type: Date,
      default: null,
      index: true
    },

    // ✅ NEW FIELDS
    topHolders: {
      type: [
        {
          address: String,
          amount: Number,
          percent: Number
        }
      ],
      default: []
    },

    excludedAccounts: {
      type: [
        {
          address: String,
          amount: Number,
          percent: Number,
          reason: String
        }
      ],
      default: []
    },

    signalSent: {
      type: Boolean,
      default: false,
      index: true
    },

    enrichmentComplete: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model<ITokenSnapshot>(
  "TokenSnapshot",
  TokenSnapshotSchema
);