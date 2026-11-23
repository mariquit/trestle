# de-slop lint helper

Run `node tools/de-slop/bundle/lint.mjs <markdown-file>` from the repository root, or pass `-` to read from stdin. The helper prints a JSON array of `{rule_id, line, excerpt}` records. Lines are one-based; excerpts are literal text from the source. A scan with findings still exits successfully, and the helper never edits its input.

| Rule ID | Candidate condition |
| --- | --- |
| `dash-density` | A paragraph has at least three punctuation dashes and no more than 25 words per dash. |
| `stock-framing` | A sentence starts with a watched phrase, such as “Let's take a closer look.” |
| `repeated-contrast` | The document has at least two matches for watched contrast templates. |

The helper scans top-level prose paragraphs. It skips recognized frontmatter, headings, code, tables, block quotations, lists, and inline protected spans. It cannot determine whether an unmarked title or a turn of phrase is intentional. Review candidates in context, and continue the manual review even when the result is `[]`.

## OpenCode review trials

OpenCode v2.2.5, model `opencode/big-pickle`, Node.js v26.0.0. Both trials used a temporary project-local installation.

| Input | Expected | Observed |
| --- | --- | --- |
| Queue status note with “Let's take a closer look” followed by one sentence with three punctuation dashes | Cite framing and dash density; report without editing | The helper cited lines 3 and 4. The report identified both rules and the buried status. The file hash was unchanged. |
| Two-step runbook with the queue-drain condition before the verification step | No helper findings or material editorial issues; preserve the procedure | The helper returned `[]`. The report found no material issues. The file hash was unchanged. |

An earlier combined trial ran the helper successfully on both inputs but encountered `ECONNRESET` before the report. The separate trials above completed.
