# UAT Access Report (SQL/RLS)

Date: 2026-02-21

## Scope
- Verify data isolation for `1 user = 1 company` model at DB/RLS layer.
- Validate member vs non-member behavior using real users.

## Test Data Used
- Entity: `f272f7f4-3228-426c-bc84-6112987f63ce` (`TRR GROUP`)
- Member user: `4acf5de6-97d9-47dd-8e6e-733b8dbfdc1a` (`login@trrgroup.com`)
- Non-member simulation user: `57389b24-3a71-4eab-a039-757cd8cc1586` (temporarily set `is_active=false` inside transaction, then rollback)

## Result Summary
- PASS: Member user can read scoped domain data.
- PASS: Non-member simulation sees `0` rows on scoped domain data.
- PASS: Membership state restored after test (no persistent data change).

## Evidence

### 1) Mapping Coverage (entity-scoped)
- `market.companies`: source 14, mapped 14, gap 0
- `operation.operation_contracts`: source 134, mapped 134, gap 0
- `operation.operation_lines`: source 200, mapped 200, gap 0
- `operation.operation_deliveries`: source 226, mapped 226, gap 0
- `operation.operation_stock`: source 73, mapped 73, gap 0
- `finance.finance_invoices`: source 620, mapped 620, gap 0

### 2) Member Read Check (`login@trrgroup.com`)
- `companies`: 14
- `company_user_members`: 2
- `operation_contracts`: 134
- `finance_invoices`: 620
- `sugar_products`: 18

### 3) Non-member Read Check (temporary inactive membership)
- `companies`: 0
- `company_user_members`: 0
- `operation_contracts`: 0
- `finance_invoices`: 0
- `sugar_products`: 0

### 4) Post-check Membership Integrity
- Both users in `company_user_members` remain `is_active=true` after rollback.

## Notes
- This report validates DB/RLS behavior.
- UI-level UAT (view-by-view) is still recommended as a separate step with manual login flows.
