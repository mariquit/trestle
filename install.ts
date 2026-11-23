// Copyright (c) 2026 John Anthony Mariquit <john@mariquit.com>
// SPDX-License-Identifier: Apache-2.0

import { spawnSync } from "node:child_process";
import {
  lstatSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, renameSync,
  rmdirSync, rmSync, writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join, resolve, sep } from "node:path";
import { emitKeypressEvents } from "node:readline";
import { parseArgs } from "node:util";

const ROOT = import.meta.dirname;
const CATALOG = [
  "adr", "de-slop", "deconstruct", "dive-deep", "frontend", "hand-over",
  "integration-seam", "pre-flight", "regression-test", "release-size", "spike",
  "tech-writer", "terse", "triage", "what-is-next",
];
const FRONTEND_PLUGIN = [
  "package.json", "package-lock.json", "README.md", "src/index.ts",
  "src/lint.ts", "src/state.ts", "src/store.ts", "src/targets.ts",
];
type Package = Map<string, Buffer>;

function hasCode(error: unknown, code: string): boolean {
  return error instanceof Error && "code" in error && error.code === code;
}

function info(path: string) {
  return lstatSync(path, { throwIfNoEntry: false });
}

async function choose(): Promise<string[] | null> {
  const { stdin, stdout } = process;
  const selected = new Set<string>();
  let cursor = 0;
  let top = 0;
  function render() {
    const rows = Math.max(1, stdout.rows - 2);
    top = Math.min(cursor, Math.max(top, cursor - rows + 1));
    const options = CATALOG.slice(top, top + rows).map((name, i) =>
      `${top + i === cursor ? ">" : " "} [${selected.has(name) ? "x" : " "}] ${name}`);
    stdout.write("\x1b[2J\x1b[H" + ["Trestle skill installer", ...options,
      "Up/Down: move  Space: toggle  Enter: install  Esc: cancel"].join("\r\n"));
  }
  emitKeypressEvents(stdin);
  const wasRaw = Boolean(stdin.isRaw);
  stdin.setRawMode(true);
  stdout.write("\x1b[?1049h\x1b[?25l");
  try {
    return await new Promise((done) => {
      function finish(names: string[] | null) {
        stdin.off("keypress", keypress);
        stdout.off("resize", render);
        done(names);
      }
      function keypress(_text: string, key: { name?: string; ctrl?: boolean }) {
        if (key.ctrl && key.name === "c") return finish(null);
        if (key.name === "escape") return finish([]);
        if (key.name === "return" && selected.size) return finish(CATALOG.filter((name) => selected.has(name)));
        if (key.name === "up") cursor = Math.max(0, cursor - 1);
        if (key.name === "down") cursor = Math.min(CATALOG.length - 1, cursor + 1);
        if (key.name === "space") {
          const name = CATALOG[cursor];
          if (!selected.delete(name)) selected.add(name);
        }
        render();
      }
      stdin.on("keypress", keypress);
      stdout.on("resize", render);
      stdin.resume();
      render();
    });
  } finally {
    stdin.setRawMode(wasRaw);
    stdin.pause();
    stdout.write("\x1b[?25h\x1b[?1049l");
  }
}

function canonical(path: string): string {
  if (info(path)) return realpathSync(path);
  return join(canonical(dirname(path)), basename(path));
}

function destination(override?: string): string {
  const config = process.env.XDG_CONFIG_HOME || join(homedir(), ".config");
  const requested = override ?? (process.env.OPENCODE_SKILLS_DIR || join(config, "opencode/skills"));
  const path = resolve(requested.replace(/^~(?=\/|$)/, homedir()));
  if (info(path)?.isSymbolicLink()) throw new Error(`Refusing to install through a symlink: ${path}`);
  const root = canonical(path);
  const staging = join(ROOT, ".skill-links");
  if (root === staging || root.startsWith(staging + sep)) {
    throw new Error(`Destination overlaps live skill links: ${root}`);
  }
  return root;
}

function prepare(root: string, packages: Map<string, Package>, upgrade: boolean): string[] {
  const changed: string[] = [];
  for (const [name, files] of packages) {
    const path = join(root, name);
    const backup = `${path}.skshbak`;
    if (info(backup)) throw new Error(`Legacy live-link backup exists: ${backup}. See CONTRIBUTING.md for recovery.`);
    const existing = info(path);
    if (existing) {
      if (!existing.isDirectory()) throw new Error(`Refusing to replace a symlink or non-directory: ${path}`);
      for (const filename of files.keys()) {
        const installed = join(path, filename);
        const parents: string[] = [];
        for (let parent = dirname(installed); parent !== path; parent = dirname(parent)) parents.unshift(parent);
        for (const parent of parents) {
          const directory = info(parent);
          if (directory && !directory.isDirectory()) {
            throw new Error(`Refusing to replace a symlink or non-directory: ${parent}`);
          }
        }
        const file = info(installed);
        if (file && !file.isFile()) throw new Error(`Refusing to replace a symlink or non-file: ${installed}`);
      }
      const dependencies = name === "frontend"
        ? Object.keys(JSON.parse(files.get("plugin/package.json")!.toString()).dependencies) : [];
      if ([...files].every(([filename, contents]) => {
        const installed = join(path, filename);
        return info(installed)?.isFile() && readFileSync(installed).equals(contents);
      }) && dependencies.every((dependency) => info(join(path, "plugin/node_modules", dependency, "package.json"))?.isFile())) {
        console.log(`Unchanged: ${name}`);
        continue;
      }
      if (!upgrade) throw new Error(`Different or incomplete installation: ${path}. Use --upgrade to replace it with a backup.`);
    }
    changed.push(name);
  }
  return changed;
}

function provisionFrontend(path: string): void {
  const result = spawnSync("npm", ["ci", "--omit=dev", "--ignore-scripts", "--no-audit", "--no-fund"], {
    cwd: path, stdio: ["ignore", "inherit", "inherit"],
  });
  if (hasCode(result.error, "ENOENT")) throw new Error("Installing the frontend plugin requires npm on PATH.");
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Could not install frontend plugin dependencies (npm exited ${result.status ?? result.signal}).`);
}

function publish(root: string, names: string[], packages: Map<string, Package>): void {
  // Stage and back up on the destination filesystem so publication uses renames.
  const work = mkdtempSync(join(root, ".trestle-install-"));
  const staged = join(work, "staged");
  const backups = join(work, "previous");
  const saved: string[] = [];
  const published: string[] = [];
  try {
    mkdirSync(staged);
    mkdirSync(backups);
    for (const name of names) {
      for (const [filename, contents] of packages.get(name)!) {
        const target = join(staged, name, filename);
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, contents);
      }
      if (name === "frontend") provisionFrontend(join(staged, name, "plugin"));
    }
    for (const name of names) {
      const path = join(root, name);
      if (info(path)) {
        renameSync(path, join(backups, name));
        saved.push(name);
      }
      renameSync(join(staged, name), path);
      published.push(name);
    }
  } catch (error) {
    try {
      for (const name of published.reverse()) renameSync(join(root, name), join(staged, name));
      for (const name of saved.reverse()) renameSync(join(backups, name), join(root, name));
    } catch (rollbackError) {
      throw new Error(`Rollback incomplete. Recovery files: ${work}: ${rollbackError}`, { cause: error });
    }
    rmSync(work, { recursive: true });
    throw error;
  }
  rmdirSync(staged);
  for (const name of names) console.log(`${saved.includes(name) ? "Upgraded" : "Installed"}: ${name}`);
  if (saved.length) console.log(`Backups: ${backups}`);
  else {
    rmdirSync(backups);
    rmdirSync(work);
  }
}

function install(root: string, names: string[], upgrade: boolean): void {
  const notices = ["LICENSE", "NOTICE"].map((name) => [name, readFileSync(join(ROOT, name))] as const);
  const packages = new Map(names.map((name) => [name, new Map([
    ["SKILL.md", readFileSync(join(ROOT, `${name}.md`))], ...notices,
  ])]));
  const frontend = packages.get("frontend");
  if (frontend) {
    for (const name of FRONTEND_PLUGIN) frontend.set(`plugin/${name}`, readFileSync(join(ROOT, "plugins/frontend", name)));
  }
  const deSlop = packages.get("de-slop");
  if (deSlop) {
    for (const name of ["lint.mjs", "THIRD-PARTY-LICENSES.txt"]) {
      deSlop.set(`scripts/${name}`, readFileSync(join(ROOT, "tools/de-slop/bundle", name)));
    }
  }
  mkdirSync(root, { recursive: true });
  if (!info(root)?.isDirectory() || realpathSync(root) !== root) {
    throw new Error(`Refusing to install through a symlink: ${root}`);
  }
  const lock = join(root, ".trestle-install.lock");
  try {
    mkdirSync(lock, { mode: 0o700 });
  } catch (error) {
    if (hasCode(error, "EEXIST")) throw new Error(`Another installer is using ${root}, or ${lock} is stale. See CONTRIBUTING.md for recovery.`);
    throw error;
  }
  try {
    const changed = prepare(root, packages, upgrade);
    if (changed.length) publish(root, changed, packages);
    if (frontend) console.log(`Frontend plugin: ${join(root, "frontend/plugin")}`);
  } finally {
    rmdirSync(lock);
  }
}

const usage = `Usage: ./install.sh [--all | SKILL_ID ...] [--upgrade] [--skills-dir PATH]\n\nAvailable skills: ${CATALOG.join(", ")}`;

async function main(): Promise<number> {
  let names: string[];
  let upgrade: boolean;
  let directory: string | undefined;
  try {
    const { values, positionals } = parseArgs({ allowPositionals: true, options: {
      all: { type: "boolean" }, upgrade: { type: "boolean", default: false },
      "skills-dir": { type: "string" }, help: { type: "boolean", short: "h" },
      "list-skills": { type: "boolean" },
    } });
    if (values.help) { console.log(usage); return 0; }
    if (values["list-skills"]) {
      if (values.all || values.upgrade || values["skills-dir"] !== undefined || positionals.length) {
        throw new Error("Use --list-skills on its own.");
      }
      console.log(CATALOG.join("\n"));
      return 0;
    }
    if (values.all && positionals.length) throw new Error("Use --all or skill IDs, not both.");
    const unknown = [...new Set(positionals.filter((name) => !CATALOG.includes(name)))].sort();
    if (unknown.length) throw new Error(`Unknown skill IDs: ${unknown.join(", ")}`);
    names = values.all ? CATALOG : [...new Set(positionals)];
    if (!names.length && !(process.stdin.isTTY && process.stdout.isTTY)) {
      throw new Error("The menu requires a terminal. Pass skill IDs or --all for unattended installs.");
    }
    upgrade = values.upgrade;
    directory = values["skills-dir"];
  } catch (error) {
    console.error(`install: ${error instanceof Error ? error.message : error}\n${usage}`);
    return 2;
  }
  if (!names.length) {
    const selection = await choose();
    if (!selection) return 130;
    names = selection;
  }
  if (names.length) install(destination(directory), names, upgrade);
  return 0;
}

try {
  process.exitCode = await main();
} catch (error) {
  console.error(`install: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
}
