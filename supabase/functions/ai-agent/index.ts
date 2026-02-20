import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const MAX_CONTINUATION_ROUNDS = 2;
const MAX_CONTEXT_ROWS = 5000;
const FINANCE_MONTH_WINDOW = 18;
const OPERATION_MONTH_WINDOW = 18;
const TOP_CUSTOMER_LIMIT = 10;
const MAX_MESSAGES_FOR_MODEL = 10;
const MAX_MESSAGE_CHARS = 1200;
const MAX_PROMPT_CHARS = 1200;

type NormalizedMessage = { role: "user" | "assistant"; content: string };
type DomainSelection = { finance: boolean; operation: boolean; market: boolean; product: boolean };
type IntentSelection = {
  monthly_performance: boolean;
  top_customers: boolean;
  risk_overdue: boolean;
  stock_health: boolean;
  market_concentration: boolean;
  product_catalog: boolean;
};
type SourceCitation = {
  id: string;
  table: string;
  domain: "finance" | "operation" | "market" | "product";
  fields: string[];
  row_count: number;
  note: string;
};

type AnthropicMessage = { role: "user" | "assistant"; content: string };

type AnthropicRequestInput = {
  anthropicKey: string;
  model: string;
  systemInstruction: string;
  messages: AnthropicMessage[];
};

type AllowlistTableSpec = {
  id: string;
  domain: "finance" | "operation" | "market" | "product";
  table: string;
  select: string;
  fields: string[];
  note: string;
  orderBy?: string;
  ascending?: boolean;
  notNull?: string;
  limit?: number;
};

const ALLOWLIST_TABLES: AllowlistTableSpec[] = [
  {
    id: "finance_invoices",
    domain: "finance",
    table: "finance_invoices",
    select: "invoice, invoice_date, customer_name, contract, tons, usd, thb, status_type",
    fields: ["invoice", "invoice_date", "customer_name", "contract", "tons", "usd", "thb", "status_type"],
    note: "Finance invoice records for monthly/customer analytics",
    orderBy: "invoice_date",
    ascending: false,
    notNull: "invoice_date",
    limit: MAX_CONTEXT_ROWS
  },
  {
    id: "operation_contracts",
    domain: "operation",
    table: "operation_contracts",
    select: "contract_id, customer",
    fields: ["contract_id", "customer"],
    note: "Operation contracts by customer",
    limit: MAX_CONTEXT_ROWS
  },
  {
    id: "operation_lines",
    domain: "operation",
    table: "operation_lines",
    select: "contract_id, job, ton, status, date_to",
    fields: ["contract_id", "job", "ton", "status", "date_to"],
    note: "Operation planned tons and due dates",
    limit: MAX_CONTEXT_ROWS
  },
  {
    id: "operation_deliveries",
    domain: "operation",
    table: "operation_deliveries",
    select: "contract_id, job, quantity, delivery_date",
    fields: ["contract_id", "job", "quantity", "delivery_date"],
    note: "Operation delivered tons over time",
    limit: MAX_CONTEXT_ROWS
  },
  {
    id: "operation_stock",
    domain: "operation",
    table: "operation_stock",
    select: "factory, type, qty",
    fields: ["factory", "type", "qty"],
    note: "Operation stock snapshot",
    limit: MAX_CONTEXT_ROWS
  },
  {
    id: "sugar_products",
    domain: "product",
    table: "sugar_products",
    select:
      "id, product_name_en, product_name_th, brand, ref_no, spec_date, appearance, method_of_production, color_icumsa, polarization_z, net_wt, country_of_origin",
    fields: [
      "id",
      "product_name_en",
      "product_name_th",
      "brand",
      "ref_no",
      "spec_date",
      "appearance",
      "method_of_production",
      "color_icumsa",
      "polarization_z",
      "net_wt",
      "country_of_origin"
    ],
    note: "Product catalog specifications",
    orderBy: "spec_date",
    ascending: false,
    limit: MAX_CONTEXT_ROWS
  },
  {
    id: "companies",
    domain: "market",
    table: "companies",
    select: "company_id, customer, location, status, trades, supplier_number, value_tag, latest_purchase_time",
    fields: ["company_id", "customer", "location", "status", "trades", "supplier_number", "value_tag", "latest_purchase_time"],
    note: "Market company intelligence universe",
    orderBy: "created_at",
    ascending: false,
    limit: MAX_CONTEXT_ROWS
  },
  {
    id: "market_status_definitions",
    domain: "market",
    table: "market_status_definitions",
    select: "status_code, label_th, label_en, is_customer, description, sort_order",
    fields: ["status_code", "label_th", "label_en", "is_customer", "description", "sort_order"],
    note: "Market status semantic definitions",
    orderBy: "sort_order",
    ascending: true,
    limit: 100
  }
];

function toJson(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}

function toNumber(value: unknown): number {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function trimText(value: unknown, maxChars: number): string {
  const text = String(value || "").trim();
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars - 3)}...`;
}

function formatMetricNumber(value: unknown): string {
  const numeric = toNumber(value);
  if (Number.isInteger(numeric)) return numeric.toLocaleString("en-US");
  return numeric.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

function monthKey(dateString: unknown): string | null {
  if (!dateString) return null;
  const [year, month] = String(dateString).split("-");
  if (!year || !month) return null;
  return `${year}-${month}`;
}

function getTodayDateString(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeMarketStatus(value: unknown): "green" | "yellow" | "unknown" {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "green") return "green";
  if (normalized === "yellow") return "yellow";
  return "unknown";
}

function extractAnthropicText(payload: any): string {
  const parts = Array.isArray(payload?.content) ? payload.content : [];
  const texts = parts
    .map((part: any) => (part?.type === "text" && typeof part?.text === "string" ? part.text : ""))
    .filter((text: string) => text.trim() !== "");
  return texts.join("\n").trim();
}

function extractFinishReason(payload: any): string {
  return String(payload?.stop_reason || payload?.finishReason || "").trim();
}

function formatNumberTokenWithCommas(token: string): string {
  if (!/^\d+(?:\.\d+)?$/.test(token)) return token;
  if (token.includes(",")) return token;

  const [intPart, decimalPart] = token.split(".");
  const intValue = Number(intPart);
  if (!Number.isFinite(intValue)) return token;

  // Avoid converting year-like values such as 2024 to 2,024.
  if (!decimalPart && intPart.length === 4 && intValue >= 1900 && intValue <= 2100) {
    return token;
  }

  const normalizedDecimal = decimalPart ? decimalPart.replace(/0+$/, "") : "";
  const maxFractionDigits = normalizedDecimal ? Math.min(normalizedDecimal.length, 6) : 0;
  return Number(token).toLocaleString("en-US", {
    minimumFractionDigits: maxFractionDigits,
    maximumFractionDigits: maxFractionDigits
  });
}

function enforceMinimalAnswerStyle(answer: string): string {
  let text = String(answer || "");

  // Remove verbose source tags from the response body.
  text = text.replace(/\s*\[source:\s*[^\]]+\]/gi, "");
  text = text.replace(/^\s*sources?\s*:\s*.*$/gim, "");

  // Add thousand separators to numeric tokens when applicable.
  text = text.replace(/(?<![\w\-,])\d+(?:\.\d+)?(?![\w\-,])/g, (token) => formatNumberTokenWithCommas(token));
  text = text.replace(/(\d{1,3}(?:,\d{3})+)\.0+(?!\d)/g, "$1");

  text = text.replace(/\n{3,}/g, "\n\n").trim();
  return text;
}

function normalizeMessages(messages: any[]): NormalizedMessage[] {
  return messages
    .map((message) => ({
      role: message?.role === "assistant" ? "assistant" : "user",
      content: trimText(message?.content, MAX_MESSAGE_CHARS)
    }))
    .filter((message) => message.content !== "");
}

function getLatestUserQuestion(prompt: string, messages: NormalizedMessage[]): string {
  const latestUser = [...messages].reverse().find((message) => message.role === "user");
  return String(latestUser?.content || prompt || "").trim();
}

function detectRequestedDomains(question: string): DomainSelection {
  const normalized = String(question || "").toLowerCase();

  const finance = /(finance|invoice|usd|thb|credit|customer_name|billing|revenue|top\s*customer)/i.test(normalized);
  const operation = /(operation|contract|delivery|deliveries|planned|fulfilled|fulfillment|stock|ton|tons|job|overdue)/i.test(normalized);
  const market = /(market|company|companies|trade|supplier|country|external|intelligence)/i.test(normalized);
  const product =
    /(product|products|sku|catalog|spec|specification|ref|brand|icumsa|polarization|origin|sugar_products|สินค้า|แคตตาล็อก|สเปค|น้ำตาล)/i.test(
      normalized
    );

  if (!finance && !operation && !market && !product) {
    return { finance: true, operation: true, market: true, product: true };
  }

  return { finance, operation, market, product };
}

function detectRequestedIntents(question: string): IntentSelection {
  const normalized = String(question || "").toLowerCase();

  const monthly_performance = /(monthly|month|mom|trend|time\s*series|รายเดือน|เทรนด์)/i.test(normalized);
  const top_customers = /(top\s*\d*|top\s*customer|ลูกค้าอันดับ|ranking|rank|อันดับ)/i.test(normalized);
  const risk_overdue = /(overdue|delay|late|risk|backlog|pending|ค้าง|เสี่ยง|ล่าช้า)/i.test(normalized);
  const stock_health = /(stock|inventory|qty|warehouse|factory|คลัง|สต็อก)/i.test(normalized);
  const market_concentration = /(concentration|share|country|market|supplier|ประเทศ|สัดส่วน|กระจุกตัว)/i.test(normalized);
  const market_status = /(yellow|green|prospect|customer|ยังไม่เป็นลูกค้า|เป็นลูกค้า)/i.test(normalized);
  const product_catalog =
    /(product|products|sku|catalog|spec|specification|ref|brand|icumsa|polarization|origin|สินค้า|แคตตาล็อก|สเปค|น้ำตาล)/i.test(
      normalized
    );

  if (
    !monthly_performance &&
    !top_customers &&
    !risk_overdue &&
    !stock_health &&
    !market_concentration &&
    !market_status &&
    !product_catalog
  ) {
    return {
      monthly_performance: true,
      top_customers: true,
      risk_overdue: true,
      stock_health: true,
      market_concentration: true,
      product_catalog: true
    };
  }

  return {
    monthly_performance,
    top_customers,
    risk_overdue,
    stock_health,
    market_concentration: market_concentration || market_status,
    product_catalog
  };
}

function getSupabaseAdminClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return null;

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

async function loadAllowlistedTable(client: any, spec: AllowlistTableSpec) {
  try {
    let query = client
      .from(spec.table)
      .select(spec.select)
      .limit(spec.limit || MAX_CONTEXT_ROWS);

    if (spec.notNull) {
      query = query.not(spec.notNull, "is", null);
    }

    if (spec.orderBy) {
      query = query.order(spec.orderBy, { ascending: Boolean(spec.ascending) });
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(error.message || "unknown error");
    }

    const rows = Array.isArray(data) ? data : [];
    const citation: SourceCitation = {
      id: spec.id,
      table: spec.table,
      domain: spec.domain,
      fields: spec.fields,
      row_count: rows.length,
      note: spec.note
    };

    return { rows, citation, error: null };
  } catch (error) {
    const citation: SourceCitation = {
      id: spec.id,
      table: spec.table,
      domain: spec.domain,
      fields: spec.fields,
      row_count: 0,
      note: spec.note
    };

    return {
      rows: [],
      citation,
      error: String((error as Error)?.message || "failed to load table")
    };
  }
}

function buildFinanceSummary(rows: any[]) {
  let tonsTotal = 0;
  let usdTotal = 0;
  let thbTotal = 0;

  rows.forEach((row) => {
    tonsTotal += toNumber(row?.tons);
    usdTotal += toNumber(row?.usd);
    thbTotal += toNumber(row?.thb);
  });

  return {
    total_invoices: rows.length,
    total_tons: Number(tonsTotal.toFixed(2)),
    total_usd: Number(usdTotal.toFixed(2)),
    total_thb: Number(thbTotal.toFixed(2))
  };
}

function buildFinanceMonthlyPerformance(rows: any[], months = FINANCE_MONTH_WINDOW) {
  const monthly = new Map<string, { invoices: number; tons: number; usd: number; thb: number }>();

  rows.forEach((row) => {
    const key = monthKey(row?.invoice_date);
    if (!key) return;

    if (!monthly.has(key)) {
      monthly.set(key, { invoices: 0, tons: 0, usd: 0, thb: 0 });
    }

    const bucket = monthly.get(key)!;
    bucket.invoices += 1;
    bucket.tons += toNumber(row?.tons);
    bucket.usd += toNumber(row?.usd);
    bucket.thb += toNumber(row?.thb);
  });

  const allMonths = Array.from(monthly.keys()).sort((left, right) => left.localeCompare(right));
  const recentMonths = allMonths.slice(-months);

  return recentMonths.map((month) => {
    const bucket = monthly.get(month)!;
    return {
      month,
      invoices: bucket.invoices,
      tons: Number(bucket.tons.toFixed(2)),
      usd: Number(bucket.usd.toFixed(2)),
      thb: Number(bucket.thb.toFixed(2))
    };
  });
}

function buildFinanceMonthlyHighlights(monthlyRows: any[]) {
  if (!Array.isArray(monthlyRows) || monthlyRows.length < 2) return [];

  const highlights = [];
  for (let index = 1; index < monthlyRows.length; index += 1) {
    const previous = monthlyRows[index - 1];
    const current = monthlyRows[index];
    const prevUsd = toNumber(previous?.usd);
    const currUsd = toNumber(current?.usd);
    const deltaUsd = currUsd - prevUsd;
    const momPercent = prevUsd > 0 ? (deltaUsd / prevUsd) * 100 : null;

    highlights.push({
      month: String(current?.month || ""),
      usd: Number(currUsd.toFixed(2)),
      usd_delta_mom: Number(deltaUsd.toFixed(2)),
      usd_mom_percent: momPercent === null ? null : Number(momPercent.toFixed(2))
    });
  }

  return highlights.slice(-12);
}

function buildFinanceTopCustomers(rows: any[], sortBy: "usd" | "tons", limit = TOP_CUSTOMER_LIMIT) {
  const byCustomer = new Map<string, { invoices: number; tons: number; usd: number; thb: number; contracts: Set<string> }>();

  rows.forEach((row) => {
    const customer = String(row?.customer_name || "").trim();
    if (!customer) return;

    if (!byCustomer.has(customer)) {
      byCustomer.set(customer, {
        invoices: 0,
        tons: 0,
        usd: 0,
        thb: 0,
        contracts: new Set()
      });
    }

    const bucket = byCustomer.get(customer)!;
    bucket.invoices += 1;
    bucket.tons += toNumber(row?.tons);
    bucket.usd += toNumber(row?.usd);
    bucket.thb += toNumber(row?.thb);

    const contractId = String(row?.contract || "").trim();
    if (contractId) {
      bucket.contracts.add(contractId);
    }
  });

  return Array.from(byCustomer.entries())
    .map(([customer, bucket]) => ({
      customer,
      invoices: bucket.invoices,
      contract_count: bucket.contracts.size,
      tons: Number(bucket.tons.toFixed(2)),
      usd: Number(bucket.usd.toFixed(2)),
      thb: Number(bucket.thb.toFixed(2)),
      avg_usd_per_invoice: bucket.invoices > 0 ? Number((bucket.usd / bucket.invoices).toFixed(2)) : 0
    }))
    .sort((left, right) => toNumber(right[sortBy]) - toNumber(left[sortBy]))
    .slice(0, limit)
    .map((row, index) => ({ rank: index + 1, ...row }));
}

function buildOperationMonthlyPerformance(deliveries: any[], months = OPERATION_MONTH_WINDOW) {
  const monthly = new Map<string, { delivery_count: number; delivered_tons: number }>();

  deliveries.forEach((row) => {
    const key = monthKey(row?.delivery_date);
    if (!key) return;

    if (!monthly.has(key)) {
      monthly.set(key, { delivery_count: 0, delivered_tons: 0 });
    }

    const bucket = monthly.get(key)!;
    bucket.delivery_count += 1;
    bucket.delivered_tons += toNumber(row?.quantity);
  });

  const allMonths = Array.from(monthly.keys()).sort((left, right) => left.localeCompare(right));
  const recentMonths = allMonths.slice(-months);

  return recentMonths.map((month) => {
    const bucket = monthly.get(month)!;
    return {
      month,
      delivery_count: bucket.delivery_count,
      delivered_tons: Number(bucket.delivered_tons.toFixed(2))
    };
  });
}

type OperationDeliveryMaps = {
  deliveredByContract: Map<string, number>;
  deliveredByContractJob: Map<string, number>;
};

function buildOperationContractJobKey(contractId: unknown, job: unknown): string {
  const contract = String(contractId || "").trim();
  const normalizedJob = String(job || "").trim().toLowerCase();
  return `${contract}::${normalizedJob}`;
}

function buildOperationDeliveryMaps(deliveries: any[]): OperationDeliveryMaps {
  const deliveredByContract = new Map<string, number>();
  const deliveredByContractJob = new Map<string, number>();

  deliveries.forEach((row) => {
    const contractId = String(row?.contract_id || "").trim();
    const quantity = toNumber(row?.quantity);
    if (!contractId) return;

    deliveredByContract.set(contractId, toNumber(deliveredByContract.get(contractId)) + quantity);

    const job = String(row?.job || "").trim();
    if (!job) return;
    const key = buildOperationContractJobKey(contractId, job);
    deliveredByContractJob.set(key, toNumber(deliveredByContractJob.get(key)) + quantity);
  });

  return { deliveredByContract, deliveredByContractJob };
}

function estimateOperationLineDeliveredTons(line: any, deliveryMaps: OperationDeliveryMaps): number {
  const contractId = String(line?.contract_id || "").trim();
  if (!contractId) return 0;

  const job = String(line?.job || "").trim();
  if (job) {
    const byJob = toNumber(
      deliveryMaps.deliveredByContractJob.get(buildOperationContractJobKey(contractId, job))
    );
    if (byJob > 0) {
      return byJob;
    }
  }

  return toNumber(deliveryMaps.deliveredByContract.get(contractId));
}

function buildOperationTopCustomersByContractTons(contracts: any[], lines: any[], deliveries: any[], limit = TOP_CUSTOMER_LIMIT) {
  const contractToCustomer = new Map<string, string>();
  contracts.forEach((row) => {
    const contractId = String(row?.contract_id || "").trim();
    if (!contractId) return;
    const customer = String(row?.customer || "").trim() || "Unknown";
    contractToCustomer.set(contractId, customer);
  });

  const plannedByContract = new Map<string, number>();
  lines.forEach((row) => {
    const contractId = String(row?.contract_id || "").trim();
    if (!contractId) return;
    plannedByContract.set(contractId, toNumber(plannedByContract.get(contractId)) + toNumber(row?.ton));
  });

  const deliveredByContract = new Map<string, number>();
  deliveries.forEach((row) => {
    const contractId = String(row?.contract_id || "").trim();
    if (!contractId) return;
    deliveredByContract.set(contractId, toNumber(deliveredByContract.get(contractId)) + toNumber(row?.quantity));
  });

  const allContractIds = new Set<string>([
    ...contractToCustomer.keys(),
    ...plannedByContract.keys(),
    ...deliveredByContract.keys()
  ]);

  const byCustomer = new Map<string, { contracts: Set<string>; planned_tons: number; delivered_tons: number }>();

  allContractIds.forEach((contractId) => {
    const customer = contractToCustomer.get(contractId) || "Unknown";
    if (!byCustomer.has(customer)) {
      byCustomer.set(customer, {
        contracts: new Set<string>(),
        planned_tons: 0,
        delivered_tons: 0
      });
    }

    const bucket = byCustomer.get(customer)!;
    bucket.contracts.add(contractId);
    bucket.planned_tons += toNumber(plannedByContract.get(contractId));
    bucket.delivered_tons += toNumber(deliveredByContract.get(contractId));
  });

  return Array.from(byCustomer.entries())
    .map(([customer, bucket]) => {
      const planned = bucket.planned_tons;
      const delivered = bucket.delivered_tons;
      return {
        customer,
        contract_count: bucket.contracts.size,
        planned_tons: Number(planned.toFixed(2)),
        delivered_tons: Number(delivered.toFixed(2)),
        remaining_tons: Number((planned - delivered).toFixed(2)),
        fulfillment_percent: planned > 0 ? Number(((delivered / planned) * 100).toFixed(2)) : 0
      };
    })
    .sort((left, right) => right.planned_tons - left.planned_tons)
    .slice(0, limit)
    .map((row, index) => ({ rank: index + 1, ...row }));
}

function buildOperationOverdueByCustomer(contracts: any[], lines: any[], deliveries: any[], limit = TOP_CUSTOMER_LIMIT) {
  const today = getTodayDateString();
  const deliveryMaps = buildOperationDeliveryMaps(deliveries);
  const contractToCustomer = new Map<string, string>();

  contracts.forEach((row) => {
    const contractId = String(row?.contract_id || "").trim();
    if (!contractId) return;
    contractToCustomer.set(contractId, String(row?.customer || "Unknown").trim() || "Unknown");
  });

  const byCustomer = new Map<string, { overdue_lines: number; overdue_planned_tons: number; overdue_delivered_tons: number }>();
  const ensureCustomer = (customer: string) => {
    if (!byCustomer.has(customer)) {
      byCustomer.set(customer, { overdue_lines: 0, overdue_planned_tons: 0, overdue_delivered_tons: 0 });
    }
    return byCustomer.get(customer)!;
  };

  lines.forEach((line) => {
    const dueDate = String(line?.date_to || "");
    if (!dueDate || dueDate >= today) return;

    const contractId = String(line?.contract_id || "").trim();
    const plannedTon = toNumber(line?.ton);
    const deliveredTon = estimateOperationLineDeliveredTons(line, deliveryMaps);
    const progress = plannedTon > 0 ? (deliveredTon / plannedTon) * 100 : 0;
    if (progress >= 100) return;

    const customer = contractToCustomer.get(contractId) || "Unknown";
    const bucket = ensureCustomer(customer);
    bucket.overdue_lines += 1;
    bucket.overdue_planned_tons += plannedTon;
    bucket.overdue_delivered_tons += deliveredTon;
  });

  return Array.from(byCustomer.entries())
    .map(([customer, value]) => {
      const remaining = value.overdue_planned_tons - value.overdue_delivered_tons;
      return {
        customer,
        overdue_lines: value.overdue_lines,
        overdue_planned_tons: Number(value.overdue_planned_tons.toFixed(2)),
        overdue_delivered_tons: Number(value.overdue_delivered_tons.toFixed(2)),
        overdue_remaining_tons: Number(remaining.toFixed(2))
      };
    })
    .sort((left, right) => right.overdue_remaining_tons - left.overdue_remaining_tons)
    .slice(0, limit)
    .map((row, index) => ({ rank: index + 1, ...row }));
}

function buildOperationStockByFactory(stock: any[], limit = TOP_CUSTOMER_LIMIT) {
  const byFactory = new Map<string, number>();
  stock.forEach((row) => {
    const factory = String(row?.factory || "Unknown").trim() || "Unknown";
    byFactory.set(factory, toNumber(byFactory.get(factory)) + toNumber(row?.qty));
  });

  return Array.from(byFactory.entries())
    .map(([factory, qty]) => ({ factory, qty: Number(qty.toFixed(2)) }))
    .sort((left, right) => right.qty - left.qty)
    .slice(0, limit)
    .map((row, index) => ({ rank: index + 1, ...row }));
}

function buildOperationStockByType(stock: any[], limit = TOP_CUSTOMER_LIMIT) {
  const byType = new Map<string, number>();
  stock.forEach((row) => {
    const type = String(row?.type || "unknown").trim() || "unknown";
    byType.set(type, toNumber(byType.get(type)) + toNumber(row?.qty));
  });

  return Array.from(byType.entries())
    .map(([type, qty]) => ({
      type,
      qty: Number(qty.toFixed(2))
    }))
    .sort((left, right) => right.qty - left.qty)
    .slice(0, limit);
}

function buildOperationSummary(contracts: any[], lines: any[], deliveries: any[], stock: any[]) {
  const deliveryMaps = buildOperationDeliveryMaps(deliveries);

  let plannedTons = 0;
  let deliveredTonsEstimate = 0;
  let completedLines = 0;
  let overdueLines = 0;
  let pendingLines = 0;
  const today = getTodayDateString();

  lines.forEach((line) => {
    const plannedTon = toNumber(line?.ton);
    plannedTons += plannedTon;

    const delivered = estimateOperationLineDeliveredTons(line, deliveryMaps);

    deliveredTonsEstimate += delivered;
    const progress = plannedTon > 0 ? (delivered / plannedTon) * 100 : 0;

    if (progress >= 100) {
      completedLines += 1;
    } else if (line?.date_to && String(line.date_to) < today) {
      overdueLines += 1;
    } else {
      pendingLines += 1;
    }
  });

  return {
    contracts_total: contracts.length,
    lines_total: lines.length,
    deliveries_total: deliveries.length,
    stock_rows_total: stock.length,
    planned_tons_total: Number(plannedTons.toFixed(2)),
    delivered_tons_estimate: Number(deliveredTonsEstimate.toFixed(2)),
    completed_lines: completedLines,
    overdue_lines: overdueLines,
    pending_lines: pendingLines
  };
}

function buildMarketStatusDefinitions(rows: any[]) {
  const defaults = [
    {
      status_code: "yellow",
      label_th: "ยังไม่เป็นลูกค้า",
      label_en: "Prospect",
      is_customer: false,
      description: "สถานะสีเหลือง: ยังไม่เป็นลูกค้าเรา",
      sort_order: 10
    },
    {
      status_code: "green",
      label_th: "เป็นลูกค้า",
      label_en: "Customer",
      is_customer: true,
      description: "สถานะสีเขียว: เป็นลูกค้าเราแล้ว",
      sort_order: 20
    }
  ];

  const byCode = new Map<string, any>();
  rows.forEach((row) => {
    const statusCode = String(row?.status_code || "").trim().toLowerCase();
    if (!statusCode) return;
    byCode.set(statusCode, {
      status_code: statusCode,
      label_th: String(row?.label_th || "").trim() || null,
      label_en: String(row?.label_en || "").trim() || null,
      is_customer: Boolean(row?.is_customer),
      description: String(row?.description || "").trim() || null,
      sort_order: toNumber(row?.sort_order)
    });
  });

  defaults.forEach((item) => {
    if (!byCode.has(item.status_code)) {
      byCode.set(item.status_code, item);
    }
  });

  return Array.from(byCode.values()).sort((left, right) => {
    const leftOrder = toNumber(left?.sort_order);
    const rightOrder = toNumber(right?.sort_order);
    if (leftOrder !== rightOrder) return leftOrder - rightOrder;
    return String(left?.status_code || "").localeCompare(String(right?.status_code || ""));
  });
}

function buildMarketContext(companies: any[], statusDefinitionRows: any[]) {
  const statusBreakdown = new Map<string, number>();
  const countryBreakdown = new Map<string, number>();
  const statusDefinitions = buildMarketStatusDefinitions(statusDefinitionRows);
  const definitionByCode = new Map<string, any>(
    statusDefinitions.map((item: any) => [String(item?.status_code || "").trim().toLowerCase(), item])
  );

  let customerCompanyCount = 0;
  let nonCustomerCompanyCount = 0;
  let totalTrades = 0;

  companies.forEach((row) => {
    const status = normalizeMarketStatus(row?.status);
    statusBreakdown.set(status, toNumber(statusBreakdown.get(status)) + 1);

    const definition = definitionByCode.get(status);
    if (definition?.is_customer === true) {
      customerCompanyCount += 1;
    } else if (definition?.is_customer === false) {
      nonCustomerCompanyCount += 1;
    }

    const country = String(row?.location || "").trim();
    if (country) {
      countryBreakdown.set(country, toNumber(countryBreakdown.get(country)) + 1);
    }

    totalTrades += toNumber(row?.trades);
  });

  const topCountries = Array.from(countryBreakdown.entries())
    .map(([country, company_count]) => ({ country, company_count }))
    .sort((left, right) => right.company_count - left.company_count)
    .slice(0, 10);

  const topCompaniesByTrades = [...companies]
    .sort((left, right) => toNumber(right?.trades) - toNumber(left?.trades))
    .slice(0, 12)
    .map((row, index) => {
      const status = normalizeMarketStatus(row?.status);
      const definition = definitionByCode.get(status);
      return {
        rank: index + 1,
        customer: String(row?.customer || "-").trim() || "-",
        location: String(row?.location || "-").trim() || "-",
        status,
        status_label_th: definition?.label_th || null,
        is_customer: definition?.is_customer ?? null,
        trades: toNumber(row?.trades),
        value_tag: row?.value_tag || null
      };
    });

  return {
    summary: {
      companies_total: companies.length,
      total_trades: Number(totalTrades.toFixed(2)),
      green_count: toNumber(statusBreakdown.get("green")),
      yellow_count: toNumber(statusBreakdown.get("yellow")),
      unknown_status_count: toNumber(statusBreakdown.get("unknown")),
      customer_company_count: customerCompanyCount,
      non_customer_company_count: nonCustomerCompanyCount
    },
    status_definitions: statusDefinitions,
    top_countries: topCountries,
    top_companies_by_trades: topCompaniesByTrades
  };
}

function buildMarketConcentration(topCountries: Array<{ country: string; company_count: number }>, totalCompanies: number) {
  const denominator = Math.max(totalCompanies, 1);
  const countryShares = topCountries.map((row, index) => ({
    rank: index + 1,
    country: row.country,
    company_count: row.company_count,
    share_percent: Number(((toNumber(row.company_count) / denominator) * 100).toFixed(2))
  }));

  const top3Share = countryShares
    .slice(0, 3)
    .reduce((sum, row) => sum + toNumber(row.share_percent), 0);
  const top5Share = countryShares
    .slice(0, 5)
    .reduce((sum, row) => sum + toNumber(row.share_percent), 0);
  const hhi = countryShares.reduce((sum, row) => sum + Math.pow(toNumber(row.share_percent), 2), 0);

  return {
    top3_share_percent: Number(top3Share.toFixed(2)),
    top5_share_percent: Number(top5Share.toFixed(2)),
    hhi: Number(hhi.toFixed(2)),
    country_shares: countryShares
  };
}

function buildProductContext(rows: any[]) {
  const byBrand = new Map<string, number>();
  let withSpecRef = 0;
  let withSpecDate = 0;

  rows.forEach((row) => {
    const brand = String(row?.brand || "Unknown").trim() || "Unknown";
    byBrand.set(brand, toNumber(byBrand.get(brand)) + 1);
    if (String(row?.ref_no || "").trim()) withSpecRef += 1;
    if (String(row?.spec_date || "").trim()) withSpecDate += 1;
  });

  const topBrands = Array.from(byBrand.entries())
    .map(([brand, product_count]) => ({ brand, product_count }))
    .sort((left, right) => right.product_count - left.product_count)
    .slice(0, 10)
    .map((row, index) => ({
      rank: index + 1,
      ...row
    }));

  const sampleProducts = [...rows]
    .sort((left, right) => {
      const leftDate = String(left?.spec_date || "");
      const rightDate = String(right?.spec_date || "");
      if (leftDate !== rightDate) return rightDate.localeCompare(leftDate);
      return toNumber(right?.id) - toNumber(left?.id);
    })
    .slice(0, 20)
    .map((row) => ({
      id: toNumber(row?.id),
      product_name_en: String(row?.product_name_en || "-").trim() || "-",
      product_name_th: String(row?.product_name_th || "").trim() || null,
      brand: String(row?.brand || "").trim() || null,
      spec_ref: String(row?.ref_no || "").trim() || null,
      spec_date: String(row?.spec_date || "").trim() || null,
      country_of_origin: String(row?.country_of_origin || "").trim() || null
    }));

  return {
    summary: {
      products_total: rows.length,
      brands_total: byBrand.size,
      with_spec_ref_total: withSpecRef,
      with_spec_date_total: withSpecDate
    },
    top_brands: topBrands,
    sample_products: sampleProducts
  };
}

function buildFocusedViews(question: string, intents: IntentSelection, analytics: any) {
  const focusedViews: Record<string, unknown> = {};

  if (intents.monthly_performance) {
    focusedViews.monthly_performance = {
      finance: analytics?.finance?.monthly_performance || [],
      operation: analytics?.operation?.monthly_delivery_performance || []
    };
  }

  if (intents.top_customers) {
    focusedViews.top_customers = {
      finance_by_usd: analytics?.finance?.top_customers_by_usd || [],
      finance_by_tons: analytics?.finance?.top_customers_by_tons || [],
      operation_by_contract_tons: analytics?.operation?.top_customers_by_contract_tons || []
    };
  }

  if (intents.risk_overdue) {
    focusedViews.overdue_risk = {
      operation_summary: analytics?.operation?.summary || null,
      overdue_by_customer: analytics?.operation?.overdue_by_customer || []
    };
  }

  if (intents.stock_health) {
    focusedViews.stock_health = {
      stock_by_factory: analytics?.operation?.stock_by_factory || [],
      stock_by_type: analytics?.operation?.stock_by_type || []
    };
  }

  if (intents.market_concentration) {
    focusedViews.market_concentration = {
      market_summary: analytics?.market?.summary || null,
      concentration: analytics?.market?.concentration || null,
      status_definitions: analytics?.market?.status_definitions || []
    };
  }

  if (intents.product_catalog && analytics?.product) {
    focusedViews.product_catalog = {
      product_summary: analytics?.product?.summary || null,
      top_brands: analytics?.product?.top_brands || [],
      sample_products: analytics?.product?.sample_products || []
    };
  }

  return {
    question,
    intents,
    views: focusedViews
  };
}

function parseAllowedProductIdsFromClientContext(clientContext: any): number[] {
  const values = Array.isArray(clientContext?.product_scope?.allowed_product_ids)
    ? clientContext.product_scope.allowed_product_ids
    : [];

  const normalized = values
    .map((value: any) => Number(value))
    .filter((value: number) => Number.isFinite(value) && value > 0)
    .map((value: number) => Math.trunc(value));

  return Array.from(new Set(normalized));
}

async function buildReadOnlyServerContext(client: any, question: string, clientContext: any) {
  const domains = detectRequestedDomains(question);
  const intents = detectRequestedIntents(question);
  const allowedProductIds = parseAllowedProductIdsFromClientContext(clientContext);

  if (!client) {
    return {
      tool_layer: {
        enabled: false,
        mode: "allowlist-readonly-v1",
        reason: "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured",
        domains_requested: domains,
        intents_requested: intents
      },
      source_citations: [],
      row_counts: {},
      domains_requested: domains,
      intents_requested: intents,
      analytics: {
        finance: null,
        operation: null,
        market: null,
        product: null
      },
      focused_views: {
        question,
        intents,
        views: {}
      }
    };
  }

  const requestedSpecs = ALLOWLIST_TABLES.filter((spec) => {
    if (spec.domain === "finance") return domains.finance;
    if (spec.domain === "operation") return domains.operation;
    if (spec.domain === "market") return domains.market;
    return domains.product;
  });

  const loadResults = await Promise.all(requestedSpecs.map((spec) => loadAllowlistedTable(client, spec)));

  const byId = new Map<string, any[]>();
  const citations: SourceCitation[] = [];
  const errors: Array<{ table_id: string; table: string; error: string }> = [];

  loadResults.forEach((result, index) => {
    const spec = requestedSpecs[index];
    byId.set(spec.id, result.rows || []);
    citations.push(result.citation);

    if (result.error) {
      errors.push({
        table_id: spec.id,
        table: spec.table,
        error: result.error
      });
    }
  });

  const financeRows = byId.get("finance_invoices") || [];
  const operationContracts = byId.get("operation_contracts") || [];
  const operationLines = byId.get("operation_lines") || [];
  const operationDeliveries = byId.get("operation_deliveries") || [];
  const operationStock = byId.get("operation_stock") || [];
  const rawProducts = byId.get("sugar_products") || [];
  const allowedProductIdSet = new Set(allowedProductIds);
  const products = domains.product
    ? allowedProductIds.length
      ? rawProducts.filter((row) => allowedProductIdSet.has(toNumber(row?.id)))
      : []
    : [];
  const companies = byId.get("companies") || [];
  const marketStatusDefinitions = byId.get("market_status_definitions") || [];

  const financeMonthlyPerformance = buildFinanceMonthlyPerformance(financeRows, FINANCE_MONTH_WINDOW);
  const financeTopByUsd = buildFinanceTopCustomers(financeRows, "usd", TOP_CUSTOMER_LIMIT);
  const financeTopByTons = buildFinanceTopCustomers(financeRows, "tons", TOP_CUSTOMER_LIMIT);

  const financeAnalytics = domains.finance
    ? {
        summary: buildFinanceSummary(financeRows),
        monthly_performance: financeMonthlyPerformance,
        monthly_highlights: buildFinanceMonthlyHighlights(financeMonthlyPerformance),
        top_customers_by_usd: financeTopByUsd,
        top_customers_by_tons: financeTopByTons
      }
    : null;

  const operationSummary = buildOperationSummary(operationContracts, operationLines, operationDeliveries, operationStock);
  const operationMonthly = buildOperationMonthlyPerformance(operationDeliveries, OPERATION_MONTH_WINDOW);
  const operationTopCustomers = buildOperationTopCustomersByContractTons(
    operationContracts,
    operationLines,
    operationDeliveries,
    TOP_CUSTOMER_LIMIT
  );

  const operationAnalytics = domains.operation
    ? {
        summary: operationSummary,
        monthly_delivery_performance: operationMonthly,
        top_customers_by_contract_tons: operationTopCustomers,
        overdue_by_customer: buildOperationOverdueByCustomer(
          operationContracts,
          operationLines,
          operationDeliveries,
          TOP_CUSTOMER_LIMIT
        ),
        stock_by_factory: buildOperationStockByFactory(operationStock, TOP_CUSTOMER_LIMIT),
        stock_by_type: buildOperationStockByType(operationStock, TOP_CUSTOMER_LIMIT)
      }
    : null;

  const marketBase = domains.market ? buildMarketContext(companies, marketStatusDefinitions) : null;
  const marketAnalytics = marketBase
    ? {
        ...marketBase,
        concentration: buildMarketConcentration(marketBase.top_countries || [], marketBase.summary?.companies_total || 0)
      }
    : null;

  const productAnalytics = domains.product ? buildProductContext(products) : null;

  const rowCounts: Record<string, number> = {};
  citations.forEach((citation) => {
    if (citation.id === "sugar_products") {
      citation.row_count = products.length;
    }
    rowCounts[citation.id] = citation.row_count;
  });

  const analytics = {
    finance: financeAnalytics,
    operation: operationAnalytics,
    market: marketAnalytics,
    product: productAnalytics
  };

  const focusedViews = buildFocusedViews(question, intents, analytics);

  return {
    tool_layer: {
      enabled: true,
      mode: "allowlist-readonly-v1",
      domains_requested: domains,
      intents_requested: intents,
      tables_used: citations.map((citation) => citation.id),
      errors
    },
    source_citations: citations,
    row_counts: rowCounts,
    domains_requested: domains,
    intents_requested: intents,
    focused_views: focusedViews,
    analytics
  };
}

function mergeContext(clientContext: unknown, serverContext: any) {
  return {
    universe_policy:
      (clientContext as any)?.universe_policy || {
        market: "external",
        internal: ["operation", "finance", "product"],
        cross_universe_rule:
          "Do not merge external market and internal operation/finance/product entities unless explicit verified mapping exists."
      },
    server_context: {
      generated_at: new Date().toISOString(),
      ...serverContext
    },
    client_context: clientContext || {}
  };
}

async function requestAnthropic(input: AnthropicRequestInput): Promise<any> {
  const response = await fetch(
    "https://api.anthropic.com/v1/messages",
    {
      method: "POST",
      headers: {
        "x-api-key": input.anthropicKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: input.model,
        system: input.systemInstruction,
        max_tokens: 2200,
        temperature: 0.18,
        messages: input.messages
      })
    }
  );

  const rawText = await response.text();
  let payload: any = {};
  try {
    payload = rawText ? JSON.parse(rawText) : {};
  } catch {
    payload = { raw: rawText || null };
  }

  if (!response.ok) {
    const message = String(
      payload?.error?.message ||
      payload?.message ||
      payload?.raw ||
      "Anthropic API request failed"
    );
    throw new Error(`${message} (provider_status=${response.status})`);
  }

  return payload;
}

function buildBaseMessages(
  context: unknown,
  messages: NormalizedMessage[],
  prompt: string
): AnthropicMessage[] {
  const contextText = `Context JSON:\n${JSON.stringify(context, null, 2)}`;
  const normalizedConversation = messages.length ? messages : [{ role: "user" as const, content: prompt }];

  return [
    {
      role: "user",
      content: contextText
    },
    ...normalizedConversation.map((message) => ({
      role: message.role,
      content: message.content
    }))
  ];
}

function buildContinuationMessages(
  baseMessages: AnthropicMessage[],
  answerSoFar: string
): AnthropicMessage[] {
  return [
    ...baseMessages,
    { role: "assistant", content: answerSoFar },
    {
      role: "user",
      content:
        "Continue from exactly where you stopped. " +
        "Return only the missing remainder. " +
        "Do not repeat previous points. " +
        "Keep plain text format."
    }
  ];
}

function buildFallbackAnswer(question: string, serverContext: any, reason: string): string {
  const financeSummary = serverContext?.analytics?.finance?.summary || null;
  const operationSummary = serverContext?.analytics?.operation?.summary || null;
  const productSummary = serverContext?.analytics?.product?.summary || null;
  const topFinance = Array.isArray(serverContext?.analytics?.finance?.top_customers_by_usd)
    ? serverContext.analytics.finance.top_customers_by_usd.slice(0, 3)
    : [];
  const topOperation = Array.isArray(serverContext?.analytics?.operation?.top_customers_by_contract_tons)
    ? serverContext.analytics.operation.top_customers_by_contract_tons.slice(0, 3)
    : [];
  const topBrands = Array.isArray(serverContext?.analytics?.product?.top_brands)
    ? serverContext.analytics.product.top_brands.slice(0, 3)
    : [];

  const lines: string[] = [];
  lines.push("ระบบวิเคราะห์เชิงโมเดลขัดข้องชั่วคราว จึงสรุปจากข้อมูลที่คำนวณไว้ล่าสุดแทน");
  if (question) {
    lines.push(`คำถาม: ${trimText(question, 220)}`);
  }

  if (financeSummary) {
    lines.push(
      `Finance: ${formatMetricNumber(financeSummary.total_invoices)} invoices, ` +
      `${formatMetricNumber(financeSummary.total_tons)} tons, ` +
      `${formatMetricNumber(financeSummary.total_usd)} USD`
    );
  }

  if (operationSummary) {
    lines.push(
      `Operation: planned ${formatMetricNumber(operationSummary.planned_tons_total)} tons, ` +
      `delivered ${formatMetricNumber(operationSummary.delivered_tons_estimate)} tons, ` +
      `overdue ${formatMetricNumber(operationSummary.overdue_lines)} lines`
    );
  }

  if (productSummary) {
    lines.push(
      `Product: ${formatMetricNumber(productSummary.products_total)} products, ` +
      `${formatMetricNumber(productSummary.brands_total)} brands, ` +
      `${formatMetricNumber(productSummary.with_spec_ref_total)} with spec ref`
    );
  }

  if (topFinance.length) {
    lines.push("Top Finance customers by USD:");
    topFinance.forEach((row: any, index: number) => {
      lines.push(`${index + 1}. ${row.customer || "Unknown"} - ${formatMetricNumber(row.usd)} USD`);
    });
  }

  if (topOperation.length) {
    lines.push("Top Operation customers by planned tons:");
    topOperation.forEach((row: any, index: number) => {
      lines.push(`${index + 1}. ${row.customer || "Unknown"} - ${formatMetricNumber(row.planned_tons)} tons`);
    });
  }

  if (topBrands.length) {
    lines.push("Top Product brands:");
    topBrands.forEach((row: any, index: number) => {
      lines.push(`${index + 1}. ${row.brand || "Unknown"} - ${formatMetricNumber(row.product_count)} products`);
    });
  }

  if (reason) {
    lines.push("ระบบโมเดลภายนอกมีข้อจำกัดชั่วคราว (เช่น quota/rate limit)");
  }
  lines.push("ลองส่งคำถามอีกครั้งในอีก 10-30 วินาที");
  return lines.join("\n");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return toJson({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await req.json();
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      return toJson({ error: "ANTHROPIC_API_KEY is not configured" }, 500);
    }

    const defaultModel = Deno.env.get("CLAUDE_MODEL") || "claude-sonnet-4-20250514";
    const model = String(body?.model || defaultModel).trim() || defaultModel;
    const requestMode = String(body?.mode || "default").trim().toLowerCase();
    const isCompanyDetailMode = requestMode === "company_detail";
    const prompt = trimText(body?.prompt, MAX_PROMPT_CHARS);
    const messages = normalizeMessages(Array.isArray(body?.messages) ? body.messages : [])
      .slice(-MAX_MESSAGES_FOR_MODEL);
    const clientContext = body?.context ?? {};

    if (!prompt && messages.length === 0) {
      return toJson({ error: "prompt or messages is required" }, 400);
    }

    const question = getLatestUserQuestion(prompt, messages);
    const adminClient = getSupabaseAdminClient();
    const readOnlyServerContext = isCompanyDetailMode
      ? {
          tool_layer: {
            enabled: false,
            mode: "company-detail-client-context-v1",
            reason: "Company detail mode uses client_context only for strict single-company scope"
          },
          source_citations: [],
          row_counts: {},
          domains_requested: null,
          intents_requested: null,
          focused_views: {
            question,
            intents: {},
            views: {}
          },
          analytics: null
        }
      : await buildReadOnlyServerContext(adminClient, question, clientContext);
    const mergedContext = mergeContext(clientContext, readOnlyServerContext);

    const systemInstruction = isCompanyDetailMode
      ? "You are an analyst for a single company detail page. " +
        "Use only client_context as the source of truth. " +
        "Do not use or infer any global/cross-company data that is not explicitly present in client_context. " +
        "Keep answers concise, practical, and numeric when possible. " +
        "Always include explicit period labels when discussing trends. " +
        "Do not include source tags/citation blocks unless explicitly requested by user. " +
        "Output plain text only. Do not use markdown syntax such as **, __, #, or ``` blocks. " +
        "If data is insufficient, state exactly which section in client_context is missing."
      : "You are a business analyst for a dashboard with four domains: market (external), operation (internal), finance (internal), and product (internal). " +
        "Use server_context.analytics as primary source of truth and client_context as supplementary context. " +
        "Prioritize server_context.focused_views according to server_context.intents_requested for this question. " +
        "Use only views relevant to the detected intent unless user explicitly asks cross-intent comparison. " +
        "Keep answers minimalist and concise, focusing only on the requested output. " +
        "Format all numeric values with thousands separators (e.g., 143,149.65). " +
        "For monthly performance, prioritize finance.monthly_performance and operation.monthly_delivery_performance. " +
        "For top customers, prioritize finance.top_customers_by_usd, finance.top_customers_by_tons, and operation.top_customers_by_contract_tons. " +
        "For risk questions, prioritize operation.overdue_by_customer and operation.summary. " +
        "If the question is about overdue status, always state total overdue lines first, then list overdue customers with overdue_lines and overdue_remaining_tons. " +
        "For stock questions, prioritize operation.stock_by_factory and operation.stock_by_type. " +
        "For market concentration questions, prioritize market.concentration and market.top_countries. " +
        "For market status meaning, use market.status_definitions. Example: if yellow has is_customer=false, explain that it is not yet our customer. " +
        "For product/spec questions, prioritize product.summary, product.top_brands, and product.sample_products. " +
        "Product rows in server_context are pre-filtered by the web catalog scope from client_context.product_scope. " +
        "When the user asks top N and data is sufficient, return exactly N rows. " +
        "Always include numeric values and explicit month/period labels when available. " +
        "Do not include source tags or citation blocks unless the user explicitly asks for sources. " +
        "Respect cross-universe boundary: do not merge external market entities with internal operation/finance/product entities unless explicit mapping exists in context. " +
        "Output plain text only. Do not use markdown syntax such as **, __, #, or ``` blocks. " +
        "If data is insufficient, state exactly which table/domain is missing.";

    const baseMessages = buildBaseMessages(mergedContext, messages, prompt);
    let answer = "";
    let finishReason: string | null = null;
    let continuationRounds = 0;
    let usage: any = null;
    let providerError: string | null = null;

    try {
      const primaryPayload = await requestAnthropic({
        anthropicKey,
        model,
        systemInstruction,
        messages: baseMessages
      });

      answer = extractAnthropicText(primaryPayload);
      finishReason = extractFinishReason(primaryPayload) || null;
      usage = primaryPayload?.usage ?? null;

      while (String(finishReason || "").toLowerCase() === "max_tokens" && continuationRounds < MAX_CONTINUATION_ROUNDS) {
        continuationRounds += 1;
        const continuationPayload = await requestAnthropic({
          anthropicKey,
          model,
          systemInstruction,
          messages: buildContinuationMessages(baseMessages, answer)
        });
        const continuationText = extractAnthropicText(continuationPayload);
        if (!continuationText) break;
        answer = `${answer}\n${continuationText}`.trim();
        finishReason = extractFinishReason(continuationPayload) || finishReason;
      }
    } catch (error) {
      providerError = String((error as Error)?.message || "provider request failed");
      finishReason = "FALLBACK";
      answer = isCompanyDetailMode
        ? "Unable to generate a company-specific answer right now. Please try again in 10-30 seconds."
        : buildFallbackAnswer(question, readOnlyServerContext, providerError);
    }

    answer = enforceMinimalAnswerStyle(answer || "");

    return toJson({
      answer,
      model,
      generated_at: new Date().toISOString(),
      request_mode: requestMode,
      finish_reason: finishReason || null,
      continuation_rounds: continuationRounds,
      usage,
      citations: readOnlyServerContext?.source_citations || [],
      tool_report: readOnlyServerContext?.tool_layer || null,
      intents_requested: readOnlyServerContext?.intents_requested || null,
      focused_views: readOnlyServerContext?.focused_views || null,
      row_counts: readOnlyServerContext?.row_counts || {},
      provider_error: providerError
    });
  } catch (error) {
    return toJson(
      {
        error: String((error as Error)?.message || "Unknown error")
      },
      500
    );
  }
});
