# Arrow Shlomo (3/5 Candle Arrow Pattern with WMA & Heikin-Ashi Filter) - Full Documentation

## Summary
A candlestick pattern detector that identifies reversal arrow signals using 3 or 5-candle patterns, filtered by WMA direction/position and Heikin-Ashi momentum analysis. Shows color-coded arrows indicating confirmed vs filtered signals, with support/resistance pivot lines.

## Version & Settings
- **Pine Script v6**, overlay indicator
- **Date:** 26/10/2025
- **Works on any timeframe**
- **No max_boxes/lines limits** (uses plotshape for arrows, few lines for S/R)

---

## User Inputs

### Pattern Settings
| Input | Default | Purpose |
|-------|---------|---------|
| Pattern mode | "3 candles" | Choose 3 or 5 candle reversal pattern |
| Arrow marker | "Middle" | Place arrow on middle candle or rightmost |

### Filters
| Input | Default | Purpose |
|-------|---------|---------|
| Heikin-Ashi exit filter | "Both" | None / 2 wicks only / Close only / Both |
| WMA filter mode | "Both" | None / Position only / Direction only / Both |
| WMA length | 30 | WMA period |
| HA filter for Long | true | Enable/disable per direction |
| HA filter for Short | true | " |
| WMA filter for Long | true | " |
| WMA filter for Short | true | " |

### Support/Resistance
| Input | Default | Purpose |
|-------|---------|---------|
| Show pivots | true | Enable S/R lines |
| Left bars | 5 | Pivot confirmation lookback |
| Right bars | 5 | Pivot confirmation lookahead |
| Line type | "Line until break" | Until break / Infinite / None |
| Line width | 1 | S/R line thickness |

### Alerts
6 independent alert toggles for: confirmed Long, HA-filtered Long, WMA-filtered Long, confirmed Short, HA-filtered Short, WMA-filtered Short.

---

## Methodology

### Phase 1: Raw Pattern Detection

#### 3-Candle Pattern (reversal)
```
LONG (3 candles):
  candle[2]: red (bearish)     <- left candle
  candle[1]: lowest low        <- middle candle (lowest of all 3)
  candle[0]: green (bullish)   <- right candle

  isMiddleLowest3 = low[1] < low and low[1] < low[2]
  isLeftRed3 = close[2] < open[2]
  isRightGreen3 = close > open

SHORT (3 candles):
  candle[2]: green (bullish)
  candle[1]: highest high      <- middle candle (highest of all 3)
  candle[0]: red (bearish)

  isMiddleHighest3 = high[1] > high and high[1] > high[2]
  isLeftGreen3 = close[2] > open[2]
  isRightRed3 = close < open
```

#### 5-Candle Pattern (stronger reversal)
```
LONG (5 candles):
  candle[4]: red               <- left 1
  candle[3]: red               <- left 2
  candle[2]: lowest low        <- middle (lowest of all 5)
  candle[1]: green             <- right 1
  candle[0]: green             <- right 2

  isMiddleLowest5 = low[2] < low AND low[2] < low[1] AND low[2] < low[3] AND low[2] < low[4]

SHORT (5 candles):
  candle[4]: green
  candle[3]: green
  candle[2]: highest high      <- middle (highest of all 5)
  candle[1]: red
  candle[0]: red
```

### Phase 2: Heikin-Ashi Filter

#### Heikin-Ashi Calculation
```pine
haClose = (open + high + low + close) / 4
haOpen = na(haOpen[1]) ? (open + close) / 2 : (haOpen[1] + haClose[1]) / 2
```
Note: Uses **regular candle** OHLC (not HA candles) for the HA formula - this gives HA values overlaid on the regular chart.

#### Two-Wick Detection
```pine
hasTwoWicks() =>
    upperWick = high - math.max(open, close)  // above the body
    lowerWick = math.min(open, close) - low   // below the body
    upperWick > 0 and lowerWick > 0           // both exist
```
Two wicks = indecision candle = potential reversal exhaustion signal. Used as a **negative** filter (two wicks = weaker signal).

#### Filter Modes
| Mode | Long passes if... | Short passes if... |
|------|-------------------|--------------------|
| None | Always true | Always true |
| 2 wicks only | Current candle does NOT have 2 wicks | Current candle does NOT have 2 wicks |
| Close only | HA close is NOT declining | HA close is NOT rising |
| Both | Neither 2 wicks + declining close | Neither 2 wicks + rising close |

For 5-candle mode, both candle[0] AND candle[1] are checked.

### Phase 3: WMA Filter

#### WMA Direction (consecutive rising/falling)
```pine
// 3-candle mode: 3 consecutive
wmaRising3 = wma > wma[1] and wma[1] > wma[2]
wmaFalling3 = wma < wma[1] and wma[1] < wma[2]

// 5-candle mode: 5 consecutive
wmaRising5 = wma > wma[1] and wma[1] > wma[2] and wma[2] > wma[3] and wma[3] > wma[4]
```

#### WMA Position
```pine
wmaCheckIndex = patternMode == "3 candles" ? 1 : 2  // middle candle index
// Long: close of middle candle > WMA at that bar
// Short: close of middle candle < WMA at that bar
```

#### Filter Modes
| Mode | Long passes if... | Short passes if... |
|------|-------------------|--------------------|
| None | Always true | Always true |
| Position only | Middle candle close > WMA | Middle candle close < WMA |
| Direction only | WMA rising (3 or 5 bars) | WMA falling (3 or 5 bars) |
| Both | Position AND direction | Position AND direction |

### Phase 4: Final Signal
```pine
confirmedLong = rawLong
    and (not useLongHaFilter or passedLongHa)
    and (not useLongWmaFilter or passedLongWma)

confirmedShort = rawShort
    and (not useShortHaFilter or passedShortHa)
    and (not useShortWmaFilter or passedShortWma)
```
Each filter can be independently enabled/disabled per direction.

---

## Visual Elements

### Arrows (plotshape)
| Color | Meaning |
|-------|---------|
| Green | Confirmed signal (passed all enabled filters) |
| Orange | Filtered by WMA only (pattern + HA ok, WMA failed) |
| Purple | Filtered by Heikin-Ashi only (pattern + WMA ok, HA failed) |
| Red | Double-filtered (both WMA and HA failed) |

- **Long arrows:** `shape.triangleup`, `location.belowbar`
- **Short arrows:** `shape.triangledown`, `location.abovebar`
- **Offset:** Configurable to middle candle or rightmost candle

### Arrow Offset Calculation
```pine
// 3-candle mode
marker_offset = marker_location == "middle" ? -1 : 0
// 5-candle mode
marker_offset = marker_location == "middle" ? -2 : 0
```

### Support/Resistance Lines
| Type | Color | Behavior |
|------|-------|----------|
| Resistance (pivot high) | Red (50% transparent) | Horizontal at pivot high price |
| Support (pivot low) | Green (50% transparent) | Horizontal at pivot low price |

#### Line Management
- Uses `ta.pivothigh/pivotlow` with configurable left/right bars
- Small triangle markers at pivot points (offset by `-pivotRightBars`)
- **"Line until break"**: Line deleted when `close` crosses through it
- **"Infinite"**: Line extends right forever (`extend.right`)
- **"None"**: No lines drawn
- On new pivot: all previous same-type lines are deleted (only latest S/R shown)

### Line Creation
```pine
line.new(bar_index - pivotRightBars, pivotHigh, bar_index + 500, pivotHigh,
    color=color.new(color.red, 50), width=pivotLineWidth,
    style=line.style_solid,
    extend=pivotLineType == "infinite" ? extend.right : extend.none)
```

### Break Detection
```pine
// Resistance broken: close above line price
if close > line.get_y1(ln)
    line.delete(ln)
    array.remove(highLines, i)

// Support broken: close below line price
if close < line.get_y1(ln)
    line.delete(ln)
    array.remove(lowLines, i)
```

---

## Alerts
6 alerts, each independently toggleable:

| Alert | Condition |
|-------|-----------|
| Confirmed Long | `confirmedLong` (all filters passed) |
| HA-filtered Long | `rawLong and not passedLongHa` |
| WMA-filtered Long | `rawLong and not passedLongWma` |
| Confirmed Short | `confirmedShort` (all filters passed) |
| HA-filtered Short | `rawShort and not passedShortHa` |
| WMA-filtered Short | `rawShort and not passedShortWma` |

All alerts use `alert.freq_once_per_bar_close` and include ticker + timeframe + pattern mode.

---

## Unique Patterns in This Script

### Plotshape-based Arrow System (no boxes/labels)
Unlike other scripts that use `box.new` and `label.new`, this script uses `plotshape` exclusively for arrows. This is simpler and doesn't count against `max_boxes_count`.

### Color-coded Filter Status
Shows ALL raw patterns as arrows, with color indicating which filter(s) blocked them. This lets the user see what they're filtering out.

### Independent Per-Direction Filter Toggles
Each filter (HA, WMA) can be independently enabled for Long vs Short, allowing asymmetric filtering strategies.

---

## File Dependencies
- None (self-contained)
- Works on any timeframe
- No external data requests (`request.security` not used)
