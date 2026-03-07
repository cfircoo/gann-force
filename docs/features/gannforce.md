# GannForce Dashboard

The React-based frontend application that visualizes trading indicators across multiple data sources.

## Overview

GannForce is a unified dashboard built with React 19, TypeScript, and Tailwind CSS. It provides real-time visualization of:
- **COT (Commitment of Traders) data** from futures markets
- **Community sentiment** from MyFxBook
- **Order book positioning** from FastBull
- **Combined analysis** across all data sources

## Features

### 1. Combined Dashboard

Main landing page (`/dashboard`) that aggregates data from all sources.

**Displays:**
- Latest COT report date
- Key indicator highlights
- Top movers and most bullish/bearish instruments
- Sentiment overview
- FastBull order book summary

### 2. COT Dashboard

Specialized view for Commitment of Traders analysis (`/cot`).

**Displays:**
- 8 asset categories (Currencies, Cryptocurrencies, Indexes, etc.)
- For each asset:
  - Non-commercial long/short/spreads positions
  - Changes from previous report
  - Percentage of open interest
  - Unfulfilled calls metric
  - Open interest total

**Unfulfilled Calls Metric:**
```
Net Position = Non-commercial Long - Non-commercial Short
Change Difference = |Long Change| - |Short Change|
Unfulfilled Calls = Net Position / Change Difference * 100
```

This helps identify potential reversals when large positions haven't been fully realized.

### 3. Sentiment Dashboard

Community sentiment tracking view (`/sentiment`).

**Displays:**
- Long % vs Short % for 50+ trading pairs
- Visual progress bars for sentiment visualization
- Real-time updates from MyFxBook community
- Color coding: green for bullish, red for bearish

**Data Source:** MyFxBook community outlook page
- Scrapes every 30 minutes
- Handles Cloudflare anti-bot detection
- Stores historical sentiment data

### 4. FastBull Dashboard

Order book and position analysis view (`/fastbull`).

**Displays:**
- **Open Orders:** Buy vs Sell order ratios
- **Open Positions:** Long vs Short position ratios
- **Profit/Loss Breakdown:**
  - Long profit %: Positions in profit
  - Long loss %: Positions in loss
  - Short profit %: Short positions in profit
  - Short loss %: Short positions in loss
- **Current Price:** Live market price for each pair

**Use Case:** Identifies extreme positioning and potential reversals based on community order flow.

## Architecture

### Component Structure

```
App.tsx (Routes)
├── CombinedDashboard
│   ├── useDashboardData hook
│   ├── InstrumentCard components
│   └── RecommendationBadge components
├── CotDashboard
│   ├── useCotData hook
│   ├── CategorySection components
│   └── AssetBox components
├── SentimentDashboard
│   ├── useSentimentData hook
│   └── SentimentRow components
└── FastBullDashboard
    ├── useFastBullData hook
    └── FastBull table/card components
```

### Custom Hooks

#### useCotData()

Fetches latest COT scan and asset data.

```typescript
const { data, loading, error, reportDate } = useCotData();

// Returns:
// - data: Record<category, CotAsset[]>
// - loading: boolean
// - error: null | error message
// - reportDate: YYYY-MM-DD | null
```

**Process:**
1. Fetch latest scan metadata from `cot_scans` table
2. Get all assets for that scan from `cot_data` table
3. Group by category
4. Return with loading/error states

#### useSentimentData()

Fetches sentiment data for specified symbols.

```typescript
const { data, loading, error } = useSentimentData(symbols);

// Returns array of { symbol, short_pct, long_pct }
```

#### useFastBullData()

Fetches latest FastBull order book data.

```typescript
const { data, loading, error } = useFastBullData();

// Returns array of symbols with orders and positions data
```

#### useDashboardData()

Aggregates all three data sources.

```typescript
const { cot, sentiment, fastbull, loading, error } = useDashboardData();
```

## Data Types

### CotAsset
```typescript
{
  code: string;
  name: string;
  report_date: string;        // YYYY-MM-DD
  contract: string;
  contract_unit: string;
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
```

### SentimentData
```typescript
{
  symbol: string;
  short_pct: number;
  long_pct: number;
  source: "myfxbook.com";
  scraped_at: string;  // ISO timestamp
}
```

### FastBullData
```typescript
{
  symbol: string;

  orders?: {
    currentPrice: string;
    buy_pct: number;
    sell_pct: number;
  };

  positions?: {
    currentPrice: string;
    long_pct: number;
    short_pct: number;
    long_profit_pct: number;
    long_loss_pct: number;
    short_profit_pct: number;
    short_loss_pct: number;
  };
}
```

## UI Components

### InstrumentCard

Displays an instrument with COT and sentiment data combined.

```tsx
<InstrumentCard
  name="Gold"
  cotData={goldCotData}
  sentimentData={goldSentiment}
/>
```

Shows:
- Instrument name
- Net position and change
- Sentiment (long % vs short %)
- Recommendation badge (Bullish/Bearish/Neutral)

### RecommendationBadge

Visual indicator of bullish/bearish sentiment.

```tsx
<RecommendationBadge
  sentiment="bullish"
  strength={0.75}  // 0-1
/>
```

### CategorySection

Groups COT assets by category.

```tsx
<CategorySection
  category="Currencies"
  assets={assets}
/>
```

### AssetBox

Individual asset display with detailed metrics.

```tsx
<AssetBox asset={asset} />
```

Shows all COT metrics with color-coded changes.

### SentimentRow

Single row for sentiment display.

```tsx
<SentimentRow
  symbol="EUR/USD"
  longPct={55}
  shortPct={45}
/>
```

## Styling

Built with Tailwind CSS for responsive, modern UI:
- **Colors:** Custom palette for trading (green for bullish, red for bearish)
- **Responsive:** Mobile, tablet, desktop breakpoints
- **Dark mode ready:** Easily extensible
- **Accessibility:** Semantic HTML, ARIA labels

## Performance

- **Initial load:** ~2-3 seconds (Supabase query time)
- **Re-renders:** Optimized with React 19 automatic batching
- **Bundle size:** ~200KB gzipped
- **Caching:** Automatic with Supabase client

## Development

### Add a new dashboard page

1. Create new page component in `src/pages/`
2. Create corresponding hook in `src/hooks/` if needed
3. Add route to `App.tsx`
4. Create supporting components in `src/components/`

Example:
```tsx
// src/pages/CustomDashboard.tsx
import { useCustomData } from "@/hooks/useCustomData";

export default function CustomDashboard() {
  const { data, loading, error } = useCustomData();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return <div>{/* render data */}</div>;
}

// src/App.tsx
<Route path="/custom" element={<CustomDashboard />} />
```

### Add a new component

1. Create file in `src/components/{category}/ComponentName.tsx`
2. Use TypeScript for type safety
3. Use Tailwind for styling
4. Export from component index if needed

## Environment Variables

Required for running locally:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Deployment

### To Vercel

```bash
# Already configured in vercel.json
vercel deploy

# Or automatic deploy on git push
git push origin main
```

### SPA Routing

`vercel.json` configured for client-side routing:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

## Known Limitations

1. **No real-time updates** - Pages need manual refresh or page reload
2. **No historical charts** - Only latest data displayed
3. **No alerts** - No notifications for significant moves
4. **Single user** - No authentication system

## Future Enhancements

- Real-time WebSocket subscriptions
- Historical data charts
- Alert system for threshold breaks
- User accounts and custom dashboards
- Data export (CSV, PDF)
- Advanced analytics (ML-based signals)
