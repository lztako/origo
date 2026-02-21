# Company Supplychain ETL

This folder contains a simple ETL runner that loads `company_supplychain` data through:

- RPC: `public.ingest_company_supplychain_snapshot`
- One explicit `snapshot_id` per run
- Optional Windows Task Scheduler registration

## 1) Prerequisites

- Python 3.9+ available in `PATH`
- Supabase URL and service role key
- Input file in one of these formats: `.json`, `.jsonl`, `.ndjson`, `.csv`

Set environment variables (PowerShell):

```powershell
$env:SUPABASE_URL = "https://<project-ref>.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "<service-role-key>"
```

## 2) Input format

Only these fields are used:

- `company_id` (required)
- `exporter`
- `trades_sum`
- `trade_frequency_ratio`
- `kg_weight`
- `weight_ratio`
- `quantity`
- `quantity_ratio`
- `total_price_usd`
- `total_price_ratio`
- `created_at`

JSON example:

```json
[
  {
    "company_id": "3e981037-7fad-4241-86d6-2fe0b08f7d84",
    "exporter": "GLOBAL MIND AGRICULTURE PTE LTD",
    "trades_sum": 5,
    "quantity": 22000,
    "kg_weight": 22000000,
    "total_price_usd": 9453535
  }
]
```

Committed sample file: `etl/company_supplychain.sample.json`

## 3) Run ETL manually

Python direct:

```powershell
python etl/company_supplychain_etl.py --input etl/input/company_supplychain.json

# try with sample payload first
python etl/company_supplychain_etl.py --input etl/company_supplychain.sample.json --dry-run
```

PowerShell wrapper:

```powershell
powershell -ExecutionPolicy Bypass -File etl/run_company_supplychain_etl.ps1 -InputPath etl/input/company_supplychain.json
```

Useful options:

- `--snapshot-id <id>`: use your explicit run id
- `--snapshot-prefix <prefix>`: auto id prefix (default: `run`)
- `--append`: append rows into same snapshot id (no replace)
- `--dry-run`: validate input without loading
- `--report <path>`: write JSON run report

## 4) Register daily schedule (Windows)

```powershell
powershell -ExecutionPolicy Bypass -File etl/register_company_supplychain_etl_task.ps1 -Time 02:00
```

Default task name is `CompanySupplychainETL`.

## 5) Idempotent behavior

- Default behavior replaces existing rows for the same `snapshot_id` on the first chunk.
- Next chunks in the same run append to that same snapshot.
- This allows safe reruns for the same snapshot id.
