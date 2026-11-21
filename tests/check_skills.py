# Copyright (c) 2026 John Anthony Mariquit <john@mariquit.com>
# SPDX-License-Identifier: Apache-2.0

"""Check the Trestle catalog's frontmatter and scan for suspicious patterns."""

import argparse
import re
import sys
from pathlib import Path

if __name__ == "__main__":
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from install import CATALOG, ROOT


NAME = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*")
SECURITY_RULES = {
    "private key header": r"-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY-----",
    "token-shaped credential": r"\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|sk-(?:proj-)?[A-Za-z0-9_-]{20,}|AKIA[A-Z0-9]{16})\b",
    "potential download-and-execute": r"\b(?:curl|wget)\b[^\n|]*\|\s*(?:sudo\s+)?(?:\S*/)?(?:ba|z|da|k)?sh\b",
    "potential instruction override": r"\b(?:ignore|disregard) (?:all )?(?:(?:previous|prior|system|developer) )+instructions\b",
}


def lint(name: str, text: str) -> str | None:
    lines = text.splitlines()
    if not lines or lines[0] != "---" or "---" not in lines[1:]:
        return "expected opening and closing frontmatter delimiters"
    end = lines.index("---", 1)
    fields = "\n".join(line for line in lines[1:end] if line.strip())
    if re.search(r"[\x00-\x09\x0b-\x1f\x7f-\x9f\ufeff\ufffe\uffff]", fields):
        return "frontmatter contains a tab or unsupported control character"
    # This repository deliberately uses a restricted, dependency-free YAML subset.
    scalar = r"[A-Za-z](?:[^\n\t]*[^\s])?"
    legacy_field = {"de-slop": 'argument: "[-i | --overwrite | -r | --review] <file_path_or_text>"\n',
                    "terse": "keep-coding-instructions: true\n"}.get(name, "")
    legacy_metadata = "\n  required-capabilities:\n    - file-read\n    - file-write" if name == "de-slop" else ""
    schema = (rf"name: {re.escape(name)}\ndescription: ({scalar})\n{re.escape(legacy_field)}"
              rf"(?:author: ({scalar})\n)?license: Apache-2\.0\nmetadata:\n  copyright: Copyright \(c\) [0-9]{{4}} ({scalar})"
              rf"{re.escape(legacy_metadata)}")
    match = re.fullmatch(schema, fields)
    if not match or any(re.search(r":(?:\s|$)|\s#", value) for value in match.groups() if value is not None):
        return "frontmatter does not match the plain-scalar schema in AGENTS.md"
    description = match[1]
    if len(description) > 1024 or any(value.lower() in {"true", "false", "null", "yes", "no", "on", "off"} for value in match.groups() if value):
        return "description must be prose of at most 1024 characters; use text, not YAML implicit values"
    trigger = rf'Use when the user runs `/{re.escape(name)}` or asks to "[^"\n]+"\.'
    if not re.search(rf"(?:^|\. ){trigger}$", description) or description.count(f"/{name}`") != 1:
        return f'finish the description with: Use when the user runs `/{name}` or asks to "<phrase>".'
    if not any(line.strip() for line in lines[end + 1:]):
        return "skill body is empty"
    return None


def check(action: str) -> int:
    failed = False
    for name in CATALOG:
        filename = f"{name}.md"
        text = (ROOT / filename).read_text(encoding="utf-8")
        if action == "lint":
            if error := lint(name, text):
                print(f"{filename}: {error}")
                failed = True
        else:
            for number, line in enumerate(text.splitlines(), 1):
                for label, pattern in SECURITY_RULES.items():
                    if re.search(pattern, line, re.IGNORECASE):
                        print(f"{filename}:{number}: {label}")
                        failed = True
    if not failed:
        print(f"{action}: checked {len(CATALOG)} skills")
    return int(failed)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", nargs="?", choices=("lint", "security"), help="Run one check instead of both.")
    args = parser.parse_args()
    try:
        if len(set(CATALOG)) != len(CATALOG) or any(len(name) > 64 or not NAME.fullmatch(name) for name in CATALOG):
            raise ValueError("skill names must be unique, lowercase kebab-case identifiers of at most 64 characters")
        actions = (args.action,) if args.action else ("lint", "security")
        return int(sum(check(action) for action in actions) > 0)
    except (OSError, ValueError) as error:
        parser.exit(1, f"check_skills: {error}\n")


if __name__ == "__main__":
    raise SystemExit(main())
