# Order Book Analysis

FastBull order book and position data visualization for retail trader positioning analysis.

## Overview

The FastBull system collects real-time order book and open position data from retail traders on the FastBull platform. This shows:
- **Pending orders** - Buy vs sell order ratios at different price levels
- **Open positions** - Long vs short position distribution
- **P&L breakdown** - How many positions are profitable vs in loss

## Data Source

### FastBull API

**Endpoint:** `https://api.fastbull.com/fastbull-macro-data-service/`

**Available Endpoints:**
- `getPendingOrderPairList` - List of available trading pairs
- `getWebPendingOrder` - Detailed order book for a pair

**Data Updated:** Real-time (updated with each trade/order)

**Coverage:** 50+ currency pairs and commodities

## Data Collection

### Scraper Process

The FastBull scraper (`market_sentiment/fastbull_scraper.js`) performs:

1. **Fetch pair list** - Get all available instruments
2. **For each pair:**
   - Query pending orders (Type 1)
   - Query open positions (Type 2)
   - Calculate buy/sell percentages
   - Calculate profit/loss percentages
3. **Aggregate results** - Combine all data
4. **Upload** - Send to Supabase
5. **Backup** - Save local JSON copy

**Time:** ~10-15 seconds for all pairs

### API Response Structure

```json
[
  {
    "type": 1,                  // Type 1 = Open Orders
    "currentPrice": "1.0854",
    "buyOrder": ["500.5", "200.3", ...],
    "sellOrder": ["300.2", "150.1", ...]
  },
  {
    "type": 2,                  // Type 2 = Open Positions
    "currentPrice": "1.0854",
    "price": ["1.0800", "1.0850", ...],
    "buyOrder": ["100", "50", ...],     // Long positions
    "sellOrder": ["75", "40", ...]      // Short positions
  }
]
```

## Data Extraction

### Order Book Processing

For **open orders:**

```javascript
const buyTotal = sumArray(orders.buyOrder);
const sellTotal = sumArray(orders.sellOrder);
const total = buyTotal + sellTotal;

buy_pct = (buyTotal / total) * 100;
sell_pct = (sellTotal / total) * 100;
```

Example: If 1000 buy orders and 1500 sell orders:
- buy_pct = 40%
- sell_pct = 60%

### Position Processing

For **open positions:**

Compare each position's entry price with current price:

```javascript
for each position at price P with size S:
  if (buyOrder S > 0):           // Long position
    if (P < currentPrice):
      longProfit += S            // Profitable
    else:
      longLoss += S              // In loss

  if (sellOrder S > 0):          // Short position
    if (P > currentPrice):
      shortProfit += S           // Profitable
    else:
      shortLoss += S             // In loss

// Calculate percentages
long_pct = totalLong / total * 100
long_profit_pct = longProfit / totalLong * 100
long_loss_pct = longLoss / totalLong * 100
```

## Data Structure

### Database Table

```sql
CREATE TABLE fastbull_data (
  id BIGINT PRIMARY KEY,
  source TEXT,                         -- "fastbull.com/order-book"
  scraped_at TIMESTAMP DEFAULT NOW(),
  symbol TEXT,                         -- e.g., "EUR/USD"

  -- Open Orders
  orders_current_price TEXT,
  orders_buy_pct FLOAT,
  orders_sell_pct FLOAT,

  -- Open Positions
  positions_current_price TEXT,
  positions_long_pct FLOAT,
  positions_short_pct FLOAT,
  positions_long_profit_pct FLOAT,
  positions_long_loss_pct FLOAT,
  positions_short_profit_pct FLOAT,
  positions_short_loss_pct FLOAT
);
```

### JSON Backup Format

```json
{
  "source": "fastbull.com/order-book",
  "scraped_at": "2025-02-14T12:45:30.456Z",
  "total_symbols": 52,
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
    // ... more symbols ...
  ]
}
```

## Interpretation

### Order Book Analysis

**Extreme Buy Orders (70%+):**
- Retail traders aggressively buying
- May precede short squeeze
- Watch for entry rejection at resistance

**Extreme Sell Orders (70%+):**
- Retail traders aggressively selling
- May precede reversal higher
- Watch for bounce from support

### Position Analysis

**Long Profitable (80%+):**
- Longs are making money
- Possible top formation
- Risk of profit-taking

**Long in Loss (80%+):**
- Longs are losing money
- Possible capitulation
- Potential reversal point

**Short Profitable (80%+):**
- Shorts are making money
- Downtrend likely intact
- Possible bottom formation

**Short in Loss (80%+):**
- Shorts are losing money
- Uptrend likely intact
- Risk of short squeeze

### Combined Signals

| Scenario | Signal | Action |
|----------|--------|--------|
| 80% buy orders + longs profitable | Retail chase | Caution, watch for reversal |
| 80% sell orders + shorts profitable | Trend down | Confirm with price action |
| 80% buy orders + longs in loss | Weak longs | Possible bounce coming |
| 80% sell orders + shorts in loss | Strong uptrend | Confirm with price action |

## Frontend Integration

### FastBull Dashboard

Display in `GannForce` shows:

1. **Symbol list** - All tracked pairs
2. **Order book section:**
   - Current price
   - Buy % vs sell %
   - Visual bars
3. **Position section:**
   - Long % vs short %
   - Profit % breakdown for each
4. **Summary** - Current state and key metrics

### Component Display

```
FastBull Dashboard
├── Pair 1: EUR/USD
│   ├── Orders: Buy 42.5% | Sell 57.5%
│   ├── Positions: Long 48.2% | Short 51.8%
│   ├── L Profit 35.5% | L Loss 64.5%
│   └── S Profit 42.1% | S Loss 57.9%
├── Pair 2: GBP/USD
│   └── [similar structure]
└── [... more pairs ...]
```

## Automation

### Scheduled Scraping

Runs via GitHub Actions:
- **Frequency:** Every 30 minutes
- **Timeout:** 2 minutes per run
- **Failures:** Logged and retried

### Manual Execution

```bash
cd market_sentiment
node fastbull_scraper.js
```

## Troubleshooting

### API returns error

**Symptoms:** "API error: {message}"

**Solutions:**
1. Check API is accessible: `curl https://api.fastbull.com/...`
2. Verify URL is correct
3. Check API rate limits
4. Retry with backoff

### Missing pairs

**Symptoms:** Some pairs return no data

**Solutions:**
1. Pair may have been delisted
2. Insufficient data/volume
3. API connection timeout
4. Check FastBull website directly

### Data seems stale

**Symptoms:** Prices don't match current market

**Solutions:**
1. FastBull may have delayed data
2. Check time of last scrape
3. Compare with market prices
4. May need to re-run scraper

## Performance

- **Scrape time:** 10-15 seconds
- **Data points:** 50+ pairs × 7 metrics = 350+ data points
- **Storage:** ~20 KB per scrape
- **Update frequency:** Every 30 minutes = 48 updates per day
- **Historical storage:** ~600 KB per day

## Data Quality

### Reliability

**High:**
- FastBull API consistently available
- Real-time order book
- Large sample size (1000s of traders)
- Multiple pairs available

**Limitations:**
- Only FastBull platform (not all retail traders)
- No institutional data
- Possible wash trading or manipulation
- Extreme moves can cause artifacts

### Best Practices

1. **Don't trade on single metric** - Combine with price action
2. **Watch for extremes** - 70%+ is significant
3. **Confirm with volume** - Check trade activity
4. **Monitor changes** - Compare hour-over-hour
5. **Cross-reference** - Use with sentiment and COT data

## Limitations

1. **Platform-biased** - Only FastBull users included
2. **Account size unknown** - Doesn't weight by position size
3. **Possible manipulation** - Can be gamed by large traders
4. **No historical depth** - Only current orders visible
5. **Delayed data** - May be 10-30 seconds behind real-time

## Use Cases

### For Traders

**Contrarian approach:**
- When retail is extreme bullish, prepare for short
- When retail is extreme bearish, prepare for long

**Confirmation approach:**
- When price makes new high, check retail positioning
- If retail is still in loss on longs, uptrend may continue
- If retail is profitable on longs, watch for reversal

### For Risk Management

- Monitor when retail is holding losing positions
- Indicates potential squeeze or capitulation
- Use as part of broader risk framework

## Related Documentation

- [FastBull Scraper Implementation](../scrapers/fastbull-scraper.md)
- [GannForce FastBull Dashboard](gannforce.md#fastbull-dashboard)
- [Market Sentiment Analysis](market-sentiment.md)
- [Combined Dashboard](gannforce.md#combined-dashboard)
