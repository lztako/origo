const runtimeConfig = typeof window.getSupabaseRuntimeConfig === "function"
  ? window.getSupabaseRuntimeConfig()
  : {
      envKey: "prod",
      label: "PROD",
      url: "https://adybfyqyoyinmpsftrde.supabase.co",
      publishableKey: "sb_publishable_ho8IqSNFZgb6xS6LSJDUAw_QNJiyAVe",
      ready: true,
      errorMessage: "",
      appendEnvToPath: (path) => String(path || "")
    };

if (!runtimeConfig.ready) {
  throw new Error(runtimeConfig.errorMessage || "Supabase environment is not configured.");
}

const SUPABASE_URL = runtimeConfig.url;
const SUPABASE_PUBLISHABLE_KEY = runtimeConfig.publishableKey;
const ACTIVE_SUPABASE_ENV = String(runtimeConfig.envKey || "prod");
const appendEnvToPath = typeof runtimeConfig.appendEnvToPath === "function"
  ? runtimeConfig.appendEnvToPath
  : (path) => String(path || "");

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
if (window.Chart && window.ChartDataLabels) {
  window.Chart.register(window.ChartDataLabels);
}

if (ACTIVE_SUPABASE_ENV === "demo" && typeof document?.title === "string" && !document.title.includes("[DEMO]")) {
  document.title = `${document.title} [DEMO]`;
}

function buildLoginUrlWithNext() {
  const pathName = String(window.location.pathname || "");
  const fileName = pathName.endsWith("/")
    ? "index.html"
    : (pathName.split("/").pop() || "index.html");
  const nextPath = `${fileName}${window.location.search || ""}`;
  return appendEnvToPath(`login.html?next=${encodeURIComponent(nextPath)}`);
}

function redirectToLoginPage() {
  window.location.replace(buildLoginUrlWithNext());
}

async function requireAuthenticatedSession() {
  try {
    const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession();
    if (sessionError || !sessionData?.session) {
      redirectToLoginPage();
      return null;
    }

    const { data: userData, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !userData?.user) {
      await supabaseClient.auth.signOut().catch(() => {});
      redirectToLoginPage();
      return null;
    }

    return sessionData.session;
  } catch (_error) {
    redirectToLoginPage();
    return null;
  }
}

async function getValidAccessTokenOrRedirect() {
  const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession();
  const accessToken = sessionData?.session?.access_token || "";
  const { data: userData, error: userError } = await supabaseClient.auth.getUser();
  if (!sessionError && accessToken && !userError && userData?.user) {
    return accessToken;
  }

  await supabaseClient.auth.signOut().catch(() => {});
  redirectToLoginPage();
  throw new Error("Session expired. Please sign in again.");
}

async function callAiAgentWithAuth(payload) {
  const accessToken = await getValidAccessTokenOrRedirect();
  const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-agent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify(payload)
  });

  let responseBody = null;
  try {
    responseBody = await response.json();
  } catch (_error) {
    responseBody = null;
  }

  if (!response.ok) {
    const status = Number(response.status || 0);
    const errorMessage = String(
      responseBody?.error ||
      responseBody?.message ||
      `Edge Function error (status ${status || "unknown"})`
    );
    const wrappedError = new Error(errorMessage);
    wrappedError.status = status;
    throw wrappedError;
  }

  return responseBody || {};
}

const TRADE_TABLE_PAGE_SIZE = 10;
const HISTORY_TREND_MONTHS = 18;
const COMPANY_AI_MODEL = "claude-sonnet-4-20250514";
const TRADE_HISTORY_QUERY_LIMIT = 1000;
const TRADE_SUPPLY_QUERY_LIMIT = 1000;
const SUPPLY_SNAPSHOT_CLUSTER_GAP_MS = 2 * 60 * 1000;
const SUPPLY_SANKEY_NODE_PADDING = 22;
const SUPPLY_SANKEY_MIN_LINK_THICKNESS_PX = 6;
const SUPPLY_SANKEY_INLINE_LABEL_MIN_THICKNESS_PX = 12;
const EMAIL_IMPORTANCE_RANK = {
  "high-high": 1,
  "high-medium": 2,
  "high-low": 3,
  "medium-high": 4,
  "medium-medium": 5,
  "medium-low": 6,
  "low-high": 7,
  "low-medium": 8,
  "low-low": 9
};

const elements = {
  companyName: document.getElementById("companyName"),
  sidebarCompanyLabel: document.getElementById("sidebarCompanyLabel"),
  companyLocationChip: document.getElementById("companyLocationChip"),
  companyStatusChip: document.getElementById("companyStatusChip"),
  errorBox: document.getElementById("errorBox"),

  tradesValue: document.getElementById("tradesValue"),
  latestPurchaseValue: document.getElementById("latestPurchaseValue"),
  purchase12mValue: document.getElementById("purchase12mValue"),
  supplierCountValue: document.getElementById("supplierCountValue"),
  freshnessValue: document.getElementById("freshnessValue"),

  tabButtons: Array.from(document.querySelectorAll("[data-tab-target]")),
  tabPanels: Array.from(document.querySelectorAll("[data-tab-panel]")),

  productDescriptionValue: document.getElementById("productDescriptionValue"),
  toggleProductBtn: document.getElementById("toggleProductBtn"),
  overviewTableBody: document.getElementById("overviewTableBody"),

  organizationTableBody: document.getElementById("organizationTableBody"),
  contactTableBody: document.getElementById("contactTableBody"),
  emailTableBody: document.getElementById("emailTableBody"),

  historyRowsValue: document.getElementById("historyRowsValue"),
  historyUsdValue: document.getElementById("historyUsdValue"),
  historyLatestValue: document.getElementById("historyLatestValue"),
  historyTableBody: document.getElementById("historyTableBody"),
  historyPaginationInfo: document.getElementById("historyPaginationInfo"),
  historyPrevBtn: document.getElementById("historyPrevBtn"),
  historyNextBtn: document.getElementById("historyNextBtn"),
  historyTrendMetric: document.getElementById("historyTrendMetric"),
  historyTrendChart: document.getElementById("historyTrendChart"),

  supplyRowsValue: document.getElementById("supplyRowsValue"),
  supplyUsdValue: document.getElementById("supplyUsdValue"),
  supplyTopShareValue: document.getElementById("supplyTopShareValue"),
  supplyTableBody: document.getElementById("supplyTableBody"),
  supplyPaginationInfo: document.getElementById("supplyPaginationInfo"),
  supplyPrevBtn: document.getElementById("supplyPrevBtn"),
  supplyNextBtn: document.getElementById("supplyNextBtn"),
  supplySankeyChart: document.getElementById("supplySankeyChart"),

  companyAiError: document.getElementById("companyAiErrorBanner"),
  companyAiTabPanel: document.getElementById("tab-ai-agent"),
  companyAiEmptyState: document.getElementById("companyAiEmptyState"),
  companyAiChatBody: document.getElementById("companyAiChatBody"),
  companyAiChatInput: document.getElementById("companyAiChatInput"),
  companyAiSendBtn: document.getElementById("companyAiSendBtn"),
  companyAiClearBtn: document.getElementById("companyAiClearBtn")
};

const detailState = {
  activeTab: "overview",
  companyName: "",
  companyId: "",
  companyPayload: null,
  productExpanded: false,
  overviewRows: [],
  historyRows: [],
  historyPage: 0,
  supplyRows: [],
  supplyPage: 0,
  historyTrendMetric: "usd",
  companyAiMessages: [],
  companyAiBootstrapped: false,
  companyAiSending: false,
  companyAiHasStartedTyping: false,
  tradeDataLoading: false,
  tradeDataLoaded: false
};

let supplySankeyChartInstance = null;
let historyTrendChartInstance = null;

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function setError(message) {
  elements.errorBox.textContent = message;
  elements.errorBox.style.display = "block";
}

function clearError() {
  elements.errorBox.textContent = "";
  elements.errorBox.style.display = "none";
}

function getCompanyIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return String(params.get("company_id") || "").trim();
}

function formatNumber(value, maximumFractionDigits = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "-";
  return numeric.toLocaleString("en-US", { maximumFractionDigits });
}

function toNumericValue(value) {
  const text = String(value ?? "")
    .trim()
    .replace(/[, ]+/g, "");
  if (!text) return 0;
  const numeric = Number(text);
  return Number.isFinite(numeric) ? numeric : 0;
}

function formatPercent(value, digits = 1) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "-";
  return `${numeric.toFixed(digits)}%`;
}

function normalizeUnitText(value) {
  return String(value || "").trim().toUpperCase();
}

function toMassTons(quantityValue, unitValue) {
  const quantity = Number(quantityValue);
  if (!Number.isFinite(quantity)) return null;

  const unit = normalizeUnitText(unitValue);
  if (!unit) return null;

  const tonUnits = new Set(["TON", "TONS", "MT", "MTS", "METRIC TON", "METRIC TONS", "T"]);
  const kgUnits = new Set(["KG", "KGS", "KGM", "KILOGRAM", "KILOGRAMS"]);

  if (tonUnits.has(unit)) return quantity;
  if (kgUnits.has(unit)) return quantity / 1000;
  return null;
}

function computeSupplyPriceSharePercent(row, totalUsd) {
  const safeTotalUsd = Number(totalUsd || 0);
  if (!Number.isFinite(safeTotalUsd) || safeTotalUsd <= 0) return null;

  const rowUsd = Number(row?.total_price_usd || 0);
  if (!Number.isFinite(rowUsd) || rowUsd < 0) return null;
  return (rowUsd / safeTotalUsd) * 100;
}

function sortSupplyRowsByUsdDesc(rows) {
  return [...rows].sort((left, right) => Number(right.total_price_usd || 0) - Number(left.total_price_usd || 0));
}

function pickSupplySnapshotRows(rows) {
  const safeRows = Array.isArray(rows) ? rows : [];
  if (!safeRows.length) return [];

  const rowsWithSnapshotId = safeRows.filter((row) => String(row.snapshot_id || "").trim() !== "");
  if (rowsWithSnapshotId.length) {
    const bySnapshot = new Map();
    rowsWithSnapshotId.forEach((row) => {
      const snapshotId = String(row.snapshot_id || "").trim();
      const bucket = bySnapshot.get(snapshotId) || { rows: [], latestTimestamp: 0 };
      bucket.rows.push(row);
      const timestamp = toTimestamp(row.created_at) || 0;
      bucket.latestTimestamp = Math.max(bucket.latestTimestamp, timestamp);
      bySnapshot.set(snapshotId, bucket);
    });

    const latestSnapshot = Array.from(bySnapshot.entries())
      .map(([snapshotId, bucket]) => ({
        snapshotId,
        latestTimestamp: bucket.latestTimestamp,
        rows: bucket.rows
      }))
      .sort((left, right) => {
        if (right.latestTimestamp !== left.latestTimestamp) {
          return right.latestTimestamp - left.latestTimestamp;
        }
        return right.snapshotId.localeCompare(left.snapshotId);
      })[0];

    return sortSupplyRowsByUsdDesc(latestSnapshot?.rows || []);
  }

  const rowsWithTimestamp = safeRows
    .map((row) => ({
      row,
      timestamp: toTimestamp(row.created_at)
    }))
    .filter((entry) => Number.isFinite(entry.timestamp))
    .sort((left, right) => right.timestamp - left.timestamp);

  if (!rowsWithTimestamp.length) {
    return sortSupplyRowsByUsdDesc(safeRows);
  }

  const groups = [];
  rowsWithTimestamp.forEach((entry) => {
    const group = groups[groups.length - 1];
    if (!group) {
      groups.push({ latestTimestamp: entry.timestamp, entries: [entry] });
      return;
    }
    const previousTimestamp = group.entries[group.entries.length - 1].timestamp;
    if (previousTimestamp - entry.timestamp <= SUPPLY_SNAPSHOT_CLUSTER_GAP_MS) {
      group.entries.push(entry);
      return;
    }
    groups.push({ latestTimestamp: entry.timestamp, entries: [entry] });
  });

  let selectedGroup = groups[0];
  groups.forEach((group) => {
    if (group.entries.length > selectedGroup.entries.length) {
      selectedGroup = group;
      return;
    }
    if (group.entries.length === selectedGroup.entries.length && group.latestTimestamp > selectedGroup.latestTimestamp) {
      selectedGroup = group;
    }
  });

  return sortSupplyRowsByUsdDesc(selectedGroup.entries.map((entry) => entry.row));
}

function formatCurrency(value, currency = "USD", maximumFractionDigits = 2) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "-";
  return numeric.toLocaleString("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits
  });
}

function formatCompactNumber(value, maximumFractionDigits = 1) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "-";
  return numeric.toLocaleString("en-US", {
    notation: "compact",
    maximumFractionDigits
  });
}

function formatCurrencyCompact(value, currency = "USD", maximumFractionDigits = 1) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "-";
  try {
    return numeric.toLocaleString("en-US", {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits
    });
  } catch (_error) {
    return formatCurrency(numeric, currency, 0);
  }
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    const fallback = new Date(`${value}T00:00:00`);
    if (Number.isNaN(fallback.getTime())) return String(value);
    return fallback.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" });
  }
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" });
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return formatDate(value);
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function monthKey(value) {
  if (!value) return null;
  const text = String(value).trim();
  if (!text) return null;
  const date = new Date(text.includes("T") ? text : `${text}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function formatMonthLabel(value) {
  if (!value) return "-";
  const date = new Date(`${value}-01T00:00:00`);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-US", { year: "2-digit", month: "short" });
}

function isMeaningfulValue(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) return value.some((item) => String(item ?? "").trim() !== "");
  return true;
}

function formatFieldValue(value, key = "") {
  if (!isMeaningfulValue(value)) return "-";
  if (Array.isArray(value)) {
    const values = value.map((item) => String(item ?? "").trim()).filter((item) => item !== "");
    return values.length ? values.join(", ") : "-";
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return formatNumber(value, 2);
  if (key.includes("_date") || key.endsWith("_at")) return formatDate(value);
  return String(value).trim() || "-";
}

function toSafeText(value) {
  if (!isMeaningfulValue(value)) return "-";
  return String(value).trim();
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function resolveImportanceRank(value) {
  const key = String(value || "").trim().toLowerCase();
  if (!key) return 999;
  return EMAIL_IMPORTANCE_RANK[key] || 998;
}

function compareText(left, right) {
  return String(left || "").localeCompare(String(right || ""), undefined, { sensitivity: "base" });
}

function normalizeLinkedInUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const parsed = new URL(withProtocol);
    if (!/^https?:$/i.test(parsed.protocol)) return "";
    return parsed.href;
  } catch (_error) {
    return "";
  }
}

function buildLinkedInCell(value) {
  const normalizedUrl = normalizeLinkedInUrl(value);
  if (!normalizedUrl) return '<span class="empty-cell">No LinkedIn</span>';
  return `<a href="${escapeHtml(normalizedUrl)}" target="_blank" rel="noopener noreferrer">LinkedIn</a>`;
}

function buildContactEmailNameMap(contacts) {
  const map = new Map();
  contacts.forEach((row) => {
    const name = String(row?.contact_name || "").trim();
    if (!name) return;
    [row?.business_email, row?.supplement_email_1]
      .map((email) => normalizeEmail(email))
      .filter(Boolean)
      .forEach((email) => {
        if (!map.has(email)) {
          map.set(email, name);
        }
      });
  });
  return map;
}

function sortContactsDefault(rows) {
  return [...rows].sort((left, right) => {
    const leftCreated = toTimestamp(left?.created_at) || 0;
    const rightCreated = toTimestamp(right?.created_at) || 0;
    if (rightCreated !== leftCreated) return rightCreated - leftCreated;

    const leftName = String(left?.contact_name || "").trim();
    const rightName = String(right?.contact_name || "").trim();
    if (!leftName && rightName) return 1;
    if (leftName && !rightName) return -1;
    return compareText(leftName, rightName);
  });
}

function sortEmailsDefault(rows) {
  return [...rows].sort((left, right) => {
    const importanceDelta = resolveImportanceRank(left?.importance) - resolveImportanceRank(right?.importance);
    if (importanceDelta !== 0) return importanceDelta;

    const leftCreated = toTimestamp(left?.created_at) || 0;
    const rightCreated = toTimestamp(right?.created_at) || 0;
    if (rightCreated !== leftCreated) return rightCreated - leftCreated;

    return compareText(left?.email, right?.email);
  });
}

function setActiveTab(tabKey) {
  detailState.activeTab = tabKey;
  document.body.classList.toggle("company-ai-agent-active", tabKey === "ai-agent");

  elements.tabButtons.forEach((button) => {
    const isActive = button.dataset.tabTarget === tabKey;
    button.classList.toggle("active", isActive);
  });

  elements.tabPanels.forEach((panel) => {
    const isActive = panel.dataset.tabPanel === tabKey;
    panel.classList.toggle("active", isActive);
  });

  if (tabKey === "trade") {
    renderTradeTabVisuals();
    if (detailState.tradeDataLoading && !detailState.tradeDataLoaded) {
      renderTradeLoadingState();
    }
    void ensureTradeDataLoaded();
  }
  if (tabKey === "ai-agent") {
    bootstrapCompanyAiAgent();
    syncCompanyAiInitialState();
  }
}

function renderProductDescription(value) {
  const text = toSafeText(value);
  detailState.productExpanded = false;
  elements.productDescriptionValue.textContent = text;

  const hasOverflow = text.length > 220;
  elements.toggleProductBtn.classList.toggle("hidden", !hasOverflow);
  elements.productDescriptionValue.classList.toggle("clamped", hasOverflow);
  elements.toggleProductBtn.textContent = "Read more";
}

function renderKeyValueRows(target, rows) {
  if (!target) return;
  if (!rows.length) {
    target.innerHTML = `
      <tr>
        <th>Details</th>
        <td class="empty-cell">No data found.</td>
      </tr>
    `;
    return;
  }

  target.innerHTML = rows
    .map((row) => `
      <tr>
        <th>${escapeHtml(row.label)}</th>
        <td>${typeof row.valueHtml === "string" ? row.valueHtml : escapeHtml(row.value)}</td>
      </tr>
    `)
    .join("");
}

function buildOverviewRows(company, overview) {
  const fields = [
    ["business_overview", "Business Overview"],
    ["company_introduction", "Company Introduction"],
    ["procurement_overview", "Procurement Overview"],
    ["total_purchase_value", "Total Purchase Value"],
    ["purchase_value_last_12m", "Purchase Value (Last 12M)"],
    ["purchase_frequency_per_year", "Purchase Frequency / Year"],
    ["latest_purchase_date", "Latest Purchase Date"],
    ["purchase_interval_days", "Purchase Interval (Days)"],
    ["is_active", "Is Active"],
    ["trade_start_date", "Trade Start Date"],
    ["trade_end_date", "Trade End Date"],
    ["core_products", "Core Products"],
    ["core_supplier_countries", "Core Supplier Countries"],
    ["core_suppliers", "Core Suppliers"],
    ["recent_trends", "Recent Trends"],
    ["purchasing_trend", "Purchasing Trend"],
    ["purchase_stability", "Purchase Stability"],
    ["purchase_activity", "Purchase Activity"],
    ["indicator_review", "Indicator Review"],
    ["procurement_structure", "Procurement Structure"],
    ["updated_at", "Updated At"],
    ["value_tag", "Value Tag"]
  ];

  return fields
    .map(([key, label]) => {
      const source = key === "value_tag" ? company : overview;
      const value = formatFieldValue(source?.[key], key);
      if (!isMeaningfulValue(value) || value === "-") return null;
      return { label, value };
    })
    .filter(Boolean);
}

function renderOverviewRows() {
  if (!detailState.overviewRows.length) {
    renderKeyValueRows(elements.overviewTableBody, []);
    return;
  }

  renderKeyValueRows(elements.overviewTableBody, detailState.overviewRows);
}

function buildOrganizationRows(info) {
  const normalizeNameValue = (value) =>
    String(value || "")
      .trim()
      .replace(/\s+/g, " ")
      .toLocaleLowerCase();
  const standardNameNormalized = normalizeNameValue(info?.name_standard);
  const englishNameNormalized = normalizeNameValue(info?.name_en);
  const shouldHideEnglishName =
    !englishNameNormalized ||
    (Boolean(standardNameNormalized) && englishNameNormalized === standardNameNormalized);

  const fields = [
    ["name_standard", "Name (Standard)"],
    ["name_en", "Name (English)"],
    ["location", "Location"],
    ["website", "Website"],
    ["linkedin", "LinkedIn"],
    ["operating_status", "Operating Status"],
    ["organization_type", "Organization Type"],
    ["founded", "Founded"],
    ["employees", "Employees"],
    ["address", "Address"],
    ["zip_code", "ZIP Code"],
    ["country_id_no", "Country ID"],
    ["vat", "VAT"],
    ["legal_entity_code", "Legal Entity Code"],
    ["duty_paragraph", "Duty Paragraph"],
    ["company_profile", "Company Profile"],
    ["created_at", "Created At"]
  ];

  return fields
    .map(([key, label]) => {
      if (key === "name_en" && shouldHideEnglishName) {
        return null;
      }
      if (key === "linkedin") {
        return {
          label,
          valueHtml: buildLinkedInCell(info?.linkedin)
        };
      }
      const value = formatFieldValue(info?.[key], key);
      if (!isMeaningfulValue(value) || value === "-") return null;
      return { label, value };
    })
    .filter(Boolean);
}

function renderEmptyRow(targetBody, colSpan, text) {
  targetBody.innerHTML = `
    <tr>
      <td class="empty-cell" colspan="${colSpan}">${escapeHtml(text)}</td>
    </tr>
  `;
}

function renderTradeLoadingState() {
  if (elements.historyRowsValue) {
    elements.historyRowsValue.textContent = "Loading...";
  }
  if (elements.historyUsdValue) {
    elements.historyUsdValue.textContent = "Loading...";
  }
  if (elements.historyLatestValue) {
    elements.historyLatestValue.textContent = "Loading...";
  }
  if (elements.supplyRowsValue) {
    elements.supplyRowsValue.textContent = "Loading...";
  }
  if (elements.supplyUsdValue) {
    elements.supplyUsdValue.textContent = "Loading...";
  }
  if (elements.supplyTopShareValue) {
    elements.supplyTopShareValue.textContent = "Loading...";
  }

  renderEmptyRow(elements.historyTableBody, 4, "Loading trade history...");
  renderEmptyRow(elements.supplyTableBody, 6, "Loading supply chain...");
  updatePaginationControls(0, 0, elements.historyPaginationInfo, elements.historyPrevBtn, elements.historyNextBtn);
  updatePaginationControls(0, 0, elements.supplyPaginationInfo, elements.supplyPrevBtn, elements.supplyNextBtn);
}

function applyTradeData(historyRows, supplyRows) {
  detailState.historyRows = Array.isArray(historyRows) ? historyRows : [];
  detailState.historyPage = 0;
  detailState.supplyRows = Array.isArray(supplyRows) ? supplyRows : [];
  detailState.supplyPage = 0;

  summarizeHistory(detailState.historyRows);
  renderHistoryTablePage();
  summarizeSupplyChain(detailState.supplyRows);
  renderSupplyChainTablePage();

  if (detailState.companyPayload) {
    detailState.companyPayload.historyRows = detailState.historyRows;
    detailState.companyPayload.supplyRows = detailState.supplyRows;
    renderSummary(
      detailState.companyPayload.company || {},
      detailState.companyPayload.overview || {},
      detailState.companyPayload
    );
  }

  if (detailState.activeTab === "trade") {
    renderTradeTabVisuals();
  }
}

async function loadTradeData(companyId) {
  const [historyRes, supplyRes] = await Promise.all([
    supabaseClient
      .from("company_history")
      .select("date, importer, exporter, hs_code, product, product_description, origin_country, destination_country, total_price_usd, weight_kg, quantity, quantity_unit, created_at")
      .eq("company_id", companyId)
      .order("date", { ascending: false })
      .limit(TRADE_HISTORY_QUERY_LIMIT),
    supabaseClient
      .from("company_supplychain")
      .select("snapshot_id, exporter, trades_sum, trade_frequency_ratio, kg_weight, weight_ratio, quantity, quantity_ratio, total_price_usd, total_price_ratio, created_at")
      .eq("company_id", companyId)
      .order("total_price_usd", { ascending: false })
      .limit(TRADE_SUPPLY_QUERY_LIMIT)
  ]);

  const errors = [historyRes, supplyRes]
    .map((response) => response.error)
    .filter(Boolean);

  if (errors.length) {
    throw errors[0];
  }

  const historyRows = historyRes.data || [];
  historyRows.sort((left, right) => {
    const leftDate = toTimestamp(left.date) || 0;
    const rightDate = toTimestamp(right.date) || 0;
    if (rightDate !== leftDate) return rightDate - leftDate;
    const leftCreated = toTimestamp(left.created_at) || 0;
    const rightCreated = toTimestamp(right.created_at) || 0;
    return rightCreated - leftCreated;
  });

  const rawSupplyRows = supplyRes.data || [];
  const supplyRows = pickSupplySnapshotRows(rawSupplyRows);
  return { historyRows, supplyRows };
}

async function ensureTradeDataLoaded() {
  if (detailState.tradeDataLoaded || detailState.tradeDataLoading) return;
  if (!detailState.companyId) return;

  detailState.tradeDataLoading = true;
  if (detailState.activeTab === "trade") {
    renderTradeLoadingState();
  }

  try {
    const { historyRows, supplyRows } = await loadTradeData(detailState.companyId);
    applyTradeData(historyRows, supplyRows);
    detailState.tradeDataLoaded = true;
  } catch (error) {
    if (detailState.activeTab === "trade") {
      renderEmptyRow(elements.historyTableBody, 4, "Failed to load trade history.");
      renderEmptyRow(elements.supplyTableBody, 6, "Failed to load supply chain.");
      updatePaginationControls(0, 0, elements.historyPaginationInfo, elements.historyPrevBtn, elements.historyNextBtn);
      updatePaginationControls(0, 0, elements.supplyPaginationInfo, elements.supplyPrevBtn, elements.supplyNextBtn);
    }
    setError(error?.message || "Unable to load trade and supply data.");
  } finally {
    detailState.tradeDataLoading = false;
  }
}

function renderContactsTable(rows) {
  if (!rows.length) {
    renderEmptyRow(elements.contactTableBody, 6, "No contact rows found.");
    return;
  }

  elements.contactTableBody.innerHTML = rows
    .map((row) => {
      const phone = [row.tel, row.whatsapp].filter((item) => isMeaningfulValue(item)).join(" / ") || "-";
      const contactName = String(row.contact_name || "").trim() || "No name";
      return `
        <tr>
          <td>${escapeHtml(contactName)}</td>
          <td>${escapeHtml(toSafeText(row.position))}</td>
          <td>${escapeHtml(toSafeText(row.department))}</td>
          <td>${escapeHtml(toSafeText(row.business_email || row.supplement_email_1))}</td>
          <td>${escapeHtml(toSafeText(phone))}</td>
          <td>${escapeHtml(toSafeText(row.region))}</td>
        </tr>
      `;
    })
    .join("");
}

function renderEmailsTable(rows) {
  if (!rows.length) {
    renderEmptyRow(elements.emailTableBody, 3, "No email rows found.");
    return;
  }

  elements.emailTableBody.innerHTML = rows
    .map((row) => `
      <tr>
        <td>${escapeHtml(toSafeText(row.email))}</td>
        <td>${escapeHtml(toSafeText(row.importance))}</td>
        <td>${escapeHtml(toSafeText(row.source))}</td>
      </tr>
    `)
    .join("");
}

function summarizeHistory(rows) {
  const usdTotal = rows.reduce((sum, row) => sum + Number(row.total_price_usd || 0), 0);
  const latestDate = rows.find((row) => isMeaningfulValue(row.date))?.date || null;

  if (elements.historyRowsValue) {
    elements.historyRowsValue.textContent = formatNumber(rows.length);
  }
  if (elements.historyUsdValue) {
    elements.historyUsdValue.textContent = formatCurrency(usdTotal, "USD", 0);
  }
  if (elements.historyLatestValue) {
    elements.historyLatestValue.textContent = formatDate(latestDate);
  }
}

function updatePaginationControls(totalRows, currentPage, infoElement, prevButton, nextButton, pageSize = TRADE_TABLE_PAGE_SIZE) {
  if (!infoElement || !prevButton || !nextButton) {
    return 0;
  }

  if (!totalRows) {
    infoElement.textContent = "Showing 0-0 of 0";
    prevButton.disabled = true;
    nextButton.disabled = true;
    return 0;
  }

  const maxPage = Math.max(Math.ceil(totalRows / pageSize) - 1, 0);
  const safePage = Math.min(Math.max(currentPage, 0), maxPage);
  const start = safePage * pageSize;
  const end = Math.min(start + pageSize, totalRows);

  infoElement.textContent = `Showing ${start + 1}-${end} of ${totalRows}`;
  prevButton.disabled = safePage <= 0;
  nextButton.disabled = safePage >= maxPage;
  return safePage;
}

function renderHistoryTablePage() {
  const rows = detailState.historyRows || [];
  if (!rows.length) {
    renderEmptyRow(elements.historyTableBody, 4, "No trade history rows found.");
    updatePaginationControls(0, 0, elements.historyPaginationInfo, elements.historyPrevBtn, elements.historyNextBtn);
    return;
  }

  detailState.historyPage = updatePaginationControls(
    rows.length,
    detailState.historyPage,
    elements.historyPaginationInfo,
    elements.historyPrevBtn,
    elements.historyNextBtn
  );

  const start = detailState.historyPage * TRADE_TABLE_PAGE_SIZE;
  const visibleRows = rows.slice(start, start + TRADE_TABLE_PAGE_SIZE);
  elements.historyTableBody.innerHTML = visibleRows
    .map((row) => {
      let quantity = "-";
      if (isMeaningfulValue(row.quantity)) {
        const numericQuantity = Number(row.quantity);
        const unit = toSafeText(row.quantity_unit);
        quantity = `${formatNumber(numericQuantity, 2)} ${unit}`;
        const tons = toMassTons(numericQuantity, row.quantity_unit);
        if (tons !== null && normalizeUnitText(row.quantity_unit) !== "TON" && normalizeUnitText(row.quantity_unit) !== "TONS") {
          quantity += ` (~${formatNumber(tons, 2)} TON)`;
        }
      }

      return `
        <tr>
          <td>${escapeHtml(formatDate(row.date))}</td>
          <td>${escapeHtml(toSafeText(row.product || row.product_description))}</td>
          <td>${escapeHtml(quantity)}</td>
          <td>${escapeHtml(formatCurrency(row.total_price_usd, "USD", 0))}</td>
        </tr>
      `;
    })
    .join("");
}

function summarizeSupplyChain(rows) {
  const totalUsd = rows.reduce((sum, row) => sum + Number(row.total_price_usd || 0), 0);
  const topUsd = rows.reduce((maxUsd, row) => Math.max(maxUsd, Number(row.total_price_usd || 0)), 0);
  const topShare = totalUsd > 0 ? (topUsd / totalUsd) * 100 : 0;

  if (elements.supplyRowsValue) {
    elements.supplyRowsValue.textContent = formatNumber(rows.length);
  }
  if (elements.supplyUsdValue) {
    elements.supplyUsdValue.textContent = formatCurrency(totalUsd, "USD", 0);
  }
  if (elements.supplyTopShareValue) {
    elements.supplyTopShareValue.textContent = formatPercent(topShare, 1);
  }
}

function renderSupplyChainTablePage() {
  const rows = detailState.supplyRows || [];
  if (!rows.length) {
    renderEmptyRow(elements.supplyTableBody, 6, "No supply chain rows found.");
    updatePaginationControls(0, 0, elements.supplyPaginationInfo, elements.supplyPrevBtn, elements.supplyNextBtn);
    return;
  }

  detailState.supplyPage = updatePaginationControls(
    rows.length,
    detailState.supplyPage,
    elements.supplyPaginationInfo,
    elements.supplyPrevBtn,
    elements.supplyNextBtn
  );

  const start = detailState.supplyPage * TRADE_TABLE_PAGE_SIZE;
  const visibleRows = rows.slice(start, start + TRADE_TABLE_PAGE_SIZE);
  const totalUsd = rows.reduce((sum, row) => sum + Number(row.total_price_usd || 0), 0);
  elements.supplyTableBody.innerHTML = visibleRows
    .map((row) => {
      const share = computeSupplyPriceSharePercent(row, totalUsd);
      const shareText = Number.isFinite(share) ? formatPercent(share, 1) : "-";
      return `
        <tr>
          <td>${escapeHtml(toSafeText(row.exporter))}</td>
          <td>${escapeHtml(formatNumber(row.trades_sum))}</td>
          <td>${escapeHtml(formatNumber(row.quantity, 2))}</td>
          <td>${escapeHtml(formatNumber(row.kg_weight, 2))}</td>
          <td>${escapeHtml(formatCurrency(row.total_price_usd, "USD", 0))}</td>
          <td>${escapeHtml(shareText)}</td>
        </tr>
      `;
    })
    .join("");
}

function buildHistoryTrendSeries(rows, metric = "usd", months = HISTORY_TREND_MONTHS) {
  const monthly = new Map();
  let quantityExcludedRows = 0;
  rows.forEach((row) => {
    const key = monthKey(row.date);
    if (!key) return;
    if (!monthly.has(key)) {
      monthly.set(key, { usd: 0, quantity: 0, trades: 0 });
    }
    const bucket = monthly.get(key);
    bucket.usd += Number(row.total_price_usd || 0);
    const quantityTon = toMassTons(row.quantity, row.quantity_unit);
    if (quantityTon !== null) {
      bucket.quantity += quantityTon;
    } else if (isMeaningfulValue(row.quantity)) {
      quantityExcludedRows += 1;
    }
    bucket.trades += 1;
  });

  const sortedKeys = Array.from(monthly.keys())
    .sort((left, right) => left.localeCompare(right))
    .slice(-(Number(months) || HISTORY_TREND_MONTHS));

  const activeMetric = ["usd", "quantity", "trades"].includes(metric) ? metric : "usd";
  return {
    metric: activeMetric,
    labels: sortedKeys.map((item) => formatMonthLabel(item)),
    values: sortedKeys.map((item) => Number(monthly.get(item)?.[activeMetric] || 0)),
    quantityExcludedRows
  };
}

function renderHistoryTrendChart() {
  if (!elements.historyTrendChart || typeof window.Chart === "undefined") return;

  if (historyTrendChartInstance) {
    historyTrendChartInstance.destroy();
    historyTrendChartInstance = null;
  }

  const context = elements.historyTrendChart.getContext("2d");
  if (!context) return;

  const series = buildHistoryTrendSeries(detailState.historyRows, detailState.historyTrendMetric, HISTORY_TREND_MONTHS);
  if (!series.labels.length) {
    context.clearRect(0, 0, elements.historyTrendChart.width, elements.historyTrendChart.height);
    context.fillStyle = "#8ca697";
    context.font = "14px 'Space Grotesk'";
    context.fillText("No trend data.", 12, 24);
    return;
  }

  const chartLabel = series.metric === "quantity"
    ? "Quantity (TON)"
    : series.metric === "trades"
      ? "Trades"
      : "USD";

  historyTrendChartInstance = new window.Chart(context, {
    type: "bar",
    data: {
      labels: series.labels,
      datasets: [
        {
          label: chartLabel,
          data: series.values,
          backgroundColor: "rgba(255, 189, 89, 0.72)",
          borderColor: "rgba(255, 189, 89, 0.95)",
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: {
          top: 18,
          bottom: 18
        }
      },
      onHover: (event) => {
        if (!event?.native?.target) return;
        event.native.target.style.cursor = "default";
      },
      plugins: {
        legend: { display: false },
        datalabels: {
          display: (contextValue) => Number(contextValue.dataset.data[contextValue.dataIndex] || 0) > 0,
          color: "#ffe3b2",
          anchor: "end",
          align: "top",
          offset: 4,
          clamp: true,
          clip: false,
          font: {
            size: 10,
            weight: "600"
          },
          formatter: (value) => {
            if (series.metric === "usd") return formatCurrencyCompact(value, "USD");
            if (series.metric === "quantity") return formatCompactNumber(value);
            return formatCompactNumber(value, 0);
          }
        },
        tooltip: {
          callbacks: {
            label: (contextItem) => {
              const value = Number(contextItem.raw || 0);
              if (series.metric === "usd") return `USD: ${formatCurrency(value, "USD", 0)}`;
              if (series.metric === "quantity") return `Quantity (TON): ${formatNumber(value, 2)}`;
              return `Trades: ${formatNumber(value, 0)}`;
            }
          }
        },
        subtitle: {
          display: series.metric === "quantity" && Number(series.quantityExcludedRows || 0) > 0,
          color: "#8ca697",
          font: {
            size: 11
          },
          text: `Excluded ${formatNumber(series.quantityExcludedRows, 0)} row(s) with non-mass units`
        }
      },
      scales: {
        x: {
          ticks: { color: "#cfb384" },
          grid: { color: "rgba(86, 65, 34, 0.35)" }
        },
        y: {
          beginAtZero: true,
          grace: "14%",
          ticks: {
            display: false
          },
          border: {
            display: false
          },
          grid: { color: "rgba(86, 65, 34, 0.35)" }
        }
      }
    }
  });
}

function renderTradeTabVisuals() {
  renderHistoryTrendChart();
  renderSupplySankeyChart(buildSupplySankeySeries(detailState.supplyRows, detailState.companyName, 12));
}

function setCompanyAiError(message) {
  if (!elements.companyAiError) return;
  elements.companyAiError.textContent = String(message || "");
  elements.companyAiError.style.display = message ? "block" : "none";
}

function clearCompanyAiError() {
  setCompanyAiError("");
}

function normalizeCompanyAiAssistantText(value) {
  let text = String(value || "");
  text = text.replace(/\r\n/g, "\n");
  text = text.replace(/```([\s\S]*?)```/g, "$1");
  text = text.replace(/^\s{0,3}#{1,6}\s+/gm, "");
  text = text.replace(/\*\*(.*?)\*\*/g, "$1");
  text = text.replace(/__(.*?)__/g, "$1");
  text = text.replace(/`([^`]+)`/g, "$1");
  text = text.replace(/^\s*[-*]\s+/gm, "• ");
  text = text.replace(/\n{3,}/g, "\n\n");
  return text.trim();
}

function createCompanyAiMessage(role, text, metaText = "", isPending = false) {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role: role === "assistant" ? "assistant" : "user",
    text: String(text || ""),
    metaText: String(metaText || ""),
    isPending: Boolean(isPending)
  };
}

function renderCompanyAiMessages() {
  if (!elements.companyAiChatBody) return;
  if (!detailState.companyAiMessages.length) {
    elements.companyAiChatBody.innerHTML = "";
    syncCompanyAiInitialState();
    return;
  }

  elements.companyAiChatBody.innerHTML = detailState.companyAiMessages
    .map((message) => {
      const roleClass = message.role === "assistant" ? "ai-msg-assistant" : "ai-msg-user";
      const roleText = message.role === "assistant" ? "AI" : "You";
      const text = message.role === "assistant"
        ? normalizeCompanyAiAssistantText(message.text)
        : String(message.text || "");
      const metaHtml = message.metaText
        ? `<p class="ai-msg-meta">${escapeHtml(message.metaText)}</p>`
        : "";
      const pendingClass = message.isPending ? "ai-msg-pending" : "";
      return `
        <div class="ai-msg ${roleClass} ${pendingClass}">
          <p class="ai-msg-role">${roleText}</p>
          <div class="ai-msg-bubble">${escapeHtml(text).replace(/\n/g, "<br>")}</div>
          ${metaHtml}
        </div>
      `;
    })
    .join("");

  elements.companyAiChatBody.scrollTop = elements.companyAiChatBody.scrollHeight;
  syncCompanyAiInitialState();
}

function setCompanyAiLoading(isLoading) {
  detailState.companyAiSending = Boolean(isLoading);
  if (elements.companyAiSendBtn) {
    elements.companyAiSendBtn.disabled = isLoading;
    elements.companyAiSendBtn.textContent = isLoading ? "Sending..." : "Send";
  }
  if (elements.companyAiClearBtn) {
    elements.companyAiClearBtn.disabled = isLoading;
  }
  if (elements.companyAiChatInput) {
    elements.companyAiChatInput.disabled = isLoading;
  }
}

function autoResizeCompanyAiInput() {
  if (!elements.companyAiChatInput) return;
  const minHeight = 52;
  elements.companyAiChatInput.style.height = "auto";
  const nextHeight = Math.max(elements.companyAiChatInput.scrollHeight, minHeight);
  elements.companyAiChatInput.style.height = `${nextHeight}px`;
  elements.companyAiChatInput.classList.toggle("ai-input-multiline", nextHeight > minHeight + 2);
}

function syncCompanyAiInitialState() {
  if (!elements.companyAiTabPanel || !elements.companyAiChatInput) return;
  const hasMessages = Array.isArray(detailState.companyAiMessages) && detailState.companyAiMessages.length > 0;
  const shouldCenter = !hasMessages && !detailState.companyAiHasStartedTyping;
  elements.companyAiTabPanel.classList.toggle("ai-initial", shouldCenter);
}

function bootstrapCompanyAiAgent() {
  if (detailState.companyAiBootstrapped) return;
  detailState.companyAiMessages = [];
  detailState.companyAiBootstrapped = true;
  renderCompanyAiMessages();
  autoResizeCompanyAiInput();
  syncCompanyAiInitialState();
}

function buildCompanyAiConversationMessages(maxMessages = 14) {
  return detailState.companyAiMessages
    .filter((message) => !message.isPending && (message.role === "user" || message.role === "assistant"))
    .slice(-maxMessages)
    .map((message) => ({
      role: message.role,
      content: message.text
    }));
}

function extractCompanyAiAnswer(data) {
  if (typeof data === "string") return data;
  if (typeof data?.answer === "string") return data.answer;
  if (typeof data?.output_text === "string") return data.output_text;
  return JSON.stringify(data ?? {}, null, 2);
}

function buildCompanyAiContext() {
  const payload = detailState.companyPayload || {};
  const company = payload.company || {};
  const overview = payload.overview || {};
  const info = payload.info || {};
  const contacts = Array.isArray(payload.contacts) ? payload.contacts : [];
  const emails = Array.isArray(payload.emails) ? payload.emails : [];
  const historyRows = Array.isArray(payload.historyRows) ? payload.historyRows : [];
  const supplyRows = Array.isArray(payload.supplyRows) ? payload.supplyRows : [];

  return {
    context_scope: {
      generated_at: new Date().toISOString(),
      mode: "company_detail_single_entity",
      company_id: detailState.companyId || String(company.company_id || "")
    },
    rules: {
      analysis_scope: "Use only this company context. Do not generalize to other companies unless explicitly stated as unknown.",
      data_policy: "No cross-company joins. No cross-universe inference.",
      market_status_policy: {
        green: {
          is_customer: true,
          label_th: "เป็นลูกค้า",
          label_en: "Customer"
        },
        yellow: {
          is_customer: false,
          label_th: "ยังไม่เป็นลูกค้า",
          label_en: "Prospect"
        },
        strict_rule: "green means already our customer; yellow means not yet our customer."
      }
    },
    company: {
      company_id: String(company.company_id || ""),
      customer: String(company.customer || ""),
      location: String(company.location || ""),
      status: String(company.status || ""),
      trades: Number(company.trades || 0),
      supplier_number: Number(company.supplier_number || 0),
      latest_purchase_time: company.latest_purchase_time || null,
      total_purchase_value: toNumericValue(overview.total_purchase_value),
      purchase_value_last_12m: toNumericValue(overview.purchase_value_last_12m),
      purchase_frequency_per_year: toNumericValue(overview.purchase_frequency_per_year),
      purchase_interval_days: toNumericValue(overview.purchase_interval_days),
      latest_purchase_date: overview.latest_purchase_date || null,
      is_active: overview.is_active ?? null,
      business_overview: String(overview.business_overview || ""),
      procurement_overview: String(overview.procurement_overview || ""),
      company_profile: String(info.company_profile || ""),
      linkedin: String(info.linkedin || "")
    },
    metric_definitions: {
      total_purchase_value: "Cumulative total purchase value for this company.",
      purchase_value_last_12m: "Rolling purchase value for the last 12 months."
    },
    contacts: contacts.slice(0, 120).map((row) => ({
      contact_name: row.contact_name || "",
      position: row.position || "",
      department: row.department || "",
      business_email: row.business_email || "",
      region: row.region || ""
    })),
    known_emails: emails.slice(0, 120).map((row) => ({
      contact_name: row.contact_name || "",
      email: row.email || "",
      importance: row.importance || "",
      source: row.source || ""
    })),
    trade_history: historyRows.slice(0, 500).map((row) => ({
      date: row.date || null,
      importer: row.importer || "",
      exporter: row.exporter || "",
      product: row.product || row.product_description || "",
      quantity: Number(row.quantity || 0),
      quantity_unit: row.quantity_unit || "",
      total_price_usd: Number(row.total_price_usd || 0),
      origin_country: row.origin_country || "",
      destination_country: row.destination_country || ""
    })),
    supply_chain: supplyRows.slice(0, 300).map((row) => ({
      snapshot_id: row.snapshot_id || "",
      exporter: row.exporter || "",
      trades_sum: Number(row.trades_sum || 0),
      quantity: Number(row.quantity || 0),
      kg_weight: Number(row.kg_weight || 0),
      total_price_usd: Number(row.total_price_usd || 0),
      total_price_ratio: Number(row.total_price_ratio || 0)
    }))
  };
}

async function sendCompanyAiMessage() {
  if (!elements.companyAiChatInput || detailState.companyAiSending) return;
  if (!detailState.companyAiBootstrapped) {
    bootstrapCompanyAiAgent();
  }

  clearCompanyAiError();
  const prompt = String(elements.companyAiChatInput.value || "").trim();
  if (!prompt) return;

  try {
    setCompanyAiLoading(true);
    detailState.companyAiHasStartedTyping = true;
    elements.companyAiChatInput.value = "";
    autoResizeCompanyAiInput();

    detailState.companyAiMessages.push(createCompanyAiMessage("user", prompt));
    detailState.companyAiMessages.push(createCompanyAiMessage("assistant", "Thinking...", "", true));
    renderCompanyAiMessages();

    const context = buildCompanyAiContext();
    const data = await callAiAgentWithAuth({
      mode: "company_detail",
      model: COMPANY_AI_MODEL,
      messages: buildCompanyAiConversationMessages(),
      context,
      strict_server_only: true,
      requested_at: new Date().toISOString()
    });

    const answer = normalizeCompanyAiAssistantText(extractCompanyAiAnswer(data) || "No answer returned.");
    const modelName = String(data?.model || COMPANY_AI_MODEL);
    const generatedAtRaw = String(data?.generated_at || "");
    const metaText = generatedAtRaw
      ? `Model ${modelName} at ${new Date(generatedAtRaw).toLocaleString()}`
      : `Model ${modelName}`;

    detailState.companyAiMessages = detailState.companyAiMessages.filter((message) => !message.isPending);
    detailState.companyAiMessages.push(createCompanyAiMessage("assistant", answer, metaText));
    renderCompanyAiMessages();
  } catch (error) {
    const rawMessage = String(error?.message || "Unknown error");
    const statusCode = Number(error?.status || 0);
    let friendly = rawMessage;
    const lowered = rawMessage.toLowerCase();
    if (statusCode === 401 || lowered.includes("unauthorized")) {
      friendly = "AI Agent unauthorized (401). Please sign out and sign in again.";
    } else if (lowered.includes("failed to send") || lowered.includes("fetch")) {
      friendly = "Unable to reach Edge Function. Ensure function \"ai-agent\" is deployed and reachable.";
    } else if (lowered.includes("404")) {
      friendly = "Edge Function \"ai-agent\" not found. Deploy it before running chat.";
    }

    detailState.companyAiMessages = detailState.companyAiMessages.filter((message) => !message.isPending);
    detailState.companyAiMessages.push(createCompanyAiMessage("assistant", `Request failed: ${friendly}`));
    setCompanyAiError(friendly);
    renderCompanyAiMessages();
  } finally {
    setCompanyAiLoading(false);
    autoResizeCompanyAiInput();
    elements.companyAiChatInput?.focus();
  }
}

function clearCompanyAiConversation() {
  detailState.companyAiMessages = [];
  detailState.companyAiBootstrapped = false;
  detailState.companyAiHasStartedTyping = false;
  bootstrapCompanyAiAgent();
}

function buildSupplySankeySeries(rows, companyName, limit = 12) {
  const safeCompanyName = String(companyName || "Target Company").trim() || "Target Company";
  const byExporter = new Map();

  rows.forEach((row) => {
    const exporter = String(row.exporter || "").trim() || "Unknown";
    const bucket = byExporter.get(exporter) || { usd: 0 };
    bucket.usd += Number(row.total_price_usd || 0);
    byExporter.set(exporter, bucket);
  });

  const ranked = Array.from(byExporter.entries())
    .map(([exporter, value]) => ({
      exporter,
      usd: Number((value.usd || 0).toFixed(2))
    }))
    .sort((left, right) => right.usd - left.usd)
    .slice(0, limit);

  return {
    links: ranked.map((row) => ({
      from: row.exporter,
      to: safeCompanyName,
      flow: row.usd
    }))
  };
}

function computeSankeyDisplayFlows(rawFlows, availableHeight, minThicknessPx) {
  const flows = rawFlows.map((value) => Math.max(Number(value) || 0, 0));
  if (!flows.length) return [];

  const safeHeight = Math.max(Number(availableHeight) || 0, 1);
  const maxReachableMinThickness = Math.max(safeHeight / flows.length - 0.25, 0);
  const effectiveMinThickness = Math.min(Math.max(Number(minThicknessPx) || 0, 0), maxReachableMinThickness);
  if (effectiveMinThickness <= 0) return flows;

  let displayFlows = [...flows];
  for (let iteration = 0; iteration < 8; iteration += 1) {
    const total = displayFlows.reduce((sum, value) => sum + value, 0);
    if (total <= 0) break;

    const requiredFlow = (effectiveMinThickness / safeHeight) * total;
    let changed = false;

    for (let index = 0; index < displayFlows.length; index += 1) {
      if (displayFlows[index] < requiredFlow) {
        displayFlows[index] = requiredFlow;
        changed = true;
      }
    }

    if (!changed) break;
  }

  return displayFlows;
}

function buildSankeyVisualLinks(links, chartHeight, nodePadding) {
  const safeLinks = links
    .map((row) => ({
      from: String(row?.from || "").trim() || "Unknown",
      to: String(row?.to || "").trim() || "Target Company",
      flow: Math.max(Number(row?.flow) || 0, 0)
    }))
    .filter((row) => row.flow > 0);

  const sourceCount = safeLinks.length;
  const safePadding = Math.max(Number(nodePadding) || 0, 0);
  const safeHeight = Math.max(Number(chartHeight) || 0, 1);
  const availableHeight = Math.max(safeHeight - Math.max(sourceCount - 1, 0) * safePadding, 1);
  const rawFlows = safeLinks.map((row) => row.flow);
  const displayFlows = computeSankeyDisplayFlows(
    rawFlows,
    availableHeight,
    SUPPLY_SANKEY_MIN_LINK_THICKNESS_PX
  );
  const totalDisplayFlow = displayFlows.reduce((sum, value) => sum + value, 0);

  return safeLinks.map((row, index) => {
    const displayFlow = Number(displayFlows[index] || 0);
    const estimatedThicknessPx =
      totalDisplayFlow > 0 ? (displayFlow / totalDisplayFlow) * availableHeight : 0;

    return {
      from: row.from,
      to: row.to,
      flow_raw: row.flow,
      flow_display: Number(displayFlow.toFixed(6)),
      estimated_thickness_px: Number(estimatedThicknessPx.toFixed(4))
    };
  });
}

function buildSankeyLabelOverrides(visualLinks) {
  const labels = {};
  visualLinks.forEach((row) => {
    labels[row.from] =
      row.estimated_thickness_px >= SUPPLY_SANKEY_INLINE_LABEL_MIN_THICKNESS_PX ? row.from : "";
  });

  const targetName = String(visualLinks[0]?.to || "").trim();
  if (targetName) {
    labels[targetName] = targetName;
  }
  return labels;
}

function renderSupplySankeyChart(series) {
  if (!elements.supplySankeyChart || typeof window.Chart === "undefined") return;

  if (supplySankeyChartInstance) {
    supplySankeyChartInstance.destroy();
    supplySankeyChartInstance = null;
  }

  const context = elements.supplySankeyChart.getContext("2d");
  if (!context) return;

  if (!series.links.length) {
    context.clearRect(0, 0, elements.supplySankeyChart.width, elements.supplySankeyChart.height);
    context.fillStyle = "#8ca697";
    context.font = "14px 'Space Grotesk'";
    context.fillText("No supply flow data.", 12, 24);
    return;
  }

  try {
    const chartHeight =
      Number(elements.supplySankeyChart.clientHeight || 0) ||
      Number(elements.supplySankeyChart.height || 0) ||
      420;
    const visualLinks = buildSankeyVisualLinks(
      series.links,
      chartHeight,
      SUPPLY_SANKEY_NODE_PADDING
    );
    if (!visualLinks.length) {
      context.clearRect(0, 0, elements.supplySankeyChart.width, elements.supplySankeyChart.height);
      context.fillStyle = "#8ca697";
      context.font = "14px 'Space Grotesk'";
      context.fillText("No supply flow data.", 12, 24);
      return;
    }
    const labelOverrides = buildSankeyLabelOverrides(visualLinks);

    supplySankeyChartInstance = new window.Chart(context, {
      type: "sankey",
      data: {
        datasets: [
          {
            label: "USD Flow",
            data: visualLinks,
            parsing: {
              from: "from",
              to: "to",
              flow: "flow_display"
            },
            colorFrom: "rgba(255, 189, 89, 0.9)",
            colorTo: "rgba(77, 211, 143, 0.9)",
            colorMode: "gradient",
            nodeWidth: 16,
            nodePadding: SUPPLY_SANKEY_NODE_PADDING,
            labels: labelOverrides
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          datalabels: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: (contextItem) => {
                const raw = contextItem.raw || {};
                const from = raw.from || raw.key || "-";
                const to = raw.to || "";
                const actualFlow = Number(raw.flow_raw ?? raw.flow ?? 0);
                if (to) {
                  return `${from} -> ${to}: ${formatCurrency(actualFlow, "USD", 0)}`;
                }
                return `${from}: ${formatCurrency(actualFlow, "USD", 0)}`;
              }
            }
          }
        }
      }
    });
  } catch (error) {
    context.clearRect(0, 0, elements.supplySankeyChart.width, elements.supplySankeyChart.height);
    context.fillStyle = "#ffb9b9";
    context.font = "14px 'Space Grotesk'";
    context.fillText("Unable to render Sankey diagram.", 12, 24);
  }
}

function toTimestamp(value) {
  if (!value) return null;
  const firstTry = new Date(value).getTime();
  if (!Number.isNaN(firstTry)) return firstTry;
  const secondTry = new Date(`${value}T00:00:00`).getTime();
  return Number.isNaN(secondTry) ? null : secondTry;
}

function computeFreshness(payload) {
  const sources = [];
  const pushIfValid = (value) => {
    const ts = toTimestamp(value);
    if (ts) sources.push(ts);
  };

  pushIfValid(payload.company?.created_at);
  pushIfValid(payload.company?.latest_purchase_time);
  pushIfValid(payload.overview?.updated_at);
  pushIfValid(payload.info?.created_at);

  payload.emails.forEach((row) => pushIfValid(row.created_at));
  payload.contacts.forEach((row) => pushIfValid(row.created_at));
  payload.historyRows.forEach((row) => {
    pushIfValid(row.created_at);
    pushIfValid(row.date);
  });
  payload.supplyRows.forEach((row) => pushIfValid(row.created_at));

  if (!sources.length) return "-";
  return formatDate(new Date(Math.max(...sources)).toISOString());
}

function renderSummary(company, overview, payload) {
  const statusValue = String(company.status || "-").toLowerCase();
  const statusClass = statusValue === "green" ? "status-green" : "status-yellow";

  elements.companyName.textContent = toSafeText(company.customer) || "Unknown Company";
  if (elements.sidebarCompanyLabel) {
    elements.sidebarCompanyLabel.textContent = toSafeText(company.customer) || "Unknown Company";
  }
  if (elements.companyLocationChip) {
    elements.companyLocationChip.textContent = `Location: ${toSafeText(company.location)}`;
  }
  if (elements.companyStatusChip) {
    elements.companyStatusChip.textContent = `Status: ${toSafeText(company.status).toUpperCase()}`;
    elements.companyStatusChip.classList.remove("status-green", "status-yellow");
    elements.companyStatusChip.classList.add(statusClass);
  }

  if (elements.tradesValue) {
    elements.tradesValue.textContent = formatNumber(company.trades);
  }
  if (elements.latestPurchaseValue) {
    elements.latestPurchaseValue.textContent = formatDate(company.latest_purchase_time || overview.latest_purchase_date);
  }
  if (elements.purchase12mValue) {
    elements.purchase12mValue.textContent = formatCurrency(overview.purchase_value_last_12m, "USD", 0);
  }
  if (elements.supplierCountValue) {
    elements.supplierCountValue.textContent = formatNumber(company.supplier_number);
  }
  if (elements.freshnessValue) {
    elements.freshnessValue.textContent = computeFreshness(payload);
  }
}

function bindTabEvents() {
  elements.tabButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      const nextTab = button.dataset.tabTarget;
      if (!nextTab || nextTab === detailState.activeTab) return;
      setActiveTab(nextTab);
    });
  });
}

function bindToggleEvents() {
  elements.toggleProductBtn.addEventListener("click", () => {
    detailState.productExpanded = !detailState.productExpanded;
    elements.productDescriptionValue.classList.toggle("clamped", !detailState.productExpanded);
    elements.toggleProductBtn.textContent = detailState.productExpanded ? "Show less" : "Read more";
  });
}

function bindTradeEvents() {
  if (elements.historyPrevBtn) {
    elements.historyPrevBtn.addEventListener("click", () => {
      detailState.historyPage -= 1;
      renderHistoryTablePage();
    });
  }

  if (elements.historyNextBtn) {
    elements.historyNextBtn.addEventListener("click", () => {
      detailState.historyPage += 1;
      renderHistoryTablePage();
    });
  }

  if (elements.supplyPrevBtn) {
    elements.supplyPrevBtn.addEventListener("click", () => {
      detailState.supplyPage -= 1;
      renderSupplyChainTablePage();
    });
  }

  if (elements.supplyNextBtn) {
    elements.supplyNextBtn.addEventListener("click", () => {
      detailState.supplyPage += 1;
      renderSupplyChainTablePage();
    });
  }

  if (elements.historyTrendMetric) {
    elements.historyTrendMetric.value = detailState.historyTrendMetric;
    elements.historyTrendMetric.addEventListener("change", () => {
      detailState.historyTrendMetric = elements.historyTrendMetric.value || "usd";
      renderHistoryTrendChart();
    });
  }
}

function bindCompanyAiEvents() {
  if (elements.companyAiSendBtn) {
    elements.companyAiSendBtn.addEventListener("click", () => {
      sendCompanyAiMessage();
    });
  }

  if (elements.companyAiChatInput) {
    autoResizeCompanyAiInput();
    elements.companyAiChatInput.addEventListener("input", () => {
      autoResizeCompanyAiInput();
      syncCompanyAiInitialState();
    });
    elements.companyAiChatInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        sendCompanyAiMessage();
      }
    });
  }

  if (elements.companyAiClearBtn) {
    elements.companyAiClearBtn.addEventListener("click", () => {
      clearCompanyAiError();
      clearCompanyAiConversation();
      elements.companyAiChatInput?.focus();
    });
  }
}

async function loadCompanyDetail() {
  clearError();
  const companyId = getCompanyIdFromUrl();
  if (!companyId) {
    throw new Error("Missing company_id parameter.");
  }
  detailState.companyId = companyId;
  detailState.tradeDataLoading = false;
  detailState.tradeDataLoaded = false;
  applyTradeData([], []);

  const [
    companyRes,
    overviewRes,
    infoRes,
    emailRes,
    contactRes
  ] = await Promise.all([
    supabaseClient
      .from("companies")
      .select("company_id, customer, location, status, trades, supplier_number, value_tag, latest_purchase_time, product_description, created_at")
      .eq("company_id", companyId)
      .maybeSingle(),
    supabaseClient
      .from("company_overview")
      .select("*")
      .eq("company_id", companyId)
      .maybeSingle(),
    supabaseClient
      .from("company_info")
      .select("*")
      .eq("company_id", companyId)
      .maybeSingle(),
    supabaseClient
      .from("company_email")
      .select("email, importance, source, source_description, created_at")
      .eq("company_id", companyId),
    supabaseClient
      .from("company_contract")
      .select("contact_name, position, department, business_email, tel, whatsapp, social_media, region, supplement_email_1, created_at")
      .eq("company_id", companyId)
  ]);

  const errors = [companyRes, overviewRes, infoRes, emailRes, contactRes]
    .map((response) => response.error)
    .filter(Boolean);

  if (errors.length) {
    throw errors[0];
  }

  const company = companyRes.data;
  if (!company) {
    throw new Error("No company found for the provided company_id.");
  }

  const overview = overviewRes.data || {};
  const info = infoRes.data || {};
  const contacts = sortContactsDefault(contactRes.data || []);
  const contactEmailNameMap = buildContactEmailNameMap(contacts);
  const emails = sortEmailsDefault(emailRes.data || []).map((row) => ({
    ...row,
    contact_name: contactEmailNameMap.get(normalizeEmail(row.email)) || ""
  }));

  const payload = {
    company,
    overview,
    info,
    emails,
    contacts,
    historyRows: [],
    supplyRows: []
  };
  detailState.companyPayload = payload;
  detailState.companyAiMessages = [];
  detailState.companyAiBootstrapped = false;
  detailState.companyAiHasStartedTyping = false;

  renderSummary(company, overview, payload);
  renderProductDescription(company.product_description);

  detailState.overviewRows = buildOverviewRows(company, overview);
  renderOverviewRows();

  renderKeyValueRows(elements.organizationTableBody, buildOrganizationRows(info));
  renderContactsTable(contacts);
  renderEmailsTable(emails);
  detailState.companyName = String(company.customer || "").trim() || "Target Company";

  if (elements.historyTrendMetric) {
    elements.historyTrendMetric.value = detailState.historyTrendMetric;
  }

  if (detailState.activeTab === "trade") {
    renderTradeLoadingState();
  }

  window.setTimeout(() => {
    void ensureTradeDataLoaded();
  }, 0);
}

bindTabEvents();
bindToggleEvents();
bindTradeEvents();
bindCompanyAiEvents();
setActiveTab(detailState.activeTab);

async function bootstrapCompanyDetail() {
  const session = await requireAuthenticatedSession();
  if (!session) return;

  document.body.classList.remove("auth-pending");

  loadCompanyDetail().catch((error) => {
    elements.companyName.textContent = "Company Detail Error";
    setError(error?.message || "Unable to load company detail.");
  });
}

bootstrapCompanyDetail();
