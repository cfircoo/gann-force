import { cn } from "@/lib/utils";
import type { CotAsset } from "@/types/cot";

interface AssetBoxProps {
  asset: CotAsset;
}

export function AssetBox({ asset }: AssetBoxProps) {
  const value = asset.unfulfilled_calls;
  const isNull = value === null;
  const isPositive = value !== null && value > 0;
  const isNegative = value !== null && value < 0;

  const longShortRatio =
    asset.non_commercial.short !== 0
      ? asset.non_commercial.long / asset.non_commercial.short
      : null;

  const chgLong = asset.changes.long;
  const chgShort = asset.changes.short;

  return (
    <div
      className={cn(
        "rounded-lg p-3 text-white font-semibold flex flex-col items-center justify-center min-h-[120px] transition-transform hover:scale-105 cursor-default shadow-sm",
        isPositive && "bg-bullish",
        isNegative && "bg-bearish",
        isNull && "bg-gray-400"
      )}
    >
      <span className="text-xs font-medium opacity-90 text-center leading-tight">
        {asset.name}
      </span>
      <span className="text-lg font-bold mt-1">
        {value !== null ? value.toFixed(2) : "N/A"}
      </span>
      {longShortRatio !== null && (
        <span className="text-[10px] opacity-80 mt-1">
          L/S {longShortRatio.toFixed(2)}
        </span>
      )}
      <div className="flex gap-2 text-[10px] opacity-80 mt-0.5">
        <span className={chgLong > 0 ? "text-green-200" : chgLong < 0 ? "text-red-200" : ""}>
          L {chgLong > 0 ? "+" : ""}{chgLong.toLocaleString()}
        </span>
        <span className={chgShort > 0 ? "text-red-200" : chgShort < 0 ? "text-green-200" : ""}>
          S {chgShort > 0 ? "+" : ""}{chgShort.toLocaleString()}
        </span>
      </div>
    </div>
  );
}
