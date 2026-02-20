# AI Agent Edge Function

Function path: `supabase/functions/ai-agent/index.ts`

## Required secrets

- `GEMINI_API_KEY`: Google Gemini API key
- `GEMINI_MODEL` (optional): defaults to `gemini-2.5-flash`
- `SUPABASE_URL`: project URL (normally available in Edge runtime)
- `SUPABASE_SERVICE_ROLE_KEY`: for read-only allowlist analytics queries in function

## Request shape

```json
{
  "model": "gemini-2.5-flash",
  "messages": [
    {
      "role": "user",
      "content": "Summarize finance performance"
    }
  ],
  "context": {
    "universe_policy": {},
    "finance": {},
    "operation": {},
    "market": {}
  },
  "requested_at": "2026-02-14T00:00:00.000Z"
}
```

## Response shape

```json
{
  "answer": "AI response text",
  "model": "gemini-2.5-flash",
  "generated_at": "2026-02-14T00:00:00.000Z",
  "usage": {},
  "citations": [
    {
      "id": "finance_invoices",
      "table": "finance_invoices",
      "domain": "finance",
      "fields": ["invoice", "invoice_date", "customer_name", "contract", "tons", "usd", "thb", "status_type"],
      "row_count": 123,
      "note": "Finance invoice records for monthly/customer analytics"
    }
  ],
  "tool_report": {
    "enabled": true,
    "mode": "allowlist-readonly-v1",
    "domains_requested": {
      "finance": true,
      "operation": true,
      "market": false
    },
    "tables_used": ["finance_invoices", "operation_contracts"],
    "errors": []
  },
  "intents_requested": {
    "monthly_performance": true,
    "top_customers": true,
    "risk_overdue": false,
    "stock_health": false,
    "market_concentration": false
  },
  "focused_views": {
    "question": "top 10 customers by tons",
    "intents": {},
    "views": {}
  },
  "row_counts": {
    "finance_invoices": 123
  }
}
```

## Notes

- This project is a static dashboard, so `app.js` calls the function via `supabaseClient.functions.invoke("ai-agent", ...)`.
- Function now enriches frontend context with server-side read-only allowlist analytics from:
  - `finance_invoices`
  - `operation_contracts`
  - `operation_lines`
  - `operation_deliveries`
  - `operation_stock`
  - `companies`
- Function includes an intent router that creates `focused_views` for:
  - monthly performance
  - top customers
  - overdue risk
  - stock health
  - market concentration
- If function auth is enabled, the browser must provide a valid Supabase Auth JWT.
- Do not hardcode API keys in frontend files. Keep keys in function secrets/environment only.

## Setup (CLI)

```bash
supabase secrets set GEMINI_API_KEY=YOUR_KEY
supabase secrets set GEMINI_MODEL=gemini-2.5-flash
supabase secrets set SUPABASE_URL=YOUR_PROJECT_URL
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
supabase functions deploy ai-agent
```
