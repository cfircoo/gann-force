# Gann Cycles - Full Documentation

## Summary
A Gann-based cycle analysis tool that draws vertical cycle boundaries, horizontal high/low and magnet levels, Gann fan projections, 2:1 time-price target lines, and pivot-based trend detection. Supports 5 asset groups (S&P500, Gold, Oil, EUR/USD, Bitcoin) with ticker-based filtering.

## Version & Settings
- **Pine Script v6**, overlay indicator
- **Max bars back:** 500
- **Hidden on:** Weekly and Monthly timeframes

## Architecture
Uses User-Defined Types (UDT) with methods:
- `Cycle` - single cycle with high/low, magnets, targets
- `VLineGroup` - group of cycles with ticker filter and drawing methods

---

## Asset Groups

| Group | Tickers | Dates Format | Statistics Format |
|-------|---------|-------------|-------------------|
| S&P500 | SP500, SPX, ES1, US500, QQQ, NQ1 | DD.MM.YY comma-separated | DD.MM.YY.U/D comma-separated |
| GOLD | AUX, GOLD, SILVER | " | " |
| OIL | USOIL, MCL1 | " | " |
| EUR/USD | EURUSD, M6E1, 6E1 | " | " |
| BITCOIN | BTCUSD, BTCUSDT, ETHUSD, ETHUSDT | " | " |

---

## Common Settings
| Parameter | Default | Purpose |
|-----------|---------|---------|
| `Hour` | 1 | Hour of day for cycle boundaries (0-23) |
| `UTC Offset` | 2 | Local timezone offset |
| `Show High/Low` | true | Horizontal lines at cycle extremes |
| `Show Magnet` | true | 25%, 50%, 75% levels |
| `Show Gann Fan` | true | 9-angle fan from first monthly cycle |
| `Show Double Gann` | true | Diagonal box on active cycle |
| `Show Target Lines` | true | 2:1 projection lines |
| `Target Circle Mode` | "trend" | none / trend (reversal) / both |
| `Show Pivot Fan` | false | Auto-detect 50-60% corrections |
| `Min Blocks` | 20 | Minimum bars for valid trend |
| `Show Statistics Arrows` | true | Up/down arrows from statistics dates |
| `Statistics Arrow Size` | "huge" | tiny / small / normal / large / huge |

---

## Methodology

### 1. Cycle Creation (Rolling)
Input dates are parsed and consecutive pairs form cycles:
```
Dates: A, B, C, D, E
Cycles: [A-B], [B-C], [C-D], [D-E]
```
Cycles shorter than 26 hours are marked as **double cycles** (displayed but excluded from Gann calculations).

### 2. High/Low Calculation
For each complete cycle, scan all bars within `[tsStart, tsEnd]` to find the highest high and lowest low. Also track first and last candle close for trend direction.

### 3. Magnet Levels
```
range = high - low
mag_25 = low + range * 0.25
mag_50 = low + range * 0.50  (key "magnet" level)
mag_75 = low + range * 0.75
```
Each cycle's magnet levels are projected onto the **next** cycle's date range. If the next cycle is a double, extend through consecutive doubles.

### 4. Gann Fan (9 angles)
Drawn from the **first complete non-double cycle of the current month** (or previous month if current is incomplete):
- Origin: `(tsStart, low)` of the reference cycle
- 1:1 line: `(tsStart, low)` to `(tsEnd, high)`
- Angles: 1:8, 1:4, 1:3, 1:2, **1:1**, 2:1, 3:1, 4:1, 8:1
- All extend right indefinitely

### 5. Target Lines (2:1 Time Projection)
**High target (upward):**
- Diagonal from `(bar_start, low)` to `(bar_target, high)` where `bar_target = bar_end + bars_in_cycle`
- Passes through `mag_50` at cycle end
- Horizontal dashed line at `high` level

**Low target (downward):**
- Diagonal from `(bar_start, high)` to `(bar_target, low)`
- Same geometry, mirrored

**Circle mode:**
- `"trend"`: Shows reversal circle (uptrend -> low target circle, downtrend -> high target circle)
- `"both"`: Both circles always visible

### 6. Double Gann Box
For the **currently active cycle** (time is within cycle boundaries):
- Horizontal line at first candle's close
- Diagonal up using reference cycle's price range
- Diagonal down using reference cycle's price range

### 8. Statistics Arrows
Per-group input for marking dates with up/down arrows:
```
Input format: "DD.MM.YY.U,DD.MM.YY.D"
  U = up arrow (▲) placed below bar's low
  D = down arrow (▼) placed above bar's high

Example: "01.01.26.U,03.01.26.D,05.01.26.U"
```
- Each group has its own statistics input field
- Parses up to 50 comma-separated entries
- Finds the bar at each date's timestamp (within 24h window)
- Arrow positioned at bar's high/low for proper candle alignment
- Falls back to current close if date has no bar data (future dates)
- Configurable arrow size and separate up/down colors

### 9. Pivot Trend Detection (Optional)
Finds trends with 50-60% correction:
```
1. Detect pivot highs and lows (10 bars left/right)
2. Find pattern: pivot_low_start -> pivot_high_max -> pivot_low_correction
3. Validate correction is 50-60% of the range
4. Invalidate if ANY bar after the high breaches 60%
5. Draw box + labels + correction zone lines (50% and 60%)
```

---

## Visual Elements

### Lines
| Type | Style | Color | Purpose |
|------|-------|-------|---------|
| Vertical cycle | Configurable | Gray | Cycle date boundaries |
| High/Low horizontal | Configurable | Blue | Cycle extremes |
| Magnet 25/50/75 | Configurable | Purple | Key retracement levels |
| Gann fan (9 lines) | Solid, extend right | Color-coded per angle | Gann angle analysis |
| Target diagonal | Solid | Lime (high) / Red (low) | 2:1 price projection |
| Target horizontal | Dashed | Lime / Red | Target price level |
| Double Gann diagonals | Solid | Green | Active cycle projection |
| Correction 50%/60% | Dashed | Purple | Correction zone |

### Boxes
| Type | Purpose |
|------|---------|
| Trend range box | Shows full trend from start to correction (blue, 90% transparent) |

### Labels
| Type | Purpose |
|------|---------|
| "Double Cycle" | Marks short-duration cycles |
| Target circle | Large circle at projected price target |
| TREND START/END | Pivot trend markers |
| CORRECTION | Validated correction point |
| Statistics ▲ | Up arrow at date (green, below bar) |
| Statistics ▼ | Down arrow at date (red, above bar) |

---

## Execution Pattern
All drawing happens on `barstate.islast` (last bar only):
1. Check ticker is allowed for the group
2. Init cycles (parse dates)
3. Draw verticals (all cycle boundaries)
4. Draw double cycle labels
5. Conditionally: horizontals, magnets, Gann fan, targets, double Gann box
6. Conditionally: statistics arrows
7. Optionally: pivot trend detection

---

## Key Functions

| Function | Purpose |
|----------|---------|
| `parse_date()` | DD.MM.YY string to timestamp with UTC offset |
| `is_ticker_allowed()` | Comma-separated ticker filter |
| `get_line_style()` | String to line style constant |
| `get_label_size()` | String to label size constant |
| `draw_vertical()` | Single vertical line at timestamp |
| `draw_gann_fan()` | 9-angle fan from origin point |
| `find_trend_with_correction()` | Pivot analysis with 50-60% correction |
| `Cycle.create()` | Initialize cycle with timestamps |
| `Cycle.calculate_high_low()` | Scan bars for extremes and magnets |
| `Cycle.draw_horizontals()` | High/Low lines |
| `Cycle.draw_magnet_lines()` | 25/50/75% levels on own range |
| `Cycle.draw_magnet_on_next()` | Project magnets to next cycle |
| `Cycle.draw_target_line()` | Upward 2:1 projection |
| `Cycle.draw_low_target_line()` | Downward 2:1 projection |
| `VLineGroup.init_cycles()` | Parse dates into rolling cycles |
| `VLineGroup.draw_verticals()` | All unique vertical lines |
| `VLineGroup.draw_all_horizontals()` | All cycle H/L lines |
| `VLineGroup.draw_all_magnet_lines()` | Magnets projected to next cycles |
| `VLineGroup.draw_gann_first_cycle()` | Fan from monthly reference cycle |
| `VLineGroup.draw_all_targets()` | All target lines and circles |
| `VLineGroup.draw_double_gann_box()` | Active cycle diagonal box |
| `VLineGroup.draw_statistics()` | Parse statistics string and draw up/down arrows |
