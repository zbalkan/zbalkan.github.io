---
---
(() => {
  const mermaidTheme = {
    air: "default",
    aqua: "default",
    contrast: "default",
    dark: "dark",
    default: "default",
    dirt: "default",
    mint: "mint",
    neon: "dark",
    plum: "dark",
    sunrise: "default"
  }["{{ site.minimal_mistakes_skin }}"] || "default";

  const makeButton = (label, action, title) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "mermaid-viewer__button";
    button.dataset.action = action;
    button.textContent = label;
    button.title = title;
    button.setAttribute("aria-label", title);
    return button;
  };

  const attachViewer = (svg) => {
    if (svg.dataset.panZoomReady === "true") return;
    svg.dataset.panZoomReady = "true";

    const previousParent = svg.parentElement;
    const viewer = document.createElement("section");
    viewer.className = "mermaid-viewer";
    viewer.setAttribute("aria-label", "Interactive Mermaid diagram");

    previousParent.insertBefore(viewer, svg);
    viewer.appendChild(svg);
    previousParent.classList.add("mermaid-viewer-host");

    // svg-pan-zoom removes the SVG viewBox. Explicit dimensions prevent
    // the browser fallback height of 150px described in its documentation.
    svg.style.width = "100%";
    svg.style.height = "100%";
    svg.style.maxWidth = "none";

    const panZoom = svgPanZoom(svg, {
      panEnabled: true,
      zoomEnabled: true,
      mouseWheelZoomEnabled: true,
      dblClickZoomEnabled: true,
      controlIconsEnabled: false,
      zoomScaleSensitivity: 0.25,
      minZoom: 0.35,
      maxZoom: 12,
      fit: false,
      center: true,
      contain: false
    });

    const toolbar = document.createElement("div");
    toolbar.className = "mermaid-viewer__toolbar";
    toolbar.setAttribute("role", "group");
    toolbar.setAttribute("aria-label", "Diagram controls");
    toolbar.append(
      makeButton("−", "out", "Zoom out"),
      makeButton("+", "in", "Zoom in"),
      makeButton("Fit", "fit", "Fit diagram to viewer"),
      makeButton("100%", "reset", "Reset to native scale"),
      makeButton("Full", "fullscreen", "Open fullscreen")
    );
    viewer.appendChild(toolbar);

    toolbar.addEventListener("click", async (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;

      switch (button.dataset.action) {
        case "out":
          panZoom.zoomOut();
          break;
        case "in":
          panZoom.zoomIn();
          break;
        case "fit":
          panZoom.fit();
          panZoom.center();
          break;
        case "reset":
          panZoom.resetZoom();
          panZoom.center();
          break;
        case "fullscreen":
          if (document.fullscreenElement === viewer) {
            await document.exitFullscreen();
          } else {
            await viewer.requestFullscreen();
          }
          break;
      }
    });

    const refresh = () => panZoom.resize();
    new ResizeObserver(refresh).observe(viewer);
    document.addEventListener("fullscreenchange", () => {
      window.setTimeout(refresh, 0);
    });
  };

  const start = async () => {
    if (!window.mermaid || !window.svgPanZoom) {
      console.warn("Mermaid viewer dependencies did not load.");
      return;
    }

    mermaid.initialize({
      startOnLoad: false,
      theme: mermaidTheme,
      flowchart: { useMaxWidth: false }
    });

    // Mermaid v10+ recommends run(), not init(). The existing site syntax
    // renders code fences into elements with the language-mermaid class.
    await mermaid.run({ querySelector: ".language-mermaid" });
    document.querySelectorAll(".language-mermaid svg").forEach(attachViewer);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
