# Equal Open-Close (EqOC) - Full Documentation

## Summary
A price equality pattern detector that identifies when 3 consecutive candles share the same price level: first candle's open, second candle's close, and third candle's open are all equal. Marks the pattern with directional arrows based on the first candle's color, with an alert on the third candle.

## Version & Settings
- **Pine Script v6**, overlay indicator
- **Max labels:** 500
- **Works on any timeframe**

---

## User Inputs

| Input | Default | Purpose |
|-------|---------|---------|
| Price Tolerance | 0.0 | Max allowed difference for price equality (0 = exact match) |

---

## Methodology

### Detection: 3-Candle Price Equality
```
candle[2].open == candle[1].close == candle[0].open  (within tolerance)
```

Uses `math.abs()` for tolerance-based comparison:
```pine
match_3 = math.abs(open[2] - close[1]) <= i_tolerance
       and math.abs(close[1] - open) <= i_tolerance
```

### Direction: First Candle Color
```pine
is_green = close[2] > open[2]  // green candle = close > open
is_red = close[2] < open[2]    // red candle = close < open
```
- Green first candle -> green arrow up (below bar)
- Red first candle -> red arrow down (above bar)

---

## Visual Elements

### Arrows (plotshape, offset=-2)
| Color | Shape | Location | Meaning |
|-------|-------|----------|---------|
| Green | triangleup | belowbar | First candle is green |
| Red | triangledown | abovebar | First candle is red |

- Arrows appear on the **first candle** (`offset=-2`), not the detection bar
- Detection fires on the third candle (candle[0])

### Alert Mark
| Shape | Color | Location | Purpose |
|-------|-------|----------|---------|
| circle | orange | abovebar | Marks the 3rd candle where alert fires |

### Debug Labels
- Gray label above matched candles showing:
  - `O[2]:` first candle open
  - `C[1]:` second candle close
  - `O:` third candle open
- Positioned at `high + ATR(14) * 2` for visibility

---

## Alerts

Single dynamic alert using `alert()`:
```pine
alert_msg = match_3 and is_red ? "EqOC: SHORT ({{ticker}} {{interval}})" : "EqOC: LONG ({{ticker}} {{interval}})"
if match_3
    alert(alert_msg, alert.freq_once_per_bar)
```
- Uses `alert()` (not `alertcondition()`) for dynamic message content
- Fires once per bar when pattern detected
- Message includes direction (LONG/SHORT), ticker, and timeframe

---

## Key Patterns Used

| Pattern | Reference |
|---------|-----------|
| Tolerance-based price comparison | `calculations.md` Calc 18 |
| Plotshape with offset | `functions.md` Pattern 20 |
| Dynamic alert message | `functions.md` Pattern 21 |
| Debug labels with ATR offset | `functions.md` Pattern 22 |
| Separate detection/signal marks | `functions.md` Pattern 23 |

---

## File Dependencies
- None (self-contained)
- Works on any timeframe
- No external data requests
