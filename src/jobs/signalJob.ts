import { runSignalEngine } from "../services/signalService";
import { SIGNAL_PROFILES } from "../config/signalProfiles";

let isSignalRunning = false;

export function startSignalJob(): void {
  console.log("🧠 Signal engine started (multi-profile)");

  setInterval(async () => {
    if (isSignalRunning) {
      console.log("⏳ Signal job still running, skipping this cycle");
      return;
    }

    isSignalRunning = true;

    try {
      for (const profile of SIGNAL_PROFILES) {
  await runSignalEngine(profile);

  // ✅ small delay between profiles (reduces DB + RPC spikes)
  await new Promise((resolve) => setTimeout(resolve, 1000));
}
    } catch (error) {
      console.error("Signal job error:", error);
    } finally {
      isSignalRunning = false;
    }
  }, 20000);
}