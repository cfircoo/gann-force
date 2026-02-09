const { chromium } = require("playwright");

const BASE_URL = "https://www.tradingster.com/cot/legacy-futures";

const INSTRUMENTS = {
  Currencies: [
    { name: "AUSTRALIAN DOLLAR", code: "232741" },
    { name: "BRITISH POUND", code: "096742" },
    { name: "CANADIAN DOLLAR", code: "090741" },
    { name: "EURO FX", code: "099741" },
    { name: "JAPANESE YEN", code: "097741" },
    { name: "SWISS FRANC", code: "092741" },
    { name: "U.S. DOLLAR INDEX", code: "098662" },
    { name: "MEXICAN PESO", code: "095741" },
    { name: "NEW ZEALAND DOLLAR", code: "112741" },
    { name: "BRAZILIAN REAL", code: "102741" },
    { name: "SOUTH AFRICAN RAND", code: "122741" },
  ],
  Cryptocurrencies: [
    { name: "BITCOIN", code: "133741" },
    { name: "MICRO BITCOIN", code: "133742" },
    { name: "ETHER CASH SETTLED", code: "146021" },
    { name: "MICRO ETHER", code: "146022" },
  ],
  Indexes: [
    { name: "S&P 500 STOCK INDEX", code: "13874+" },
    { name: "NASDAQ-100 STOCK INDEX (MINI)", code: "209742" },
    { name: "DOW JONES INDUSTRIAL AVG x $5", code: "124603" },
    { name: "RUSSELL 2000 MINI", code: "239742" },
    { name: "E-MINI S&P 400", code: "33874A" },
    { name: "E-MINI S&P 500", code: "13874A" },
    { name: "VIX FUTURES", code: "1170E1" },
  ],
  "Treasuries and Rates": [
    { name: "30-DAY FEDERAL FUNDS", code: "045601" },
    { name: "UST 2Y NOTE", code: "042601" },
    { name: "UST 5Y NOTE", code: "044601" },
    { name: "UST 10Y NOTE", code: "043602" },
  ],
  Energies: [
    { name: "CRUDE OIL, LIGHT SWEET", code: "067651" },
    { name: "GASOLINE BLENDSTOCK (RBOB)", code: "111659" },
    { name: "HEATING OIL, NY HARBOR-ULSD", code: "022651" },
    { name: "NATURAL GAS", code: "023651" },
  ],
  Grains: [
    { name: "CORN", code: "002602" },
    { name: "SOYBEANS", code: "005602" },
    { name: "SOYBEAN OIL", code: "007601" },
    { name: "SOYBEAN MEAL", code: "026603" },
    { name: "WHEAT-SRW", code: "001602" },
    { name: "WHEAT-HRW", code: "001612" },
    { name: "WHEAT-HRSpring", code: "001626" },
    { name: "ROUGH RICE", code: "039601" },
    { name: "CANOLA", code: "135731" },
  ],
  "Livestock & Dairy": [
    { name: "LIVE CATTLE", code: "057642" },
    { name: "FEEDER CATTLE", code: "061641" },
    { name: "LEAN HOGS", code: "054642" },
    { name: "MILK, Class III", code: "052641" },
    { name: "NON FAT DRY MILK", code: "052642" },
    { name: "BUTTER (CASH SETTLED)", code: "050642" },
    { name: "CHEESE (CASH-SETTLED)", code: "063642" },
  ],
  Metals: [
    { name: "GOLD", code: "088691" },
    { name: "SILVER", code: "084691" },
    { name: "COPPER", code: "085692" },
    { name: "PALLADIUM", code: "075651" },
    { name: "PLATINUM", code: "076651" },
    { name: "ALUMINUM MWP", code: "191693" },
  ],
  Softs: [
    { name: "COCOA", code: "073732" },
    { name: "COTTON NO. 2", code: "033661" },
    { name: "COFFEE C", code: "083731" },
    { name: "SUGAR NO. 11", code: "080732" },
    { name: "FRZN CONCENTRATED ORANGE JUICE", code: "040701" },
    { name: "RANDOM LENGTH LUMBER", code: "058644" },
  ],
};

function extractNonCommercial(page) {
  return page.evaluate(() => {
    const table = document.querySelector("table");
    if (!table) return null;

    const rows = Array.from(table.querySelectorAll("tr"));
    const cells = (row) =>
      Array.from(row.querySelectorAll("th, td")).map((c) =>
        c.textContent.trim()
      );

    if (rows.length < 10) return null;

    const p = (v) => {
      if (!v) return null;
      const n = parseInt(v.replace(/[,+]/g, ""), 10);
      return isNaN(n) ? null : n;
    };
    const pf = (v) => {
      if (!v) return null;
      const n = parseFloat(v);
      return isNaN(n) ? null : n;
    };

    const oiText = cells(rows[2])[1] || "";
    const oiMatch = oiText.match(/([\d,]+)/);
    const openInterest = oiMatch
      ? parseInt(oiMatch[1].replace(/,/g, ""), 10)
      : null;

    const changeOiText = cells(rows[4])[1] || "";
    const changeOiMatch = changeOiText.match(/([+-]?[\d,]+)/);
    const changeInOI = changeOiMatch
      ? parseInt(changeOiMatch[1].replace(/,/g, ""), 10)
      : null;

    const pos = cells(rows[3]);
    const chg = cells(rows[5]);
    const pct = cells(rows[7]);

    const contractEl = document.querySelector("h1");
    const contract = contractEl
      ? contractEl.textContent.replace("COT Report: ", "").trim()
      : "";

    const unitText = cells(rows[2])[0] || "";

    const dateEl = document.querySelector("h3");
    const dateMatch = dateEl?.textContent.match(/(\d{4}-\d{2}-\d{2})/);
    const reportDate = dateMatch ? dateMatch[1] : null;

    const longPos = p(pos[0]);
    const shortPos = p(pos[1]);
    const longChg = p(chg[0]);
    const shortChg = p(chg[1]);
    const net =
      longPos !== null && shortPos !== null ? longPos - shortPos : null;
    const chgDiff =
      longChg !== null && shortChg !== null
        ? Math.abs(longChg) - Math.abs(shortChg)
        : null;
    const unfulfilledCalls =
      net !== null && chgDiff !== null && chgDiff !== 0
        ? Math.round((net / chgDiff) * 100) / 100
        : null;

    return {
      report_date: reportDate,
      contract,
      contract_unit: unitText.replace(/[()]/g, "").trim(),
      open_interest: openInterest,
      change_in_open_interest: changeInOI,
      non_commercial: {
        long: longPos,
        short: shortPos,
        spreads: p(pos[2]),
        net,
      },
      changes: {
        long: longChg,
        short: shortChg,
        spreads: p(chg[2]),
      },
      pct_of_open_interest: {
        long: pf(pct[0]),
        short: pf(pct[1]),
        spreads: pf(pct[2]),
      },
      unfulfilled_calls: unfulfilledCalls,
    };
  });
}

async function scrapeAll() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const results = {};

  for (const [category, instruments] of Object.entries(INSTRUMENTS)) {
    results[category] = [];

    for (const instrument of instruments) {
      const encodedCode = encodeURIComponent(instrument.code);
      const url = `${BASE_URL}/${encodedCode}`;

      try {
        await page.goto(url, { waitUntil: "networkidle", timeout: 15000 });
        const data = await extractNonCommercial(page);

        if (data) {
          results[category].push({
            code: instrument.code,
            name: instrument.name,
            ...data,
          });
          process.stderr.write(`OK: [${category}] ${instrument.name}\n`);
        } else {
          process.stderr.write(
            `SKIP (no table): [${category}] ${instrument.name}\n`
          );
        }
      } catch (err) {
        process.stderr.write(
          `ERR: [${category}] ${instrument.name} - ${err.message}\n`
        );
      }
    }
  }

  await browser.close();
  return results;
}

scrapeAll()
  .then((data) => console.log(JSON.stringify(data, null, 2)))
  .catch((err) => {
    console.error("Fatal:", err.message);
    process.exit(1);
  });
