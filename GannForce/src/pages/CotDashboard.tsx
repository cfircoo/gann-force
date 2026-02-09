import { useCotData } from "@/hooks/useCotData";
import { CATEGORY_ORDER } from "@/types/cot";
import { CategorySection } from "@/components/cot/CategorySection";

export default function CotDashboard() {
  const { data, loading, error, reportDate } = useCotData();

  if (loading) {
    return <div className="text-center py-20 text-gray-500">Loading COT data...</div>;
  }

  if (error || !data) {
    return <div className="text-center py-20 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">COT Report</h1>
        <span className="text-sm text-gray-500">
          Report Date: {reportDate ?? "Unknown"}
        </span>
      </div>
      {CATEGORY_ORDER.map((category) => (
        <CategorySection
          key={category}
          category={category}
          assets={data[category] ?? []}
        />
      ))}
    </div>
  );
}
