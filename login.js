const STORAGE_KEY = "dashboard.supabase.env";
const VALID_ENV_KEYS = new Set(["prod", "demo"]);
const ENV_PRIORITY = Object.freeze(["prod", "demo"]);
const FALLBACK_RUNTIME_CONFIG = {
  envKey: "prod",
  label: "PROD",
  url: "https://adybfyqyoyinmpsftrde.supabase.co",
  publishableKey: "sb_publishable_ho8IqSNFZgb6xS6LSJDUAw_QNJiyAVe",
  ready: true,
  errorMessage: "",
  appendEnvToPath: (path) => String(path || "")
};

const runtimeConfig = typeof window.getSupabaseRuntimeConfig === "function"
  ? window.getSupabaseRuntimeConfig()
  : FALLBACK_RUNTIME_CONFIG;

const explicitEnvKey = resolveQueryEnvKey();
const forceLogin = resolveForceLoginFlag();
const envConfigs = resolveEnvConfigs();
const envClients = new Map();

const elements = {
  form: document.getElementById("loginForm"),
  email: document.getElementById("loginEmail"),
  password: document.getElementById("loginPassword"),
  submitBtn: document.getElementById("loginSubmitBtn"),
  status: document.getElementById("loginStatus"),
  environment: document.getElementById("loginEnvironment")
};

function normalizeEnvKey(value) {
  const key = String(value || "").trim().toLowerCase();
  return VALID_ENV_KEYS.has(key) ? key : "";
}

function resolveQueryEnvKey() {
  const params = new URLSearchParams(window.location.search);
  return normalizeEnvKey(params.get("env"));
}

function isTruthyQueryFlag(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function resolveForceLoginFlag() {
  const params = new URLSearchParams(window.location.search);
  return isTruthyQueryFlag(params.get("force_login"));
}

function isSupabaseConfigReady(entry) {
  const url = String(entry?.url || "").trim();
  const key = String(entry?.publishableKey || "").trim();
  if (!url || !key) return false;
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url)) return false;
  if (!/^sb_/i.test(key)) return false;
  return true;
}

function formatEnvLabel(envKey, fallback = "") {
  const normalized = normalizeEnvKey(envKey);
  if (normalized === "prod") return "PROD";
  if (normalized === "demo") return "DEMO";
  return String(fallback || "UNKNOWN").trim().toUpperCase() || "UNKNOWN";
}

function makeEnvRuntime(envKey, rawConfig) {
  const normalized = normalizeEnvKey(envKey) || "prod";
  const label = formatEnvLabel(normalized, rawConfig?.label);
  const url = String(rawConfig?.url || "").trim();
  const publishableKey = String(rawConfig?.publishableKey || "").trim();
  const ready = isSupabaseConfigReady({ url, publishableKey });
  const errorMessage = ready
    ? ""
    : `Supabase "${normalized}" environment is not configured.`;

  return {
    envKey: normalized,
    label,
    url,
    publishableKey,
    ready,
    errorMessage,
    appendEnvToPath(path) {
      return appendEnvToPath(path, normalized);
    }
  };
}

function resolveEnvConfigs() {
  const fromRuntime = typeof window.getSupabaseEnvConfigs === "function"
    ? window.getSupabaseEnvConfigs()
    : {};
  const output = {};

  for (const envKey of ENV_PRIORITY) {
    const rawEntry = fromRuntime && typeof fromRuntime === "object"
      ? fromRuntime[envKey]
      : null;
    const fallbackEntry = runtimeConfig.envKey === envKey ? runtimeConfig : null;
    output[envKey] = makeEnvRuntime(envKey, rawEntry || fallbackEntry || {});
  }

  return output;
}

function appendEnvToPath(rawPath, envKey) {
  const path = String(rawPath || "").trim();
  if (!path) return path;

  try {
    const hasLeadingSlash = path.startsWith("/");
    const parsed = new URL(path, window.location.origin);
    if (envKey === "demo") {
      parsed.searchParams.set("env", "demo");
    } else {
      parsed.searchParams.delete("env");
    }
    const normalized = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    if (hasLeadingSlash) return normalized;
    return normalized.startsWith("/") ? normalized.slice(1) : normalized;
  } catch (_error) {
    return path;
  }
}

function decoratePathForEnv(path, envKey) {
  const config = envConfigs[envKey];
  if (config && typeof config.appendEnvToPath === "function") {
    return config.appendEnvToPath(path);
  }
  return appendEnvToPath(path, envKey);
}

function persistEnvPreference(envKey) {
  const normalized = normalizeEnvKey(envKey);
  if (!normalized) return;

  if (typeof window.setSupabaseEnvPreference === "function") {
    window.setSupabaseEnvPreference(normalized);
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, normalized);
  } catch (_error) {
    // Ignore storage failures (private mode, blocked storage).
  }
}

function resolveNextPath() {
  const params = new URLSearchParams(window.location.search);
  return normalizeNextPath(params.get("next"));
}

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

function getLoginEnvOrder() {
  const available = ENV_PRIORITY.filter((envKey) => envConfigs[envKey]?.ready);
  if (!available.length) return [];
  if (explicitEnvKey) return available.filter((envKey) => envKey === explicitEnvKey);
  return available;
}

function renderEnvironmentLabel() {
  if (!elements.environment) return;

  if (explicitEnvKey) {
    const label = formatEnvLabel(explicitEnvKey, envConfigs[explicitEnvKey]?.label);
    const suffix = explicitEnvKey === "demo" ? " (mock data only)" : "";
    elements.environment.textContent = `Environment: ${label}${suffix}`;
    return;
  }

  const parts = [];
  if (envConfigs.prod?.ready) parts.push("PROD");
  if (envConfigs.demo?.ready) parts.push("DEMO");
  if (!parts.length) {
    elements.environment.textContent = "Environment: unavailable";
    return;
  }

  elements.environment.textContent = `Environment: AUTO (${parts.join(" -> ")})`;
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

function getSupabaseClient(envKey) {
  const normalized = normalizeEnvKey(envKey);
  if (!normalized) return null;
  if (envClients.has(normalized)) return envClients.get(normalized);

  const config = envConfigs[normalized];
  if (!config?.ready) return null;

  const client = window.supabase.createClient(config.url, config.publishableKey);
  envClients.set(normalized, client);
  return client;
}

async function validateSession(client) {
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError || !sessionData?.session) return false;

  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData?.user) {
    await client.auth.signOut().catch(() => {});
    return false;
  }

  return true;
}

async function redirectIfAuthenticated(nextPath) {
  const order = getLoginEnvOrder();

  for (const envKey of order) {
    const client = getSupabaseClient(envKey);
    if (!client) continue;

    const isValid = await validateSession(client);
    if (!isValid) continue;

    persistEnvPreference(envKey);
    window.location.replace(decoratePathForEnv(nextPath, envKey));
    return true;
  }

  return false;
}

async function clearAllSessions() {
  const tasks = [];
  for (const envKey of ENV_PRIORITY) {
    const client = getSupabaseClient(envKey);
    if (!client) continue;
    tasks.push(client.auth.signOut().catch(() => {}));
  }
  await Promise.all(tasks);
}

function isInvalidCredentialError(error) {
  const status = Number(error?.status || error?.statusCode || 0);
  const message = String(error?.message || "").toLowerCase();
  if (message.includes("invalid login credentials")) return true;
  return (status === 400 || status === 401) && message.includes("invalid");
}

function formatAuthErrorMessage(error, envKey) {
  const defaultMessage = "Unable to sign in with these credentials.";
  const message = String(error?.message || "").trim();
  if (!message) return defaultMessage;
  if (!explicitEnvKey && !isInvalidCredentialError(error)) {
    return `[${formatEnvLabel(envKey)}] ${message}`;
  }
  return message;
}

async function signInWithEnv(envKey, email, password) {
  const client = getSupabaseClient(envKey);
  if (!client) {
    return {
      ok: false,
      error: new Error(envConfigs[envKey]?.errorMessage || `Environment "${envKey}" is unavailable.`)
    };
  }

  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    return { ok: false, error };
  }

  return { ok: true };
}

function completeLogin(nextPath, envKey) {
  persistEnvPreference(envKey);
  setStatus("Signed in. Redirecting...", "success");
  window.setTimeout(() => {
    window.location.replace(decoratePathForEnv(nextPath, envKey));
  }, 260);
}

async function attemptStrictLogin(nextPath, email, password, envKey) {
  const result = await signInWithEnv(envKey, email, password);
  if (!result.ok) {
    throw Object.assign(result.error || new Error("Unable to sign in."), { envKey });
  }
  completeLogin(nextPath, envKey);
}

async function attemptAutoLogin(nextPath, email, password) {
  const autoOrder = ENV_PRIORITY.filter((envKey) => envConfigs[envKey]?.ready);
  if (!autoOrder.length) {
    throw Object.assign(new Error("Supabase environment is not configured."), { envKey: "" });
  }

  const [primaryEnvKey, ...fallbackEnvKeys] = autoOrder;
  const primaryResult = await signInWithEnv(primaryEnvKey, email, password);
  if (primaryResult.ok) {
    completeLogin(nextPath, primaryEnvKey);
    return;
  }

  if (!isInvalidCredentialError(primaryResult.error)) {
    throw Object.assign(primaryResult.error || new Error("Unable to sign in."), { envKey: primaryEnvKey });
  }

  for (const envKey of fallbackEnvKeys) {
    const fallbackResult = await signInWithEnv(envKey, email, password);
    if (fallbackResult.ok) {
      completeLogin(nextPath, envKey);
      return;
    }

    if (!isInvalidCredentialError(fallbackResult.error)) {
      throw Object.assign(fallbackResult.error || new Error("Unable to sign in."), { envKey });
    }
  }

  throw Object.assign(new Error("Invalid email or password."), { envKey: primaryEnvKey });
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

  const loginOrder = getLoginEnvOrder();
  if (!loginOrder.length) {
    setStatus("Supabase environment is not configured.", "error");
    return;
  }

  setSubmitting(true);
  setStatus("");

  try {
    if (explicitEnvKey) {
      await attemptStrictLogin(nextPath, email, password, explicitEnvKey);
      return;
    }

    await attemptAutoLogin(nextPath, email, password);
  } catch (error) {
    const envKey = normalizeEnvKey(error?.envKey);
    setStatus(formatAuthErrorMessage(error, envKey), "error");
  } finally {
    setSubmitting(false);
  }
}

async function initLogin() {
  const nextPath = resolveNextPath();
  renderEnvironmentLabel();

  const loginOrder = getLoginEnvOrder();
  if (!loginOrder.length) {
    setStatus("Supabase environment is not configured.", "error");
    if (elements.submitBtn) {
      elements.submitBtn.disabled = true;
      elements.submitBtn.textContent = "Unavailable";
    }
    return;
  }

  if (forceLogin) {
    await clearAllSessions();
  }

  const redirected = forceLogin ? false : await redirectIfAuthenticated(nextPath);
  if (redirected) return;

  if (forceLogin) {
    setStatus("Please sign in to continue.");
  }

  elements.form?.addEventListener("submit", handleLoginSubmit);
}

initLogin();
