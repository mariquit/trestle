# Frontend workflow gate for OpenCode

Version 0.2.0 ships with the frontend skill. The skill remains the design reference. The plugin does not embed or inject it, and it does not require an MCP server.

## Enable in one project

OpenCode **2.2.5** was tested. With Node.js 24 or later and npm available, run this from the Trestle checkout:

```sh
./install.sh frontend
```

Use `./install.sh --upgrade frontend` to replace an older installation. The installer prints the plugin directory it installed. Add that absolute path to the target project's `opencode.jsonc`, preserving existing `plugins` entries:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["/absolute/path/to/skills/frontend/plugin"]
}
```

Open a new session in that project. Ask OpenCode to inspect a UI file, or select the installed `frontend` skill, and check that the next model step shows `1_DISCOVER`. The plugin uses the [OpenCode V2 server SDK](https://opencode.ai/v2/docs/build/plugins/server), not the V1 `@opencode-ai/plugin` hook names.

## Checkpoints

| Stage | Next step |
| --- | --- |
| `IDLE` | No restrictions until the frontend skill is selected or successfully loaded with the skill tool, or a recognized inspection or edit tool targets a UI file. |
| `1_DISCOVER` | Call `submit_discovery` with the renderer, CSS entry point, design-system version or confirmed native setup, and audience and primary task. Supply a project-relative path and a literal, non-sensitive excerpt for each of renderer, CSS, and design-system evidence. The plugin checks the excerpts against local files, not whether the excerpts prove every claim. |
| `2_PLAN` | Call `submit_plan` with the layout, ordered mobile reading sequence, component markup and behavior ownership, and explicit treatment of empty, loading, validation, and error states. Explain why a state does not apply rather than leaving it blank. |
| `3_IMPLEMENT` | Edit UI files. The plugin tracks changed paths and can append static diagnostics to tool output. |
| `4_VERIFY` | Call `complete_verification` with checks run, the main design decision, and the passed, failed, and unverified items. At least one passed or unverified item is required. Calling the tool directly from implementation also enters verification. |
| `DONE` | The report is recorded, not necessarily all passing. Another tracked edit invalidates the report. Explicitly loading the skill again starts a new workflow. |

Checkpoint state is stored per session in OpenCode plugin storage. The status banner and compaction context describe that state, but neither controls it. Do not submit secrets or sensitive excerpts. Verification is agent-reported and is not independent proof that a check ran or that browser behavior passed.

## Enforcement limits

- The gate blocks structured `write`, `edit`, and supported `patch` calls targeting `.html`, `.jinja`, `.njk`, `.tsx`, `.vue`, `.svelte`, or `.css` before discovery and planning succeed. It is not a filesystem sandbox. Arbitrary shell, MCP, and external changes are not intercepted. Searches activate the gate when their structured file selector exposes a matching suffix, not from every result of a broad query.
- Post-edit lint analyzes static markup in each changed file up to 512 KiB. It cannot resolve template inheritance, dynamic rendering, or assets loaded across different files. Shell lint warns about `basecoat-cli` after the command; it does not block the command. These warnings do not replace browser or accessibility testing.
- If verification is missing after a tracked edit, the pre-idle hook requests one follow-up in the same execution. OpenCode 2.2.5 can already have streamed a final-text response before this hook runs. If the follow-up does not complete verification or the session is interrupted, the checkpoint stays pending. The plugin does not suppress final text or trap the session in a retry loop.

## Checks

```sh
npm ci --prefix plugins/frontend
npm test --prefix plugins/frontend
npm run typecheck --prefix plugins/frontend
```

The automated tests cover checkpoint order, rejected discovery evidence, edit invalidation, session isolation, storage restoration independent of compaction text, target matching, and lint diagnostics.

In a scratch project on OpenCode 2.2.5, attempts to create `probe.html` before discovery and before planning were both rejected by the `patch` tool. After both checkpoints, the patch succeeded and an unnamed SVG button produced `A11Y001`. When the session first attempted to go idle without verification, the pre-idle follow-up prompted a call to `complete_verification`. A subsequent manual compaction left the session's `DONE` status intact. The trial did not verify that the compaction summary itself included the discovery fields, exercise the standalone `write` or `edit` tools, or run browser checks.
