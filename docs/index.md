# Indicators Documentation

A comprehensive trading indicators platform that combines COT (Commitment of Traders) analysis, market sentiment tracking, and order book visualization with a unified dashboard interface.

## Navigation

### Getting Started
- [Quick Start Guide](getting-started.md) — Installation, setup, and first steps

### Architecture & System Design
- [Architecture Overview](architecture.md) — System design, component relationships, and data flow
- [Project Structure](project-structure.md) — Directory organization, module breakdown, and file layout

### Features & Data Collection
- **Dashboards:**
  - [GannForce Dashboard](features/gannforce.md) — React frontend with multiple dashboard views
  - [COT Reporting](features/cot-reporting.md) — Commitment of Traders data analysis
  - [Market Sentiment](features/market-sentiment.md) — Community sentiment tracking
  - [Order Book Analysis](features/order-book.md) — FastBull order book visualization

- **Scrapers:**
  - [COT Scraper](scrapers/cot-scraper.md) — Tradingster data collection (40+ assets)
  - [Sentiment Scraper](scrapers/sentiment-scraper.md) — MyFxBook community sentiment
  - [FastBull Scraper](scrapers/fastbull-scraper.md) — Order book and position data

### Components & Hooks
- [Custom React Hooks](components/hooks.md) — Data fetching, state management, and utilities

### Technical Reference
- [Supabase API Integration](api/supabase.md) — Database schema, tables, and API endpoints
- [Webhook Server](technical/webhook-server.md) — TradingView webhook listener (if needed)

### Quick Links
- See the main [README.md](../README.md) for quick start and overview
- Check [Getting Started](getting-started.md) for detailed setup instructions
- Review [Architecture Overview](architecture.md) for system design understanding
