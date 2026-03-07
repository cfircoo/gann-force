# Line Patterns - Pine Script Reusable Reference

## Overview
Lines (`line.new`) create horizontal, vertical, and diagonal lines. Used for price levels, cycle boundaries, Gann fans, target projections, and midpoints.

---

## Pattern 1: FVG Midpoint Line (Dashed)
**Used in:** `30-60_shlomo.pine`, `dunamic_fvg.pine`

```pine
fvg_mid = (low + high[2]) / 2  // or (block.top + block.bottom) / 2
line.new(bar_index[2], fvg_mid, bar_index, fvg_mid,
    color=color.yellow, width=1, style=line.style_dashed)
```
- Horizontal line at the midpoint of the FVG gap
- Spans from first candle to last candle of the 3-candle pattern

---

## Pattern 2: TP/SL Extending Lines
**Used in:** `30-60_shlomo.pine`

### Create with right-extend
```pine
tp_line := line.new(bar_index, tp_price, bar_index + 1, tp_price,
    color=color.new(color.lime, 50), width=1,
    style=line.style_dotted, extend=extend.right)
```
- `extend=extend.right` makes the line extend indefinitely to the right
- Dotted style distinguishes from solid price lines
- Semi-transparent (50) to avoid clutter

### Stop extending on exit
```pine
if exit_condition
    line.set_extend(tp_line, extend.none)
    line.set_x2(tp_line, bar_index)
```
- **Pattern:** Change `extend` to `none` and set `x2` to current bar
- This "freezes" the line at the exit point

---

## Pattern 3: Vertical Cycle Lines
**Used in:** `GannCycles.pine`

```pine
line.new(ts, low, ts, high,
    xloc=xloc.bar_time, extend=extend.both,
    color=col, width=w, style=style)
```
- `xloc=xloc.bar_time` for timestamp-based positioning
- `extend=extend.both` creates full-height vertical line
- `low` and `high` are just anchor points (extend overrides)

---

## Pattern 4: Horizontal Level Lines (Time-based)
**Used in:** `GannCycles.pine`

### Cycle High/Low Lines
```pine
line.new(c.tsStart, c.high, c.tsEnd, c.high,
    xloc=xloc.bar_time, color=col, width=w, style=style)
```
- Span exactly from cycle start to cycle end

### Magnet Lines (25%, 50%, 75%)
```pine
line.new(ts_start, c.mag_25, ts_end, c.mag_25, ...)
line.new(ts_start, c.mag_50, ts_end, c.mag_50, ...)
line.new(ts_start, c.mag_75, ts_end, c.mag_75, ...)
```
- Same horizontal pattern, drawn at percentage levels of the cycle range
- Can be projected onto a different time range (next cycle's dates)

---

## Pattern 5: Gann Fan Lines (9 angles from one origin)
**Used in:** `GannCycles.pine`

```pine
draw_gann_fan(int ts_origin, float price_origin, int ts_ref, float price_ref, int w) =>
    price_diff = price_ref - price_origin

    // Flatter (slower price movement)
    line.new(ts_origin, price_origin, ts_ref, price_origin + 0.125 * price_diff, ..., extend=extend.right)  // 1:8
    line.new(ts_origin, price_origin, ts_ref, price_origin + 0.25 * price_diff, ..., extend=extend.right)   // 1:4
    line.new(ts_origin, price_origin, ts_ref, price_origin + 0.333 * price_diff, ..., extend=extend.right)  // 1:3
    line.new(ts_origin, price_origin, ts_ref, price_origin + 0.5 * price_diff, ..., extend=extend.right)    // 1:2

    // Reference (1:1)
    line.new(ts_origin, price_origin, ts_ref, price_ref, ..., extend=extend.right)  // 1:1

    // Steeper (faster price movement)
    line.new(ts_origin, price_origin, ts_ref, price_origin + 2 * price_diff, ..., extend=extend.right)  // 2:1
    line.new(ts_origin, price_origin, ts_ref, price_origin + 3 * price_diff, ..., extend=extend.right)  // 3:1
    line.new(ts_origin, price_origin, ts_ref, price_origin + 4 * price_diff, ..., extend=extend.right)  // 4:1
    line.new(ts_origin, price_origin, ts_ref, price_origin + 8 * price_diff, ..., extend=extend.right)  // 8:1
```

### Key Concept
- All lines share the same origin point `(ts_origin, price_origin)`
- The 1:1 line uses the full `price_diff` over the cycle duration
- Multipliers scale the price movement: `0.125x` (flattest) to `8x` (steepest)
- All extend right indefinitely

---

## Pattern 6: Diagonal Target Lines (2:1 Projection)
**Used in:** `GannCycles.pine`

### High Target (upward)
```pine
// Diagonal: from (bar_start, low) to (bar_target, high)
line.new(bar_start, c.low, bar_target, c.high,
    xloc=xloc.bar_index, color=col, width=w, style=line.style_solid)
// Horizontal reference at high level
line.new(bar_start, c.high, bar_target, c.high,
    xloc=xloc.bar_index, color=col, width=w, style=line.style_dashed)
```

### Low Target (downward, mirrored)
```pine
line.new(bar_start, c.high, bar_target, c.low, ...)  // diagonal down
line.new(bar_start, c.low, bar_target, c.low, ...)    // horizontal at low
```

### Geometry
```
bar_target = bar_end + bars_in_cycle  (2x total from start)
Slope passes through: low -> mag_50 -> high (or high -> mag_50 -> low)
```

---

## Pattern 7: Double Gann Box Lines
**Used in:** `GannCycles.pine`

```pine
// Horizontal at first candle's close
line.new(first_candle_time, first_close, cycle_end, first_close, ...)
// Diagonal up
line.new(first_candle_time, first_close, cycle_end, first_close + ref_range, ...)
// Diagonal down
line.new(first_candle_time, first_close, cycle_end, first_close - ref_range, ...)
```
- Uses reference cycle's price range for diagonal slope
- Creates a symmetrical fan from the first candle's close

---

## Pattern 8: Correction Zone Lines
**Used in:** `GannCycles.pine`

```pine
// 50% retracement level
line.new(end_bar, end_price - range * 0.5, corr_bar, end_price - range * 0.5,
    xloc=xloc.bar_index, color=color.purple, width=1, style=line.style_dashed)
// 60% retracement level
line.new(end_bar, end_price - range * 0.6, corr_bar, end_price - range * 0.6,
    xloc=xloc.bar_index, color=color.purple, width=1, style=line.style_dashed)
```

---

## Pattern 9: Dynamic Line Update
**Used in:** `dunamic_fvg.pine`

```pine
// Update right endpoint
line.set_x2(block.theLine, rightBar)

// Update both endpoints
line.set_xy1(currentLongLine, bar_index - 2, currentLongMiddle)
line.set_xy2(currentLongLine, currentRightBar, currentLongMiddle)
```

---

## Pattern 10: Support/Resistance Lines with Break Detection
**Used in:** `arrow_shlomo.pine`

### Create S/R line at pivot
```pine
var line[] highLines = array.new_line()

if not na(pivotHigh)
    // Delete all previous resistance lines
    if array.size(highLines) > 0
        for i = array.size(highLines) - 1 to 0
            line.delete(array.get(highLines, i))
        array.clear(highLines)
    // Create new line
    newLine = line.new(bar_index - pivotRightBars, pivotHigh, bar_index + 500, pivotHigh,
        color=color.new(color.red, 50), width=pivotLineWidth,
        style=line.style_solid,
        extend=pivotLineType == "infinite" ? extend.right : extend.none)
    array.push(highLines, newLine)
```

### Delete on break
```pine
if array.size(highLines) > 0
    for i = array.size(highLines) - 1 to 0
        ln = array.get(highLines, i)
        if close > line.get_y1(ln)    // price broke above resistance
            line.delete(ln)
            array.remove(highLines, i)
```
- **Pattern:** Iterate backwards when deleting from array (avoids index shifting)
- Uses `line.get_y1()` to retrieve the stored price level
- Only latest S/R shown (old ones cleared on new pivot)

---

## Line Style Reference

| Style | Constant | Use Case |
|-------|----------|----------|
| Solid | `line.style_solid` | Main levels, Gann fan, diagonals |
| Dashed | `line.style_dashed` | Midpoints, reference levels, projections |
| Dotted | `line.style_dotted` | TP/SL extending lines, subtle references |

## xloc Reference

| Mode | When to Use |
|------|-------------|
| `xloc.bar_index` | Bar-based calculations (pivots, offsets) |
| `xloc.bar_time` | Timestamp-based (cycles, scheduled dates) |
| default (bar_index) | Simple relative positioning |
