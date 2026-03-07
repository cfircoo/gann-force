# Architecture Overview

The Indicators platform is a distributed system for collecting, analyzing, and visualizing trading market data across multiple sources.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (GannForce)                     │
│  React + TypeScript + Vite | Tailwind CSS | React Router    │
└────────────┬──────────────────────────────────────┬──────────┘
             │                                      │
       ┌─────▼──────┐                    ┌──────────▼──────┐
       │  Combined  │                    │ TradingView     │
       │ Dashboard  │                    │ Webhook Server  │
       └─────┬──────┘                    └────────┬────────┘
             │                                    │
    ┌────────┴────────┬─────────────┬─────────┐  │
    │                 │             │         │  │
┌───▼────┐ ┌────────▼─┐ ┌──────────▼┐  ┌────▼──┐
│   COT   │ │Sentiment │ │ FastBull  │  │ Gann  │
│Dashboard│ │ Dashboard│ │ Dashboard │  │ Force │
└────┬────┘ └────┬────┘ └────┬──────┘  └──────┘
     │           │            │
     └───────────┴────────────┘
           │
     ┌─────▼─────────────────────────────┐
     │     SUPABASE CLOUD BACKEND         │
     │  PostgreSQL | Real-time | Auth    │
     └─────┬─────────────────────────────┘
           │
   ┌───────┴───────────┬───────────┬──────────┐
   │                   │           │          │
┌──▼────────┐  ┌──────▼──┐ ┌─────▼───┐ ┌────▼────┐
│ COT Scans │  │COT Data │ │Sentiment│ │FastBull │
│  Metadata │  │ Assets  │ │  Data   │ │  Data   │
└────┬──────┘  └──────┬──┘ └────┬────┘ └────┬────┘
     │                │         │          │
     └────────────────┴─────────┴──────────┘
           │
     ┌─────▼──────────────────────────┐
     │  DATA COLLECTION LAYER          │
     │  (Node.js Scripts)              │
     └─────┬──────────────────────────┘
           │
    ┌──────┴──────┬──────────┬─────────┐
    │             │          │         │
┌───▼────┐  ┌───▼────┐  ┌───▼──┐  ┌──▼────┐
│Tradingster│ │MyFxBook│  │FastBull │ │GitHub │
│ COT Data │ │Community│  │ API  │ │ Actions
└──────────┘ └────────┘  └──────┘ └───────┘
```

## Core Modules

### 1. Frontend (GannForce)

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS

**Entry Point:** `/GannForce/src/index.tsx`

**Key Features:**
- Single Page Application with client-side routing
- Real-time data from Supabase
- Multiple dashboard views (Combined, COT, Sentiment, FastBull)
- Responsive UI for trading analysis

**Directory Structure:**
```
GannForce/src/
├── components/        # Reusable React components
│   ├── cot/          # COT display components
│   ├── dashboard/    # Dashboard UI components
│   ├── sentiment/    # Sentiment display
│   └── layout/       # Layout wrapper
├── pages/            # Page-level components
├── hooks/            # Custom React hooks
├── lib/              # Utilities & Supabase client
├── types/            # TypeScript type definitions
├── config/           # Configuration
├── assets/           # Static assets
└── App.tsx           # Root component with routes
```

### 2. Data Collection Scrapers

**Tech Stack:** Node.js, Playwright, Supabase SDK

#### COT Scraper (`/cot_report/cot_scraper.js`)

Collects Commitment of Traders data:
- Scrapes Tradingster.com for 40+ assets across 8 categories
- Extracts non-commercial positions, changes, and percentages
- Calculates unfulfilled calls metric
- Uploads to Supabase in batches

**Categories Tracked:**
- Currencies (10 pairs)
- Cryptocurrencies (4 assets)
- Indexes (7 indices)
- Treasuries & Rates (4 instruments)
- Energies (4 commodities)
- Grains (9 commodities)
- Livestock & Dairy (7 commodities)
- Metals (6 commodities)
- Softs (6 commodities)

#### Sentiment Scraper (`/market_sentiment/sentiment_scraper.js`)

Tracks market community sentiment:
- Scrapes MyFxBook community outlook page
- Handles Cloudflare anti-bot detection
- Extracts long/short percentage sentiment
- Stores sentiment for 50+ currency pairs

#### FastBull Scraper (`/market_sentiment/fastbull_scraper.js`)

Captures order book positioning data:
- Fetches pending orders (buy/sell ratios)
- Analyzes open positions (long/short, profit/loss ratios)
- Includes current price data
- Processes multiple trading pairs

### 3. Backend (Supabase)

**Database:** PostgreSQL

**Key Tables:**

```sql
-- COT Data Tables
cot_scans {
  id, source, report_date, scraped_at
}

cot_data {
  scan_id, category, code, name, report_date, contract,
  contract_unit, open_interest, change_in_open_interest,
  nc_long, nc_short, nc_spreads, nc_net,
  chg_long, chg_short, chg_spreads,
  pct_long, pct_short, pct_spreads,
  unfulfilled_calls
}

-- Sentiment Data Table
sentiment_data {
  id, source, scraped_at, symbol, short_pct, long_pct
}

-- FastBull Data Table
fastbull_data {
  id, source, scraped_at, symbol,
  orders_current_price, orders_buy_pct, orders_sell_pct,
  positions_current_price, positions_long_pct, positions_short_pct,
  positions_long_profit_pct, positions_long_loss_pct,
  positions_short_profit_pct, positions_short_loss_pct
}
```

## Data Flow

### COT Data Pipeline

```
Tradingster.com
    ↓
Playwright Browser Scraper
    ↓
Extract Non-Commercial Positions
    ↓
Calculate Metrics (net, unfulfilled calls)
    ↓
Batch Upload to Supabase
    ↓
Frontend Fetch Latest Scan
    ↓
Display in COT Dashboard
```

### Sentiment Collection

```
MyFxBook Community
    ↓
Playwright (handle Cloudflare)
    ↓
Parse HTML table
    ↓
Extract Long/Short %
    ↓
Supabase Cloud Function
    ↓
Store sentiment_data
    ↓
Display in Sentiment Dashboard
```

### Order Book Pipeline

```
FastBull API
    ↓
Fetch Pair List
    ↓
For each pair: fetch orders & positions
    ↓
Calculate buy/sell and profit/loss ratios
    ↓
Upload to Supabase
    ↓
Display in FastBull Dashboard
```

## Key Technologies

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 19 | UI framework |
| **Frontend** | TypeScript | Type safety |
| **Frontend** | Vite | Dev server & bundler |
| **Frontend** | Tailwind CSS | Styling |
| **Frontend** | React Router | Client-side routing |
| **Scraping** | Playwright | Browser automation |
| **Data Collection** | Node.js | Script runtime |
| **Backend** | Supabase PostgreSQL | Database |
| **API** | Supabase REST | Database access |
| **Webhooks** | Node.js HTTP | TradingView integration |
| **CI/CD** | GitHub Actions | Automated scraping |

## Design Patterns

### Custom Hooks for Data Fetching

All data fetching is encapsulated in custom React hooks:

```typescript
// useCotData.ts - Fetches latest COT scan and data
// useSentimentData.ts - Fetches sentiment data for symbols
// useFastBullData.ts - Fetches order book data
// useDashboardData.ts - Aggregates all data
```

Benefits:
- Reusable across components
- Centralized error handling
- Loading state management
- Automatic cache invalidation

### Batch Data Processing

Scrapers collect all data before uploading:
- COT: 40+ assets collected, batched with scan metadata
- Sentiment: 50+ symbols collected, pushed in single call
- FastBull: All pairs collected, pushed in single request

### Real-time Dashboard Updates

Dashboard components re-fetch on mount and at intervals, enabling near-real-time data without WebSockets.

## Security

- **Frontend:** No sensitive keys stored (uses VITE_ prefix for env vars)
- **Backend:** Supabase handles RLS (Row-Level Security)
- **Scrapers:** Service role keys stored in GitHub Secrets
- **API Keys:** Never committed to repo

## Deployment

- **Frontend:** Built with Vite, deployed to Vercel (SPA routing configured)
- **Scrapers:** Run on schedule via GitHub Actions
- **Backend:** Supabase managed cloud database
- **Webhooks:** Can be deployed to Vercel or any Node.js host

## Error Handling

- Scrapers: stderr logging with categorized success/skip/error messages
- Frontend: Toast notifications for data loading failures
- Supabase: Query error handling with user-friendly messages
- Webhooks: Logs all requests with ISO timestamps

## Performance Considerations

- COT scraping: ~2-3 min for 40+ assets (Tradingster loading times)
- Sentiment scraping: ~30-45 sec (Cloudflare handling adds overhead)
- FastBull scraping: ~10-15 sec (API response times)
- Frontend dashboard: Real-time via Supabase subscriptions (optional)
- Build size: ~200KB gzipped (Vite optimized)

## Future Improvements

- WebSocket subscriptions for true real-time updates
- Data aggregation/analytics on backend
- Advanced charting with TradingView Lightweight Charts
- Machine learning for COT signal generation
- Historical data analysis and backtesting
