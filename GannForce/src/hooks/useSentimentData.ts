import { useState, useEffect } from "react";
import type { SentimentData } from "@/types/sentiment";

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
    fetch("/sentiment_data.json")
      .then((res) => {
        if (!res.ok)
          throw new Error(`Failed to load sentiment data: ${res.status}`);
        return res.json();
      })
      .then((json: SentimentData) => setData(json))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error };
}
