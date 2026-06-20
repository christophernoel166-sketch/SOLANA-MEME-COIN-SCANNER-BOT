import mongoose, {
  Schema,
  Document
} from "mongoose";

export interface ISignalWalletLink
  extends Document {
  mintAddress: string;

  walletAddress: string;

  signalSentAt: Date;
}

const SignalWalletLinkSchema =
  new Schema<ISignalWalletLink>(
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

      signalSentAt: {
        type: Date,
        default: Date.now
      }
    },
    {
      timestamps: true
    }
  );

SignalWalletLinkSchema.index({
  mintAddress: 1,
  walletAddress: 1
});

export default mongoose.model<ISignalWalletLink>(
  "SignalWalletLink",
  SignalWalletLinkSchema
);