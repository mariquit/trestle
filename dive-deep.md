---
name: dive-deep
description: Resolve requirements before implementation by interviewing the user one decision at a time. Use when the user runs `/dive-deep` or asks to "interrogate this brief before we build".
license: Apache-2.0
metadata:
  copyright: Copyright (c) 2026 John Anthony Mariquit <john@mariquit.com>
---

# Interrogate the brief

1. Read the brief, applicable specs, and existing decisions. Separate agreed requirements from assumptions, conflicts, and gaps. Cite settled decisions and keep them fixed unless the user explicitly puts one back in scope.
2. Ask exactly one consequential question per turn. Prioritize a conflict that changes scope, behavior, or acceptance over lesser details. State the conflicting requirements and the choice to be made. Offer viable options and their main tradeoff when useful. Wait for an answer before asking another question.
3. Record the answer and use it to pick the next question. Probe observable behavior, boundary cases, failure handling, and non-goals only where the answer affects the outcome. If a question is deferred or unanswered, leave it open; do not pick a default silently.
4. When the user is ready to stop, return **Agreed requirements**, **Non-goals**, **Acceptance criteria** (observable checks), and **Open decisions**. Include references to governing decisions. Highlight choices worth recording with `/adr` without invoking it.

Do not write implementation code, scaffold a solution, or convert assumptions into decisions.
