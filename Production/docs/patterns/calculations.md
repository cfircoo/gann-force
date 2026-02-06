# Calculations Patterns - Pine Script Reusable Reference

## Overview
Calculation patterns for moving averages, FVG detection, trend detection, Gann projections, and risk management.

---

## Calculation 1: Multi-Timeframe Trend Detection
**Used in:** `30-60_shlomo.pine`

```pine
// Current timeframe
wma_fast = ta.wma(close, 30)
sma_slow = ta.sma(close, 60)
trend_1h_bull = wma_fast > sma_slow

// Higher timeframes via request.security
wma_fast_4h = request.security(syminfo.tickerid, "240", ta.wma(close, 30))
sma_slow_4h = request.security(syminfo.tickerid, "240", ta.sma(close, 60))
trend_4h_bull = wma_fast_4h > sma_slow_4h

// Daily
wma_fast_daily = request.security(syminfo.tickerid, "D", ta.wma(close, 30))
sma_slow_daily = request.security(syminfo.tickerid, "D", ta.sma(close, 60))

// Confirmation: HTF must agree with current TF (or be disabled)
htf_confirms_bull = not i_use_htf_trend or trend_4h_bull or trend_daily_bull
```

### Methodology
- **Fast MA:** WMA(30) - more weight on recent prices
- **Slow MA:** SMA(60) - equal weight baseline
- **Trend:** Fast above slow = bullish, below = bearish
- **HTF filter:** At least one higher TF must confirm direction

---

## Calculation 2: MA Cross Detection
**Used in:** `30-60_shlomo.pine`

```pine
cross_up = ta.crossover(wma_fast, sma_slow)    // fast crosses above slow
cross_down = ta.crossunder(wma_fast, sma_slow)  // fast crosses below slow
```
- Triggers the "waiting for FVG" state
- Resets trade state on opposite cross

---

## Calculation 3: FVG (Fair Value Gap) Detection
**Used in:** `30-60_shlomo.pine`, `dunamic_fvg.pine`

### Basic FVG
```pine
// Bullish: gap between candle[2] high and candle[0] low
fvg_bull_gap = low - high[2]      // positive = gap exists
fvg_bear_gap = low[2] - high      // positive = gap exists

// As percentage of price
fvg_bull_pct = (fvg_bull_gap / close) * 100
```

### dunamic_fvg uses 4-candle offset pattern
```pine
// Confirmed FVG (1 bar delayed for confirmation)
isBlockLong = low[1] > high[3]    // gap between candle[3] and candle[1]
isBlockShort = low[3] > high[1]

// Current forming FVG (real-time)
isCurrentBlockLong = low > high[2]
isCurrentBlockShort = low[2] > high
```

### Minimum Size Filter
```pine
// 30-60 method
fvg_bull = fvg_bull_gap > 0 and fvg_bull_pct >= 0.006  // 0.006% minimum

// dunamic_fvg method
isAboveMinSize(top, bottom, referencePrice) =>
    fvgSize = top - bottom
    minSize = referencePrice * (minSizePercent / 100)
    fvgSize >= minSize
```

---

## Calculation 4: GAP Between Candles Filter
**Used in:** `30-60_shlomo.pine`, `dunamic_fvg.pine`

### 30-60 method (strict)
```pine
// Gap between candle 1 and 2
gap_1_2_up = low[1] > high[2]
gap_1_2_size = gap_1_2_up ? low[1] - high[2] : gap_1_2_down ? low[2] - high[1] : 0.0

// Gap must be <= middle candle body
middle_body = math.abs(close[1] - open[1])
gap_1_2_ok = gap_1_2_size <= middle_body
gap_allows_fvg = gap_1_2_ok and gap_2_3_ok
```

### dunamic_fvg method (configurable)
```pine
hasGapBetweenCandles(idx1, idx2) =>
    low[idx2] > high[idx1] or high[idx2] < low[idx1]

// Three modes: show all, only with GAP, only without GAP
passesGapFilter(offset) =>
    if gapBehavior == "show all" => true
    hasAnyGap = hasGap1to2 or hasGap2to3
    if gapBehavior == "only with GAP" => hasAnyGap
    else => not hasAnyGap
```

---

## Calculation 5: Candle Penetration Check
**Used in:** `30-60_shlomo.pine`

```pine
middle_candle_body = math.abs(close[1] - open[1])
middle_candle_top = math.max(close[1], open[1])

// Bullish: 3rd candle can't close too far below middle candle top
bull_penetration_limit = middle_candle_top - (middle_candle_body * 0.5)
bull_penetration_ok = close >= bull_penetration_limit
```
- `MAX_PENETRATION = 0.5` means the 3rd candle can penetrate at most 50% into the middle candle's body

---

## Calculation 6: TP/SL with Risk:Reward Ratio
**Used in:** `30-60_shlomo.pine`

### Long Entry
```pine
entry_price = close
base_stop_size = close - sma_slow          // distance from entry to SMA60
stop_buffer = base_stop_size * 5.0 / 100   // 5% buffer below SMA
sl_price = sma_slow - stop_buffer           // SL below SMA60
tp_price = close + (close - sl_price) * 2   // 2:1 R:R (TP = 2x the risk)
```

### Short Entry
```pine
base_stop_size = sma_slow - close
stop_buffer = base_stop_size * 5.0 / 100
sl_price = sma_slow + stop_buffer           // SL above SMA60
tp_price = close + (close - sl_price) * 2   // note: (close - sl_price) is negative
```

---

## Calculation 7: Gann Magnet Levels (Percentage of Range)
**Used in:** `GannCycles.pine`

```pine
range_size = cycle.high - cycle.low
mag_25 = cycle.low + range_size * 0.25
mag_50 = cycle.low + range_size * 0.50
mag_75 = cycle.low + range_size * 0.75
```
- Divides the cycle's price range into quarters
- 50% is the key "magnet" level (mean reversion target)

---

## Calculation 8: Gann 2:1 Time Projection
**Used in:** `GannCycles.pine`

```pine
bars_in_cycle = bar_end - bar_start
bar_target = bar_end + bars_in_cycle  // 2x total duration

// High target slope
slope = (mag_50 - low) / bars_in_cycle
// Line passes through: low -> mag_50 -> high
// At bar_target, price = high
```

### Geometry Proof
```
mag_50 = (high + low) / 2
slope = (mag_50 - low) / bars_in_cycle = (high - low) / (2 * bars_in_cycle)
At 2 * bars_in_cycle: low + slope * 2 * bars = low + (high - low) = high
```

---

## Calculation 9: Cycle Double Detection
**Used in:** `GannCycles.pine`

```pine
MIN_CYCLE_MS = 26 * 60 * 60 * 1000  // 26 hours
is_double = (ts_end - ts_start) < MIN_CYCLE_MS
```
- Cycles shorter than 26 hours are marked as "double cycles"
- Double cycles are excluded from Gann fan and target calculations

---

## Calculation 10: Pivot Correction Validation (50-60%)
**Used in:** `GannCycles.pine`

```pine
price_range = high_price - start_price
correction_amount = high_price - correction_price
correction_pct = correction_amount / price_range

// Valid if 50-60% correction
valid = correction_pct >= 0.50 and correction_pct <= 0.60

// Invalidation: any bar after high below 60% level
invalidation_level = high_price - price_range * 0.60
for j after high_bar:
    if low[j] < invalidation_level
        trend_invalidated = true
```

---

## Calculation 11: MASTER-FVG Sizing (Symmetric Projection)
**Used in:** `dunamic_fvg.pine`

```pine
// Long MASTER
fvg_middle = (block.top + block.bottom) / 2
height = (fvg_middle - pivot_low) * 2   // 2x the distance from pivot to FVG middle
master_top = pivot_low + height
master_bottom = pivot_low

// Short MASTER (mirrored)
height = (pivot_high - fvg_middle) * 2
master_top = pivot_high
master_bottom = pivot_high - height
```

### Target Zone
```pine
target_zone_height = master_height * (target_zone_percent / 100)
// Long: zone at top of MASTER
target_top = master_top
target_bottom = master_top - target_zone_height
// Short: zone at bottom
target_top = master_bottom + target_zone_height
target_bottom = master_bottom
```

---

## Calculation 12: Timeframe Validation
**Used in:** `30-60_shlomo.pine`

```pine
is_valid_tf = timeframe.period == "60"  // Only run on 1-hour chart
```

**GannCycles uses:**
```pine
is_high_tf = timeframe.isweekly or timeframe.ismonthly  // Hide on weekly+
```

---

## Calculation 13: Price Position vs SMA
**Used in:** `30-60_shlomo.pine`

```pine
// All 3 FVG candles must be on correct side of SMA60
all_candles_above_sma = low[2] > sma_slow and low[1] > sma_slow and low > sma_slow
all_candles_below_sma = high[2] < sma_slow and high[1] < sma_slow and high < sma_slow
```
- Uses `low` for bullish (entire candle above SMA)
- Uses `high` for bearish (entire candle below SMA)

---

## Calculation 14: Heikin-Ashi as Momentum Filter
**Used in:** `arrow_shlomo.pine`

### HA Close Trend
```pine
haClose = (open + high + low + close) / 4
// Declining HA close = bearish momentum
ha_declining = haClose < haClose[1]
// Rising HA close = bullish momentum
ha_rising = haClose > haClose[1]
```

### Two-Wick Detection (Indecision)
```pine
upperWick = high - math.max(open, close)
lowerWick = math.min(open, close) - low
hasTwoWicks = upperWick > 0 and lowerWick > 0
```
- Two wicks = market indecision = weaker signal
- Combined filter: `hasTwoWicks AND declining close` = reject Long signal

### 5-Candle Extended Check
```pine
// Check BOTH candle[0] and candle[1]
passedLongHa5 = not (wicks[0] and declining[0]) and not (wicks[1] and declining[1])
```

---

## Calculation 15: WMA Consecutive Direction
**Used in:** `arrow_shlomo.pine`

```pine
// 3-bar consecutive rise
wmaRising3 = wma > wma[1] and wma[1] > wma[2]
// 5-bar consecutive rise (for 5-candle mode)
wmaRising5 = wma > wma[1] and wma[1] > wma[2] and wma[2] > wma[3] and wma[3] > wma[4]
```
- Strict monotonic increase/decrease over N bars
- Number of bars matches the pattern mode (3 or 5)

---

## Calculation 16: WMA Position Check at Pattern Middle
**Used in:** `arrow_shlomo.pine`

```pine
wmaCheckIndex = patternMode == "3 candles" ? 1 : 2  // middle candle
passedLongWma = close[wmaCheckIndex] > wmaValue[wmaCheckIndex]
```
- Checks the **middle candle** (the extreme point) vs WMA
- Long: middle candle's close must be above WMA (price is in bullish territory)

---

## Summary: Signal Chain (Arrow Shlomo Method)

```
1. Raw Pattern (3 or 5 candles)
   |-- Middle candle = extreme (lowest/highest)
   |-- Surrounding candles confirm direction change
   |
2. Heikin-Ashi Filter (optional, per direction)
   |-- Two-wick detection (indecision rejection)
   |-- HA close direction
   |
3. WMA Filter (optional, per direction)
   |-- Position: price vs WMA at middle candle
   |-- Direction: N consecutive WMA rise/fall
   |
4. Arrow Display (color = filter status)
   Green=confirmed, Orange=WMA-filtered, Purple=HA-filtered, Red=both
```

---

## Summary: Signal Chain (30-60 Method)

```
1. MA Cross (WMA30 x SMA60)
   |
2. Wait for FVG (max 46 bars)
   |
3. FVG Filters:
   a. Minimum size >= 0.006%
   b. GAP between candles <= middle body
   c. Penetration <= 50% of middle candle
   d. All 3 candles on correct side of SMA60
   e. No open position
   f. HTF trend confirms (optional)
   |
4. Entry at close, SL at SMA60 - buffer, TP at 2:1 R:R
   |
5. Exit on next MA cross (opposite direction)
```
