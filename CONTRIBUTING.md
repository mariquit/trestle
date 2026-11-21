# Contributing to Trestle

Trestle collects software engineering skills for OpenCode. Contributions should help agents make better decisions without prescribing every implementation detail.

## Code of Conduct

Follow the [Code of Conduct](CODE_OF_CONDUCT.md) in project spaces. Use its private reporting contact for conduct concerns.

## Licensing of Contributions

The software is licensed under the [Apache License, Version 2.0](LICENSE). By submitting a contribution, you agree to license it under the same terms. There is no contributor license agreement (CLA). You keep the copyright to your work.

### Sign Your Work

Sign off each commit under the [Developer Certificate of Origin 1.1](DCO) to certify that you have the right to submit the contribution:

```bash
git commit -s
```

Use your real name and a working email address. Check `git log -1 --format=%B` for the `Signed-off-by: Your Name <your.email@example.com>` trailer. To sign off your latest commit before publishing it, use `git commit --amend -s`.

### Copyright and Prior Art

Use copyright and SPDX comments in source files, tests, scripts, and hooks. In skill Markdown, use the `license` and `metadata.copyright` fields instead of comments, as specified in [AGENTS.md](AGENTS.md#frontmatter-schema).

Do not copy proprietary, unlicensed, or license-incompatible material. For work adapted from a compatible source, identify the source and its license in the pull request, record applicable attribution in [NOTICE](NOTICE), and preserve notices and mark modifications as required by Apache-2.0 §4. See [TRADEMARK.md](TRADEMARK.md) for project naming and fork attribution.

## Project Overview

Contributions generally involve three connected areas:

- **Skill guidance:** Root skill files contain YAML frontmatter for discovery and instructions loaded when the skill is used. Improve the relevant skill without expanding its scope unnecessarily.
- **Discoverability:** `README.md` explains when to use each skill through the overview and SDLC mapping. Keep these descriptions aligned with changes to skill names or behavior.
- **Installation:** `install.sh` launches `install.py`, which owns the skill catalog. Promote a candidate only after representative trials.

See [WORKFLOW.md](WORKFLOW.md) for the path from a skill change to an installed copy.

## Local Setup and Checks

Use Git and Python 3.10+ (standard library only). Run the checks before pushing:

```bash
python3 tests/check_skills.py
python3 -m unittest discover -s tests -v
git diff --check
git diff --cached --check
```

`tests/check_skills.py` checks the catalog against the schema in [AGENTS.md](AGENTS.md) and scans for common credential shapes and suspicious instructions. Pass `lint` or `security` to run only one check. The scan reports rule names and line numbers without echoing matched text. It is heuristic, not a guarantee; review the findings and the diff manually.

To run catalog and whitespace checks automatically before pushing, use `git config --local core.hooksPath .githooks`. If you already use a custom hook path, call `.githooks/pre-push` from your existing hook instead. The hook checks the current checkout, not arbitrary commits or branches being pushed. Run the checks from the branch you intend to publish.

For behavior changes, trial the skill on a representative task in OpenCode. Use a project where the selected model can answer a smoke prompt. A project-local copy at `.opencode/skills/<name>/SKILL.md` lets you invoke `@<name>` without changing global installs. Record the OpenCode version, model, input, expected behavior, and observed result. Record blocked trials separately from fixture results.

Use `./install.sh` for normal installs. It installs `SKILL.md`, `LICENSE`, and `NOTICE` in each selected skill directory. The installer honors `OPENCODE_SKILLS_DIR`; `--skills-dir` takes precedence. With `--upgrade`, it saves each replaced directory in the printed hidden backup location, including any files not managed by Trestle. The new installation contains only the packaged files.

To test the installer without changing your OpenCode configuration, use a temporary destination:

```bash
./install.sh --all --skills-dir "$test_dir/opencode"
```

Set `test_dir` to an isolated temporary directory first. Compare installed files with their sources; copying successfully does not establish that a skill behaves correctly in an agent session.

### Recover legacy live links

If a previous Trestle checkout linked a skill, inspect `<skills-dir>/<skill>` with `readlink` and check for a sibling `<skill>.skshbak`. Remove only a symlink you have confirmed points to that checkout's `.skill-links/<skill>` directory. If a backup exists, confirm it contains the previous `SKILL.md`, then rename it to `<skill>` only if that destination is vacant. Leave unrelated links and directories untouched. Retry installation after restoring the previous copy; use `--upgrade` if you want to replace it with the current version.

## Skill-Writing Guidelines

- Keep each skill focused on its purpose. Prefer useful defaults and clear boundaries over exhaustive rules or approval gates.
- Preserve existing project conventions and user work. Do not turn guidance into permission for unrelated changes.
- Keep examples accurate and distinguish OpenCode runtime results from fixture results.
- Follow the exact [frontmatter and trigger schema](AGENTS.md#frontmatter-schema). Preserve applicable third-party license and attribution notices; do not add material you lack permission to contribute.
- When adding or renaming a skill, update the README overview and relevant SDLC mapping. Update `CATALOG` in `install.py` if the skill should be included in installation.

## How to Contribute

### Reporting Problems

Check existing issues before opening a report. Include the affected skill, the relevant instructions or input, expected behavior, and actual behavior. For agent-specific problems, include the client and model versions when known. Remove secrets and private project data from examples.

Report suspected vulnerabilities privately as described in [SECURITY.md](SECURITY.md), not in the issue tracker.

### Pull Requests

Use [Conventional Commits](https://www.conventionalcommits.org/) with a scope when useful, for example `fix(install): preserve rollback diagnostics` or `docs(skills): clarify trial evidence`. Explain why the change is needed in the commit body when the subject is not enough.

1. Create a branch and keep the change focused on one improvement or fix.
2. Update related documentation or examples where the change requires it.
3. Review the diff, pass the local checks, and record representative OpenCode trials for skill behavior changes. Add regression coverage for installer changes where applicable. Verify that every commit has a DCO sign-off.
4. Describe the problem, the change, and validation results in the pull request. Identify any remaining verification gaps.
