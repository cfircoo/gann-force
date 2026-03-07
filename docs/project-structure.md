# Project Structure

## Directory Layout

```
indicators/
├── .github/
│   └── workflows/
│       └── scrape-cot.yml                # GitHub Actions workflow for COT scraping
├── GannForce/                             # React frontend application
│   ├── src/
│   │   ├── components/                   # Reusable React components
│   │   │   ├── cot/                      # COT display components
│   │   │   ├── dashboard/                # Dashboard card components
│   │   │   ├── sentiment/                # Sentiment data components
│   │   │   └── layout/                   # Layout wrapper components
│   │   ├── pages/                        # Page-level components
│   │   │   ├── CombinedDashboard.tsx    # Main dashboard
│   │   │   ├── CotDashboard.tsx         # COT-specific dashboard
│   │   │   ├── SentimentDashboard.tsx   # Sentiment-specific dashboard
│   │   │   └── FastBullDashboard.tsx    # FastBull order book dashboard
│   │   ├── hooks/                        # Custom React hooks
│   │   │   ├── useCotData.ts            # Fetch COT data
│   │   │   ├── useSentimentData.ts      # Fetch sentiment data
│   │   │   ├── useFastBullData.ts       # Fetch FastBull data
│   │   │   └── useDashboardData.ts      # Aggregate all data
│   │   ├── lib/                          # Utilities and services
│   │   │   └── supabase.ts              # Supabase client
│   │   ├── types/                        # TypeScript type definitions
│   │   │   └── *.ts                     # Type interfaces for data models
│   │   ├── config/                       # Configuration
│   │   ├── assets/                       # Static assets (images, icons)
│   │   ├── App.tsx                       # Root component with routes
│   │   ├── main.tsx                      # Application entry point
│   │   └── index.css                     # Global styles
│   ├── index.html                        # HTML template
│   ├── package.json                      # Dependencies and scripts
│   ├── tsconfig.json                     # TypeScript configuration
│   ├── vite.config.ts                    # Vite bundler configuration
│   ├── tailwind.config.js                # Tailwind CSS configuration
│   ├── eslint.config.js                  # ESLint configuration
│   ├── vercel.json                       # Vercel deployment config
│   └── dist/                             # Build output (generated)
│
├── cot_report/                           # COT data scraper
│   ├── cot_scraper.js                   # Main COT scraping script
│   ├── cot_data.json                    # Local backup of COT data
│   ├── package.json                     # Dependencies
│   └── node_modules/                    # Installed packages
│
├── market_sentiment/                     # Market sentiment & FastBull scrapers
│   ├── sentiment_scraper.js             # MyFxBook sentiment scraper
│   ├── fastbull_scraper.js              # FastBull order book scraper
│   ├── sentiment_data.json              # Sentiment data backup
│   ├── fastbull_orderbook.json          # FastBull data backup
│   ├── package.json                     # Dependencies
│   └── node_modules/                    # Installed packages
│
├── Indicators/                           # TradingView Pine Script indicators
│   ├── *.pine                           # Pine Script indicator files
│   └── docs/                            # Pine Script documentation
│
├── gann-report-analyze/                  # Gann analysis report generation
│   └── reports/                         # Generated reports
│
├── webhook_server.js                     # TradingView webhook listener
├── .gitignore                            # Git ignore rules
├── .mcp.json                             # MCP configuration
└── README.md                             # Project documentation
```

## Module Breakdown

### GannForce (Frontend)

**Purpose:** React-based dashboard for viewing trading data

**Key Files:**
- `package.json` - Dependencies: React 19, TypeScript, Vite, Tailwind, Supabase
- `src/App.tsx` - Routes to different dashboards
- `src/pages/*.tsx` - Dashboard pages
- `src/hooks/*.ts` - Data fetching logic
- `src/components/` - UI components

**Output:** Built to `dist/` directory, deployed to Vercel

### cot_report

**Purpose:** Scrapes COT data from Tradingster

**Key Files:**
- `cot_scraper.js` - Main scraper (Playwright + Supabase)
- `cot_data.json` - Local backup file

**Runs:**
- Scheduled: Fridays 17:00 UTC via GitHub Actions
- Manual: Trigger from GitHub Actions UI or `gh workflow run scrape-cot.yml`

### market_sentiment

**Purpose:** Collects sentiment and order book data

**Key Files:**
- `sentiment_scraper.js` - MyFxBook sentiment scraper
- `fastbull_scraper.js` - FastBull API scraper
- `sentiment_data.json` - Sentiment backup
- `fastbull_orderbook.json` - Order book backup

**Runs:** Via GitHub Actions workflows

### Indicators

**Purpose:** TradingView Pine Script indicators

**Key Files:**
- `*.pine` - Various indicator scripts
- `docs/` - Indicator documentation

### webhook_server.js

**Purpose:** Receives webhook alerts from TradingView

**Function:** Listens on port 8080 for POST requests with alert data

**Status:** Can log alerts but not yet integrated into main dashboard

## Key Configuration Files

### GannForce/package.json
```json
{
  "name": "gannforce",
  "scripts": {
    "dev": "vite",                 // Start dev server
    "build": "tsc -b && vite build", // Build for production
    "preview": "vite preview"      // Preview build
  },
  "dependencies": {
    "react": "^19.2.0",
    "react-router-dom": "^7.13.0",
    "@supabase/supabase-js": "^2.95.3",
    "tailwindcss": "^3.4.19"
  }
}
```

### .github/workflows/scrape-cot.yml
- Scheduled COT scraping on Friday 17:00 UTC
- Manual trigger with force option
- Calls Supabase cloud function for COT scraping
- Fails workflow if scraping fails

### GannForce/vite.config.ts
- Port 5173 for dev server
- React plugin for JSX/HMR
- Optimized build output

## Data Files

### Backup JSON Files
These are local backups created by scrapers:
- `cot_report/cot_data.json` - Latest COT data
- `market_sentiment/sentiment_data.json` - Latest sentiment data
- `market_sentiment/fastbull_orderbook.json` - Latest order book data

These files are NOT committed to git (in `.gitignore`) but useful for:
- Local debugging
- Backup if Supabase is unavailable
- Checking scraper output before upload

## Environment Variables

### Frontend (GannForce)
```bash
VITE_SUPABASE_URL=https://...
VITE_SUPABASE_ANON_KEY=...
```

### Scrapers (cot_report, market_sentiment)
```bash
SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...  # Has write permissions
SUPABASE_ANON_KEY=...          # Has read-only permissions
```

## Build Artifacts

- `GannForce/dist/` - Frontend build output (generated by Vite)
- Not committed to git
- Contains HTML, CSS, JS bundles
- Ready for deployment to Vercel or any static host

## Type Definitions

Located in `GannForce/src/types/`:
- Define interfaces for COT data, sentiment data, FastBull data
- Ensure type safety across components and hooks
- Enable IDE autocomplete and type checking

## Important Notes

1. **No production dependencies in root** - Each module is self-contained
2. **node_modules not committed** - Run `npm install` in each module
3. **API keys in GitHub Secrets** - Never commit `.env` files with real keys
4. **Backup JSON not committed** - Scrapers generate these locally
5. **Build output not committed** - Vite generates `dist/` on build

## Module Independence

Modules are designed to be:
- **Independently deployable** - Each can run without others
- **Independently testable** - Separate test suites possible
- **Independently scalable** - Can upgrade specific modules
- **Loosely coupled** - Only coupled through Supabase

This architecture enables:
- Deploying frontend updates without touching scrapers
- Updating scrapers without rebuilding frontend
- Running multiple scraper instances for redundancy
