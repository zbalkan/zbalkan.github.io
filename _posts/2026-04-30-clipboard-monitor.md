---
title: "ClipboardMonitor 2.0 Released"
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

I originally started [ClipboardMonitor](https://github.com/zbalkan/ClipboardMonitor) because I was curious about a fairly narrow question: what actually happens between copying text in a browser and pasting it into privileged Windows surfaces? Clipboard operations tend to be treated as mundane UI plumbing, yet they often sit quietly between untrusted content and sensitive execution paths. That made them interesting to me.

The first version of the tool was intentionally minimal. It used simple pattern checks for obvious PAN-like data, basic masking logic, and little else. The primary goal was not to build a serious DLP product, but to explore clipboard internals and to understand where lightweight user-mode interception can still be practical on modern Windows systems. That experiment proved useful enough to justify a second pass.

I first started writing this post on September 26, 2025. For various reasons, it stayed unfinished while the tool kept changing in small increments. Eight months later, I can finally publish it with ClipboardMonitor 2.0 in a shape that better reflects what I originally wanted to explore.

The final push came after reading this excellent write-up on chained social-engineering and notification abuse: [ToastFix: chaining a ClickFix attack with toast notifications](https://0xh4lpy.medium.com/toastfix-chaining-a-clickfix-attack-with-toast-notifications-72082694fef9). That piece reinforced something many defenders already know intuitively: small interaction chains matter. A copied command, a deceptive prompt, a keyboard shortcut, and a few seconds of user trust can be enough.

## What Changed in 2.0

ClipboardMonitor 2.0 keeps the same general philosophy as the first release: small, auditable code, direct use of platform APIs, and minimal abstraction where it adds no value. The project remains intentionally narrow in scope, but the internal pipeline is now more layered.

The current flow combines several lightweight controls. Clipboard changes are tracked through `WM_CLIPBOARDUPDATE`, browser-origin text is scanned for suspicious command patterns and submitted to AMSI, PAN-like values are identified and masked, and a short-lived correlation layer now watches for risky follow-up behavior after suspicious clipboard activity.

In practical terms, browser-origin clipboard text is checked for command-oriented patterns such as `powershell`, `pwsh`, `cmd`, `mshta`, or `msiexec`. Matching content is then submitted to AMSI for provider-backed scanning. If the content is flagged, ClipboardMonitor overwrites the clipboard and displays a warning toast. PAN-like values continue to be detected through validation and masking logic, with the clipboard scrubbed or replaced as appropriate.

{% include gallery id="galleryScreenshot" caption="Screenshot of PAN detection and AMSI alerts" %}

## ToastFix-Inspired Hardening

The ToastFix write-up pushed me to think more seriously about clipboard and notification chaining as part of social-engineering workflows. In response, I expanded ClipboardMonitor’s logic so suspicious clipboard content that resembles scriptable execution chains or notification-driven lure patterns can be surfaced earlier in the decision pipeline.

To be clear, this does **not** attempt to become a full anti-phishing or anti-social-engineering platform. That would be unrealistic and well outside the intended scope of the project. The goal is narrower: make risky clipboard-to-execution transitions more visible, and make that warning path immediate enough to be useful.

## Execution Correlation Guard

One of the more notable additions in 2.0 is a short-lived execution correlation guard. After suspicious browser-origin clipboard content is detected, ClipboardMonitor tracks a risk window of **30 seconds**. Within that period, it monitors for common shortcut paths associated with rapid command execution, specifically **Win+R** for the Run dialog and **Win+X, I** for the elevated shell path.

If that sequence occurs within the active risk window, the tool raises a warning and presents sanitized context so the user can understand why the action was flagged or blocked.

The logic here is intentionally heuristic. It is not trying to prove maliciousness. It is simply recognizing that suspicious clipboard content followed immediately by privileged execution shortcuts is often worth surfacing.

{% include gallery id="galleryScreenshotRisk" caption="Screenshot of risk correlation with Run / elevated-shell shortcuts" %}

## Logging and Observability

ClipboardMonitor now writes incidents into the **Windows Event Log**, using the standard `Application` log under the source name `ClipboardMonitor`.

This serves several purposes. First, it makes debugging easier when testing behavioral differences between hosts. Second, it provides visibility into AMSI or AV-provider variance, which can differ substantially depending on the installed stack and policy configuration. Third, it gives users a basic audit trail for false-positive triage.

{% include gallery id="galleryLogs" caption="Screenshot of event logs" %}

## Practical Test Flow

If you want to test the tool in a lab environment, the simplest workflow is straightforward. Start ClipboardMonitor, copy suspicious command text from a browser tab, and then invoke either **Win+R** or **Win+X, I**. If the correlation logic is functioning as expected, the warning path and corresponding event log entries should appear.

For PAN testing, use test-card numbers only.

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

## Scope and Limits

ClipboardMonitor remains intentionally narrow in scope, and it is important to be explicit about that. It focuses on text clipboard paths only. It is not attempting broad DLP coverage, rich-content inspection, or deep enterprise-grade policy enforcement. Hook and interception behavior may vary depending on endpoint hardening and enterprise restrictions, and AMSI outcomes remain dependent on the installed antimalware provider and local policy.

Accordingly, this should be viewed as a local defensive utility and research project rather than a serious enterprise DLP replacement. Its value lies primarily in visibility, experimentation, and exploring what small defensive controls can still achieve in user mode when applied thoughtfully.

If you test it, and especially if you encounter false positives, crashes, provider-specific AMSI quirks, or behavioral inconsistencies across hosts, feel free to open an issue or PR. Feedback of that kind is usually what improves these projects fastest.
