# AI Accuracy Eval

Script: `qa/ai_accuracy/run-ai-eval.mjs`

Purpose:
- Validate `ai-agent` answers against live Supabase data.
- Catch mapping/semantics regressions (for example total vs last 12 months).

Required environment variables:
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `AI_TEST_EMAIL`
- `AI_TEST_PASSWORD`
- `AI_TEST_COMPANY_NAME` (optional, default: `COCA COLA BEVERAGES UGANDA LIMITED`)

Run (PowerShell):

```powershell
$env:SUPABASE_URL='https://YOUR_PROJECT.supabase.co'
$env:SUPABASE_PUBLISHABLE_KEY='YOUR_PUBLISHABLE_KEY'
$env:AI_TEST_EMAIL='login@example.com'
$env:AI_TEST_PASSWORD='password'
node qa\ai_accuracy\run-ai-eval.mjs
```

Checks:
1. `finance_summary_json`
2. `company_metric_mapping_json`
3. `company_status_semantics_json`
4. `trade_performance_no_insufficient`

Exit code:
- `0` when all checks pass
- `1` when any check fails
