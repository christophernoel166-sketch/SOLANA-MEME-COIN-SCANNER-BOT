import mongoose, { Schema, Document } from "mongoose";

export interface IAdaptiveWeights extends Document {
  momentumWeight: number;
  breakoutWeight: number;
  walletWeight: number;
  historicalWeight: number;

  updatedAt: Date;
  createdAt: Date;
}

const AdaptiveWeightsSchema =
  new Schema<IAdaptiveWeights>(
    {
      momentumWeight: {
        type: Number,
        default: 0.25,
      },

      breakoutWeight: {
        type: Number,
        default: 0.20,
      },

      walletWeight: {
        type: Number,
        default: 0.30,
      },

      historicalWeight: {
        type: Number,
        default: 0.25,
      },
    },
    {
      timestamps: true,
    }
  );

export default mongoose.model<IAdaptiveWeights>(
  "AdaptiveWeights",
  AdaptiveWeightsSchema
);