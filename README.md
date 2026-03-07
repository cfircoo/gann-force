# Indicators - Trading Data Analytics Platform

A comprehensive trading indicators platform that combines **Commitment of Traders (COT) analysis**, **market sentiment tracking**, and **order book visualization** with a unified dashboard interface. Built with React, TypeScript, Node.js, and Supabase.

**Status:** Active development | Current Branch: `feat/cot-percentage-display`

---

## Overview

The Indicators platform automates collection and visualization of trading market data from multiple sources:

- **COT Data** — Commitment of Traders positions from Tradingster (40+ assets across 8 categories)
- **Market Sentiment** — Community trading sentiment from MyFxBook (50+ currency pairs)
- **Order Book Analysis** — Pending orders and position tracking from FastBull
- **Unified Dashboard** — Real-time React frontend with multiple dashboard views

### Key Features

- **Multi-source Data Collection** — Automated web scrapers for COT, sentiment, and order book data
- **Real-time Dashboards** — React UI with multiple views (Combined, COT, Sentiment, FastBull)
- **Scheduled Automation** — GitHub Actions workflows for reliable scraping on schedule
- **Cloud Backend** — Supabase PostgreSQL for data persistence and real-time updates
- **TradingView Integration** — Webhook listener for alert integration
- **Type-Safe Frontend** — TypeScript React with Vite build tooling

---

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Git
- Supabase account (free tier available)
- GitHub account (for Actions workflows)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/indicators.git
   cd indicators
   ```

2. **Install dependencies for each module:**
   ```bash
   # Frontend
   cd GannForce && npm install && cd ..

   # COT Scraper
   cd cot_report && npm install && cd ..

   # Sentiment & FastBull Scrapers
   cd market_sentiment && npm install && cd ..
   ```

3. **Set up environment variables:**

   Create `.env` files in directories that need them:

   **GannForce/.env** (optional for local development):
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

   **cot_report/.env**:
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

   **market_sentiment/.env**:
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   ```

### Development

**Start the frontend dev server:**
```bash
cd GannForce
npm run dev
```
Frontend runs at `http://localhost:5173`

**Run scrapers manually:**
```bash
# COT scraper
cd cot_report && node cot_scraper.js

# Sentiment scraper
cd market_sentiment && node sentiment_scraper.js

# FastBull scraper
cd market_sentiment && node fastbull_scraper.js
```

**Start webhook server:**
```bash
node webhook_server.js
```
Listens on `http://localhost:8080` for TradingView webhooks.

---

## Project Structure

```
indicators/
├── GannForce/                   # React frontend dashboard
│   ├── src/
│   │   ├── pages/              # Dashboard pages (COT, Sentiment, FastBull, Combined)
│   │   ├── components/         # Reusable React components
│   │   ├── hooks/              # Custom data fetching hooks
│   │   ├── lib/                # Utilities and Supabase client
│   │   ├── types/              # TypeScript type definitions
│   │   └── App.tsx             # Root component with routing
│   └── package.json
│
├── cot_report/                  # COT data scraper
│   ├── cot_scraper.js          # Main scraping script
│   └── package.json
│
├── market_sentiment/            # Sentiment & FastBull scrapers
│   ├── sentiment_scraper.js     # MyFxBook sentiment scraper
│   ├── fastbull_scraper.js      # FastBull API scraper
│   └── package.json
│
├── Indicators/                  # TradingView Pine Script indicators
│   ├── *.pine                   # Indicator scripts
│   └── docs/                    # Indicator documentation
│
├── docs/                        # Project documentation
│   ├── index.md                # Documentation index
│   ├── architecture.md         # System design & overview
│   ├── getting-started.md      # Setup guide
│   ├── project-structure.md    # Directory breakdown
│   ├── features/               # Feature documentation
│   ├── scrapers/               # Scraper documentation
│   ├── components/             # Component reference
│   ├── api/                    # API documentation
│   ├── technical/              # Technical details
│   └── deployment/             # Deployment guides
│
├── .github/workflows/          # GitHub Actions automation
│   ├── scrape-cot.yml          # COT scraping workflow
│   └── scrape-sentiment.yml    # Sentiment scraping workflow
│
├── webhook_server.js           # TradingView webhook listener
└── README.md                   # This file
```

See [Project Structure Documentation](docs/project-structure.md) for detailed breakdown.

---

## Core Components

### Frontend (GannForce)

**React 19 + TypeScript + Vite** dashboard with multiple views:

- **Combined Dashboard** — Unified view of COT, sentiment, and order book data
- **COT Dashboard** — Detailed Commitment of Traders analysis for 40+ assets
- **Sentiment Dashboard** — Community sentiment tracking (50+ currency pairs)
- **FastBull Dashboard** — Order book and position visualization

**Key Technologies:**
- React 19 with functional components and hooks
- TypeScript for type safety
- Vite for fast development and optimized builds
- Tailwind CSS for responsive styling
- Supabase real-time client for live data
- React Router for client-side navigation

### Data Collection

Three independent scrapers collect data on schedule:

#### COT Scraper
- Scrapes Tradingster.com for Commitment of Traders data
- Collects 40+ assets across 8 categories
- Extracts non-commercial positions, changes, and percentages
- Calculates unfulfilled calls metric
- Runs: Friday 17:00 UTC (configurable)

#### Sentiment Scraper
- Tracks MyFxBook community sentiment
- Handles Cloudflare anti-bot detection
- Collects 50+ currency pairs
- Runs: Every 30 minutes

#### FastBull Scraper
- Fetches order book positioning data from FastBull API
- Analyzes pending orders (buy/sell ratios)
- Tracks open positions (long/short, profit/loss)
- Runs: Every 30 minutes

### Backend (Supabase)

**PostgreSQL database with cloud functions:**

**Key Tables:**
- `cot_scans` — Metadata for COT scraping sessions
- `cot_data` — Individual COT asset data
- `sentiment_data` — Community sentiment for trading pairs
- `fastbull_data` — Order book and position data

See [API Documentation](docs/api/supabase.md) for schema details.

### Webhooks

**Node.js webhook server** for TradingView integration:
- Listens for TradingView alert webhooks
- Logs all received alerts with timestamps
- Can be extended for automated trading actions

---

## Architecture

The platform uses a distributed architecture with loosely coupled components:

```
Data Sources → Scrapers → Supabase Backend → React Frontend
Tradingster    COT        PostgreSQL         Dashboards
MyFxBook       Sentiment  Real-time API
FastBull       Orders     Cloud Functions
```

**Key Design Patterns:**
- **Custom Hooks** — All data fetching encapsulated in reusable hooks
- **Batch Processing** — Scrapers collect all data before uploading
- **Scheduled Automation** — GitHub Actions trigger scrapers on schedule
- **Type Safety** — TypeScript throughout frontend and type definitions

See [Architecture Overview](docs/architecture.md) for complete system design.

---

## Automated Workflows

Scrapers run automatically via **GitHub Actions** on schedule:

- **COT Scraper**: Friday 17:00 UTC (after CFTC report release)
- **Sentiment Scraper**: Every 30 minutes
- **FastBull Scraper**: Every 30 minutes

**Manual Triggers:**
```bash
# Trigger via GitHub CLI
gh workflow run scrape-cot.yml --ref master
gh workflow run scrape-sentiment.yml --ref master

# Or use GitHub Actions UI
```

**Workflow Configuration:**
- `.github/workflows/scrape-cot.yml` — COT scraping schedule
- `.github/workflows/scrape-sentiment.yml` — Sentiment and FastBull scraping

---

## Data Schema

### COT Data Table
```
cot_data {
  scan_id, category, code, name, report_date, contract,
  contract_unit, open_interest, change_in_open_interest,
  nc_long, nc_short, nc_spreads, nc_net,
  chg_long, chg_short, chg_spreads,
  pct_long, pct_short, pct_spreads,
  unfulfilled_calls
}
```

### Sentiment Data Table
```
sentiment_data {
  id, source, scraped_at, symbol,
  short_pct, long_pct
}
```

### FastBull Data Table
```
fastbull_data {
  id, source, scraped_at, symbol,
  orders_current_price, orders_buy_pct, orders_sell_pct,
  positions_current_price, positions_long_pct, positions_short_pct,
  positions_long_profit_pct, positions_long_loss_pct,
  positions_short_profit_pct, positions_short_loss_pct
}
```

---

## Configuration & Environment

### Environment Variables

**Frontend (.env.local or VITE_* prefixed):**
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**Scrapers (.env in each scraper directory):**
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # For writes
SUPABASE_ANON_KEY=your-anon-key                  # For reads
```

### Build Configuration

- **Frontend**: Configured in `GannForce/vite.config.ts`
- **Dev Server**: Runs on port 5173 with HMR
- **Build Output**: Optimized bundles in `dist/`
- **Deployment**: Ready for Vercel, Netlify, or static hosting

See [Project Structure Documentation](docs/project-structure.md) for configuration details.

---

## Deployment

### Frontend

**Built with Vite for production:**
```bash
cd GannForce
npm run build
# Output: GannForce/dist/
```

**Deploy to:**
- Vercel (recommended) — SPA routing pre-configured in `vercel.json`
- Netlify — Configure redirects for SPA routing
- Any static host (GitHub Pages, Cloudflare Pages, etc.)

### Scrapers

**Run on schedule via GitHub Actions** (recommended):
- Reliable, no infrastructure needed
- Secrets stored securely in GitHub
- Automatic retries and error notifications

**Or deploy to:**
- Vercel Functions (Node.js)
- AWS Lambda
- Google Cloud Functions
- Self-hosted server with cron jobs

### Database

**Supabase managed cloud PostgreSQL:**
- Tables auto-created on first scrape
- Real-time subscriptions (optional)
- Built-in authentication and RLS
- Free tier sufficient for this project

See [Build & Deploy Guide](docs/deployment/build-deploy.md) for step-by-step instructions.

---

## Troubleshooting

### Playwright headless issues
If scrapers hang or timeout:
```bash
# Install system dependencies
sudo apt-get install -y chromium-browser

# Or reinstall Playwright
npm install --save-dev playwright
npx playwright install chromium --with-deps
```

### Supabase connection errors
- Verify API keys are set in environment variables
- Check Supabase dashboard for table existence
- Ensure API key has correct permissions (service_role for writes)

### Dashboard shows no data
1. Run scrapers manually to populate Supabase
2. Check browser console for JavaScript errors
3. Verify frontend environment variables
4. Check Supabase table for data: `SELECT COUNT(*) FROM cot_data;`

### Scraper failures
- Check GitHub Actions workflow run logs
- Verify target websites are accessible (not blocked by firewall)
- Confirm Supabase credentials are valid
- Check scraper console output for specific errors

See [Getting Started](docs/getting-started.md#troubleshooting) for more solutions.

---

## Documentation

Comprehensive documentation is available in the `docs/` directory:

### Getting Started
- [Quick Start Guide](docs/getting-started.md) — Installation and setup

### System Design
- [Architecture Overview](docs/architecture.md) — System design and data flow
- [Project Structure](docs/project-structure.md) — Directory organization and modules

### Features & Data Collection
- [GannForce Dashboard](docs/features/gannforce.md) — Frontend UI overview
- [COT Reporting](docs/features/cot-reporting.md) — COT data collection and analysis
- [Market Sentiment](docs/features/market-sentiment.md) — Sentiment tracking details
- [Order Book Analysis](docs/features/order-book.md) — FastBull integration

### Components & Development
- [Custom Hooks](docs/components/hooks.md) — Data fetching hook reference
- [Dashboard Components](docs/components/dashboard.md) — Reusable UI components

### Technical Reference
- [API Integration](docs/api/supabase.md) — Supabase schema and integration
- [Webhook Server](docs/technical/webhook-server.md) — TradingView webhooks
- [Configuration](docs/technical/config.md) — Environment and build settings

### Deployment & Operations
- [GitHub Actions](docs/deployment/github-actions.md) — Workflow configuration
- [Build & Deploy](docs/deployment/build-deploy.md) — Production deployment guide

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 19 | UI framework |
| **Frontend** | TypeScript | Type safety |
| **Frontend** | Vite | Dev server & bundler |
| **Frontend** | Tailwind CSS | Styling |
| **Frontend** | React Router | Client routing |
| **Scraping** | Playwright | Browser automation |
| **Runtime** | Node.js 18+ | Script execution |
| **Backend** | Supabase PostgreSQL | Database |
| **API** | Supabase REST API | Data access |
| **Webhooks** | Node.js HTTP | Webhook server |
| **CI/CD** | GitHub Actions | Automation |

---

## Key Metrics

- **40+ Assets** tracked in COT data (currencies, crypto, commodities, indices)
- **50+ Currency Pairs** monitored for sentiment
- **8 Asset Categories** in COT analysis
- **30-minute Intervals** for sentiment and order book updates
- **Friday 17:00 UTC** COT data collection (post-CFTC report)
- **~2-3 minutes** COT scraping time
- **~45 seconds** sentiment scraping time
- **~15 seconds** order book scraping time

---

## Contributing

1. Create a feature branch: `git checkout -b feat/your-feature`
2. Make changes and test locally
3. Commit with clear messages: `git commit -m "Add feature description"`
4. Push to GitHub: `git push origin feat/your-feature`
5. Create a Pull Request with description

See [Contributing Guide](docs/contributing.md) for detailed workflow.

---

## License

(Add your license here if applicable)

---

## Support & Questions

- Review [Troubleshooting Section](#troubleshooting) for common issues
- Check [Documentation](docs/) for detailed guides
- Open an issue on GitHub for bugs or feature requests
- Check existing issues before creating new ones

---

## Roadmap

Future enhancements planned:

- WebSocket subscriptions for true real-time dashboard updates
- Advanced charting with TradingView Lightweight Charts
- Machine learning for COT signal generation
- Historical data analysis and backtesting
- Alert system for significant data changes
- More data sources and indicators

---

**Last Updated:** March 7, 2026

For detailed information, start with the [Getting Started Guide](docs/getting-started.md) or explore the [Documentation Index](docs/index.md).
