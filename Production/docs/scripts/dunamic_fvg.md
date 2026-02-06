# Dynamic FVG - Full Documentation

## Summary
A comprehensive Fair Value Gap (FVG) detection and visualization system with three features:
1. **Basic FVG blocks** - detect and display FVG zones with extending boxes
2. **MASTER-FVG** - identify the most significant FVG in a price move using pivot analysis
3. **Target zones** - project price targets from MASTER-FVG calculations

## Version & Settings
- **Pine Script v6**, overlay indicator
- **Max objects:** 500 boxes, 500 lines, 500 labels
- **Max bars back:** 5000
- **Works on any timeframe**

---

## User-Defined Types

### `PivotRecord`
```pine
type PivotRecord
    int barIdx
    float price
    bool isHigh
```

### `Block` (FVG zone)
```pine
type Block
    int barIndex       // detection bar
    float top          // upper price of FVG
    float bottom       // lower price of FVG
    bool isLong        // direction
    bool isFilled      // price has filled the gap
    bool toShow        // should it be displayed
    bool shouldShow    // passes visibility filter (last N blocks)
    int fillBarIndex   // when it was filled
    box theBox         // drawing reference
    line theLine       // midpoint line reference
```

### `MasterFVG`
```pine
type MasterFVG
    int pivotBar       // pivot origin bar
    float pivotPrice   // pivot price level
    float fvgMiddle    // middle of the target FVG
    int fvgBar         // target FVG bar
    bool isLong        // direction
    float masterTop    // projected box top
    float masterBottom // projected box bottom
    float targetTop    // target zone top
    float targetBottom // target zone bottom
    int rightBar       // right edge of box
    bool isActive      // not yet invalidated
    bool isCurrent     // is the latest MASTER
    box theBox         // main box
    line theLine       // midpoint line
    box targetBox      // target zone box
```

---

## User Inputs

### General
| Input | Default | Purpose |
|-------|---------|---------|
| Blocks to show | 10 | Number of recent FVG blocks visible |
| Show forming FVG | true | Show real-time (unconfirmed) FVG |
| Min size % | 0.006% | Minimum FVG size filter |

### Extension & Fill
| Input | Default | Purpose |
|-------|---------|---------|
| Max extend bars | 10 | How far right boxes extend (0=no extend) |
| Delete on fill | false | Remove box when price fills the gap |
| Stop extend on fill | true | Stop box from growing when filled |
| GAP behavior | "Show all" | Filter: all / only with GAP / only without GAP |

### MASTER-FVG
| Input | Default | Purpose |
|-------|---------|---------|
| Method | Pivot Points | Detection method for swing points |
| Pivot bars | 3 | Lookback for pivot detection |
| Max FVGs in move | 3 | How many FVGs to count in one move |
| Target zone % | 5% | Size of target zone (0=off) |
| Delete condition | "Touch safety zone" | When to deactivate old MASTERs |
| Max to show | 5 | Limit displayed MASTERs |

---

## Methodology

### Feature 1: Basic FVG Detection

#### Confirmed FVG (1-bar delay)
```pine
isBlockLong = low[1] > high[3]   // bullish gap: candle[1] low above candle[3] high
isBlockShort = low[3] > high[1]  // bearish gap: candle[3] low above candle[1] high
```
Uses a 4-candle window `[3,2,1,0]` where the FVG is confirmed at bar `[1]` (candle 0 confirms it).

#### Current/Forming FVG (real-time)
```pine
isCurrentBlockLong = low > high[2]   // 3-candle window [2,1,0]
isCurrentBlockShort = low[2] > high
```
Drawn and updated in real-time, deleted if conditions change.

#### Fill Detection
```pine
// Long: filled when price drops to or below the bottom
if block.isLong and low <= block.bottom
    block.isFilled := true

// Short: filled when price rises to or above the top
if not block.isLong and high >= block.top
    block.isFilled := true
```

#### Visibility Management
Only the last `blocksToShow` unfilled blocks are displayed. Uses a two-pass system:
1. Collect all visible block indices
2. Mark only the last N as `shouldShow`
3. Create/update/delete boxes accordingly

### Feature 2: MASTER-FVG

#### Pivot Detection (3 methods)

**A. Pivot Points** (most reliable, delayed):
```pine
ta.pivotlow(low, pivotBars, pivotBars)   // needs X bars on both sides
ta.pivothigh(high, pivotBars, pivotBars)
```

**B. Local High/Low** (immediate, more noise):
```pine
isLocalLow = low < low[1] and low < low[2]     // lower than 2 neighbors
isLocalHigh = high > high[1] and high > high[2]
```

**C. Swing High/Low** (rolling window):
```pine
isSwingLow = low == ta.lowest(low, pivotBars)
isSwingHigh = high == ta.highest(high, pivotBars)
```

#### MASTER-FVG Construction
For each pivot point:
1. Find FVGs in the correct direction between this pivot and the next same-type pivot
2. Take up to `maxFVGsInMove` FVGs, use the last one's midpoint
3. Calculate MASTER box:
   ```
   Long:  height = (FVG_middle - pivot_low) * 2
          box = [pivot_low, pivot_low + height]
   Short: height = (pivot_high - FVG_middle) * 2
          box = [pivot_high - height, pivot_high]
   ```
4. The latest MASTER is marked `isCurrent` and extends to current bar

#### MASTER Invalidation
Two modes:
- **"Touch target"**: Deactivate when price reaches the full box edge
- **"Touch safety zone"**: Deactivate when price enters the target zone

#### Target Zone
```pine
zone_height = master_height * (target_percent / 100)
Long:  [master_top - zone_height, master_top]
Short: [master_bottom, master_bottom + zone_height]
```

### Feature 3: GAP Filter
Three modes for the GAP between FVG candles:
- **Show all** - no filtering
- **Only with GAP** - at least one candle pair must have no overlap
- **Only without GAP** - all candle pairs must overlap

---

## Visual Elements

### Boxes
| Type | Color | Purpose |
|------|-------|---------|
| Long FVG | Green border, green BG (90%) | Bullish FVG zone |
| Short FVG | Red border, red BG (90%) | Bearish FVG zone |
| Current MASTER | Blue border, blue BG (90%) | Active MASTER-FVG |
| Old MASTER | Gray border, gray BG (80%) | Previous MASTER-FVGs |
| Target zone (Long) | Green BG (80%) | Price target area |
| Target zone (Short) | Red BG (80%) | Price target area |

### Lines
| Type | Style | Purpose |
|------|-------|---------|
| FVG midpoint | Configurable (solid/dashed/dotted) | Center of FVG gap |
| MASTER midpoint | Same as FVG | Center of MASTER box |

### Drawing Lifecycle
All drawing happens on `barstate.islast`:
1. For FVG blocks: create if new, update right edge if existing, delete if hidden
2. For MASTER-FVGs: delete all, recalculate from pivot history, redraw active ones
3. For current/forming FVGs: create or update on each tick, delete when conditions fail

---

## Key Algorithms

### Visibility Sliding Window
```
1. Scan all blocks, collect indices where toShow=true
2. startIndex = max(0, total - blocksToShow)
3. Only blocks from startIndex onwards get shouldShow=true
4. Create/delete drawings based on shouldShow
```

### MASTER-FVG Matching
```
For each pivot (newest first):
  1. Find next same-type pivot (defines the "move" boundary)
  2. Scan FVGs between these pivots
  3. Only count FVGs in correct direction (low pivot -> long FVGs, high pivot -> short FVGs)
  4. Use the Nth FVG's midpoint (N = maxFVGsInMove)
  5. Build symmetric projection: 2x the pivot-to-FVG distance
```

### Pivot History Management
```pine
maxPivotHistory = 200
while array.size(pivotHistory) > maxPivotHistory
    array.shift(pivotHistory)  // remove oldest
```

---

## File Dependencies
- None (self-contained)
- Works on any timeframe
- No external data requests
