(function () {
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
        window.location.assign("/game/");
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