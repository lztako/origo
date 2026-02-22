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
const ENV_BADGE_SUFFIX = ACTIVE_SUPABASE_ENV === "demo" ? " · DEMO" : "";
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

const elements = {
  refreshButton: document.getElementById("refreshBtn"),
  lastSyncLabel: document.getElementById("lastSyncLabel"),
  logoutBtn: document.getElementById("logoutBtn"),
  pageEyebrow: document.getElementById("pageEyebrow"),
  pageTitle: document.getElementById("pageTitle"),
  menuItems: document.querySelectorAll("[data-view-target]"),
  metricsGrid: document.getElementById("metricsGrid"),

  metricContractLinesLabel: document.getElementById("metricContractLinesLabel"),
  metricCompletedLabel: document.getElementById("metricCompletedLabel"),
  metricPendingLabel: document.getElementById("metricPendingLabel"),
  metricOverdueLabel: document.getElementById("metricOverdueLabel"),
  metricContractLines: document.getElementById("metricContractLinesValue"),
  metricCompleted: document.getElementById("metricCompletedValue"),
  metricPending: document.getElementById("metricPendingValue"),
  metricOverdue: document.getElementById("metricOverdueValue"),

  deliveriesPanel: document.getElementById("deliveriesPanel"),
  deliveriesError: document.getElementById("errorBanner"),
  deliveryVolumeChart: document.getElementById("deliveryVolumeChart"),
  deliveryChartRange: document.getElementById("deliveryChartRange"),
  overdueOnlyPanel: document.getElementById("overdueOnlyPanel"),
  overdueOnlyBody: document.getElementById("overdueOnlyBody"),
  overviewMetricsGrid: document.getElementById("overviewMetricsGrid"),
  overviewTrendPanel: document.getElementById("overviewTrendPanel"),
  overviewCustomerRow: document.getElementById("overviewCustomerRow"),
  overviewTopTonsPanel: document.getElementById("overviewTopTonsPanel"),
  overviewTopUsdPanel: document.getElementById("overviewTopUsdPanel"),
  overviewProductPanel: document.getElementById("overviewProductPanel"),
  overviewOverduePanel: document.getElementById("overviewOverduePanel"),
  overviewError: document.getElementById("overviewErrorBanner"),
  overviewKpiDelivered: document.getElementById("overviewKpiDelivered"),
  overviewKpiBacklog: document.getElementById("overviewKpiBacklog"),
  overviewKpiOverdue: document.getElementById("overviewKpiOverdue"),
  overviewKpiInvoiceUsd: document.getElementById("overviewKpiInvoiceUsd"),
  overviewTrendRange: document.getElementById("overviewTrendRange"),
  overviewTrendChart: document.getElementById("overviewTrendChart"),
  overviewTopTonsBody: document.getElementById("overviewTopTonsBody"),
  overviewTopUsdBody: document.getElementById("overviewTopUsdBody"),
  overviewProductChart: document.getElementById("overviewProductChart"),
  overviewOverdueBody: document.getElementById("overviewOverdueBody"),

  stockTrendPanel: document.getElementById("stockTrendPanel"),
  stockTypePanel: document.getElementById("stockTypePanel"),
  stockError: document.getElementById("stockErrorBanner"),
  stockFactoryTrendChart: document.getElementById("stockFactoryTrendChart"),
  stockTypeTableBody: document.getElementById("stockTypeTableBody"),

  marketMapPanel: document.getElementById("marketMapPanel"),
  marketMapStatus: document.getElementById("marketMapStatus"),
  marketMapError: document.getElementById("marketMapErrorBanner"),
  marketMapCanvas: document.getElementById("marketMapCanvas"),
  marketMapLoader: document.getElementById("marketMapLoader"),
  marketMapLegend: document.getElementById("marketMapLegend"),
  marketMapContent: document.getElementById("marketMapContent"),
  marketMapLockedOverlay: document.getElementById("marketMapLockedOverlay"),
  marketProductDropdown: document.getElementById("marketProductDropdown"),
  marketProductTrigger: document.getElementById("marketProductTrigger"),
  marketProductMenu: document.getElementById("marketProductMenu"),
  marketCoverageSummary: document.getElementById("marketCoverageSummary"),
  marketUnmappedDetails: document.getElementById("marketUnmappedDetails"),
  marketUnmappedSummary: document.getElementById("marketUnmappedSummary"),
  marketUnmappedList: document.getElementById("marketUnmappedList"),
  marketTablePanel: document.getElementById("marketTablePanel"),
  marketTableContent: document.getElementById("marketTableContent"),
  marketTableLockedOverlay: document.getElementById("marketTableLockedOverlay"),
  marketTableBody: document.getElementById("marketTableBody"),
  marketPaginationInfo: document.getElementById("marketPaginationInfo"),
  marketPrevBtn: document.getElementById("marketPrevBtn"),
  marketNextBtn: document.getElementById("marketNextBtn"),

  productCatalogPanel: document.getElementById("productCatalogPanel"),
  productCatalogError: document.getElementById("productCatalogErrorBanner"),
  productCatalogOwnerNote: document.getElementById("productCatalogOwnerNote"),
  productCatalogHeroFilter: document.getElementById("productCatalogHeroFilter"),
  productCatalogSearch: document.getElementById("productCatalogSearch"),
  productCatalogAddBtn: document.getElementById("productCatalogAddBtn"),
  productCatalogEditor: document.getElementById("productCatalogEditor"),
  productCatalogEditorTitle: document.getElementById("productCatalogEditorTitle"),
  productCatalogNameInput: document.getElementById("productCatalogNameInput"),
  productCatalogHsCodeInput: document.getElementById("productCatalogHsCodeInput"),
  productCatalogDescriptionInput: document.getElementById("productCatalogDescriptionInput"),
  productCatalogHeroInput: document.getElementById("productCatalogHeroInput"),
  productCatalogSaveBtn: document.getElementById("productCatalogSaveBtn"),
  productCatalogCancelBtn: document.getElementById("productCatalogCancelBtn"),
  productCatalogGallery: document.getElementById("productCatalogGallery"),
  productCatalogDetailOverlay: document.getElementById("productCatalogDetailOverlay"),
  productCatalogDetailDrawer: document.getElementById("productCatalogDetailDrawer"),
  productCatalogDetailCloseBtn: document.getElementById("productCatalogDetailCloseBtn"),
  productCatalogDetailTitle: document.getElementById("productCatalogDetailTitle"),
  productCatalogDetailImage: document.getElementById("productCatalogDetailImage"),
  productCatalogDetailImagePlaceholder: document.getElementById("productCatalogDetailImagePlaceholder"),
  productCatalogDetailHero: document.getElementById("productCatalogDetailHero"),
  productCatalogDetailHsCode: document.getElementById("productCatalogDetailHsCode"),
  productCatalogDetailUpdatedAt: document.getElementById("productCatalogDetailUpdatedAt"),
  productCatalogDetailImageLink: document.getElementById("productCatalogDetailImageLink"),
  productCatalogDetailDescription: document.getElementById("productCatalogDetailDescription"),
  productCatalogPaginationInfo: document.getElementById("productCatalogPaginationInfo"),
  productCatalogPrevBtn: document.getElementById("productCatalogPrevBtn"),
  productCatalogNextBtn: document.getElementById("productCatalogNextBtn"),

  financeTrendPanel: document.getElementById("financeTrendPanel"),
  financeError: document.getElementById("financeErrorBanner"),
  financeTrendChart: document.getElementById("financeTrendChart"),
  financeChartRange: document.getElementById("financeChartRange"),
  financeCustomerPanel: document.getElementById("financeCustomerPanel"),
  financeCustomerBody: document.getElementById("financeCustomerBody"),
  financePaginationInfo: document.getElementById("financePaginationInfo"),
  financePrevBtn: document.getElementById("financePrevBtn"),
  financeNextBtn: document.getElementById("financeNextBtn"),

  aiAgentPanel: document.getElementById("aiAgentPanel"),
  aiAgentError: document.getElementById("aiAgentErrorBanner"),
  aiModelPill: document.getElementById("aiModelPill"),
  aiEmptyState: document.getElementById("aiEmptyState"),
  aiChatBody: document.getElementById("aiChatBody"),
  aiChatInput: document.getElementById("aiChatInput"),
  aiSendBtn: document.getElementById("aiSendBtn"),
  aiClearBtn: document.getElementById("aiClearBtn")
};

const PRODUCT_CATALOG_OWNER_FALLBACK = "sandbox_demo";
const PRODUCT_CATALOG_OWNER_STORAGE_KEY = "product_catalog_owner_key";

function normalizeProductCatalogOwnerKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function resolveProductCatalogOwnerKey() {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = normalizeProductCatalogOwnerKey(params.get("pc_owner"));
  if (fromQuery) {
    try {
      window.localStorage.setItem(PRODUCT_CATALOG_OWNER_STORAGE_KEY, fromQuery);
    } catch (_error) {
      // ignore localStorage failures in restricted environments
    }
    return fromQuery;
  }

  try {
    const fromStorage = normalizeProductCatalogOwnerKey(
      window.localStorage.getItem(PRODUCT_CATALOG_OWNER_STORAGE_KEY)
    );
    if (fromStorage) return fromStorage;
  } catch (_error) {
    // ignore localStorage failures in restricted environments
  }

  return PRODUCT_CATALOG_OWNER_FALLBACK;
}

const state = {
  view: "market-map",
  deliveryChartMonths: 12,
  deliveryChartRows: [],
  overviewTrendMonths: 12,
  overviewData: null,
  financeChartMonths: 12,
  financeChartRows: [],
  financeTableRows: [],
  financeTablePage: 0,
  stockRows: [],
  dashboardMetrics: null,
  financeMetrics: null,
  stockMetrics: null,
  marketTableRows: [],
  marketTablePage: 0,
  marketProductOptions: [],
  marketProductOptionsLoaded: false,
  marketSelectedProductKey: "refined-sugar-lin",
  marketProductDropdownOpen: false,
  productCatalogRows: [],
  productCatalogFilteredRows: [],
  productCatalogPage: 0,
  productCatalogOwnerKey: resolveProductCatalogOwnerKey(),
  productCatalogHeroFilter: "all",
  productCatalogSearch: "",
  productCatalogSavingHeroIds: new Set(),
  productCatalogEditingId: null,
  productCatalogSavingForm: false,
  productCatalogDetailId: null,
  aiModel: "claude-sonnet-4-20250514",
  aiConversations: [],
  aiActiveConversationId: null,
  aiMessages: [],
  aiBootstrapped: false,
  aiHasStartedTyping: false
};

let deliveryVolumeChartInstance = null;
let overviewTrendChartInstance = null;
let overviewProductChartInstance = null;
let financeTrendChartInstance = null;
let stockFactoryTrendChartInstance = null;
let marketMapInstance = null;
let marketGeoLayer = null;
let marketCountryMarkerLayer = null;
let marketGeoJsonCache = null;
let marketCountryLookupCache = null;
const VIEW_KEYS = new Set(["dashboard", "overview", "stock", "market-map", "product-catalog", "finance", "ai-agent"]);
const RANGE_KEYS = new Set([3, 6, 12]);
const FINANCE_TABLE_PAGE_SIZE = 10;
const MARKET_TABLE_PAGE_SIZE = 10;
const PRODUCT_CATALOG_PAGE_SIZE = 8;
const PRODUCT_CATALOG_QUERY_LIMIT = 2000;
const PRODUCT_CATALOG_SOURCE = "sugar_products";
const PRODUCT_CATALOG_LOCAL_DRAFT_MODE = false;
const PRODUCT_CATALOG_READ_ONLY = PRODUCT_CATALOG_LOCAL_DRAFT_MODE || PRODUCT_CATALOG_SOURCE === "sugar_products";
const PRODUCT_CATALOG_ONLY_PDF_SET = ACTIVE_SUPABASE_ENV !== "demo";
const PRODUCT_CATALOG_PDF_SELECTION = Object.freeze([
  Object.freeze({ productNameEn: "Raw Sugar", productNameTh: "น้ำตาลทรายดิบ", brand: "TRR" }),
  Object.freeze({ productNameEn: "Refined Sugar", productNameTh: "น้ำตาลทรายขาวบริสุทธิ์", brand: "LIN" }),
  Object.freeze({ productNameEn: "White Sugar", productNameTh: "น้ำตาลทรายขาว", brand: "SADA", refNo: "SD-0805 V.22" }),
  Object.freeze({ productNameEn: "Refined Sugar", productNameTh: "น้ำตาลทรายขาวบริสุทธิ์", brand: "SADA" }),
  Object.freeze({ productNameEn: "Natural Cane Sugar", productNameTh: "น้ำตาลอ้อยธรรมชาติ", brand: "SADA" })
]);
const PRODUCT_CATALOG_LOCAL_DRAFT_ROWS = Object.freeze([
  {
    product_id: "draft-001",
    owner_key: PRODUCT_CATALOG_OWNER_FALLBACK,
    product_name: "Caramel Coated Sugar (SADA)",
    hero_product: true,
    description: "Ref SD-0605 V.22 | Spec 2025-01-01 | Appearance: Brown crystals | Method: Carbonation and ion-exchanged resin | ICUMSA: 1,000 - 1,200 | Polarization: >=99.00 | Net wt: Inner: 1 kg, Outer: 1 x 20 bag | Origin: Thailand",
    hs_code: "",
    product_image_url: "",
    updated_at: "2026-02-20T00:00:00Z"
  },
  {
    product_id: "draft-002",
    owner_key: PRODUCT_CATALOG_OWNER_FALLBACK,
    product_name: "Caster Sugar (TRR Group)",
    hero_product: false,
    description: "Ref SD-0605 V.22 | Spec 2025-01-01 | Appearance: White crystals/crystalline powder | Method: Carbonation and ion-exchanged resin | ICUMSA: <=100 | Polarization: >=99.50 | Net wt: 25 kg, 50 kg/bag | Origin: Thailand",
    hs_code: "",
    product_image_url: "",
    updated_at: "2026-02-20T00:00:00Z"
  },
  {
    product_id: "draft-003",
    owner_key: PRODUCT_CATALOG_OWNER_FALLBACK,
    product_name: "Caster Sugar (SADA)",
    hero_product: false,
    description: "Ref SD-0605 V.22 | Spec 2025-01-01 | Appearance: White crystals/crystalline powder | Method: Carbonation and ion-exchanged resin | ICUMSA: <=45 | Polarization: >=99.80 | Net wt: Inner: 1 kg, Outer: 1 x 25 bag | Origin: Thailand",
    hs_code: "",
    product_image_url: "",
    updated_at: "2026-02-20T00:00:00Z"
  },
  {
    product_id: "draft-004",
    owner_key: PRODUCT_CATALOG_OWNER_FALLBACK,
    product_name: "Fast Dissolving Pure Refined Syrup",
    hero_product: false,
    description: "Ref SD-0605 V.22 | Spec 2025-01-01 | Appearance: Clear and Colorless | Method: Heat reaction | ICUMSA: <35 | Polarization: - | Net wt: 800 ml | Origin: Thailand",
    hs_code: "",
    product_image_url: "",
    updated_at: "2026-02-20T00:00:00Z"
  },
  {
    product_id: "draft-005",
    owner_key: PRODUCT_CATALOG_OWNER_FALLBACK,
    product_name: "Natural Cane Sugar (SADA)",
    hero_product: true,
    description: "Ref SD-0605 V.22 | Spec 2025-01-01 | Appearance: Brown crystals | Method: Defecation process /Evaporation and Crystallization | ICUMSA: >=1,001 | Polarization: >=98.50 | Net wt: Inner: 6g, 500g, 1kg, Outer: 5kg (1x5 bag), 25kg (500g x 50 bag, 1x25 bag) | Origin: Thailand",
    hs_code: "",
    product_image_url: "",
    updated_at: "2026-02-20T00:00:00Z"
  },
  {
    product_id: "draft-006",
    owner_key: PRODUCT_CATALOG_OWNER_FALLBACK,
    product_name: "Natural Cane Sugar (TRR Group)",
    hero_product: false,
    description: "Ref SD-0605 V.22 | Spec 2025-01-01 | Appearance: Brown crystals | Method: Defecation process /Evaporation and Crystallization | ICUMSA: >=1,001 | Polarization: >=98.50 | Net wt: 25 kg, 50 kg | Origin: Thailand",
    hs_code: "",
    product_image_url: "",
    updated_at: "2026-02-20T00:00:00Z"
  },
  {
    product_id: "draft-007",
    owner_key: PRODUCT_CATALOG_OWNER_FALLBACK,
    product_name: "Pure Refined Syrup (SADA)",
    hero_product: false,
    description: "Ref SD-0605 V.22 | Spec 2025-01-01 | Appearance: Clear and Colorless | Method: Heat reaction | ICUMSA: <35 | Polarization: - | Net wt: 330 ml, 800 ml | Origin: Thailand",
    hs_code: "",
    product_image_url: "",
    updated_at: "2026-02-20T00:00:00Z"
  },
  {
    product_id: "draft-008",
    owner_key: PRODUCT_CATALOG_OWNER_FALLBACK,
    product_name: "Raw Sugar (TRR Group)",
    hero_product: false,
    description: "Ref SD-0605 V.22 | Spec 2025-01-01 | Appearance: Brown crystals | Method: Defecation process /Evaporation and Crystallization | ICUMSA: >=601 | Polarization: 99.00 - 99.30 | Net wt: Bulk | Origin: Thailand",
    hs_code: "",
    product_image_url: "",
    updated_at: "2026-02-20T00:00:00Z"
  }
]);

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

    // Validate token against Auth service to avoid stale local sessions.
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

async function handleLogout() {
  try {
    await supabaseClient.auth.signOut();
  } finally {
    window.location.replace(appendEnvToPath("login.html"));
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
const MARKET_MAP_COLOR_GREEN = "rgba(34, 197, 94, 0.78)";
const MARKET_MAP_COLOR_YELLOW = "rgba(251, 191, 36, 0.78)";
const MARKET_MAP_COLOR_ORANGE = "rgba(249, 115, 22, 0.82)";
const MARKET_PRODUCT_FALLBACK_OPTIONS = Object.freeze([
  Object.freeze({ key: "refined-sugar-lin", label: "Refined Sugar (LIN)", matchTokens: ["refined", "sugar"] }),
  Object.freeze({ key: "raw-sugar-trr", label: "Raw Sugar (TRR)", matchTokens: ["raw", "sugar"] }),
  Object.freeze({ key: "white-sugar-sada-0001", label: "White Sugar (SADA)", matchTokens: ["white", "sugar"] }),
  Object.freeze({ key: "refined-sugar-sada", label: "Refined Sugar (SADA)", matchTokens: ["refined", "sugar"] }),
  Object.freeze({ key: "natural-cane-sugar-sada", label: "Natural Cane Sugar (SADA)", matchTokens: ["natural", "cane", "sugar"] })
]);
const MARKET_GEOJSON_URL = "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson";
const MARKET_COUNTRY_ALIASES = {
  usa: "USA",
  "u s a": "USA",
  "united states": "USA",
  "united states of america": "USA",
  uk: "GBR",
  "u k": "GBR",
  "united kingdom": "GBR",
  england: "GBR",
  "south korea": "KOR",
  "korea south": "KOR",
  "republic of korea": "KOR",
  "north korea": "PRK",
  "korea north": "PRK",
  "uae": "ARE",
  "u a e": "ARE",
  "united arab emirates": "ARE",
  russia: "RUS",
  "russian federation": "RUS",
  vietnam: "VNM",
  "viet nam": "VNM",
  turkey: "TUR",
  "czech republic": "CZE",
  "czechia": "CZE",
  "ivory coast": "CIV",
  "cote d ivoire": "CIV",
  "hong kong": "HKG",
  "hong kong sar": "HKG",
  "macao": "MAC",
  macau: "MAC",
  laos: "LAO",
  myanmar: "MMR",
  brunei: "BRN",
  taiwan: "TWN"
};

function parseIntParam(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function applyUrlStateFromQuery() {
  const params = new URLSearchParams(window.location.search);

  const rawViewParam = params.get("view");
  const viewParam = rawViewParam === "performance" ? "overview" : rawViewParam;
  if (viewParam && VIEW_KEYS.has(viewParam)) {
    state.view = viewParam;
  }

  const deliveryRangeParam = parseIntParam(params.get("dr"));
  if (deliveryRangeParam && RANGE_KEYS.has(deliveryRangeParam)) {
    state.deliveryChartMonths = deliveryRangeParam;
  }

  const financeRangeParam = parseIntParam(params.get("fr"));
  if (financeRangeParam && RANGE_KEYS.has(financeRangeParam)) {
    state.financeChartMonths = financeRangeParam;
  }

  const marketProductParam = String(params.get("mp") || "").trim();
  if (marketProductParam) {
    state.marketSelectedProductKey = marketProductParam;
  }
}

function syncUrlState() {
  const params = new URLSearchParams();

  if (ACTIVE_SUPABASE_ENV === "demo") {
    params.set("env", "demo");
  }
  params.set("view", state.view);
  if (state.deliveryChartMonths !== 12) {
    params.set("dr", String(state.deliveryChartMonths));
  }
  if (state.financeChartMonths !== 12) {
    params.set("fr", String(state.financeChartMonths));
  }
  const marketProductDefaultKey = getMarketProductDefaultKey();
  if (state.marketSelectedProductKey && state.marketSelectedProductKey !== marketProductDefaultKey) {
    params.set("mp", state.marketSelectedProductKey);
  }
  if (state.productCatalogOwnerKey && state.productCatalogOwnerKey !== PRODUCT_CATALOG_OWNER_FALLBACK) {
    params.set("pc_owner", state.productCatalogOwnerKey);
  }
  const query = params.toString();
  const path = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
  if (path !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
    window.history.replaceState(null, "", path);
  }
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-US");
}

function formatQuantity(value) {
  return Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

function formatChartValue(value) {
  return Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

function formatCompactNumber(value) {
  return Number(value || 0).toLocaleString("en-US", {
    notation: "compact",
    maximumFractionDigits: 2
  });
}

function formatCurrencyCompact(value, currency = "USD") {
  const numeric = Number(value || 0);
  return numeric.toLocaleString("en-US", {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 2
  });
}

function formatCurrency(value, currency = "USD") {
  return Number(value || 0).toLocaleString("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

function formatDateLabel(value) {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit"
  });
}

function formatDateTimeLabel(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatMonthLabel(monthValue) {
  if (!monthValue) return "-";
  const date = new Date(`${monthValue}-01T00:00:00`);
  if (Number.isNaN(date.getTime())) return String(monthValue);
  return date.toLocaleDateString("en-US", {
    year: "2-digit",
    month: "short"
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function setRefreshState(isLoading) {
  if (!elements.refreshButton) return;
  elements.refreshButton.disabled = isLoading;
  if (isLoading) {
    elements.refreshButton.textContent = state.view === "product-catalog" ? "Loading..." : "Refreshing...";
    return;
  }
  elements.refreshButton.textContent = state.view === "product-catalog" && !PRODUCT_CATALOG_READ_ONLY ? "Add Product" : "Refresh";
}

function setPanelStatus(element, text, mode = "neutral") {
  if (!element) return;
  element.textContent = text;
  element.dataset.state = mode;
}

function syncChartFilterButtons() {
  if (elements.deliveryChartRange) {
    elements.deliveryChartRange.value = String(state.deliveryChartMonths);
  }
  if (elements.overviewTrendRange) {
    elements.overviewTrendRange.value = String(state.overviewTrendMonths);
  }
  if (elements.financeChartRange) {
    elements.financeChartRange.value = String(state.financeChartMonths);
  }
}

function setDeliveriesReadyStatus() {
  syncChartFilterButtons();
  syncUrlState();
}

function setMarketMapReadyStatus(text = "Ready") {
  setPanelStatus(elements.marketMapStatus, text, "success");
  syncUrlState();
}

function setFinanceReadyStatus() {
  syncChartFilterButtons();
  syncUrlState();
}

function setStockReadyStatus() {
  syncUrlState();
}

function setMarketMapLoading(isLoading) {
  if (!elements.marketMapLoader) return;
  elements.marketMapLoader.classList.toggle("hidden", !isLoading);
}

function formatPercentage(value) {
  if (!Number.isFinite(value)) return "0.0%";
  return `${Number(value).toFixed(1)}%`;
}

function setMarketCoverageLoading() {
  if (elements.marketCoverageSummary) {
    elements.marketCoverageSummary.textContent = "Coverage: calculating...";
  }
  if (elements.marketUnmappedSummary) {
    elements.marketUnmappedSummary.textContent = "Unmapped Locations";
  }
  if (elements.marketUnmappedList) {
    elements.marketUnmappedList.innerHTML = "";
  }
  if (elements.marketUnmappedDetails) {
    elements.marketUnmappedDetails.classList.add("hidden");
    elements.marketUnmappedDetails.open = false;
  }
}

function clearMarketCoverage() {
  if (elements.marketCoverageSummary) {
    elements.marketCoverageSummary.textContent = "Coverage: -";
  }
  if (elements.marketUnmappedSummary) {
    elements.marketUnmappedSummary.textContent = "Unmapped Locations";
  }
  if (elements.marketUnmappedList) {
    elements.marketUnmappedList.innerHTML = "";
  }
  if (elements.marketUnmappedDetails) {
    elements.marketUnmappedDetails.classList.add("hidden");
    elements.marketUnmappedDetails.open = false;
  }
}

function renderMarketCoverage(metric) {
  const coverage = metric?.coverage;
  if (!coverage) {
    clearMarketCoverage();
    return;
  }

  const totalRows = Number(coverage.totalRows || 0);
  const mappedRows = Number(coverage.mappedRows || 0);
  const totalLocationGroups = Number(coverage.totalLocationGroups || 0);
  const mappedLocationGroups = Number(coverage.mappedLocationGroups || 0);

  const rowCoveragePercent = totalRows > 0 ? (mappedRows / totalRows) * 100 : 0;
  const locationCoveragePercent = totalLocationGroups > 0 ? (mappedLocationGroups / totalLocationGroups) * 100 : 0;

  if (elements.marketCoverageSummary) {
    if (totalRows <= 0) {
      elements.marketCoverageSummary.textContent = "Coverage: no market rows";
    } else {
      elements.marketCoverageSummary.textContent =
        `Coverage: ${formatPercentage(locationCoveragePercent)} locations mapped ` +
        `(${formatNumber(mappedLocationGroups)}/${formatNumber(totalLocationGroups)})` +
        ` • ${formatPercentage(rowCoveragePercent)} rows mapped ` +
        `(${formatNumber(mappedRows)}/${formatNumber(totalRows)})`;
    }
  }

  const unmappedLocations = Array.isArray(coverage.unmappedLocations) ? coverage.unmappedLocations : [];
  if (!elements.marketUnmappedDetails || !elements.marketUnmappedSummary || !elements.marketUnmappedList) return;

  if (!unmappedLocations.length) {
    elements.marketUnmappedSummary.textContent = "Unmapped Locations (0)";
    elements.marketUnmappedList.innerHTML = "";
    elements.marketUnmappedDetails.classList.add("hidden");
    elements.marketUnmappedDetails.open = false;
    return;
  }

  const unmappedTotalRows = unmappedLocations.reduce((sum, item) => sum + Number(item.count || 0), 0);
  elements.marketUnmappedSummary.textContent =
    `Unmapped Locations (${formatNumber(unmappedLocations.length)} locations, ${formatNumber(unmappedTotalRows)} rows)`;
  elements.marketUnmappedList.innerHTML = unmappedLocations
    .map((item) => {
      const name = String(item.location || "Unknown / Empty");
      const count = Number(item.count || 0);
      return `<li><span>${escapeHtml(name)}</span><strong>${escapeHtml(formatNumber(count))}</strong></li>`;
    })
    .join("");
  elements.marketUnmappedDetails.classList.remove("hidden");
}

function showError(target, message) {
  if (!target) return;
  target.textContent = message;
  target.classList.remove("hidden");
}

function hideError(target) {
  if (!target) return;
  target.textContent = "";
  target.classList.add("hidden");
}

function updateLastSync() {
  const now = new Date();
  elements.lastSyncLabel.textContent = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

function syncMetricSchemaForView(view = state.view) {
  if (
    !elements.metricContractLinesLabel ||
    !elements.metricCompletedLabel ||
    !elements.metricPendingLabel ||
    !elements.metricOverdueLabel
  ) {
    return;
  }

  if (view === "finance") {
    elements.metricContractLinesLabel.textContent = "Total Invoices";
    elements.metricCompletedLabel.textContent = "Total Tons";
    elements.metricPendingLabel.textContent = "USD Total";
    elements.metricOverdueLabel.textContent = "THB Total";
    return;
  }

  if (view === "stock") {
    elements.metricContractLinesLabel.textContent = "Total Stock Qty";
    elements.metricCompletedLabel.textContent = "Factories";
    elements.metricPendingLabel.textContent = "Types";
    elements.metricOverdueLabel.textContent = "Top Factory Qty";
    return;
  }

  elements.metricContractLinesLabel.textContent = "Contract Lines";
  elements.metricCompletedLabel.textContent = "Completed";
  elements.metricPendingLabel.textContent = "Pending";
  elements.metricOverdueLabel.textContent = "Overdue";
}

function renderDashboardMetrics(metric) {
  if (!metric) return;
  elements.metricContractLines.textContent = formatNumber(metric.contractLines);
  elements.metricCompleted.textContent = formatNumber(metric.completed);
  elements.metricPending.textContent = formatNumber(metric.pending);
  elements.metricOverdue.textContent = formatNumber(metric.overdue);
}

function renderFinanceMetrics(metric) {
  if (!metric) return;
  elements.metricContractLines.textContent = formatNumber(metric.totalInvoices);
  elements.metricCompleted.textContent = formatQuantity(metric.tonsTotal);
  elements.metricPending.textContent = formatCurrencyCompact(metric.usdTotal, "USD");
  elements.metricOverdue.textContent = formatCurrencyCompact(metric.thbTotal, "THB");
}

function renderStockMetrics(metric) {
  if (!metric) return;
  elements.metricContractLines.textContent = formatQuantity(metric.totalQty);
  elements.metricCompleted.textContent = formatNumber(metric.factoryCount);
  elements.metricPending.textContent = formatNumber(metric.typeCount);
  elements.metricOverdue.textContent = formatQuantity(metric.topFactoryQty);
}

function setMetricsLoading() {
  syncMetricSchemaForView();
  elements.metricContractLines.textContent = "...";
  elements.metricCompleted.textContent = "...";
  elements.metricPending.textContent = "...";
  elements.metricOverdue.textContent = "...";
}

function setMetricsFallback(value) {
  elements.metricContractLines.textContent = value;
  elements.metricCompleted.textContent = value;
  elements.metricPending.textContent = value;
  elements.metricOverdue.textContent = value;
}

function renderInfoRow(targetBody, colSpan, message) {
  if (!targetBody) return;
  targetBody.innerHTML = `
    <tr>
      <td colspan="${colSpan}">${escapeHtml(message)}</td>
    </tr>
  `;
}

function renderSkeletonRows(targetBody, colCount, rowCount = 6) {
  if (!targetBody) return;
  const rows = Array.from({ length: rowCount }, () => {
    const columns = Array.from({ length: colCount }, () => "<td><span class=\"skeleton-block\"></span></td>").join("");
    return `<tr>${columns}</tr>`;
  }).join("");

  targetBody.innerHTML = rows;
}

function truncateText(value, maxLength = 15) {
  const text = String(value ?? "");
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 3))}...`;
}

function normalizeSearchText(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function normalizeMarketStatus(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "green") return "green";
  return "yellow";
}

function normalizeMarketCountryStatus(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "green" || normalized === "yellow" || normalized === "mixed") return normalized;
  return "";
}

function summarizeMarketStatusFlags(flags) {
  const hasGreen = Boolean(flags?.hasGreen);
  const hasYellow = Boolean(flags?.hasYellow);
  if (hasGreen && hasYellow) return "mixed";
  if (hasGreen) return "green";
  return "yellow";
}

function getMarketStatusClass(status) {
  const normalized = normalizeMarketCountryStatus(status);
  if (normalized === "green") return "market-status-green";
  if (normalized === "mixed") return "market-status-mixed";
  return "market-status-yellow";
}

function setMarketTableRows(rows) {
  const checkedById = new Map(state.marketTableRows.map((row) => [row.id, Boolean(row.checked)]));
  const normalizedRows = (rows || []).map((row, index) => {
    const id = String(row.id || `company-${index}`);
    const country = String(row.country || "-");
    const fallbackGroupKey = `loc:${normalizeCountryText(country) || "unknown"}`;
    const groupKey = String(row.countryGroupKey || fallbackGroupKey);
    return {
      id,
      checked: checkedById.get(id) ?? Boolean(row.checked),
      status: normalizeMarketStatus(row.status),
      countryStatus: normalizeMarketCountryStatus(row.countryStatus),
      customer: String(row.customer || "-"),
      country,
      countryGroupKey: groupKey,
      productDescription: String(row.productDescription || "-"),
      trades: Number(row.trades || 0),
      order: index
    };
  });

  const statusByGroupKey = new Map();
  normalizedRows.forEach((row) => {
    if (!statusByGroupKey.has(row.countryGroupKey)) {
      statusByGroupKey.set(row.countryGroupKey, { hasGreen: false, hasYellow: false });
    }
    const bucket = statusByGroupKey.get(row.countryGroupKey);
    if (row.status === "green") {
      bucket.hasGreen = true;
    } else {
      bucket.hasYellow = true;
    }
  });

  state.marketTableRows = normalizedRows.map((row) => ({
    ...row,
    countryStatus:
      normalizeMarketCountryStatus(row.countryStatus) ||
      summarizeMarketStatusFlags(statusByGroupKey.get(row.countryGroupKey))
  }));
  state.marketTablePage = 0;
}

function getSortedMarketTableRows() {
  return [...state.marketTableRows].sort((left, right) => {
    const checkedCompare = Number(right.checked) - Number(left.checked);
    if (checkedCompare !== 0) return checkedCompare;
    return left.order - right.order;
  });
}

function renderMarketPagination(totalRows) {
  if (!elements.marketPaginationInfo || !elements.marketPrevBtn || !elements.marketNextBtn) return;

  if (!totalRows) {
    elements.marketPaginationInfo.textContent = "Showing 0-0 of 0";
    elements.marketPrevBtn.disabled = true;
    elements.marketNextBtn.disabled = true;
    return;
  }

  const maxPage = Math.max(Math.ceil(totalRows / MARKET_TABLE_PAGE_SIZE) - 1, 0);
  const safePage = Math.min(Math.max(state.marketTablePage, 0), maxPage);
  state.marketTablePage = safePage;

  const startIndex = safePage * MARKET_TABLE_PAGE_SIZE;
  const endIndex = Math.min(startIndex + MARKET_TABLE_PAGE_SIZE, totalRows);
  elements.marketPaginationInfo.textContent = `Showing ${startIndex + 1}-${endIndex} of ${totalRows}`;
  elements.marketPrevBtn.disabled = safePage <= 0;
  elements.marketNextBtn.disabled = safePage >= maxPage;
}

function renderMarketTable() {
  if (!elements.marketTableBody) return;
  const rows = getSortedMarketTableRows();

  if (!rows.length) {
    renderInfoRow(elements.marketTableBody, 6, "No market rows.");
    renderMarketPagination(0);
    return;
  }

  renderMarketPagination(rows.length);
  const startIndex = state.marketTablePage * MARKET_TABLE_PAGE_SIZE;
  const pageRows = rows.slice(startIndex, startIndex + MARKET_TABLE_PAGE_SIZE);

  elements.marketTableBody.innerHTML = pageRows
    .map((row) => {
      const countryStatus = normalizeMarketCountryStatus(row.countryStatus) || normalizeMarketStatus(row.status);
      const statusClass = getMarketStatusClass(countryStatus);
      const customerText = String(row.customer || "-");
      const productText = String(row.productDescription || "-");
      const customerShort = truncateText(customerText, 15);
      const productShort = truncateText(productText, 50);
      return `
        <tr class="market-table-row" data-company-id="${escapeHtml(row.id)}">
          <td>
            <input
              type="checkbox"
              class="market-check-input"
              data-market-id="${escapeHtml(row.id)}"
              ${row.checked ? "checked" : ""}
              aria-label="Pin ${escapeHtml(row.customer)}"
            />
          </td>
          <td>
            <span class="market-status-dot market-status-fixed ${statusClass}" aria-label="${escapeHtml(countryStatus)} country status"></span>
          </td>
          <td><span class="truncate-cell truncate-cell-customer" title="${escapeHtml(customerText)}">${escapeHtml(customerShort)}</span></td>
          <td>${escapeHtml(row.country)}</td>
          <td title="${escapeHtml(productText)}">${escapeHtml(productShort)}</td>
          <td>${escapeHtml(formatNumber(row.trades))}</td>
        </tr>
      `;
    })
    .join("");
}

function setMarketRowChecked(id, checked) {
  if (isMarketSelectionLocked()) return;
  const target = state.marketTableRows.find((row) => row.id === id);
  if (!target) return;
  target.checked = checked;
  renderMarketTable();
}

function moveMarketTablePage(step) {
  if (isMarketSelectionLocked()) return;
  const maxPage = Math.max(Math.ceil(state.marketTableRows.length / MARKET_TABLE_PAGE_SIZE) - 1, 0);
  state.marketTablePage = Math.min(Math.max(state.marketTablePage + step, 0), maxPage);
  renderMarketTable();
}

function normalizeMarketProductKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function stripMarketProductBrandSuffix(label) {
  return String(label || "")
    .replace(/\([^)]*\)\s*$/g, "")
    .trim();
}

function buildMarketProductMatchTokens(value) {
  return normalizeSearchText(value)
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);
}

function createMarketProductOption(rawKey, label, extraTokens = []) {
  const safeLabel = String(label || "").trim() || "Product";
  const normalizedKey = normalizeMarketProductKey(rawKey || safeLabel) || `product-${Date.now()}`;
  const baseTokens = buildMarketProductMatchTokens(stripMarketProductBrandSuffix(safeLabel));
  const mergedTokens = Array.from(
    new Set([
      ...baseTokens,
      ...extraTokens.flatMap((item) => buildMarketProductMatchTokens(item))
    ])
  );

  return {
    key: normalizedKey,
    label: safeLabel,
    matchTokens: mergedTokens
  };
}

function buildMarketProductOptionsFromCatalogRows(rows) {
  const options = [];
  const seenKeys = new Set();

  (rows || []).forEach((row, index) => {
    const label = String(row.product_name || row.productName || "").trim();
    if (!label || label === "-") return;

    const idHint = String(row.product_id || row.id || "").trim();
    const keySeed = idHint ? `product-${idHint}` : `${label}-${index + 1}`;
    const option = createMarketProductOption(keySeed, label, [
      row.hs_code,
      row.brand,
      row.description
    ]);
    if (!option.matchTokens.length) return;
    if (seenKeys.has(option.key)) return;

    seenKeys.add(option.key);
    options.push(option);
  });

  return options;
}

function getMarketProductOptions() {
  if (Array.isArray(state.marketProductOptions) && state.marketProductOptions.length) {
    return state.marketProductOptions;
  }
  return MARKET_PRODUCT_FALLBACK_OPTIONS.map((item) => ({
    key: String(item.key || ""),
    label: String(item.label || ""),
    matchTokens: Array.isArray(item.matchTokens) ? [...item.matchTokens] : []
  }));
}

function getMarketProductDefaultKey() {
  return String(getMarketProductOptions()[0]?.key || "");
}

function getMarketSelectedProduct() {
  const options = getMarketProductOptions();
  return options.find((item) => item.key === state.marketSelectedProductKey) || options[0] || null;
}

function getMarketSelectedProductLabel() {
  const selected = getMarketSelectedProduct();
  return String(selected?.label || "Product");
}

function isMarketSelectionLocked() {
  if (ACTIVE_SUPABASE_ENV === "demo") return false;
  return state.marketSelectedProductKey !== getMarketProductDefaultKey();
}

function ensureMarketProductSelectionValid() {
  const options = getMarketProductOptions();
  if (options.some((item) => item.key === state.marketSelectedProductKey)) return;
  state.marketSelectedProductKey = getMarketProductDefaultKey();
}

function updateMarketProductOptionsFromCatalogRows(rows) {
  const dynamicOptions = buildMarketProductOptionsFromCatalogRows(rows);
  if (!dynamicOptions.length) return false;

  const currentKey = String(state.marketSelectedProductKey || "").trim();
  state.marketProductOptions = dynamicOptions;
  state.marketProductOptionsLoaded = true;

  if (dynamicOptions.some((item) => item.key === currentKey)) {
    state.marketSelectedProductKey = currentKey;
  } else {
    state.marketSelectedProductKey = getMarketProductDefaultKey();
  }
  return true;
}

async function ensureMarketProductOptionsLoaded() {
  if (state.marketProductOptionsLoaded) return;
  state.marketProductOptionsLoaded = true;

  if (ACTIVE_SUPABASE_ENV !== "demo") {
    ensureMarketProductSelectionValid();
    return;
  }

  try {
    const rows = await loadProductCatalogRows();
    updateMarketProductOptionsFromCatalogRows(rows);
  } catch (error) {
    console.warn("Unable to load market product options from product catalog:", error);
  }

  ensureMarketProductSelectionValid();
}

function syncMarketProductDropdownUi() {
  if (!elements.marketProductDropdown || !elements.marketProductTrigger || !elements.marketProductMenu) return;
  const isOpen = Boolean(state.marketProductDropdownOpen);
  elements.marketProductDropdown.classList.toggle("open", isOpen);
  elements.marketProductMenu.classList.toggle("hidden", !isOpen);
  elements.marketProductTrigger.setAttribute("aria-expanded", isOpen ? "true" : "false");
}

function closeMarketProductDropdown() {
  if (!state.marketProductDropdownOpen) return;
  state.marketProductDropdownOpen = false;
  syncMarketProductDropdownUi();
}

function openMarketProductDropdown() {
  if (state.marketProductDropdownOpen) return;
  state.marketProductDropdownOpen = true;
  syncMarketProductDropdownUi();
}

function toggleMarketProductDropdown() {
  state.marketProductDropdownOpen = !state.marketProductDropdownOpen;
  syncMarketProductDropdownUi();
}

function renderMarketProductSelector() {
  if (!elements.marketProductTrigger || !elements.marketProductMenu) return;
  ensureMarketProductSelectionValid();
  const options = getMarketProductOptions();
  elements.marketProductTrigger.textContent = getMarketSelectedProductLabel();
  elements.marketProductMenu.innerHTML = options
    .map((item) => {
      const isActive = item.key === state.marketSelectedProductKey;
      return `
        <button
          class="market-map-product-option ${isActive ? "active" : ""}"
          type="button"
          role="option"
          data-product-key="${escapeHtml(item.key)}"
          aria-selected="${isActive ? "true" : "false"}"
        >
          ${escapeHtml(item.label)}
        </button>
      `;
    })
    .join("");
  syncMarketProductDropdownUi();
}

async function applyMarketProductSelection(nextKey) {
  const normalized = String(nextKey || "").trim();
  const options = getMarketProductOptions();
  if (!options.some((item) => item.key === normalized)) {
    state.marketSelectedProductKey = getMarketProductDefaultKey();
  } else {
    state.marketSelectedProductKey = normalized;
  }
  renderMarketProductSelector();
  applyMarketProductLockState();

  if (state.view !== "market-map") return;
  if (isMarketSelectionLocked()) return;

  try {
    await runMarketMapQuery();
  } catch (error) {
    showError(elements.marketMapError, error.message || "Unknown error");
  }
}

function applyMarketProductLockState() {
  const locked = isMarketSelectionLocked();
  if (elements.marketMapContent) {
    elements.marketMapContent.classList.toggle("is-locked", locked);
  }
  if (elements.marketTableContent) {
    elements.marketTableContent.classList.toggle("is-locked", locked);
  }
  if (elements.marketMapLockedOverlay) {
    elements.marketMapLockedOverlay.classList.toggle("hidden", !locked);
  }
  if (elements.marketTableLockedOverlay) {
    elements.marketTableLockedOverlay.classList.toggle("hidden", !locked);
  }
  if (locked) {
    setMarketMapLoading(false);
    hideError(elements.marketMapError);
    setPanelStatus(elements.marketMapStatus, `Locked (${getMarketSelectedProductLabel()})`, "neutral");
  }
}

function setActiveView(view) {
  state.view = view;

  elements.menuItems.forEach((item) => {
    const isActive = item.dataset.viewTarget === view;
    item.classList.toggle("active", isActive);
  });

  const isDashboard = view === "dashboard";
  const isOverview = view === "overview";
  const isStock = view === "stock";
  const isMarketMap = view === "market-map";
  const isProductCatalog = view === "product-catalog";
  const isFinance = view === "finance";
  const isAiAgent = view === "ai-agent";
  document.body.classList.toggle("ai-topbar-fixed", isAiAgent);

  elements.metricsGrid.classList.toggle("hidden", isMarketMap || isProductCatalog || isAiAgent || isOverview);

  elements.deliveriesPanel.classList.toggle("hidden", !isDashboard);
  elements.overdueOnlyPanel.classList.toggle("hidden", !isDashboard);
  elements.overviewMetricsGrid.classList.toggle("hidden", !isOverview);
  elements.overviewTrendPanel.classList.toggle("hidden", !isOverview);
  elements.overviewCustomerRow.classList.toggle("hidden", !isOverview);
  elements.overviewProductPanel.classList.toggle("hidden", !isOverview);
  elements.overviewOverduePanel.classList.toggle("hidden", !isOverview);
  elements.stockTrendPanel.classList.toggle("hidden", !isStock);
  elements.stockTypePanel.classList.toggle("hidden", !isStock);
  elements.marketMapPanel.classList.toggle("hidden", !isMarketMap);
  elements.marketTablePanel.classList.toggle("hidden", !isMarketMap);
  elements.productCatalogPanel.classList.toggle("hidden", !isProductCatalog);
  if (elements.productCatalogAddBtn) {
    elements.productCatalogAddBtn.classList.toggle("hidden", !isProductCatalog || PRODUCT_CATALOG_READ_ONLY);
  }
  elements.financeTrendPanel.classList.toggle("hidden", !isFinance);
  elements.financeCustomerPanel.classList.toggle("hidden", !isFinance);
  elements.aiAgentPanel.classList.toggle("hidden", !isAiAgent);
  if (!isOverview) {
    hideError(elements.overviewError);
  }
  if (!isProductCatalog) {
    closeProductCatalogDetail();
  }
  if (!isMarketMap) {
    closeMarketProductDropdown();
  }

  if (isDashboard) {
    elements.pageEyebrow.textContent = `OPERATION${ENV_BADGE_SUFFIX}`;
    elements.pageTitle.textContent = "EXECUTION DASHBOARD";
  } else if (isOverview) {
    elements.pageEyebrow.textContent = `OVERVIEW${ENV_BADGE_SUFFIX}`;
    elements.pageTitle.textContent = "INTERNAL PERFORMANCE";
  } else if (isStock) {
    elements.pageEyebrow.textContent = `STOCK${ENV_BADGE_SUFFIX}`;
    elements.pageTitle.textContent = "INVENTORY OVERVIEW";
  } else if (isMarketMap) {
    elements.pageEyebrow.textContent = `MARKET${ENV_BADGE_SUFFIX}`;
    elements.pageTitle.textContent = "GLOBAL TRADE MAP";
  } else if (isProductCatalog) {
    elements.pageEyebrow.textContent = `MARKET${ENV_BADGE_SUFFIX}`;
    elements.pageTitle.textContent = "PRODUCT CATALOG";
  } else if (isFinance) {
    elements.pageEyebrow.textContent = `FINANCE${ENV_BADGE_SUFFIX}`;
    elements.pageTitle.textContent = "INVOICE ANALYTICS";
  } else {
    elements.pageEyebrow.textContent = `AI AGENT${ENV_BADGE_SUFFIX}`;
    elements.pageTitle.textContent = "SUPABASE AI ANALYSIS";
  }

  syncMetricSchemaForView(view);
  if (isDashboard && state.dashboardMetrics) {
    renderDashboardMetrics(state.dashboardMetrics);
  } else if (isStock && state.stockMetrics) {
    renderStockMetrics(state.stockMetrics);
  } else if (isFinance && state.financeMetrics) {
    renderFinanceMetrics(state.financeMetrics);
  } else if (!isMarketMap && !isProductCatalog && !isAiAgent && !isOverview) {
    setMetricsLoading();
  }

  if (isMarketMap && marketMapInstance) {
    window.setTimeout(() => {
      marketMapInstance.invalidateSize();
    }, 0);
  }
  if (isAiAgent) {
    syncAiInitialState();
    scrollAiToBottom();
  }
  if (isMarketMap) {
    renderMarketProductSelector();
    applyMarketProductLockState();
    renderMarketTable();
  }
  if (isProductCatalog) {
    renderProductCatalogOwnerNote();
    renderProductCatalogGallery();
  }
  setRefreshState(false);
  syncUrlState();
}

function monthKey(dateString) {
  if (!dateString) return null;
  const [year, month] = String(dateString).split("-");
  if (!year || !month) return null;
  return `${year}-${month}`;
}

function buildDeliveryVolumeSeries(rows, months) {
  const monthly = new Map();

  rows.forEach((row) => {
    const key = monthKey(row.delivery_date);
    if (!key) return;

    if (!monthly.has(key)) {
      monthly.set(key, { quantity: 0 });
    }

    const entry = monthly.get(key);
    entry.quantity += Number(row.quantity || 0);
  });

  const allMonths = Array.from(monthly.keys()).sort((left, right) => left.localeCompare(right));
  const limit = Number(months) || 12;
  const recentMonths = allMonths.slice(-limit);

  return {
    labels: recentMonths,
    quantities: recentMonths.map((month) => Number(monthly.get(month).quantity.toFixed(2)))
  };
}

function renderDeliveryVolumeChart(series) {
  if (!elements.deliveryVolumeChart || typeof window.Chart === "undefined") {
    return;
  }

  if (deliveryVolumeChartInstance) {
    deliveryVolumeChartInstance.destroy();
    deliveryVolumeChartInstance = null;
  }

  const context = elements.deliveryVolumeChart.getContext("2d");
  if (!context) return;

  const barFill = series.labels.map(() => "rgba(255, 189, 89, 0.78)");
  const barBorder = series.labels.map(() => "rgba(255, 189, 89, 0.95)");
  const barWidth = series.labels.map(() => 1);

  deliveryVolumeChartInstance = new window.Chart(context, {
    data: {
      labels: series.labels,
      datasets: [
        {
          type: "bar",
          label: "",
          data: series.quantities,
          yAxisID: "yQty",
          backgroundColor: barFill,
          borderColor: barBorder,
          borderWidth: barWidth
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: {
          left: 16,
          right: 8,
          top: 18,
          bottom: 18
        }
      },
      onHover: (event) => {
        if (!event?.native?.target) return;
        event.native.target.style.cursor = "default";
      },
      plugins: {
        legend: {
          display: false
        },
        datalabels: {
          display: (context) => Number(context.dataset.data[context.dataIndex] || 0) > 0,
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
          formatter: (value) => formatChartValue(value)
        }
      },
      scales: {
        x: {
          ticks: {
            color: "#cfb384"
          },
          grid: {
            color: "rgba(86, 65, 34, 0.35)"
          }
        },
        yQty: {
          type: "linear",
          position: "left",
          beginAtZero: true,
          grace: "14%",
          ticks: {
            display: false
          },
          border: {
            display: false
          },
          grid: {
            color: "rgba(86, 65, 34, 0.35)"
          }
        }
      }
    }
  });
}

function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function classifyContractStatus(row, today) {
  if (row.progress >= 100) {
    return "completed";
  }

  if (row.dueDate && row.dueDate < today) {
    return "overdue";
  }

  return "pending";
}

function renderOverdueOnlyTable(rows) {
  if (!elements.overdueOnlyBody) return;
  const today = getTodayDateString();
  const overdueRows = rows.filter((row) => classifyContractStatus(row, today) === "overdue");

  if (!overdueRows.length) {
    renderInfoRow(elements.overdueOnlyBody, 7, "No overdue contracts.");
    return;
  }

  elements.overdueOnlyBody.innerHTML = overdueRows
    .map((row) => {
      const progressText = row.plannedTon > 0 ? `${row.progress.toFixed(1)}%` : "-";
      const contractId = String(row.contractId || "").trim();
      return `
        <tr class="overdue-table-row" data-contract-id="${escapeHtml(contractId)}">
          <td>${escapeHtml(row.contractId || "-")}</td>
          <td>${escapeHtml(row.customer || "-")}</td>
          <td>${escapeHtml(formatQuantity(row.plannedTon))}</td>
          <td>${escapeHtml(formatQuantity(row.deliveredTon))}</td>
          <td>${escapeHtml(formatQuantity(row.remainingTon))}</td>
          <td>${escapeHtml(progressText)}</td>
          <td><span class="status-pill status-error">overdue</span></td>
        </tr>
      `;
    })
    .join("");
}

function setOverviewReadyStatus() {
  syncChartFilterButtons();
  syncUrlState();
}

function buildOverviewMonthlyDeliveredSeries(deliveries, months = 12) {
  const monthly = new Map();

  deliveries.forEach((row) => {
    const key = monthKey(row.delivery_date);
    if (!key) return;
    if (!monthly.has(key)) {
      monthly.set(key, 0);
    }
    monthly.set(key, Number(monthly.get(key) || 0) + Number(row.quantity || 0));
  });

  const allMonths = Array.from(monthly.keys()).sort((left, right) => left.localeCompare(right));
  const recentMonths = allMonths.slice(-(Number(months) || 12));

  return {
    labels: recentMonths.map((value) => formatMonthLabel(value)),
    quantities: recentMonths.map((value) => Number(Number(monthly.get(value) || 0).toFixed(2)))
  };
}

function renderOverviewTrendChart(series) {
  if (!elements.overviewTrendChart || typeof window.Chart === "undefined") {
    return;
  }

  if (overviewTrendChartInstance) {
    overviewTrendChartInstance.destroy();
    overviewTrendChartInstance = null;
  }

  const context = elements.overviewTrendChart.getContext("2d");
  if (!context) return;

  overviewTrendChartInstance = new window.Chart(context, {
    data: {
      labels: series.labels,
      datasets: [
        {
          type: "bar",
          label: "",
          data: series.quantities,
          yAxisID: "yQty",
          backgroundColor: "rgba(255, 189, 89, 0.78)",
          borderColor: "rgba(255, 189, 89, 0.95)",
          borderWidth: 1
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
          display: (context) => Number(context.dataset.data[context.dataIndex] || 0) > 0,
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
          formatter: (value) => formatChartValue(value)
        }
      },
      scales: {
        x: {
          ticks: {
            color: "#cfb384"
          },
          grid: {
            color: "rgba(86, 65, 34, 0.35)"
          }
        },
        yQty: {
          type: "linear",
          position: "left",
          beginAtZero: true,
          grace: "14%",
          ticks: {
            display: false
          },
          border: {
            display: false
          },
          grid: {
            color: "rgba(86, 65, 34, 0.35)"
          }
        }
      }
    }
  });
}

function buildOverviewTopCustomersByTons(contracts, deliveries, limit = 10) {
  const contractToCustomer = new Map();
  contracts.forEach((row) => {
    const contractId = String(row.contract_id || "").trim();
    if (!contractId) return;
    contractToCustomer.set(contractId, String(row.customer || "Unknown").trim() || "Unknown");
  });

  const byCustomer = new Map();
  deliveries.forEach((row) => {
    const contractId = String(row.contract_id || "").trim();
    const customer = contractToCustomer.get(contractId) || "Unknown";
    byCustomer.set(customer, Number(byCustomer.get(customer) || 0) + Number(row.quantity || 0));
  });

  return Array.from(byCustomer.entries())
    .map(([customer, tons]) => ({ customer, tons: Number(tons.toFixed(2)) }))
    .sort((left, right) => right.tons - left.tons)
    .slice(0, limit);
}

function buildOverviewTopCustomersByUsd(financeRows, limit = 10) {
  const byCustomer = new Map();
  financeRows.forEach((row) => {
    const customer = String(row.customer_name || "Unknown").trim() || "Unknown";
    byCustomer.set(customer, Number(byCustomer.get(customer) || 0) + Number(row.usd || 0));
  });

  return Array.from(byCustomer.entries())
    .map(([customer, usd]) => ({ customer, usd: Number(usd.toFixed(2)) }))
    .sort((left, right) => right.usd - left.usd)
    .slice(0, limit);
}

function renderOverviewTopTonsTable(rows) {
  if (!elements.overviewTopTonsBody) return;
  const safeRows = Array.isArray(rows) ? rows : [];
  if (!safeRows.length) {
    renderInfoRow(elements.overviewTopTonsBody, 2, "No customer rows.");
    return;
  }

  elements.overviewTopTonsBody.innerHTML = safeRows
    .map((row) => `
      <tr>
        <td>${escapeHtml(String(row.customer || "Unknown").toLocaleUpperCase())}</td>
        <td>${escapeHtml(formatQuantity(row.tons))}</td>
      </tr>
    `)
    .join("");
}

function renderOverviewTopUsdTable(rows) {
  if (!elements.overviewTopUsdBody) return;
  const safeRows = Array.isArray(rows) ? rows : [];
  if (!safeRows.length) {
    renderInfoRow(elements.overviewTopUsdBody, 2, "No customer rows.");
    return;
  }

  elements.overviewTopUsdBody.innerHTML = safeRows
    .map((row) => `
      <tr>
        <td>${escapeHtml(row.customer)}</td>
        <td>${escapeHtml(formatCurrency(row.usd, "USD"))}</td>
      </tr>
    `)
    .join("");
}

function buildOverviewProductSeries(lines, limit = 10) {
  const byProduct = new Map();

  lines.forEach((row) => {
    const product = String(row.product || row.job || "Unknown").trim() || "Unknown";
    const current = byProduct.get(product) || { tons: 0 };
    current.tons += Number(row.ton || 0);
    byProduct.set(product, current);
  });

  const ranked = Array.from(byProduct.entries())
    .map(([product, value]) => ({
      product,
      value: Number((value.tons || 0).toFixed(2))
    }))
    .sort((left, right) => right.value - left.value)
    .slice(0, limit);

  return {
    labels: ranked.map((item) => item.product),
    values: ranked.map((item) => item.value)
  };
}

function renderOverviewProductChart(series) {
  if (!elements.overviewProductChart || typeof window.Chart === "undefined") {
    return;
  }

  if (overviewProductChartInstance) {
    overviewProductChartInstance.destroy();
    overviewProductChartInstance = null;
  }

  const context = elements.overviewProductChart.getContext("2d");
  if (!context) return;

  overviewProductChartInstance = new window.Chart(context, {
    type: "bar",
    data: {
      labels: series.labels,
      datasets: [
        {
          label: "Tons",
          data: series.values,
          backgroundColor: "rgba(255, 189, 89, 0.78)",
          borderColor: "rgba(255, 189, 89, 0.95)",
          borderWidth: 1
        }
      ]
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        datalabels: {
          display: true,
          color: "#ffe3b2",
          anchor: "end",
          align: "right",
          offset: 6,
          formatter: (value) => formatChartValue(value)
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: {
            color: "#c2d7ca"
          },
          grid: {
            color: "rgba(31, 45, 37, 0.45)"
          }
        },
        y: {
          ticks: {
            color: "#c2d7ca"
          },
          grid: {
            color: "rgba(31, 45, 37, 0.45)"
          }
        }
      }
    }
  });
}

function renderOverviewOverdueTable(rows) {
  if (!elements.overviewOverdueBody) return;
  const today = getTodayDateString();
  const overdueRows = rows.filter((row) => classifyContractStatus(row, today) === "overdue");

  if (!overdueRows.length) {
    renderInfoRow(elements.overviewOverdueBody, 7, "No overdue contracts.");
    return;
  }

  elements.overviewOverdueBody.innerHTML = overdueRows
    .map((row) => {
      const progressText = row.plannedTon > 0 ? `${row.progress.toFixed(1)}%` : "-";
      const contractId = String(row.contractId || "").trim();
      return `
        <tr class="overdue-table-row" data-contract-id="${escapeHtml(contractId)}">
          <td>${escapeHtml(row.contractId || "-")}</td>
          <td>${escapeHtml(row.customer || "-")}</td>
          <td>${escapeHtml(formatQuantity(row.plannedTon))}</td>
          <td>${escapeHtml(formatQuantity(row.deliveredTon))}</td>
          <td>${escapeHtml(formatQuantity(row.remainingTon))}</td>
          <td>${escapeHtml(progressText)}</td>
          <td><span class="status-pill status-error">overdue</span></td>
        </tr>
      `;
    })
    .join("");
}

function renderOverviewKpis({ lines, deliveries, finance, contractHealth }) {
  const plannedTons = lines.reduce((sum, row) => sum + Number(row.ton || 0), 0);
  const deliveredTons = deliveries.reduce((sum, row) => sum + Number(row.quantity || 0), 0);
  const backlogTons = Math.max(plannedTons - deliveredTons, 0);
  const overdue = Number(contractHealth?.summary?.overdue || 0);
  const invoiceUsd = finance.reduce((sum, row) => sum + Number(row.usd || 0), 0);

  if (elements.overviewKpiDelivered) {
    elements.overviewKpiDelivered.textContent = formatQuantity(deliveredTons);
  }
  if (elements.overviewKpiBacklog) {
    elements.overviewKpiBacklog.textContent = formatQuantity(backlogTons);
  }
  if (elements.overviewKpiOverdue) {
    elements.overviewKpiOverdue.textContent = formatNumber(overdue);
  }
  if (elements.overviewKpiInvoiceUsd) {
    elements.overviewKpiInvoiceUsd.textContent = formatCurrencyCompact(invoiceUsd, "USD");
  }
}

async function loadOverviewData() {
  const [contractsRes, linesRes, deliveriesRes, financeRes] = await Promise.all([
    supabaseClient.from("operation_contracts").select("contract_id, customer").limit(5000),
    supabaseClient.from("operation_lines").select("contract_id, job, product, ton, date_to").limit(5000),
    supabaseClient.from("operation_deliveries").select("contract_id, quantity, delivery_date").limit(5000),
    supabaseClient.from("finance_invoices").select("customer_name, usd").limit(5000)
  ]);

  if (contractsRes.error) throw contractsRes.error;
  if (linesRes.error) throw linesRes.error;
  if (deliveriesRes.error) throw deliveriesRes.error;
  if (financeRes.error) throw financeRes.error;

  const contracts = contractsRes.data || [];
  const lines = linesRes.data || [];
  const deliveries = deliveriesRes.data || [];
  const finance = financeRes.data || [];

  const contractHealth = buildContractHealthRows({
    contracts,
    contractLines: lines,
    deliveries
  });

  return {
    contracts,
    lines,
    deliveries,
    finance,
    contractHealth
  };
}

function renderOverviewFromState() {
  if (!state.overviewData) return;
  const payload = state.overviewData;

  renderOverviewKpis(payload);

  const monthlySeries = buildOverviewMonthlyDeliveredSeries(payload.deliveries, state.overviewTrendMonths);
  renderOverviewTrendChart(monthlySeries);

  const topByTons = buildOverviewTopCustomersByTons(payload.contracts, payload.deliveries, 10);
  renderOverviewTopTonsTable(topByTons);

  const topByUsd = buildOverviewTopCustomersByUsd(payload.finance, 10);
  renderOverviewTopUsdTable(topByUsd);

  const productSeries = buildOverviewProductSeries(payload.lines, 12);
  renderOverviewProductChart(productSeries);

  renderOverviewOverdueTable(payload.contractHealth.activeRows);
  setOverviewReadyStatus();
}

async function runOverviewQuery() {
  hideError(elements.overviewError);
  renderSkeletonRows(elements.overviewTopTonsBody, 2, 6);
  renderSkeletonRows(elements.overviewTopUsdBody, 2, 6);
  renderSkeletonRows(elements.overviewOverdueBody, 7, 6);

  try {
    state.overviewData = await loadOverviewData();
    renderOverviewFromState();
  } catch (error) {
    showError(elements.overviewError, error?.message || "Unknown error");
    renderInfoRow(elements.overviewTopTonsBody, 2, "Query failed.");
    renderInfoRow(elements.overviewTopUsdBody, 2, "Query failed.");
    renderInfoRow(elements.overviewOverdueBody, 7, "Query failed.");
  }
}

async function updateOperationMetrics() {
  const [contractLinesRes, deliveriesRes] = await Promise.all([
    supabaseClient.from("operation_lines").select("line_id, contract_id, job, ton, date_to"),
    supabaseClient.from("operation_deliveries").select("contract_id, job, quantity")
  ]);

  if (contractLinesRes.error) throw contractLinesRes.error;
  if (deliveriesRes.error) throw deliveriesRes.error;

  const contractLines = contractLinesRes.data || [];
  const deliveries = deliveriesRes.data || [];
  const today = getTodayDateString();

  const deliveredByContract = new Map();
  const deliveredByContractJob = new Map();
  const buildJobKey = (contractId, job) => {
    const contractKey = String(contractId || "").trim();
    const jobKey = String(job || "").trim().toLowerCase();
    return `${contractKey}::${jobKey}`;
  };

  deliveries.forEach((row) => {
    const contractKey = String(row.contract_id || "").trim();
    const quantity = Number(row.quantity || 0);
    if (contractKey) {
      deliveredByContract.set(contractKey, Number(deliveredByContract.get(contractKey) || 0) + quantity);
    }

    const normalizedJob = String(row.job || "").trim();
    if (contractKey && normalizedJob) {
      const jobMapKey = buildJobKey(contractKey, normalizedJob);
      deliveredByContractJob.set(jobMapKey, Number(deliveredByContractJob.get(jobMapKey) || 0) + quantity);
    }
  });

  const lineSummary = {
    completed: 0,
    pending: 0,
    overdue: 0
  };

  contractLines.forEach((line) => {
    const contractKey = String(line.contract_id || "").trim();
    const plannedTon = Number(line.ton || 0);
    const hasJob = String(line.job || "").trim().length > 0;
    const byJobValue = hasJob ? Number(deliveredByContractJob.get(buildJobKey(contractKey, line.job)) || 0) : null;
    const fallbackContractValue = Number(deliveredByContract.get(contractKey) || 0);
    const deliveredForLine = byJobValue !== null ? byJobValue : fallbackContractValue;
    const progress = plannedTon > 0 ? (deliveredForLine / plannedTon) * 100 : 0;

    if (progress >= 100) {
      lineSummary.completed += 1;
      return;
    }

    if (line.date_to && String(line.date_to) < today) {
      lineSummary.overdue += 1;
      return;
    }

    lineSummary.pending += 1;
  });

  const metric = {
    contractLines: contractLines.length,
    completed: lineSummary.completed,
    pending: lineSummary.pending,
    overdue: lineSummary.overdue
  };
  state.dashboardMetrics = metric;
  renderDashboardMetrics(metric);
}

async function loadDeliveryVolumeRows() {
  const { data, error } = await supabaseClient
    .from("operation_deliveries")
    .select("delivery_date, quantity")
    .not("delivery_date", "is", null)
    .order("delivery_date", { ascending: true })
    .limit(5000);

  if (error) throw error;
  return data || [];
}

async function runDeliveryVolumeQuery() {
  hideError(elements.deliveriesError);

  try {
    const chartRows = await loadDeliveryVolumeRows();
    state.deliveryChartRows = chartRows;
    const series = buildDeliveryVolumeSeries(chartRows, state.deliveryChartMonths);
    renderDeliveryVolumeChart(series);
    setDeliveriesReadyStatus();
  } catch (error) {
    showError(elements.deliveriesError, error.message || "Unknown error");
  }
}

function buildFinanceMonthlySeries(rows, months) {
  const monthly = new Map();

  rows.forEach((row) => {
    const key = monthKey(row.invoice_date);
    if (!key) return;

    if (!monthly.has(key)) {
      monthly.set(key, { usd: 0 });
    }

    const bucket = monthly.get(key);
    bucket.usd += Number(row.usd || 0);
  });

  const allMonths = Array.from(monthly.keys()).sort((left, right) => left.localeCompare(right));
  const limit = Number(months) || 12;
  const recentMonths = allMonths.slice(-limit);

  return {
    monthKeys: recentMonths,
    labels: recentMonths.map((monthValue) => formatMonthLabel(monthValue)),
    usdTotals: recentMonths.map((monthValue) => Number(Number(monthly.get(monthValue).usd || 0).toFixed(2)))
  };
}

function renderFinanceTrendChart(series) {
  if (!elements.financeTrendChart || typeof window.Chart === "undefined") {
    return;
  }

  if (financeTrendChartInstance) {
    financeTrendChartInstance.destroy();
    financeTrendChartInstance = null;
  }

  const context = elements.financeTrendChart.getContext("2d");
  if (!context) return;

  financeTrendChartInstance = new window.Chart(context, {
    data: {
      labels: series.labels,
      datasets: [
        {
          type: "bar",
          label: "",
          data: series.usdTotals,
          yAxisID: "yUsd",
          backgroundColor: "rgba(255, 189, 89, 0.78)",
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
        legend: {
          display: false
        },
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
          formatter: (value) => formatCurrencyCompact(value, "USD")
        },
        tooltip: {
          callbacks: {
            title: (items) => {
              const index = items?.[0]?.dataIndex ?? -1;
              return index >= 0 ? formatMonthLabel(series.monthKeys[index]) : "";
            },
            label: (contextValue) => {
              const raw = Number(contextValue.raw || 0);
              return `USD: ${formatCurrency(raw, "USD")}`;
            }
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: "#cfb384"
          },
          grid: {
            color: "rgba(86, 65, 34, 0.25)"
          }
        },
        yUsd: {
          type: "linear",
          beginAtZero: true,
          grace: "14%",
          ticks: {
            display: false
          },
          border: {
            display: false
          },
          grid: {
            color: "rgba(86, 65, 34, 0.25)"
          }
        }
      }
    }
  });
}

function setFinanceTableRows(rows) {
  const sortedRows = [...(rows || [])].sort((left, right) => {
    const dateCompare = String(right.invoice_date || "").localeCompare(String(left.invoice_date || ""));
    if (dateCompare !== 0) return dateCompare;
    return String(right.invoice || "").localeCompare(String(left.invoice || ""));
  });

  state.financeTableRows = sortedRows.map((row) => ({
    id: String(row.id || ""),
    invoiceDate: row.invoice_date || null,
    invoice: String(row.invoice || "-"),
    customerName: String(row.customer_name || "-"),
    contract: String(row.contract || "-"),
    tons: Number(row.tons || 0),
    usd: Number(row.usd || 0)
  }));
  state.financeTablePage = 0;
}

function renderFinancePagination() {
  if (!elements.financePaginationInfo || !elements.financePrevBtn || !elements.financeNextBtn) return;

  const totalRows = state.financeTableRows.length;
  if (!totalRows) {
    elements.financePaginationInfo.textContent = "Showing 0-0 of 0";
    elements.financePrevBtn.disabled = true;
    elements.financeNextBtn.disabled = true;
    return;
  }

  const maxPage = Math.max(Math.ceil(totalRows / FINANCE_TABLE_PAGE_SIZE) - 1, 0);
  const safePage = Math.min(Math.max(state.financeTablePage, 0), maxPage);
  state.financeTablePage = safePage;

  const startIndex = safePage * FINANCE_TABLE_PAGE_SIZE;
  const endIndex = Math.min(startIndex + FINANCE_TABLE_PAGE_SIZE, totalRows);
  elements.financePaginationInfo.textContent = `Showing ${startIndex + 1}-${endIndex} of ${totalRows}`;
  elements.financePrevBtn.disabled = safePage <= 0;
  elements.financeNextBtn.disabled = safePage >= maxPage;
}

function renderFinanceInvoiceTable() {
  if (!elements.financeCustomerBody) return;

  if (!state.financeTableRows.length) {
    renderInfoRow(elements.financeCustomerBody, 6, "No finance rows.");
    renderFinancePagination();
    return;
  }

  const startIndex = state.financeTablePage * FINANCE_TABLE_PAGE_SIZE;
  const pageRows = state.financeTableRows.slice(startIndex, startIndex + FINANCE_TABLE_PAGE_SIZE);

  elements.financeCustomerBody.innerHTML = pageRows
    .map((row) => {
      const invoiceDateRaw = String(row.invoiceDate || "-");
      const invoiceText = String(row.invoice || "-");
      const customerText = String(row.customerName || "-");
      const contractText = String(row.contract || "-");
      return `
        <tr>
          <td>${escapeHtml(invoiceDateRaw)}</td>
          <td><span class="finance-truncate finance-truncate-invoice" title="${escapeHtml(invoiceText)}">${escapeHtml(invoiceText)}</span></td>
          <td><span class="finance-truncate finance-truncate-customer" title="${escapeHtml(customerText)}">${escapeHtml(customerText)}</span></td>
          <td><span class="finance-truncate finance-truncate-contract" title="${escapeHtml(contractText)}">${escapeHtml(contractText)}</span></td>
          <td class="number-cell">${escapeHtml(formatQuantity(row.tons))}</td>
          <td class="number-cell">${escapeHtml(formatCurrency(row.usd, "USD"))}</td>
        </tr>
      `;
    })
    .join("");

  renderFinancePagination();
}

function moveFinanceTablePage(step) {
  const maxPage = Math.max(Math.ceil(state.financeTableRows.length / FINANCE_TABLE_PAGE_SIZE) - 1, 0);
  state.financeTablePage = Math.min(Math.max(state.financeTablePage + step, 0), maxPage);
  renderFinanceInvoiceTable();
}

async function loadFinanceRows() {
  const { data, error } = await supabaseClient
    .from("finance_invoices")
    .select("id, invoice, invoice_date, customer_name, contract, tons, usd, thb, total_invoice, status_type, team, credit, export")
    .not("invoice_date", "is", null)
    .order("invoice_date", { ascending: false })
    .limit(5000);

  if (error) throw error;
  return data || [];
}

function buildFinanceMetrics(rows) {
  let tonsTotal = 0;
  let usdTotal = 0;
  let thbTotal = 0;

  rows.forEach((row) => {
    tonsTotal += Number(row.tons || 0);
    usdTotal += Number(row.usd || 0);
    thbTotal += Number(row.thb || 0);
  });

  return {
    totalInvoices: rows.length,
    tonsTotal,
    usdTotal,
    thbTotal
  };
}

async function updateFinanceMetrics(preloadedRows) {
  const financeRows = Array.isArray(preloadedRows) ? preloadedRows : await loadFinanceRows();
  const metric = buildFinanceMetrics(financeRows);
  state.financeMetrics = metric;
  renderFinanceMetrics(metric);
}

async function runFinanceQuery() {
  hideError(elements.financeError);
  renderSkeletonRows(elements.financeCustomerBody, 6, FINANCE_TABLE_PAGE_SIZE);
  if (elements.financePaginationInfo) {
    elements.financePaginationInfo.textContent = "Loading...";
  }
  if (elements.financePrevBtn) {
    elements.financePrevBtn.disabled = true;
  }
  if (elements.financeNextBtn) {
    elements.financeNextBtn.disabled = true;
  }

  try {
    const financeRows = await loadFinanceRows();
    state.financeChartRows = financeRows;

    const series = buildFinanceMonthlySeries(financeRows, state.financeChartMonths);
    renderFinanceTrendChart(series);
    setFinanceTableRows(financeRows);
    renderFinanceInvoiceTable();
    await updateFinanceMetrics(financeRows);
    setFinanceReadyStatus();
  } catch (error) {
    state.financeTableRows = [];
    state.financeTablePage = 0;
    renderInfoRow(elements.financeCustomerBody, 6, `Query failed: ${error.message || "Unknown error"}`);
    renderFinancePagination();
    showError(elements.financeError, error.message || "Unknown error");
  }
}

function setProductCatalogRows(rows) {
  state.productCatalogRows = (rows || []).map((row) => ({
    id: String(row.product_id || ""),
    productName: String(row.product_name || "-"),
    heroProduct: Boolean(row.hero_product),
    description: String(row.description || ""),
    hsCode: String(row.hs_code || ""),
    productImageUrl: String(row.product_image_url || ""),
    updatedAt: String(row.updated_at || ""),
    brand: String(row.brand || ""),
    specDate: String(row.spec_date || "")
  }));
  state.productCatalogPage = 0;
  state.productCatalogSavingHeroIds.clear();
}

function normalizeCatalogMatchText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normalizeCatalogBrand(value) {
  return normalizeCatalogMatchText(value)
    .replace(/\bgroup\b/g, "")
    .replace(/\bdemo\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCatalogRef(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function isSugarProductInPdfSelection(row) {
  if (!PRODUCT_CATALOG_ONLY_PDF_SET) return true;
  const rowEn = normalizeCatalogMatchText(row.product_name_en);
  const rowTh = normalizeCatalogMatchText(row.product_name_th);
  const rowBrand = normalizeCatalogBrand(row.brand);
  const rowRef = normalizeCatalogRef(row.ref_no);

  return PRODUCT_CATALOG_PDF_SELECTION.some((target) => {
    const targetEn = normalizeCatalogMatchText(target.productNameEn);
    const targetTh = normalizeCatalogMatchText(target.productNameTh);
    const targetBrand = normalizeCatalogBrand(target.brand);
    const targetRef = normalizeCatalogRef(target.refNo);

    if (rowEn !== targetEn) return false;
    if (rowTh !== targetTh) return false;
    if (rowBrand !== targetBrand) return false;
    if (targetRef && rowRef !== targetRef) return false;
    return true;
  });
}

function buildSugarProductName(row) {
  const productNameEn = String(row.product_name_en || "-").trim() || "-";
  const brand = String(row.brand || "").trim();
  return brand ? `${productNameEn} (${brand})` : productNameEn;
}

function buildSugarProductDescription(row) {
  const thaiName = String(row.product_name_th || "").trim();
  const specDate = String(row.spec_date || "").trim();
  const appearance = String(row.appearance || "").trim();
  const method = String(row.method_of_production || "").trim();
  const icumsa = String(row.color_icumsa || "").trim();
  const polarization = String(row.polarization_z || "").trim();
  const netWeight = String(row.net_wt || "").trim();
  const origin = String(row.country_of_origin || "").trim();

  const segments = [];
  if (thaiName) segments.push(`TH: ${thaiName}`);
  if (specDate) segments.push(`Spec ${specDate}`);
  if (appearance) segments.push(`Appearance: ${appearance}`);
  if (method) segments.push(`Method: ${method}`);
  if (icumsa) segments.push(`ICUMSA: ${icumsa}`);
  if (polarization) segments.push(`Polarization: ${polarization}`);
  if (netWeight) segments.push(`Net wt: ${netWeight}`);
  if (origin) segments.push(`Origin: ${origin}`);
  return segments.join(" | ");
}

function renderProductCatalogOwnerNote() {
  if (!elements.productCatalogOwnerNote) return;
  if (PRODUCT_CATALOG_LOCAL_DRAFT_MODE) {
    elements.productCatalogOwnerNote.textContent = `Source: local draft (${state.productCatalogOwnerKey})`;
    return;
  }
  if (PRODUCT_CATALOG_SOURCE === "sugar_products") {
    elements.productCatalogOwnerNote.textContent = PRODUCT_CATALOG_ONLY_PDF_SET
      ? "Source: sugar_products (5 selected)"
      : "Source: sugar_products";
    return;
  }
  elements.productCatalogOwnerNote.textContent = `Owner: ${state.productCatalogOwnerKey}`;
}

function applyProductCatalogFilter() {
  const keyword = normalizeSearchText(state.productCatalogSearch);
  state.productCatalogFilteredRows = state.productCatalogRows.filter((row) => {
    if (state.productCatalogHeroFilter === "hero" && !row.heroProduct) return false;
    if (state.productCatalogHeroFilter === "non-hero" && row.heroProduct) return false;
    if (!keyword) return true;

    const haystack = [
      row.productName,
      row.description,
      row.hsCode,
      row.brand,
      row.specDate
    ]
      .map((item) => normalizeSearchText(item))
      .join(" ");
    return haystack.includes(keyword);
  });
}

function renderProductCatalogPagination() {
  if (!elements.productCatalogPaginationInfo || !elements.productCatalogPrevBtn || !elements.productCatalogNextBtn) return;

  const totalRows = state.productCatalogFilteredRows.length;
  if (!totalRows) {
    elements.productCatalogPaginationInfo.textContent = "Showing 0-0 of 0";
    elements.productCatalogPrevBtn.disabled = true;
    elements.productCatalogNextBtn.disabled = true;
    return;
  }

  const maxPage = Math.max(Math.ceil(totalRows / PRODUCT_CATALOG_PAGE_SIZE) - 1, 0);
  const safePage = Math.min(Math.max(state.productCatalogPage, 0), maxPage);
  state.productCatalogPage = safePage;

  const startIndex = safePage * PRODUCT_CATALOG_PAGE_SIZE;
  const endIndex = Math.min(startIndex + PRODUCT_CATALOG_PAGE_SIZE, totalRows);
  elements.productCatalogPaginationInfo.textContent = `Showing ${startIndex + 1}-${endIndex} of ${totalRows}`;
  elements.productCatalogPrevBtn.disabled = safePage <= 0;
  elements.productCatalogNextBtn.disabled = safePage >= maxPage;
}

function findProductCatalogRow(productId) {
  const normalizedId = String(productId || "");
  if (!normalizedId) return null;
  return state.productCatalogRows.find((row) => row.id === normalizedId) || null;
}

function splitProductDescriptionItems(value) {
  const text = String(value || "").trim();
  if (!text || text === "-") return ["-"];
  const items = text
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);
  return items.length ? items : [text];
}

function renderProductCatalogDetail(row) {
  if (!row) return;

  const productName = String(row.productName || "-").trim() || "-";
  const specRefText = String(row.hsCode || "").trim() || "-";
  const brandText = String(row.brand || "").trim() || "-";
  const descriptionText = String(row.description || "").trim() || "-";
  const imageUrl = String(row.productImageUrl || "").trim();
  const specDateText = String(row.specDate || "").trim()
    ? formatDateLabel(row.specDate)
    : formatDateTimeLabel(row.updatedAt);

  if (elements.productCatalogDetailTitle) {
    elements.productCatalogDetailTitle.textContent = productName;
  }
  if (elements.productCatalogDetailHero) {
    elements.productCatalogDetailHero.textContent = brandText;
  }
  if (elements.productCatalogDetailHsCode) {
    elements.productCatalogDetailHsCode.textContent = specRefText;
  }
  if (elements.productCatalogDetailUpdatedAt) {
    elements.productCatalogDetailUpdatedAt.textContent = specDateText;
  }
  if (elements.productCatalogDetailDescription) {
    const items = splitProductDescriptionItems(descriptionText);
    elements.productCatalogDetailDescription.innerHTML = items
      .map((item) => `<div class="product-detail-description-item">${escapeHtml(item)}</div>`)
      .join("");
  }

  if (elements.productCatalogDetailImage && elements.productCatalogDetailImagePlaceholder) {
    if (imageUrl) {
      elements.productCatalogDetailImage.src = imageUrl;
      elements.productCatalogDetailImage.classList.remove("hidden");
      elements.productCatalogDetailImagePlaceholder.classList.add("hidden");
      elements.productCatalogDetailImage.onerror = () => {
        if (!elements.productCatalogDetailImage || !elements.productCatalogDetailImagePlaceholder) return;
        elements.productCatalogDetailImage.classList.add("hidden");
        elements.productCatalogDetailImagePlaceholder.classList.remove("hidden");
      };
    } else {
      elements.productCatalogDetailImage.removeAttribute("src");
      elements.productCatalogDetailImage.classList.add("hidden");
      elements.productCatalogDetailImagePlaceholder.classList.remove("hidden");
      elements.productCatalogDetailImage.onerror = null;
    }
  }

  if (elements.productCatalogDetailImageLink) {
    if (imageUrl) {
      elements.productCatalogDetailImageLink.href = imageUrl;
      elements.productCatalogDetailImageLink.textContent = "Open image";
      elements.productCatalogDetailImageLink.removeAttribute("aria-disabled");
    } else {
      elements.productCatalogDetailImageLink.removeAttribute("href");
      elements.productCatalogDetailImageLink.textContent = "-";
      elements.productCatalogDetailImageLink.setAttribute("aria-disabled", "true");
    }
  }
}

function openProductCatalogDetail(productId) {
  if (!elements.productCatalogDetailOverlay) return;
  const row = findProductCatalogRow(productId);
  if (!row) return;

  state.productCatalogDetailId = row.id;
  renderProductCatalogDetail(row);
  elements.productCatalogDetailOverlay.classList.remove("hidden");
  elements.productCatalogDetailOverlay.setAttribute("aria-hidden", "false");
  document.body.classList.add("product-detail-open");
  elements.productCatalogDetailCloseBtn?.focus();
}

function closeProductCatalogDetail() {
  if (!elements.productCatalogDetailOverlay) return;
  state.productCatalogDetailId = null;
  elements.productCatalogDetailOverlay.classList.add("hidden");
  elements.productCatalogDetailOverlay.setAttribute("aria-hidden", "true");
  document.body.classList.remove("product-detail-open");
}

function syncProductCatalogDetail() {
  if (!state.productCatalogDetailId) return;
  const row = findProductCatalogRow(state.productCatalogDetailId);
  if (!row) {
    closeProductCatalogDetail();
    return;
  }
  renderProductCatalogDetail(row);
}

function renderProductCatalogGallerySkeleton(count = PRODUCT_CATALOG_PAGE_SIZE) {
  if (!elements.productCatalogGallery) return;
  elements.productCatalogGallery.innerHTML = Array.from({ length: count }, () => `
    <article class="product-card">
      <div class="product-image-placeholder"><span class="skeleton-block"></span></div>
      <div class="product-card-body">
        <span class="skeleton-block"></span>
        <span class="skeleton-block"></span>
      </div>
    </article>
  `).join("");
}

function renderProductCatalogGalleryMessage(message) {
  if (!elements.productCatalogGallery) return;
  elements.productCatalogGallery.innerHTML = `<div class="product-gallery-empty">${escapeHtml(message)}</div>`;
}

function renderProductCatalogGallery() {
  if (!elements.productCatalogGallery) return;

  if (!state.productCatalogFilteredRows.length) {
    renderProductCatalogGalleryMessage("No product catalog rows.");
    return;
  }

  const pageRows = state.productCatalogFilteredRows;

  elements.productCatalogGallery.innerHTML = pageRows
    .map((row) => {
      const productText = String(row.productName || "-");
      const shortProductText = truncateText(productText, 26);
      const specRefText = String(row.hsCode || "").trim() || "-";
      const nextHero = row.heroProduct ? "false" : "true";
      const isSavingHero = state.productCatalogSavingHeroIds.has(row.id);
      const disableActions = PRODUCT_CATALOG_READ_ONLY;
      const heroActionText = disableActions ? "Read only" : isSavingHero ? "Saving..." : row.heroProduct ? "Clear" : "Set Hero";

      return `
        <article
          class="product-card product-card-clickable"
          data-product-id="${escapeHtml(row.id)}"
          tabindex="0"
          role="button"
          aria-label="Open details for ${escapeHtml(productText)}"
        >
          <div class="product-image-placeholder" aria-label="Image placeholder">
            <span>IMAGE</span>
          </div>
          <div class="product-card-body">
            <div class="product-card-head">
              <h4 title="${escapeHtml(productText)}">${escapeHtml(shortProductText)}</h4>
            </div>
            <p class="product-card-meta">Spec Ref: ${escapeHtml(specRefText)}</p>
          </div>
          <div class="product-card-actions">
            <button
              class="refresh-btn ghost-btn product-edit-btn"
              type="button"
              data-product-id="${escapeHtml(row.id)}"
              ${disableActions ? "disabled" : ""}
            >
              Edit
            </button>
            <button
              class="refresh-btn ghost-btn product-hero-btn"
              type="button"
              data-product-id="${escapeHtml(row.id)}"
              data-next-hero="${escapeHtml(nextHero)}"
              ${isSavingHero || disableActions ? "disabled" : ""}
            >
              ${escapeHtml(heroActionText)}
            </button>
          </div>
        </article>
      `;
    })
    .join("");

}

function moveProductCatalogPage(step) {
  const maxPage = Math.max(Math.ceil(state.productCatalogFilteredRows.length / PRODUCT_CATALOG_PAGE_SIZE) - 1, 0);
  state.productCatalogPage = Math.min(Math.max(state.productCatalogPage + step, 0), maxPage);
  renderProductCatalogGallery();
}

function updateProductCatalogFilter(value) {
  state.productCatalogSearch = String(value || "");
  state.productCatalogPage = 0;
  applyProductCatalogFilter();
  renderProductCatalogGallery();
}

function updateProductCatalogHeroFilter(value) {
  const normalized = value === "hero" || value === "non-hero" ? value : "all";
  state.productCatalogHeroFilter = normalized;
  state.productCatalogPage = 0;
  applyProductCatalogFilter();
  renderProductCatalogGallery();
}

function openProductCatalogEditor(productId = null) {
  if (!elements.productCatalogEditor || !elements.productCatalogEditorTitle) return;
  if (PRODUCT_CATALOG_READ_ONLY) {
    showError(elements.productCatalogError, "Product Catalog is read-only for current source.");
    return;
  }

  const row = productId ? state.productCatalogRows.find((item) => item.id === productId) : null;
  state.productCatalogEditingId = row ? row.id : null;
  elements.productCatalogEditorTitle.textContent = row ? "Edit Product" : "Add Product";
  if (elements.productCatalogNameInput) {
    elements.productCatalogNameInput.value = row ? row.productName : "";
  }
  if (elements.productCatalogHsCodeInput) {
    elements.productCatalogHsCodeInput.value = row ? row.hsCode : "";
  }
  if (elements.productCatalogDescriptionInput) {
    elements.productCatalogDescriptionInput.value = row ? row.description : "";
  }
  if (elements.productCatalogHeroInput) {
    elements.productCatalogHeroInput.checked = row ? row.heroProduct : false;
  }

  elements.productCatalogEditor.classList.remove("hidden");
  elements.productCatalogNameInput?.focus();
}

function closeProductCatalogEditor() {
  if (!elements.productCatalogEditor) return;
  state.productCatalogEditingId = null;
  elements.productCatalogEditor.classList.add("hidden");
}

function setProductCatalogFormSaving(isSaving) {
  state.productCatalogSavingForm = Boolean(isSaving);
  if (elements.productCatalogSaveBtn) elements.productCatalogSaveBtn.disabled = isSaving;
  if (elements.productCatalogCancelBtn) elements.productCatalogCancelBtn.disabled = isSaving;
  if (elements.productCatalogAddBtn) elements.productCatalogAddBtn.disabled = isSaving;
}

async function saveProductCatalogEditor() {
  if (PRODUCT_CATALOG_READ_ONLY) {
    showError(elements.productCatalogError, "Product Catalog is read-only for current source.");
    return;
  }
  const productName = String(elements.productCatalogNameInput?.value || "").trim();
  const hsCode = String(elements.productCatalogHsCodeInput?.value || "").trim();
  const description = String(elements.productCatalogDescriptionInput?.value || "").trim();
  const heroProduct = Boolean(elements.productCatalogHeroInput?.checked);

  if (!productName) {
    showError(elements.productCatalogError, "Product name is required.");
    elements.productCatalogNameInput?.focus();
    return;
  }

  hideError(elements.productCatalogError);
  setProductCatalogFormSaving(true);

  try {
    const { error } = await supabaseClient.rpc("upsert_product_catalog_item_sandbox", {
      p_owner_key: state.productCatalogOwnerKey,
      p_product_id: state.productCatalogEditingId || null,
      p_product_name: productName,
      p_description: description || null,
      p_hs_code: hsCode || null,
      p_hero_product: heroProduct
    });
    if (error) throw error;

    closeProductCatalogEditor();
    await runProductCatalogQuery();
  } catch (error) {
    showError(elements.productCatalogError, error.message || "Unable to save product.");
  } finally {
    setProductCatalogFormSaving(false);
  }
}

function setProductCatalogRowHero(productId, heroProduct) {
  let changed = false;
  state.productCatalogRows = state.productCatalogRows.map((row) => {
    if (row.id !== productId) return row;
    changed = true;
    return {
      ...row,
      heroProduct: Boolean(heroProduct)
    };
  });

  if (!changed) return;
  applyProductCatalogFilter();
  syncProductCatalogDetail();
}

async function saveProductCatalogHero(productId, nextHeroValue) {
  if (PRODUCT_CATALOG_READ_ONLY) {
    showError(elements.productCatalogError, "Product Catalog is read-only for current source.");
    return;
  }
  const normalizedId = String(productId || "");
  const nextHero = Boolean(nextHeroValue);
  if (!normalizedId) return;
  if (state.productCatalogSavingHeroIds.has(normalizedId)) return;

  hideError(elements.productCatalogError);
  state.productCatalogSavingHeroIds.add(normalizedId);
  renderProductCatalogGallery();

  try {
    const { error } = await supabaseClient.rpc("set_product_catalog_hero_sandbox", {
      p_owner_key: state.productCatalogOwnerKey,
      p_product_id: normalizedId,
      p_is_hero: nextHero
    });
    if (error) throw error;

    setProductCatalogRowHero(normalizedId, nextHero);
  } catch (error) {
    showError(elements.productCatalogError, error.message || "Failed to save hero product.");
  } finally {
    state.productCatalogSavingHeroIds.delete(normalizedId);
    renderProductCatalogGallery();
  }
}

async function loadProductCatalogRows() {
  if (PRODUCT_CATALOG_LOCAL_DRAFT_MODE) {
    return PRODUCT_CATALOG_LOCAL_DRAFT_ROWS.map((row) => ({
      ...row,
      owner_key: state.productCatalogOwnerKey
    }));
  }

  if (PRODUCT_CATALOG_SOURCE === "sugar_products") {
    const { data, error } = await supabaseClient
      .from("sugar_products")
      .select("id, product_name_en, product_name_th, brand, ref_no, spec_date, appearance, method_of_production, color_icumsa, polarization_z, net_wt, country_of_origin")
      .order("product_name_en", { ascending: true })
      .order("brand", { ascending: true })
      .order("id", { ascending: true })
      .limit(PRODUCT_CATALOG_QUERY_LIMIT);

    if (error) throw error;
    const rawRows = data || [];
    const selectedRows = PRODUCT_CATALOG_ONLY_PDF_SET
      ? rawRows.filter((row) => isSugarProductInPdfSelection(row))
      : rawRows;
    const rowsForView = selectedRows.length ? selectedRows : rawRows;
    return rowsForView.map((row) => ({
      product_id: String(row.id || ""),
      owner_key: state.productCatalogOwnerKey,
      product_name: buildSugarProductName(row),
      hero_product: false,
      description: buildSugarProductDescription(row),
      hs_code: String(row.ref_no || ""),
      product_image_url: "",
      updated_at: row.spec_date ? `${row.spec_date}T00:00:00` : "",
      brand: String(row.brand || ""),
      spec_date: String(row.spec_date || "")
    }));
  }

  const { data, error } = await supabaseClient
    .from("product_catalog_listing_sandbox")
    .select("product_id, owner_key, product_name, hero_product, description, hs_code, product_image_url, updated_at")
    .eq("owner_key", state.productCatalogOwnerKey)
    .order("hero_product", { ascending: false })
    .order("updated_at", { ascending: false })
    .order("product_name", { ascending: true })
    .limit(PRODUCT_CATALOG_QUERY_LIMIT);

  if (error) throw error;
  return data || [];
}

async function runProductCatalogQuery() {
  hideError(elements.productCatalogError);
  renderProductCatalogOwnerNote();
  renderProductCatalogGallerySkeleton();
  if (elements.productCatalogAddBtn) {
    elements.productCatalogAddBtn.disabled = PRODUCT_CATALOG_READ_ONLY;
  }

  try {
    const rows = await loadProductCatalogRows();
    if (ACTIVE_SUPABASE_ENV === "demo") {
      updateMarketProductOptionsFromCatalogRows(rows);
      renderMarketProductSelector();
      applyMarketProductLockState();
    }
    setProductCatalogRows(rows);
    applyProductCatalogFilter();
    renderProductCatalogGallery();
    syncProductCatalogDetail();
  } catch (error) {
    state.productCatalogRows = [];
    state.productCatalogFilteredRows = [];
    state.productCatalogPage = 0;
    closeProductCatalogDetail();
    renderProductCatalogGalleryMessage(`Query failed: ${error.message || "Unknown error"}`);
    showError(elements.productCatalogError, error.message || "Unknown error");
  }
}

async function loadStockRows() {
  const { data, error } = await supabaseClient
    .from("operation_stock")
    .select("factory, type, qty")
    .limit(5000);

  if (error) throw error;
  return data || [];
}

function buildStockMetrics(rows) {
  const byFactory = new Map();
  const byType = new Map();
  let totalQty = 0;

  rows.forEach((row) => {
    const qty = Number(row.qty || 0);
    totalQty += qty;

    const factory = String(row.factory || "Unknown").trim() || "Unknown";
    byFactory.set(factory, Number(byFactory.get(factory) || 0) + qty);

    const type = String(row.type || "unknown").trim() || "unknown";
    byType.set(type, Number(byType.get(type) || 0) + qty);
  });

  const topFactoryQty = Array.from(byFactory.values()).sort((left, right) => right - left)[0] || 0;

  return {
    totalQty: Number(totalQty.toFixed(2)),
    factoryCount: byFactory.size,
    typeCount: byType.size,
    topFactoryQty: Number(topFactoryQty.toFixed(2))
  };
}

function buildStockFactoryLineSeries(rows, limit = 12) {
  const byFactory = new Map();
  rows.forEach((row) => {
    const factory = String(row.factory || "Unknown").trim() || "Unknown";
    byFactory.set(factory, Number(byFactory.get(factory) || 0) + Number(row.qty || 0));
  });

  const ranked = Array.from(byFactory.entries())
    .map(([factory, qty]) => ({ factory, qty: Number(qty.toFixed(2)) }))
    .sort((left, right) => right.qty - left.qty)
    .slice(0, limit);

  return {
    labels: ranked.map((item) => item.factory),
    quantities: ranked.map((item) => item.qty)
  };
}

function buildStockTypeTableRows(rows, limit = 30) {
  const byType = new Map();
  let totalQty = 0;

  rows.forEach((row) => {
    const type = String(row.type || "unknown").trim() || "unknown";
    const qty = Number(row.qty || 0);
    byType.set(type, Number(byType.get(type) || 0) + qty);
    totalQty += qty;
  });

  return Array.from(byType.entries())
    .map(([type, qty]) => ({ type, qty: Number(qty.toFixed(2)) }))
    .sort((left, right) => right.qty - left.qty)
    .slice(0, limit)
    .map((row) => ({
      ...row,
      sharePercent: totalQty > 0 ? Number(((row.qty / totalQty) * 100).toFixed(2)) : 0
    }));
}

function renderStockFactoryTrendChart(series) {
  if (!elements.stockFactoryTrendChart || typeof window.Chart === "undefined") return;

  if (stockFactoryTrendChartInstance) {
    stockFactoryTrendChartInstance.destroy();
    stockFactoryTrendChartInstance = null;
  }

  const context = elements.stockFactoryTrendChart.getContext("2d");
  if (!context) return;

  stockFactoryTrendChartInstance = new window.Chart(context, {
    type: "bar",
    data: {
      labels: series.labels,
      datasets: [
        {
          label: "",
          data: series.quantities,
          backgroundColor: "rgba(255, 189, 89, 0.78)",
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
        legend: {
          display: false
        },
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
          formatter: (value) => formatCompactNumber(value)
        },
        tooltip: {
          callbacks: {
            label: (contextValue) => `Qty: ${formatQuantity(contextValue.raw)}`
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: "#cfb384",
            callback: (_value, index) => truncateText(series.labels[index] || "", 12)
          },
          grid: {
            color: "rgba(86, 65, 34, 0.25)"
          }
        },
        y: {
          type: "linear",
          beginAtZero: true,
          grace: "14%",
          ticks: {
            display: false
          },
          border: {
            display: false
          },
          grid: {
            color: "rgba(86, 65, 34, 0.25)"
          }
        }
      }
    }
  });
}

function renderStockTypeTable(rows) {
  if (!elements.stockTypeTableBody) return;

  if (!rows.length) {
    renderInfoRow(elements.stockTypeTableBody, 3, "No stock rows.");
    return;
  }

  elements.stockTypeTableBody.innerHTML = rows
    .map((row) => `
      <tr>
        <td>${escapeHtml(String(row.type || "-"))}</td>
        <td class="number-cell">${escapeHtml(formatQuantity(row.qty))}</td>
        <td class="number-cell">${escapeHtml(formatQuantity(row.sharePercent))}%</td>
      </tr>
    `)
    .join("");
}

async function runStockQuery() {
  hideError(elements.stockError);

  try {
    const stockRows = await loadStockRows();
    state.stockRows = stockRows;

    const metrics = buildStockMetrics(stockRows);
    state.stockMetrics = metrics;
    renderStockMetrics(metrics);

    const factorySeries = buildStockFactoryLineSeries(stockRows, 12);
    const typeRows = buildStockTypeTableRows(stockRows, 30);
    renderStockFactoryTrendChart(factorySeries);
    renderStockTypeTable(typeRows);
    setStockReadyStatus();
  } catch (error) {
    state.stockRows = [];
    state.stockMetrics = null;
    setMetricsFallback("N/A");
    renderInfoRow(elements.stockTypeTableBody, 3, "Query failed.");
    showError(elements.stockError, error.message || "Unknown error");
  }
}

function buildContractHealthRows({ contracts, contractLines, deliveries }) {
  const byContract = new Map();

  contracts.forEach((row) => {
    byContract.set(row.contract_id, {
      contractId: row.contract_id,
      customer: row.customer || "",
      plannedTon: 0,
      deliveredTon: 0,
      remainingTon: 0,
      progress: 0,
      dueDate: null
    });
  });

  contractLines.forEach((row) => {
    const key = row.contract_id || "Unknown";
    if (!byContract.has(key)) {
      byContract.set(key, {
        contractId: key,
        customer: "",
        plannedTon: 0,
        deliveredTon: 0,
        remainingTon: 0,
        progress: 0,
        dueDate: null
      });
    }

    const contract = byContract.get(key);
    contract.plannedTon += Number(row.ton || 0);
    if (row.date_to && (!contract.dueDate || row.date_to > contract.dueDate)) {
      contract.dueDate = row.date_to;
    }
  });

  deliveries.forEach((row) => {
    const key = row.contract_id || "Unknown";
    if (!byContract.has(key)) {
      byContract.set(key, {
        contractId: key,
        customer: "",
        plannedTon: 0,
        deliveredTon: 0,
        remainingTon: 0,
        progress: 0,
        dueDate: null
      });
    }

    const contract = byContract.get(key);
    contract.deliveredTon += Number(row.quantity || 0);
  });

  const rows = Array.from(byContract.values()).map((row) => {
    const remainingTon = row.plannedTon - row.deliveredTon;
    const progress = row.plannedTon > 0 ? (row.deliveredTon / row.plannedTon) * 100 : 0;

    return {
      ...row,
      remainingTon,
      progress
    };
  });

  const today = getTodayDateString();
  const summary = {
    total: rows.length,
    completed: 0,
    pending: 0,
    overdue: 0
  };

  rows.forEach((row) => {
    const status = classifyContractStatus(row, today);
    summary[status] += 1;
  });

  const activeRows = rows.filter((row) => classifyContractStatus(row, today) !== "completed");

  activeRows.sort((left, right) => {
    const score = (row) => {
      const status = classifyContractStatus(row, today);
      if (status === "overdue") return 3;
      if (status === "pending") return 2;
      return 1;
    };

    const riskCompare = score(right) - score(left);
    if (riskCompare !== 0) return riskCompare;
    return (right.progress || 0) - (left.progress || 0);
  });

  return {
    activeRows,
    summary
  };
}

async function runContractHealthQuery() {
  renderSkeletonRows(elements.overdueOnlyBody, 7);

  try {
    const [contractsRes, contractLinesRes, deliveriesRes] = await Promise.all([
      supabaseClient.from("operation_contracts").select("contract_id, customer"),
      supabaseClient.from("operation_lines").select("contract_id, ton, date_to"),
      supabaseClient.from("operation_deliveries").select("contract_id, quantity")
    ]);

    if (contractsRes.error) throw contractsRes.error;
    if (contractLinesRes.error) throw contractLinesRes.error;
    if (deliveriesRes.error) throw deliveriesRes.error;

    const contractHealth = buildContractHealthRows({
      contracts: contractsRes.data || [],
      contractLines: contractLinesRes.data || [],
      deliveries: deliveriesRes.data || []
    });

    renderOverdueOnlyTable(contractHealth.activeRows);
    syncUrlState();
  } catch (error) {
    renderInfoRow(elements.overdueOnlyBody, 7, `Query failed: ${error.message || "Unknown error"}`);
  }
}

function mapCountryCode(feature) {
  const properties = feature?.properties || {};
  const code =
    properties["ISO3166-1-Alpha-3"] ||
    properties.ISO_A3 ||
    properties.iso_a3 ||
    properties.ADM0_A3 ||
    properties.iso3 ||
    feature?.id ||
    "";
  return String(code).toUpperCase();
}

function mapCountryName(feature) {
  const properties = feature?.properties || {};
  return String(
    properties.name ||
    properties.ADMIN ||
    properties.name_en ||
    properties.NAME_EN ||
    properties.NAME ||
      "Unknown"
  );
}

function normalizeCountryText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function buildMarketLocationCandidates(value) {
  const raw = String(value || "").trim();
  if (!raw) return [];

  const candidates = [];
  const seen = new Set();
  const pushCandidate = (item) => {
    const text = String(item || "").trim();
    if (!text) return;
    const key = `${text}__${normalizeCountryText(text)}`;
    if (seen.has(key)) return;
    seen.add(key);
    candidates.push(text);
  };

  pushCandidate(raw);
  pushCandidate(raw.replace(/\([^)]*\)/g, " "));

  const splitOnce = raw.split(/[,/|;]+/g).map((part) => part.trim()).filter(Boolean);
  splitOnce.forEach(pushCandidate);
  if (splitOnce.length >= 2) {
    pushCandidate(splitOnce[splitOnce.length - 1]);
    pushCandidate(splitOnce[0]);
  }

  const splitTwice = raw.split(/\s+-\s+|\s+–\s+|\s+—\s+|->|>/g).map((part) => part.trim()).filter(Boolean);
  splitTwice.forEach(pushCandidate);
  if (splitTwice.length >= 2) {
    pushCandidate(splitTwice[splitTwice.length - 1]);
  }

  const tokens = normalizeCountryText(raw).split(" ").filter(Boolean);
  if (tokens.length >= 1) {
    pushCandidate(tokens[tokens.length - 1]);
  }
  if (tokens.length >= 2) {
    pushCandidate(tokens.slice(-2).join(" "));
  }

  return candidates;
}

function resolveMarketCountryByFuzzyText(normalizedText, lookup) {
  const normalized = normalizeCountryText(normalizedText);
  if (!normalized || normalized.length < 3) return null;
  const entries = Array.isArray(lookup?.byNameEntries) ? lookup.byNameEntries : [];
  if (!entries.length) return null;

  const normalizedTokens = normalized.split(" ").filter((token) => token.length >= 3);
  let bestIso3 = null;
  let bestScore = 0;

  entries.forEach(([countryName, iso3]) => {
    const candidateName = String(countryName || "");
    if (!candidateName) return;

    let score = 0;
    if (candidateName === normalized) {
      score = 100;
    } else if (candidateName.includes(normalized) || normalized.includes(candidateName)) {
      score = Math.min(candidateName.length, normalized.length) + 10;
    } else {
      const countryTokens = candidateName.split(" ").filter((token) => token.length >= 3);
      if (!countryTokens.length || !normalizedTokens.length) return;

      const overlap = countryTokens.reduce((count, token) => {
        return count + (normalizedTokens.includes(token) ? 1 : 0);
      }, 0);

      if (!overlap) return;
      score = overlap * 4 - Math.abs(countryTokens.length - normalizedTokens.length) * 0.25;
    }

    if (score > bestScore) {
      bestScore = score;
      bestIso3 = iso3;
    }
  });

  return bestScore >= 4 ? bestIso3 : null;
}

function buildMarketCountryLookup(geojson) {
  if (marketCountryLookupCache) {
    return marketCountryLookupCache;
  }

  const byIso3 = new Set();
  const byIso2 = new Map();
  const byName = new Map();
  const features = Array.isArray(geojson?.features) ? geojson.features : [];

  features.forEach((feature) => {
    const properties = feature?.properties || {};
    const iso3 = mapCountryCode(feature);
    if (!iso3 || iso3.length !== 3) return;

    byIso3.add(iso3);

    const iso2Raw = properties["ISO3166-1-Alpha-2"] || properties.ISO_A2 || properties.iso_a2;
    const iso2 = String(iso2Raw || "").trim().toUpperCase();
    if (iso2.length === 2) {
      byIso2.set(iso2, iso3);
    }

    const nameCandidates = [
      properties.name,
      properties.ADMIN,
      properties.name_en,
      properties.NAME_EN,
      properties.NAME,
      properties.SOVEREIGNT
    ];

    nameCandidates.forEach((name) => {
      const normalized = normalizeCountryText(name);
      if (normalized) {
        byName.set(normalized, iso3);
      }
    });
  });

  const byNameEntries = [...byName.entries()];
  marketCountryLookupCache = { byIso3, byIso2, byName, byNameEntries };
  return marketCountryLookupCache;
}

function resolveMarketCountryIso3(row, lookup) {
  const codeCandidates = [row.iso3, row.country_code, row.iso_code, row.iso];
  for (const candidate of codeCandidates) {
    const raw = String(candidate || "").trim().toUpperCase();
    if (!raw) continue;
    if (raw.length === 3 && lookup.byIso3.has(raw)) {
      return raw;
    }
    if (raw.length === 2 && lookup.byIso2.has(raw)) {
      return lookup.byIso2.get(raw);
    }
  }

  const nameCandidates = [row.country, row.country_name, row.region, row.location];
  const fuzzyCandidates = [];
  for (const candidate of nameCandidates) {
    const locationCandidates = buildMarketLocationCandidates(candidate);
    for (const locationCandidate of locationCandidates) {
      const normalized = normalizeCountryText(locationCandidate);
      if (!normalized) continue;
      fuzzyCandidates.push(normalized);
      if (MARKET_COUNTRY_ALIASES[normalized]) {
        return MARKET_COUNTRY_ALIASES[normalized];
      }
      if (lookup.byName.has(normalized)) {
        return lookup.byName.get(normalized);
      }
    }
  }

  for (const candidate of fuzzyCandidates) {
    const fuzzyIso3 = resolveMarketCountryByFuzzyText(candidate, lookup);
    if (fuzzyIso3) return fuzzyIso3;
  }

  return null;
}

function renderMarketMapLegend() {
  if (!elements.marketMapLegend) return;
  const rows = [
    { label: "Green: Customer", color: MARKET_MAP_COLOR_GREEN },
    { label: "Yellow: Not customer", color: MARKET_MAP_COLOR_YELLOW },
    { label: "Orange: Mixed", color: MARKET_MAP_COLOR_ORANGE }
  ];

  elements.marketMapLegend.innerHTML = rows
    .map(
      (item) => `
        <div class="market-map-legend-item">
          <span class="market-map-legend-swatch" style="background:${item.color};"></span>
          <span>${escapeHtml(item.label)}</span>
        </div>
      `
    )
    .join("");
}

function marketTooltipHtml(countryName, summary) {
  const totalTrades = Number(summary?.totalTrades || 0);
  return `
    <div>
      <div style="font-weight:600; margin-bottom:0.2rem;">${escapeHtml(countryName)}</div>
      <div style="color:#d4d4d8;">Trades: <span style="color:#ffbd59;">${totalTrades.toLocaleString("en-US")}</span></div>
    </div>
  `;
}

function MapsToCountry(countryCode) {
  const safeCode = String(countryCode || "").toUpperCase() || "-";
  setMarketMapReadyStatus(`Ready (selected: ${safeCode})`);
  console.log("MapsToCountry:", safeCode);
}

async function loadWorldCountriesGeoJson() {
  if (marketGeoJsonCache) {
    return marketGeoJsonCache;
  }

  const response = await fetch(MARKET_GEOJSON_URL);
  if (!response.ok) {
    throw new Error(`GeoJSON load failed (${response.status})`);
  }

  marketGeoJsonCache = await response.json();
  return marketGeoJsonCache;
}

function ensureMarketMap() {
  if (!elements.marketMapCanvas || typeof window.L === "undefined") {
    return false;
  }

  if (marketMapInstance) {
    return true;
  }

  marketMapInstance = window.L.map(elements.marketMapCanvas, {
    zoomControl: false,
    attributionControl: false,
    scrollWheelZoom: false,
    doubleClickZoom: false,
    touchZoom: false,
    boxZoom: false,
    keyboard: false,
    dragging: false,
    worldCopyJump: false,
    minZoom: 1,
    maxZoom: 10
  }).setView([20, 0], 2);

  return true;
}

function getMarketCountrySummary(feature, metric) {
  const code = mapCountryCode(feature);
  return metric.byCode.get(code) || null;
}

function getMarketCountryFillColor(summary) {
  if (!summary) return "rgba(0, 0, 0, 0)";
  if (summary.hasGreen && summary.hasYellow) return MARKET_MAP_COLOR_ORANGE;
  if (summary.hasGreen) return MARKET_MAP_COLOR_GREEN;
  if (summary.hasYellow) return MARKET_MAP_COLOR_YELLOW;
  return "rgba(0, 0, 0, 0)";
}

function getMarketLayerCenter(layer) {
  if (!layer) return null;
  if (typeof layer.getBounds === "function") {
    const bounds = layer.getBounds();
    if (bounds && typeof bounds.isValid === "function" && bounds.isValid()) {
      return bounds.getCenter();
    }
  }
  if (typeof layer.getLatLng === "function") {
    return layer.getLatLng();
  }
  return null;
}

async function loadMarketMetric() {
  const geojson = await loadWorldCountriesGeoJson();
  const countryLookup = buildMarketCountryLookup(geojson);

  const { data, error } = await supabaseClient
    .from("companies")
    .select("company_id, customer, location, status, product_description, trades, created_at")
    .order("created_at", { ascending: true, nullsFirst: false })
    .limit(5000);

  if (error) {
    const lowered = String(error.message || "").toLowerCase();
    if (error.code === "42501" || lowered.includes("permission denied")) {
      await supabaseClient.auth.signOut().catch(() => {});
      redirectToLoginPage();
      return {
        byCode: new Map(),
        tableRows: [],
        coverage: {
          totalRows: 0,
          mappedRows: 0,
          totalLocationGroups: 0,
          mappedLocationGroups: 0,
          unmappedLocations: []
        }
      };
    }

    const notFoundCode = error.code === "PGRST205";
    const relationMissing = lowered.includes("does not exist");
    if (notFoundCode || relationMissing) {
      return {
        byCode: new Map(),
        tableRows: [],
        coverage: {
          totalRows: 0,
          mappedRows: 0,
          totalLocationGroups: 0,
          mappedLocationGroups: 0,
          unmappedLocations: []
        }
      };
    }
    throw error;
  }

  const tableRows = (data || []).map((row, index) => ({
    id: String(row.company_id || `company-${index}`),
    status: normalizeMarketStatus(row.status),
    customer: String(row.customer || "-"),
    country: String(row.location || "-"),
    productDescription: String(row.product_description || "-"),
    trades: Number(row.trades || 0),
    countryIso3: "",
    countryGroupKey: "",
    countryStatus: ""
  }));

  const byCode = new Map();
  const statusByGroupKey = new Map();
  const locationLabelByKey = new Map();
  const allLocationKeys = new Set();
  const mappedLocationKeys = new Set();
  const unmappedByLocationKey = new Map();
  let mappedRows = 0;
  tableRows.forEach((row) => {
    const locationRaw = String(row.country || "").trim();
    const locationLabel = locationRaw && locationRaw !== "-" ? locationRaw : "Unknown / Empty";
    const locationKey = normalizeCountryText(locationLabel) || "unknown";
    const fallbackGroupKey = `loc:${locationKey}`;
    locationLabelByKey.set(locationKey, locationLabel);
    allLocationKeys.add(locationKey);

    const iso3 = resolveMarketCountryIso3(
      {
        country: row.country,
        location: row.country
      },
      countryLookup
    );

    row.countryIso3 = iso3 || "";
    row.countryGroupKey = iso3 ? `iso:${iso3}` : fallbackGroupKey;
    if (!statusByGroupKey.has(row.countryGroupKey)) {
      statusByGroupKey.set(row.countryGroupKey, { hasGreen: false, hasYellow: false });
    }
    const rowGroupStatus = statusByGroupKey.get(row.countryGroupKey);
    if (row.status === "green") {
      rowGroupStatus.hasGreen = true;
    } else {
      rowGroupStatus.hasYellow = true;
    }

    if (!iso3) {
      unmappedByLocationKey.set(locationKey, (unmappedByLocationKey.get(locationKey) || 0) + 1);
      return;
    }

    mappedRows += 1;
    mappedLocationKeys.add(locationKey);

    if (!byCode.has(iso3)) {
      byCode.set(iso3, {
        hasGreen: false,
        hasYellow: false,
        companyCount: 0,
        totalTrades: 0
      });
    }

    const bucket = byCode.get(iso3);
    if (row.status === "green") {
      bucket.hasGreen = true;
    } else {
      bucket.hasYellow = true;
    }
    bucket.companyCount += 1;
    bucket.totalTrades += Number(row.trades || 0);
  });

  tableRows.forEach((row) => {
    row.countryStatus = summarizeMarketStatusFlags(statusByGroupKey.get(row.countryGroupKey));
  });

  const unmappedLocations = [...unmappedByLocationKey.entries()]
    .map(([key, count]) => ({
      location: locationLabelByKey.get(key) || key,
      count: Number(count || 0)
    }))
    .sort((left, right) => {
      const countDiff = Number(right.count || 0) - Number(left.count || 0);
      if (countDiff !== 0) return countDiff;
      return String(left.location || "").localeCompare(String(right.location || ""));
    });

  return {
    byCode,
    tableRows,
    coverage: {
      totalRows: tableRows.length,
      mappedRows,
      totalLocationGroups: allLocationKeys.size,
      mappedLocationGroups: mappedLocationKeys.size,
      unmappedLocations
    }
  };
}

async function renderMarketMap(metric) {
  const geojson = await loadWorldCountriesGeoJson();
  const features = Array.isArray(geojson?.features) ? geojson.features : [];

  if (marketCountryMarkerLayer) {
    marketCountryMarkerLayer.remove();
    marketCountryMarkerLayer = null;
  }

  if (marketGeoLayer) {
    marketGeoLayer.remove();
    marketGeoLayer = null;
  }

  function baseStyle(feature) {
    const summary = getMarketCountrySummary(feature, metric);
    const hasCustomerData = Boolean(summary);
    return {
      fillColor: hasCustomerData ? getMarketCountryFillColor(summary) : "rgba(0, 0, 0, 0)",
      weight: 1.1,
      opacity: 1,
      color: "rgba(255, 223, 159, 0.78)",
      fillOpacity: hasCustomerData ? 0.85 : 0
    };
  }

  function highlightFeature(event) {
    const layer = event.target;
    layer.setStyle({
      weight: 2.1,
      color: "#ffe3b2"
    });
    layer.bringToFront();
    layer.openTooltip();
  }

  function resetHighlight(event) {
    if (marketGeoLayer) {
      marketGeoLayer.resetStyle(event.target);
    }
    event.target.closeTooltip();
  }

  function onFeatureClick(event) {
    MapsToCountry(mapCountryCode(event.target.feature));
  }

  function bindInteractions(feature, layer) {
    const summary = getMarketCountrySummary(feature, metric);
    layer.bindTooltip(marketTooltipHtml(mapCountryName(feature), summary), {
      sticky: true,
      className: "dark-tooltip",
      direction: "auto"
    });

    layer.on({
      mouseover: highlightFeature,
      mouseout: resetHighlight,
      click: onFeatureClick
    });
  }

  marketGeoLayer = window.L.geoJSON(geojson, {
    style: baseStyle,
    onEachFeature: bindInteractions
  }).addTo(marketMapInstance);

  // Country markers keep tiny countries (for example Singapore) clearly visible at locked zoom.
  const markerLayers = [];
  marketGeoLayer.eachLayer((layer) => {
    const feature = layer?.feature;
    const summary = getMarketCountrySummary(feature, metric);
    if (!summary) return;

    const center = getMarketLayerCenter(layer);
    if (!center) return;

    const countryCode = mapCountryCode(feature);
    const countryName = mapCountryName(feature);
    const marker = window.L.circleMarker(center, {
      radius: 5,
      weight: 1.35,
      color: "rgba(255, 243, 214, 0.96)",
      opacity: 1,
      fillColor: getMarketCountryFillColor(summary),
      fillOpacity: 0.96
    });

    marker.bindTooltip(marketTooltipHtml(countryName, summary), {
      sticky: true,
      className: "dark-tooltip",
      direction: "top"
    });
    marker.on({
      mouseover: () => marker.openTooltip(),
      mouseout: () => marker.closeTooltip(),
      click: () => MapsToCountry(countryCode)
    });
    markerLayers.push(marker);
  });

  if (markerLayers.length) {
    marketCountryMarkerLayer = window.L.layerGroup(markerLayers).addTo(marketMapInstance);
  }

  // Fit map to countries that appear in the Market table and then lock view.
  marketMapInstance.setMinZoom(1);
  marketMapInstance.setMaxZoom(10);

  const activeBounds = window.L.latLngBounds();
  let hasActiveCountries = false;
  marketGeoLayer.eachLayer((layer) => {
    const summary = getMarketCountrySummary(layer.feature, metric);
    if (!summary) return;
    if (typeof layer.getBounds === "function") {
      activeBounds.extend(layer.getBounds());
      hasActiveCountries = true;
    }
  });

  const targetBounds = hasActiveCountries && activeBounds.isValid() ? activeBounds : marketGeoLayer.getBounds();
  marketMapInstance.fitBounds(targetBounds, {
    padding: hasActiveCountries ? [10, 10] : [30, 30],
    maxZoom: hasActiveCountries ? 8 : 2,
    animate: false
  });

  const fixedZoom = marketMapInstance.getZoom();
  marketMapInstance.setMinZoom(fixedZoom);
  marketMapInstance.setMaxZoom(fixedZoom);

  const activeCountries = metric.byCode.size;
  const mappedLocationGroups = Number(metric?.coverage?.mappedLocationGroups || 0);
  const totalLocationGroups = Number(metric?.coverage?.totalLocationGroups || 0);
  if (totalLocationGroups > 0) {
    setMarketMapReadyStatus(
      `Ready (${activeCountries} country/countries with data, ${mappedLocationGroups}/${totalLocationGroups} locations mapped)`
    );
  } else {
    setMarketMapReadyStatus(`Ready (${activeCountries} country/countries with data)`);
  }
}

async function runMarketMapQuery() {
  await ensureMarketProductOptionsLoaded();
  renderMarketProductSelector();
  applyMarketProductLockState();
  if (isMarketSelectionLocked()) {
    return;
  }

  hideError(elements.marketMapError);
  renderMarketMapLegend();
  setPanelStatus(elements.marketMapStatus, "Loading map...", "neutral");
  setMarketMapLoading(true);
  setMarketCoverageLoading();
  renderSkeletonRows(elements.marketTableBody, 6, MARKET_TABLE_PAGE_SIZE);
  if (elements.marketPaginationInfo) {
    elements.marketPaginationInfo.textContent = "Loading...";
  }
  if (elements.marketPrevBtn) {
    elements.marketPrevBtn.disabled = true;
  }
  if (elements.marketNextBtn) {
    elements.marketNextBtn.disabled = true;
  }

  try {
    if (!ensureMarketMap()) {
      throw new Error("Leaflet is not available.");
    }

    const metric = await loadMarketMetric();
    setMarketTableRows(metric.tableRows);
    renderMarketTable();
    await renderMarketMap(metric);
    renderMarketCoverage(metric);
  } catch (error) {
    renderInfoRow(elements.marketTableBody, 6, `Query failed: ${error.message || "Unknown error"}`);
    renderMarketPagination(0);
    setPanelStatus(elements.marketMapStatus, "Query failed", "error");
    showError(elements.marketMapError, error.message || "Unknown error");
    clearMarketCoverage();
  } finally {
    setMarketMapLoading(false);
  }
}

function buildAiInvoicePreviewRows(rows, limit = 24) {
  return rows.slice(0, limit).map((row) => ({
    invoice_date: row.invoice_date || null,
    invoice: row.invoice || null,
    customer_name: row.customer_name || null,
    contract: row.contract || null,
    tons: Number(row.tons || 0),
    usd: Number(row.usd || 0),
    thb: Number(row.thb || 0),
    status_type: row.status_type || null
  }));
}

function buildAiFinanceCustomerAggregation(rows) {
  const byCustomer = new Map();
  rows.forEach((row) => {
    const name = String(row.customer_name || "").trim();
    if (!name) return;
    if (!byCustomer.has(name)) {
      byCustomer.set(name, {
        customer: name,
        invoices: 0,
        tons: 0,
        usd: 0,
        thb: 0,
        contracts: new Set()
      });
    }
    const bucket = byCustomer.get(name);
    bucket.invoices += 1;
    bucket.tons += Number(row.tons || 0);
    bucket.usd += Number(row.usd || 0);
    bucket.thb += Number(row.thb || 0);
    const contract = String(row.contract || "").trim();
    if (contract) {
      bucket.contracts.add(contract);
    }
  });

  return Array.from(byCustomer.values()).map((row) => ({
    customer: row.customer,
    invoices: row.invoices,
    contract_count: row.contracts.size,
    tons: Number(row.tons.toFixed(2)),
    usd: Number(row.usd.toFixed(2)),
    thb: Number(row.thb.toFixed(2)),
    avg_usd_per_invoice: row.invoices > 0 ? Number((row.usd / row.invoices).toFixed(2)) : 0
  }));
}

function buildAiFinanceTopCustomers(rows, limit = 10, sortBy = "usd") {
  const normalizedSort = sortBy === "tons" ? "tons" : "usd";
  return buildAiFinanceCustomerAggregation(rows)
    .sort((left, right) => Number(right[normalizedSort] || 0) - Number(left[normalizedSort] || 0))
    .slice(0, limit)
    .map((row, index) => ({
      rank: index + 1,
      customer: row.customer,
      invoices: row.invoices,
      contract_count: row.contract_count,
      tons: row.tons,
      usd: row.usd,
      thb: row.thb,
      avg_usd_per_invoice: row.avg_usd_per_invoice
    }));
}

function buildAiFinanceMonthlyPerformance(rows, months = 18) {
  const monthly = new Map();

  rows.forEach((row) => {
    const key = monthKey(row.invoice_date);
    if (!key) return;

    if (!monthly.has(key)) {
      monthly.set(key, { invoices: 0, tons: 0, usd: 0, thb: 0 });
    }

    const bucket = monthly.get(key);
    bucket.invoices += 1;
    bucket.tons += Number(row.tons || 0);
    bucket.usd += Number(row.usd || 0);
    bucket.thb += Number(row.thb || 0);
  });

  const allMonths = Array.from(monthly.keys()).sort((left, right) => left.localeCompare(right));
  const limit = Number(months) || 18;
  const recentMonths = allMonths.slice(-limit);

  return recentMonths.map((month) => {
    const bucket = monthly.get(month) || { invoices: 0, tons: 0, usd: 0, thb: 0 };
    return {
      month,
      invoices: bucket.invoices,
      tons: Number(bucket.tons.toFixed(2)),
      usd: Number(bucket.usd.toFixed(2)),
      thb: Number(bucket.thb.toFixed(2))
    };
  });
}

async function loadAiOperationRows() {
  const [contractsRes, linesRes, deliveriesRes, stockRes] = await Promise.all([
    supabaseClient
      .from("operation_contracts")
      .select("contract_id, customer")
      .limit(5000),
    supabaseClient
      .from("operation_lines")
      .select("contract_id, job, ton, status, date_to")
      .limit(5000),
    supabaseClient
      .from("operation_deliveries")
      .select("contract_id, job, quantity, delivery_date")
      .limit(5000),
    supabaseClient
      .from("operation_stock")
      .select("factory, type, qty")
      .limit(5000)
  ]);

  if (contractsRes.error) throw contractsRes.error;
  if (linesRes.error) throw linesRes.error;
  if (deliveriesRes.error) throw deliveriesRes.error;
  if (stockRes.error) throw stockRes.error;

  return {
    contracts: contractsRes.data || [],
    lines: linesRes.data || [],
    deliveries: deliveriesRes.data || [],
    stock: stockRes.data || []
  };
}

function buildAiOperationMonthlyPerformance(deliveries, months = 18) {
  const monthly = new Map();

  deliveries.forEach((row) => {
    const key = monthKey(row.delivery_date);
    if (!key) return;
    if (!monthly.has(key)) {
      monthly.set(key, { delivery_count: 0, delivered_tons: 0 });
    }
    const bucket = monthly.get(key);
    bucket.delivery_count += 1;
    bucket.delivered_tons += Number(row.quantity || 0);
  });

  const allMonths = Array.from(monthly.keys()).sort((left, right) => left.localeCompare(right));
  const limit = Number(months) || 18;
  const recentMonths = allMonths.slice(-limit);

  return recentMonths.map((month) => {
    const bucket = monthly.get(month) || { delivery_count: 0, delivered_tons: 0 };
    return {
      month,
      delivery_count: bucket.delivery_count,
      delivered_tons: Number(bucket.delivered_tons.toFixed(2))
    };
  });
}

function buildAiOperationTopCustomersByContractTons(payload, limit = 10) {
  const contracts = payload?.contracts || [];
  const lines = payload?.lines || [];
  const deliveries = payload?.deliveries || [];

  const contractToCustomer = new Map();
  contracts.forEach((row) => {
    const contractId = String(row.contract_id || "").trim();
    if (!contractId) return;
    const customer = String(row.customer || "").trim() || "Unknown";
    contractToCustomer.set(contractId, customer);
  });

  const plannedByContract = new Map();
  lines.forEach((row) => {
    const contractId = String(row.contract_id || "").trim();
    if (!contractId) return;
    plannedByContract.set(contractId, Number(plannedByContract.get(contractId) || 0) + Number(row.ton || 0));
  });

  const deliveredByContract = new Map();
  deliveries.forEach((row) => {
    const contractId = String(row.contract_id || "").trim();
    if (!contractId) return;
    deliveredByContract.set(contractId, Number(deliveredByContract.get(contractId) || 0) + Number(row.quantity || 0));
  });

  const allContractIds = new Set([
    ...contractToCustomer.keys(),
    ...plannedByContract.keys(),
    ...deliveredByContract.keys()
  ]);

  const byCustomer = new Map();
  const ensureCustomer = (customer) => {
    if (!byCustomer.has(customer)) {
      byCustomer.set(customer, {
        customer,
        contracts: new Set(),
        planned_tons: 0,
        delivered_tons: 0
      });
    }
    return byCustomer.get(customer);
  };

  allContractIds.forEach((contractId) => {
    const customer = contractToCustomer.get(contractId) || "Unknown";
    const bucket = ensureCustomer(customer);
    bucket.contracts.add(contractId);
    bucket.planned_tons += Number(plannedByContract.get(contractId) || 0);
    bucket.delivered_tons += Number(deliveredByContract.get(contractId) || 0);
  });

  return Array.from(byCustomer.values())
    .map((row) => {
      const planned = Number(row.planned_tons || 0);
      const delivered = Number(row.delivered_tons || 0);
      return {
        customer: row.customer,
        contract_count: row.contracts.size,
        planned_tons: Number(planned.toFixed(2)),
        delivered_tons: Number(delivered.toFixed(2)),
        remaining_tons: Number((planned - delivered).toFixed(2)),
        fulfillment_percent: planned > 0 ? Number(((delivered / planned) * 100).toFixed(2)) : 0
      };
    })
    .sort((left, right) => right.planned_tons - left.planned_tons)
    .slice(0, limit)
    .map((row, index) => ({
      rank: index + 1,
      ...row
    }));
}

function buildAiOperationContext(payload) {
  const contracts = payload?.contracts || [];
  const lines = payload?.lines || [];
  const deliveries = payload?.deliveries || [];
  const stock = payload?.stock || [];
  const today = getTodayDateString();

  const deliveredByContract = new Map();
  const deliveredByContractJob = new Map();
  const buildJobKey = (contractId, job) => {
    const contractKey = String(contractId || "").trim();
    const jobKey = String(job || "").trim().toLowerCase();
    return `${contractKey}::${jobKey}`;
  };

  deliveries.forEach((row) => {
    const contractKey = String(row.contract_id || "").trim();
    const quantity = Number(row.quantity || 0);
    if (contractKey) {
      deliveredByContract.set(contractKey, Number(deliveredByContract.get(contractKey) || 0) + quantity);
    }
    const job = String(row.job || "").trim();
    if (contractKey && job) {
      const key = buildJobKey(contractKey, job);
      deliveredByContractJob.set(key, Number(deliveredByContractJob.get(key) || 0) + quantity);
    }
  });

  let plannedTons = 0;
  let deliveredTonsByLine = 0;
  let completedLines = 0;
  let overdueLines = 0;
  let pendingLines = 0;

  lines.forEach((line) => {
    const contractKey = String(line.contract_id || "").trim();
    const plannedTon = Number(line.ton || 0);
    plannedTons += plannedTon;

    const hasJob = String(line.job || "").trim().length > 0;
    const deliveredByJob = hasJob ? Number(deliveredByContractJob.get(buildJobKey(contractKey, line.job)) || 0) : null;
    const deliveredFallback = Number(deliveredByContract.get(contractKey) || 0);
    const delivered = deliveredByJob !== null ? deliveredByJob : deliveredFallback;
    deliveredTonsByLine += delivered;

    const progress = plannedTon > 0 ? (delivered / plannedTon) * 100 : 0;
    if (progress >= 100) {
      completedLines += 1;
    } else if (line.date_to && String(line.date_to) < today) {
      overdueLines += 1;
    } else {
      pendingLines += 1;
    }
  });

  const stockByType = new Map();
  stock.forEach((row) => {
    const type = String(row.type || "unknown").trim() || "unknown";
    stockByType.set(type, Number(stockByType.get(type) || 0) + Number(row.qty || 0));
  });

  const monthlyDeliveryPerformance = buildAiOperationMonthlyPerformance(deliveries, 18);

  return {
    summary: {
      contracts_total: contracts.length,
      lines_total: lines.length,
      deliveries_total: deliveries.length,
      stock_rows_total: stock.length,
      planned_tons_total: Number(plannedTons.toFixed(2)),
      delivered_tons_estimate: Number(deliveredTonsByLine.toFixed(2)),
      completed_lines: completedLines,
      overdue_lines: overdueLines,
      pending_lines: pendingLines
    },
    monthly_deliveries: monthlyDeliveryPerformance.map((row) => ({
      month: row.month,
      quantity: row.delivered_tons
    })),
    monthly_delivery_performance: monthlyDeliveryPerformance,
    stock_by_type: Array.from(stockByType.entries()).map(([type, qty]) => ({
      type,
      qty: Number(Number(qty || 0).toFixed(2))
    }))
  };
}

async function loadAiMarketRows() {
  const { data, error } = await supabaseClient
    .from("companies")
    .select("company_id, customer, location, status, trades, supplier_number, value_tag, latest_purchase_time")
    .order("created_at", { ascending: false })
    .limit(5000);

  if (error) throw error;
  return data || [];
}

async function loadAiProductRows() {
  const { data, error } = await supabaseClient
    .from("sugar_products")
    .select("id, product_name_en, product_name_th, brand, ref_no, spec_date, appearance, method_of_production, color_icumsa, polarization_z, net_wt, country_of_origin")
    .order("spec_date", { ascending: false })
    .order("id", { ascending: true })
    .limit(5000);

  if (error) throw error;
  return data || [];
}

function buildAiMarketContext(companies) {
  const statusBreakdown = new Map();
  const countryBreakdown = new Map();
  let totalTrades = 0;

  companies.forEach((row) => {
    const status = normalizeMarketStatus(row.status);
    statusBreakdown.set(status, Number(statusBreakdown.get(status) || 0) + 1);

    const country = String(row.location || "").trim();
    if (country) {
      countryBreakdown.set(country, Number(countryBreakdown.get(country) || 0) + 1);
    }

    totalTrades += Number(row.trades || 0);
  });

  const topCountries = Array.from(countryBreakdown.entries())
    .map(([country, company_count]) => ({ country, company_count }))
    .sort((left, right) => right.company_count - left.company_count)
    .slice(0, 10);

  const sampleCompanies = [...companies]
    .sort((left, right) => Number(right.trades || 0) - Number(left.trades || 0))
    .slice(0, 12)
    .map((row) => ({
      customer: row.customer || "-",
      location: row.location || "-",
      status: normalizeMarketStatus(row.status),
      trades: Number(row.trades || 0),
      value_tag: row.value_tag || null
    }));

  return {
    summary: {
      companies_total: companies.length,
      total_trades: Number(totalTrades.toFixed(2)),
      green_count: Number(statusBreakdown.get("green") || 0),
      yellow_count: Number(statusBreakdown.get("yellow") || 0)
    },
    top_countries: topCountries,
    sample_companies: sampleCompanies
  };
}

function buildAiProductContext(rows) {
  const brandBreakdown = new Map();
  let withRefCount = 0;
  let withSpecDateCount = 0;

  rows.forEach((row) => {
    const brand = String(row.brand || "Unknown").trim() || "Unknown";
    brandBreakdown.set(brand, Number(brandBreakdown.get(brand) || 0) + 1);
    if (String(row.ref_no || "").trim()) withRefCount += 1;
    if (String(row.spec_date || "").trim()) withSpecDateCount += 1;
  });

  const topBrands = Array.from(brandBreakdown.entries())
    .map(([brand, product_count]) => ({ brand, product_count }))
    .sort((left, right) => right.product_count - left.product_count)
    .slice(0, 10);

  const sampleProducts = [...rows]
    .sort((left, right) => {
      const leftDate = String(left.spec_date || "");
      const rightDate = String(right.spec_date || "");
      if (leftDate !== rightDate) return rightDate.localeCompare(leftDate);
      return Number(right.id || 0) - Number(left.id || 0);
    })
    .slice(0, 20)
    .map((row) => ({
      id: row.id,
      product_name: buildSugarProductName(row),
      brand: row.brand || null,
      spec_ref: row.ref_no || null,
      spec_date: row.spec_date || null,
      country_of_origin: row.country_of_origin || null
    }));

  return {
    summary: {
      products_total: rows.length,
      brands_total: brandBreakdown.size,
      with_spec_ref_total: withRefCount,
      with_spec_date_total: withSpecDateCount
    },
    top_brands: topBrands,
    sample_products: sampleProducts
  };
}

const AI_DEFAULT_CONVERSATION_TITLE = "New chat";
const AI_DEFAULT_UNIVERSE = "internal";

async function buildAiAgentContext() {
  const [financeRows, operationRows, marketRows, allProductRows] = await Promise.all([
    state.financeChartRows.length ? Promise.resolve(state.financeChartRows) : loadFinanceRows(),
    loadAiOperationRows(),
    loadAiMarketRows(),
    loadAiProductRows()
  ]);
  let webCatalogRows = [];
  try {
    webCatalogRows = await loadProductCatalogRows();
  } catch (_error) {
    webCatalogRows = [];
  }
  const allowedProductIds = Array.from(
    new Set(
      webCatalogRows
        .map((row) => String(row.product_id || "").trim())
        .filter(Boolean)
    )
  );
  const allowedIdSet = new Set(allowedProductIds);
  const productRows = allProductRows.filter((row) => allowedIdSet.has(String(row.id || "").trim()));
  const financeMetrics = buildFinanceMetrics(financeRows);
  const monthlySeries = buildFinanceMonthlySeries(financeRows, 12);
  const financeMonthlyPerformance = buildAiFinanceMonthlyPerformance(financeRows, 18);

  return {
    context_scope: {
      generated_at: new Date().toISOString(),
      row_counts: {
        finance_invoices: financeRows.length,
        operation_contracts: (operationRows?.contracts || []).length,
        operation_lines: (operationRows?.lines || []).length,
        operation_deliveries: (operationRows?.deliveries || []).length,
        operation_stock: (operationRows?.stock || []).length,
        market_companies: marketRows.length,
        sugar_products: productRows.length,
        web_product_catalog_rows: webCatalogRows.length
      }
    },
    product_scope: {
      source: "web_product_catalog",
      allowed_product_ids: allowedProductIds,
      allowed_product_count: allowedProductIds.length
    },
    universe_policy: {
      market: "external",
      internal: ["operation", "finance", "product"],
      cross_universe_rule: "Do not merge external market and internal operation/finance/product entities unless explicit verified mapping exists."
    },
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
    },
    finance: {
      summary: {
        total_invoices: financeMetrics.totalInvoices,
        total_tons: Number(financeMetrics.tonsTotal.toFixed(2)),
        total_usd: Number(financeMetrics.usdTotal.toFixed(2)),
        total_thb: Number(financeMetrics.thbTotal.toFixed(2))
      },
      monthly_usd: monthlySeries.monthKeys.map((monthKeyValue, index) => ({
        month: monthKeyValue,
        usd: Number(monthlySeries.usdTotals[index] || 0)
      })),
      monthly_performance: financeMonthlyPerformance,
      recent_invoices: buildAiInvoicePreviewRows(financeRows, 24)
    },
    operation: buildAiOperationContext(operationRows),
    market: buildAiMarketContext(marketRows),
    product: buildAiProductContext(productRows)
  };
}

function isAiStorageMissingError(error) {
  const code = String(error?.code || "");
  const message = String(error?.message || "").toLowerCase();
  return (
    code === "PGRST205" ||
    message.includes("could not find the table") ||
    message.includes("does not exist")
  );
}

function makeConversationTitleFromPrompt(prompt, maxLength = 46) {
  const normalized = String(prompt || "").replace(/\s+/g, " ").trim();
  if (!normalized) return AI_DEFAULT_CONVERSATION_TITLE;
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 3)}...`;
}

function formatAiTimestamp(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function createAiMessage(role, text, metaText = "", isPending = false) {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role,
    text: String(text || ""),
    metaText: String(metaText || ""),
    isPending: Boolean(isPending)
  };
}

function normalizeAiAssistantText(value) {
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

function formatAiTextForHtml(value, isAssistant = false) {
  const raw = isAssistant ? normalizeAiAssistantText(value) : String(value || "");
  return escapeHtml(raw).replace(/\n/g, "<br>");
}

function mapAiDbMessageToUi(row) {
  const meta = row?.meta_json && typeof row.meta_json === "object" ? row.meta_json : {};
  let metaText = "";
  if (meta && typeof meta.meta_text === "string") {
    metaText = meta.meta_text;
  } else if (meta?.model && meta?.generated_at) {
    metaText = `Model ${meta.model} at ${new Date(meta.generated_at).toLocaleString()}`;
  } else if (meta?.model) {
    metaText = `Model ${meta.model}`;
  }

  return {
    id: String(row?.id || ""),
    role: row?.role === "assistant" ? "assistant" : "user",
    text: row?.role === "assistant" ? normalizeAiAssistantText(row?.content || "") : String(row?.content || ""),
    metaText,
    isPending: false
  };
}

function renderAiConversationTitle() {
  if (!elements.aiConversationTitle) return;
  const activeConversation = state.aiConversations.find((item) => item.id === state.aiActiveConversationId);
  elements.aiConversationTitle.textContent = activeConversation?.title || AI_DEFAULT_CONVERSATION_TITLE;
}

function renderAiConversationList() {
  if (!elements.aiConversationList) return;

  if (!state.aiConversations.length) {
    elements.aiConversationList.innerHTML = `
      <p class="ai-conversation-meta">No conversations yet.</p>
    `;
    renderAiConversationTitle();
    return;
  }

  elements.aiConversationList.innerHTML = state.aiConversations
    .map((conversation) => {
      const activeClass = conversation.id === state.aiActiveConversationId ? "active" : "";
      const timestamp = formatAiTimestamp(conversation.last_message_at || conversation.updated_at || conversation.created_at);
      return `
        <button
          type="button"
          class="ai-conversation-item ${activeClass}"
          data-ai-conversation-id="${escapeHtml(conversation.id)}"
        >
          <p class="ai-conversation-title">${escapeHtml(conversation.title || AI_DEFAULT_CONVERSATION_TITLE)}</p>
          <p class="ai-conversation-meta">${escapeHtml(timestamp || "No activity")}</p>
        </button>
      `;
    })
    .join("");

  renderAiConversationTitle();
}

function setAiSendLoading(isLoading) {
  if (!elements.aiChatInput) return;
  if (elements.aiSendBtn) {
    elements.aiSendBtn.disabled = isLoading;
    elements.aiSendBtn.textContent = isLoading ? "Sending..." : "Send";
  }
  if (elements.aiClearBtn) {
    elements.aiClearBtn.disabled = isLoading;
  }
  elements.aiChatInput.disabled = isLoading;
}

function autoResizeAiInput() {
  if (!elements.aiChatInput) return;
  const minHeight = 52;
  elements.aiChatInput.style.height = "auto";
  const nextHeight = Math.max(elements.aiChatInput.scrollHeight, minHeight);
  elements.aiChatInput.style.height = `${nextHeight}px`;
  elements.aiChatInput.classList.toggle("ai-input-multiline", nextHeight > minHeight + 2);
  elements.aiChatInput.style.overflowY = "hidden";
}

function syncAiInitialState() {
  if (!elements.aiAgentPanel || !elements.aiChatInput) return;
  const hasMessages = Array.isArray(state.aiMessages) && state.aiMessages.length > 0;
  const shouldCenter = !hasMessages && !state.aiHasStartedTyping;
  elements.aiAgentPanel.classList.toggle("ai-initial", shouldCenter);
}

function renderAiModelPill() {
  if (!elements.aiModelPill) return;
  elements.aiModelPill.textContent = `Model: ${state.aiModel}`;
}

function scrollAiToBottom(behavior = "auto") {
  if (!elements.aiChatBody) return;
  const safeBehavior = behavior === "smooth" ? "smooth" : "auto";
  window.requestAnimationFrame(() => {
    elements.aiChatBody.scrollTo({
      top: elements.aiChatBody.scrollHeight,
      behavior: safeBehavior
    });
  });
}

function renderAiMessages() {
  if (!elements.aiChatBody) return;

  if (!state.aiMessages.length) {
    elements.aiChatBody.innerHTML = "";
    syncAiInitialState();
    return;
  }

  elements.aiChatBody.innerHTML = state.aiMessages
    .map((message) => {
      const roleClass = message.role === "user" ? "ai-msg-user" : "ai-msg-assistant";
      const pendingClass = message.isPending ? "ai-msg-pending" : "";
      const roleLabel = message.role === "user" ? "You" : "AI";
      const metaHtml = message.metaText ? `<p class="ai-msg-meta">${escapeHtml(message.metaText)}</p>` : "";
      const messageHtml = formatAiTextForHtml(message.text, message.role === "assistant");
      return `
        <div class="ai-msg ${roleClass} ${pendingClass}">
          <p class="ai-msg-role">${roleLabel}</p>
          <div class="ai-msg-bubble">${messageHtml}</div>
          ${metaHtml}
        </div>
      `;
    })
    .join("");

  scrollAiToBottom();
  syncAiInitialState();
}

async function loadAiConversations() {
  const { data, error } = await supabaseClient
    .from("ai_conversations")
    .select("id, title, universe, created_at, updated_at, last_message_at")
    .order("last_message_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

async function loadAiMessages(conversationId) {
  const { data, error } = await supabaseClient
    .from("ai_messages")
    .select("id, role, content, meta_json, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data || [];
}

async function insertAiMessage(conversationId, role, content, metaJson = {}) {
  const payload = {
    conversation_id: conversationId,
    role,
    content,
    meta_json: metaJson
  };

  const { data, error } = await supabaseClient
    .from("ai_messages")
    .insert(payload)
    .select("id, role, content, meta_json, created_at")
    .single();

  if (error) throw error;
  return data;
}

async function createAiConversation(seedPrompt = "") {
  const initialTitle = seedPrompt
    ? makeConversationTitleFromPrompt(seedPrompt)
    : AI_DEFAULT_CONVERSATION_TITLE;

  const { data, error } = await supabaseClient
    .from("ai_conversations")
    .insert({
      title: initialTitle,
      universe: AI_DEFAULT_UNIVERSE
    })
    .select("id, title, universe, created_at, updated_at, last_message_at")
    .single();

  if (error) throw error;

  return data;
}

async function setActiveAiConversation(conversationId) {
  state.aiActiveConversationId = conversationId;
  const rows = await loadAiMessages(conversationId);
  state.aiMessages = rows.map(mapAiDbMessageToUi);
  renderAiConversationList();
  renderAiMessages();
}

async function refreshAiConversationState(preferredConversationId = null) {
  const conversations = await loadAiConversations();
  state.aiConversations = conversations;

  if (!state.aiConversations.length) {
    const created = await createAiConversation();
    state.aiConversations = [created];
  }

  const resolvedId =
    preferredConversationId && state.aiConversations.some((item) => item.id === preferredConversationId)
      ? preferredConversationId
      : state.aiActiveConversationId && state.aiConversations.some((item) => item.id === state.aiActiveConversationId)
        ? state.aiActiveConversationId
        : state.aiConversations[0]?.id;

  if (!resolvedId) {
    state.aiMessages = [];
    renderAiConversationList();
    renderAiMessages();
    return;
  }

  await setActiveAiConversation(resolvedId);
}

async function clearAiConversation() {
  const { error } = await supabaseClient
    .from("ai_conversations")
    .delete()
    .not("id", "is", null);

  if (error) throw error;

  state.aiConversations = [];
  state.aiActiveConversationId = null;
  state.aiMessages = [];
  state.aiBootstrapped = false;
  state.aiHasStartedTyping = false;
  renderAiMessages();
  autoResizeAiInput();
}

async function ensureAiConversation() {
  if (state.aiActiveConversationId) return state.aiActiveConversationId;
  await refreshAiConversationState(state.aiActiveConversationId);
  return state.aiActiveConversationId;
}

async function persistAiMessageSafely(conversationId, role, content, metaJson = {}) {
  if (!conversationId) return null;
  try {
    return await insertAiMessage(conversationId, role, content, metaJson);
  } catch (error) {
    console.warn("Unable to persist AI message:", error);
    return null;
  }
}

async function renameAiConversation() {
  if (!state.aiActiveConversationId) return;
  const current = state.aiConversations.find((item) => item.id === state.aiActiveConversationId);
  const nextTitle = window.prompt("Conversation title", current?.title || AI_DEFAULT_CONVERSATION_TITLE);
  if (nextTitle === null) return;

  const trimmed = String(nextTitle).trim();
  if (!trimmed) return;

  const { error } = await supabaseClient
    .from("ai_conversations")
    .update({ title: trimmed })
    .eq("id", state.aiActiveConversationId);

  if (error) throw error;
  await refreshAiConversationState(state.aiActiveConversationId);
}

async function deleteAiConversation() {
  if (!state.aiActiveConversationId) return;
  const current = state.aiConversations.find((item) => item.id === state.aiActiveConversationId);
  const shouldDelete = window.confirm(`Delete conversation "${current?.title || AI_DEFAULT_CONVERSATION_TITLE}"?`);
  if (!shouldDelete) return;

  const deletedId = state.aiActiveConversationId;
  const { error } = await supabaseClient
    .from("ai_conversations")
    .delete()
    .eq("id", deletedId);

  if (error) throw error;

  state.aiActiveConversationId = null;
  const fallbackConversation = state.aiConversations.find((item) => item.id !== deletedId);
  await refreshAiConversationState(fallbackConversation?.id || null);
}

async function createNewAiConversation() {
  const created = await createAiConversation();
  await refreshAiConversationState(created.id);
  elements.aiChatInput?.focus();
}

async function bootstrapAiAgent() {
  if (state.aiBootstrapped) return;

  hideError(elements.aiAgentError);
  try {
    await refreshAiConversationState(state.aiActiveConversationId);
  } catch (error) {
    state.aiMessages = [];
    renderAiMessages();
    showError(elements.aiAgentError, error?.message || "Unable to load AI conversations.");
  }
  autoResizeAiInput();
  syncAiInitialState();
  state.aiBootstrapped = true;
}

function extractAiAgentAnswer(data) {
  if (typeof data === "string") return data;
  if (typeof data?.answer === "string") return data.answer;
  if (typeof data?.output_text === "string") return data.output_text;
  return JSON.stringify(data ?? {}, null, 2);
}

function buildAiConversationMessages(maxMessages = 14) {
  return state.aiMessages
    .filter((message) => !message.isPending && (message.role === "user" || message.role === "assistant"))
    .slice(-maxMessages)
    .map((message) => ({
      role: message.role,
      content: message.text
    }));
}

async function sendAiChatMessage() {
  if (!elements.aiChatInput) return;
  if (!state.aiBootstrapped) {
    await bootstrapAiAgent();
  }

  hideError(elements.aiAgentError);
  const prompt = String(elements.aiChatInput.value || "").trim();
  if (!prompt) return;

  try {
    setAiSendLoading(true);
    state.aiHasStartedTyping = true;
    elements.aiChatInput.value = "";
    autoResizeAiInput();
    const conversationId = await ensureAiConversation();
    state.aiMessages.push(createAiMessage("user", prompt));
    renderAiMessages();
    scrollAiToBottom("smooth");
    await persistAiMessageSafely(conversationId, "user", prompt, {});

    const pendingMessage = createAiMessage("assistant", "Thinking...", "", true);
    state.aiMessages.push(pendingMessage);
    renderAiMessages();
    scrollAiToBottom("smooth");

    const context = await buildAiAgentContext();
    const data = await callAiAgentWithAuth({
      model: state.aiModel,
      messages: buildAiConversationMessages(),
      context,
      strict_server_only: true,
      requested_at: new Date().toISOString()
    });

    const answerRaw = extractAiAgentAnswer(data) || "No answer returned.";
    const answer = normalizeAiAssistantText(answerRaw);
    const modelName = String(data?.model || state.aiModel);
    const generatedAtRaw = String(data?.generated_at || "");
    const citationRows = Array.isArray(data?.citations) ? data.citations : [];
    const rowCounts = data?.row_counts && typeof data.row_counts === "object" ? data.row_counts : {};
    const toolReport = data?.tool_report && typeof data.tool_report === "object" ? data.tool_report : null;
    const requestId = String(data?.request_id || "");
    const finishReason = String(data?.finish_reason || "");
    const providerError = String(data?.provider_error || "");
    const metaParts = [];
    if (modelName && generatedAtRaw) {
      metaParts.push(`Model ${modelName} at ${new Date(generatedAtRaw).toLocaleString()}`);
    } else if (modelName) {
      metaParts.push(`Model ${modelName}`);
    }
    const assistantMetaText = metaParts.join(" | ");

    state.aiMessages = state.aiMessages.filter((message) => !message.isPending);
    state.aiMessages.push(createAiMessage("assistant", answer, assistantMetaText));
    renderAiMessages();

    await persistAiMessageSafely(conversationId, "assistant", answer, {
      model: modelName,
      generated_at: generatedAtRaw || null,
      meta_text: assistantMetaText,
      request_id: requestId || null,
      finish_reason: finishReason || null,
      provider_error: providerError || null,
      row_counts: rowCounts,
      tool_report: toolReport,
      citations_count: citationRows.length
    });
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

    state.aiMessages = state.aiMessages.filter((message) => !message.isPending);
    state.aiMessages.push(createAiMessage("assistant", `Request failed: ${friendly}`));
    showError(elements.aiAgentError, friendly);
    renderAiMessages();
  } finally {
    setAiSendLoading(false);
    autoResizeAiInput();
    elements.aiChatInput?.focus();
  }
}

async function refreshCurrentView() {
  if (state.view === "dashboard") {
    await Promise.all([runDeliveryVolumeQuery(), runContractHealthQuery()]);
    return;
  }

  if (state.view === "overview") {
    await runOverviewQuery();
    return;
  }

  if (state.view === "stock") {
    await runStockQuery();
    return;
  }

  if (state.view === "finance") {
    await runFinanceQuery();
    return;
  }

  if (state.view === "product-catalog") {
    await runProductCatalogQuery();
    return;
  }

  if (state.view === "ai-agent") {
    await clearAiConversation();
    await bootstrapAiAgent();
    return;
  }

  await runMarketMapQuery();
}

async function refreshAll() {
  setRefreshState(true);
  if (state.view === "dashboard" || state.view === "finance" || state.view === "stock") {
    setMetricsLoading();
  }

  const metricsTask = state.view === "dashboard" ? updateOperationMetrics() : Promise.resolve();

  const [viewResult, metricsResult] = await Promise.allSettled([
    refreshCurrentView(),
    metricsTask
  ]);

  if (viewResult.status === "rejected") {
    const message = viewResult.reason?.message || "Failed to refresh current panel";
    if (state.view === "dashboard") {
      showError(elements.deliveriesError, message);
    } else if (state.view === "stock") {
      showError(elements.stockError, message);
    } else if (state.view === "finance") {
      showError(elements.financeError, message);
    } else if (state.view === "product-catalog") {
      showError(elements.productCatalogError, message);
    } else if (state.view === "ai-agent") {
      showError(elements.aiAgentError, message);
    } else {
      showError(elements.marketMapError, message);
      setPanelStatus(elements.marketMapStatus, "Query failed", "error");
    }
  }

  if (state.view === "dashboard" && metricsResult.status === "rejected") {
    setMetricsFallback("N/A");
    const message = metricsResult.reason?.message || "Failed to refresh metrics";
    showError(elements.deliveriesError, message);
  }

  updateLastSync();
  setRefreshState(false);
}

elements.menuItems.forEach((item) => {
  item.addEventListener("click", async (event) => {
    event.preventDefault();
    const nextView = item.dataset.viewTarget;
    if (!nextView || nextView === state.view) return;

    if (state.view === "ai-agent" && nextView !== "ai-agent") {
      try {
        await clearAiConversation();
      } catch (error) {
        console.warn("Unable to clear AI conversation on tab switch:", error);
      }
    }

    setActiveView(nextView);
    await refreshAll();
  });
});

if (elements.marketProductDropdown && elements.marketProductTrigger && elements.marketProductMenu) {
  renderMarketProductSelector();

  elements.marketProductTrigger.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleMarketProductDropdown();
  });

  elements.marketProductMenu.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const option = target.closest("button.market-map-product-option[data-product-key]");
    if (!option) return;
    const nextKey = String(option.getAttribute("data-product-key") || "").trim();
    closeMarketProductDropdown();
    await applyMarketProductSelection(nextKey);
  });
}

document.addEventListener("click", (event) => {
  if (!state.marketProductDropdownOpen) return;
  if (!elements.marketProductDropdown) return;
  const target = event.target;
  if (!(target instanceof Node)) return;
  if (elements.marketProductDropdown.contains(target)) return;
  closeMarketProductDropdown();
});

if (elements.marketTableBody) {
  elements.marketTableBody.addEventListener("change", (event) => {
    if (isMarketSelectionLocked()) return;
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (!target.classList.contains("market-check-input")) return;
    const id = String(target.dataset.marketId || "");
    setMarketRowChecked(id, target.checked);
  });

  elements.marketTableBody.addEventListener("click", (event) => {
    if (isMarketSelectionLocked()) return;
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.closest("input.market-check-input")) return;

    const row = target.closest("tr.market-table-row");
    if (!row) return;
    const companyId = String(row.getAttribute("data-company-id") || "");
    if (!companyId) return;

    window.location.href = appendEnvToPath(`company-detail.html?company_id=${encodeURIComponent(companyId)}`);
  });
}

if (elements.overdueOnlyBody) {
  elements.overdueOnlyBody.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const row = target.closest("tr.overdue-table-row");
    if (!row) return;
    const contractId = String(row.getAttribute("data-contract-id") || "");
    if (!contractId) return;

    window.location.href = appendEnvToPath(`delivery-detail.html?contract_id=${encodeURIComponent(contractId)}`);
  });
}

if (elements.overviewOverdueBody) {
  elements.overviewOverdueBody.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const row = target.closest("tr.overdue-table-row");
    if (!row) return;
    const contractId = String(row.getAttribute("data-contract-id") || "");
    if (!contractId) return;

    window.location.href = appendEnvToPath(`delivery-detail.html?contract_id=${encodeURIComponent(contractId)}`);
  });
}

if (elements.deliveryChartRange) {
  elements.deliveryChartRange.addEventListener("change", () => {
    state.deliveryChartMonths = Number(elements.deliveryChartRange.value) || 12;
    const series = buildDeliveryVolumeSeries(state.deliveryChartRows, state.deliveryChartMonths);
    renderDeliveryVolumeChart(series);
    setDeliveriesReadyStatus();
  });
}

if (elements.overviewTrendRange) {
  elements.overviewTrendRange.addEventListener("change", () => {
    state.overviewTrendMonths = Number(elements.overviewTrendRange.value) || 12;
    if (state.overviewData && state.view === "overview") {
      renderOverviewFromState();
    } else {
      syncUrlState();
    }
  });
}

if (elements.financeChartRange) {
  elements.financeChartRange.addEventListener("change", () => {
    state.financeChartMonths = Number(elements.financeChartRange.value) || 12;
    const series = buildFinanceMonthlySeries(state.financeChartRows, state.financeChartMonths);
    renderFinanceTrendChart(series);
    setFinanceReadyStatus();
  });
}

if (elements.financePrevBtn) {
  elements.financePrevBtn.addEventListener("click", () => {
    moveFinanceTablePage(-1);
  });
}

if (elements.financeNextBtn) {
  elements.financeNextBtn.addEventListener("click", () => {
    moveFinanceTablePage(1);
  });
}

if (elements.productCatalogSearch) {
  elements.productCatalogSearch.value = state.productCatalogSearch;
  elements.productCatalogSearch.addEventListener("input", () => {
    updateProductCatalogFilter(elements.productCatalogSearch.value);
  });
}

if (elements.productCatalogHeroFilter) {
  elements.productCatalogHeroFilter.value = state.productCatalogHeroFilter;
  elements.productCatalogHeroFilter.addEventListener("change", () => {
    updateProductCatalogHeroFilter(elements.productCatalogHeroFilter.value);
  });
}

if (elements.productCatalogGallery) {
  elements.productCatalogGallery.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const editButton = target.closest("button.product-edit-btn");
    if (editButton) {
      const productId = String(editButton.getAttribute("data-product-id") || "");
      if (!productId) return;
      openProductCatalogEditor(productId);
      return;
    }

    const heroButton = target.closest("button.product-hero-btn");
    if (heroButton) {
      const productId = String(heroButton.getAttribute("data-product-id") || "");
      const nextHeroRaw = String(heroButton.getAttribute("data-next-hero") || "");
      const nextHero = nextHeroRaw === "true";
      if (!productId) return;
      saveProductCatalogHero(productId, nextHero);
      return;
    }

    const card = target.closest("article.product-card[data-product-id]");
    if (!card) return;
    const productId = String(card.getAttribute("data-product-id") || "");
    if (!productId) return;
    openProductCatalogDetail(productId);
  });

  elements.productCatalogGallery.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.closest("button")) return;
    const card = target.closest("article.product-card[data-product-id]");
    if (!card) return;
    event.preventDefault();
    const productId = String(card.getAttribute("data-product-id") || "");
    if (!productId) return;
    openProductCatalogDetail(productId);
  });
}

if (elements.productCatalogAddBtn) {
  elements.productCatalogAddBtn.addEventListener("click", () => {
    openProductCatalogEditor();
  });
}

if (elements.productCatalogSaveBtn) {
  elements.productCatalogSaveBtn.addEventListener("click", () => {
    saveProductCatalogEditor();
  });
}

if (elements.productCatalogCancelBtn) {
  elements.productCatalogCancelBtn.addEventListener("click", () => {
    closeProductCatalogEditor();
  });
}

if (elements.productCatalogEditor) {
  elements.productCatalogEditor.addEventListener("click", (event) => {
    if (state.productCatalogSavingForm) return;
    if (event.target === elements.productCatalogEditor) {
      closeProductCatalogEditor();
    }
  });
}

if (elements.productCatalogDetailCloseBtn) {
  elements.productCatalogDetailCloseBtn.addEventListener("click", () => {
    closeProductCatalogDetail();
  });
}

if (elements.productCatalogDetailOverlay) {
  elements.productCatalogDetailOverlay.addEventListener("click", (event) => {
    if (event.target === elements.productCatalogDetailOverlay) {
      closeProductCatalogDetail();
    }
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (state.marketProductDropdownOpen) {
    closeMarketProductDropdown();
    return;
  }
  if (elements.productCatalogEditor && !elements.productCatalogEditor.classList.contains("hidden")) {
    if (state.productCatalogSavingForm) return;
    closeProductCatalogEditor();
    return;
  }
  if (elements.productCatalogDetailOverlay && !elements.productCatalogDetailOverlay.classList.contains("hidden")) {
    closeProductCatalogDetail();
  }
});

if (elements.productCatalogPrevBtn) {
  elements.productCatalogPrevBtn.addEventListener("click", () => {
    moveProductCatalogPage(-1);
  });
}

if (elements.productCatalogNextBtn) {
  elements.productCatalogNextBtn.addEventListener("click", () => {
    moveProductCatalogPage(1);
  });
}

if (elements.marketPrevBtn) {
  elements.marketPrevBtn.addEventListener("click", () => {
    moveMarketTablePage(-1);
  });
}

if (elements.marketNextBtn) {
  elements.marketNextBtn.addEventListener("click", () => {
    moveMarketTablePage(1);
  });
}

if (elements.aiSendBtn) {
  elements.aiSendBtn.addEventListener("click", () => {
    sendAiChatMessage();
  });
}

if (elements.aiChatInput) {
  autoResizeAiInput();
  elements.aiChatInput.addEventListener("input", () => {
    autoResizeAiInput();
    syncAiInitialState();
  });
  elements.aiChatInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendAiChatMessage();
    }
  });
}

if (elements.aiClearBtn) {
  elements.aiClearBtn.addEventListener("click", async () => {
    hideError(elements.aiAgentError);
    try {
      await clearAiConversation();
      elements.aiChatInput?.focus();
    } catch (error) {
      showError(elements.aiAgentError, error?.message || "Unable to clear conversation.");
    }
  });
}

if (elements.refreshButton) {
  elements.refreshButton.addEventListener("click", () => {
    if (state.view === "product-catalog" && !PRODUCT_CATALOG_READ_ONLY) {
      openProductCatalogEditor();
      return;
    }
    refreshAll();
  });
}

if (elements.logoutBtn) {
  elements.logoutBtn.addEventListener("click", async () => {
    if (elements.logoutBtn.disabled) return;
    elements.logoutBtn.disabled = true;
    elements.logoutBtn.textContent = "Logging out...";
    await handleLogout();
  });
}

async function bootstrapDashboard() {
  const session = await requireAuthenticatedSession();
  if (!session) return;

  document.body.classList.remove("auth-pending");

  try {
    await clearAiConversation();
  } catch (error) {
    console.warn("Unable to clear AI conversation on session bootstrap:", error);
  }

  applyUrlStateFromQuery();
  syncChartFilterButtons();
  renderAiModelPill();
  renderAiMessages();
  syncAiInitialState();

  setActiveView(state.view);
  refreshAll();
}

bootstrapDashboard();
