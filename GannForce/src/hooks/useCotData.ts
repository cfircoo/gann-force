import { useState, useEffect } from "react";
import type { CotData } from "@/types/cot";

interface UseCotDataReturn {
  data: CotData | null;
  loading: boolean;
  error: string | null;
  reportDate: string | null;
}

export function useCotData(): UseCotDataReturn {
  const [data, setData] = useState<CotData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportDate, setReportDate] = useState<string | null>(null);

  useEffect(() => {
    fetch("/cot_data.json")
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load COT data: ${res.status}`);
        return res.json();
      })
      .then((json: CotData) => {
        setData(json);
        const firstCategory = Object.values(json)[0];
        if (firstCategory?.[0]?.report_date) {
          setReportDate(firstCategory[0].report_date);
        }
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error, reportDate };
}
