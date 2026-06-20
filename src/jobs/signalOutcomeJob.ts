import SignalOutcome from "../models/SignalOutcome";
import { evaluateSignalOutcome } from "../services/signalOutcomeService";

let running = false;

export function startSignalOutcomeJob() {
  console.log("📈 Signal outcome tracker started");

  setInterval(async () => {
    if (running) {
      return;
    }

    running = true;

    try {
      const MIN_SIGNAL_AGE_MS = 30 * 60 * 1000;

const pendingSignals = await SignalOutcome.find({
  outcome: "pending",
  signalSentAt: {
    $lte: new Date(Date.now() - MIN_SIGNAL_AGE_MS),
  },
})
  .sort({ signalSentAt: 1 })
  .limit(100);

      for (const signal of pendingSignals) {
        try {
          await evaluateSignalOutcome(signal.mintAddress);
        } catch (err) {
          console.error(
            `Failed evaluating ${signal.mintAddress}`,
            err
          );
        }
      }
    } finally {
      running = false;
    }
  }, 60 * 1000); // every minute
}