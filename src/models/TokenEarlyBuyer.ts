import mongoose, { Schema, Document } from "mongoose";

export interface ITokenEarlyBuyer extends Document {
  mintAddress: string;
  walletAddress: string;

  amount?: number | null;
  priceUsd?: number | null;

  entryTime: Date;
  entryDelaySeconds?: number | null;

  sequence: number;

  createdAt: Date;
  updatedAt: Date;
}

const TokenEarlyBuyerSchema = new Schema<ITokenEarlyBuyer>(
  {
    mintAddress: {
      type: String,
      required: true,
      index: true
    },

    walletAddress: {
      type: String,
      required: true,
      index: true
    },

    amount: {
      type: Number,
      default: null
    },

    priceUsd: {
      type: Number,
      default: null
    },

    entryTime: {
      type: Date,
      required: true
    },

    entryDelaySeconds: {
      type: Number,
      default: null
    },

    sequence: {
      type: Number,
      required: true
    }
  },
  {
    timestamps: true
  }
);

TokenEarlyBuyerSchema.index(
  { mintAddress: 1, walletAddress: 1 },
  { unique: true }
);

export default mongoose.model<ITokenEarlyBuyer>(
  "TokenEarlyBuyer",
  TokenEarlyBuyerSchema
);