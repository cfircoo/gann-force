import type { CotAsset } from "@/types/cot";
import type { SentimentAsset, SentimentSignal } from "@/types/sentiment";
import { getSignal } from "@/types/sentiment";

export type CotSignal = "bullish" | "bearish" | "neutral";

export type Recommendation =
  | "strong_buy"
  | "buy"
  | "lean_buy"
  | "neutral"
  | "lean_sell"
  | "sell"
  | "strong_sell";

export interface DashboardInstrument {
  id: string;
  display: string;
  cotAsset: CotAsset | null;
  sentimentAsset: SentimentAsset | null;
  cotSignal: CotSignal;
  sentimentSignal: SentimentSignal | null;
  recommendation: Recommendation;
  hasSentiment: boolean;
  pivotPrice: string | null;
}

export function getCotSignal(unfulfilled: number | null): CotSignal {
  if (unfulfilled === null || unfulfilled === 0) return "neutral";
  return unfulfilled > 0 ? "bullish" : "bearish";
}

function cotScore(signal: CotSignal): number {
  if (signal === "bullish") return 1;
  if (signal === "bearish") return -1;
  return 0;
}

function sentimentScore(signal: SentimentSignal): number {
  switch (signal) {
    case "strong_short":
      return 2;
    case "buy":
      return 1;
    case "neutral":
      return 0;
    case "sell":
      return -1;
    case "strong_long":
      return -2;
  }
}

const SCORE_TO_RECOMMENDATION: Record<number, Recommendation> = {
  3: "strong_buy",
  2: "buy",
  1: "lean_buy",
  0: "neutral",
  [-1]: "lean_sell",
  [-2]: "sell",
  [-3]: "strong_sell",
};

const COT_ONLY_MAP: Record<CotSignal, Recommendation> = {
  bullish: "lean_buy",
  neutral: "neutral",
  bearish: "lean_sell",
};

export function computeRecommendation(
  cotAsset: CotAsset | null,
  sentimentAsset: SentimentAsset | null
): { cotSignal: CotSignal; sentimentSignal: SentimentSignal | null; recommendation: Recommendation } {
  const cSignal = getCotSignal(cotAsset?.unfulfilled_calls ?? null);

  if (!sentimentAsset) {
    return {
      cotSignal: cSignal,
      sentimentSignal: null,
      recommendation: COT_ONLY_MAP[cSignal],
    };
  }

  const sSignal = getSignal(sentimentAsset);
  const combined = cotScore(cSignal) + sentimentScore(sSignal);
  const clamped = Math.max(-3, Math.min(3, combined));

  return {
    cotSignal: cSignal,
    sentimentSignal: sSignal,
    recommendation: SCORE_TO_RECOMMENDATION[clamped],
  };
}

export function getRecommendationLabel(rec: Recommendation): string {
  switch (rec) {
    case "strong_buy":
      return "Strong Buy";
    case "buy":
      return "Buy";
    case "lean_buy":
      return "Lean Buy";
    case "neutral":
      return "Neutral";
    case "lean_sell":
      return "Lean Sell";
    case "sell":
      return "Sell";
    case "strong_sell":
      return "Strong Sell";
  }
}
