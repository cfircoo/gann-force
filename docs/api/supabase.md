# Supabase Integration

Database and cloud function integration for the Indicators platform.

## Overview

Supabase provides:
- **PostgreSQL database** for data storage
- **REST API** for queries from frontend
- **Edge functions** for server-side processing
- **Real-time subscriptions** (optional)

## Database Schema

### COT Tables

#### cot_scans
Metadata for each scraping session:

```sql
CREATE TABLE cot_scans (
  id BIGSERIAL PRIMARY KEY,
  source TEXT NOT NULL,           -- "tradingster.com"
  report_date DATE,               -- CFTC report date
  scraped_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_cot_scans_scraped_at ON cot_scans(scraped_at DESC);
CREATE INDEX idx_cot_scans_report_date ON cot_scans(report_date DESC);
```

#### cot_data
Individual COT asset records:

```sql
CREATE TABLE cot_data (
  id BIGSERIAL PRIMARY KEY,
  scan_id BIGINT REFERENCES cot_scans(id) ON DELETE CASCADE,

  category TEXT NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,

  report_date DATE,
  contract TEXT,
  contract_unit TEXT,

  open_interest BIGINT,
  change_in_open_interest BIGINT,

  -- Non-commercial positions
  nc_long BIGINT,
  nc_short BIGINT,
  nc_spreads BIGINT,
  nc_net BIGINT,

  -- Changes
  chg_long BIGINT,
  chg_short BIGINT,
  chg_spreads BIGINT,

  -- Percentages
  pct_long FLOAT,
  pct_short FLOAT,
  pct_spreads FLOAT,

  -- Calculated metric
  unfulfilled_calls FLOAT,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_cot_data_scan_id ON cot_data(scan_id);
CREATE INDEX idx_cot_data_category ON cot_data(category);
CREATE INDEX idx_cot_data_code ON cot_data(code);
```

### Sentiment Table

#### sentiment_data
Community sentiment records:

```sql
CREATE TABLE sentiment_data (
  id BIGSERIAL PRIMARY KEY,
  source TEXT NOT NULL,           -- "myfxbook.com"
  scraped_at TIMESTAMP,
  symbol TEXT NOT NULL,
  short_pct FLOAT,
  long_pct FLOAT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sentiment_symbol ON sentiment_data(symbol);
CREATE INDEX idx_sentiment_scraped_at ON sentiment_data(scraped_at DESC);
```

### FastBull Table

#### fastbull_data
Order book and position records:

```sql
CREATE TABLE fastbull_data (
  id BIGSERIAL PRIMARY KEY,
  source TEXT NOT NULL,           -- "fastbull.com/order-book"
  scraped_at TIMESTAMP,
  symbol TEXT NOT NULL,

  -- Orders
  orders_current_price TEXT,
  orders_buy_pct FLOAT,
  orders_sell_pct FLOAT,

  -- Positions
  positions_current_price TEXT,
  positions_long_pct FLOAT,
  positions_short_pct FLOAT,
  positions_long_profit_pct FLOAT,
  positions_long_loss_pct FLOAT,
  positions_short_profit_pct FLOAT,
  positions_short_loss_pct FLOAT,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_fastbull_symbol ON fastbull_data(symbol);
CREATE INDEX idx_fastbull_scraped_at ON fastbull_data(scraped_at DESC);
```

## API Queries

### Frontend (useSupabaseClient)

```typescript
import { supabase } from "@/lib/supabase";

// Initialize
const client = createClient(
  "https://project.supabase.co",
  "anon-key"
);
```

### COT Queries

#### Get latest scan

```typescript
const { data: scan } = await supabase
  .from("cot_scans")
  .select("id, report_date")
  .order("scraped_at", { ascending: false })
  .limit(1)
  .single();
```

#### Get all assets for a scan

```typescript
const { data: assets } = await supabase
  .from("cot_data")
  .select("*")
  .eq("scan_id", scan.id);
```

#### Get specific category

```typescript
const { data: metals } = await supabase
  .from("cot_data")
  .select("*")
  .eq("category", "Metals")
  .order("name", { ascending: true });
```

### Sentiment Queries

#### Get latest sentiment for all symbols

```typescript
const { data: latest } = await supabase
  .from("sentiment_data")
  .select("*")
  .order("scraped_at", { ascending: false })
  .limit(1);

// Group by symbol to get latest for each
const grouped = {};
for (const row of latest) {
  if (!grouped[row.symbol]) {
    grouped[row.symbol] = row;
  }
}
```

#### Get sentiment for specific symbol

```typescript
const { data: eurUsd } = await supabase
  .from("sentiment_data")
  .select("*")
  .eq("symbol", "EUR/USD")
  .order("scraped_at", { ascending: false })
  .limit(1)
  .single();
```

### FastBull Queries

#### Get latest order book data

```typescript
const { data: orderBook } = await supabase
  .from("fastbull_data")
  .select("*")
  .order("scraped_at", { ascending: false })
  .limit(1);
```

#### Group by symbol (latest for each)

```typescript
const bySymbol = {};
for (const row of orderBook) {
  if (!bySymbol[row.symbol]) {
    bySymbol[row.symbol] = row;
  }
}
```

## Edge Functions

Server-side functions for data processing.

### scrape-cot (Function)

Triggered by GitHub Actions to initiate COT scraping.

**Endpoint:** `https://project.supabase.co/functions/v1/scrape-cot`

**Method:** POST

**Parameters:**
```json
{
  "force": false  // Optional: force re-scrape even if already done today
}
```

**Response:**
```json
{
  "success": true,
  "message": "COT scraping initiated",
  "scan_id": 123
}
```

### ingest-sentiment (Function)

Processes and stores sentiment data via upsert.

**Endpoint:** `https://project.supabase.co/functions/v1/ingest-sentiment`

**Method:** POST

**Payload:**
```json
{
  "source": "myfxbook.com",
  "scraped_at": "2025-02-14T12:30:45Z",
  "data": [
    {
      "symbol": "EUR/USD",
      "short_pct": 45.2,
      "long_pct": 54.8
    }
  ]
}
```

**Response:**
```json
{
  "ok": true,
  "symbols": 52
}
```

### ingest-fastbull (Function)

Processes and stores FastBull data via upsert.

**Endpoint:** `https://project.supabase.co/functions/v1/ingest-fastbull`

**Method:** POST

**Payload:**
```json
{
  "source": "fastbull.com/order-book",
  "scraped_at": "2025-02-14T12:45:30Z",
  "data": [
    {
      "symbol": "EUR/USD",
      "orders": {
        "currentPrice": "1.0854",
        "buy_pct": 42.5,
        "sell_pct": 57.5
      },
      "positions": {
        "currentPrice": "1.0854",
        "long_pct": 48.2,
        "short_pct": 51.8,
        "long_profit_pct": 35.5,
        "long_loss_pct": 64.5,
        "short_profit_pct": 42.1,
        "short_loss_pct": 57.9
      }
    }
  ]
}
```

**Response:**
```json
{
  "ok": true,
  "symbols": 52
}
```

## Authentication

### Frontend

Uses anon key (read-only):

```typescript
const client = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

RLS (Row-Level Security) policies ensure anon key can only read, not write.

### Scrapers

Use service role key (write access):

```javascript
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
```

### GitHub Actions

Keys stored in repository Secrets:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`

## Environment Variables

### Frontend (.env.local)

```bash
VITE_SUPABASE_URL=https://nvvgqvkbooqrdusugmgg.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
```

### Scrapers (.env)

```bash
SUPABASE_URL=https://nvvgqvkbooqrdusugmgg.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
```

## Row-Level Security (RLS)

### Policies

**cot_data - SELECT (public)**
```sql
CREATE POLICY "Allow public read"
  ON cot_data
  FOR SELECT
  USING (true);
```

All tables are publicly readable (data is non-sensitive).

**cot_data - INSERT (service role only)**
```sql
CREATE POLICY "Allow service role insert"
  ON cot_data
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');
```

Only service role can insert.

## Connection Pool

Supabase uses connection pooling for:
- Scalability
- Performance
- Cost efficiency

Max connections: Based on plan (typically 10+ for dev)

## Backup & Recovery

Supabase provides:
- **Daily automated backups**
- **Point-in-time recovery** (7 days)
- **Manual backups** via dashboard

## Performance Tuning

### Index Strategy

```sql
-- Frequently queried columns
CREATE INDEX idx_cot_data_scan_id ON cot_data(scan_id);
CREATE INDEX idx_sentiment_scraped_at ON sentiment_data(scraped_at DESC);

-- Grouping columns
CREATE INDEX idx_cot_data_category ON cot_data(category);
CREATE INDEX idx_fastbull_symbol ON fastbull_data(symbol);
```

### Query Optimization

**Good:**
```typescript
// Selective queries
.select("id, name, nc_net")
.eq("scan_id", 123)

// Limit results
.limit(50)
```

**Avoid:**
```typescript
// Select all columns
.select("*")

// No limit
.select("*")
```

## Monitoring

### View Logs

Dashboard → Logs → Postgres Logs

### Query Performance

Dashboard → SQL Editor → Query Insights

## Troubleshooting

### Connection errors

Check:
- Supabase project is active
- URL is correct
- API key is valid
- Network connectivity

### Row-Level Security blocks

Ensure:
- User role matches policy
- RLS is not too restrictive
- Service role key for writes

### Data not appearing

1. Verify insert succeeded (check function logs)
2. Check data actually in table: `SELECT * FROM table LIMIT 1;`
3. Verify RLS policy allows read access

## Related Documentation

- [COT Scraper](../scrapers/cot-scraper.md)
- [Sentiment Scraper](../scrapers/sentiment-scraper.md)
- [FastBull Scraper](../scrapers/fastbull-scraper.md)
- [Custom Hooks](../components/hooks.md)
