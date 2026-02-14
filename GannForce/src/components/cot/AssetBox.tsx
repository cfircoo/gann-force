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

  const net = asset.non_commercial.long - asset.non_commercial.short;
  const chgDiff = Math.abs(asset.changes.long) - Math.abs(asset.changes.short);
  const changeRatio = net !== 0 ? chgDiff / net : null;

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
      {changeRatio !== null && (
        <span className="text-[10px] opacity-80 mt-1">
          Chg {changeRatio > 0 ? "+" : ""}{(changeRatio * 100).toFixed(1)}%
        </span>
      )}
    </div>
  );
}
