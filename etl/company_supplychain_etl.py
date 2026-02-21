#!/usr/bin/env python3
"""Load company supply-chain rows into Supabase using one explicit snapshot_id."""

from __future__ import annotations

import argparse
import csv
import datetime as dt
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any, Dict, Iterable, List

ALLOWED_FIELDS = [
    "company_id",
    "exporter",
    "trades_sum",
    "trade_frequency_ratio",
    "kg_weight",
    "weight_ratio",
    "quantity",
    "quantity_ratio",
    "total_price_usd",
    "total_price_ratio",
    "created_at",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Ingest company_supplychain rows into Supabase with one snapshot_id."
    )
    parser.add_argument("--input", required=True, help="Input file (.json, .jsonl, .ndjson, .csv)")
    parser.add_argument("--supabase-url", default=os.getenv("SUPABASE_URL", ""), help="Supabase project URL")
    parser.add_argument(
        "--service-role-key",
        default=os.getenv("SUPABASE_SERVICE_ROLE_KEY", ""),
        help="Supabase service role key",
    )
    parser.add_argument("--snapshot-id", default="", help="Explicit snapshot_id. Auto-generated if omitted.")
    parser.add_argument("--snapshot-prefix", default="run", help="Prefix used when generating snapshot_id.")
    parser.add_argument("--chunk-size", type=int, default=500, help="Rows per RPC call (default: 500)")
    parser.add_argument(
        "--append",
        action="store_true",
        help="Append rows to existing snapshot_id instead of replacing it.",
    )
    parser.add_argument("--dry-run", action="store_true", help="Validate input and print summary without loading.")
    parser.add_argument("--report", default="", help="Optional path for JSON run report output.")
    return parser.parse_args()


def build_snapshot_id(prefix: str) -> str:
    timestamp = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    cleaned_prefix = (prefix or "run").strip().replace(" ", "_")
    return f"{cleaned_prefix}_{timestamp}"


def chunked(values: List[Dict[str, Any]], size: int) -> Iterable[List[Dict[str, Any]]]:
    safe_size = max(int(size or 0), 1)
    for start in range(0, len(values), safe_size):
        yield values[start : start + safe_size]


def load_rows(path: Path) -> List[Dict[str, Any]]:
    suffix = path.suffix.lower()
    if suffix == ".json":
        with path.open("r", encoding="utf-8") as file_obj:
            payload = json.load(file_obj)
        if isinstance(payload, list):
            return [row for row in payload if isinstance(row, dict)]
        if isinstance(payload, dict) and isinstance(payload.get("rows"), list):
            return [row for row in payload["rows"] if isinstance(row, dict)]
        raise ValueError("JSON input must be an array of objects or an object containing 'rows'.")

    if suffix in {".jsonl", ".ndjson"}:
        rows: List[Dict[str, Any]] = []
        with path.open("r", encoding="utf-8") as file_obj:
            for line in file_obj:
                text = line.strip()
                if not text:
                    continue
                row = json.loads(text)
                if isinstance(row, dict):
                    rows.append(row)
        return rows

    if suffix == ".csv":
        with path.open("r", encoding="utf-8-sig", newline="") as file_obj:
            reader = csv.DictReader(file_obj)
            return [dict(row) for row in reader]

    raise ValueError("Unsupported input extension. Use .json, .jsonl, .ndjson, or .csv.")


def clean_value(value: Any) -> Any:
    if isinstance(value, str):
        stripped = value.strip()
        return None if stripped == "" else stripped
    return value


def normalize_row(raw: Dict[str, Any]) -> Dict[str, Any]:
    row: Dict[str, Any] = {}
    for key in ALLOWED_FIELDS:
        if key in raw:
            row[key] = clean_value(raw.get(key))
    return row


def call_ingest_rpc(
    supabase_url: str,
    service_role_key: str,
    snapshot_id: str,
    rows: List[Dict[str, Any]],
    replace_snapshot: bool,
) -> List[Dict[str, Any]]:
    endpoint = f"{supabase_url.rstrip('/')}/rest/v1/rpc/ingest_company_supplychain_snapshot"
    payload = {
        "p_snapshot_id": snapshot_id,
        "p_rows": rows,
        "p_replace_snapshot": replace_snapshot,
    }
    body = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        endpoint,
        data=body,
        method="POST",
        headers={
            "apikey": service_role_key,
            "Authorization": f"Bearer {service_role_key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            raw = response.read().decode("utf-8")
            parsed = json.loads(raw) if raw else []
            if isinstance(parsed, list):
                return parsed
            if isinstance(parsed, dict):
                return [parsed]
            return []
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {error.code} from Supabase RPC: {detail}") from error


def main() -> int:
    args = parse_args()

    input_path = Path(args.input)
    if not input_path.exists():
        print(f"Input file not found: {input_path}", file=sys.stderr)
        return 1

    if not args.dry_run:
        if not args.supabase_url.strip():
            print("Missing --supabase-url (or SUPABASE_URL env var).", file=sys.stderr)
            return 1
        if not args.service_role_key.strip():
            print("Missing --service-role-key (or SUPABASE_SERVICE_ROLE_KEY env var).", file=sys.stderr)
            return 1

    snapshot_id = args.snapshot_id.strip() or build_snapshot_id(args.snapshot_prefix)
    rows_raw = load_rows(input_path)
    rows_normalized = [normalize_row(row) for row in rows_raw]

    valid_rows = [row for row in rows_normalized if row.get("company_id")]
    skipped_rows = len(rows_normalized) - len(valid_rows)

    summary: Dict[str, Any] = {
        "snapshot_id": snapshot_id,
        "input_path": str(input_path),
        "input_rows": len(rows_normalized),
        "valid_rows": len(valid_rows),
        "skipped_rows_missing_company_id": skipped_rows,
        "append_mode": bool(args.append),
        "chunk_size": max(int(args.chunk_size), 1),
        "chunks_sent": 0,
        "rows_inserted": 0,
        "companies_affected": 0,
        "rpc_results": [],
    }

    if not valid_rows:
        print("No valid rows to ingest (company_id is required).", file=sys.stderr)
        return 1

    if args.dry_run:
        print(json.dumps(summary, indent=2, ensure_ascii=False))
        return 0

    seen_companies = set()
    for index, batch in enumerate(chunked(valid_rows, args.chunk_size)):
        replace_snapshot = (not args.append) and index == 0
        result = call_ingest_rpc(
            supabase_url=args.supabase_url,
            service_role_key=args.service_role_key,
            snapshot_id=snapshot_id,
            rows=batch,
            replace_snapshot=replace_snapshot,
        )
        summary["chunks_sent"] += 1
        summary["rpc_results"].append(result)
        for item in result:
            summary["rows_inserted"] += int(item.get("rows_inserted", 0) or 0)
            summary["companies_affected"] = max(
                summary["companies_affected"],
                int(item.get("companies_affected", 0) or 0),
            )
        for row in batch:
            if row.get("company_id"):
                seen_companies.add(row["company_id"])

    summary["companies_affected_in_payload"] = len(seen_companies)
    print(json.dumps(summary, indent=2, ensure_ascii=False))

    if args.report.strip():
        report_path = Path(args.report)
        report_path.parent.mkdir(parents=True, exist_ok=True)
        report_path.write_text(json.dumps(summary, indent=2, ensure_ascii=False), encoding="utf-8")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
