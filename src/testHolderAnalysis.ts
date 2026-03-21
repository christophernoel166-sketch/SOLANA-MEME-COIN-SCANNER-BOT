import dotenv from "dotenv";
import { fetchHolderAnalysis } from "./services/holderService";

dotenv.config();

async function main() {
  const mintAddress = "BiFANQukCGDd6YKkL1H1yBbD986FHFYYA2BUHvhTpump";

  console.log(`🧪 Testing holder analysis for: ${mintAddress}`);

  const result = await fetchHolderAnalysis(mintAddress);

  console.log("✅ Holder analysis result:");
  console.dir(result, { depth: null });
}

main().catch((error) => {
  console.error("❌ Test failed:", error);
});