# Sentiment Scraper Implementation

Technical documentation for the MyFxBook sentiment data scraper.

## Overview

The sentiment scraper (`market_sentiment/sentiment_scraper.js`) collects trading community sentiment from MyFxBook every 30 minutes.

**Type:** Automated scraper (Playwright with Cloudflare handling)
**Language:** JavaScript (Node.js)
**Dependencies:** Playwright
**Runtime:** 30-45 seconds per run

## Key Features

### Anti-Bot Detection Handling

MyFxBook uses Cloudflare DDoS protection. The scraper handles this with:

```javascript
const context = await browser.newContext({
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
  viewport: { width: 1280, height: 720 },
});

// Remove webdriver flag
await page.addInitScript(() => {
  Object.defineProperty(navigator, "webdriver", { get: () => false });
});

// Wait for Cloudflare to pass
await page.waitForTimeout(5000);

// Check for challenge page
if (pageTitle.includes("just a moment")) {
  await page.waitForTimeout(10000);
}
```

### Page Navigation

```javascript
const URL = "https://www.myfxbook.com/community/outlook";

console.log(`Navigating to ${URL}...`);
await page.goto(URL, { waitUntil: "networkidle", timeout: 60000 });
```

60-second timeout accounts for Cloudflare delays.

### Ad Dialog Dismissal

```javascript
try {
  const continueBtn = page.locator(
    'button:has-text("Continue to Myfxbook")'
  );
  await continueBtn.waitFor({ state: "visible", timeout: 8000 });
  await continueBtn.click();
  console.log("Dismissed ad dialog");
} catch {
  console.log("No ad dialog found, continuing...");
}
```

## Data Extraction

### HTML Parsing

Targets sentiment table:

```javascript
const rows = document.querySelectorAll("#outlookSymbolsTableContent tr");
const results = [];

rows.forEach((row) => {
  const cells = row.querySelectorAll("td");
  if (cells.length < 6) return;

  // Extract symbol from link
  const symbolLink = cells[0].querySelector("a");
  const symbol = symbolLink ? symbolLink.textContent.trim() : "";

  // Extract sentiment bars
  const dangerBar = cells[1].querySelector(".progress-bar-danger");
  const successBar = cells[1].querySelector(".progress-bar-success");
  const shortPct = dangerBar ? parseFloat(dangerBar.style.width) : 0;
  const longPct = successBar ? parseFloat(successBar.style.width) : 0;

  results.push({ symbol, short_pct: shortPct, long_pct: longPct });
});
```

### Output Format

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
    }
  ]
}
```

## Main Functions

### `scrape()`

Orchestrates the entire process:

```javascript
async function scrape() {
  // 1. Launch browser with anti-bot measures
  const browser = await chromium.launch({
    headless: false,
    args: ["--disable-blink-features=AutomationControlled", "--no-sandbox"],
  });

  // 2. Create context with user agent
  const context = await browser.newContext({ userAgent: "...", ... });
  const page = await context.newPage();

  // 3. Add anti-webdriver script
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
  });

  // 4. Navigate to URL
  await page.goto(URL, { waitUntil: "networkidle", timeout: 60000 });

  // 5. Handle Cloudflare and ad dialogs
  await page.waitForTimeout(5000);
  // ... dismiss ad if present ...

  // 6. Wait for table and extract
  await page.waitForSelector("#outlookSymbolsTableContent tr");
  const data = await page.evaluate(() => { ... });

  // 7. Close browser
  await browser.close();

  return data;
}
```

### `pushToSupabase(output)`

Uploads to Supabase edge function:

```javascript
async function pushToSupabase(output) {
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
}
```

Uses edge function for upsert logic (insert if new, update if exists).

## Error Handling

### Debug Screenshots

On page load failure:

```javascript
try {
  await page.waitForSelector("#outlookSymbolsTableContent tr", {
    state: "attached",
    timeout: 45000,
  });
} catch (err) {
  const screenshotPath = path.join(__dirname, "debug_screenshot.png");
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`Debug screenshot saved to ${screenshotPath}`);
  const bodyText = await page.evaluate(() =>
    document.body.innerText.substring(0, 500)
  );
  console.log(`Page body preview: ${bodyText}`);
  throw err;
}
```

Useful for diagnosing page structure changes.

### Cloudflare Detection

```javascript
const pageTitle = await page.title();
console.log(`Page title: ${pageTitle}`);
if (
  pageTitle.toLowerCase().includes("just a moment") ||
  pageTitle.toLowerCase().includes("attention")
) {
  console.log("Cloudflare challenge detected, waiting longer...");
  await page.waitForTimeout(10000);
}
```

## Configuration

### Constants

```javascript
const URL = "https://www.myfxbook.com/community/outlook";

const SUPABASE_FUNCTION_URL =
  "https://nvvgqvkbooqrdusugmgg.supabase.co/functions/v1/ingest-sentiment";

const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
```

### Browser Options

```javascript
// Important for bypassing detection
{
  headless: false,  // Visible browser (better for bot detection)
  args: [
    "--disable-blink-features=AutomationControlled",
    "--no-sandbox"
  ]
}
```

## Output

### Console Logs

```
Launching browser...
Navigating to https://www.myfxbook.com/community/outlook...
Waiting for Cloudflare to pass...
Page title: Community Outlook - Forex - MyfxBook
Dismissed ad dialog
Waiting for sentiment table...
Extracting sentiment data...
Saved 52 symbols to /market_sentiment/sentiment_data.json
Upserted 52 symbols to Supabase
```

### File Output

Saves to `sentiment_data.json`:

```json
{
  "source": "myfxbook.com",
  "scraped_at": "2025-02-14T14:30:15Z",
  "total_symbols": 52,
  "data": [
    { "symbol": "EUR/USD", "short_pct": 45.2, "long_pct": 54.8 },
    { "symbol": "GBP/USD", "short_pct": 38.5, "long_pct": 61.5 }
  ]
}
```

## Running the Scraper

### Direct Execution

```bash
cd market_sentiment
node sentiment_scraper.js
```

### With GitHub Actions

Scheduled every 30 minutes via cron:

```yaml
on:
  schedule:
    - cron: "0,30 * * * *"  # Every 30 minutes
```

### Testing Locally

```bash
# Run and check output
node sentiment_scraper.js

# View last run
cat sentiment_data.json | jq '.data | length'
```

## Troubleshooting

### Cloudflare blocks access

**Symptoms:** Hangs on page load or returns "just a moment" page

**Solutions:**

1. Increase wait time:
   ```javascript
   await page.waitForTimeout(15000);  // Try 15 seconds
   ```

2. Try with headless: false to let browser display UI

3. Check if IP is blocked:
   ```bash
   curl https://www.myfxbook.com/community/outlook
   ```

### Missing symbols

**Symptoms:** Fewer symbols than expected

**Solutions:**

1. Check if MyFxBook changed table structure
2. Check selector: `#outlookSymbolsTableContent`
3. Verify minimum cell count logic
4. Check debug screenshot if generated

### Page never loads

**Symptoms:** Timeout after 60 seconds

**Solutions:**

1. Check internet connectivity
2. Try with different network (VPN?)
3. Check MyFxBook website directly
4. Try headless: true (sometimes works better)

### Supabase upload fails

**Symptoms:** Data scraped but not pushed

**Solutions:**

1. Check SUPABASE_ANON_KEY is correct
2. Verify edge function exists and is deployed
3. Check function logs in Supabase dashboard
4. Test endpoint manually:
   ```bash
   curl -X POST -H "Authorization: Bearer $KEY" \
     -d '{"data":[]}' \
     $SUPABASE_FUNCTION_URL
   ```

## Performance

- **Page load + Cloudflare wait:** 15-30 seconds
- **Table extraction:** 2-5 seconds
- **Supabase upload:** 1-2 seconds
- **Total time:** 30-45 seconds per run
- **Frequency:** 48 runs per day
- **Data size:** ~5-10 KB per run = ~250 KB per day

## Dependencies

```json
{
  "dependencies": {
    "playwright": "^1.45.0"
  }
}
```

## Related Documentation

- [Market Sentiment Feature](../features/market-sentiment.md)
- [GitHub Actions Workflows](../deployment/github-actions.md)
- [Supabase Integration](../api/supabase.md)
