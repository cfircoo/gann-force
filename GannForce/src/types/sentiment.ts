export interface SentimentAsset {
  symbol: string;
  short_pct: number;
  long_pct: number;
}

export interface SentimentData {
  source: string;
  scraped_at: string;
  total_symbols: number;
  data: SentimentAsset[];
}

export type SentimentSignal = "strong_long" | "sell" | "neutral" | "buy" | "strong_short";

export function getSignal(asset: SentimentAsset): SentimentSignal {
  const { short_pct, long_pct } = asset;

  // 85%+ in one direction = strong move WITH that direction
  if (short_pct >= 85) return "strong_short";
  if (long_pct >= 85) return "strong_long";

  // 55-85% = contrarian (opposite recommendation)
  if (short_pct >= 55) return "buy";
  if (long_pct >= 55) return "sell";

  // Below 55% either side = neutral
  return "neutral";
}

export function getSignalLabel(signal: SentimentSignal): string {
  switch (signal) {
    case "strong_long":
      return "Strong Long";
    case "strong_short":
      return "Strong Short";
    case "buy":
      return "Buy";
    case "sell":
      return "Sell";
    case "neutral":
      return "Neutral";
  }
}
