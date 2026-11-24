---
name: scaffold
description: Recommend a technology stack using the project's existing decisions or the architecture matrix for a new project. Use when the user runs `/scaffold` or asks to "choose a stack".
license: Apache-2.0
metadata:
  copyright: Copyright (c) 2026 John Anthony Mariquit <john@mariquit.com>
---

# Application stack selection

Choose a stack for the application as a whole. Keep the existing stack when it meets the requirements. For a new project, select only the matrix rows that fit the product and its hosting target. This skill recommends a stack; it does not generate files or prescribe build and deployment steps.

## What changes the recommendation

- **Existing capabilities.** Before asking the user or applying matrix defaults, inspect the repository root and the relevant app or service directory. Check `README.md` and `docs/adr/` for decisions; `go.mod`, `package.json`, `Cargo.toml`, and `pyproject.toml` for runtimes and dependencies; and Compose files such as `compose.yaml` or `docker-compose.yml`, Terraform `.tf` files, or CDK configuration such as `cdk.json` for services and hosting. Use API specs or service entry points to confirm what an existing service provides. Reuse an API, datastore, or service if it meets the requirement. A dependency alone does not establish that a service is deployed or usable.
- **Hard constraints.** Check that the selected components can run together on the intended host and fit any stated cost, data residency, or local development requirements. If no matrix option fits, explain the conflict rather than recommending an incompatible stack or silently adding a technology outside the matrix.
- **Missing information.** Ask one focused question if the answer could change the stack. For example, ask whether reports need to join records across accounts or only retrieve records by known keys. For gaps that do not change the choice, state the assumption and recommend a stack.

## Architecture scaffold matrix

The rows describe architecture roles, not components to install. Keep backend capabilities in the same Go service where practical. For each proposed split, name the requirement the current design cannot meet, explain why a simpler option is insufficient, and weigh the benefit against the added contract, deployment, and maintenance costs. If the evidence is missing, keep the simpler design and state what would change the decision.

| Concern | Language | Why / Reason | Selection rule |
| --- | --- | --- | --- |
| Simple HTML / Static Website / Blog | [Astro](https://github.com/withastro/astro) or [FastHTML](https://github.com/AnswerDotAI/fasthtml), with [Basecoat UI](https://github.com/hunvreus/basecoat) | Serverless hosting serves static content without an application server and can run request-time HTML when needed. | Use Astro static output for AWS S3 or Cloudflare Pages. Use FastHTML with a Lambda-compatible ASGI adapter on AWS Lambda if the site needs request-time HTML. |
| Backend APIs and frontend app core | Go | Go can serve APIs and keep business logic and background work together. | Use Go for new backend APIs or frontend app cores. Keep validation, auth, background work, orchestration, and external HTTP calls there by default. Do not create a second Go service solely for the UI. |
| Web app UI and PWA | Vite + [Preact](https://github.com/preactjs/preact) + [Wouter](https://github.com/molefrog/wouter) + [shadcn/ui](https://github.com/shadcn-ui/ui) | Vite handles builds, Preact renders the UI, Wouter handles client-side routes, and shadcn/ui provides reusable components. | Use this stack for a new interactive web app or PWA. Use `wouter-preact` and verify that the needed shadcn/ui components and their dependencies work with `preact/compat`. Do not introduce Next.js, Vue, Svelte, TanStack, React Router, Remix, or Angular. |
| Specialized data or model processing | Python worker | A private worker can isolate mandatory Python-only SDKs or local model dependencies. | Keep hosted model calls and ordinary data processing in the core if it can meet the requirements. Add Python only when a required capability depends on a Python library or runtime the core cannot replace. |
| Performance-critical compute | Rust library or service | Rust gives explicit control over memory and allocations in a narrow compute component. | Use Rust for a separate compute component when a representative profile identifies the bottleneck and a benchmark, including boundary overhead, shows that Rust meets a target the tuned core misses. Expected traffic or the presence of validation alone is not evidence. Use vetted libraries for cryptography, not new primitives. |
| Durable application state | DynamoDB | Durable state does not need a relational database when the application can read and write records by known keys. | Use DynamoDB for nonrelational state when the access patterns fit. Test against DynamoDB Local and deploy to managed DynamoDB on AWS. |
| Relational data structure | SQL (PostgreSQL) | Relational constraints and transactions protect application data across related records. | Use PostgreSQL when the model requires relational constraints, joins, or transactions across related records. Run it locally, in Docker, or on a managed service such as Amazon RDS for PostgreSQL. |
| Shared transient state | Valkey | Valkey can share short-lived state across replicas. | Keep transient state local if it need not be shared. Add Valkey only when the app requires shared ephemeral state and the existing stack cannot meet that need. |

## Example: FinOps Dashboard PWA

The dashboard compares monthly cloud spend with team budgets. Reports must join billing line items to account ownership and budgets. Reports are available only when online.

### Recommended Stack

- **Vite + Preact + Wouter + shadcn/ui** for the dashboard, with routes for spend and budget views and reusable filter controls.
- **One Go API** to import billing data, authorize report access, and serve spend and budget comparisons.
- **SQL (PostgreSQL)** to enforce relationships between spend records, accounts, and teams and join them for reporting.

### Omitted Components

PostgreSQL meets the storage requirements without DynamoDB. There is no shared transient state for Valkey and no Python-only dependency or measured compute bottleneck that warrants a Python worker or Rust component.

### Assumptions & Open Questions

This example assumes there is no existing reporting API. If an API already serves these comparisons to the browser, recommend only **Vite + Preact + Wouter + shadcn/ui** and reuse the API and its datastore.

## Output template

- **Recommended Stack:** Lead with one stack. For each component, say whether to reuse or add it and name the requirement it meets. Cite the workspace file that supports a reuse decision when available.
- **Omitted Components:** Name only plausible additions or alternatives and explain why they are not needed.
- **Assumptions & Open Questions:** State assumptions and unresolved constraints that affect the choice. Omit this section if there are none.
