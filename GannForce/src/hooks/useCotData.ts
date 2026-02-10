import { useState, useEffect } from "react";
import type { CotAsset, CotData } from "@/types/cot";
import { supabase } from "@/lib/supabase";

interface UseCotDataReturn {
  data: CotData | null;
  loading: boolean;
  error: string | null;
  reportDate: string | null;
}

interface CotRow {
  category: string;
  code: string;
  name: string;
  report_date: string;
  contract: string;
  contract_unit: string;
  open_interest: number;
  change_in_open_interest: number;
  nc_long: number;
  nc_short: number;
  nc_spreads: number;
  nc_net: number;
  chg_long: number;
  chg_short: number;
  chg_spreads: number;
  pct_long: number;
  pct_short: number;
  pct_spreads: number;
  unfulfilled_calls: number | null;
}

function rowToAsset(row: CotRow): CotAsset {
  return {
    code: row.code,
    name: row.name,
    report_date: row.report_date,
    contract: row.contract,
    contract_unit: row.contract_unit,
    open_interest: row.open_interest,
    change_in_open_interest: row.change_in_open_interest,
    non_commercial: {
      long: row.nc_long,
      short: row.nc_short,
      spreads: row.nc_spreads,
      net: row.nc_net,
    },
    changes: {
      long: row.chg_long,
      short: row.chg_short,
      spreads: row.chg_spreads,
    },
    pct_of_open_interest: {
      long: row.pct_long,
      short: row.pct_short,
      spreads: row.pct_spreads,
    },
    unfulfilled_calls: row.unfulfilled_calls,
  };
}

export function useCotData(): UseCotDataReturn {
  const [data, setData] = useState<CotData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportDate, setReportDate] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      // Get the latest scan
      const { data: scan, error: scanErr } = await supabase
        .from("cot_scans")
        .select("id, report_date")
        .order("scraped_at", { ascending: false })
        .limit(1)
        .single();

      if (scanErr) {
        setError(`Failed to load COT scan: ${scanErr.message}`);
        setLoading(false);
        return;
      }

      setReportDate(scan.report_date);

      // Get all data for this scan
      const { data: rows, error: dataErr } = await supabase
        .from("cot_data")
        .select("*")
        .eq("scan_id", scan.id);

      if (dataErr) {
        setError(`Failed to load COT data: ${dataErr.message}`);
        setLoading(false);
        return;
      }

      // Group by category into CotData shape
      const grouped: Record<string, CotAsset[]> = {};
      for (const row of rows as CotRow[]) {
        if (!grouped[row.category]) grouped[row.category] = [];
        grouped[row.category].push(rowToAsset(row));
      }

      setData(grouped as CotData);
      setLoading(false);
    }

    fetchData();
  }, []);

  return { data, loading, error, reportDate };
}
