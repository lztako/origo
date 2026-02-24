const runtimeConfig = typeof window.getSupabaseRuntimeConfig === "function"
  ? window.getSupabaseRuntimeConfig()
  : {
      envKey: "prod",
      label: "PROD",
      url: "https://adybfyqyoyinmpsftrde.supabase.co",
      publishableKey: "sb_publishable_ho8IqSNFZgb6xS6LSJDUAw_QNJiyAVe",
      ready: true,
      errorMessage: ""
    };

const elements = {
  lead: document.getElementById("lineLinkLead"),
  status: document.getElementById("lineLinkStatus"),
  detail: document.getElementById("lineLinkDetail")
};

const LINE_AUTH_QUERY_KEY = "line_auth";
const FORCE_LOGIN_QUERY_KEY = "force_login";

if (!runtimeConfig.ready) {
  throw new Error(runtimeConfig.errorMessage || "Supabase environment is not configured.");
}

const supabaseClient = window.supabase.createClient(runtimeConfig.url, runtimeConfig.publishableKey);

function setStatus(message, type = "info") {
  if (!elements.status) return;
  elements.status.textContent = String(message || "");
  elements.status.className = "login-status";
  if (type === "error") elements.status.classList.add("error");
  if (type === "success") elements.status.classList.add("success");
}

function setLead(message) {
  if (elements.lead) elements.lead.textContent = String(message || "");
}

function setDetail(message) {
  if (elements.detail) elements.detail.textContent = String(message || "");
}

function getQueryParam(name) {
  const params = new URLSearchParams(window.location.search);
  return String(params.get(name) || "").trim();
}

function isTruthyQueryFlag(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function hasLineAuthFlag() {
  return isTruthyQueryFlag(getQueryParam(LINE_AUTH_QUERY_KEY));
}

function normalizeToken(value) {
  return String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 256);
}

function buildLoginUrlWithNext() {
  const pathName = String(window.location.pathname || "");
  const fileName = pathName.endsWith("/")
    ? "line-link.html"
    : (pathName.split("/").pop() || "line-link.html");
  const nextParams = new URLSearchParams(window.location.search);
  nextParams.set(LINE_AUTH_QUERY_KEY, "1");
  nextParams.delete(FORCE_LOGIN_QUERY_KEY);
  const nextPath = nextParams.toString()
    ? `${fileName}?${nextParams.toString()}`
    : fileName;

  const loginParams = new URLSearchParams();
  loginParams.set("env", runtimeConfig.envKey || "prod");
  loginParams.set(FORCE_LOGIN_QUERY_KEY, "1");
  loginParams.set("next", nextPath);
  return `login.html?${loginParams.toString()}`;
}

function redirectToLoginPage() {
  window.location.replace(buildLoginUrlWithNext());
}

function mapRpcErrorToMessage(error) {
  const rawMessage = String(error?.message || "").toLowerCase();
  if (rawMessage.includes("line_link_token_expired")) {
    return "ลิงก์นี้หมดอายุแล้ว กรุณาพิมพ์ `เริ่มใช้งาน` ใน LINE OA เพื่อรับลิงก์ใหม่";
  }
  if (rawMessage.includes("line_link_token_not_found")) {
    return "ไม่พบลิงก์เชื่อมบัญชี กรุณาขอลิงก์ใหม่จาก LINE OA";
  }
  if (rawMessage.includes("line_link_token_not_issued") || rawMessage.includes("line_link_token_already_used")) {
    return "ลิงก์นี้ถูกใช้งานไปแล้ว กรุณาขอลิงก์ใหม่จาก LINE OA";
  }
  if (rawMessage.includes("line_link_membership_not_found")) {
    return "บัญชีนี้ยังไม่มีสิทธิ์เข้าใช้งานบริษัท กรุณาติดต่อผู้ดูแลระบบ";
  }
  if (rawMessage.includes("line_link_user_not_authenticated")) {
    return "ไม่พบสถานะล็อกอิน กรุณาเข้าสู่ระบบใหม่อีกครั้ง";
  }
  return "ไม่สามารถเชื่อมบัญชีได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง";
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

    return {
      session: sessionData.session,
      user: userData.user
    };
  } catch (_error) {
    redirectToLoginPage();
    return null;
  }
}

async function loadEntityName(entityId) {
  if (!entityId) return "";
  const { data, error } = await supabaseClient
    .from("company_entities")
    .select("company_name")
    .eq("entity_id", entityId)
    .maybeSingle();

  if (error || !data?.company_name) return "";
  return String(data.company_name || "").trim();
}

async function consumeLinkToken(token) {
  const { data, error } = await supabaseClient.rpc("consume_line_link_token", {
    p_link_token: token
  });

  if (error) throw error;
  const firstRow = Array.isArray(data) ? data[0] : null;
  if (!firstRow?.entity_id || !firstRow?.line_user_id) {
    throw new Error("line_link_unexpected_response");
  }
  return firstRow;
}

function clearTokenFromUrl() {
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete("token");
    url.searchParams.delete(LINE_AUTH_QUERY_KEY);
    url.searchParams.delete(FORCE_LOGIN_QUERY_KEY);
    window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
  } catch (_error) {
    // Ignore URL cleanup failures.
  }
}

async function initLineLinkPage() {
  const rawToken = getQueryParam("token");
  const token = normalizeToken(rawToken);
  if (!token) {
    setLead("ไม่พบ token สำหรับเชื่อมบัญชี");
    setStatus("ลิงก์นี้ไม่ถูกต้อง กรุณาพิมพ์ `เริ่มใช้งาน` ใน LINE OA เพื่อรับลิงก์ใหม่", "error");
    setDetail("Missing link token");
    return;
  }

  if (!hasLineAuthFlag()) {
    redirectToLoginPage();
    return;
  }

  const authState = await requireAuthenticatedSession();
  if (!authState?.user) return;

  setLead("กำลังเชื่อมบัญชี LINE กับบัญชีผู้ใช้ของคุณ");
  setStatus("กำลังประมวลผล...", "info");
  setDetail("");

  try {
    const linked = await consumeLinkToken(token);
    const entityName = await loadEntityName(linked.entity_id);
    setLead("ยินดีต้อนรับ");
    setStatus("เชื่อมบัญชี LINE OA สำเร็จแล้ว", "success");
    setDetail(
      entityName
        ? `เชื่อมกับบริษัท ${entityName} เรียบร้อยแล้ว ปิดหน้านี้ (กด X มุมซ้ายบน) แล้วเริ่มแชทใน LINE ได้เลย`
        : "เชื่อมบัญชีเรียบร้อยแล้ว ปิดหน้านี้ (กด X มุมซ้ายบน) แล้วเริ่มแชทใน LINE ได้เลย"
    );
    clearTokenFromUrl();
  } catch (error) {
    console.error("[line-link] consume token failed:", error);
    setLead("เชื่อมบัญชีไม่สำเร็จ");
    setStatus(mapRpcErrorToMessage(error), "error");
    setDetail("ตรวจสอบลิงก์/สิทธิ์ผู้ใช้ แล้วลองใหม่อีกครั้ง");
  }
}

initLineLinkPage();
