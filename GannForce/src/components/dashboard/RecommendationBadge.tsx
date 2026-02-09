import { cn } from "@/lib/utils";
import { type Recommendation, getRecommendationLabel } from "@/types/dashboard";

interface RecommendationBadgeProps {
  recommendation: Recommendation;
}

const styles: Record<Recommendation, string> = {
  strong_buy: "bg-emerald-600 text-white",
  buy: "bg-emerald-500 text-white",
  lean_buy: "bg-emerald-100 text-emerald-800",
  neutral: "bg-gray-100 text-gray-500",
  lean_sell: "bg-red-100 text-red-800",
  sell: "bg-red-500 text-white",
  strong_sell: "bg-red-600 text-white",
};

export function RecommendationBadge({ recommendation }: RecommendationBadgeProps) {
  return (
    <span
      className={cn(
        "inline-block px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide",
        styles[recommendation]
      )}
    >
      {getRecommendationLabel(recommendation)}
    </span>
  );
}
