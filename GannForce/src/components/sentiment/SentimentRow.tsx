import type { SentimentAsset, SentimentSignal } from "@/types/sentiment";
import { getSignal, getSignalLabel } from "@/types/sentiment";
import { cn } from "@/lib/utils";

interface SentimentRowProps {
  asset: SentimentAsset;
}

const signalStyles: Record<SentimentSignal, { bg: string; text: string }> = {
  strong_long: { bg: "bg-emerald-600", text: "text-white" },
  buy: { bg: "bg-emerald-100", text: "text-emerald-800" },
  neutral: { bg: "bg-gray-100", text: "text-gray-500" },
  sell: { bg: "bg-red-100", text: "text-red-800" },
  strong_short: { bg: "bg-red-600", text: "text-white" },
};

export function SentimentRow({ asset }: SentimentRowProps) {
  const signal = getSignal(asset);
  const style = signalStyles[signal];

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
      <td className="py-3 px-4 font-semibold text-gray-900">{asset.symbol}</td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2.5 bg-gray-200 rounded-full overflow-hidden flex">
            <div
              className="bg-red-500 h-full transition-all"
              style={{ width: `${asset.short_pct}%` }}
            />
            <div
              className="bg-emerald-500 h-full transition-all"
              style={{ width: `${asset.long_pct}%` }}
            />
          </div>
        </div>
      </td>
      <td className="py-3 px-4 text-center font-medium text-red-600">
        {asset.short_pct}%
      </td>
      <td className="py-3 px-4 text-center font-medium text-emerald-600">
        {asset.long_pct}%
      </td>
      <td className="py-3 px-4 text-center">
        <span
          className={cn(
            "inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide",
            style.bg,
            style.text
          )}
        >
          {getSignalLabel(signal)}
        </span>
      </td>
    </tr>
  );
}
