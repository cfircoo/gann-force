import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export interface FastBullAsset {
  symbol: string;
  orders_price: string | null;
  orders_buy_pct: number | null;
  orders_sell_pct: number | null;
  positions_price: string | null;
  positions_long_pct: number | null;
  positions_short_pct: number | null;
  positions_long_profit_pct: number | null;
  positions_long_loss_pct: number | null;
  positions_short_profit_pct: number | null;
  positions_short_loss_pct: number | null;
  scraped_at: string | null;
}

interface UseFastBullDataReturn {
  data: FastBullAsset[];
  loading: boolean;
  error: string | null;
  scrapedAt: string | null;
}

export function useFastBullData(): UseFastBullDataReturn {
  const [data, setData] = useState<FastBullAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scrapedAt, setScrapedAt] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      const { data: rows, error: err } = await supabase
        .from("fastbull_orderbook")
        .select("*");

      if (err) {
        setError(`Failed to load FastBull data: ${err.message}`);
        setLoading(false);
        return;
      }

      const assets: FastBullAsset[] = (rows ?? []).map((r: any) => ({
        symbol: r.symbol,
        orders_price: r.orders_price,
        orders_buy_pct: r.orders_buy_pct ? Number(r.orders_buy_pct) : null,
        orders_sell_pct: r.orders_sell_pct ? Number(r.orders_sell_pct) : null,
        positions_price: r.positions_price,
        positions_long_pct: r.positions_long_pct ? Number(r.positions_long_pct) : null,
        positions_short_pct: r.positions_short_pct ? Number(r.positions_short_pct) : null,
        positions_long_profit_pct: r.positions_long_profit_pct ? Number(r.positions_long_profit_pct) : null,
        positions_long_loss_pct: r.positions_long_loss_pct ? Number(r.positions_long_loss_pct) : null,
        positions_short_profit_pct: r.positions_short_profit_pct ? Number(r.positions_short_profit_pct) : null,
        positions_short_loss_pct: r.positions_short_loss_pct ? Number(r.positions_short_loss_pct) : null,
        scraped_at: r.scraped_at,
      }));

      const latest = (rows ?? []).reduce(
        (max: string, r: any) => (r.scraped_at > max ? r.scraped_at : max),
        ""
      );

      setData(assets);
      setScrapedAt(latest || null);
      setLoading(false);
    }

    fetchData();
  }, []);

  return { data, loading, error, scrapedAt };
}
