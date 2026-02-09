import { useMemo } from "react";
import { useCotData } from "@/hooks/useCotData";
import { useSentimentData } from "@/hooks/useSentimentData";
import { DASHBOARD_INSTRUMENTS } from "@/config/dashboardInstruments";
import { computeRecommendation, type DashboardInstrument } from "@/types/dashboard";

interface UseDashboardDataReturn {
  instruments: DashboardInstrument[];
  loading: boolean;
  error: string | null;
  reportDate: string | null;
  sentimentSource: string | null;
  sentimentScrapedAt: string | null;
}

export function useDashboardData(): UseDashboardDataReturn {
  const { data: cotData, loading: cotLoading, error: cotError, reportDate } = useCotData();
  const { data: sentimentData, loading: sentLoading, error: sentError } = useSentimentData();

  const loading = cotLoading || sentLoading;
  const error = cotError || sentError;

  const instruments = useMemo(() => {
    if (!cotData) return [];

    return DASHBOARD_INSTRUMENTS.map((config) => {
      const categoryAssets = cotData[config.cotCategory] ?? [];
      const cotAsset = categoryAssets.find((a) => a.name === config.cotName) ?? null;

      let sentimentAsset = null;
      if (config.sentimentSymbol && sentimentData) {
        sentimentAsset =
          sentimentData.data.find((a) => a.symbol === config.sentimentSymbol) ?? null;
      }

      const { cotSignal, sentimentSignal, recommendation } = computeRecommendation(
        cotAsset,
        sentimentAsset
      );

      return {
        id: config.id,
        display: config.display,
        cotAsset,
        sentimentAsset,
        cotSignal,
        sentimentSignal,
        recommendation,
        hasSentiment: config.sentimentSymbol !== null,
      };
    });
  }, [cotData, sentimentData]);

  return {
    instruments,
    loading,
    error,
    reportDate,
    sentimentSource: sentimentData?.source ?? null,
    sentimentScrapedAt: sentimentData?.scraped_at ?? null,
  };
}
