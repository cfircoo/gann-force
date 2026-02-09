import type { CotCategory } from "@/types/cot";

export interface InstrumentConfig {
  id: string;
  display: string;
  cotName: string;
  cotCategory: CotCategory;
  sentimentSymbol: string | null;
}

export const DASHBOARD_INSTRUMENTS: InstrumentConfig[] = [
  {
    id: "SP500",
    display: "S&P 500",
    cotName: "E-MINI S&P 500",
    cotCategory: "Indexes",
    sentimentSymbol: null,
  },
  {
    id: "GOLD",
    display: "Gold",
    cotName: "GOLD",
    cotCategory: "Metals",
    sentimentSymbol: "XAUUSD",
  },
  {
    id: "EURUSD",
    display: "EUR/USD",
    cotName: "EURO FX",
    cotCategory: "Currencies",
    sentimentSymbol: "EURUSD",
  },
  {
    id: "OIL",
    display: "Crude Oil",
    cotName: "CRUDE OIL, LIGHT SWEET",
    cotCategory: "Energies",
    sentimentSymbol: null,
  },
  {
    id: "SILVER",
    display: "Silver",
    cotName: "SILVER",
    cotCategory: "Metals",
    sentimentSymbol: "XAGUSD",
  },
];
