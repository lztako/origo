(function () {
  var STORAGE_KEY = "dashboard-theme";
  var DEFAULT_THEME = "mono";
  var ALLOWED = { mono: true, legacy: true };

  function readUrlTheme() {
    try {
      var params = new URLSearchParams(window.location.search);
      return params.get("theme");
    } catch (error) {
      return null;
    }
  }

  function readStoredTheme() {
    try {
      return window.localStorage.getItem(STORAGE_KEY);
    } catch (error) {
      return null;
    }
  }

  function saveTheme(theme) {
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch (error) {
      // Ignore storage errors in private mode/restricted environments.
    }
  }

  var requestedTheme = readUrlTheme();
  var storedTheme = readStoredTheme();
  var nextTheme = requestedTheme || storedTheme || DEFAULT_THEME;

  if (!ALLOWED[nextTheme]) {
    nextTheme = DEFAULT_THEME;
  }

  document.documentElement.setAttribute("data-theme", nextTheme);
  window.__dashboardTheme = nextTheme;
  saveTheme(nextTheme);
})();
