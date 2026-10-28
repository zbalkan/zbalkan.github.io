(() => {
  // The theme is established in head/custom.html before scripts execute.
  const mermaidTheme = document.documentElement.dataset.theme === "dark" ? "dark" : "default";

  const MIN_ZOOM = 0.35;
  const MAX_ZOOM = 12;

  const iconPaths = {
    out: "M3.75 7.25a.75.75 0 0 0 0 1.5h8.5a.75.75 0 0 0 0-1.5z",
    in: "M8 3a.75.75 0 0 1 .75.75v3.5h3.5a.75.75 0 0 1 0 1.5h-3.5v3.5a.75.75 0 0 1-1.5 0v-3.5h-3.5a.75.75 0 0 1 0-1.5h3.5v-3.5A.75.75 0 0 1 8 3z",
    fit: "M1.22 7.47 4.47 4.22a.75.75 0 1 1 1.06 1.06L3.56 7.25h8.88l-1.97-1.97a.75.75 0 1 1 1.06-1.06l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06l1.97-1.97H3.56l1.97 1.97a.75.75 0 0 1-1.06 1.06L1.22 8.53a.75.75 0 0 1 0-1.06z",
    reset: "M13.5 5.25A5.75 5.75 0 1 0 12.25 11.75 M13.5 5.25V2.5 M13.5 5.25H10.75",
    copy: "M5.25 4.25h6.5a1.5 1.5 0 0 1 1.5 1.5v6.5a1.5 1.5 0 0 1-1.5 1.5h-6.5a1.5 1.5 0 0 1-1.5-1.5v-6.5a1.5 1.5 0 0 1 1.5-1.5z M4.25 11.75h-.5a1.5 1.5 0 0 1-1.5-1.5v-6.5a1.5 1.5 0 0 1 1.5-1.5h6.5a1.5 1.5 0 0 1 1.5 1.5v.5",
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
    if (action === "reset" || action === "copy") {
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", "currentColor");
      path.setAttribute("stroke-width", "1.5");
      path.setAttribute("stroke-linecap", "round");
      path.setAttribute("stroke-linejoin", "round");
    }
    icon.appendChild(path);
    button.appendChild(icon);
    return button;
  };

  const copyText = async (text) => {
    if (navigator.clipboard?.writeText && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return;
      } catch {
        // Some browsers expose the API but deny clipboard permission.
      }
    }

    const focused = document.activeElement;
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    try {
      textarea.select();
      if (!document.execCommand("copy")) throw new Error("Unable to copy Mermaid source.");
    } finally {
      textarea.remove();
      focused?.focus({ preventScroll: true });
    }
  };

  const makePrintImage = (svg, dark = false) => {
    const copy = svg.cloneNode(true);
    const bounds = copy.viewBox.baseVal;
    copy.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    copy.setAttribute("width", bounds.width);
    copy.setAttribute("height", bounds.height);
    copy.style.removeProperty("width");
    copy.style.removeProperty("height");
    copy.style.removeProperty("max-width");
    // SVG paint survives printing with browser background graphics disabled.
    const background = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    for (const key of ["x", "y", "width", "height"]) background.setAttribute(key, bounds[key]);
    background.setAttribute("fill", dark ? "#333" : "#fff");
    copy.prepend(background);
    const staticStyle = document.createElementNS("http://www.w3.org/2000/svg", "style");
    staticStyle.textContent = "*, *::before, *::after { animation: none !important; transition: none !important; }";
    copy.appendChild(staticStyle);

    const image = document.createElement("img");
    image.className = "mermaid-print";
    image.alt = svg.querySelector("title")?.textContent || "Mermaid diagram";
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(copy))}`;
    return image;
  };

  const createViewerEvents = (canPanTouch, getZoomLimits) => {
    let svg;
    let wheelFrame = 0;
    let wheelPoint;
    let wheelZoom;
    let pinch;
    let drag;

    const svgPoint = (touch) => {
      const point = svg.createSVGPoint();
      point.x = touch.clientX;
      point.y = touch.clientY;
      return point.matrixTransform(svg.getScreenCTM().inverse());
    };
    const cancelWheel = () => {
      cancelAnimationFrame(wheelFrame);
      wheelFrame = 0;
    };

    const getPinch = (touches) => {
      const first = svgPoint(touches[0]);
      const second = svgPoint(touches[1]);

      return {
        distance: Math.hypot(
          second.x - first.x,
          second.y - first.y
        ),
        point: {
          x: (first.x + second.x) / 2,
          y: (first.y + second.y) / 2
        }
      };
    };

    return {
      cancelWheel,
      haltEventListeners: [
        "touchstart",
        "touchmove",
        "touchend",
        "touchleave",
        "touchcancel"
      ],

      init({ svgElement, instance }) {
        svg = svgElement;

        const animateWheel = () => {
          const current = instance.getZoom();
          const remaining = Math.log(wheelZoom / current);

          if (Math.abs(remaining) < 0.002) {
            instance.zoomAtPoint(wheelZoom, wheelPoint);
            wheelFrame = 0;
            return;
          }

          instance.zoomAtPoint(
            current * Math.exp(remaining * 0.2),
            wheelPoint
          );
          wheelFrame = requestAnimationFrame(animateWheel);
        };

        this.onWheel = (event) => {
          event.preventDefault();

          const unit =
            event.deltaMode === 1
              ? 16
              : event.deltaMode === 2
                ? window.innerHeight
                : 1;
          const delta = Math.max(
            -120,
            Math.min(120, event.deltaY * unit)
          );
          const base = wheelFrame ? wheelZoom : instance.getZoom();

          wheelPoint = svgPoint(event);
          const { min, max } = getZoomLimits();
          wheelZoom = Math.max(min, Math.min(max, base * Math.exp(-delta * 0.0015)));

          if (!wheelFrame) {
            wheelFrame = requestAnimationFrame(animateWheel);
          }
        };

        this.onTouchStart = (event) => {
          cancelWheel();
          drag = null;
          pinch = null;
          if (event.touches.length === 1 && canPanTouch()) {
            event.preventDefault();
            drag = svgPoint(event.touches[0]);
            return;
          }
          if (event.touches.length !== 2) return;

          event.preventDefault();
          pinch = {
            ...getPinch(event.touches),
            zoom: instance.getZoom()
          };
        };

        this.onTouchMove = (event) => {
          if (drag && event.touches.length === 1) {
            event.preventDefault();
            const next = svgPoint(event.touches[0]);
            instance.panBy({ x: next.x - drag.x, y: next.y - drag.y });
            drag = next;
            return;
          }
          if (!pinch || event.touches.length !== 2) return;

          event.preventDefault();
          const next = getPinch(event.touches);

          instance.zoomAtPoint(
            pinch.zoom * (next.distance / pinch.distance),
            pinch.point
          );
          instance.panBy({
            x: next.point.x - pinch.point.x,
            y: next.point.y - pinch.point.y
          });
          pinch.point = next.point;
        };

        this.onTouchEnd = (event) => {
          if (event.touches.length < 2) pinch = null;
          drag = event.touches.length === 1 && canPanTouch()
            ? svgPoint(event.touches[0]) : null;
        };
        this.onTouchCancel = () => { pinch = null; drag = null; };

        this.onMouseDown = (event) => {
          if (event.button !== 0) {
            event.stopImmediatePropagation();
            return;
          }
          cancelWheel();
        };
        svg.addEventListener("mousedown", this.onMouseDown, true);
        svg.addEventListener("wheel", this.onWheel, { passive: false });
        svg.addEventListener("touchstart", this.onTouchStart, { passive: false });
        svg.addEventListener("touchmove", this.onTouchMove, { passive: false });
        svg.addEventListener("touchend", this.onTouchEnd);
        svg.addEventListener("touchcancel", this.onTouchCancel);
      },

      destroy() {
        cancelWheel();
        svg.removeEventListener("mousedown", this.onMouseDown, true);
        svg.removeEventListener("wheel", this.onWheel);
        svg.removeEventListener("touchstart", this.onTouchStart);
        svg.removeEventListener("touchmove", this.onTouchMove);
        svg.removeEventListener("touchend", this.onTouchEnd);
        svg.removeEventListener("touchcancel", this.onTouchCancel);
      }
    };
  };

  const attachViewer = (svg, mermaidSource) => {
    if (svg.dataset.panZoomReady === "true") return;
    svg.classList.add("mermaid-screen");
    const bounds = svg.getBoundingClientRect();
    if (!bounds.width || !bounds.height) {
      const observer = new ResizeObserver(() => {
        const visible = svg.getBoundingClientRect();
        if (!visible.width || !visible.height) return;
        observer.disconnect();
        requestAnimationFrame(() => attachViewer(svg, mermaidSource));
      });
      observer.observe(svg);
      return;
    }
    svg.dataset.panZoomReady = "true";

    const previousParent = svg.parentElement;
    const viewer = document.createElement("section");
    viewer.className = "mermaid-viewer";
    viewer.setAttribute("aria-label", "Interactive Mermaid diagram");

    previousParent.insertBefore(viewer, svg);
    viewer.appendChild(svg);
    previousParent.classList.add("mermaid-viewer-host");

    const nativeBounds = svg.viewBox.baseVal;
    const aspectRatio = nativeBounds.width / nativeBounds.height;

    // svg-pan-zoom removes the SVG viewBox. Explicit dimensions prevent
    // the browser fallback height of 150px described in its documentation.
    svg.style.width = "100%";
    svg.style.height = "100%";
    svg.style.maxWidth = "none";

    let panZoom;
    let fittedZoom;
    let zoomLimits;
    let fitMode = true;
    let updatingView = false;
    const markManual = () => { if (!updatingView) fitMode = false; };
    const canPanTouch = () => panZoom && panZoom.getZoom() > fittedZoom * 1.001;
    const syncTouchAction = () => { svg.style.touchAction = canPanTouch() ? "none" : "pan-y"; };
    const fittedLimits = () => ({ min: fittedZoom * MIN_ZOOM, max: fittedZoom * MAX_ZOOM });
    const getZoomLimits = () => zoomLimits;
    const syncZoomBounds = () => {
      const { width, height, realZoom, viewBox } = panZoom.getSizes();
      // resize() rebases the library's relative zoom; derive fit from actual SVG units.
      const referenceZoom = realZoom / panZoom.getZoom();
      fittedZoom = Math.min(width / viewBox.width, height / viewBox.height) / referenceZoom;
      zoomLimits = fittedLimits();
      const { min, max } = zoomLimits;
      panZoom.setMinZoom(min);
      panZoom.setMaxZoom(max);
      syncTouchAction();
    };
    const fitDiagram = () => {
      updatingView = true;
      zoomLimits = fittedLimits();
      const { min, max } = zoomLimits;
      panZoom.setMinZoom(min);
      panZoom.setMaxZoom(max);
      panZoom.zoom(fittedZoom);
      panZoom.center();
      updatingView = false;
      fitMode = true;
      syncTouchAction();
    };
    const viewerEvents = createViewerEvents(canPanTouch, getZoomLimits);
    panZoom = svgPanZoom(svg, {
      onZoom: () => { markManual(); syncTouchAction(); },
      onPan: markManual,
      panEnabled: true,
      zoomEnabled: true,
      mouseWheelZoomEnabled: false,
      dblClickZoomEnabled: true,
      controlIconsEnabled: false,
      customEventsHandler: viewerEvents,
      zoomScaleSensitivity: 0.25,
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
      fit: false,
      center: true,
      contain: false
    });

    const toolbar = document.createElement("div");
    toolbar.className = "mermaid-viewer__toolbar";
    toolbar.setAttribute("role", "group");
    toolbar.setAttribute("aria-label", "Diagram controls");
    let copyTimer;
    const status = document.createElement("p");
    status.className = "mermaid-viewer__status";
    status.setAttribute("role", "status");
    viewer.appendChild(status);
    const fullscreenSupported = document.fullscreenEnabled && viewer.requestFullscreen;
    toolbar.append(
      makeButton("out", "Zoom out"),
      makeButton("in", "Zoom in"),
      makeButton("fit", "Fit diagram to viewer"),
      makeButton("reset", "Reset zoom"),
      makeButton("copy", "Copy Mermaid source")
    );
    if (fullscreenSupported) toolbar.appendChild(makeButton("fullscreen", "Open fullscreen"));
    viewer.appendChild(toolbar);

    // Mermaid diagrams vary considerably in their native dimensions. Start
    // with the whole diagram visible instead of an arbitrary 100% crop.
    syncZoomBounds();
    fitDiagram();

    toolbar.addEventListener("click", async (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;
      viewerEvents.cancelWheel();

      switch (button.dataset.action) {
        case "out":
          panZoom.zoomOut();
          break;
        case "in":
          panZoom.zoomIn();
          break;
        case "fit":
        case "reset":
          fitDiagram();
          break;
        case "copy": {
          clearTimeout(copyTimer);
          const title = "Copy Mermaid source";
          try {
            await copyText(mermaidSource || "");
            button.title = "Copied";
            button.setAttribute("aria-label", "Copied");
          } catch {
            button.title = "Copy failed";
            button.setAttribute("aria-label", "Copy failed");
          }
          copyTimer = window.setTimeout(() => {
            button.title = title;
            button.setAttribute("aria-label", title);
          }, 1500);
          break;
        }
        case "fullscreen":
          try {
            if (document.fullscreenElement === viewer) await document.exitFullscreen();
            else await viewer.requestFullscreen();
          } catch {
            status.textContent = "Fullscreen is unavailable in this browser.";
          }
          break;
      }
    });

    const refresh = () => {
      viewerEvents.cancelWheel();
      const box = viewer.getBoundingClientRect();
      if (!box.width || !box.height) return;
      if (document.fullscreenElement === viewer) viewer.style.removeProperty("height");
      if (document.fullscreenElement !== viewer && Number.isFinite(aspectRatio) && aspectRatio > 0) {
        const styles = getComputedStyle(viewer);
        const width = viewer.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight);
        const chrome = parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom) + 2;
        const height = Math.max(160, Math.min(width / aspectRatio, window.innerHeight * 0.7));
        viewer.style.height = `${height + chrome}px`;
      }
      const viewport = svg.getBoundingClientRect();
      if (!viewport.width || !viewport.height) return;
      const previous = panZoom.getSizes();
      const pan = panZoom.getPan();
      const center = {
        x: (previous.width / 2 - pan.x) / previous.realZoom,
        y: (previous.height / 2 - pan.y) / previous.realZoom
      };
      updatingView = true;
      panZoom.resize();
      syncZoomBounds();
      if (fitMode) {
        fitDiagram();
      } else {
        const current = panZoom.getSizes();
        const zoom = panZoom.getZoom() * previous.realZoom / current.realZoom;
        const { min, max } = getZoomLimits();
        // Wheel, mouse controls and touch gestures share the extended limits.
        zoomLimits = { min: Math.min(min, zoom), max: Math.max(max, zoom) };
        panZoom.setMinZoom(zoomLimits.min);
        panZoom.setMaxZoom(zoomLimits.max);
        panZoom.zoom(zoom);
        const scale = panZoom.getSizes().realZoom;
        panZoom.pan({ x: current.width / 2 - center.x * scale, y: current.height / 2 - center.y * scale });
      }
      updatingView = false;
    };
    let refreshFrame = 0;
    const scheduleRefresh = () => {
      if (refreshFrame) return;
      refreshFrame = requestAnimationFrame(() => {
        refreshFrame = 0;
        refresh();
      });
    };
    new ResizeObserver(scheduleRefresh).observe(viewer);
    // Viewport height can change without changing the inline viewer's width.
    window.addEventListener("resize", scheduleRefresh);
    viewer.addEventListener("fullscreenchange", () => {
      viewerEvents.cancelWheel();
      const button = toolbar.querySelector('[data-action="fullscreen"]');
      if (button) {
        const title = document.fullscreenElement === viewer ? "Exit fullscreen" : "Open fullscreen";
        button.title = title;
        button.setAttribute("aria-label", title);
      }
      scheduleRefresh();
    });
  };

  const start = async () => {
    if (!window.mermaid || !window.svgPanZoom) {
      console.warn("Mermaid viewer dependencies did not load.");
      return;
    }

    const config = (theme) => ({
      startOnLoad: false,
      theme,
      flowchart: { useMaxWidth: false }
    });
    mermaid.initialize(config(mermaidTheme));

    // Preserve the original fenced source before Mermaid replaces it with SVG.
    const sourceByNode = new Map();
    document.querySelectorAll(".language-mermaid").forEach((node) => {
      const code = node.querySelector("code");
      sourceByNode.set(node, code ? code.textContent : node.textContent);
    });

    // Mermaid v10+ recommends run(), not init(). The existing site syntax
    // renders code fences into elements with the language-mermaid class.
    await mermaid.run({ querySelector: ".language-mermaid" });
    const diagrams = [...document.querySelectorAll(".language-mermaid svg")];
    if (mermaidTheme === "dark") mermaid.initialize(config("default"));
    try {
      for (const [index, svg] of diagrams.entries()) {
        const source = sourceByNode.get(svg.closest(".language-mermaid")) || "";
        let printSvg = svg;
        if (mermaidTheme === "dark") {
          try {
            const result = await mermaid.render(`mermaid-print-${index}`, source);
            const template = document.createElement("template");
            template.innerHTML = result.svg;
            printSvg = template.content.querySelector("svg");
          } catch (error) {
            console.warn("Unable to prepare light Mermaid print image; using the original diagram.", error);
          }
        }
        // Capture the untouched viewBox before svg-pan-zoom changes the SVG.
        const image = makePrintImage(printSvg, printSvg === svg && mermaidTheme === "dark");
        svg.after(image);
        attachViewer(svg, source);
      }
    } finally {
      mermaid.initialize(config(mermaidTheme));
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
