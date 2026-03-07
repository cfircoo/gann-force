# 30-60 Shlomo (Meni Method) - Full Documentation

## Summary
A trading signal system based on WMA(30)/SMA(60) crossovers combined with Fair Value Gap (FVG) detection. Generates long/short entries with TP/SL levels and multi-timeframe trend confirmation. Works only on 1-hour charts.

## Version & Settings
- **Pine Script v6**, overlay indicator
- **Max objects:** 500 boxes, 500 labels, 500 lines
- **Required timeframe:** 60 minutes only

## Core Parameters
| Parameter | Value | Purpose |
|-----------|-------|---------|
| `WMA_FAST` | 30 | Fast moving average period (WMA) |
| `SMA_SLOW` | 60 | Slow moving average period (SMA) |
| `FVG_TIMEOUT` | 46 | Max bars to wait for FVG after cross |
| `STOP_BUFFER_PCT` | 5.0% | Buffer added below/above SMA for SL |
| `MIN_FVG_PCT` | 0.006% | Minimum FVG size as % of price |
| `MAX_PENETRATION` | 0.5 (50%) | Max penetration into middle candle body |

## User Inputs
- **HTF trend filter** (bool) - require 4H or Daily trend alignment
- **Show table** (bool) - conditions debug table
- **Text size** - small/normal
- **Alert settings** - 7 pre-alert timings (5, 15, 20, 25, 30, 45, 60 min before close) + confirmed alert

---

## Methodology Flow

### Phase 1: Trend Detection
```
WMA(30) vs SMA(60) on 1H, 4H, and Daily
  - Bull: WMA > SMA
  - Bear: WMA < SMA
  - HTF filter: at least 4H OR Daily must match 1H direction
```

### Phase 2: Cross Detection
```
cross_up  = ta.crossover(wma_fast, sma_slow)   -> start looking for bullish FVG
cross_down = ta.crossunder(wma_fast, sma_slow)  -> start looking for bearish FVG
```
On cross: reset trade state, stop extending TP/SL lines, start counter.

### Phase 3: FVG Detection (within 46 bars of cross)
**Bullish FVG conditions (ALL must be true):**
1. `low - high[2] > 0` (gap exists between candle 0 and candle 2)
2. Gap size >= 0.006% of close
3. GAPs between adjacent candles <= middle candle body
4. Close >= middle candle top - 50% of middle candle body (penetration check)
5. All 3 candles' lows > SMA(60)
6. No position already open
7. HTF confirms bullish (if enabled)
8. FVG found after the cross bar (not at the cross itself)

### Phase 4: Entry & Risk Management
```
Long:
  Entry = close
  SL = SMA60 - (close - SMA60) * 5%
  TP = entry + (entry - SL) * 2    (2:1 R:R)

Short:
  Entry = close
  SL = SMA60 + (SMA60 - close) * 5%
  TP = entry + (entry - SL) * 2    (negative, so TP is below)
```

### Phase 5: Exit
- Next opposite MA cross closes the position
- TP/SL lines stop extending on exit

---

## Visual Elements

### Boxes
1. **FVG Zone** (green/red, 70% transparent) - marks the 3-candle gap zone
2. **TP Zone** (green tint) - above/below entry to target
3. **SL Zone** (red tint) - from entry to stop loss

### Lines
1. **FVG Midpoint** (yellow, dashed) - center of the FVG gap
2. **TP Line** (lime, dotted, extends right) - take profit level
3. **SL Line** (red, dotted, extends right) - stop loss level
4. **WMA 30** (blue, width 2) - fast moving average plot
5. **SMA 60** (orange, width 2) - slow moving average plot

### Labels
- Entry, SL, TP price labels at bar_index + 5

### Table
- 9-row conditions table (top-right) showing all entry conditions
- Shows real-time values when no position, frozen values when in trade
- Rows: HTF status, bars since cross, FVG size, GAP status, penetration, MA position, price vs SMA, position status

### Alerts
- 8 alert levels: 60, 45, 30, 25, 20, 15, 5 minutes before candle close + confirmed on close
- Each independently toggleable
- Resets every hour using `timenow` minute tracking

---

## File Dependencies
- None (self-contained)
- Requires 1H timeframe
- Uses `request.security` for 4H and Daily data
