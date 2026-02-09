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

  return (
    <div
      className={cn(
        "rounded-lg p-3 text-white font-semibold flex flex-col items-center justify-center min-h-[80px] transition-transform hover:scale-105 cursor-default shadow-sm",
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
    </div>
  );
}
