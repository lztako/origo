# SPEC_TRADE_PERFORMANCE.md

## Objective
Build one focused `Trade Performance` page that helps users decide what to do next, not just read reports.

## Product Principles
1. Back to basics: show only metrics tied to sales, delivery, inventory, and cash.
2. One screen, one story: users should understand the current state in under 10 seconds.
3. Every number must show `period` and `unit` explicitly.
4. Fewer clicks: avoid split panels for related information.
5. Actionable output: include ranked action items with expected impact.

## In Scope (MVP)
1. Trade performance overview page (replace/simplify current Operation dashboard layout).
2. Period controls with year-over-year comparison.
3. Core KPI cards with clear definitions.
4. Two primary charts (trend + inventory signal).
5. Action queue table (impact-ranked).
6. Compact detail table for order/shipment.

## Out of Scope (MVP)
1. Full ERP workflow replication.
2. Automated decision-making without human review.
3. Cross-universe joins with Market data without explicit verified mapping.
4. Complex forecasting models.

## Data Boundaries
Use internal tables only:
- `public.operation_contracts`
- `public.operation_lines`
- `public.operation_deliveries`
- `public.operation_stock`
- `public.finance_invoices`

Do not directly join Market entities (`companies`, `company_*`) with internal entities unless a mapping layer exists.

## Page Layout (Single Page)
1. Header and filters
- Period selector: `12M / 24M / 36M`
- Compare mode: `Current vs Previous Year`
- Optional filters: customer, product, factory
- Visible text: `Data as of <timestamp>`

2. KPI cards (top row)
- `Total Sales (Tons)` for selected period
- `Total Delivered (Tons)` for selected period
- `Ending Inventory (Tons)` latest snapshot
- `Backlog (Tons)` = planned - delivered
- `Overdue Contracts (#)` with shared overdue logic
- `Collected Cash (USD)` from invoices (selected period)

3. Primary chart A
- `Sales vs Delivery by Month` (line or grouped bar)
- Show current year and previous year
- Always show month labels and units

4. Primary chart B
- `Inventory Trend and Risk Window`
- If monthly stock history exists: show monthly trend
- If not: show latest snapshot only and a clear warning: `Monthly stock history not available`

5. Action queue (most important block)
- Ranked table with columns:
  - Priority
  - Customer
  - Issue
  - Suggested action
  - Expected impact (USD/Tons)
  - Due date
  - Owner

6. Detail table (compact)
- `Order / Shipment` preview with simple pagination (`Prev` / `Next`)
- Purpose: quick verification, not full BI exploration

## Wireframe (Text)
```text
[ Trade Performance ] [12M|24M|36M] [Compare: YoY] [Customer] [Product] [Factory]  Data as of ...

[KPI] Sales Tons | Delivered Tons | Ending Inventory | Backlog | Overdue Contracts | Cash Collected

[Chart A: Sales vs Delivery Monthly (Current vs Previous Year)]

[Chart B: Inventory Trend / Snapshot + Risk Note]

[Action Queue - Impact Ranked]
Priority | Customer | Issue | Suggested Action | Impact | Due | Owner

[Order/Shipment Preview Table]
... rows ...
Prev | Next
```

## Metric Definitions (MVP)
1. `Total Sales (Tons)`
- Source: `operation_lines.ton`
- Period field: `operation_lines.date_to` (until order date is available)

2. `Total Delivered (Tons)`
- Source: `operation_deliveries.quantity`
- Period field: `operation_deliveries.delivery_date`

3. `Backlog (Tons)`
- Formula: `sum(planned ton) - sum(delivered quantity)` per filter scope

4. `Overdue Contracts`
- Shared logic with current overdue table:
  - due date passed
  - progress < 100%
- Keep one logic path to avoid mismatch between widgets

5. `Collected Cash (USD)`
- Source: `finance_invoices.usd`
- Period field: `finance_invoices.invoice_date`

6. `Ending Inventory`
- Source: `operation_stock.qty`
- If no historical date column exists, treat as latest point-in-time snapshot

## UX Requirements
1. No ambiguous labels like `Average Inventory` without formula and period.
2. Every chart title includes metric + period + unit.
3. Top customer widgets must define ranking basis (`by tons` or `by usd`) and timeframe.
4. Keep color semantics consistent for risk states.
5. Keep interaction cost low; avoid forcing users to hover for essential values.

## Admin Control Dependency (Next Phase)
To reduce manual Excel operations, add an admin input surface:
1. Manage key operational updates directly in app.
2. One-click lead signals in Market list (pin / deprioritize / follow-up request).
3. Simple audit trail: who changed what and when.

## Acceptance Criteria (MVP)
1. Users can read performance state without opening additional pages.
2. Each widget shows explicit period and unit.
3. KPI values are consistent with detail tables.
4. Action queue shows at least top 5 impact-ranked items.
5. Page remains usable when stock history is incomplete.

## Rollout Plan
1. Phase 1 (Today): layout simplification + KPI definitions + chart relabeling + action queue scaffold.
2. Phase 2: stabilize formulas, link filters, and finalize compact detail table.
3. Phase 3: admin control input flow + workflow notifications.
