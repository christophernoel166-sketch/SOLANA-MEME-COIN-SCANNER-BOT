import axios from "axios";

export async function fetchTokenPairs(mintAddress: string) {
  try {
    const url = `https://api.dexscreener.com/latest/dex/tokens/${mintAddress}`;

    const response = await axios.get(url);

    if (!response.data || !response.data.pairs) {
      return null;
    }

    return response.data.pairs;

  } catch (error) {
    console.error("DEX Screener error:", error);
    return null;
  }
}