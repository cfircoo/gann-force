# Quick Start Guide

Get up and running with the Indicators platform in minutes.

## Prerequisites

- Node.js 18+
- npm or yarn
- Git
- Supabase account (for cloud database)
- Playwright (for web scraping)

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/indicators.git
cd indicators
```

### 2. Install dependencies

The project contains multiple modules. Install them separately:

```bash
# GannForce frontend
cd GannForce
npm install

# COT Scraper
cd ../cot_report
npm install

# Market Sentiment & FastBull Scrapers
cd ../market_sentiment
npm install

# Back to root for webhook server
cd ..
npm install
```

### 3. Environment Setup

Create `.env` files in directories that need them:

#### GannForce/.env (if needed for local Supabase development)
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

#### cot_report/.env
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

#### market_sentiment/.env
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

## Development

### Start the GannForce frontend

```bash
cd GannForce
npm run dev
```

The frontend will be available at `http://localhost:5173`

### Run the webhook server

```bash
node webhook_server.js
```

Listens on `http://localhost:8080` for TradingView webhooks.

## Running Scrapers Manually

### COT Scraper

```bash
cd cot_report
node cot_scraper.js
```

Scrapes COT data from Tradingster and uploads to Supabase.

### Sentiment Scraper

```bash
cd market_sentiment
node sentiment_scraper.js
```

Scrapes market sentiment from MyFxBook community outlook.

### FastBull Scraper

```bash
cd market_sentiment
node fastbull_scraper.js
```

Fetches order book data from FastBull API.

## Database

The project uses Supabase PostgreSQL with these key tables:

- `cot_scans` — Metadata for each COT scraping session
- `cot_data` — Individual COT asset data
- `sentiment_data` — Community sentiment for trading pairs
- `fastbull_data` — Order book and position data

See [Supabase API Documentation](../api/supabase.md) for schema details.

## Automated Workflows

Scrapers run automatically via GitHub Actions. Check `.github/workflows/scrape-cot.yml` for scheduling.

Manually trigger from GitHub Actions UI, or:

```bash
# Trigger via GitHub CLI
gh workflow run scrape-cot.yml --ref master
```

## Troubleshooting

### Playwright headless issues

If scrapers hang or fail to capture data:

```bash
# Install system dependencies
sudo apt-get install -y chromium-browser

# Or use provided Playwright browsers
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=false npm install
```

### Supabase connection errors

- Verify environment variables are set correctly
- Check Supabase dashboard for table existence and permissions
- Ensure API key has correct role (service_role for writes, anon for reads)

### Dashboard shows no data

1. Run scrapers manually to populate Supabase
2. Check browser console for errors
3. Verify Supabase URL and keys in frontend env vars

## Next Steps

- Check [Architecture Overview](architecture.md) to understand system design
- Review [COT Reporting](features/cot-reporting.md) for data collection details
- Explore [GannForce Dashboard](features/gannforce.md) for UI components
