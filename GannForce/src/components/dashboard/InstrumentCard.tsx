import { cn } from "@/lib/utils";
import type { DashboardInstrument, Recommendation } from "@/types/dashboard";
import { getSignalLabel } from "@/types/sentiment";
import { RecommendationBadge } from "./RecommendationBadge";

interface InstrumentCardProps {
  instrument: DashboardInstrument;
  sentimentSource: string | null;
}

const borderColors: Record<Recommendation, string> = {
  strong_buy: "border-t-emerald-600",
  buy: "border-t-emerald-500",
  lean_buy: "border-t-emerald-300",
  neutral: "border-t-gray-300",
  lean_sell: "border-t-red-300",
  sell: "border-t-red-500",
  strong_sell: "border-t-red-600",
};

function formatNumber(n: number): string {
  return n.toLocaleString();
}

function formatSigned(n: number): string {
  const prefix = n > 0 ? "+" : "";
  return prefix + n.toLocaleString();
}

export function InstrumentCard({ instrument, sentimentSource }: InstrumentCardProps) {
  const { cotAsset, sentimentAsset, recommendation, cotSignal, sentimentSignal, hasSentiment } =
    instrument;

  const cotSignalLabel =
    cotSignal === "bullish" ? "Bullish" : cotSignal === "bearish" ? "Bearish" : "Neutral";

  return (
    <div
      className={cn(
        "bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden border-t-4",
        borderColors[recommendation]
      )}
    >
      {/* Header */}
      <div className="px-5 pt-4 pb-3 flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">{instrument.display}</h3>
          <p className="text-xs text-gray-400 font-medium">{instrument.id}</p>
        </div>
        <div className="text-right">
          <RecommendationBadge recommendation={recommendation} />
          <p className="text-[10px] text-gray-400 mt-1">
            {hasSentiment ? "COT + Sentiment" : "COT only"}
          </p>
        </div>
      </div>

      {/* Data columns */}
      <div className="border-t border-gray-100 grid grid-cols-1 md:grid-cols-2">
        {/* COT column */}
        <div className="px-5 py-4 space-y-2">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
            COT Data
          </p>
          {cotAsset ? (
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Unfulfilled</span>
                <span
                  className={cn(
                    "font-bold",
                    cotSignal === "bullish" && "text-emerald-600",
                    cotSignal === "bearish" && "text-red-600",
                    cotSignal === "neutral" && "text-gray-500"
                  )}
                >
                  {cotAsset.unfulfilled_calls !== null
                    ? (cotAsset.unfulfilled_calls > 0 ? "+" : "") +
                      cotAsset.unfulfilled_calls.toFixed(2)
                    : "N/A"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Signal</span>
                <span
                  className={cn(
                    "font-semibold",
                    cotSignal === "bullish" && "text-emerald-600",
                    cotSignal === "bearish" && "text-red-600",
                    cotSignal === "neutral" && "text-gray-500"
                  )}
                >
                  {cotSignalLabel}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Net</span>
                <span className="font-medium text-gray-700">
                  {formatSigned(cotAsset.non_commercial.net)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">OI Change</span>
                <span className="font-medium text-gray-700">
                  {formatSigned(cotAsset.change_in_open_interest)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Chg Long</span>
                <span className="font-medium text-gray-700">
                  {formatSigned(cotAsset.changes.long)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Chg Short</span>
                <span className="font-medium text-gray-700">
                  {formatSigned(cotAsset.changes.short)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Report</span>
                <span className="text-gray-500 text-xs">{cotAsset.report_date}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">No COT data</p>
          )}
        </div>

        {/* Sentiment column */}
        <div className="px-5 py-4 space-y-2 border-t md:border-t-0 md:border-l border-gray-100">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
            Sentiment
          </p>
          {sentimentAsset && sentimentSignal ? (
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Short</span>
                <span className="font-medium text-red-600">{sentimentAsset.short_pct}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Long</span>
                <span className="font-medium text-emerald-600">{sentimentAsset.long_pct}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Signal</span>
                <span className="font-semibold text-gray-700">
                  {getSignalLabel(sentimentSignal)}
                </span>
              </div>
              {/* Trend bar */}
              <div className="pt-1">
                <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden flex">
                  <div
                    className="bg-red-500 h-full"
                    style={{ width: `${sentimentAsset.short_pct}%` }}
                  />
                  <div
                    className="bg-emerald-500 h-full"
                    style={{ width: `${sentimentAsset.long_pct}%` }}
                  />
                </div>
              </div>
              {sentimentSource && (
                <div className="flex justify-between pt-1">
                  <span className="text-gray-500">Source</span>
                  <span className="text-gray-500 text-xs">{sentimentSource}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full min-h-[120px]">
              <p className="text-sm text-gray-400 italic border-2 border-dashed border-gray-200 rounded-lg px-4 py-3 text-center">
                No sentiment data
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
