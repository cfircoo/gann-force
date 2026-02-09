import { useMemo, useState, useEffect } from "react";
import { useSentimentData } from "@/hooks/useSentimentData";
import { SentimentRow } from "@/components/sentiment/SentimentRow";
import {
  getSignal,
  getSignalLabel,
  type SentimentAsset,
  type SentimentSignal,
} from "@/types/sentiment";
import { cn } from "@/lib/utils";

const FILTERS: { value: SentimentSignal | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "strong_long", label: "Strong Long" },
  { value: "buy", label: "Buy" },
  { value: "neutral", label: "Neutral" },
  { value: "sell", label: "Sell" },
  { value: "strong_short", label: "Strong Short" },
];

const filterColors: Record<string, string> = {
  all: "bg-gray-900 text-white",
  strong_long: "bg-emerald-600 text-white",
  buy: "bg-emerald-100 text-emerald-800",
  neutral: "bg-gray-200 text-gray-600",
  sell: "bg-red-100 text-red-800",
  strong_short: "bg-red-600 text-white",
};

type SortKey = "symbol" | "short_pct" | "long_pct" | "signal";

export default function SentimentDashboard() {
  const { data, loading, error } = useSentimentData();
  const [filter, setFilter] = useState<SentimentSignal | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("symbol");
  const [sortAsc, setSortAsc] = useState(true);

  const signalOrder: Record<SentimentSignal, number> = {
    strong_long: 0,
    buy: 1,
    neutral: 2,
    sell: 3,
    strong_short: 4,
  };

  const filtered = useMemo(() => {
    if (!data) return [];
    let items = data.data;
    if (filter !== "all") {
      items = items.filter((a) => getSignal(a) === filter);
    }
    return [...items].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "symbol":
          cmp = a.symbol.localeCompare(b.symbol);
          break;
        case "short_pct":
          cmp = a.short_pct - b.short_pct;
          break;
        case "long_pct":
          cmp = a.long_pct - b.long_pct;
          break;
        case "signal":
          cmp = signalOrder[getSignal(a)] - signalOrder[getSignal(b)];
          break;
      }
      return sortAsc ? cmp : -cmp;
    });
  }, [data, filter, sortKey, sortAsc]);

  const counts = useMemo(() => {
    if (!data) return {} as Record<string, number>;
    const c: Record<string, number> = { all: data.data.length };
    for (const a of data.data) {
      const s = getSignal(a);
      c[s] = (c[s] || 0) + 1;
    }
    return c;
  }, [data]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === "symbol");
    }
  }

  const sortArrow = (key: SortKey) =>
    sortKey === key ? (sortAsc ? " \u25B2" : " \u25BC") : "";

  const [timeAgo, setTimeAgo] = useState("");

  useEffect(() => {
    if (!data) return;
    function update() {
      const diff = Date.now() - new Date(data!.scraped_at).getTime();
      const mins = Math.floor(diff / 60000);
      const hrs = Math.floor(mins / 60);
      const days = Math.floor(hrs / 24);
      if (days > 0) setTimeAgo(`${days}d ${hrs % 24}h ago`);
      else if (hrs > 0) setTimeAgo(`${hrs}h ${mins % 60}m ago`);
      else setTimeAgo(`${mins}m ago`);
    }
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, [data]);

  if (loading) {
    return (
      <div className="text-center py-20 text-gray-500">
        Loading sentiment data...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-20 text-red-500">Error: {error}</div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Market Sentiment</h1>
          <p className="text-sm text-gray-500 mt-1">
            Source: {data.source} &middot; Last scan:{" "}
            {new Date(data.scraped_at).toLocaleString()}{" "}
            <span className="text-gray-400">({timeAgo})</span>
          </p>
        </div>
        <div className="text-right text-sm text-gray-500">
          {data.total_symbols} symbols
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Signal Logic
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-600" />
            <span>
              <b>Strong Long</b> — 85%+ long
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-200 border border-emerald-400" />
            <span>
              <b>Buy</b> — 55-85% short (contrarian)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-gray-300" />
            <span>
              <b>Neutral</b> — below 55%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-200 border border-red-400" />
            <span>
              <b>Sell</b> — 55-85% long (contrarian)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-600" />
            <span>
              <b>Strong Short</b> — 85%+ short
            </span>
          </div>
        </div>
      </div>

      {/* Filter buttons */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide transition-all",
              filter === f.value
                ? filterColors[f.value]
                : "bg-gray-100 text-gray-400 hover:bg-gray-200"
            )}
          >
            {f.label}
            {counts[f.value] != null && (
              <span className="ml-1 opacity-70">({counts[f.value]})</span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <th
                className="py-3 px-4 text-left cursor-pointer hover:text-gray-900 select-none"
                onClick={() => handleSort("symbol")}
              >
                Symbol{sortArrow("symbol")}
              </th>
              <th className="py-3 px-4 text-left">Trend</th>
              <th
                className="py-3 px-4 text-center cursor-pointer hover:text-gray-900 select-none"
                onClick={() => handleSort("short_pct")}
              >
                Short{sortArrow("short_pct")}
              </th>
              <th
                className="py-3 px-4 text-center cursor-pointer hover:text-gray-900 select-none"
                onClick={() => handleSort("long_pct")}
              >
                Long{sortArrow("long_pct")}
              </th>
              <th
                className="py-3 px-4 text-center cursor-pointer hover:text-gray-900 select-none"
                onClick={() => handleSort("signal")}
              >
                Signal{sortArrow("signal")}
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((asset) => (
              <SentimentRow key={asset.symbol} asset={asset} />
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-10 text-gray-400">
            No symbols match this filter
          </div>
        )}
      </div>
    </div>
  );
}
