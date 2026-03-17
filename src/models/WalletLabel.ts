import mongoose, { Schema, Document } from "mongoose";

export interface IWalletLabel extends Document {
  walletAddress: string;

  labels: string[];

  smartScore: number;
  botScore: number;
  ratScore: number;
  alphaCallerScore: number;

  firstSeenAt?: Date | null;
  lastSeenAt?: Date | null;

  notes?: string | null;

  createdAt: Date;
  updatedAt: Date;
}

const WalletLabelSchema = new Schema<IWalletLabel>(
  {
    walletAddress: {
      type: String,
      required: true,
      unique: true,
      index: true
    },

    labels: {
      type: [String],
      default: []
    },

    smartScore: {
      type: Number,
      default: 0
    },

    botScore: {
      type: Number,
      default: 0
    },

    ratScore: {
      type: Number,
      default: 0
    },

    alphaCallerScore: {
      type: Number,
      default: 0
    },

    firstSeenAt: {
      type: Date,
      default: null
    },

    lastSeenAt: {
      type: Date,
      default: null
    },

    notes: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model<IWalletLabel>(
  "WalletLabel",
  WalletLabelSchema
);