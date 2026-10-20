/* Theme preference: system by default, explicit light/dark override. */
(() => {
  const key = "site-theme";
  let memoryTheme = null;
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const read = () => {
    if (memoryTheme !== null) return memoryTheme;
    try { return localStorage.getItem(key) || "system"; }
    catch { return "system"; }
  };
  const effective = () => {
    const value = read();
    return value === "system" ? (media.matches ? "dark" : "light") : value;
  };
  function apply() {
    const theme = effective();
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    const button = document.querySelector("[data-theme-toggle]");
    if (button) {
      const mode = read();
      button.textContent = { system: "◐", light: "☀", dark: "☾" }[mode] || "◐";
      button.setAttribute("aria-label", "Color theme: " + mode + ". Activate next mode");
      button.title = "Theme: " + mode + " (click to change)";
    }
    document.dispatchEvent(new CustomEvent("site-theme-change", { detail: { theme } }));
    document.querySelectorAll("iframe.giscus-frame").forEach((frame) => {
      frame.contentWindow?.postMessage({ giscus: { setConfig: { theme } } }, "https://giscus.app");
    });
  }
  function init() {
    const masthead = document.querySelector(".masthead__menu .greedy-nav");
    if (masthead && !document.querySelector("[data-theme-toggle]")) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "theme-toggle";
      button.dataset.themeToggle = "";
      button.addEventListener("click", () => {
        const order = ["system", "light", "dark"];
        const next = order[(order.indexOf(read()) + 1) % order.length];
        memoryTheme = next;
        try { localStorage.setItem(key, next); } catch {}
        apply();
        // Rebuild interactive Mermaid SVGs with the new palette on next load.
        if (document.querySelector(".mermaid-viewer")) window.location.reload();
      });
      masthead.appendChild(button);
    }
    apply();
    // Giscus inserts its iframe asynchronously.
    const watch = new MutationObserver(() => {
      document.querySelectorAll("iframe.giscus-frame:not([data-theme-hook])").forEach((frame) => {
        frame.dataset.themeHook = "true";
        frame.addEventListener("load", apply);
        apply();
      });
    });
    watch.observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
  media.addEventListener?.("change", () => {
    const previous = document.documentElement.dataset.theme;
    apply();
    if (previous !== effective() && document.querySelector(".mermaid-viewer")) {
      window.location.reload();
    }
  });
  window.addEventListener("storage", apply);
})();
