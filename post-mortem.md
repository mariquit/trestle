---
name: post-mortem
description: Investigate software incidents by correlating Datadog and incident logs with GitHub commits, deployments, and runtime evidence, then generate a standalone HTML report. Use when the user runs `/post-mortem` or asks to "investigate this incident".
author: John Anthony Mariquit <john@mariquit.com>
license: Apache-2.0
metadata:
  copyright: Copyright (c) 2026 John Anthony Mariquit <john@mariquit.com>
---

# Incident investigation and HTML report

Start with an incident ID, URL, or supplied incident evidence. Use a starting PR, commit, or deployment run when supplied. Treat investigation as read-only. Use authorized connectors or CLI reads. Do not rerun jobs, apply infrastructure, edit the incident, or publish the report unless separately requested.

## Investigation workflow

1. **Deep dive into the incident.** Read the incident timeline, postmortem, and linked telemetry. Record the observed symptoms, onset, deployment and recovery times, affected components, and the reported explanation. Note discrepancies between first observed failure, recorded impact start, and incident declaration. Use a consistent timezone and retain source precision. Treat summaries as leads and corroborate causal claims with primary records.
2. **Work backward through commit history.** Start at the supplied PR or deployed revision. Read its metadata, actual diff, merge commit, and base. Trace relevant prior merges, module pins, and reusable workflows until the history explains what was deployed, what triggered deployment, and where the behavior originated. A commit that triggers a release may only surface changes already on the base branch. Pin source links to the revision that executed when run logs expose it, especially for reusable workflows referenced by a mutable branch or tag.
3. **Correlate deployment and runtime evidence.** Check the actual job logs, reviewed artifacts, and observed runtime state in timestamp order. Track which artifact or configuration was previewed, which was executed, and what changed between those points. Compare an unaffected service, region, or run when a meaningful comparison is available. Cite exact commits, job pages, plan comments, telemetry, or postmortem sections. Label job links as logs. State whether a value came from an artifact, a rendered plan, or observed runtime data.
4. **Analyze the causal chain.** Explain what each release changed, how those changes interacted, why traffic or another dependency failed, and why existing controls did or did not intervene. Distinguish verified observations from inferences and open questions. Use conflicting and unaffected evidence to test the explanation. If a source is unavailable, state what it would verify and qualify the corresponding claim.
5. **Recommend controls and verify follow-up.** Tie each proposed control to the failure step it could interrupt. Explain whether it could have prevented the observed incident, reduced its impact, or only narrowed the exposure. Check remediation against the actual failure mechanism. Verify and date the follow-up status and distinguish a proposed fix, a merged change, adoption by the affected service, and production validation. Record owners only when the source identifies them.

## Report output

Use [assets/report.html](assets/report.html) as the structure and styling reference. Fill its comments and remove any unused placeholders. Deliver a single local, self-contained HTML document with inline CSS, source links, and working section navigation. Use the requested output path. Otherwise save to `ir-<incident-id>.html` in the working directory, or `incident-post-mortem.html` when there is no incident ID.

Keep these section headings and their order:

1. **Root Cause Summary** gives the mechanism and the most important qualification in a short paragraph.
2. **Findings** summarizes what the cross-check confirmed, changed, or added beyond the original incident notes.
3. **Commit History** traces relevant changes backward from the deployment or starting PR. Cite full commit links and describe each commit's role.
4. **Evidence** shows the decisive comparisons, relevant timestamps, and short source excerpts. Use a table when comparing services, artifacts, or runs.
5. **Analysis** explains what the findings mean, how the failure propagated, and why safeguards failed. Keep interpretations tied to the evidence.
6. **What could have prevented the outage** prioritizes specific controls and explains where each would have intervened.
7. **Follow-up and remaining exposure** records verified remediation status and gaps, with an as-of date.

Keep incident impact or recovery details where they establish causality or clarify a finding. Escape source excerpts as text and omit credentials, sensitive personal data, and tokens in source URLs. Before handing over the file, check the seven headings, navigation anchors, source links, absence of template markers, and evidence coverage for the causal and remediation claims.
