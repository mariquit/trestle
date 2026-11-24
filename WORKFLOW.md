# Trestle workflow

Trestle ships independent skills for OpenCode, not a runtime that enforces a
sequence. Choose the skill that fits the task using the
[SDLC mapping](README.md#sdlc-toolkit-mapping). This document describes how a
skill moves from editable source to a verified installed copy.

## Sources and outputs

| Path | Purpose |
| --- | --- |
| `<name>.md` | Canonical skill source. Edit this file, never the installed copy. |
| `CATALOG` in [`install.ts`](install.ts) | Selects the skills offered by the menu and `--all`. |
| [`README.md`](README.md) | Lists skills and explains when to use them. |
| [`tests/check_skills.ts`](tests/check_skills.ts) | Checks cataloged skills for schema violations and common security indicators. |
| `<skills-dir>/<name>/` | Installed `SKILL.md`, `LICENSE`, and `NOTICE`. |

## Author and verify

1. Define the task, the behavior the skill should change, and how to recognize success. Edit the root `<name>.md` using the [frontmatter schema](AGENTS.md#frontmatter-schema). Keep discovery text and the relevant README mapping aligned.
2. Trial the candidate as `.opencode/skills/<name>/SKILL.md` in a representative OpenCode project. Confirm the selected model answers a smoke prompt, invoke `@<name>`, and record the OpenCode version, model, input, expected behavior, and observed result. Record blocked trials separately; fixture results are not runtime evidence.
3. After a successful representative trial, add a new skill to `CATALOG` when it is ready to ship. Run the [local checks](CONTRIBUTING.md#local-setup-and-checks) on the final tree. The automated checks verify the schema and installer behavior; they do not establish how a model follows a prompt.
4. Submit the change with signed-off commits and include the checks, trial evidence, and any gaps in the pull request. See [CONTRIBUTING.md](CONTRIBUTING.md#pull-requests).

## Install and recover

`./install.sh` launches `install.ts` with Node.js. The installer copies the selected root
skill files and notices; it does not link them to the checkout. Verify a change
with the [temporary-destination check](CONTRIBUTING.md#local-setup-and-checks)
before updating a normal OpenCode installation.

The frontend skills always install their required plugins and locked runtime
dependencies as separate packages in the global OpenCode `plugins/` directory
for auto-discovery. Existing nested copies are preserved on upgrades to the
global layout.

Identical packages are skipped. A differing install requires `--upgrade`,
which replaces the selected skill directory and preserves the previous one in
the printed backup location. Verify the new `SKILL.md`, `LICENSE`, and `NOTICE`
against the checkout and confirm the backup contains any local files you need.
For a legacy link or `.skshbak` blocker, follow the
[legacy link recovery instructions](CONTRIBUTING.md#recover-legacy-live-links).

## Package a release

The [Installer release workflow](.github/workflows/release.yml) runs on pushes of
`v*` tags. The `package` job tests the installer, generates the archive and checksum
in `release-assets/`, and copies the tracked root `install.sh` into that directory.
The `publish` job attaches all three files to the GitHub Release for the tag.
Only the root launcher and build definitions are tracked; do not commit the
generated release output. Run the workflow manually in GitHub Actions to build and
download the artifact without publishing a release.

To test packaging locally with `act`, select only the `package` job:

```sh
act -W .github/workflows/release.yml workflow_dispatch -j package
```

If your engine requires a custom socket, use the same selectors with the `act`
command from the engine resolver. The local job runs installer tests and verifies
the launcher copy and checksum without uploading artifacts or publishing. To produce
the files directly on your machine, run `sh scripts/package-release.sh release-assets`
with a new output directory.
