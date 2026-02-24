import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-line-internal-secret",
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
const INTERNAL_LINE_CHANNEL = "line";

const ENTITY_SCOPED_TABLE_KEY_COLUMNS: Record<string, string> = {
  finance_invoices: "id",
  operation_contracts: "contract_id",
  operation_lines: "line_id",
  operation_deliveries: "delivery_id",
  operation_stock: "stock_id"
};

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

type AuthState = {
  client: any | null;
  user: { id: string } | null;
  error: string | null;
  auth_mode: "user_jwt" | "line_internal" | "unknown";
  scoped_entity_id: string | null;
  scoped_user_id: string | null;
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
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const text = String(value ?? "")
    .trim()
    .replace(/[, ]+/g, "");
  if (!text) return 0;

  const numeric = Number(text);
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

function stripJsonCodeFence(text: string): string {
  const fenced = String(text || "").trim().match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (!fenced) return String(text || "").trim();
  return String(fenced[1] || "").trim();
}

function normalizeJsonNumberSeparators(text: string): string {
  return String(text || "").replace(
    /([:\[,]\s*-?)(\d{1,3}(?:,\d{3})+(?:\.\d+)?)(\s*[,}\]])/g,
    (_match, prefix, numeric, suffix) => `${prefix}${String(numeric).replace(/,/g, "")}${suffix}`
  );
}

function toNormalizedJsonText(text: string): string | null {
  const cleaned = stripJsonCodeFence(text);
  try {
    return JSON.stringify(JSON.parse(cleaned), null, 2);
  } catch {
    const normalized = normalizeJsonNumberSeparators(cleaned);
    try {
      return JSON.stringify(JSON.parse(normalized), null, 2);
    } catch {
      return null;
    }
  }
}

function enforceMinimalAnswerStyle(answer: string, options?: { jsonMode?: boolean }): string {
  let text = String(answer || "");

  // Remove verbose source tags from the response body.
  text = text.replace(/\s*\[source:\s*[^\]]+\]/gi, "");
  text = text.replace(/^\s*sources?\s*:\s*.*$/gim, "");

  if (options?.jsonMode) {
    const normalizedJson = toNormalizedJsonText(text);
    if (normalizedJson) return normalizedJson;
    return stripJsonCodeFence(text).replace(/\n{3,}/g, "\n\n").trim();
  }

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

function isJsonRequested(question: string): boolean {
  const normalized = String(question || "").trim().toLowerCase();
  if (!normalized) return false;
  return /(^|\s)json(\s|$)|ตอบเป็น\s*json|return\s+json|valid\s+json/.test(normalized);
}

function detectRequestedDomains(question: string): DomainSelection {
  const normalized = String(question || "").toLowerCase();

  const internalPerformance = /(trade\s*performance|performance\s*summary|overall\s*performance|business\s*performance|ผลงานการค้า|สรุปผลงาน|สรุปผลการดำเนินงาน|ภาพรวมผลงาน)/i.test(
    normalized
  );

  const finance =
    /(finance|invoice|usd|thb|credit|customer_name|billing|revenue|top\s*customer)/i.test(normalized) ||
    internalPerformance;
  const operation =
    /(operation|contract|delivery|deliveries|planned|fulfilled|fulfillment|stock|ton|tons|job|overdue)/i.test(normalized) ||
    internalPerformance;
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

function isUuidLike(value: unknown): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || "").trim());
}

function timingSafeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  const leftBytes = new TextEncoder().encode(left);
  const rightBytes = new TextEncoder().encode(right);
  let diff = 0;
  for (let i = 0; i < leftBytes.length; i += 1) {
    diff |= leftBytes[i] ^ rightBytes[i];
  }
  return diff === 0;
}

function getBearerToken(req: Request): string | null {
  const headerValue = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!headerValue) return null;

  const matched = headerValue.match(/^Bearer\s+(.+)$/i);
  return matched?.[1]?.trim() || null;
}

function getInternalLineSecretHeader(req: Request): string {
  return String(
    req.headers.get("x-line-internal-secret") ||
    req.headers.get("X-Line-Internal-Secret") ||
    ""
  ).trim();
}

function getSupabaseUserClient(accessToken: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anonKey || !accessToken) return null;

  return createClient(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  });
}

function getSupabaseServiceRoleClient() {
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

async function authenticateLineInternalScope(req: Request, body: any): Promise<AuthState | null> {
  const expectedSecret = String(Deno.env.get("LINE_AI_INTERNAL_SECRET") || "").trim();
  const providedSecret = getInternalLineSecretHeader(req);
  if (!expectedSecret || !providedSecret) return null;
  if (!timingSafeEqual(providedSecret, expectedSecret)) return null;

  const channel = String(body?.channel || "").trim().toLowerCase();
  const entityId = String(body?.internal_scope?.entity_id || "").trim();
  const userId = String(body?.internal_scope?.user_id || "").trim();

  if (channel !== INTERNAL_LINE_CHANNEL) {
    return {
      client: null,
      user: null,
      error: "Invalid internal channel",
      auth_mode: "unknown",
      scoped_entity_id: null,
      scoped_user_id: null
    };
  }

  if (!isUuidLike(entityId) || !isUuidLike(userId)) {
    return {
      client: null,
      user: null,
      error: "Invalid internal scope",
      auth_mode: "unknown",
      scoped_entity_id: null,
      scoped_user_id: null
    };
  }

  const serviceClient = getSupabaseServiceRoleClient();
  if (!serviceClient) {
    return {
      client: null,
      user: null,
      error: "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured",
      auth_mode: "unknown",
      scoped_entity_id: null,
      scoped_user_id: null
    };
  }

  const { data, error } = await serviceClient
    .from("company_user_members")
    .select("entity_id, user_id, is_active")
    .eq("entity_id", entityId)
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) {
    return {
      client: null,
      user: null,
      error: "Invalid internal scope mapping",
      auth_mode: "unknown",
      scoped_entity_id: null,
      scoped_user_id: null
    };
  }

  return {
    client: serviceClient,
    user: { id: userId },
    error: null,
    auth_mode: "line_internal",
    scoped_entity_id: entityId,
    scoped_user_id: userId
  };
}

async function authenticateRequest(req: Request, body: any): Promise<AuthState> {
  const internalAuthState = await authenticateLineInternalScope(req, body);
  if (internalAuthState) {
    return internalAuthState;
  }

  const accessToken = getBearerToken(req);
  if (!accessToken) {
    return {
      client: null,
      user: null,
      error: "Missing Bearer token",
      auth_mode: "unknown",
      scoped_entity_id: null,
      scoped_user_id: null
    };
  }

  const client = getSupabaseUserClient(accessToken);
  if (!client) {
    return {
      client: null,
      user: null,
      error: "SUPABASE_URL or SUPABASE_ANON_KEY is not configured",
      auth_mode: "unknown",
      scoped_entity_id: null,
      scoped_user_id: null
    };
  }

  const { data, error } = await client.auth.getUser();
  if (error || !data?.user) {
    return {
      client: null,
      user: null,
      error: "Invalid or expired token",
      auth_mode: "unknown",
      scoped_entity_id: null,
      scoped_user_id: null
    };
  }

  return {
    client,
    user: data.user,
    error: null,
    auth_mode: "user_jwt",
    scoped_entity_id: null,
    scoped_user_id: data.user.id
  };
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

async function loadEntityScopedAllowlistedTable(client: any, spec: AllowlistTableSpec, entityId: string) {
  const keyColumn = ENTITY_SCOPED_TABLE_KEY_COLUMNS[spec.table];
  const sourceDomain = spec.domain === "finance" || spec.domain === "operation"
    ? spec.domain
    : null;

  const emptyCitation: SourceCitation = {
    id: spec.id,
    table: spec.table,
    domain: spec.domain,
    fields: spec.fields,
    row_count: 0,
    note: spec.note
  };

  if (!keyColumn || !sourceDomain) {
    return {
      rows: [],
      citation: emptyCitation,
      error: `entity scope not supported for table ${spec.table}`
    };
  }

  try {
    const { data: keyRows, error: keyError } = await client
      .from("company_entity_map")
      .select("source_key")
      .eq("entity_id", entityId)
      .eq("source_domain", sourceDomain)
      .eq("source_table", spec.table)
      .limit(spec.limit || MAX_CONTEXT_ROWS);

    if (keyError) {
      throw new Error(keyError.message || "failed to load entity map keys");
    }

    const sourceKeys = Array.from(
      new Set(
        (Array.isArray(keyRows) ? keyRows : [])
          .map((row: any) => String(row?.source_key || "").trim())
          .filter((value: string) => value !== "")
      )
    );

    if (!sourceKeys.length) {
      return {
        rows: [],
        citation: emptyCitation,
        error: null
      };
    }

    let query = client
      .from(spec.table)
      .select(spec.select)
      .in(keyColumn, sourceKeys)
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
    return {
      rows: [],
      citation: emptyCitation,
      error: String((error as Error)?.message || "failed to load entity-scoped table")
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

function extractCompanyIdFromClientContext(clientContext: any): string {
  const candidates = [
    clientContext?.context_scope?.company_id,
    clientContext?.company?.company_id,
    clientContext?.company_id
  ];

  for (const candidate of candidates) {
    const normalized = String(candidate || "").trim();
    if (normalized) return normalized;
  }
  return "";
}

async function buildCompanyDetailServerContext(client: any, question: string, clientContext: any) {
  const companyId = extractCompanyIdFromClientContext(clientContext);
  if (!companyId) {
    return {
      tool_layer: {
        enabled: true,
        mode: "company-detail-supabase-readonly-v1",
        reason: "Missing company_id in client_context"
      },
      source_citations: [],
      row_counts: {},
      domains_requested: null,
      intents_requested: null,
      focused_views: {
        question,
        intents: { company_detail: true },
        views: {}
      },
      analytics: {
        company_detail: null
      }
    };
  }

  const querySpecs: Array<{ id: string; table: string; domain: "market"; fields: string[]; note: string }> = [
    {
      id: "company_detail_company",
      table: "companies",
      fields: ["company_id", "customer", "location", "status", "trades", "supplier_number", "value_tag", "latest_purchase_time"],
      note: "Single company identity row"
    },
    {
      id: "company_detail_overview",
      table: "company_overview",
      fields: [
        "company_id",
        "total_purchase_value",
        "purchase_value_last_12m",
        "purchase_frequency_per_year",
        "latest_purchase_date",
        "purchase_interval_days",
        "is_active",
        "updated_at"
      ],
      note: "Single company overview metrics"
    },
    {
      id: "company_detail_info",
      table: "company_info",
      fields: ["company_id", "company_profile", "linkedin", "created_at"],
      note: "Single company profile row"
    },
    {
      id: "company_detail_email",
      table: "company_email",
      fields: ["email", "importance", "source", "created_at"],
      note: "Known company emails"
    },
    {
      id: "company_detail_contacts",
      table: "company_contract",
      fields: ["contact_name", "position", "department", "business_email", "region", "created_at"],
      note: "Company contacts"
    },
    {
      id: "company_detail_history",
      table: "company_history",
      fields: ["date", "importer", "exporter", "product", "product_description", "quantity", "quantity_unit", "total_price_usd", "created_at"],
      note: "Company trade history sample"
    },
    {
      id: "company_detail_supply",
      table: "company_supplychain",
      fields: ["snapshot_id", "exporter", "trades_sum", "quantity", "kg_weight", "total_price_usd", "total_price_ratio", "created_at"],
      note: "Company supply chain sample"
    },
    {
      id: "company_detail_status_defs",
      table: "market_status_definitions",
      fields: ["status_code", "label_th", "label_en", "is_customer", "description", "sort_order"],
      note: "Status semantic definitions"
    }
  ];

  const [
    companyRes,
    overviewRes,
    infoRes,
    emailRes,
    contactRes,
    historyRes,
    supplyRes,
    statusDefsRes
  ] = await Promise.all([
    client
      .from("companies")
      .select("company_id, customer, location, status, trades, supplier_number, value_tag, latest_purchase_time")
      .eq("company_id", companyId)
      .maybeSingle(),
    client
      .from("company_overview")
      .select("company_id, total_purchase_value, purchase_value_last_12m, purchase_frequency_per_year, latest_purchase_date, purchase_interval_days, is_active, updated_at")
      .eq("company_id", companyId)
      .maybeSingle(),
    client
      .from("company_info")
      .select("company_id, company_profile, linkedin, created_at")
      .eq("company_id", companyId)
      .maybeSingle(),
    client
      .from("company_email")
      .select("email, importance, source, created_at")
      .eq("company_id", companyId)
      .limit(200),
    client
      .from("company_contract")
      .select("contact_name, position, department, business_email, region, created_at")
      .eq("company_id", companyId)
      .limit(200),
    client
      .from("company_history")
      .select("date, importer, exporter, product, product_description, quantity, quantity_unit, total_price_usd, created_at")
      .eq("company_id", companyId)
      .order("date", { ascending: false })
      .limit(500),
    client
      .from("company_supplychain")
      .select("snapshot_id, exporter, trades_sum, quantity, kg_weight, total_price_usd, total_price_ratio, created_at")
      .eq("company_id", companyId)
      .order("total_price_usd", { ascending: false })
      .limit(500),
    client
      .from("market_status_definitions")
      .select("status_code, label_th, label_en, is_customer, description, sort_order")
      .order("sort_order", { ascending: true })
      .limit(100)
  ]);

  const responses = [companyRes, overviewRes, infoRes, emailRes, contactRes, historyRes, supplyRes, statusDefsRes];
  const errors = responses
    .map((response) => response.error)
    .filter(Boolean);

  const citations: SourceCitation[] = querySpecs.map((spec, index) => {
    const response = responses[index];
    const data = response?.data;
    const rowCount = Array.isArray(data) ? data.length : data ? 1 : 0;
    return {
      id: spec.id,
      table: spec.table,
      domain: spec.domain,
      fields: spec.fields,
      row_count: rowCount,
      note: spec.note
    };
  });

  const rowCounts: Record<string, number> = {};
  citations.forEach((citation) => {
    rowCounts[citation.id] = citation.row_count;
  });

  if (errors.length) {
    return {
      tool_layer: {
        enabled: true,
        mode: "company-detail-supabase-readonly-v1",
        errors: errors.map((error: any) => String(error?.message || error))
      },
      source_citations: citations,
      row_counts: rowCounts,
      domains_requested: null,
      intents_requested: null,
      focused_views: {
        question,
        intents: { company_detail: true },
        views: {}
      },
      analytics: {
        company_detail: null
      }
    };
  }

  const company = companyRes.data || null;
  const overview = overviewRes.data || {};
  const info = infoRes.data || {};
  const emails = Array.isArray(emailRes.data) ? emailRes.data : [];
  const contacts = Array.isArray(contactRes.data) ? contactRes.data : [];
  const historyRows = Array.isArray(historyRes.data) ? historyRes.data : [];
  const supplyRows = Array.isArray(supplyRes.data) ? supplyRes.data : [];
  const statusDefinitions = buildMarketStatusDefinitions(Array.isArray(statusDefsRes.data) ? statusDefsRes.data : []);
  const currentStatus = normalizeMarketStatus(company?.status);
  const statusDefinition = statusDefinitions.find((item: any) => String(item?.status_code || "") === currentStatus) || null;

  const totalPurchaseValue = toNumber(overview?.total_purchase_value);
  const purchaseValueLast12m = toNumber(overview?.purchase_value_last_12m);
  const historyTotalUsd = historyRows.reduce((sum: number, row: any) => sum + toNumber(row?.total_price_usd), 0);
  const supplyTotalUsd = supplyRows.reduce((sum: number, row: any) => sum + toNumber(row?.total_price_usd), 0);

  const analytics = {
    company_detail: {
      company: {
        company_id: String(company?.company_id || companyId),
        customer: String(company?.customer || ""),
        location: String(company?.location || ""),
        status: currentStatus,
        status_definition: statusDefinition,
        trades: toNumber(company?.trades),
        supplier_number: toNumber(company?.supplier_number),
        value_tag: company?.value_tag || null,
        latest_purchase_time: company?.latest_purchase_time || null
      },
      metrics: {
        total_purchase_value: totalPurchaseValue,
        purchase_value_last_12m: purchaseValueLast12m,
        purchase_frequency_per_year: toNumber(overview?.purchase_frequency_per_year),
        purchase_interval_days: toNumber(overview?.purchase_interval_days),
        latest_purchase_date: overview?.latest_purchase_date || null,
        is_active: overview?.is_active ?? null
      },
      metric_definitions: {
        total_purchase_value: "Cumulative total purchase value for this company (not limited to last 12 months).",
        purchase_value_last_12m: "Rolling purchase value for the most recent 12 months only."
      },
      overview: {
        business_overview: overview?.business_overview || "",
        procurement_overview: overview?.procurement_overview || "",
        updated_at: overview?.updated_at || null
      },
      profile: {
        company_profile: info?.company_profile || "",
        linkedin: info?.linkedin || ""
      },
      contacts_summary: {
        contacts_count: contacts.length,
        emails_count: emails.length,
        sample_contacts: contacts.slice(0, 20).map((row: any) => ({
          contact_name: row?.contact_name || "",
          position: row?.position || "",
          department: row?.department || "",
          business_email: row?.business_email || "",
          region: row?.region || ""
        }))
      },
      trade_history_summary: {
        rows_total: historyRows.length,
        total_price_usd: Number(historyTotalUsd.toFixed(2)),
        latest_trade_date: historyRows.find((row: any) => row?.date)?.date || null,
        sample_rows: historyRows.slice(0, 30).map((row: any) => ({
          date: row?.date || null,
          importer: row?.importer || "",
          exporter: row?.exporter || "",
          product: row?.product || row?.product_description || "",
          quantity: toNumber(row?.quantity),
          quantity_unit: row?.quantity_unit || "",
          total_price_usd: toNumber(row?.total_price_usd)
        }))
      },
      supply_chain_summary: {
        rows_total: supplyRows.length,
        total_price_usd: Number(supplyTotalUsd.toFixed(2)),
        top_exporters: supplyRows
          .slice(0, 20)
          .map((row: any) => ({
            exporter: row?.exporter || "",
            trades_sum: toNumber(row?.trades_sum),
            quantity: toNumber(row?.quantity),
            total_price_usd: toNumber(row?.total_price_usd),
            total_price_ratio: toNumber(row?.total_price_ratio)
          }))
      },
      status_definitions: statusDefinitions
    }
  };

  return {
    tool_layer: {
      enabled: true,
      mode: "company-detail-supabase-readonly-v1",
      company_id: companyId,
      tables_used: citations.map((citation) => citation.id),
      errors: []
    },
    source_citations: citations,
    row_counts: rowCounts,
    domains_requested: null,
    intents_requested: { company_detail: true },
    focused_views: {
      question,
      intents: { company_detail: true },
      views: {
        company_metrics: analytics.company_detail.metrics,
        company_status: analytics.company_detail.company.status_definition
      }
    },
    analytics
  };
}

async function buildReadOnlyServerContext(client: any, question: string, clientContext: any, strictServerOnly = false) {
  const domains = detectRequestedDomains(question);
  const intents = detectRequestedIntents(question);
  const allowedProductIds = strictServerOnly ? [] : parseAllowedProductIdsFromClientContext(clientContext);

  if (!client) {
    return {
      tool_layer: {
        enabled: false,
        mode: "allowlist-readonly-v1",
        reason: "SUPABASE_URL or SUPABASE_ANON_KEY is not configured",
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
    ? strictServerOnly
      ? rawProducts
      : allowedProductIds.length
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
      mode: strictServerOnly ? "allowlist-readonly-v1-server-only" : "allowlist-readonly-v1",
      strict_server_only: strictServerOnly,
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

async function buildEntityScopedServerContext(
  client: any,
  question: string,
  strictServerOnly = true,
  entityId: string
) {
  const detectedDomains = detectRequestedDomains(question);
  const domains = {
    finance: detectedDomains.finance,
    operation: detectedDomains.operation,
    market: false,
    product: false
  };
  const intents = detectRequestedIntents(question);

  if (!client || !isUuidLike(entityId)) {
    return {
      tool_layer: {
        enabled: false,
        mode: "allowlist-entity-scoped-v1",
        reason: "Invalid scoped entity client/context",
        strict_server_only: strictServerOnly,
        entity_id: entityId || null,
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
    return false;
  });

  const loadResults = await Promise.all(
    requestedSpecs.map((spec) => loadEntityScopedAllowlistedTable(client, spec, entityId))
  );

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

  const rowCounts: Record<string, number> = {};
  citations.forEach((citation) => {
    rowCounts[citation.id] = citation.row_count;
  });

  const analytics = {
    finance: financeAnalytics,
    operation: operationAnalytics,
    market: null,
    product: null
  };

  const focusedViews = buildFocusedViews(question, intents, analytics);

  return {
    tool_layer: {
      enabled: true,
      mode: "allowlist-entity-scoped-v1",
      strict_server_only: strictServerOnly,
      entity_id: entityId,
      channel: INTERNAL_LINE_CHANNEL,
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

function mergeContext(clientContext: unknown, serverContext: any, strictServerOnly = false) {
  const defaultUniversePolicy = {
    market: "external",
    internal: ["operation", "finance", "product"],
    cross_universe_rule:
      "Do not merge external market and internal operation/finance/product entities unless explicit verified mapping exists."
  };

  const mergedClientContext = strictServerOnly ? {} : (clientContext || {});
  return {
    universe_policy:
      strictServerOnly
        ? defaultUniversePolicy
        : (clientContext as any)?.universe_policy || defaultUniversePolicy,
    context_policy: {
      strict_server_only: strictServerOnly
    },
    server_context: {
      generated_at: new Date().toISOString(),
      ...serverContext
    },
    client_context: mergedClientContext
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

function toJsonSafe<T>(value: unknown, fallback: T): T {
  try {
    return JSON.parse(JSON.stringify(value ?? fallback));
  } catch {
    return fallback;
  }
}

function asksTradePerformance(question: string): boolean {
  return /(trade\s*performance|overall\s*performance|business\s*performance|ผลงานการค้า|สรุป\s*trade\s*performance|สรุปผลงาน|สรุปผลการดำเนินงาน|ภาพรวมผลงาน)/i.test(
    String(question || "")
  );
}

function asksTotalPurchaseValue(question: string): boolean {
  return /(total\s*purchase\s*value|มูลค่าซื้อรวม|มูลค่าการซื้อรวม|ยอดซื้อรวม|มูลค่าซื้อทั้งหมด)/i.test(String(question || ""));
}

function asksLast12mPurchaseValue(question: string): boolean {
  return /(purchase\s*value\s*last\s*12m|last\s*12\s*months|12m|12\s*เดือน|ช่วง\s*12\s*เดือน|ย้อนหลัง\s*12\s*เดือน)/i.test(
    String(question || "")
  );
}

function buildDeterministicDefaultAnswer(question: string, expectsJson: boolean, serverContext: any): string | null {
  const normalizedQuestion = String(question || "").toLowerCase();
  const financeSummary = serverContext?.analytics?.finance?.summary || null;
  const operationSummary = serverContext?.analytics?.operation?.summary || null;

  if (
    expectsJson &&
    /\btotal_invoices\b/.test(normalizedQuestion) &&
    /\btotal_usd\b/.test(normalizedQuestion) &&
    financeSummary
  ) {
    return JSON.stringify(
      {
        total_invoices: toNumber(financeSummary.total_invoices),
        total_usd: Number(toNumber(financeSummary.total_usd).toFixed(2))
      },
      null,
      2
    );
  }

  if (asksTradePerformance(question) && (financeSummary || operationSummary)) {
    const lines: string[] = [];
    lines.push("สรุป Trade Performance:");
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
    return lines.join("\n");
  }

  return null;
}

function buildDeterministicCompanyDetailAnswer(question: string, expectsJson: boolean, serverContext: any): string | null {
  const normalizedQuestion = String(question || "").toLowerCase();
  const detail = serverContext?.analytics?.company_detail || null;
  const metrics = detail?.metrics || null;
  const company = detail?.company || null;
  if (!detail || !metrics || !company) return null;

  if (expectsJson) {
    if (
      /\btotal_purchase_value\b/.test(normalizedQuestion) &&
      /\bpurchase_value_last_12m\b/.test(normalizedQuestion)
    ) {
      return JSON.stringify(
        {
          total_purchase_value: Number(toNumber(metrics.total_purchase_value).toFixed(2)),
          purchase_value_last_12m: Number(toNumber(metrics.purchase_value_last_12m).toFixed(2))
        },
        null,
        2
      );
    }

    if (/\bstatus\b/.test(normalizedQuestion) && /\bis_customer\b/.test(normalizedQuestion)) {
      const statusDef = company?.status_definition || null;
      const isCustomer = typeof statusDef?.is_customer === "boolean" ? statusDef.is_customer : null;
      return JSON.stringify(
        {
          status: normalizeMarketStatus(company?.status),
          is_customer: isCustomer
        },
        null,
        2
      );
    }
  }

  const asksTotal = asksTotalPurchaseValue(question);
  const asksLast12m = asksLast12mPurchaseValue(question);
  if (asksTotal && !asksLast12m) {
    return `Total Purchase Value: ${formatMetricNumber(metrics.total_purchase_value)}`;
  }
  if (asksLast12m && !asksTotal) {
    return `Purchase Value (Last 12M): ${formatMetricNumber(metrics.purchase_value_last_12m)}`;
  }

  return null;
}

function buildDeterministicAnswer(input: {
  question: string;
  expectsJson: boolean;
  isCompanyDetailMode: boolean;
  serverContext: any;
}): string | null {
  if (input.isCompanyDetailMode) {
    return buildDeterministicCompanyDetailAnswer(input.question, input.expectsJson, input.serverContext);
  }
  return buildDeterministicDefaultAnswer(input.question, input.expectsJson, input.serverContext);
}

async function writeAiTelemetryEvent(client: any, payload: Record<string, unknown>) {
  if (!client) return;
  try {
    const safePayload = toJsonSafe(payload, {});
    const { error } = await client.from("ai_telemetry_events").insert(safePayload);
    if (error) {
      console.error("ai_telemetry_events insert failed:", error.message || error);
    }
  } catch (error) {
    console.error("ai_telemetry_events insert exception:", String((error as Error)?.message || error));
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return toJson({ error: "Method not allowed" }, 405);
  }

  try {
    const requestStartedAt = Date.now();
    const body = await req.json();
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY") || "";

    const defaultModel = Deno.env.get("CLAUDE_MODEL") || "claude-sonnet-4-20250514";
    const model = String(body?.model || defaultModel).trim() || defaultModel;
    const requestMode = String(body?.mode || "default").trim().toLowerCase();
    const isCompanyDetailMode = requestMode === "company_detail";
    const strictServerOnly = body?.strict_server_only !== false;
    const prompt = trimText(body?.prompt, MAX_PROMPT_CHARS);
    const messages = normalizeMessages(Array.isArray(body?.messages) ? body.messages : [])
      .slice(-MAX_MESSAGES_FOR_MODEL);
    const clientContext = body?.context ?? {};

    if (!prompt && messages.length === 0) {
      return toJson({ error: "prompt or messages is required" }, 400);
    }

    const authState = await authenticateRequest(req, body);
    if (authState.error || !authState.client || !authState.user) {
      const status =
        authState.error === "SUPABASE_URL or SUPABASE_ANON_KEY is not configured" ||
        authState.error === "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured"
          ? 500
          : 401;
      return toJson({ error: authState.error || "Unauthorized" }, status);
    }

    const question = getLatestUserQuestion(prompt, messages);
    const requestId = crypto.randomUUID();
    const expectsJson = isJsonRequested(question);
    const isLineInternalMode = authState.auth_mode === "line_internal";
    if (isLineInternalMode && isCompanyDetailMode) {
      return toJson({ error: "company_detail mode is not supported for line internal scope" }, 400);
    }
    const readOnlyServerContext = isCompanyDetailMode
      ? await buildCompanyDetailServerContext(authState.client, question, clientContext)
      : isLineInternalMode && authState.scoped_entity_id
        ? await buildEntityScopedServerContext(
            authState.client,
            question,
            strictServerOnly,
            authState.scoped_entity_id
          )
        : await buildReadOnlyServerContext(authState.client, question, clientContext, strictServerOnly);
    const mergedContext = mergeContext(clientContext, readOnlyServerContext, strictServerOnly);

    const companySourceRule = strictServerOnly
      ? "Use server_context.analytics.company_detail as sole source of truth. Ignore client_context for factual values except company_id selector."
      : "Use server_context.analytics.company_detail as primary source of truth and client_context as supplementary context.";
    const defaultSourceRule = strictServerOnly
      ? "Use only server_context.analytics and server_context.focused_views as factual source. Ignore client_context for business facts."
      : "Use server_context.analytics as primary source of truth and client_context as supplementary context.";
    const lineInternalRule = isLineInternalMode
      ? "This request comes from LINE private chat. Available domains are operation and finance only for a single scoped entity. " +
        "Do not answer with market or product data in this channel. If user asks those domains, say they are unavailable in current LINE scope."
      : "";
    const lineOutputRule = isLineInternalMode
      ? expectsJson
        ? "If JSON is requested, keep payload concise and include only fields needed for the asked intent."
        : "LINE output style: use short-first by default. Return 4-6 lines maximum unless user explicitly asks for detail. " +
          "Format: line 1 summary, lines 2-5 key metrics, final line recommended action. " +
          "Use plain text only and never include markdown symbols."
      : "";
    const productScopeRule = strictServerOnly
      ? "Use product rows exactly as provided in server_context."
      : "Product rows in server_context are pre-filtered by the web catalog scope from client_context.product_scope.";
    const jsonOutputRule = expectsJson
      ? "Return only valid JSON. Do not include prose, markdown, code fences, or trailing commentary. Use plain numeric values without thousands separators."
      : "Output plain text only. Do not use markdown syntax such as **, __, #, or ``` blocks.";
    const defaultNumericRule = expectsJson
      ? "If numbers appear in JSON, keep them as plain numeric values without commas."
      : "Format all numeric values with thousands separators (e.g., 143,149.65).";

    const systemInstruction = isCompanyDetailMode
      ? "You are an analyst for a single company detail page. " +
        companySourceRule + " " +
        "Do not use or infer any global/cross-company data outside this company_id scope. " +
        "Business rule (strict): market status green means already our customer, and yellow means not yet our customer/prospect. " +
        "Never describe yellow as only watchlist/caution without saying it is not yet a customer. " +
        "Metric mapping is strict: total_purchase_value means cumulative total purchase value, while purchase_value_last_12m means rolling 12-month value. " +
        "Never swap total_purchase_value with purchase_value_last_12m. " +
        "If user asks for a single metric (for example, Total Purchase Value), answer with that metric only and do not append unrelated notes unless asked. " +
        "Keep answers concise, practical, and numeric when possible. " +
        "Always include explicit period labels when discussing trends. " +
        "Do not include source tags/citation blocks unless explicitly requested by user. " +
        lineInternalRule + " " +
        lineOutputRule + " " +
        jsonOutputRule + " " +
        "If data is insufficient, state exactly which section in server_context.analytics.company_detail is missing."
      : "You are a business analyst for a dashboard with four domains: market (external), operation (internal), finance (internal), and product (internal). " +
        defaultSourceRule + " " +
        lineInternalRule + " " +
        lineOutputRule + " " +
        "Prioritize server_context.focused_views according to server_context.intents_requested for this question. " +
        "Use only views relevant to the detected intent unless user explicitly asks cross-intent comparison. " +
        "Keep answers minimalist and concise, focusing only on the requested output. " +
        defaultNumericRule + " " +
        "For monthly performance, prioritize finance.monthly_performance and operation.monthly_delivery_performance. " +
        "For top customers, prioritize finance.top_customers_by_usd, finance.top_customers_by_tons, and operation.top_customers_by_contract_tons. " +
        "For risk questions, prioritize operation.overdue_by_customer and operation.summary. " +
        "If the question is about overdue status, always state total overdue lines first, then list overdue customers with overdue_lines and overdue_remaining_tons. " +
        "For stock questions, prioritize operation.stock_by_factory and operation.stock_by_type. " +
        "For market concentration questions, prioritize market.concentration and market.top_countries. " +
        "For market status meaning, use market.status_definitions. Example: if yellow has is_customer=false, explain that it is not yet our customer. " +
        "Business rule (strict): status yellow always means not yet our customer/prospect, and status green means already our customer. " +
        "Do not reinterpret yellow as only watchlist/caution without non-customer meaning. " +
        "For product/spec questions, prioritize product.summary, product.top_brands, and product.sample_products. " +
        productScopeRule + " " +
        "When the user asks top N and data is sufficient, return exactly N rows. " +
        "Always include numeric values and explicit month/period labels when available. " +
        "Do not include source tags or citation blocks unless the user explicitly asks for sources. " +
        "Respect cross-universe boundary: do not merge external market entities with internal operation/finance/product entities unless explicit mapping exists in context. " +
        jsonOutputRule + " " +
        "If data is insufficient, state exactly which table/domain is missing.";

    const baseMessages = buildBaseMessages(mergedContext, messages, prompt);
    let answer = "";
    let finishReason: string | null = null;
    let continuationRounds = 0;
    let usage: any = null;
    let providerError: string | null = null;

    const deterministicAnswer = buildDeterministicAnswer({
      question,
      expectsJson,
      isCompanyDetailMode,
      serverContext: readOnlyServerContext
    });

    if (deterministicAnswer) {
      answer = deterministicAnswer;
      finishReason = "RULE_BASED";
      usage = null;
    } else {
      try {
        if (!anthropicKey) {
          providerError = "ANTHROPIC_API_KEY is not configured";
          finishReason = "FALLBACK";
          answer = isCompanyDetailMode
            ? "Unable to generate a company-specific answer right now. Please try again in 10-30 seconds."
            : buildFallbackAnswer(question, readOnlyServerContext, providerError);
        } else {
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
        }
      } catch (error) {
        providerError = String((error as Error)?.message || "provider request failed");
        finishReason = "FALLBACK";
        answer = isCompanyDetailMode
          ? "Unable to generate a company-specific answer right now. Please try again in 10-30 seconds."
          : buildFallbackAnswer(question, readOnlyServerContext, providerError);
      }
    }

    answer = enforceMinimalAnswerStyle(answer || "", { jsonMode: expectsJson });

    const generatedAt = new Date().toISOString();
    const latencyMs = Math.max(0, Date.now() - requestStartedAt);
    const telemetryPayload: Record<string, unknown> = {
      request_id: requestId,
      request_mode: requestMode,
      user_id: authState.user.id,
      model,
      strict_server_only: strictServerOnly,
      question: trimText(question, 1200),
      domains_requested: toJsonSafe(readOnlyServerContext?.domains_requested || {}, {}),
      intents_requested: toJsonSafe(readOnlyServerContext?.intents_requested || {}, {}),
      row_counts: toJsonSafe(readOnlyServerContext?.row_counts || {}, {}),
      tool_report: toJsonSafe(readOnlyServerContext?.tool_layer || {}, {}),
      finish_reason: finishReason || null,
      continuation_rounds: continuationRounds,
      provider_error: providerError,
      latency_ms: latencyMs
    };
    if (authState.scoped_entity_id) {
      telemetryPayload.entity_id = authState.scoped_entity_id;
    }
    await writeAiTelemetryEvent(authState.client, telemetryPayload);

    return toJson({
      request_id: requestId,
      answer,
      model,
      generated_at: generatedAt,
      request_mode: requestMode,
      finish_reason: finishReason || null,
      continuation_rounds: continuationRounds,
      usage,
      citations: readOnlyServerContext?.source_citations || [],
      tool_report: readOnlyServerContext?.tool_layer || null,
      intents_requested: readOnlyServerContext?.intents_requested || null,
      focused_views: readOnlyServerContext?.focused_views || null,
      row_counts: readOnlyServerContext?.row_counts || {},
      strict_server_only: strictServerOnly,
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
