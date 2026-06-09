---
title: "eolchecker 0.1.1 released"
tags:

- eol
- eos
- Asset management
- Utility
- Community contribution
- Open Source
---

I released eolchecker 0.1.1 today.

This is a small maintenance release focused on dependency updates and package housekeeping. No new functionality has been added, and there are no changes to the user-facing command-line interface.

The project itself remains intentionally simple. It gathers end-of-life information for software and hardware from public sources, stores the data locally, and allows quick queries without repeatedly browsing vendor websites or lifecycle portals.

While the changes in this release are relatively minor, keeping dependencies current is still part of maintaining a tool. Small utilities have a tendency to sit untouched for long periods, which is exactly how outdated dependencies accumulate. This release is mostly about preventing that drift.

For those unfamiliar with the project, eolchecker can be installed with:

```bash
pipx install eolchecker
```

Or you can just update:

```bash
pipx upgrade eolchecker
```

The source code is available on GitHub, and the package can be installed directly from PyPI.

As before, software lifecycle information is obtained from the endoflife.date project, while hardware lifecycle information is collected from publicly available vendor support lifecycle pages.
