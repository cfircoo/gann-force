# Market Sentiment

Community sentiment tracking from multiple market data sources.

## Overview

The sentiment system collects real-time trading community sentiment from MyFxBook, showing the collective bullish/bearish bias for 50+ currency pairs and major indices. This crowdsourced data reflects retail and institutional trader positioning.

## Data Source

### MyFxBook Community Outlook

**Website:** https://www.myfxbook.com/community/outlook

**Frequency:** Scraped every 30 minutes

**Data Points:** 50+ trading pairs (primarily FX)

**What it shows:**
- Community members' long vs short sentiment
- Percentage of traders bullish (green) vs bearish (red)
- Real-time aggregation of retail trader positioning

## Data Collection

### Scraper Process

The sentiment scraper (`market_sentiment/sentiment_scraper.js`) performs:

1. **Browser automation** - Playwright with anti-bot detection handling
2. **Page load** - Waits for sentiment table (networkidle mode)
3. **Cloudflare handling** - Waits additional time for CF challenge
4. **Dialog dismissal** - Closes ad popup if present
5. **Table extraction** - Queries DOM for sentiment rows
6. **Data parsing** - Extracts symbol, long %, short %
7. **Upload** - Sends to Supabase edge function
8. **Backup** - Saves local JSON copy

**Time:** ~30-45 seconds per run

### Anti-Bot Measures Handled

MyFxBook uses Cloudflare DDoS protection:

```javascript
// User agent spoofing
userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36..."

// Viewport setting
viewport: { width: 1280, height: 720 }

// Remove webdriver flag
Object.defineProperty(navigator, "webdriver", { get: () => false })

// Cloudflare wait
await page.waitForTimeout(5000)
```

## Data Extraction

### HTML Parsing

Extracts sentiment from table rows:

```html
<table id="outlookSymbolsTableContent">
  <tr>
    <td>
      <a href="...">EUR/USD</a>  <!-- Symbol -->
    </td>
    <td>
      <!-- Sentiment bars -->
      <div class="progress">
        <div class="progress-bar-danger" style="width: 45%"></div>
        <div class="progress-bar-success" style="width: 55%"></div>
      </div>
    </td>
    <!-- ... more columns ... -->
  </tr>
</table>
```

Extracts:
- **Symbol** - From link text (e.g., "EUR/USD")
- **Short %** - From danger (red) bar width
- **Long %** - From success (green) bar width

## Data Structure

### Database Table

```sql
CREATE TABLE sentiment_data (
  id BIGINT PRIMARY KEY,
  source TEXT,                    -- "myfxbook.com"
  scraped_at TIMESTAMP DEFAULT NOW(),
  symbol TEXT,                    -- e.g., "EUR/USD"
  short_pct FLOAT,               -- Short sentiment %
  long_pct FLOAT                 -- Long sentiment %
);
```

### JSON Backup Format

```json
{
  "source": "myfxbook.com",
  "scraped_at": "2025-02-14T12:30:45.123Z",
  "total_symbols": 52,
  "data": [
    {
      "symbol": "EUR/USD",
      "short_pct": 45.2,
      "long_pct": 54.8
    },
    {
      "symbol": "GBP/USD",
      "short_pct": 38.5,
      "long_pct": 61.5
    }
    // ... 50+ more symbols ...
  ]
}
```

## Interpretation

### Sentiment Extremes

**Extreme Bullish (75%+ long):**
- Retail traders very bullish
- Potential for profit-taking/reversal
- Use as contrarian indicator

**Extreme Bearish (75%+ short):**
- Retail traders very bearish
- Potential for squeeze/reversal higher
- Use as contrarian indicator

**Neutral (45-55% each way):**
- Balanced positioning
- Less extreme risk

### Usage Patterns

**Contrarian Strategy:**
- When sentiment is extremely bullish, consider short trades
- When sentiment is extremely bearish, consider long trades
- Retail traders are often "wrong" at turning points

**Confirmation:**
- Use alongside COT data for institutional positioning
- When both retail (sentiment) and institutions (COT) align = stronger signal
- When they diverge = potential reversal point

### Example Signals

```
EUR/USD
- Sentiment: 75% long, 25% short (extreme bullish)
- COT: Non-commercial net position very long
- Signal: DOUBLE TOP RISK - Both retail and institutions extremely bullish

USD/JPY
- Sentiment: 25% long, 75% short (extreme bearish)
- COT: Non-commercial net position very short
- Signal: BOTH SHORT - Strong momentum confirmation
```

## Frontend Integration

### Sentiment Dashboard

Display in `GannForce` shows:

1. **Symbol list** - All tracked pairs
2. **Sentiment bars:**
   - Red (left) = short %
   - Green (right) = long %
3. **Real-time updates** - Latest data timestamp
4. **Color intensity:**
   - Brighter = more extreme
   - Muted = more neutral

### Component Structure

```
SentimentDashboard
├── Data timestamp
├── For each symbol:
│   └── SentimentRow
│       ├── Symbol name
│       ├── Short % bar
│       └── Long % bar
└── Legend (colors, interpretation)
```

### SentimentRow Component

```tsx
<SentimentRow
  symbol="EUR/USD"
  longPct={54.8}
  shortPct={45.2}
/>

// Renders:
// EUR/USD [=== 45.2% ==|========== 54.8% ==========]
```

## Automation

### Scheduled Scraping

Runs via GitHub Actions:
- **Frequency:** Every 30 minutes (`:00` and `:30`)
- **Trigger:** Scheduled cron job
- **Timeout:** 2 minutes per run

### Configuration

```yaml
on:
  schedule:
    - cron: "0,30 * * * *"  # Every 30 minutes
```

### Manual Execution

```bash
cd market_sentiment
node sentiment_scraper.js
```

## Troubleshooting

### Cloudflare blocks requests

**Symptoms:** Scraper hangs or gets "just a moment" page

**Solutions:**
1. Browser may be blocked after repeated requests
2. Try increasing wait times:
   ```javascript
   await page.waitForTimeout(10000)  // 10 seconds
   ```
3. Change user agent
4. Add random delay between requests

### Sentiment data incomplete

**Symptoms:** Some symbols missing, empty data

**Solutions:**
1. Check HTML structure hasn't changed on MyFxBook
2. Verify selector matches: `#outlookSymbolsTableContent tr`
3. Test page load in browser manually
4. Check debug screenshot if generated

### Page title detection fails

**Symptoms:** "Just a moment" detection error

**Solution:** Adjust timeout and retry logic:

```javascript
try {
  await page.waitForSelector("#outlookSymbolsTableContent tr", {
    timeout: 45000
  });
} catch (err) {
  // Longer wait or retry
}
```

## Performance

- **Scrape time:** 30-45 seconds per run
- **Data points:** 50+ symbols × 2 metrics = 100+ data points
- **Storage:** ~5-10 KB per scrape
- **Update frequency:** Every 30 minutes = 48 updates per day
- **Historical data:** Growing ~500 KB per day

## Data Quality

### Reliability

**High:**
- MyFxBook consistently available
- Data structure stable
- Large sample size (10k+ traders)

**Limitations:**
- Biased toward retail traders (institutions use other platforms)
- Volume-weighted (more traders = more influence)
- May lag during market volatility
- Extreme moves can cause data artifacts

### Best Practices

1. **Combine with institutional data** - Use COT for comparison
2. **Monitor for extremes** - Interpret as contrarian indicator
3. **Cross-reference sources** - Check multiple platforms
4. **Ignore single spikes** - Wait for confirmation
5. **Track changes** - Compare to previous hour/day

## Limitations

1. **Retail-biased** - Doesn't reflect institutional positioning
2. **No time weighting** - All votes equal regardless of account size
3. **Possible manipulation** - Large accounts can create fake positions
4. **No order size data** - Only counts, not position sizes
5. **Snapshot** - No historical intraday changes

## Related Documentation

- [Sentiment Scraper Implementation](../scrapers/sentiment-scraper.md)
- [GannForce Sentiment Dashboard](gannforce.md#sentiment-dashboard)
- [COT Data Analysis](cot-reporting.md#analysis)
- [Combined Dashboard](gannforce.md#combined-dashboard)
