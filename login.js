const SUPABASE_URL = "https://adybfyqyoyinmpsftrde.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_ho8IqSNFZgb6xS6LSJDUAw_QNJiyAVe";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const elements = {
  form: document.getElementById("loginForm"),
  email: document.getElementById("loginEmail"),
  password: document.getElementById("loginPassword"),
  submitBtn: document.getElementById("loginSubmitBtn"),
  status: document.getElementById("loginStatus")
};

function normalizeNextPath(rawValue) {
  const fallback = "index.html";
  const raw = String(rawValue || "").trim();
  if (!raw) return fallback;

  try {
    const parsed = new URL(raw, window.location.origin);
    if (parsed.origin !== window.location.origin) return fallback;
    const normalized = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    if (!normalized || normalized === "/") return fallback;
    return normalized.startsWith("/") ? normalized.slice(1) : normalized;
  } catch (_error) {
    return fallback;
  }
}

function resolveNextPath() {
  const params = new URLSearchParams(window.location.search);
  return normalizeNextPath(params.get("next"));
}

function setStatus(message, type = "info") {
  if (!elements.status) return;
  elements.status.textContent = String(message || "");
  elements.status.className = "login-status";
  if (type === "error") elements.status.classList.add("error");
  if (type === "success") elements.status.classList.add("success");
}

function setSubmitting(isSubmitting) {
  if (!elements.submitBtn) return;
  elements.submitBtn.disabled = Boolean(isSubmitting);
  elements.submitBtn.textContent = isSubmitting ? "Signing in..." : "Sign in";
}

async function redirectIfAuthenticated(nextPath) {
  const { data, error } = await supabaseClient.auth.getSession();
  if (error) return;
  if (data?.session) {
    window.location.replace(nextPath);
  }
}

async function handleLoginSubmit(event) {
  event.preventDefault();
  const nextPath = resolveNextPath();
  const email = String(elements.email?.value || "").trim();
  const password = String(elements.password?.value || "");

  if (!email || !password) {
    setStatus("Please enter both email and password.", "error");
    return;
  }

  setSubmitting(true);
  setStatus("");

  try {
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;
    setStatus("Signed in. Redirecting...", "success");
    window.setTimeout(() => {
      window.location.replace(nextPath);
    }, 260);
  } catch (error) {
    setStatus(error?.message || "Unable to sign in with these credentials.", "error");
  } finally {
    setSubmitting(false);
  }
}

async function initLogin() {
  const nextPath = resolveNextPath();
  await redirectIfAuthenticated(nextPath);
  elements.form?.addEventListener("submit", handleLoginSubmit);
}

initLogin();
