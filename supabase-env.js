(() => {
  const STORAGE_KEY = "dashboard.supabase.env";
  const VALID_ENV_KEYS = new Set(["prod", "demo"]);
  const PLACEHOLDER_PATTERN = /(YOUR_|REPLACE_|<|>)/i;

  const baseConfig = {
    prod: {
      label: "PROD",
      url: "https://adybfyqyoyinmpsftrde.supabase.co",
      publishableKey: "sb_publishable_ho8IqSNFZgb6xS6LSJDUAw_QNJiyAVe"
    },
    demo: {
      label: "DEMO",
      url: "https://lhlnkxvodmwwbbticwkh.supabase.co",
      publishableKey: "sb_publishable_pqc3_6tzqPezTFnrJ19FVA_YvAJhdgR"
    }
  };

  function normalizeEnvKey(value) {
    const key = String(value || "").trim().toLowerCase();
    return VALID_ENV_KEYS.has(key) ? key : "";
  }

  function readStoredEnvKey() {
    try {
      return normalizeEnvKey(window.localStorage.getItem(STORAGE_KEY));
    } catch (_error) {
      return "";
    }
  }

  function writeStoredEnvKey(envKey) {
    try {
      window.localStorage.setItem(STORAGE_KEY, envKey);
    } catch (_error) {
      // Ignore storage failures (private mode, blocked storage).
    }
  }

  function mergeConfig(base, overrides) {
    const output = {
      prod: { ...base.prod },
      demo: { ...base.demo }
    };

    if (!overrides || typeof overrides !== "object") {
      return output;
    }

    for (const key of Object.keys(output)) {
      if (!overrides[key] || typeof overrides[key] !== "object") continue;
      output[key] = {
        ...output[key],
        ...overrides[key]
      };
    }

    return output;
  }

  function isSupabaseConfigReady(entry) {
    const url = String(entry?.url || "").trim();
    const key = String(entry?.publishableKey || "").trim();
    if (!url || !key) return false;
    if (PLACEHOLDER_PATTERN.test(url) || PLACEHOLDER_PATTERN.test(key)) return false;
    if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url)) return false;
    if (!/^sb_/i.test(key)) return false;
    return true;
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

  const mergedConfig = mergeConfig(baseConfig, window.__SUPABASE_ENV_OVERRIDES__);
  const params = new URLSearchParams(window.location.search);
  const queryEnvKey = normalizeEnvKey(params.get("env"));
  const storedEnvKey = readStoredEnvKey();
  const defaultEnvKey = normalizeEnvKey(window.__SUPABASE_DEFAULT_ENV__) || "prod";
  const activeEnvKey = defaultEnvKey;

  if (queryEnvKey || (storedEnvKey && storedEnvKey !== defaultEnvKey)) {
    // Force production as canonical runtime for this app.
    writeStoredEnvKey(defaultEnvKey);
  }

  function buildEnvRuntime(envKey) {
    const normalizedKey = normalizeEnvKey(envKey) || "prod";
    const entry = mergedConfig[normalizedKey] || mergedConfig.prod || {};
    const ready = isSupabaseConfigReady(entry);
    const errorMessage = ready
      ? ""
      : [
          `Supabase "${normalizedKey}" environment is not configured.`,
          "Update supabase-env.js (or window.__SUPABASE_ENV_OVERRIDES__) with the correct URL and publishable key."
        ].join(" ");

    return {
      envKey: normalizedKey,
      label: String(entry?.label || normalizedKey.toUpperCase()),
      url: String(entry?.url || ""),
      publishableKey: String(entry?.publishableKey || ""),
      ready,
      errorMessage,
      appendEnvToPath(path) {
        return appendEnvToPath(path, normalizedKey);
      }
    };
  }

  const envRuntimeMap = {};
  for (const envKey of VALID_ENV_KEYS) {
    envRuntimeMap[envKey] = buildEnvRuntime(envKey);
  }

  const activeRuntime = envRuntimeMap[activeEnvKey] || envRuntimeMap.prod;
  const activeSource = "default";

  const runtimeConfig = {
    ...activeRuntime,
    source: activeSource,
    hasQueryOverride: Boolean(queryEnvKey),
    hasStoredPreference: Boolean(storedEnvKey),
    appendEnvToPath(path) {
      return activeRuntime.appendEnvToPath(path);
    }
  };

  function getEnvRuntimeMap() {
    return {
      prod: { ...envRuntimeMap.prod, appendEnvToPath: envRuntimeMap.prod.appendEnvToPath },
      demo: { ...envRuntimeMap.demo, appendEnvToPath: envRuntimeMap.demo.appendEnvToPath }
    };
  }

  function getEnvRuntime(envKey) {
    const normalized = normalizeEnvKey(envKey);
    return normalized ? envRuntimeMap[normalized] || null : null;
  }

  function setEnvPreference(envKey) {
    const normalized = normalizeEnvKey(envKey);
    if (!normalized) return "";
    writeStoredEnvKey(normalized);
    return normalized;
  }

  window.__SUPABASE_RUNTIME_CONFIG__ = runtimeConfig;
  window.__SUPABASE_ENV_CONFIGS__ = getEnvRuntimeMap();
  window.getSupabaseRuntimeConfig = () => window.__SUPABASE_RUNTIME_CONFIG__;
  window.getSupabaseEnvConfigs = () => getEnvRuntimeMap();
  window.getSupabaseEnvConfig = (envKey) => getEnvRuntime(envKey);
  window.setSupabaseEnvPreference = (envKey) => setEnvPreference(envKey);
  window.decoratePathWithSupabaseEnv = (path) => runtimeConfig.appendEnvToPath(path);

  if (document?.documentElement) {
    document.documentElement.setAttribute("data-supabase-env", runtimeConfig.envKey);
  }

  if (!runtimeConfig.ready) {
    console.error(runtimeConfig.errorMessage);
  }
})();
