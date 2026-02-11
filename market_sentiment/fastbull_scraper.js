const fs = require("fs");
const path = require("path");

const PAIR_LIST_API =
  "https://api.fastbull.com/fastbull-macro-data-service/api/getPendingOrderPairList?";
const ORDER_BOOK_API =
  "https://api.fastbull.com/fastbull-macro-data-service/api/getWebPendingOrder";

const SUPABASE_FUNCTION_URL =
  "https://nvvgqvkbooqrdusugmgg.supabase.co/functions/v1/ingest-fastbull";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im52dmdxdmtib29xcmR1c3VnbWdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3NDkzNjUsImV4cCI6MjA4NjMyNTM2NX0.SafREKWntFMmJv720S3RpSo4z03cvXpn2y1DgefNZzY";

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} returned ${res.status}`);
  const json = await res.json();
  if (json.code !== 0) throw new Error(`API error: ${json.message}`);
  return JSON.parse(json.bodyMessage);
}

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
  console.log("Fetching FastBull order book data...");

  // 1. Get list of available pairs
  const pairs = await fetchJSON(PAIR_LIST_API);
  console.log(`Found ${pairs.length} pairs`);

  const data = [];

  // 2. Fetch order book for each pair
  for (const pair of pairs) {
    try {
      const url = `${ORDER_BOOK_API}?orderType=0&pairId=${pair.pairId}&selectTime=`;
      const items = await fetchJSON(url);

      // Type 1 = Open Orders, Type 2 = Open Positions
      const orders = items.find((i) => i.type === 1);
      const positions = items.find((i) => i.type === 2);

      const sumArray = (arr) =>
        arr.reduce((s, v) => s + parseFloat(v), 0);

      const entry = {
        symbol: pair.symbol,
      };

      if (orders) {
        const buyTotal = sumArray(orders.buyOrder);
        const sellTotal = sumArray(orders.sellOrder);
        const total = buyTotal + sellTotal;
        entry.orders = {
          currentPrice: orders.currentPrice,
          buy_pct: total > 0 ? Math.round((buyTotal / total) * 10000) / 100 : 0,
          sell_pct: total > 0 ? Math.round((sellTotal / total) * 10000) / 100 : 0,
        };
      }

      if (positions) {
        const cp = parseFloat(positions.currentPrice);
        let longProfit = 0, longLoss = 0, shortProfit = 0, shortLoss = 0;

        for (let i = 0; i < positions.price.length; i++) {
          const price = parseFloat(positions.price[i]);
          const buyVal = parseFloat(positions.buyOrder[i]);
          const sellVal = parseFloat(positions.sellOrder[i]);

          // Long: bought at price, profit if current > entry
          if (buyVal > 0) {
            if (price < cp) longProfit += buyVal;
            else longLoss += buyVal;
          }
          // Short: sold at price, profit if current < entry
          if (sellVal > 0) {
            if (price > cp) shortProfit += sellVal;
            else shortLoss += sellVal;
          }
        }

        const totalLong = longProfit + longLoss;
        const totalShort = shortProfit + shortLoss;
        const total = totalLong + totalShort;
        const pct = (v, t) => (t > 0 ? Math.round((v / t) * 10000) / 100 : 0);

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
      const o = entry.orders;
      const p = entry.positions;
      console.log(
        `  ${pair.symbol}: Orders[B ${o?.buy_pct}% S ${o?.sell_pct}%] Positions[L ${p?.long_pct}% (${p?.long_profit_pct}% profit) S ${p?.short_pct}% (${p?.short_profit_pct}% profit)]`
      );
    } catch (err) {
      console.error(`  ${pair.symbol}: failed - ${err.message}`);
    }
  }

  console.log(`\nScraped ${data.length} pairs`);

  const output = {
    source: "fastbull.com/order-book",
    scraped_at: new Date().toISOString(),
    total_symbols: data.length,
    data,
  };

  // Save to file
  const outPath = path.join(__dirname, "fastbull_orderbook.json");
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`Saved to ${outPath}`);

  // Push to Supabase
  await pushToSupabase(output);

  return output;
}

scrape().catch((err) => {
  console.error("Scrape failed:", err);
  process.exit(1);
});
