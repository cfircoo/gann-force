import { useMemo } from "react";
import { useCotData } from "@/hooks/useCotData";
import { useSentimentData } from "@/hooks/useSentimentData";
import { useFastBullData } from "@/hooks/useFastBullData";
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
  const { data: fastbullData, loading: fbLoading, error: fbError } = useFastBullData();

  const loading = cotLoading || sentLoading || fbLoading;
  const error = cotError || sentError || fbError;

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

      let pivotPrice: string | null = null;
      if (config.fastbullSymbol && fastbullData.length > 0) {
        const fb = fastbullData.find((a) => a.symbol === config.fastbullSymbol);
        pivotPrice = fb?.positions_price ?? null;
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
        pivotPrice,
      };
    });
  }, [cotData, sentimentData, fastbullData]);

  return {
    instruments,
    loading,
    error,
    reportDate,
    sentimentSource: sentimentData?.source ?? null,
    sentimentScrapedAt: sentimentData?.scraped_at ?? null,
  };
}
