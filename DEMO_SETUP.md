# Demo Environment Setup

This setup keeps demo traffic isolated from production while still using the same static website deployment.

## 1) Configure Frontend Env Switching

1. Open `supabase-env.js`.
2. Keep `prod` values as-is.
3. Replace `demo.url` and `demo.publishableKey` with your demo project values.
4. Commit and push to Git.

Users can access demo mode from the same host with:

- `login.html?env=demo`

The app stores this mode in browser storage and keeps `env=demo` in important navigation URLs.

## 2) Create Demo Auth User

Create one user in demo project Auth (example: `demo@yourcompany.com`) with a known password for sales/demo usage.

## 3) Seed High-Quality Mock Data

In demo project, run in order:

1. `supabase db push --linked` (applies `20260222191500_demo_baseline_schema.sql`)
2. Open `supabase/sql/demo_seed_full.sql`
3. Update `v_demo_email` if needed
4. Run the script

What it seeds:

- Market: `companies`, `company_overview`, `company_info`, `company_email`, `company_contract`, `company_history`, `company_supplychain`
- Operations: `operation_contracts`, `operation_lines`, `operation_deliveries`, `operation_stock`
- Finance: `finance_invoices`
- Product catalog source rows: `sugar_products`

Safety behavior:

- The seed script aborts if non-demo rows are found in core business tables.
- Demo rows are tagged with `DEMO-*` patterns for safe reseed/reset.

## 4) Optional Reset

To clean demo rows and reseed:

1. Run `supabase/sql/demo_reset.sql`
2. Run `supabase/sql/demo_seed_full.sql` again

## 5) AI Agent on Demo

Deploy `ai-agent` to demo project.

Current demo setup uses:

- `--no-verify-jwt` at gateway level
- in-function token validation (`auth.getUser()`) still active
- deterministic fallback if `ANTHROPIC_API_KEY` is not configured

Required outcome:

- Demo frontend (`env=demo`) calls demo `ai-agent`
- Demo AI reads/writes only demo project data
- No production secrets in demo function config

## 6) Demo Runbook (Sales Usage)

1. Open `login.html?env=demo`
2. Sign in with the demo account
3. Walk Market -> Operation -> Finance -> AI Agent
4. If data is modified during sessions, run reset + reseed before next customer demo
