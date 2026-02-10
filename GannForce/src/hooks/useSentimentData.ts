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
      // Get the latest scan
      const { data: scan, error: scanErr } = await supabase
        .from("sentiment_scans")
        .select("id, source, scraped_at, total_symbols")
        .order("scraped_at", { ascending: false })
        .limit(1)
        .single();

      if (scanErr) {
        setError(`Failed to load sentiment scan: ${scanErr.message}`);
        setLoading(false);
        return;
      }

      // Get all data for this scan
      const { data: rows, error: dataErr } = await supabase
        .from("sentiment_data")
        .select("symbol, short_pct, long_pct")
        .eq("scan_id", scan.id);

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

      setData({
        source: scan.source,
        scraped_at: scan.scraped_at,
        total_symbols: scan.total_symbols,
        data: assets,
      });
      setLoading(false);
    }

    fetchData();
  }, []);

  return { data, loading, error };
}
