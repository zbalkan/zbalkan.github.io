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

  const iconPaths = {
    out: "M3.75 7.25a.75.75 0 0 0 0 1.5h8.5a.75.75 0 0 0 0-1.5z",
    in: "M8 3a.75.75 0 0 1 .75.75v3.5h3.5a.75.75 0 0 1 0 1.5h-3.5v3.5a.75.75 0 0 1-1.5 0v-3.5h-3.5a.75.75 0 0 1 0-1.5h3.5v-3.5A.75.75 0 0 1 8 3z",
    fit: "M1.75 5.5a.75.75 0 0 1-.75-.75v-3A.75.75 0 0 1 1.75 1h3a.75.75 0 0 1 0 1.5H2.5v2.25a.75.75 0 0 1-.75.75zm12.5 0a.75.75 0 0 1-.75-.75V2.5h-2.25a.75.75 0 0 1 0-1.5h3a.75.75 0 0 1 .75.75v3a.75.75 0 0 1-.75.75zm-9.5 9.5h-3a.75.75 0 0 1-.75-.75v-3a.75.75 0 0 1 1.5 0v2.25h2.25a.75.75 0 0 1 0 1.5zm9.5 0h-3a.75.75 0 0 1 0-1.5h2.25v-2.25a.75.75 0 0 1 1.5 0v3a.75.75 0 0 1-.75.75z",
    reset: "M8 2.5a5.5 5.5 0 1 1-4.95 3.1.75.75 0 1 1 1.35.65A4 4 0 1 0 8 4H6.75a.75.75 0 0 1 0-1.5zm0 2.75a.75.75 0 0 1 .75.75v1.69l1.28.85a.75.75 0 1 1-.83 1.25L7.58 8.71A.75.75 0 0 1 7.25 8V6A.75.75 0 0 1 8 5.25z",
    fullscreen: "M2.5 6V2.5H6a.75.75 0 0 0 0-1.5H1.75a.75.75 0 0 0-.75.75V6a.75.75 0 0 0 1.5 0zM10 1a.75.75 0 0 0 0 1.5h3.5V6a.75.75 0 0 0 1.5 0V1.75a.75.75 0 0 0-.75-.75zM2.5 10a.75.75 0 0 0-1.5 0v4.25c0 .414.336.75.75.75H6a.75.75 0 0 0 0-1.5H2.5zm12.5 0a.75.75 0 0 0-1.5 0v3.5H10a.75.75 0 0 0 0 1.5h4.25a.75.75 0 0 0 .75-.75z"
  };

  const makeButton = (action, title) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "mermaid-viewer__button";
    button.dataset.action = action;
    button.title = title;
    button.setAttribute("aria-label", title);
    const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("viewBox", "0 0 16 16");
    icon.setAttribute("aria-hidden", "true");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", iconPaths[action]);
    icon.appendChild(path);
    button.appendChild(icon);
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
      makeButton("out", "Zoom out"),
      makeButton("in", "Zoom in"),
      makeButton("fit", "Fit diagram to viewer"),
      makeButton("reset", "Reset zoom"),
      makeButton("fullscreen", "Open fullscreen")
    );
    viewer.appendChild(toolbar);

    // Mermaid diagrams vary considerably in their native dimensions. Start
    // with the whole diagram visible instead of an arbitrary 100% crop.
    panZoom.fit();
    panZoom.center();

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
