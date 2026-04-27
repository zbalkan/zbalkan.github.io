---
title: "ClipboardMonitor 2.0 released"
tags:
  - DLP
  - AMSI
  - Detection
  - Clipboard
  - ClipboardMonitor
  - Data masking
  - Utility
  - Community contribution
  - Open Source
  - PAN
galleryScreenshot:
  - url: /assets/clipboard-screenshot.png
    image_path: /assets/clipboard-screenshot.png
galleryScreenshotRisk:
  - url: /assets/clipboard-screenshot-risk.png
    image_path: /assets/clipboard-screenshot-risk.png
galleryLogs:
  - url: /assets/clipboard-log-pan.png
    image_path: /assets/clipboard-log-pan.png
  - url: /assets/clipboard-log-amsi.png
    image_path: /assets/clipboard-log-amsi.png
---

I started [ClipboardMonitor](https://github.com/zbalkan/ClipboardMonitor) because I was curious about one narrow question: what happens between copying text in a browser and pasting it into privileged Windows surfaces?

The first version was intentionally small. It used simple pattern checks for obvious card-like data and a basic masking flow. That experiment taught me a lot about clipboard internals and where user-mode defenses can still be practical.

I postponed writing this release post for a while. I finally finished it after reading this excellent write-up on chained social-engineering and notification abuse: [ToastFix: chaining a ClickFix attack with toast notifications](https://0xh4lpy.medium.com/toastfix-chaining-a-clickfix-attack-with-toast-notifications-72082694fef9).

## What 2.0 focuses on

ClipboardMonitor 2.0 keeps the same design goal: small, auditable code with direct platform APIs and minimal moving parts. The current flow combines lightweight layers:

1. **Clipboard listener** using `WM_CLIPBOARDUPDATE`.
2. **Browser-origin risk scan** for suspicious command text plus AMSI verdicting.
3. **PAN detection/masking** for likely payment-card data.
4. **Shortcut correlation guard** to warn when risky copied text is likely heading into elevated execution paths.

For browser-origin text, ClipboardMonitor checks suspicious verbs (for example `pwsh`, `powershell`, `mshta`, `cmd`, `msiexec`) and submits clipboard content to AMSI for malware scoring. If content is flagged, clipboard text is overwritten and a toast notification is displayed.

For PAN-like strings, it identifies valid candidates, applies masking, scrubs/replaces clipboard content, and logs the incident.

{% include gallery id="galleryScreenshot" caption="Screenshot of PAN detection and AMSI alerts" %}

## ToastFix-inspired hardening

The ToastFix article pushed me to treat notification and clipboard chaining more seriously. In practical terms, I extended ClipboardMonitor so suspicious clipboard content that resembles scriptable execution chains and notification-driven lure patterns gets surfaced earlier in the pipeline.

This does **not** try to be a full anti-phishing product. The intent is narrower: make risky clipboard-to-execution transitions more visible, and make the warning path immediate.

## Run/elevation correlation guard

ClipboardMonitor tracks a short risk window (**30 seconds**) after a suspicious browser copy. Within that window, it watches for:

- **Win+R** (Run dialog)
- **Win+X, then I** (elevated shell path)

When triggered, the tool raises a warning with sanitized context so the user can see why the action was blocked or flagged.

{% include gallery id="galleryScreenshotRisk" caption="Screenshot of risk correlation with Run / elevated-shell shortcuts" %}

## Logging and observability

Incidents are written to **Windows Event Log**:

- Log: `Application`
- Source: `ClipboardMonitor`

The logs are there for debugging, false-positive triage, and AV/AMSI behavior differences between hosts.

{% include gallery id="galleryLogs" caption="Screenshot of event logs" %}

## Practical test flow

If you want to test in a lab machine:

1. Start ClipboardMonitor.
2. Copy suspicious command text from a browser tab.
3. Press **Win+R** or **Win+X, I**.
4. Confirm the warning and event log entries.

For PAN checks, use test-card numbers only:

| Brand                       | Number              |
| --------------------------- | ------------------- |
| Visa                        | 4242424242424242    |
| Visa (debit)                | 4000056655665556    |
| Mastercard                  | 5555555555554444    |
| Mastercard (2-series)       | 2223003122003222    |
| Mastercard (debit)          | 5200828282828210    |
| Mastercard (prepaid)        | 5105105105105100    |
| American Express            | 378282246310005     |
| American Express            | 371449635398431     |
| Discover                    | 6011111111111117    |
| Discover                    | 6011000990139424    |
| Discover (debit)            | 6011981111111113    |
| Diners Club                 | 3056930009020004    |
| Diners Club (14-digit card) | 36227206271667      |
| JCB                         | 3566002020360505    |
| UnionPay                    | 6200000000000005    |
| UnionPay (debit)            | 6200000000000047    |
| UnionPay (19-digit card)    | 6205500000000000004 |

*Test cards from [Stripe Docs](https://docs.stripe.com/testing?testing-method=card-numbers)*

## Scope and limits

ClipboardMonitor is intentionally narrow:

- It focuses on text clipboard paths, not rich-content DLP coverage.
- Hook/interception behavior can vary in locked-down enterprise environments.
- AMSI outcomes depend on the installed antimalware provider and policy.

So this remains a local, hobby-grade defensive utility — useful for visibility and experimentation, but not an enterprise DLP replacement.

If you test it, please share logs, false positives, crashes, and AV-specific quirks via issues/PRs. That feedback improves the project quickly.
