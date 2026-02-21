const SUPABASE_URL = "https://adybfyqyoyinmpsftrde.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_ho8IqSNFZgb6xS6LSJDUAw_QNJiyAVe";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

function buildLoginUrlWithNext() {
  const pathName = String(window.location.pathname || "");
  const fileName = pathName.endsWith("/")
    ? "index.html"
    : (pathName.split("/").pop() || "index.html");
  const nextPath = `${fileName}${window.location.search || ""}`;
  return `login.html?next=${encodeURIComponent(nextPath)}`;
}

function redirectToLoginPage() {
  window.location.replace(buildLoginUrlWithNext());
}

async function requireAuthenticatedSession() {
  try {
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) throw error;
    if (!data?.session) {
      redirectToLoginPage();
      return null;
    }
    return data.session;
  } catch (_error) {
    redirectToLoginPage();
    return null;
  }
}

const elements = {
  pageTitle: document.getElementById("pageTitle"),
  contractIdValue: document.getElementById("contractIdValue"),
  customerValue: document.getElementById("customerValue"),
  plannedTonValue: document.getElementById("plannedTonValue"),
  deliveredTonValue: document.getElementById("deliveredTonValue"),
  remainingTonValue: document.getElementById("remainingTonValue"),
  progressValue: document.getElementById("progressValue"),
  dueDateValue: document.getElementById("dueDateValue"),
  deliveryCountValue: document.getElementById("deliveryCountValue"),
  deliveryHistoryBody: document.getElementById("deliveryHistoryBody"),
  errorBox: document.getElementById("errorBox")
};

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short"
  });
}

function setError(message) {
  elements.errorBox.textContent = message;
  elements.errorBox.style.display = "block";
}

function getContractIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return String(params.get("contract_id") || "").trim();
}

function renderInfoRow(message) {
  elements.deliveryHistoryBody.innerHTML = `
    <tr>
      <td colspan="4" class="muted">${escapeHtml(message)}</td>
    </tr>
  `;
}

function renderDeliveryHistoryTable(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    renderInfoRow("No delivery history found.");
    return;
  }

  const sorted = [...rows].sort((left, right) => {
    const leftDate = String(left.delivery_date || "");
    const rightDate = String(right.delivery_date || "");
    if (leftDate === rightDate) {
      return String(right.delivery_id || "").localeCompare(String(left.delivery_id || ""));
    }
    return rightDate.localeCompare(leftDate);
  });

  elements.deliveryHistoryBody.innerHTML = sorted
    .map((row) => {
      return `
        <tr>
          <td>${escapeHtml(row.delivery_id || "-")}</td>
          <td>${escapeHtml(formatDate(row.delivery_date))}</td>
          <td>${escapeHtml(row.job || "-")}</td>
          <td class="number-cell">${escapeHtml(formatNumber(row.quantity))}</td>
        </tr>
      `;
    })
    .join("");
}

function renderSummary(contractId, customer, plannedTon, deliveredTon, dueDate, deliveryCount) {
  const remainingTon = plannedTon - deliveredTon;
  const progress = plannedTon > 0 ? (deliveredTon / plannedTon) * 100 : 0;

  elements.pageTitle.textContent = `Contract ${contractId}`;
  elements.contractIdValue.textContent = contractId || "-";
  elements.customerValue.textContent = customer || "-";
  elements.plannedTonValue.textContent = formatNumber(plannedTon);
  elements.deliveredTonValue.textContent = formatNumber(deliveredTon);
  elements.remainingTonValue.textContent = formatNumber(remainingTon);
  elements.progressValue.textContent = `${progress.toFixed(1)}%`;
  elements.dueDateValue.textContent = formatDate(dueDate);
  elements.deliveryCountValue.textContent = formatNumber(deliveryCount);
}

async function loadDeliveryDetail() {
  const contractId = getContractIdFromUrl();
  if (!contractId) {
    elements.pageTitle.textContent = "Contract Not Found";
    setError("Missing contract_id parameter.");
    renderInfoRow("No contract selected.");
    return;
  }

  const [contractRes, linesRes, deliveriesRes] = await Promise.all([
    supabaseClient
      .from("operation_contracts")
      .select("contract_id, customer")
      .eq("contract_id", contractId)
      .maybeSingle(),
    supabaseClient
      .from("operation_lines")
      .select("contract_id, ton, date_to")
      .eq("contract_id", contractId),
    supabaseClient
      .from("operation_deliveries")
      .select("delivery_id, contract_id, job, quantity, delivery_date")
      .eq("contract_id", contractId)
  ]);

  if (contractRes.error) throw contractRes.error;
  if (linesRes.error) throw linesRes.error;
  if (deliveriesRes.error) throw deliveriesRes.error;

  const contract = contractRes.data || {};
  const lines = Array.isArray(linesRes.data) ? linesRes.data : [];
  const deliveries = Array.isArray(deliveriesRes.data) ? deliveriesRes.data : [];

  const plannedTon = lines.reduce((sum, row) => sum + Number(row.ton || 0), 0);
  const deliveredTon = deliveries.reduce((sum, row) => sum + Number(row.quantity || 0), 0);
  const dueDate = lines.reduce((latest, row) => {
    const value = String(row.date_to || "");
    if (!value) return latest;
    if (!latest) return value;
    return value > latest ? value : latest;
  }, "");

  renderSummary(
    contractId,
    String(contract.customer || ""),
    plannedTon,
    deliveredTon,
    dueDate,
    deliveries.length
  );
  renderDeliveryHistoryTable(deliveries);
}

async function bootstrapDeliveryDetail() {
  const session = await requireAuthenticatedSession();
  if (!session) return;

  loadDeliveryDetail().catch((error) => {
    elements.pageTitle.textContent = "Delivery Detail Error";
    setError(error?.message || "Unable to load delivery detail.");
    renderInfoRow("Failed to load delivery history.");
  });
}

bootstrapDeliveryDetail();
