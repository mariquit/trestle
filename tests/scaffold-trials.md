# OpenCode scaffold trials

These trials used OpenCode v2.2.5 with `opencode/big-pickle` and temporary project-local copies of `scaffold.md`.

## Workspace inspection and Preact revision

After a successful smoke prompt, asked `@scaffold` to choose a stack for a new FinOps Dashboard PWA with online-only reports. The temporary workspace documented an existing reporting API in `docs/adr/001-reporting-api.md`; the prompt did not mention it. OpenCode read and cited the ADR, recommended Vite, Preact, Wouter, and shadcn/ui, and omitted a new Go service and database. It used the three requested headings and noted that API access still needed verification. This trial checked stack selection and response structure, not package compatibility or a working deployment.

## Reuse and constraints revision

After a successful smoke prompt, asked `@scaffold` for a frontend-only FinOps Dashboard PWA whose existing API already authorizes and serves online spend and budget reports. OpenCode loaded the skill, recommended Vite, React, and shadcn/ui, and reused the API and datastore without adding a Go service or database. It flagged browser access to the API as the remaining constraint that could affect the frontend-only choice. This trial checked the recommendation, not API compatibility.

## Stack-selection-only revision

After a successful smoke prompt, asked `@scaffold` to recommend a stack for a frontend-only FinOps Dashboard PWA that reads online reports from an existing API. Expected Vite, React, and shadcn/ui without a new Go service or database. OpenCode reported loading the skill, then attempted to read two files the skill does not reference (`skills/project-decisions.md` and `skills/architecture-matrix.md`). The run timed out after 45 seconds without a recommendation, so this behavior remains unverified.

## Hosting and storage revision

After a successful smoke prompt, asked `@scaffold` for a plan for a new survey PWA on AWS with offline drafts, responses listed by survey, and hosted LLM summaries over HTTP. The prompt specified no relational requirements, no shared ephemeral state, and no measured bottleneck.

OpenCode loaded the skill and proposed Vite, React, and shadcn/ui with IndexedDB for drafts, one Go API, and DynamoDB keyed by survey and response ID. It explicitly omitted PostgreSQL, Valkey, Python, and Rust given the stated requirements. This was a planning trial; no application was built or deployed.

## Application architecture revision

After a successful smoke prompt, asked `@scaffold` for a plain-text plan for a new crowd-sourced survey PWA with offline drafts, durable responses, high expected validation volume, and hosted LLM summaries over HTTP. The prompt specified no existing stack or measured bottleneck and asked what to deploy, what to omit, and what would change the choice.

Expected one Go application with server-rendered pages, browser storage for offline drafts, PostgreSQL for responses, and in-process validation and model calls. OpenCode loaded the skill and proposed that stack. It ruled out React/Vite, a Python worker, Rust, and Redis, and explained what requirements or evidence would justify each split. This trial tested planning, not a running application or its performance.

## Polyglot revision

Asked `@scaffold` for a plain-text plan, without edits, for embeddings in a Go monolith with a Python-only model SDK. Expected a private Python worker, a contract defined before implementation, and a Go client that owns orchestration. The plan proposed a private gRPC contract, a Go client with deadlines and bounded retries, caller-side telemetry, a Compose service, and success and failure checks through the Go caller. This was a planning trial, not a running integration test. Rust and PWA behavior were not exercised.

## Earlier draft

The model answered a smoke prompt before these trials.

| Input | Expected | Observed |
| --- | --- | --- |
| Ask `@scaffold` to implement and verify `GET /healthz` returning 200 with body `ok` in a fresh project without a chosen language. | Use Go in-process, add a test, and check the running endpoint without adding another runtime. | Created a standard-library Go server and test. `go test ./... -v` and `go vet ./...` passed. An HTTP request to the running server returned `200` and `ok`. |
| Ask `@scaffold` for a plan only for the same endpoint where an accepted ADR assigns HTTP to the existing Python application. | Follow the ADR, keep the work in Python, and leave files unchanged. | Proposed extending `Handler.do_GET` in `app.py` and checking the running endpoint and the existing 404 fallback. No files were edited. |

The initial Python trial identified the correct owner but hit `ECONNRESET` before returning the plan. The successful rerun explicitly requested a plain-text plan without opening a review tool. The trials did not exercise a Python worker, Rust integration, or PWA behavior.
