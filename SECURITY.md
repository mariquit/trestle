# Security Policy

**Trestle** (`trestle`)

## Reporting a vulnerability

Email **John Anthony Mariquit** at <john@mariquit.com> with the subject
`SECURITY: trestle - <short summary>`. Do not post suspected vulnerabilities in
public issues, pull requests, or discussions. If you need to encrypt the report,
ask for a key before sending any details.

### What to include

- The Trestle commit (`git rev-parse HEAD`), your OS, and `python3 --version` for installer reports.
- The affected skill, OpenCode version, and model for skill reports.
- The conditions required, the observed impact, and a minimal example that demonstrates the problem. Remove credentials and private project data.

### What to expect

Trestle has one maintainer. These targets are best-effort:

| Stage | Target |
| --- | --- |
| Acknowledgement | Within 5 working days |
| Initial assessment | Within 14 days |
| Fix or documented mitigation | Depends on severity |

Allow a reasonable window for a fix before public disclosure. If you have a
fixed disclosure date or prefer not to be credited, say so in your first report.

## Supported versions

Only the latest commit on `main` receives security fixes. There are no
backports to older snapshots. An installed skill is a copy; update it from a
checkout that contains the fix.

## Scope

Trestle ships a local installer and Markdown instructions for OpenCode. Report
installer issues such as writes outside the selected destination, unintended
replacement of unrelated files, or loss of backed-up data. Report shipped skill
instructions that direct agents to expose sensitive data, bypass user approval,
or make unauthorized changes.

Report vulnerabilities specific to OpenCode, model providers, or third-party
tools upstream unless Trestle's installer or shipped guidance creates or worsens
the exposure. Replacing a selected skill directory with `--upgrade` is
documented behavior; the installer prints the location of the previous copy.

## Notes for users

Review the checkout before running its installer or loading its skills. Skills
are instructions, not a sandbox; OpenCode controls tool permissions. Review
proposed commands and file edits before approval. The catalog security scan is
heuristic and does not guarantee that a skill is safe.
