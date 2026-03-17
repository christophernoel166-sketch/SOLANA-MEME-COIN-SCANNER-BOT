import mongoose, { Schema, Document } from "mongoose";

export interface ITokenFundingCluster extends Document {
  mintAddress: string;

  uniqueFundingWalletCount: number;
  largestFundingClusterSize: number;
  clusteredBuyerCount: number;

  fundingClusterScore: number;
  flagged: boolean;

  fundingGroups: Array<{
    funder: string;
    buyerCount: number;
    buyers: string[];
  }>;

  analyzedAt: Date;

  createdAt: Date;
  updatedAt: Date;
}

const TokenFundingClusterSchema = new Schema<ITokenFundingCluster>(
  {
    mintAddress: {
      type: String,
      required: true,
      index: true
    },

    uniqueFundingWalletCount: {
      type: Number,
      default: 0
    },

    largestFundingClusterSize: {
      type: Number,
      default: 0
    },

    clusteredBuyerCount: {
      type: Number,
      default: 0
    },

    fundingClusterScore: {
      type: Number,
      default: 0
    },

    flagged: {
      type: Boolean,
      default: false
    },

    fundingGroups: {
      type: [
        {
          funder: { type: String, required: true },
          buyerCount: { type: Number, required: true },
          buyers: { type: [String], default: [] }
        }
      ],
      default: []
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

export default mongoose.model<ITokenFundingCluster>(
  "TokenFundingCluster",
  TokenFundingClusterSchema
);