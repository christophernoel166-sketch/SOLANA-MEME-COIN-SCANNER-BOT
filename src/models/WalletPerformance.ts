import mongoose, {
  Schema,
  Document
} from "mongoose";

export interface IWalletPerformance
  extends Document {

  walletAddress: string;

  totalSignals: number;

  wins: number;
  losses: number;

  winRate: number;

  avgReturnPct: number;

  avgMaxGainPct: number;

  avgDrawdownPct: number;

  performanceScore: number;

  lastSignalAt?: Date | null;

  updatedAt?: Date;
  createdAt?: Date;
}

const WalletPerformanceSchema =
  new Schema<IWalletPerformance>(
    {
      walletAddress: {
        type: String,
        required: true,
        unique: true,
        index: true
      },

      totalSignals: {
        type: Number,
        default: 0
      },

      wins: {
        type: Number,
        default: 0
      },

      losses: {
        type: Number,
        default: 0
      },

      winRate: {
        type: Number,
        default: 0
      },

      avgReturnPct: {
        type: Number,
        default: 0
      },

      avgMaxGainPct: {
        type: Number,
        default: 0
      },

      avgDrawdownPct: {
        type: Number,
        default: 0
      },

      performanceScore: {
        type: Number,
        default: 0
      },

      lastSignalAt: {
        type: Date,
        default: null
      }
    },
    {
      timestamps: true
    }
  );

export default mongoose.model<IWalletPerformance>(
  "WalletPerformance",
  WalletPerformanceSchema
);