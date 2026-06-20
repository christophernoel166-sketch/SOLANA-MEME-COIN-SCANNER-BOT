import { rebuildPatternStatistics } from "../services/patternLearningService";

let running = false;

export function startPatternLearningJob() {
  console.log("🧠 Pattern learning job started");

  setInterval(async () => {
    if (running) {
      return;
    }

    running = true;

    try {
      console.log("🧠 Rebuilding pattern statistics...");

      await rebuildPatternStatistics();

      console.log("✅ Pattern statistics updated");
    } catch (error) {
      console.error(
        "❌ Pattern learning job failed:",
        error
      );
    } finally {
      running = false;
    }
  }, 5 * 60 * 1000); // every 5 minutes
}