(function () {
  console.log(
    "%c👾 Psst... looking for a secret? Try this: ⬆️ ⬆️ ⬇️ ⬇️ ⬅️ ➡️ ⬅️ ➡️ 🅱️ 🅰️",
    "color: #00ff00; font-family: monospace; font-size: 14px; font-weight: bold; text-shadow: 1px 1px 2px black;"
  );

  if (window.location.pathname === "/game/" || window.location.pathname === "/game/index.html") {
    return;
  }

  const sequence = [
    "arrowup",
    "arrowup",
    "arrowdown",
    "arrowdown",
    "arrowleft",
    "arrowright",
    "arrowleft",
    "arrowright",
    "b",
    "a"
  ];

  const timeoutMs = 1500;

  let index = 0;
  let timeoutId = null;

  function resetSequence() {
    index = 0;

    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
      timeoutId = null;
    }
  }

  function restartTimeout() {
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
    }

    timeoutId = window.setTimeout(resetSequence, timeoutMs);
  }

  document.addEventListener("keydown", function (event) {
    const key = event.key.toLowerCase();

    if (key === sequence[index]) {
      index += 1;

      if (index === sequence.length) {
        resetSequence();
        const unlockedAt = Date.now();
        sessionStorage.setItem("fatigueUnlocked", "1");
        sessionStorage.setItem("fatigueUnlockedAt", String(unlockedAt));
        window.location.href = `/game/?fatigueUnlocked=1&fatigueUnlockedAt=${encodeURIComponent(unlockedAt)}`;
        return;
      }

      restartTimeout();
      return;
    }

    resetSequence();

    if (key === sequence[0]) {
      index = 1;
      restartTimeout();
    }
  });
})();
