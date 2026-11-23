# Copyright (c) 2026 John Anthony Mariquit <john@mariquit.com>
# SPDX-License-Identifier: Apache-2.0

"""Install selected Trestle skills without requiring Make."""

import argparse
import curses
import fcntl
import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CATALOG = (
    "adr", "de-slop", "deconstruct", "dive-deep", "frontend", "hand-over",
    "integration-seam", "pre-flight", "regression-test", "release-size", "spike",
    "tech-writer", "terse", "triage", "what-is-next",
)
FRONTEND_PLUGIN = (
    "package.json", "package-lock.json", "README.md", "src/index.ts",
    "src/lint.ts", "src/state.ts", "src/store.ts", "src/targets.ts",
)


def present(path: Path) -> bool:
    return path.is_symlink() or path.exists()


def choose(screen: curses.window) -> list[str]:
    selected: set[int] = set()
    cursor = top = 0
    while True:
        screen.erase()
        height, width = screen.getmaxyx()
        visible = max(1, height - 2)
        top = min(max(top, cursor - visible + 1), cursor)
        rows = [("Trestle skill installer", curses.A_BOLD)]
        for index in range(top, min(top + visible, len(CATALOG))):
            style = curses.A_REVERSE if index == cursor else curses.A_NORMAL
            rows.append((f"[{'x' if index in selected else ' '}] {CATALOG[index]}", style))
        rows.append(("Up/Down: move  Space: toggle  Enter: install  Esc: cancel", curses.A_NORMAL))
        for row, (text, style) in enumerate(rows[:height]):
            if width > 1:
                screen.addnstr(row, 0, text, width - 1, style)
        screen.refresh()
        key = screen.getch()
        if key == 27:
            return []
        if key == curses.KEY_UP:
            cursor = (cursor - 1) % len(CATALOG)
        elif key == curses.KEY_DOWN:
            cursor = (cursor + 1) % len(CATALOG)
        elif key == ord(" "):
            selected.symmetric_difference_update({cursor})
        elif key in (curses.KEY_ENTER, 10, 13) and selected:
            return [name for i, name in enumerate(CATALOG) if i in selected]


def destination(override: Path | None) -> Path:
    config = Path(os.environ.get("XDG_CONFIG_HOME") or "~/.config")
    default = Path(os.environ["OPENCODE_SKILLS_DIR"]) if os.environ.get("OPENCODE_SKILLS_DIR") else config / "opencode/skills"
    path = override if override is not None else default
    path = path.expanduser()
    if path.is_symlink():
        raise ValueError(f"Refusing to install through a symlink: {path}")
    root = path.resolve()
    staging = ROOT / ".skill-links"
    if root == staging or staging in root.parents:
        raise ValueError(f"Destination overlaps live skill links: {root}")
    return root


def prepare(root: Path, packages: dict[str, dict[str, bytes]], upgrade: bool) -> list[str]:
    changed = []
    for name, files in packages.items():
        path = root / name
        backup = path.with_name(f"{name}.skshbak")
        if present(backup):
            raise ValueError(f"Legacy live-link backup exists: {backup}. See CONTRIBUTING.md for recovery.")
        if present(path):
            if path.is_symlink() or not path.is_dir():
                raise ValueError(f"Refusing to replace a symlink or non-directory: {path}")
            for filename in files:
                installed = path / filename
                for parent in installed.relative_to(path).parents:
                    directory = path / parent
                    if present(directory) and (directory.is_symlink() or not directory.is_dir()):
                        raise ValueError(f"Refusing to replace a symlink or non-directory: {directory}")
                if present(installed) and (installed.is_symlink() or not installed.is_file()):
                    raise ValueError(f"Refusing to replace a symlink or non-file: {installed}")
            dependencies = (json.loads(files["plugin/package.json"])["dependencies"]
                            if name == "frontend" else ())
            if all((path / filename).is_file() and (path / filename).read_bytes() == contents
                   for filename, contents in files.items()) and all(
                       (path / "plugin/node_modules" / dependency / "package.json").is_file()
                       for dependency in dependencies):
                print(f"Unchanged: {name}")
                continue
            if not upgrade:
                raise ValueError(f"Different or incomplete installation: {path}. Use --upgrade to replace it with a backup.")
        changed.append(name)
    return changed


def provision_frontend(path: Path) -> None:
    npm = shutil.which("npm")
    if not npm:
        raise ValueError("Installing the frontend plugin requires Node.js and npm on PATH.")
    result = subprocess.run(
        [npm, "ci", "--omit=dev", "--ignore-scripts", "--no-audit", "--no-fund"],
        cwd=path, stdin=subprocess.DEVNULL, check=False,
    )
    if result.returncode:
        raise ValueError(f"Could not install frontend plugin dependencies (npm exited {result.returncode}).")


def publish(root: Path, names: list[str], packages: dict[str, dict[str, bytes]]) -> None:
    # Keep backups hidden from skill discovery and renames on the same filesystem.
    work = Path(tempfile.mkdtemp(dir=root, prefix=".trestle-install-"))
    staged = work / "staged"
    backups = work / "previous"
    saved: list[str] = []
    published: list[str] = []
    try:
        staged.mkdir()
        backups.mkdir()
        for name in names:
            (staged / name).mkdir()
            for filename, contents in packages[name].items():
                target = staged / name / filename
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(contents)
            if name == "frontend":
                provision_frontend(staged / name / "plugin")
        for name in names:
            path = root / name
            if present(path):
                path.rename(backups / name)
                saved.append(name)
            (staged / name).rename(path)
            published.append(name)
    except BaseException:
        try:
            for name in reversed(published):
                (root / name).rename(staged / name)
            for name in reversed(saved):
                (backups / name).rename(root / name)
        except OSError as error:
            raise OSError(f"Rollback incomplete. Recovery files: {work}: {error}") from error
        shutil.rmtree(work)
        raise
    shutil.rmtree(staged)
    for name in names:
        print(f"{'Upgraded' if name in saved else 'Installed'}: {name}")
    if saved:
        print(f"Backups: {backups}")
    else:
        backups.rmdir()
        work.rmdir()


def install(root: Path, names: list[str], upgrade: bool) -> None:
    notices = {name: (ROOT / name).read_bytes() for name in ("LICENSE", "NOTICE")}
    packages = {name: {"SKILL.md": (ROOT / f"{name}.md").read_bytes(), **notices} for name in names}
    if "frontend" in packages:
        plugin = ROOT / "plugins/frontend"
        packages["frontend"].update({f"plugin/{name}": (plugin / name).read_bytes() for name in FRONTEND_PLUGIN})
    root.mkdir(parents=True, exist_ok=True)
    fd = os.open(root, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
    try:
        try:
            fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError as error:
            raise ValueError(f"Another installer is using {root}") from error
        if changed := prepare(root, packages, upgrade):
            publish(root, changed, packages)
        if "frontend" in packages:
            print(f"Frontend plugin: {root / 'frontend/plugin'}")
    finally:
        os.close(fd)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, epilog="Available skills: " + ", ".join(CATALOG))
    parser.add_argument("--all", action="store_true", help="Install every skill without opening the menu.")
    parser.add_argument("--upgrade", action="store_true", help="Back up and replace differing installations.")
    parser.add_argument("--skills-dir", type=Path, help="Override the OpenCode skills directory.")
    parser.add_argument("names", metavar="SKILL_ID", nargs="*", help="Install these skills; omit to open the menu.")
    args = parser.parse_intermixed_args()
    if args.all and args.names:
        parser.error("Use --all or skill IDs, not both.")
    if unknown := sorted(set(args.names) - set(CATALOG)):
        parser.error("Unknown skill IDs: " + ", ".join(unknown))
    try:
        names = list(CATALOG) if args.all else list(dict.fromkeys(args.names))
        if not names:
            if not (sys.stdin.isatty() and sys.stdout.isatty()):
                parser.error("The menu requires a terminal. Pass skill IDs or --all for unattended installs.")
            names = curses.wrapper(choose)
        if names:
            install(destination(args.skills_dir), names, args.upgrade)
    except KeyboardInterrupt:
        return 130
    except (OSError, ValueError, RuntimeError, curses.error) as error:
        parser.exit(1, f"install: {error}\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
