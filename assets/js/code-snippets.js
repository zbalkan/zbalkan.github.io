(() => {
  const languageLabels = {
    bash: "Bash",
    shell: "Shell",
    sh: "Shell",
    powershell: "PowerShell",
    ps1: "PowerShell",
    python: "Python",
    py: "Python",
    javascript: "JavaScript",
    js: "JavaScript",
    typescript: "TypeScript",
    ts: "TypeScript",
    json: "JSON",
    yaml: "YAML",
    yml: "YAML",
    xml: "XML",
    html: "HTML",
    css: "CSS",
    scss: "SCSS",
    sql: "SQL",
    csharp: "C#",
    cs: "C#",
    kql: "KQL",
    regex: "Regex",
    ini: "INI",
    toml: "TOML",
    markdown: "Markdown",
    md: "Markdown",
    text: "Text",
    plaintext: "Text"
  };

  const start = () => {
    document.querySelectorAll(".page__content div.highlighter-rouge").forEach((block) => {
      if (block.classList.contains("language-mermaid")) {
        block.querySelector(".clipboard-copy-button")?.remove();
        return;
      }

      const languageClass = Array.from(block.classList)
        .find((className) => className.startsWith("language-"));
      const language = languageClass?.slice("language-".length) || "text";

      block.classList.add("code-snippet");
      block.dataset.codeLanguage =
        languageLabels[language.toLowerCase()] || language;
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
