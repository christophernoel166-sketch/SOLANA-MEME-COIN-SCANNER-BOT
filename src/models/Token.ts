import mongoose, { Schema, Document } from "mongoose";

export interface IToken extends Document {
  chain: string;
  mintAddress: string;
  name: string;
  symbol: string;
  pairAddress?: string | null;
  source: string;
  firstSeenAt: Date;
  discoveredAt: Date;
  lastEnrichedAt?: Date | null;
}

const TokenSchema = new Schema<IToken>(
  {
    chain: {
      type: String,
      default: "solana"
    },

    mintAddress: {
      type: String,
      required: true,
      unique: true
    },

    name: {
      type: String,
      default: ""
    },

    symbol: {
      type: String,
      default: ""
    },

    pairAddress: {
      type: String,
      default: null
    },

    source: {
      type: String,
      default: "discovery"
    },

    firstSeenAt: {
      type: Date,
      default: Date.now
    },

    discoveredAt: {
      type: Date,
      default: Date.now
    },

    lastEnrichedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model<IToken>("Token", TokenSchema);