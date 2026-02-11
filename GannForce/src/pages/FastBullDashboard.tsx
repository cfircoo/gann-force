import { useState, useEffect } from "react";
import { useFastBullData, type FastBullAsset } from "@/hooks/useFastBullData";
import { cn } from "@/lib/utils";

type SortKey = "symbol" | "orders_buy" | "positions_long" | "long_profit" | "short_profit";
type SortDir = "asc" | "desc";

export default function FastBullDashboard() {
  const { data, loading, error, scrapedAt } = useFastBullData();
  const [sortKey, setSortKey] = useState<SortKey>("symbol");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [timeAgo, setTimeAgo] = useState("");

  useEffect(() => {
    if (!scrapedAt) return;
    function update() {
      const diff = Date.now() - new Date(scrapedAt!).getTime();
      const mins = Math.floor(diff / 60000);
      const hrs = Math.floor(mins / 60);
      if (hrs > 0) setTimeAgo(`${hrs}h ${mins % 60}m ago`);
      else setTimeAgo(`${mins}m ago`);
    }
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, [scrapedAt]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir(key === "symbol" ? "asc" : "desc");
    }
  }

  const sorted = [...data].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    switch (sortKey) {
      case "symbol":
        return dir * a.symbol.localeCompare(b.symbol);
      case "orders_buy":
        return dir * ((a.orders_buy_pct ?? 0) - (b.orders_buy_pct ?? 0));
      case "positions_long":
        return dir * ((a.positions_long_pct ?? 0) - (b.positions_long_pct ?? 0));
      case "long_profit":
        return dir * ((a.positions_long_profit_pct ?? 0) - (b.positions_long_profit_pct ?? 0));
      case "short_profit":
        return dir * ((a.positions_short_profit_pct ?? 0) - (b.positions_short_profit_pct ?? 0));
      default:
        return 0;
    }
  });

  if (loading) return <div className="text-center py-20 text-gray-500">Loading FastBull data...</div>;
  if (error) return <div className="text-center py-20 text-red-500">Error: {error}</div>;

  const sortIcon = (key: SortKey) =>
    sortKey === key ? (sortDir === "asc" ? " \u2191" : " \u2193") : "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">FastBull Order Book</h1>
        <p className="text-sm text-gray-500 mt-1">
          Retail trader positioning from fastbull.com
          {scrapedAt && (
            <span className="ml-2 text-gray-400">
              &middot; Updated: {new Date(scrapedAt).toLocaleString()}{" "}
              <span className="text-gray-300">({timeAgo})</span>
            </span>
          )}
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <Th onClick={() => handleSort("symbol")}>Symbol{sortIcon("symbol")}</Th>
              <Th className="text-center">Orders Price</Th>
              <Th className="text-center">Positions Price</Th>
              <Th onClick={() => handleSort("orders_buy")} className="text-center">
                Orders Buy%{sortIcon("orders_buy")}
              </Th>
              <Th className="text-center">Orders Sell%</Th>
              <Th onClick={() => handleSort("positions_long")} className="text-center">
                Long%{sortIcon("positions_long")}
              </Th>
              <Th className="text-center">Short%</Th>
              <Th onClick={() => handleSort("long_profit")} className="text-center">
                Long Profit%{sortIcon("long_profit")}
              </Th>
              <Th onClick={() => handleSort("short_profit")} className="text-center">
                Short Profit%{sortIcon("short_profit")}
              </Th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((asset) => (
              <FastBullRow key={asset.symbol} asset={asset} />
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-gray-400">
        Source: fastbull.com/order-book &middot; {data.length} instruments
      </div>
    </div>
  );
}

function Th({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <th
      className={cn(
        "py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-left",
        onClick && "cursor-pointer hover:text-gray-700 select-none",
        className
      )}
      onClick={onClick}
    >
      {children}
    </th>
  );
}

function FastBullRow({ asset }: { asset: FastBullAsset }) {
  const longPct = asset.positions_long_pct ?? 0;
  const shortPct = asset.positions_short_pct ?? 0;

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
      <td className="py-3 px-4 font-semibold text-gray-900">{asset.symbol}</td>
      <td className="py-3 px-4 text-center font-mono text-gray-700">
        {asset.orders_price ?? "-"}
      </td>
      <td className="py-3 px-4 text-center font-mono text-gray-700">
        {asset.positions_price ?? "-"}
      </td>
      <td className="py-3 px-4 text-center">
        <BarCell value={asset.orders_buy_pct} color="emerald" />
      </td>
      <td className="py-3 px-4 text-center">
        <BarCell value={asset.orders_sell_pct} color="red" />
      </td>
      <td className="py-3 px-4 text-center">
        <div className="space-y-1">
          <span className="font-medium text-emerald-600">{longPct}%</span>
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden flex">
            <div className="bg-emerald-500 h-full" style={{ width: `${longPct}%` }} />
          </div>
        </div>
      </td>
      <td className="py-3 px-4 text-center">
        <div className="space-y-1">
          <span className="font-medium text-red-600">{shortPct}%</span>
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden flex">
            <div className="bg-red-500 h-full" style={{ width: `${shortPct}%` }} />
          </div>
        </div>
      </td>
      <td className="py-3 px-4 text-center">
        <ProfitCell profit={asset.positions_long_profit_pct} loss={asset.positions_long_loss_pct} />
      </td>
      <td className="py-3 px-4 text-center">
        <ProfitCell profit={asset.positions_short_profit_pct} loss={asset.positions_short_loss_pct} />
      </td>
    </tr>
  );
}

function BarCell({ value, color }: { value: number | null; color: "emerald" | "red" }) {
  if (value === null) return <span className="text-gray-400">-</span>;
  const bg = color === "emerald" ? "bg-emerald-500" : "bg-red-500";
  const text = color === "emerald" ? "text-emerald-600" : "text-red-600";
  return (
    <div className="space-y-1">
      <span className={cn("font-medium", text)}>{value}%</span>
      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className={cn(bg, "h-full")} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function ProfitCell({ profit, loss }: { profit: number | null; loss: number | null }) {
  if (profit === null) return <span className="text-gray-400">-</span>;
  return (
    <div className="space-y-1">
      <span className={cn("font-medium", profit >= 50 ? "text-emerald-600" : "text-red-600")}>
        {profit}%
      </span>
      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden flex">
        <div className="bg-emerald-500 h-full" style={{ width: `${profit}%` }} />
        <div className="bg-red-400 h-full" style={{ width: `${loss}%` }} />
      </div>
    </div>
  );
}
