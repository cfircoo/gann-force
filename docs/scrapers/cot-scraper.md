# COT Scraper Implementation

Technical documentation for the Commitment of Traders data scraper.

## Overview

The COT scraper (`cot_report/cot_scraper.js`) is a Node.js script that automatically collects weekly COT data from Tradingster and uploads it to Supabase.

**Type:** Automated scraper (Playwright + Supabase)
**Language:** JavaScript (Node.js)
**Dependencies:** Playwright, Supabase SDK
**Runtime:** ~2-3 minutes for all 40+ instruments

## Architecture

```
Initialize Browser
    ↓
For each asset category:
    ↓
For each instrument in category:
    ├─ Navigate to Tradingster URL
    ├─ Wait for page load
    ├─ Extract table data via JavaScript
    ├─ Parse metrics
    └─ Add to results
    ↓
Save to local JSON backup
    ↓
Create scan metadata in Supabase
    ↓
Batch insert all data
    ↓
Log results
    ↓
Close browser
```

## Code Structure

### Entry Point

```javascript
scrapeAll()
  .then(async (data) => {
    // Save to file
    fs.writeFileSync(outPath, JSON.stringify(data));
    console.log(JSON.stringify(data));

    // Push to Supabase
    await pushToSupabase(data);
  })
  .catch((err) => {
    console.error("Fatal:", err.message);
    process.exit(1);
  });
```

### Main Functions

#### `scrapeAll()`

Main scraping function that orchestrates the entire process.

```javascript
async function scrapeAll() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const results = {};

  // For each asset category and instrument:
  // 1. Navigate to URL
  // 2. Extract data with extractNonCommercial()
  // 3. Save to results
  // 4. Log status

  await browser.close();
  return results;  // { category: CotAsset[] }
}
```

**Returns:** Object with category keys and asset arrays as values

```javascript
{
  "Metals": [
    { code, name, report_date, contract, ... },
    ...
  ],
  "Currencies": [ ... ],
  ...
}
```

#### `extractNonCommercial(page)`

Extracts COT metrics from the Tradingster page using DOM parsing.

```javascript
function extractNonCommercial(page) {
  return page.evaluate(() => {
    // Runs in browser context
    // Parses HTML table
    // Extracts and calculates metrics
    // Returns CotAsset object
  });
}
```

**Browser Evaluation:**

1. **Find table** - `document.querySelector("table")`
2. **Get rows** - `table.querySelectorAll("tr")`
3. **Extract cells** - Row by row from HTML
4. **Parse numbers** - Remove commas, handle nulls
5. **Calculate metrics:**
   - Net position = long - short
   - Unfulfilled calls = net / changesDiff * 100
6. **Return object** with all metrics

**Key Extraction Logic:**

```javascript
const rows = Array.from(table.querySelectorAll("tr"));
const cells = (row) =>
  Array.from(row.querySelectorAll("th, td")).map((c) =>
    c.textContent.trim()
  );

// Row 2: Open Interest
const oiText = cells(rows[2])[1] || "";
const openInterest = parseInt(oiText.replace(/,/g, ""), 10);

// Row 3: Non-commercial positions
const pos = cells(rows[3]);  // [long, short, spreads]

// Row 5: Changes in positions
const chg = cells(rows[5]);  // [long_change, short_change, spreads_change]

// Row 7: Percentages
const pct = cells(rows[7]);  // [long_pct, short_pct, spreads_pct]

// Calculate unfulfilled calls
const net = longPos - shortPos;
const chgDiff = Math.abs(longChg) - Math.abs(shortChg);
const unfulfilledCalls = net / chgDiff * 100;
```

#### `pushToSupabase(results)`

Uploads collected data to Supabase PostgreSQL database.

```javascript
async function pushToSupabase(results) {
  if (!SUPABASE_KEY) {
    console.log("No SUPABASE_SERVICE_ROLE_KEY set, skipping DB push");
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // 1. Insert scan metadata
  const { data: scan, error: scanErr } = await supabase
    .from("cot_scans")
    .insert({
      source: "tradingster.com",
      report_date: reportDate,
    })
    .select("id")
    .single();

  // 2. Build rows array with scan_id
  const rows = [];
  for (const [category, assets] of Object.entries(results)) {
    for (const asset of assets) {
      rows.push({
        scan_id: scan.id,
        category,
        code: asset.code,
        // ... all asset metrics ...
      });
    }
  }

  // 3. Batch insert all data
  const { error: dataErr } = await supabase
    .from("cot_data")
    .insert(rows);

  if (dataErr) {
    console.error("Supabase data insert error:", dataErr);
    return;
  }

  console.log(`Pushed ${rows.length} instruments to Supabase`);
}
```

**Process:**
1. Create Supabase client with service role key
2. Insert scan metadata, get scan ID back
3. Build rows array with all asset data
4. Batch insert all rows in single query
5. Handle errors and log results

### Constants

#### INSTRUMENTS Object

Maps 40+ futures contracts across 8 categories:

```javascript
const INSTRUMENTS = {
  Currencies: [
    { name: "GOLD", code: "088691" },
    { name: "SILVER", code: "084691" },
    // ...
  ],
  Cryptocurrencies: [
    { name: "BITCOIN", code: "133741" },
    // ...
  ],
  // ... 8 categories total
};
```

#### Configuration

```javascript
const BASE_URL = "https://www.tradingster.com/cot/legacy-futures";

const SUPABASE_URL = process.env.SUPABASE_URL ||
  "https://nvvgqvkbooqrdusugmgg.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
```

## Error Handling

### Graceful Degradation

If one instrument fails, scraper continues with others:

```javascript
try {
  const data = await extractNonCommercial(page);
  if (data) {
    results[category].push({ code: instrument.code, ...data });
    process.stderr.write(`OK: [${category}] ${instrument.name}\n`);
  } else {
    process.stderr.write(`SKIP (no table): [${category}] ${instrument.name}\n`);
  }
} catch (err) {
  process.stderr.write(
    `ERR: [${category}] ${instrument.name} - ${err.message}\n`
  );
}
```

**Status codes:**
- `OK` - Successfully scraped and parsed
- `SKIP` - Page loaded but no COT table found
- `ERR` - Network or parsing error

### Exit Codes

```javascript
// Success: exit 0
// Failure: exit 1
if (error) process.exit(1);
```

## Browser Configuration

### Playwright Launch Options

```javascript
const browser = await chromium.launch({
  headless: true  // Run without UI
});

const page = await browser.newPage();

// Timeouts
await page.goto(url, {
  waitUntil: "networkidle",  // Wait for network idle
  timeout: 15000              // 15 second page load timeout
});
```

### Page Waits

```javascript
// Wait for network to be idle (all resources loaded)
waitUntil: "networkidle"

// Wait for specific selector before parsing
await page.waitForSelector("table", { timeout: 10000 });
```

## Data Output

### Console Output

Logs to stdout (for GitHub Actions capture):

```
OK: [Metals] GOLD
OK: [Metals] SILVER
SKIP (no table): [Currencies] RARE_PAIR
ERR: [Currencies] COMMON_PAIR - Timeout
```

### JSON Output

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
      "non_commercial": { "long": 123456, "short": 98765, ... },
      "changes": { "long": 5000, "short": 3000, ... },
      "pct_of_open_interest": { "long": 27.0, "short": 21.6, ... },
      "unfulfilled_calls": 123.45
    }
  ]
}
```

### Supabase Storage

Two tables:

**cot_scans** (metadata):
```
id | source | report_date | scraped_at
```

**cot_data** (individual assets):
```
id | scan_id | category | code | name | report_date | contract |
open_interest | nc_long | nc_short | nc_spreads | nc_net |
chg_long | chg_short | chg_spreads | pct_long | pct_short | pct_spreads |
unfulfilled_calls
```

## Configuration via Environment

### Required Environment Variables

```bash
# For Supabase upload
SUPABASE_URL=https://nvvgqvkbooqrdusugmgg.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
```

### Optional Overrides

```bash
# Override default Supabase URL
SUPABASE_URL=https://custom-project.supabase.co
```

### Without Supabase

If `SUPABASE_SERVICE_ROLE_KEY` is not set:
- Scraper still runs
- Data saved to local JSON
- Upload is skipped
- Useful for local testing

## Running the Scraper

### Direct Execution

```bash
cd cot_report
node cot_scraper.js
```

Output:
- Logs to console (status messages)
- Saves to `cot_data.json` (local backup)
- Uploads to Supabase (if key is set)

### With GitHub Actions

```yaml
- name: Run COT Scraper
  run: |
    cd cot_report
    node cot_scraper.js
  env:
    SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```

### Docker Execution

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY cot_report ./
RUN npm install
CMD ["node", "cot_scraper.js"]
```

## Performance Optimization

### Current Bottlenecks

1. **Tradingster page load** - Most of the 2-3 minute runtime
2. **Network latency** - Depends on internet connection
3. **Browser startup** - ~5-10 seconds

### Optimization Opportunities

1. **Parallel requests** - Open multiple pages in same browser:
   ```javascript
   const promises = instruments.map(instr =>
     page.goto(url).then(extractData)
   );
   await Promise.all(promises);
   ```

2. **Connection pooling** - Reuse browser context

3. **Caching** - Skip if data already scraped today

4. **Batch updates** - Already implemented (single insert query)

## Testing

### Manual Test

```bash
# Test scraper without Supabase upload
SUPABASE_SERVICE_ROLE_KEY="" node cot_scraper.js

# Check output
cat cot_data.json | jq '.Metals[0]'
```

### Unit Tests (if added)

Would test:
- `extractNonCommercial()` with mock HTML
- `pushToSupabase()` with mock Supabase client
- Error handling and edge cases

## Monitoring

### GitHub Actions Logs

View scraper output:
1. Go to Actions tab
2. Click "Scrape COT" workflow
3. Click latest run
4. View logs for any errors

### Supabase Logs

View database errors:
1. Go to Supabase dashboard
2. Check error logs or query activity
3. Verify data was inserted

### Local Monitoring

Check backup file:
```bash
ls -lh cot_report/cot_data.json
tail cot_report/cot_data.json
```

## Troubleshooting

### Scraper hangs

**Symptoms:** Runs but doesn't complete in 5 minutes

**Causes:**
- Tradingster slow or unresponsive
- Network connectivity issues
- Browser process hung

**Solutions:**
```javascript
// Add timeout to page.goto
await page.goto(url, {
  waitUntil: "load",  // Changed from networkidle
  timeout: 10000      // Reduced from 15000
});
```

### Parsing fails

**Symptoms:** All instruments return "no table"

**Causes:**
- Tradingster changed page structure
- JavaScript didn't execute properly
- Table selector changed

**Solutions:**
```javascript
// Debug: capture page content
const content = await page.content();
console.log(content);  // Check HTML structure
```

### Supabase upload fails

**Symptoms:** Data scraped but not uploaded

**Causes:**
- Invalid API key
- Network connectivity
- Table/schema mismatch

**Solutions:**
```bash
# Test connection
curl -H "Authorization: Bearer $KEY" \
  $SUPABASE_URL/rest/v1/cot_scans?limit=1

# Check table structure
psql $SUPABASE_URL -c "\d cot_data"
```

## Security

### API Keys

- `SUPABASE_SERVICE_ROLE_KEY` has full write access
- Never log or output this key
- Store in GitHub Secrets, not in code
- Rotate periodically

### Data Privacy

- COT data is public (from CFTC)
- Supabase RLS can restrict access
- All connections use HTTPS

## Dependencies

```json
{
  "dependencies": {
    "playwright": "^1.x",
    "@supabase/supabase-js": "^2.x"
  }
}
```

Install with:
```bash
npm install
```

## Related Documentation

- [COT Reporting Feature](../features/cot-reporting.md)
- [Architecture Overview](../architecture.md)
- [GitHub Actions Workflow](../deployment/github-actions.md)
