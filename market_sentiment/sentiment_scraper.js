const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const URL = "https://www.myfxbook.com/community/outlook";

const SUPABASE_FUNCTION_URL =
  "https://nvvgqvkbooqrdusugmgg.supabase.co/functions/v1/ingest-sentiment";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im52dmdxdmtib29xcmR1c3VnbWdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3NDkzNjUsImV4cCI6MjA4NjMyNTM2NX0.SafREKWntFMmJv720S3RpSo4z03cvXpn2y1DgefNZzY";

// ProxyJet residential proxy
const PROXY_SERVER = process.env.PROXY_SERVER || "http://eu.proxy-jet.io:1010";
const PROXY_USER = process.env.PROXY_USER || "260211Nk1Na-resi_region-DE_Hamburg_Hamburg";
const PROXY_PASS = process.env.PROXY_PASS || "IYOsUL4PJAq7634";

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

async function scrape() {
  console.log("Launching browser with residential proxy...");

  const browser = await chromium.launch({
    headless: true,
    proxy: {
      server: PROXY_SERVER,
      username: PROXY_USER,
      password: PROXY_PASS,
    },
    args: [
      "--disable-blink-features=AutomationControlled",
      "--no-sandbox",
      "--disable-dev-shm-usage",
    ],
  });

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 720 },
  });

  const page = await context.newPage();

  await page.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
    Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, "languages", { get: () => ["en-US", "en"] });
    window.chrome = { runtime: {} };
  });

  try {
    console.log(`Navigating to ${URL}...`);
    await page.goto(URL, { waitUntil: "networkidle", timeout: 60000 });

    // Wait for Cloudflare challenge to resolve
    console.log("Waiting for Cloudflare...");
    await page.waitForTimeout(5000);

    const pageTitle = await page.title();
    console.log(`Page title: ${pageTitle}`);
    if (
      pageTitle.toLowerCase().includes("just a moment") ||
      pageTitle.toLowerCase().includes("attention")
    ) {
      console.log("Cloudflare challenge detected, waiting longer...");
      await page.waitForTimeout(10000);
    }

    // Dismiss ad dialog if present
    try {
      const continueBtn = page.locator('button:has-text("Continue to Myfxbook")');
      await continueBtn.waitFor({ state: "visible", timeout: 8000 });
      await continueBtn.click();
      console.log("Dismissed ad dialog");
    } catch {
      console.log("No ad dialog, continuing...");
    }

    // Wait for the sentiment table
    console.log("Waiting for sentiment table...");
    await page.waitForSelector("#outlookSymbolsTableContent tr", {
      state: "attached",
      timeout: 45000,
    });
    await page.waitForTimeout(2000);

    console.log("Extracting sentiment data...");
    const data = await page.evaluate(() => {
      const rows = document.querySelectorAll("#outlookSymbolsTableContent tr");
      const results = [];

      rows.forEach((row) => {
        const cells = row.querySelectorAll("td");
        if (cells.length < 6) return;

        const symbolLink = cells[0].querySelector("a");
        const symbol = symbolLink ? symbolLink.textContent.trim() : "";
        if (!symbol) return;

        const dangerBar = cells[1].querySelector(".progress-bar-danger");
        const successBar = cells[1].querySelector(".progress-bar-success");
        const shortPct = dangerBar ? parseFloat(dangerBar.style.width) || 0 : 0;
        const longPct = successBar ? parseFloat(successBar.style.width) || 0 : 0;

        results.push({ symbol, short_pct: shortPct, long_pct: longPct });
      });

      return results;
    });

    await browser.close();

    if (data.length === 0) {
      throw new Error("No data extracted from page");
    }

    console.log(`Got ${data.length} symbols`);

    const output = {
      source: "myfxbook.com",
      scraped_at: new Date().toISOString(),
      total_symbols: data.length,
      data,
    };

    // Save to file
    const outPath = path.join(__dirname, "sentiment_data.json");
    fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
    console.log(`Saved ${data.length} symbols to ${outPath}`);

    // Push to Supabase
    await pushToSupabase(output);

    return output;
  } catch (err) {
    // Save debug screenshot
    const screenshotPath = path.join(__dirname, "debug_screenshot.png");
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Debug screenshot saved to ${screenshotPath}`);
    const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 500));
    console.log(`Page body preview: ${bodyText}`);
    await browser.close();
    throw err;
  }
}

scrape().catch((err) => {
  console.error("Scrape failed:", err);
  process.exit(1);
});
