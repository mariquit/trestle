# Working on Trestle skills

Keep one source file per skill at `<name>.md` in the repository root. The installer exposes it as `<name>/SKILL.md`; do not edit installed copies. `CATALOG` in `install.ts` is the skill catalog.

Start source files, tests, build scripts, and hooks with a copyright comment and an `SPDX-License-Identifier: Apache-2.0` comment. Use the file's comment syntax and keep any shebang on the first line. For skill Markdown files, use the license and copyright fields in frontmatter instead.

## Frontmatter schema

Use this exact field order and indentation. `author` is optional; all other fields shown are required. Blank lines in frontmatter are allowed. Do not add extra keys, comments, quoted YAML values, or block scalars. Lint preserves the existing `de-slop` argument and capabilities and the `terse` coding-instructions flag as exceptions; do not copy those fields to new skills.

```yaml
---
name: example-skill
description: Describe the outcome and its scope. Use when the user runs `/example-skill` or asks to "verify an example".
author: John Anthony Mariquit <john@mariquit.com>
license: Apache-2.0
metadata:
  copyright: Copyright (c) 2026 John Anthony Mariquit <john@mariquit.com>
---
```

- Match `name` to the source filename stem and installed directory. Use a unique ID of 1–64 characters matching `[a-z0-9]+(-[a-z0-9]+)*`.
- Keep the description on one line, at most 1024 characters. End with the exact `Use when the user runs ... or asks to ...` sentence shown above, substituting the ID and one natural-language trigger.
- Start description, author, and copyright holder with an ASCII letter. Use plain text without tabs, trailing whitespace, YAML implicit values such as `true`, `: `, a terminal colon, or inline YAML comments. Use the applicable attribution, not the example by default. Preserve third-party notices and rights.
- Include a nonempty Markdown body. Define the job, boundaries, verification, and output. Separate observations from assumptions. Respect existing project conventions, decisions, and uncommitted work. Avoid runtime-specific tool names and unrelated approval gates.
- Update the README overview and relevant SDLC mapping when adding or changing skills. Run `node tests/check_skills.ts` and `node --test tests/*.test.ts`; record representative OpenCode behavior trials before promotion. See [CONTRIBUTING.md](CONTRIBUTING.md) for the local workflow.

If `act` is on PATH and this change would make GitHub run a test, build, or release workflow under `.github/workflows/`, load the `act` skill and run that workflow locally before finishing; if `act` is not installed, skip.
