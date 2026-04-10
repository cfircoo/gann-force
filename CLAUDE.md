# Indicators — Claude Code Context

## Project Brain
This project uses The AI Brain. On session start:
1. Read `Machine/Rules/active-rules.md` for project rules
2. Read `Machine/Memory/context-cache.md` for current context
3. Check `Machine/Session-Logs/` for recent session history

## Project Summary
Trading data analytics platform: COT analysis, market sentiment, order book tracking, and TradingView Pine Script indicators.

## Stack
- **Frontend**: React 19 + TypeScript + Vite + Tailwind (`GannForce/`)
- **Scrapers**: Node.js + Playwright (`cot_report/`, `market_sentiment/`)
- **Backend**: Supabase PostgreSQL
- **Indicators**: Pine Script (`Indicators/`)
- **CI/CD**: GitHub Actions

## Key Conventions
- Pine Script indicators go in `Indicators/`
- React components in `GannForce/src/components/`, hooks in `GannForce/src/hooks/`
- Never commit `.env` files or API keys
- Feature branches from master, PRs for non-trivial changes
- Write session logs to `Machine/Session-Logs/` at end of session

## Hooks
Hooks are configured in `.claude/settings.json`. The `.brain/hooks/` scripts handle:
- `session-start.sh` — injects context at session start
- `post-session.sh` — reminds to write session log on stop
- `post-edit-check.sh` — monitors changes to rules/memory files
