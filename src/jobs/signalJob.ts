import { runSignalEngine } from "../services/signalService";

let isSignalRunning = false;

export function startSignalJob(): void {
  console.log("🧠 Signal engine started");

  setInterval(async () => {
    if (isSignalRunning) {
      console.log("⏳ Signal job still running, skipping this cycle");
      return;
    }

    isSignalRunning = true;

    try {
      await runSignalEngine();
    } catch (error) {
      console.error("Signal job error:", error);
    } finally {
      isSignalRunning = false;
    }
  }, 20000);
}