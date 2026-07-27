# Graph Report - .  (2026-07-27)

## Corpus Check
- Corpus is ~41,187 words - fits in a single context window. You may not need a graph.

## Summary
- 228 nodes · 238 edges · 34 communities (15 shown, 19 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Package Dependencies
- App Pos
- App Page
- Tsconfig Compileroptions
- Package Devdependencies
- Ref Next
- App Shift
- Package Scripts
- Public Manifest
- App Admin
- App Layout
- App Inventory
- App Actions
- App Admin
- App Admin
- App Admin
- App Admin
- App Admin
- App Admin
- App Admin
- App Admin
- App Admin
- App Admin
- App Admin
- App Admin
- App Admin
- App Admin
- App Admin
- Next Config
- Eslint Config
- Supabase Lib
- Config Postcss

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 16 edges
2. `usePosStore` - 13 edges
3. `include` - 7 edges
4. `AdminReceivables()` - 6 edges
5. `loginWithPin()` - 5 edges
6. `scripts` - 5 edges
7. `ShiftPage()` - 4 edges
8. `xlsx` - 4 edges
9. `lib` - 4 edges
10. `createStockAdjustment()` - 3 edges

## Surprising Connections (you probably didn't know these)
- `Cart()` --calls--> `usePosStore`  [EXTRACTED]
  app/components/pos/Cart.tsx → lib/store/usePosStore.ts
- `CustomerModal()` --calls--> `usePosStore`  [EXTRACTED]
  app/components/pos/CustomerModal.tsx → lib/store/usePosStore.ts
- `ProductCard()` --calls--> `usePosStore`  [EXTRACTED]
  app/components/pos/ProductCard.tsx → lib/store/usePosStore.ts
- `CheckoutPage()` --calls--> `usePosStore`  [EXTRACTED]
  app/pos/checkout/page.tsx → lib/store/usePosStore.ts
- `PosPage()` --calls--> `usePosStore`  [EXTRACTED]
  app/pos/page.tsx → lib/store/usePosStore.ts

## Import Cycles
- None detected.

## Communities (34 total, 19 thin omitted)

### Community 0 - "Package Dependencies"
Cohesion: 0.09
Nodes (23): clsx, date-fns, @ducanh2912/next-pwa, idb, lucide-react, next, dependencies, clsx (+15 more)

### Community 1 - "App Pos"
Cohesion: 0.15
Nodes (14): Cart(), supabase, CustomerModal(), supabase, ProductCard(), ProductCardProps, ReportModalProps, supabase (+6 more)

### Community 2 - "App Page"
Cohesion: 0.14
Nodes (14): deleteTransaction(), deleteTransactions(), processTransaction(), supabase, RecapReportPage(), supabase, AdminSalesReports(), supabase (+6 more)

### Community 3 - "Tsconfig Compileroptions"
Cohesion: 0.11
Nodes (19): dom, dom.iterable, esnext, compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules (+11 more)

### Community 4 - "Package Devdependencies"
Cohesion: 0.12
Nodes (17): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, @types/node (+9 more)

### Community 5 - "Ref Next"
Cohesion: 0.20
Nodes (9): **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.ts, **/*.tsx, exclude (+1 more)

### Community 6 - "App Shift"
Cohesion: 0.39
Nodes (5): loginWithPin(), openShift(), supabase, AdminLoginPage(), ShiftPage()

### Community 7 - "Package Scripts"
Cohesion: 0.22
Nodes (8): name, private, scripts, build, dev, lint, start, version

### Community 8 - "Public Manifest"
Cohesion: 0.22
Nodes (8): background_color, description, display, icons, name, short_name, start_url, theme_color

### Community 9 - "App Admin"
Cohesion: 0.43
Nodes (7): AdminReceivables(), formatDate(), formatDateOnly(), isPast(), isToday(), startOfDay(), supabase

### Community 10 - "App Layout"
Cohesion: 0.25
Nodes (4): geistMono, geistSans, metadata, viewport

### Community 11 - "App Inventory"
Cohesion: 0.48
Nodes (5): createStockAdjustment(), deleteAdjustments(), supabase, StockAdjustments(), supabase

### Community 12 - "App Actions"
Cohesion: 0.38
Nodes (5): createPurchase(), PurchaseItemPayload, supabase, AdminPurchases(), supabase

## Knowledge Gaps
- **106 isolated node(s):** `supabase`, `supabase`, `PurchaseItemPayload`, `supabase`, `supabase` (+101 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **19 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `Package Dependencies` to `App Page`, `Package Scripts`?**
  _High betweenness centrality (0.123) - this node is a cross-community bridge._
- **Why does `xlsx` connect `App Page` to `Package Dependencies`?**
  _High betweenness centrality (0.099) - this node is a cross-community bridge._
- **What connects `supabase`, `supabase`, `PurchaseItemPayload` to the rest of the system?**
  _106 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Package Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._
- **Should `App Pos` be split into smaller, more focused modules?**
  _Cohesion score 0.14761904761904762 - nodes in this community are weakly interconnected._
- **Should `App Page` be split into smaller, more focused modules?**
  _Cohesion score 0.14035087719298245 - nodes in this community are weakly interconnected._
- **Should `Tsconfig Compileroptions` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._