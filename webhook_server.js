const http = require("http");

const PORT = 8080;

const server = http.createServer((req, res) => {
  const timestamp = new Date().toISOString();
  console.log(`\n--- ${timestamp} ---`);
  console.log(`${req.method} ${req.url}`);
  console.log("Headers:", JSON.stringify(req.headers, null, 2));

  let body = "";
  req.on("data", (chunk) => {
    body += chunk;
  });

  req.on("end", () => {
    if (body) {
      try {
        const parsed = JSON.parse(body);
        console.log("Body (JSON):", JSON.stringify(parsed, null, 2));
      } catch {
        console.log("Body (raw):", body);
      }
    } else {
      console.log("Body: (empty)");
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, received: timestamp }));
  });
});

server.listen(PORT, () => {
  console.log(`Webhook server listening on http://localhost:${PORT}`);
  console.log("Waiting for TradingView webhooks...\n");
});
