export interface CotAsset {
  code: string;
  name: string;
  report_date: string;
  contract: string;
  contract_unit?: string;
  open_interest: number;
  change_in_open_interest: number;
  non_commercial: {
    long: number;
    short: number;
    spreads: number;
    net: number;
  };
  changes: {
    long: number;
    short: number;
    spreads: number;
  };
  pct_of_open_interest: {
    long: number;
    short: number;
    spreads: number;
  };
  unfulfilled_calls: number | null;
}

export type CotCategory =
  | "Currencies"
  | "Cryptocurrencies"
  | "Indexes"
  | "Treasuries and Rates"
  | "Energies"
  | "Grains"
  | "Livestock & Dairy"
  | "Metals"
  | "Softs";

export type CotData = Record<CotCategory, CotAsset[]>;

export const CATEGORY_ORDER: CotCategory[] = [
  "Indexes",
  "Metals",
  "Currencies",
  "Cryptocurrencies",
  "Energies",
  "Treasuries and Rates",
  "Grains",
  "Livestock & Dairy",
  "Softs",
];
