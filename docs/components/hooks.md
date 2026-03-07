# Custom React Hooks

Reusable data-fetching hooks for GannForce dashboard.

## Overview

All data fetching is encapsulated in custom hooks in `/GannForce/src/hooks/`. This enables:
- Centralized data logic
- Easy reuse across components
- Consistent error handling
- Loading state management

## useCotData()

Fetches latest COT scan and all asset data.

```typescript
const { data, loading, error, reportDate } = useCotData();
```

**Returns:**
```typescript
interface UseCotDataReturn {
  data: CotData | null;           // Grouped by category
  loading: boolean;
  error: string | null;
  reportDate: string | null;       // YYYY-MM-DD
}

type CotData = Record<string, CotAsset[]>;

interface CotAsset {
  code: string;
  name: string;
  report_date: string;
  contract: string;
  contract_unit: string;
  open_interest: number;
  change_in_open_interest: number;
  non_commercial: {
    long: number;
    short: number;
    spreads: number;
    net: number;
  };
  changes: {
    long: number;
    short: number;
    spreads: number;
  };
  pct_of_open_interest: {
    long: number;
    short: number;
    spreads: number;
  };
  unfulfilled_calls: number | null;
}
```

**Implementation:**
1. Query `cot_scans` for latest scan
2. Query `cot_data` for all assets in that scan
3. Group by category
4. Return with loading/error states

**Usage:**
```tsx
export function CotDashboard() {
  const { data, loading, error, reportDate } = useCotData();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>COT Report: {reportDate}</h1>
      {data && Object.entries(data).map(([category, assets]) => (
        <CategorySection key={category} category={category} assets={assets} />
      ))}
    </div>
  );
}
```

## useSentimentData()

Fetches sentiment data for specified symbols.

```typescript
const { data, loading, error } = useSentimentData(symbols);
```

**Parameters:**
- `symbols`: string[] - List of trading pair symbols (optional)

**Returns:**
```typescript
{
  data: SentimentData[] | null;
  loading: boolean;
  error: string | null;
}

interface SentimentData {
  symbol: string;
  short_pct: number;
  long_pct: number;
}
```

**Implementation:**
1. Query latest sentiment data
2. Filter by symbols if provided
3. Return with loading/error states

**Usage:**
```tsx
export function SentimentDashboard() {
  const { data, loading, error } = useSentimentData();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {data?.map((item) => (
        <SentimentRow key={item.symbol} {...item} />
      ))}
    </div>
  );
}
```

## useFastBullData()

Fetches latest FastBull order book data.

```typescript
const { data, loading, error } = useFastBullData();
```

**Returns:**
```typescript
{
  data: FastBullData[] | null;
  loading: boolean;
  error: string | null;
}

interface FastBullData {
  symbol: string;
  orders?: {
    currentPrice: string;
    buy_pct: number;
    sell_pct: number;
  };
  positions?: {
    currentPrice: string;
    long_pct: number;
    short_pct: number;
    long_profit_pct: number;
    long_loss_pct: number;
    short_profit_pct: number;
    short_loss_pct: number;
  };
}
```

**Implementation:**
1. Query `fastbull_data` table for latest scrape
2. Parse order and position data
3. Return with loading/error states

**Usage:**
```tsx
export function FastBullDashboard() {
  const { data, loading, error } = useFastBullData();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {data?.map((pair) => (
        <FastBullCard key={pair.symbol} data={pair} />
      ))}
    </div>
  );
}
```

## useDashboardData()

Aggregates all three data sources.

```typescript
const { cot, sentiment, fastbull, loading, error } = useDashboardData();
```

**Returns:**
```typescript
{
  cot: CotData | null;
  sentiment: SentimentData[] | null;
  fastbull: FastBullData[] | null;
  loading: boolean;
  error: string | null;
}
```

**Implementation:**
1. Call all three hooks in parallel
2. Combine loading states (loading = any loading)
3. Combine error states (error = first error)
4. Return aggregated data

**Usage:**
```tsx
export function CombinedDashboard() {
  const { cot, sentiment, fastbull, loading, error } = useDashboardData();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <CotSection data={cot} />
      <SentimentSection data={sentiment} />
      <FastBullSection data={fastbull} />
    </div>
  );
}
```

## Hook Patterns

### Loading State Management

```typescript
const [loading, setLoading] = useState(true);

useEffect(() => {
  async function fetchData() {
    setLoading(true);
    try {
      const { data } = await query();
      setData(data);
    } finally {
      setLoading(false);
    }
  }

  fetchData();
}, []);
```

### Error Handling

```typescript
const [error, setError] = useState<string | null>(null);

if (scanErr) {
  setError(`Failed to load COT scan: ${scanErr.message}`);
  setLoading(false);
  return;
}
```

### Data Grouping

```typescript
const grouped: Record<string, CotAsset[]> = {};
for (const row of rows) {
  if (!grouped[row.category]) {
    grouped[row.category] = [];
  }
  grouped[row.category].push(rowToAsset(row));
}
```

## Supabase Integration

All hooks use the Supabase client:

```typescript
import { supabase } from "@/lib/supabase";

// Query
const { data, error } = await supabase
  .from("table_name")
  .select("*")
  .order("field", { ascending: false })
  .limit(1)
  .single();
```

## Best Practices

1. **Always handle errors** - Provide meaningful error messages
2. **Set loading state** - Show UI feedback while fetching
3. **Use dependencies** - Add parameters to dependency array
4. **Reuse hooks** - Don't duplicate data fetching logic
5. **Type safely** - Define return types explicitly

## Adding New Hooks

1. Create file in `src/hooks/useNewData.ts`
2. Define interfaces for return type
3. Implement data fetching with loading/error states
4. Export hook
5. Use in components

Example:

```typescript
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface CustomData {
  id: string;
  value: number;
}

export function useCustomData() {
  const [data, setData] = useState<CustomData[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      const { data: rows, error: err } = await supabase
        .from("custom_table")
        .select("*");

      if (err) {
        setError(err.message);
      } else {
        setData(rows);
      }
      setLoading(false);
    }

    fetchData();
  }, []);

  return { data, loading, error };
}
```

## Related Documentation

- [GannForce Dashboard](../features/gannforce.md)
- [Supabase Integration](../api/supabase.md)
