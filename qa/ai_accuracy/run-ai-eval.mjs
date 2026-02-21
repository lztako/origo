#!/usr/bin/env node

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || "";
const AI_TEST_EMAIL = process.env.AI_TEST_EMAIL || "";
const AI_TEST_PASSWORD = process.env.AI_TEST_PASSWORD || "";
const AI_TEST_COMPANY_NAME =
  process.env.AI_TEST_COMPANY_NAME || "COCA COLA BEVERAGES UGANDA LIMITED";

const REQUIRED_ENV_VARS = [
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "AI_TEST_EMAIL",
  "AI_TEST_PASSWORD"
];

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function toNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const normalized = String(value ?? "")
    .trim()
    .replace(/[, ]+/g, "");
  if (!normalized) return 0;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toFixedNumber(value, fraction = 2) {
  const numeric = toNumber(value);
  return Number(numeric.toFixed(fraction));
}

function normalizeStatus(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "green") return "green";
  if (normalized === "yellow") return "yellow";
  return "unknown";
}

function parseFirstJsonObject(text) {
  const source = String(text || "");
  for (let start = 0; start < source.length; start += 1) {
    if (source[start] !== "{") continue;
    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let index = start; index < source.length; index += 1) {
      const ch = source[index];
      if (inString) {
        if (escaped) {
          escaped = false;
          continue;
        }
        if (ch === "\\") {
          escaped = true;
          continue;
        }
        if (ch === "\"") {
          inString = false;
        }
        continue;
      }

      if (ch === "\"") {
        inString = true;
        continue;
      }
      if (ch === "{") {
        depth += 1;
      } else if (ch === "}") {
        depth -= 1;
        if (depth === 0) {
          const candidate = source.slice(start, index + 1);
          try {
            return JSON.parse(candidate);
          } catch (_error) {
            break;
          }
        }
      }
    }
  }
  return null;
}

async function authSignIn() {
  const url = `${SUPABASE_URL}/auth/v1/token?grant_type=password`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email: AI_TEST_EMAIL,
      password: AI_TEST_PASSWORD
    })
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body?.access_token) {
    fail(`Auth failed (${response.status}): ${body?.message || body?.error || "Unknown error"}`);
  }

  return body.access_token;
}

async function restSelect(pathWithQuery, accessToken) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${pathWithQuery}`, {
    method: "GET",
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json"
    }
  });

  const body = await response.json().catch(() => []);
  if (!response.ok) {
    throw new Error(`REST ${pathWithQuery} failed (${response.status}): ${JSON.stringify(body)}`);
  }
  return body;
}

async function callAiAgent(payload, accessToken) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-agent`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`AI call failed (${response.status}): ${body?.error || body?.message || "Unknown error"}`);
  }
  return body;
}

function createResult(name, pass, detail) {
  return { name, pass: Boolean(pass), detail: String(detail || "") };
}

function printResults(results) {
  for (const result of results) {
    const prefix = result.pass ? "PASS" : "FAIL";
    console.log(`${prefix} | ${result.name} | ${result.detail}`);
  }
  const passed = results.filter((item) => item.pass).length;
  const total = results.length;
  console.log(`\nSummary: ${passed}/${total} passed`);
  if (passed !== total) process.exit(1);
}

async function main() {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
  if (missing.length) {
    fail(`Missing required env vars: ${missing.join(", ")}`);
  }

  const accessToken = await authSignIn();

  const companyParams = new URLSearchParams();
  companyParams.set("select", "company_id,customer,status");
  companyParams.set("customer", `ilike.*${AI_TEST_COMPANY_NAME}*`);
  companyParams.set("order", "created_at.desc");
  companyParams.set("limit", "1");
  const companies = await restSelect(`companies?${companyParams.toString()}`, accessToken);
  if (!Array.isArray(companies) || !companies.length) {
    fail(`Target company not found by name: ${AI_TEST_COMPANY_NAME}`);
  }
  const company = companies[0];
  const companyId = String(company.company_id || "").trim();
  if (!companyId) fail("Target company has empty company_id");

  const overviewParams = new URLSearchParams();
  overviewParams.set("select", "total_purchase_value,purchase_value_last_12m");
  overviewParams.set("company_id", `eq.${companyId}`);
  overviewParams.set("limit", "1");
  const overviews = await restSelect(`company_overview?${overviewParams.toString()}`, accessToken);
  const overview = Array.isArray(overviews) && overviews.length ? overviews[0] : {};

  const financeParams = new URLSearchParams();
  financeParams.set("select", "usd");
  financeParams.set("limit", "5000");
  const financeRows = await restSelect(`finance_invoices?${financeParams.toString()}`, accessToken);

  const statusDefsParams = new URLSearchParams();
  statusDefsParams.set("select", "status_code,is_customer");
  statusDefsParams.set("limit", "100");
  const statusDefs = await restSelect(`market_status_definitions?${statusDefsParams.toString()}`, accessToken);

  const expectedTotalInvoices = financeRows.length;
  const expectedTotalUsd = toFixedNumber(
    financeRows.reduce((sum, row) => sum + toNumber(row?.usd), 0),
    2
  );
  const expectedTotalPurchaseValue = toFixedNumber(overview?.total_purchase_value, 2);
  const expectedPurchaseValueLast12m = toFixedNumber(overview?.purchase_value_last_12m, 2);
  const expectedStatus = normalizeStatus(company.status);
  const expectedIsCustomer = (() => {
    const match = (statusDefs || []).find((item) => String(item?.status_code || "").trim().toLowerCase() === expectedStatus);
    if (!match) return null;
    if (typeof match.is_customer === "boolean") return match.is_customer;
    return null;
  })();

  const results = [];

  const financeAnswer = await callAiAgent(
    {
      strict_server_only: true,
      model: "claude-sonnet-4-20250514",
      messages: [
        {
          role: "user",
          content:
            "Return JSON only with keys total_invoices,total_usd. Use current finance data summary. Numbers only, no commas."
        }
      ],
      context: {},
      requested_at: new Date().toISOString()
    },
    accessToken
  );
  const financeJson = parseFirstJsonObject(financeAnswer.answer);
  const financeInvoiceDiff = Math.abs(toNumber(financeJson?.total_invoices) - expectedTotalInvoices);
  const financeUsdDiff = Math.abs(toNumber(financeJson?.total_usd) - expectedTotalUsd);
  results.push(
    createResult(
      "finance_summary_json",
      Boolean(financeJson) && financeInvoiceDiff <= 0 && financeUsdDiff <= 1,
      `expected invoices=${expectedTotalInvoices}, usd=${expectedTotalUsd}; got ${JSON.stringify(financeJson)}`
    )
  );

  const companyMetricAnswer = await callAiAgent(
    {
      strict_server_only: true,
      mode: "company_detail",
      model: "claude-sonnet-4-20250514",
      messages: [
        {
          role: "user",
          content:
            "Return JSON only with keys total_purchase_value,purchase_value_last_12m for this company. Numbers only, no commas."
        }
      ],
      context: {
        context_scope: { company_id: companyId },
        company: { company_id: companyId }
      },
      requested_at: new Date().toISOString()
    },
    accessToken
  );
  const companyMetricJson = parseFirstJsonObject(companyMetricAnswer.answer);
  const totalPurchaseDiff = Math.abs(
    toNumber(companyMetricJson?.total_purchase_value) - expectedTotalPurchaseValue
  );
  const last12Diff = Math.abs(
    toNumber(companyMetricJson?.purchase_value_last_12m) - expectedPurchaseValueLast12m
  );
  results.push(
    createResult(
      "company_metric_mapping_json",
      Boolean(companyMetricJson) && totalPurchaseDiff <= 1 && last12Diff <= 1,
      `expected total=${expectedTotalPurchaseValue}, last12m=${expectedPurchaseValueLast12m}; got ${JSON.stringify(companyMetricJson)}`
    )
  );

  const statusAnswer = await callAiAgent(
    {
      strict_server_only: true,
      mode: "company_detail",
      model: "claude-sonnet-4-20250514",
      messages: [
        {
          role: "user",
          content: "Return JSON only with keys status,is_customer for this company."
        }
      ],
      context: {
        context_scope: { company_id: companyId },
        company: { company_id: companyId }
      },
      requested_at: new Date().toISOString()
    },
    accessToken
  );
  const statusJson = parseFirstJsonObject(statusAnswer.answer);
  const gotStatus = normalizeStatus(statusJson?.status);
  const gotIsCustomer = typeof statusJson?.is_customer === "boolean" ? statusJson.is_customer : null;
  const statusPass =
    Boolean(statusJson) &&
    gotStatus === expectedStatus &&
    (expectedIsCustomer === null || gotIsCustomer === expectedIsCustomer);
  results.push(
    createResult(
      "company_status_semantics_json",
      statusPass,
      `expected status=${expectedStatus}, is_customer=${expectedIsCustomer}; got ${JSON.stringify(statusJson)}`
    )
  );

  const tradeAnswer = await callAiAgent(
    {
      strict_server_only: true,
      model: "claude-sonnet-4-20250514",
      messages: [{ role: "user", content: "สรุป trade performance ของเราหน่อยครับสั้นๆ" }],
      context: {},
      requested_at: new Date().toISOString()
    },
    accessToken
  );
  const tradeText = String(tradeAnswer.answer || "").toLowerCase();
  const tradeLooksInsufficient =
    tradeText.includes("ข้อมูลไม่เพียงพอ") ||
    tradeText.includes("insufficient") ||
    tradeText.includes("no data");
  const tradeHasNumber = /\d/.test(tradeText);
  results.push(
    createResult(
      "trade_performance_no_insufficient",
      !tradeLooksInsufficient && tradeHasNumber,
      String(tradeAnswer.answer || "").slice(0, 240)
    )
  );

  printResults(results);
}

main().catch((error) => {
  fail(error?.message || "Unknown failure");
});

