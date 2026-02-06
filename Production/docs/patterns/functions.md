# Functions & Methodology Patterns - Pine Script Reusable Reference

## Overview
Reusable function patterns, UDTs (User-Defined Types), methods, and architectural patterns found across the scripts.

---

## Pattern 1: User-Defined Types (UDT)
**Used in:** `GannCycles.pine`, `dunamic_fvg.pine`

### Cycle Type (GannCycles)
```pine
type Cycle
    int id
    int tsStart
    int tsEnd
    float high
    float low
    float mag_25
    float mag_50
    float mag_75
    float high_target
    float low_target
    bool is_double
    float first_close
    float last_close
```

### Block Type (dunamic_fvg)
```pine
type Block
    int barIndex
    float top
    float bottom
    bool isLong
    bool isFilled
    bool toShow
    bool shouldShow
    int fillBarIndex
    box theBox
    line theLine
```

### Key Pattern: Store drawing objects inside UDT
- Keeps `box` and `line` references with their data
- Enables cleanup: `box.delete(obj.theBox)` then `obj.theBox := na`
- Enables update: `box.set_right(obj.theBox, newRight)`

---

## Pattern 2: Method Chaining on UDT
**Used in:** `GannCycles.pine`

```pine
// Define method on type
method create(Cycle c, int id, int ts_start, int ts_end) =>
    c.id := id
    c.tsStart := ts_start
    c.tsEnd := ts_end
    // ...
    c

method calculate_high_low(Cycle c) =>
    // scan bars, fill c.high, c.low, magnets

method draw_horizontals(Cycle c, col, w, style) =>
    // draw using c's data

// Usage chain
cycle.create(i + 1, ts_start, ts_end)
cycle.calculate_high_low()
cycle.draw_horizontals(col, w, style)
```

---

## Pattern 3: Group/Config Type
**Used in:** `GannCycles.pine`

```pine
type VLineGroup
    string name
    string tickers
    string dates
    bool showHighLow
    bool showMagnet
    bool showGannFan
    bool showDoubleGann
    array<Cycle> cycles
    int firstMonthCycleIdx

// Initialize
var VLineGroup group1 = VLineGroup.new(G1_NAME, g1_tickers, g1_dates, ...)

// Process
group1.init_cycles(utc_offset, hour)
group1.draw_verticals(color, width, style)
group1.draw_all_horizontals(color, width, style)
```
- Groups related settings together
- Each group can be processed identically
- Enables ticker-based filtering per group

---

## Pattern 4: Ticker Filtering
**Used in:** `GannCycles.pine`

```pine
is_ticker_allowed(ticker_list) =>
    if ticker_list == ""
        true
    else
        result = false
        remaining = str.upper(str.replace_all(ticker_list, " ", ""))
        current = str.upper(syminfo.ticker)
        for i = 0 to 9
            pos = str.pos(remaining, ",")
            if pos >= 0
                t = str.substring(remaining, 0, pos)
                if str.contains(current, t)
                    result := true
                    break
                remaining := str.substring(remaining, pos + 1)
            else
                if str.length(remaining) > 0 and str.contains(current, remaining)
                    result := true
                break
        result
```
- Parses comma-separated ticker list
- Uses `str.contains` for partial matching (e.g., "SPX" matches "SPX500")
- Empty list = show on all tickers

---

## Pattern 5: Date String Parsing
**Used in:** `GannCycles.pine`

```pine
parse_date(date_str, utc_offset, hr) =>
    clean = str.replace_all(date_str, " ", "")
    d = int(str.tonumber(str.substring(clean, 0, 2)))   // DD
    m = int(str.tonumber(str.substring(clean, 3, 5)))   // MM
    y = 2000 + int(str.tonumber(str.substring(clean, 6, 8)))  // YY -> 20YY
    utc_ts = timestamp("UTC", y, m, d, hr, 0, 0)
    result := utc_ts - utc_offset * 60 * 60 * 1000  // local to UTC
```
- Format: `DD.MM.YY` (e.g., "25.12.25")
- Handles UTC offset conversion

---

## Pattern 6: Rolling Cycle Creation
**Used in:** `GannCycles.pine`

```pine
// Dates: A, B, C, D
// Creates cycles: A-B, B-C, C-D
for i = 0 to size - 2
    cycle = Cycle.new()
    cycle.create(i + 1, timestamps[i], timestamps[i + 1])
    array.push(cycles, cycle)
```
- Each date is both the end of one cycle and start of the next
- Overlapping boundaries = no gaps

---

## Pattern 7: Bar Scanning for High/Low in Time Range
**Used in:** `GannCycles.pine`

```pine
method calculate_high_low(Cycle c) =>
    max_lookback = math.min(500, bar_index)
    for i = 0 to max_lookback
        bar_ts = time[i]
        if bar_ts >= c.tsStart and bar_ts <= c.tsEnd
            if na(c.high) or high[i] > c.high
                c.high := high[i]
            if na(c.low) or low[i] < c.low
                c.low := low[i]
        if bar_ts < c.tsStart
            break  // early exit - bars are chronological
```

---

## Pattern 8: Pivot Detection (3 Methods)
**Used in:** `dunamic_fvg.pine`, `GannCycles.pine`

### Method A: Built-in Pivot
```pine
pivotLowValue = ta.pivotlow(low, pivotBars, pivotBars)
pivotHighValue = ta.pivothigh(high, pivotBars, pivotBars)
// Confirmed after pivotBars candles (delayed)
// Bar index: bar_index - pivotBars
```

### Method B: Local High/Low (immediate)
```pine
isLocalLow = low < low[1] and low < low[2]
isLocalHigh = high > high[1] and high > high[2]
// No delay, but more false signals
```

### Method C: Swing High/Low
```pine
isSwingLow = low == ta.lowest(low, pivotBars)
isSwingHigh = high == ta.highest(high, pivotBars)
// Uses rolling window, no delay
```

---

## Pattern 9: State Machine (Trade State)
**Used in:** `30-60_shlomo.pine`

```pine
var bool waiting_for_bull_fvg = false
var bool waiting_for_bear_fvg = false
var bool in_long_trade = false
var bool in_short_trade = false
var int bars_since_cross = 0

// State transitions
if cross_up
    waiting_for_bull_fvg := true
    waiting_for_bear_fvg := false
    in_long_trade := false
    in_short_trade := false

// Timeout
if bars_since_cross > FVG_TIMEOUT
    waiting_for_bull_fvg := false
    waiting_for_bear_fvg := false

// Entry
if first_bull_fvg
    in_long_trade := true
    waiting_for_bull_fvg := false
```

---

## Pattern 10: barstate.islast Drawing
**Used in:** `GannCycles.pine`, `dunamic_fvg.pine`

```pine
if barstate.islast
    // Delete old drawings
    // Recalculate everything
    // Create new drawings
```
- **Why:** Avoids drawing on every bar (performance)
- **Tradeoff:** Only visible on current bar, redraws fully each tick
- Used when drawings need complex logic or many objects

---

## Pattern 11: Saved State for Display
**Used in:** `30-60_shlomo.pine`

```pine
var bool saved_trend_1h_bull = false
// ...

// Save at signal time
if first_bull_fvg or first_bear_fvg
    saved_trend_1h_bull := trend_1h_bull
    // ...

// Display: use saved if in trade, live if not
display_trend_1h_bull = position_open ? saved_trend_1h_bull : trend_1h_bull
```
- Freezes condition values at entry time
- Table shows what conditions looked like when trade opened

---

## Pattern 12: Fill Detection Loop
**Used in:** `dunamic_fvg.pine`

```pine
if array.size(activeFVGIndices) > 0
    int toRemove = na
    for i = 0 to array.size(activeFVGIndices) - 1
        block = array.get(blockList, array.get(activeFVGIndices, i))
        if not block.isFilled
            if block.isLong and low <= block.bottom
                block.isFilled := true
                toRemove := i
            // ...
    if not na(toRemove)
        array.remove(activeFVGIndices, toRemove)
```
- Tracks active (unfilled) FVGs in a separate index array
- Removes from tracking once price fills the gap

---

## Pattern 13: Alert System with Timed Pre-alerts
**Used in:** `30-60_shlomo.pine`

```pine
var bool[] alertsTriggered = array.new_bool(8, false)
var int lastAlertHour = -1

// Reset each hour
if currentHour != lastAlertHour
    for i = 0 to 7
        array.set(alertsTriggered, i, false)
    lastAlertHour := currentHour

// Fire at specific minutes
if currentMinute == 0 and i_alert_60 and not array.get(alertsTriggered, 0) and conditions_met
    array.set(alertsTriggered, 0, true)
    alert("...", alert.freq_once_per_bar)
```
- Array tracks which alerts fired this hour
- Resets at hour boundary
- Each alert has its own minute trigger and toggle input

---

## Pattern 14: Heikin-Ashi Manual Calculation (on regular chart)
**Used in:** `arrow_shlomo.pine`

```pine
haClose = (open + high + low + close) / 4
var float haOpen = na
haOpen := na(haOpen[1]) ? (open + close) / 2 : (haOpen[1] + haClose[1]) / 2
```
- Calculates HA values from regular OHLC (no chart switch needed)
- `var` + recursion for haOpen creates the smoothing chain
- Useful as a momentum/trend filter without switching chart type

---

## Pattern 15: Color-Coded Filter Status (plotshape)
**Used in:** `arrow_shlomo.pine`

```pine
// Show ALL raw patterns, color by filter result
plotshape(confirmed, color=green, ...)           // passed all filters
plotshape(raw and not passedHA and passedWMA, color=purple, ...)  // HA filtered
plotshape(raw and passedHA and not passedWMA, color=orange, ...)  // WMA filtered
plotshape(raw and not passedHA and not passedWMA, color=red, ...) // both filtered
```
- Every raw pattern gets an arrow, color shows what blocked it
- Mutually exclusive conditions prevent overlapping arrows
- Useful for debugging filter effectiveness

---

## Pattern 16: Per-Direction Independent Filter Toggles
**Used in:** `arrow_shlomo.pine`

```pine
confirmedLong = rawLong
    and (not useLongHaFilter or passedLongHa)
    and (not useLongWmaFilter or passedLongWma)
```
- `not useFilter or passedFilter` = if filter disabled, always true; if enabled, must pass
- Each filter has separate Long/Short enable toggle
- Allows asymmetric strategies (e.g., strict Long filter, loose Short filter)

---

## Pattern 17: Candle Pattern Detection (N-candle reversal)
**Used in:** `arrow_shlomo.pine`

```pine
// 3-candle: left red, middle lowest, right green
rawLong3 = (low[1] < low and low[1] < low[2])  // middle is lowest
    and (close[2] < open[2])                      // left is red
    and (close > open)                            // right is green

// 5-candle: 2 red left, middle lowest, 2 green right
rawLong5 = (low[2] < low and low[2] < low[1] and low[2] < low[3] and low[2] < low[4])
    and (close[4] < open[4]) and (close[3] < open[3])   // left 2 red
    and (close[1] > open[1]) and (close > open)          // right 2 green
```
- Middle candle is the extreme (lowest/highest) of all N candles
- Surrounding candles confirm direction change (bearish -> bullish or vice versa)
