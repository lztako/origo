# AGENTS.md

## Project Goal
This project is a Supabase-backed HTML dashboard for three business domains:
- Market intelligence (company profile and external trade context)
- Operations execution (contracts, lines, deliveries, stock)
- Finance analytics (invoice metrics and trends)

## Tech Stack
- Frontend: Vanilla HTML/CSS/JavaScript (no framework build step)
- Backend data: Supabase Postgres + Supabase Edge Function (`ai-agent`)
- Charts/Map: Chart.js, ChartDataLabels, Leaflet (CDN)

## Repository Map
- `index.html`, `app.js`, `styles.css`: main dashboard and view switching
- `company-detail.html`, `company-detail.js`: company detail page from Market table click
- `delivery-detail.html`, `delivery-detail.js`: delivery detail page
- `supabase/functions/ai-agent/index.ts`: AI Agent Edge Function
- `TODO.md`: task history

## Data Model (Current)
- Data universe separation:
  - `Market` = external intelligence universe
  - `Operation` + `Finance` = internal business universe
  - Treat them as separate domains by default.
- Market domain (company-based):
  - `public.companies`
  - `public.company_overview`
  - `public.company_info`
  - `public.company_email`
  - `public.company_contract`
  - `public.company_supplychain`
  - `public.company_history`
- Operations domain (renamed tables):
  - `public.operation_contracts` (was `contracts`)
  - `public.operation_lines` (was `contract_lines`)
  - `public.operation_deliveries` (was `deliveries`)
  - `public.operation_stock` (was `stock`)
- Finance domain:
  - `public.finance_invoices`

Important:
- Do not use old table names (`contracts`, `contract_lines`, `deliveries`, `stock`) in new code.
- Market (`companies`) is not yet directly linked to Operations/Finance with a canonical FK mapping table.
- Do not directly join external Market and internal Operation/Finance data without an explicit mapping layer (for example `company_entity_map`) and clear confidence/verification rules.

## Functional Notes
- Sidebar active views: `market-map`, `dashboard` (Operation), `finance`, `ai-agent`
- Company row click in Market opens `company-detail.html?company_id=...`
- Current company detail reads `companies` + `company_overview`; future expansion should include all `company_*` tables.

## Coding Conventions
- Keep implementation simple and explicit (no hidden abstractions).
- Prefer small, targeted edits over broad rewrites.
- Preserve existing visual language unless a redesign is explicitly requested.
- Use safe formatting/escaping for user-visible text.
- UI preference: Any vertical bar chart must follow the same chart block structure and styling used in Operation/Finance (`chart-block`, `chart-head`, range/control placement, and spacing).
- UI preference: Any vertical bar chart must hide Y-axis text/tick labels and must show data labels on top of bars (same behavior as Operation charts).
- UI preference: For `company-detail` Trade & Supply composition, use row order `chart -> table -> chart -> table`.

## Database Change Rules
- Use migrations for DDL changes (rename/create/alter/drop).
- Validate table/column existence before migrations when possible.
- After schema changes, update all dependent frontend queries in the same task.

## Local Run
No package scripts are currently defined.
Use a static server for local preview, for example:
- `python -m http.server 5500`
Then open `http://localhost:5500/index.html`.

## Validation Checklist For Changes
After edits, verify:
1. Dashboard loads without JS errors.
2. View switching works (`market-map`, `dashboard`, `finance`, `ai-agent`).
3. Company detail opens from Market table and shows data.
4. Supabase queries reference the correct table names (`operation_*`).
5. AI Agent panel still sends requests to `ai-agent` function.

## Collaboration Defaults For Codex
- Do not revert unrelated user changes.
- Do not run destructive commands unless explicitly requested.
- If requirements are ambiguous, implement a minimal safe version first, then ask focused follow-ups.
