// Copyright (c) 2026 John Anthony Mariquit <john@mariquit.com>
// SPDX-License-Identifier: Apache-2.0

import { spawnSync } from "node:child_process";
import {
  cpSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, renameSync,
  rmdirSync, rmSync, writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join, resolve, sep } from "node:path";
import { emitKeypressEvents } from "node:readline";
import { parseArgs } from "node:util";

const ROOT = import.meta.dirname;
const CATALOG = [
  "adr", "de-slop", "deconstruct", "dive-deep", "frontend", "frontend-react", "github-pr-review",
  "hand-over", "improve", "integration-seam", "post-mortem", "pre-flight", "regression-test",
  "release-size", "scaffold", "spike", "tech-writer", "terse", "triage", "what-is-next",
];
const PLUGINS = new Map([
  ["frontend", ["src/lint.ts", "src/state.ts", "src/store.ts", "src/targets.ts"]],
  ["frontend-react", ["src/project.ts", "src/state.ts"]],
]);
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

const configRoot = () => join(process.env.XDG_CONFIG_HOME || join(homedir(), ".config"), "opencode");

function destination(requested: string): string {
  const path = resolve(requested.replace(/^~(?=\/|$)/, homedir()));
  if (info(path)?.isSymbolicLink()) throw new Error(`Refusing to install through a symlink: ${path}`);
  const root = canonical(path);
  const staging = join(ROOT, ".skill-links");
  if (root === staging || root.startsWith(staging + sep)) {
    throw new Error(`Destination overlaps live skill links: ${root}`);
  }
  return root;
}

type InstallGroup = { root: string; packages: Map<string, Package>; plugins?: boolean };

function prepare({ root, packages, plugins }: InstallGroup, upgrade: boolean): string[] {
  const changed: string[] = [];
  for (const [name, files] of packages) {
    const path = join(root, name);
    const backup = `${path}.skshbak`;
    if (info(backup)) throw new Error(`Legacy live-link backup exists: ${backup}. See CONTRIBUTING.md for recovery.`);
    const existing = info(path);
    if (existing) {
      if (!existing.isDirectory()) throw new Error(`Refusing to replace a symlink or non-directory: ${path}`);
      const legacyPlugin = !plugins && PLUGINS.has(name) && info(join(path, "plugin"));
      if (legacyPlugin && !legacyPlugin.isDirectory()) {
        throw new Error(`Refusing to replace a symlink or non-directory: ${join(path, "plugin")}`);
      }
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
      const manifest = plugins ? files.get("package.json") : undefined;
      const dependencies = manifest ? Object.keys(JSON.parse(manifest.toString()).dependencies) : [];
      if ([...files].every(([filename, contents]) => {
        const installed = join(path, filename);
        return info(installed)?.isFile() && readFileSync(installed).equals(contents);
      }) && dependencies.every((dependency) => info(join(path, "node_modules", dependency, "package.json"))?.isFile())) {
        console.log(`Unchanged: ${plugins ? "plugin " : ""}${name}`);
        continue;
      }
      if (!upgrade) throw new Error(`Different or incomplete installation: ${path}. Use --upgrade to replace it with a backup.`);
    }
    changed.push(name);
  }
  return changed;
}

function provisionPlugin(name: string, path: string): void {
  const result = spawnSync("npm", ["ci", "--omit=dev", "--ignore-scripts", "--no-audit", "--no-fund"], {
    cwd: path, stdio: ["ignore", "inherit", "inherit"],
  });
  if (hasCode(result.error, "ENOENT")) throw new Error(`Installing the ${name} plugin requires npm on PATH.`);
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Could not install ${name} plugin dependencies (npm exited ${result.status ?? result.signal}).`);
}

function publish(groups: (InstallGroup & { names: string[] })[]): void {
  // Stage on each destination filesystem. Packages are one level below the staging directory,
  // outside OpenCode's immediate-child discovery layout.
  const workspaces: { work: string; staged: string; backups: string; saved: string[] }[] = [];
  const undo: (() => void)[] = [];
  const messages: string[] = [];
  try {
    for (const { root, names, packages, plugins } of groups) {
      const work = mkdtempSync(join(root, ".trestle-install-"));
      const staged = join(work, "staged");
      const backups = join(work, "previous");
      workspaces.push({ work, staged, backups, saved: [] });
      mkdirSync(staged);
      mkdirSync(backups);
      for (const name of names) {
        const files = packages.get(name)!;
        for (const [filename, contents] of files) {
          const target = join(staged, name, filename);
          mkdirSync(dirname(target), { recursive: true });
          writeFileSync(target, contents);
        }
        if (plugins) provisionPlugin(name, join(staged, name));
        else if (PLUGINS.has(name) && info(join(root, name, "plugin"))) {
          cpSync(join(root, name, "plugin"), join(staged, name, "plugin"), { recursive: true, verbatimSymlinks: true });
        }
      }
    }
    for (const [index, { root, names, plugins }] of groups.entries()) {
      const { staged, backups, saved } = workspaces[index];
      for (const name of names) {
        const path = join(root, name);
        if (info(path)) {
          const backup = join(backups, name);
          renameSync(path, backup);
          saved.push(name);
          undo.push(() => renameSync(backup, path));
        }
        renameSync(join(staged, name), path);
        undo.push(() => renameSync(path, join(staged, name)));
        messages.push(`${saved.includes(name) ? "Upgraded" : "Installed"}: ${plugins ? "plugin " : ""}${name}`);
      }
    }
  } catch (error) {
    try {
      for (const restore of undo.reverse()) restore();
    } catch (rollbackError) {
      throw new Error(`Rollback incomplete. Recovery directories: ${workspaces.map(({ work }) => work).join(", ")}: ${rollbackError}`, { cause: error });
    }
    for (const { work } of workspaces) rmSync(work, { recursive: true });
    throw error;
  }
  for (const message of messages) console.log(message);
  for (const { work, staged, backups, saved } of workspaces) {
    rmdirSync(staged);
    if (saved.length) console.log(`Backups: ${backups}`);
    else {
      rmdirSync(backups);
      rmdirSync(work);
    }
  }
}

function install(root: string, names: string[], upgrade: boolean): void {
  const notices = ["LICENSE", "NOTICE"].map((name) => [name, readFileSync(join(ROOT, name))] as const);
  const packages = new Map(names.map((name) => [name, new Map([
    ["SKILL.md", readFileSync(join(ROOT, `${name}.md`))], ...notices,
  ])]));
  const plugins = new Map<string, Package>();
  for (const [name, sources] of PLUGINS) {
    if (!packages.has(name)) continue;
    const files = new Map(notices);
    for (const file of ["package.json", "package-lock.json", "README.md", "src/index.ts", ...sources]) {
      files.set(file, readFileSync(join(ROOT, "plugins", name, file)));
    }
    plugins.set(name, files);
  }
  const deSlop = packages.get("de-slop");
  if (deSlop) {
    for (const name of ["lint.mjs", "THIRD-PARTY-LICENSES.txt"]) {
      deSlop.set(`scripts/${name}`, readFileSync(join(ROOT, "tools/de-slop/bundle", name)));
    }
  }
  const postMortem = packages.get("post-mortem");
  if (postMortem) {
    postMortem.set("assets/report.html", readFileSync(join(ROOT, "assets/report.html")));
  }
  const groups: InstallGroup[] = [{ root, packages }];
  const pluginRoot = plugins.size ? destination(join(configRoot(), "plugins")) : undefined;
  if (pluginRoot) groups.push({ root: pluginRoot, packages: plugins, plugins: true });
  if (groups.some((a, i) => groups.slice(i + 1).some((b) => a.root === b.root || a.root.startsWith(b.root + sep) || b.root.startsWith(a.root + sep)))) {
    throw new Error("Skill and plugin destinations must not overlap.");
  }
  const locks: string[] = [];
  try {
    for (const { root } of groups) {
      mkdirSync(root, { recursive: true });
      if (!info(root)?.isDirectory() || realpathSync(root) !== root) throw new Error(`Refusing to install through a symlink: ${root}`);
      const lock = join(root, ".trestle-install.lock");
      try { mkdirSync(lock, { mode: 0o700 }); }
      catch (error) {
        if (hasCode(error, "EEXIST")) throw new Error(`Another installer is using ${root}, or ${lock} is stale. See CONTRIBUTING.md for recovery.`);
        throw error;
      }
      locks.push(lock);
    }
    const changed = groups.map((group) => ({ ...group, names: prepare(group, upgrade) })).filter(({ names }) => names.length);
    if (changed.length) publish(changed);
    if (pluginRoot) for (const name of plugins.keys()) {
      const label = name === "frontend" ? "Frontend plugin" : "Frontend React plugin";
      console.log(`${label}: ${join(pluginRoot, name)}`);
    }
  } finally {
    for (const lock of locks.reverse()) rmdirSync(lock);
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
  if (names.length) install(destination(directory ?? (process.env.OPENCODE_SKILLS_DIR || join(configRoot(), "skills"))), names, upgrade);
  return 0;
}

try {
  process.exitCode = await main();
} catch (error) {
  console.error(`install: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
}
