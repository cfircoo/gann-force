import type { CotAsset } from "@/types/cot";
import { AssetBox } from "./AssetBox";

interface CategorySectionProps {
  category: string;
  assets: CotAsset[];
}

export function CategorySection({ category, assets }: CategorySectionProps) {
  return (
    <section>
      <h2 className="text-lg font-bold mb-3 text-gray-800 border-b pb-1">
        {category}
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
        {assets.map((asset) => (
          <AssetBox key={asset.code} asset={asset} />
        ))}
      </div>
    </section>
  );
}
