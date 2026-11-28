# Frontend React workflow gate for OpenCode V2

This plugin is required by `/frontend-react`. It is for Vite + React DOM only. Next.js, Vue, Remix, React Router, TanStack, Svelte, and React Native are out of scope. It does not require an MCP server or run shadcn commands itself.

## Install

Run `./install.sh frontend-react` from the Trestle checkout, or add `--upgrade` to replace an older installation. The installer requires Node.js 24 or later and npm. OpenCode V2 discovers the required plugin through `$XDG_CONFIG_HOME/opencode/plugins/trestle-frontend-react.ts`, or `~/.config/opencode/plugins/trestle-frontend-react.ts` if XDG is unset. No config edits are required.

Invoke `/frontend-react` in OpenCode V2. The plugin registers the slash command; `@frontend-react` also loads the skill. If both plugins are installed, the HTML-first gate can also track CSS edits.

## Workflow

| Stage | Checkpoint |
| --- | --- |
| Discover | `frontend_react_discover` checks the selected package's direct dependencies, Vite script or config, and React DOM bootstrap. It returns a local `components.json` summary that omits registry configuration. |
| Plan | `frontend_react_plan` records the layout, mobile reading order, interaction states, and component contracts. Registry additions require an inspection reference, expected files and dependencies, and theme impact. |
| Implement and verify | Make requested changes. `frontend_react_verify` records checks and results. A subsequent tracked change invalidates the report. |
| Stop | `frontend_react_stop` ends discovery or planning without implementation. |

The gate is inactive until the skill or command is invoked. It blocks structured writes, edits, and supported patches to JSX, TSX, CSS, HTML, and `components.json` before discovery and planning. It tracks edits through those tools. It is not a sandbox: shell commands, other plugins, and external edits may bypass it. Registry previews and browser results are reported by the agent, not independently verified by the plugin.

The component and block inspection workflow draws on the source, demo, and metadata tools in [shadcn-ui-mcp-server](https://github.com/Jpisnice/shadcn-ui-mcp-server). It uses official shadcn/ui docs and CLI previews instead of importing that server. The Vite, TypeScript, and theme discovery checks also draw on the [react-vite-shadcn-ui template](https://github.com/dan5py/react-vite-shadcn-ui); its specific tooling and aliases are not requirements.

## Development checks

```sh
npm ci --prefix plugins/frontend-react
npm test --prefix plugins/frontend-react
npm run typecheck --prefix plugins/frontend-react
```

## OpenCode trials

On OpenCode 2.2.5 with `opencode/big-pickle`, a scratch Vite + React DOM package used a React bootstrap, Tailwind v4, and matching `~` aliases. The model answered a smoke prompt. A discovery-only contact screen review using `@frontend-react` reached `PLAN` and reported `src/styles/globals.css` without editing. A separate plan-only run reached `IMPLEMENT` after submitting a native-component plan but hit `ECONNRESET` before its final response. Neither trial verified a rendered UI or executed a registry install.
