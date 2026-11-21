# Trestle workflow

Trestle ships independent skills for OpenCode, not a runtime that enforces a
sequence. Choose the skill that fits the task using the
[SDLC mapping](README.md#sdlc-toolkit-mapping). This document describes how a
skill moves from editable source to a verified installed copy.

## Sources and outputs

| Path | Purpose |
| --- | --- |
| `<name>.md` | Canonical skill source. Edit this file, never the installed copy. |
| `CATALOG` in [`install.py`](install.py) | Selects the skills offered by the menu and `--all`. |
| [`README.md`](README.md) | Lists skills and explains when to use them. |
| [`tests/check_skills.py`](tests/check_skills.py) | Checks cataloged skills for schema violations and common security indicators. |
| `<skills-dir>/<name>/` | Installed `SKILL.md`, `LICENSE`, and `NOTICE`. |

## Author and verify

1. Define the task, the behavior the skill should change, and how to recognize success. Edit the root `<name>.md` using the [frontmatter schema](AGENTS.md#frontmatter-schema). Keep discovery text and the relevant README mapping aligned.
2. Trial the candidate as `.opencode/skills/<name>/SKILL.md` in a representative OpenCode project. Confirm the selected model answers a smoke prompt, invoke `@<name>`, and record the OpenCode version, model, input, expected behavior, and observed result. Record blocked trials separately; fixture results are not runtime evidence.
3. After a successful representative trial, add a new skill to `CATALOG` when it is ready to ship. Run the [local checks](CONTRIBUTING.md#local-setup-and-checks) on the final tree. The Python checks verify the schema and installer behavior; they do not establish how a model follows a prompt.
4. Submit the change with signed-off commits and include the checks, trial evidence, and any gaps in the pull request. See [CONTRIBUTING.md](CONTRIBUTING.md#pull-requests).

## Install and recover

`./install.sh` launches `install.py`. The installer copies the selected root
skill files and notices; it does not link them to the checkout. Verify a change
with the [temporary-destination check](CONTRIBUTING.md#local-setup-and-checks)
before updating a normal OpenCode installation.

Identical packages are skipped. A differing install requires `--upgrade`,
which replaces the selected skill directory and preserves the previous one in
the printed backup location. Verify the new `SKILL.md`, `LICENSE`, and `NOTICE`
against the checkout and confirm the backup contains any local files you need.
For a legacy link or `.skshbak` blocker, follow the
[legacy link recovery instructions](CONTRIBUTING.md#recover-legacy-live-links).
