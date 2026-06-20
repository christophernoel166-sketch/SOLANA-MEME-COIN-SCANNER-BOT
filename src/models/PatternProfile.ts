import mongoose, { Schema, Document } from "mongoose";

export interface IPatternProfile extends Document {
  patternKey: string;

  totalSignals: number;
  wins: number;
  losses: number;
  neutrals: number;

  winRate: number;

  averageReturnPct: number;
  averageMaxGainPct: number;
  averageDrawdownPct: number;

  confidenceScore: number;

  createdAt: Date;
  updatedAt: Date;
}

const PatternProfileSchema =
  new Schema<IPatternProfile>(
    {
      patternKey: {
        type: String,
        required: true,
        unique: true,
        index: true,
      },

      totalSignals: {
        type: Number,
        default: 0,
      },

      wins: {
        type: Number,
        default: 0,
      },

      losses: {
        type: Number,
        default: 0,
      },

      neutrals: {
        type: Number,
        default: 0,
      },

      winRate: {
        type: Number,
        default: 0,
      },

      averageReturnPct: {
        type: Number,
        default: 0,
      },

      averageMaxGainPct: {
        type: Number,
        default: 0,
      },

      averageDrawdownPct: {
        type: Number,
        default: 0,
      },

      confidenceScore: {
        type: Number,
        default: 0,
      },
    },
    {
      timestamps: true,
    }
  );

export default mongoose.model<IPatternProfile>(
  "PatternProfile",
  PatternProfileSchema
);