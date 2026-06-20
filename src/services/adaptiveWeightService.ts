import AdaptiveWeights from "../models/AdaptiveWeights";

export async function getAdaptiveWeights() {
  let weights =
    await AdaptiveWeights.findOne().lean();

  if (!weights) {
    weights = (
      await AdaptiveWeights.create({})
    ).toObject();
  }

  return weights;
}