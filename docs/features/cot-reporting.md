# COT Reporting

Commitment of Traders (COT) data collection, processing, and analysis system.

## Overview

The COT system automatically collects weekly commitment of traders reports for 40+ futures instruments across 9 asset categories. This data tracks the positioning of commercial and non-commercial traders, providing insights into market structure and potential reversals.

## What is COT Data?

COT reports are published weekly by the CFTC (Commodity Futures Trading Commission) and show:

1. **Non-commercial positions:** Hedge funds, large speculators, trend-following funds
2. **Commercial positions:** Producers, consumers, hedgers in the underlying commodity
3. **Small traders:** Retail and small institutional traders

## Data Collection

### Source

**Website:** Tradingster.com (provides formatted COT data)
**URL:** `https://www.tradingster.com/cot/legacy-futures/{instrument_code}`

### Instruments Tracked

8 main categories with 40+ instruments:

#### 1. Currencies (10)
- Australian Dollar, British Pound, Canadian Dollar
- Euro FX, Japanese Yen, Swiss Franc
- U.S. Dollar Index, Mexican Peso
- New Zealand Dollar, Brazilian Real, South African Rand

#### 2. Cryptocurrencies (4)
- Bitcoin, Micro Bitcoin
- Ether Cash Settled, Micro Ether

#### 3. Indexes (7)
- S&P 500 Stock Index
- Nasdaq-100 Stock Index (MINI)
- Dow Jones Industrial Avg x $5
- Russell 2000 MINI
- E-MINI S&P 400, E-MINI S&P 500
- VIX Futures

#### 4. Treasuries & Rates (4)
- 30-day Federal Funds
- UST 2Y Note, UST 5Y Note, UST 10Y Note

#### 5. Energies (4)
- Crude Oil (Light Sweet)
- Gasoline Blendstock (RBOB)
- Heating Oil (NY Harbor-ULSD)
- Natural Gas

#### 6. Grains (9)
- Corn, Soybeans, Soybean Oil, Soybean Meal
- Wheat-SRW, Wheat-HRW, Wheat-HRSpring
- Rough Rice, Canola

#### 7. Livestock & Dairy (7)
- Live Cattle, Feeder Cattle, Lean Hogs
- Milk (Class III), Non Fat Dry Milk
- Butter (Cash Settled), Cheese (Cash-Settled)

#### 8. Metals (6)
- Gold, Silver, Copper
- Palladium, Platinum, Aluminum MWP

#### 9. Softs (6)
- Cocoa, Cotton No. 2, Coffee C
- Sugar No. 11, Frozen Concentrated Orange Juice
- Random Length Lumber

### Scraper Process

The COT scraper (`cot_report/cot_scraper.js`) runs:
- **Scheduled:** Every Friday at 17:00 UTC (after CFTC release)
- **Manual:** Via GitHub Actions workflow with optional force flag

**Process:**
1. Launch headless Chromium browser
2. For each instrument:
   - Navigate to Tradingster URL
   - Wait for page load (networkidle)
   - Execute JavaScript to extract table data
   - Parse non-commercial positions, changes, percentages
3. Save to local JSON backup
4. Upload all data to Supabase in batch

**Time:** ~2-3 minutes for all 40+ instruments

## Data Extraction

### Table Parsing

The scraper extracts from HTML table structure:

```
Row 0: Headers
Row 1: (skip)
Row 2: Open Interest (contracts)
Row 3: Non-commercial positions (long, short, spreads)
Row 4: Change in open interest
Row 5: Changes in positions (long, short, spreads)
Row 6: (skip)
Row 7: Percentage of open interest (long, short, spreads)
```

### Key Metrics

#### Non-Commercial Net Position
```
Net = Non-commercial Long - Non-commercial Short
```
Positive = net long bias, Negative = net short bias

#### Unfulfilled Calls
```
Net Position = NC Long - NC Short
Change Difference = |Change Long| - |Change Short|
Unfulfilled Calls = (Net / Change Difference) * 100
```

When traders increase position size relative to actual price moves, unfulfilled calls increase. This metric helps identify potential reversals when moves are too large relative to new positioning.

Example: If net position is 10,000 but actual net change is only 2,000, many trades haven't moved yet (unfulfilled).

#### Percentage of Open Interest
Shows what % of total open contracts are held by non-commercial traders:
- High % = major positioning
- Low % = less influential positioning

## Data Structure

### Database Tables

#### cot_scans
Metadata for each scraping session:

```sql
CREATE TABLE cot_scans (
  id BIGINT PRIMARY KEY,
  source TEXT,                    -- "tradingster.com"
  report_date DATE,               -- CFTC report date (YYYY-MM-DD)
  scraped_at TIMESTAMP DEFAULT NOW()
);
```

#### cot_data
Individual asset data:

```sql
CREATE TABLE cot_data (
  id BIGINT PRIMARY KEY,
  scan_id BIGINT REFERENCES cot_scans(id),

  category TEXT,                  -- e.g., "Currencies", "Metals"
  code TEXT,                       -- e.g., "088691" for Gold
  name TEXT,                       -- e.g., "GOLD"

  report_date DATE,              -- When report was published
  contract TEXT,                 -- e.g., "GC=F"
  contract_unit TEXT,            -- e.g., "(USD per troy ounce)"

  open_interest BIGINT,
  change_in_open_interest BIGINT,

  -- Non-commercial positions (contracts)
  nc_long BIGINT,
  nc_short BIGINT,
  nc_spreads BIGINT,
  nc_net BIGINT,

  -- Changes from previous report
  chg_long BIGINT,
  chg_short BIGINT,
  chg_spreads BIGINT,

  -- Percentage of total open interest
  pct_long FLOAT,
  pct_short FLOAT,
  pct_spreads FLOAT,

  -- Calculated metric
  unfulfilled_calls FLOAT
);
```

### JSON Backup Format

```json
{
  "Metals": [
    {
      "code": "088691",
      "name": "GOLD",
      "report_date": "2025-02-14",
      "contract": "GC=F",
      "contract_unit": "(USD per troy ounce)",
      "open_interest": 456789,
      "change_in_open_interest": 1234,
      "non_commercial": {
        "long": 123456,
        "short": 98765,
        "spreads": 12345,
        "net": 24691
      },
      "changes": {
        "long": 5000,
        "short": 3000,
        "spreads": 500
      },
      "pct_of_open_interest": {
        "long": 27.0,
        "short": 21.6,
        "spreads": 2.7
      },
      "unfulfilled_calls": 123.45
    }
  ]
}
```

## Analysis

### Interpreting COT Data

**Net Position Extremes:**
- Extreme long positioning = potential top (reversal risk)
- Extreme short positioning = potential bottom (reversal risk)

**Change Momentum:**
- Increasing long positions = bullish momentum
- Decreasing short positions = bullish momentum
- Both together = strongest signal

**Unfulfilled Calls Analysis:**
- High unfulfilled calls = large positions haven't been realized
- Potential for accelerated moves in either direction
- Combined with net position extremes = strong reversal signal

### Example Signal

```
Gold Status:
- Net Position: Extremely long (top percentile)
- Changes: Long positions increasing
- Unfulfilled Calls: High (500+)

Interpretation:
- Speculators very bullish on gold
- Still adding to long positions
- Many trades not yet profitable
- Risk of sharp reversal lower
```

## Frontend Integration

### COT Dashboard

Display in `GannForce` shows:
1. **Report date** - When data is from
2. **Categories** - Organized by asset class
3. **Individual assets** - With all metrics
4. **Color coding:**
   - Red = short bias or extreme short positioning
   - Green = long bias or extreme long positioning
   - Gray = neutral positioning

### Component Structure

```
CotDashboard
├── Report date display
└── For each category:
    ├── CategorySection
    └── For each asset:
        └── AssetBox
            ├── Position metrics
            ├── Change metrics
            ├── Percentage metrics
            └── Unfulfilled calls
```

## Automation

### GitHub Actions Workflow

File: `.github/workflows/scrape-cot.yml`

```yaml
name: Scrape COT
on:
  schedule:
    - cron: "0 17 * * 5"  # Friday 17:00 UTC
  workflow_dispatch:
    inputs:
      force:
        description: "Force re-scrape"
        required: false
        default: "false"
        type: choice
        options:
          - "false"
          - "true"
```

Calls Supabase edge function `scrape-cot` with optional force flag.

### Manual Trigger

```bash
# GitHub CLI
gh workflow run scrape-cot.yml --ref master -f force=true

# Or via GitHub UI
- Go to Actions tab
- Click "Scrape COT"
- Click "Run workflow"
- Select "true" for force if needed
```

## Troubleshooting

### Scraper hangs or fails

**Issue:** Browser doesn't load page or JavaScript fails

**Solutions:**
1. Check Tradingster.com is accessible
2. Verify network connectivity
3. Check page structure hasn't changed
4. Review browser console logs

### Missing instruments

**Issue:** Some instruments return "no table"

**Solutions:**
1. Not all instruments have COT data (rarer pairs)
2. May be temporarily unavailable
3. Check Tradingster.com directly

### Supabase upload fails

**Issue:** Error inserting data to database

**Solutions:**
1. Verify `SUPABASE_SERVICE_ROLE_KEY` is correct
2. Check Supabase project is accessible
3. Verify tables exist and have correct schema
4. Check user has INSERT permission on cot_data table

### Duplicate data

**Issue:** Running scraper multiple times creates duplicates

**Solutions:**
1. Use `force=true` flag only when needed
2. Check for existing data before re-scraping
3. Consider upsert logic in backend

## Performance

- **Scrape time:** 2-3 minutes for all instruments
- **Data points:** 40+ instruments × 11 metrics = 440+ data points per scan
- **Storage:** ~1 MB per weekly scan
- **Upload time:** <30 seconds to Supabase

## Best Practices

1. **Run after CFTC release** - Fridays at 17:00 UTC
2. **Monitor workflow runs** - Check GitHub Actions for failures
3. **Keep backup JSONs** - Local backups useful for debugging
4. **Archive historical data** - Keep weekly records for analysis
5. **Cross-reference sources** - Compare with other COT providers

## Related Documentation

- [COT Scraper Implementation](../scrapers/cot-scraper.md)
- [GannForce COT Dashboard](gannforce.md#cot-dashboard)
- [Data API Integration](../api/supabase.md)
- [GitHub Actions Workflow](../deployment/github-actions.md)
