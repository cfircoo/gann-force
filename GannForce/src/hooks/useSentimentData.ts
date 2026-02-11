import { useState, useEffect } from "react";
import type { SentimentData, SentimentAsset } from "@/types/sentiment";
import { supabase } from "@/lib/supabase";

interface UseSentimentDataReturn {
  data: SentimentData | null;
  loading: boolean;
  error: string | null;
}

export function useSentimentData(): UseSentimentDataReturn {
  const [data, setData] = useState<SentimentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      const { data: rows, error: dataErr } = await supabase
        .from("sentiment_data")
        .select("symbol, short_pct, long_pct, scraped_at");

      if (dataErr) {
        setError(`Failed to load sentiment data: ${dataErr.message}`);
        setLoading(false);
        return;
      }

      const assets: SentimentAsset[] = (rows as { symbol: string; short_pct: number; long_pct: number }[]).map((r) => ({
        symbol: r.symbol,
        short_pct: Number(r.short_pct),
        long_pct: Number(r.long_pct),
      }));

      const latest = rows.reduce((max: string, r: any) =>
        r.scraped_at > max ? r.scraped_at : max, "");

      setData({
        source: "myfxbook.com",
        scraped_at: latest,
        total_symbols: assets.length,
        data: assets,
      });
      setLoading(false);
    }

    fetchData();
  }, []);

  return { data, loading, error };
}
