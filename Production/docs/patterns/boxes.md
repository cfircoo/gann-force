# Box Patterns - Pine Script Reusable Reference

## Overview
Boxes (`box.new`) create rectangular zones on the chart. Used for FVG zones, TP/SL zones, trend ranges, MASTER-FVG zones, and Gann cycle boxes.

---

## Pattern 1: FVG Box (Fair Value Gap)
**Used in:** `30-60_shlomo.pine`, `dunamic_fvg.pine`

### Bullish FVG Box
```pine
box.new(bar_index[2], low, bar_index, high[2],
    border_color=color.green, border_width=1,
    bgcolor=color.new(color.green, 70))
```
- **Left edge:** `bar_index[2]` (3 candles back - first candle of the FVG pattern)
- **Top:** `low` (current candle's low)
- **Bottom:** `high[2]` (candle 2 bars ago high)
- **Logic:** The gap between candle 0's low and candle 2's high forms the FVG zone

### Bearish FVG Box
```pine
box.new(bar_index[2], low[2], bar_index, high,
    border_color=color.red, border_width=1,
    bgcolor=color.new(color.red, 70))
```
- **Top:** `low[2]` (candle 2 bars ago low)
- **Bottom:** `high` (current candle's high)

### Key Concept: 3-Candle FVG Detection
```
Bullish:  candle[2].high < candle[0].low  (gap up)
Bearish:  candle[2].low  > candle[0].high (gap down)
```

---

## Pattern 2: TP/SL Zone Boxes
**Used in:** `30-60_shlomo.pine`

### Take Profit Box (Long)
```pine
box.new(bar_index, close, bar_index + 5, tp_price,
    border_color=na, border_width=0,
    bgcolor=color.rgb(38, 166, 154, 50))  // green tint
```
- **No border** (`border_color=na, border_width=0`) - uses only background color
- **Width:** 5 bars forward from entry
- **Height:** From entry price to TP price

### Stop Loss Box (Long)
```pine
box.new(bar_index, sl_price, bar_index + 5, close,
    border_color=na, border_width=0,
    bgcolor=color.rgb(103, 58, 58, 50))  // red tint
```
- Below entry price, from SL to entry

### TP/SL Calculation
```pine
// Long
sl_price = sma_slow - (close - sma_slow) * STOP_BUFFER_PCT / 100
tp_price = close + (close - sl_price) * 2  // 2:1 reward-to-risk
// Short (mirrored)
sl_price = sma_slow + (sma_slow - close) * STOP_BUFFER_PCT / 100
tp_price = close + (close - sl_price) * 2
```

---

## Pattern 3: Dynamic Extending Box
**Used in:** `dunamic_fvg.pine`

### FVG Block Box (extends right over time)
```pine
box.new(left=leftBar, top=block.top, right=rightBar, bottom=block.bottom,
    border_color=borderColor, border_width=blockBorderWidth,
    bgcolor=bgColor, extend=extend.none)
```
- **Left:** `block.barIndex - 3` (start of 3-candle pattern)
- **Right:** Dynamically calculated:
  ```pine
  rightBar = maxExtendBars > 0 ?
      math.min(block.barIndex - 1 + maxExtendBars, bar_index) :
      block.barIndex - 1
  ```
- **Fill detection stops extension:**
  ```pine
  if stopExtendOnFill and block.isFilled and not na(block.fillBarIndex)
      rightBar := math.min(rightBar, block.fillBarIndex)
  ```
- **Update on each bar:**
  ```pine
  box.set_right(block.theBox, rightBar)
  ```

---

## Pattern 4: MASTER-FVG Box
**Used in:** `dunamic_fvg.pine`

### Current MASTER (active/latest)
```pine
box.new(left=pivotBar, top=masterTop, right=bar_index, bottom=masterBottom,
    border_color=masterBlockBorderColor, border_width=masterBorderWidth,
    bgcolor=masterBlockBgColor, extend=extend.none)
```

### Old MASTER (previous, grayed out)
```pine
box.new(left=pivotBar, top=masterTop, right=rightBar, bottom=masterBottom,
    border_color=oldMasterBorderColor, border_width=masterBorderWidth,
    bgcolor=oldMasterBgColor, extend=extend.none)
```

### Target Zone Box
```pine
box.new(left=drawLeftBar, top=targetTop, right=drawRightBar, bottom=targetBottom,
    border_color=color.new(color.white, 100),  // invisible border
    border_width=0,
    bgcolor=targetColor, extend=extend.none)
```

### MASTER-FVG Size Calculation
```pine
// Long: height = (FVG_middle - pivot_low) * 2
mHeight = (targetFVGMiddle - pivot.price) * 2
mTop = pivot.price + mHeight
mBottom = pivot.price

// Short: height = (pivot_high - FVG_middle) * 2
mHeight = (pivot.price - targetFVGMiddle) * 2
mTop = pivot.price
mBottom = pivot.price - mHeight
```

---

## Pattern 5: Trend Range Box
**Used in:** `GannCycles.pine`

### Pivot Trend Box
```pine
box.new(start_bar, end_price, corr_bar, start_price,
    xloc=xloc.bar_index,
    border_color=color.new(color.blue, 30), border_width=2,
    border_style=line.style_solid,
    bgcolor=color.new(color.blue, 90))
```
- Uses `xloc.bar_index` for bar-based positioning
- Covers from trend start to correction point
- Semi-transparent blue fill

---

## Pattern 6: Delete/Recreate Pattern
**Used in:** `dunamic_fvg.pine`

When boxes need full redraw on `barstate.islast`:
```pine
// 1. Delete all existing
if not na(master.theBox)
    box.delete(master.theBox)
    master.theBox := na

// 2. Recalculate positions

// 3. Create new
master.theBox := box.new(...)
```

---

## Common Box Parameters

| Parameter | Common Values | Notes |
|-----------|--------------|-------|
| `border_width` | 0-2 | 0 = no border (background only) |
| `bgcolor` transparency | 50-90 | 50 = semi-visible, 90 = very faint |
| `extend` | `extend.none` | Always none for zone boxes |
| `xloc` | `xloc.bar_index` or default | Use `xloc.bar_time` for time-based |
| `border_color` | `na` or `color.new(color.white, 100)` | Both hide the border |
