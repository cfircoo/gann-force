# FastBull Scraper Implementation

Technical documentation for the FastBull order book and position data scraper.

## Overview

The FastBull scraper (`market_sentiment/fastbull_scraper.js`) collects order book and position data from the FastBull API.

**Type:** API-based scraper
**Language:** JavaScript (Node.js)
**Dependencies:** None (native fetch)
**Runtime:** 10-15 seconds for 50+ pairs

## Architecture

```
Fetch pair list from API
    ↓
For each pair:
    ├─ Fetch pending orders (Type 1)
    ├─ Fetch open positions (Type 2)
    ├─ Calculate buy/sell percentages
    ├─ Calculate profit/loss percentages
    └─ Add to results
    ↓
Save to local JSON backup
    ↓
Upload to Supabase edge function
    ↓
Log results and close
```

## API Endpoints

### Get Pair List

**URL:** `https://api.fastbull.com/fastbull-macro-data-service/api/getPendingOrderPairList?`

**Response:**
```json
{
  "code": 0,
  "message": "success",
  "bodyMessage": "[{\"pairId\": 1, \"symbol\": \"EUR/USD\"}, ...]"
}
```

### Get Order Book & Positions

**URL:** `https://api.fastbull.com/fastbull-macro-data-service/api/getWebPendingOrder`

**Parameters:**
- `orderType` - 0 (all orders)
- `pairId` - Pair ID from list
- `selectTime` - Empty string (current)

**Response:**
```json
{
  "code": 0,
  "message": "success",
  "bodyMessage": "[
    {
      \"type\": 1,
      \"currentPrice\": \"1.0854\",
      \"buyOrder\": [\"500.5\", \"200.3\"],
      \"sellOrder\": [\"300.2\", \"150.1\"]
    },
    {
      \"type\": 2,
      \"currentPrice\": \"1.0854\",
      \"price\": [\"1.0800\", \"1.0850\"],
      \"buyOrder\": [\"100\", \"50\"],
      \"sellOrder\": [\"75\", \"40\"]
    }
  ]"
}
```

**Types:**
- Type 1 = Open Orders (pending orders at different prices)
- Type 2 = Open Positions (existing positions)

## Code Structure

### Entry Point

```javascript
scrape()
  .then((output) => {
    // Save to file
    fs.writeFileSync(path.join(__dirname, "fastbull_orderbook.json"),
      JSON.stringify(output, null, 2)
    );

    // Push to Supabase
    await pushToSupabase(output);
  })
  .catch((err) => {
    console.error("Scrape failed:", err);
    process.exit(1);
  });
```

### Main Functions

#### `fetchJSON(url)`

Wrapper for API calls:

```javascript
async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} returned ${res.status}`);
  const json = await res.json();
  if (json.code !== 0) throw new Error(`API error: ${json.message}`);
  return JSON.parse(json.bodyMessage);
}
```

Handles:
- HTTP errors
- API error codes
- JSON parsing
- Response format (bodyMessage is JSON string, needs parsing)

#### `scrape()`

Main data collection:

```javascript
async function scrape() {
  console.log("Fetching FastBull order book data...");

  // 1. Get list of available pairs
  const pairs = await fetchJSON(PAIR_LIST_API);
  console.log(`Found ${pairs.length} pairs`);

  const data = [];

  // 2. For each pair, fetch order/position data
  for (const pair of pairs) {
    try {
      const url = `${ORDER_BOOK_API}?orderType=0&pairId=${pair.pairId}&selectTime=`;
      const items = await fetchJSON(url);

      const orders = items.find((i) => i.type === 1);
      const positions = items.find((i) => i.type === 2);

      const entry = { symbol: pair.symbol };

      // Calculate order percentages
      if (orders) {
        const buyTotal = sumArray(orders.buyOrder);
        const sellTotal = sumArray(orders.sellOrder);
        const total = buyTotal + sellTotal;
        entry.orders = {
          currentPrice: orders.currentPrice,
          buy_pct: total > 0 ? (buyTotal / total) * 100 : 0,
          sell_pct: total > 0 ? (sellTotal / total) * 100 : 0,
        };
      }

      // Calculate position percentages
      if (positions) {
        const cp = parseFloat(positions.currentPrice);
        let longProfit = 0, longLoss = 0, shortProfit = 0, shortLoss = 0;

        for (let i = 0; i < positions.price.length; i++) {
          const price = parseFloat(positions.price[i]);
          const buyVal = parseFloat(positions.buyOrder[i]);
          const sellVal = parseFloat(positions.sellOrder[i]);

          // Long: profit if current > entry
          if (buyVal > 0) {
            if (price < cp) longProfit += buyVal;
            else longLoss += buyVal;
          }

          // Short: profit if current < entry
          if (sellVal > 0) {
            if (price > cp) shortProfit += sellVal;
            else shortLoss += sellVal;
          }
        }

        const totalLong = longProfit + longLoss;
        const totalShort = shortProfit + shortLoss;
        const total = totalLong + totalShort;
        const pct = (v, t) => (t > 0 ? (v / t) * 100 : 0);

        entry.positions = {
          currentPrice: positions.currentPrice,
          long_pct: pct(totalLong, total),
          short_pct: pct(totalShort, total),
          long_profit_pct: pct(longProfit, totalLong),
          long_loss_pct: pct(longLoss, totalLong),
          short_profit_pct: pct(shortProfit, totalShort),
          short_loss_pct: pct(shortLoss, totalShort),
        };
      }

      data.push(entry);
      console.log(
        `  ${pair.symbol}: Orders[B ${entry.orders?.buy_pct}% S ${entry.orders?.sell_pct}%] ` +
        `Positions[L ${entry.positions?.long_pct}% (${entry.positions?.long_profit_pct}% profit)]`
      );
    } catch (err) {
      console.error(`  ${pair.symbol}: failed - ${err.message}`);
    }
  }

  // 3. Return aggregated data
  const output = {
    source: "fastbull.com/order-book",
    scraped_at: new Date().toISOString(),
    total_symbols: data.length,
    data,
  };

  return output;
}
```

#### `pushToSupabase(output)`

Uploads to Supabase edge function:

```javascript
async function pushToSupabase(output) {
  try {
    const res = await fetch(SUPABASE_FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(output),
    });

    const result = await res.json();
    if (result.ok) {
      console.log(`Upserted ${result.symbols} symbols to Supabase`);
    } else {
      console.error("Supabase push failed:", result.error);
    }
  } catch (err) {
    console.error("Supabase push error:", err.message);
  }
}
```

### Helper Functions

#### `sumArray(arr)`

Sum numeric strings:

```javascript
const sumArray = (arr) =>
  arr.reduce((s, v) => s + parseFloat(v), 0);
```

Example: `["100.5", "50.25"]` → `150.75`

## Data Processing

### Order Percentage Calculation

```javascript
const buyTotal = sumArray(orders.buyOrder);      // Total buy volume
const sellTotal = sumArray(orders.sellOrder);    // Total sell volume
const total = buyTotal + sellTotal;               // Combined volume

buy_pct = (buyTotal / total) * 100;              // Buy percentage
sell_pct = (sellTotal / total) * 100;            // Sell percentage
```

Example:
- Buy orders: 1000 contracts
- Sell orders: 1500 contracts
- Total: 2500
- buy_pct: 40%
- sell_pct: 60%

### Position Profit/Loss Calculation

For each position entry (price level):

1. If buy order > 0 (long position):
   - If entry price < current price → PROFIT
   - If entry price > current price → LOSS

2. If sell order > 0 (short position):
   - If entry price > current price → PROFIT
   - If entry price < current price → LOSS

Then aggregate:
- Total long = longProfit + longLoss
- Long profit % = (longProfit / totalLong) × 100
- Long loss % = (longLoss / totalLong) × 100

## Output Format

### Console Output

```
Fetching FastBull order book data...
Found 52 pairs
  EUR/USD: Orders[B 42.5% S 57.5%] Positions[L 48.2% (35.5% profit)]
  GBP/USD: Orders[B 38.3% S 61.7%] Positions[L 45.1% (28.7% profit)]
  ...
Scraped 52 pairs
```

### JSON Backup

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
  ]
}
```

## Configuration

### Constants

```javascript
const PAIR_LIST_API =
  "https://api.fastbull.com/fastbull-macro-data-service/api/getPendingOrderPairList?";

const ORDER_BOOK_API =
  "https://api.fastbull.com/fastbull-macro-data-service/api/getWebPendingOrder";

const SUPABASE_FUNCTION_URL =
  "https://nvvgqvkbooqrdusugmgg.supabase.co/functions/v1/ingest-fastbull";

const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIs...";
```

## Error Handling

### Graceful Degradation

If one pair fails, scraper continues:

```javascript
try {
  const items = await fetchJSON(url);
  // ... process items ...
  data.push(entry);
  console.log(`  ${pair.symbol}: OK`);
} catch (err) {
  console.error(`  ${pair.symbol}: failed - ${err.message}`);
  // Continue to next pair
}
```

### Network Errors

- HTTP errors logged
- API errors logged
- Supabase errors logged
- Script continues unless fetch fails completely

## Running the Scraper

### Direct Execution

```bash
cd market_sentiment
node fastbull_scraper.js
```

### Testing

```bash
# Check output
cat fastbull_orderbook.json | jq '.total_symbols'

# Check specific pair
cat fastbull_orderbook.json | jq '.data[] | select(.symbol=="EUR/USD")'
```

## Performance

- **API calls:** 2 + (number of pairs)
  - 1 for pair list
  - 1 per pair for orders/positions
  - ~52 pairs = 53 total API calls

- **Speed:** 10-15 seconds total
  - ~150-250 ms per API call average
  - ~5% overhead for processing

- **Data volume:**
  - ~20 KB per scrape
  - 48 updates per day
  - ~1 MB per day

## Limitations

1. **No authentication** - Uses anonymous API (might be rate limited)
2. **Real-time delay** - Data may be 10-30 seconds behind
3. **Limited history** - Only current orders/positions visible
4. **Symbol coverage** - Only pairs available on FastBull

## Related Documentation

- [Order Book Feature](../features/order-book.md)
- [Market Sentiment Scraper](sentiment-scraper.md)
- [GitHub Actions Workflows](../deployment/github-actions.md)
