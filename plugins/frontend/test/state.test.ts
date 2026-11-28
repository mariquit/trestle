// Copyright (c) 2026 John Anthony Mariquit <john@mariquit.com>
// SPDX-License-Identifier: Apache-2.0

import assert from "node:assert/strict";
import { test } from "node:test";
import { activate, banner, beforeIdle, compactionContext, discover, edited, initial, plan, readyToVerify, stop, verify, writeGate } from "../src/state.ts";
import { sessionStore } from "../src/store.ts";
import { isFrontendSkill, shellCommand, targets } from "../src/targets.ts";

const files: Record<string, string> = {
  "index.html": '<link rel="stylesheet" href="app.css"><main>Contact</main>',
  "app.css": '@import "basecoat-css";',
  "package.json": '{"dependencies":{"basecoat-css":"1.3.0"}}',
};
const read = async (path: string) => {
  if (!(path in files)) throw new Error("No fixture file");
  return files[path];
};
const evidence = {
  renderer: "Static HTML",
  frontend_stack: "other",
  cssEntrypoint: "app.css",
  basecoatOrDesignSystemVersion: "Basecoat 1.3.0",
  audienceAndPrimaryTask: "Residents need to find a contact address.",
  evidence: {
    renderer: { path: "index.html", excerpt: "<main>Contact</main>" },
    css: { path: "app.css", excerpt: files["app.css"] },
    designSystem: { path: "package.json", excerpt: '"basecoat-css":"1.3.0"' },
  },
};
const layout = {
  layoutPattern: "One contact section",
  mobileReadingOrder: ["Heading", "Address"],
  componentsAndContracts: [{ component: "Address", kind: "native", markup: "<address>", behaviorOwner: "Browser: static content" }],
  statesHandled: {
    empty: "Show unavailable contact information.",
    loading: "Not applicable: server-rendered document.",
    validation: "Not applicable: no form.",
    error: "Show the existing server error page.",
  },
};
const report = { checksRun: [], designDecisionSummary: "Keep the address directly below the heading.", passed: [], failed: [], unverified: ["Rendered narrow-screen layout"] };
const implementation = async () => plan(await discover(activate(initial()), evidence, read), layout);

test("only valid checkpoints unlock UI writes, in order", async () => {
  const idle = initial();
  assert.equal(banner(idle), undefined);
  const discovery = activate(idle);
  assert.match(writeGate(discovery) ?? "", /submit_discovery/);
  assert.throws(() => plan(discovery, layout), /1_DISCOVER/);
  const planning = await discover(discovery, evidence, read);
  assert.match(writeGate(planning) ?? "", /submit_frontend_plan/);
  assert.throws(() => plan(planning, { ...layout, mobileReadingOrder: [] }), /mobileReadingOrder/);
  assert.throws(() => plan(planning, { ...layout, componentsAndContracts: [] }), /componentsAndContracts/);
  assert.throws(() => plan(planning, { ...layout, statesHandled: { ...layout.statesHandled, error: "" } }), /error/);
  const allowed = plan(planning, layout);
  assert.equal(allowed.stage, "3_IMPLEMENT");
  assert.equal(writeGate(allowed), undefined);
});

test("discovery rejects empty claims, mismatched excerpts, and unconfirmed versions", async () => {
  const state = activate(initial());
  await assert.rejects(discover(state, { ...evidence, renderer: "  " }, read), /renderer/);
  await assert.rejects(discover(state, { ...evidence, basecoatOrDesignSystemVersion: "Basecoat" }, read), /design-system version/);
  await assert.rejects(discover(state, { ...evidence, basecoatOrDesignSystemVersion: "Basecoat 1.4.0" }, read), /claimed version/);
  await assert.rejects(discover(state, evidence, async () => "unrelated"), /does not match/);
  await assert.rejects(discover(state, evidence, async () => { throw new Error("not found"); }), /readable project file/);
  assert.equal(state.stage, "1_DISCOVER");
});

test("discovery records the target framework in the status and compaction context", async () => {
  const fixtures = {
    "site/src/pages/index.astro": "<main>Contact</main>",
    "site/package.json": '{"devDependencies":{"astro":"^7.0.0"}}',
    "app/main.py": "from fasthtml.common import *",
    "app/pyproject.toml": '[project]\ndependencies = [\n  "python-fasthtml>=0.12",\n]',
  };
  for (const [frontend_stack, path, excerpt] of [
    ["astro", "site/src/pages/index.astro", fixtures["site/src/pages/index.astro"]],
    ["astro", "site/package.json", '"astro":"^7.0.0"'],
    ["fasthtml", "app/main.py", fixtures["app/main.py"]],
    ["fasthtml", "app/pyproject.toml", '"python-fasthtml>=0.12"'],
  ]) {
    const state = await discover(activate(initial()), {
      ...evidence, frontend_stack, stackEvidence: [{ path, excerpt }],
    }, async (file) => fixtures[file as keyof typeof fixtures] ?? read(file));
    assert.equal(state.stage, "2_PLAN");
    assert.ok(banner(state)?.includes(`frontend_stack=${frontend_stack}`));
    assert.ok(compactionContext(state)?.includes(`"frontend_stack":"${frontend_stack}"`));
    assert.equal(activate({ ...state, stage: "DONE" }, true).discovery, undefined);
  }
});

test("inconclusive or conflicting stacks keep discovery blocked until confirmation is recorded", async () => {
  const state = activate(initial(), true);
  assert.match(banner(state) ?? "", /does not support React, Vue, or Svelte/);
  assert.doesNotMatch(banner(state) ?? "", /frontend_stack=/);
  await assert.rejects(discover(state, { ...evidence, frontend_stack: undefined }, read), /frontend_stack/);
  await assert.rejects(discover(state, { ...evidence, frontend_stack: "unknown", stackConfirmation: "Proceed unclassified." }, read), /frontend_stack/);
  await assert.rejects(discover(state, { ...evidence, frontend_stack: "astro" }, read), /missing stack evidence/);
  const mixed = {
    ...evidence, frontend_stack: "astro",
    stackEvidence: [
      { path: "site/index.astro", excerpt: "<main>Contact</main>" },
      { path: "app/main.py", excerpt: "from fasthtml.common import *" },
    ],
  };
  const readMixed = async (path: string) => mixed.stackEvidence.find((entry) => entry.path === path)?.excerpt ?? read(path);
  await assert.rejects(discover(state, mixed, readMixed), /conflicting or missing stack evidence/);
  const confirmed = await discover(state, { ...evidence, frontend_stack: "fasthtml", stackConfirmation: "The user identified the new app as FastHTML." }, read);
  assert.match(banner(confirmed) ?? "", /frontend_stack=fasthtml \(user-confirmed\)/);
});

test("unsupported and unclassified targets can end discovery without a stack flag", async () => {
  const state = activate(initial(), true);
  await assert.rejects(discover(state, { ...evidence, renderer: "React", stackConfirmation: "The user confirmed React." }, read), /use \/frontend-react/i);
  for (const [renderer, framework] of [["Vue 3", "Vue"], ["Nuxt 4", "Vue"], ["Svelte", "Svelte"], ["SvelteKit", "Svelte"]]) {
    await assert.rejects(discover(state, { ...evidence, renderer, stackConfirmation: `The user confirmed ${renderer}.` }, read), {
      message: `${framework} targets are outside /frontend.`,
    });
  }
  for (const [extension, framework] of [["vue", "Vue"], ["svelte", "Svelte"]]) {
    await assert.rejects(discover(state, {
      ...evidence,
      evidence: { ...evidence.evidence, renderer: { ...evidence.evidence.renderer, path: `Page.${extension}` } },
    }, read), { message: `${framework} targets are outside /frontend.` });
  }
  const stopped = stop(state);
  assert.equal(stopped.stage, "STOPPED");
  assert.equal(stopped.discovery, undefined);
  assert.doesNotMatch(compactionContext(stopped) ?? "", /frontend_stack/);
  assert.throws(() => plan(stopped, layout), /STOPPED/);
  assert.equal(activate(stopped), stopped);
  assert.equal(activate(stopped, true).stage, "1_DISCOVER");
});

test("edited work prompts verification once, and a later edit invalidates the report", async () => {
  const state = await implementation();
  assert.equal(beforeIdle(state).remind, false);
  const pending = beforeIdle(edited(state, ["index.html", "index.html"]));
  assert.equal(pending.remind, true);
  assert.equal(pending.state.stage, "4_VERIFY");
  assert.deepEqual(pending.state.modified, ["index.html"]);
  assert.equal(beforeIdle(pending.state).remind, false);
  assert.throws(() => verify(pending.state, { ...report, unverified: [] }), /at least one/);
  assert.throws(() => verify(pending.state, { ...report, passed: ["Browser"] }), /checks you ran/);
  const done = verify(pending.state, report);
  assert.equal(activate(done).stage, "DONE");
  assert.equal(activate(done, true).stage, "1_DISCOVER");
  assert.equal(beforeIdle(done).remind, false);
  const changed = edited(done, ["app.css"]);
  assert.equal(changed.verification, undefined);
  assert.deepEqual(changed.modified, ["app.css", "index.html"]);
  assert.equal(readyToVerify(changed).stage, "4_VERIFY");
  assert.equal(beforeIdle(changed).remind, true);
});

test("compaction is informational; durable storage restores the checkpoint without the banner", async () => {
  const data = new Map<string, string>();
  const storage = {
    get: async (key: string) => JSON.parse(data.get(key) ?? "null") ?? undefined,
    set: async (key: string, state: unknown) => { data.set(key, JSON.stringify(state)); },
  };
  const first = sessionStore(storage);
  await first.update("A", async () => edited(await implementation(), ["index.html"]));
  await Promise.all([
    first.update("A", (state) => edited(state, ["app.css"])),
    first.update("A", (state) => edited(state, ["contact.html"])),
  ]);
  const current = await first.read("A");
  const context = compactionContext(current) ?? "";
  assert.match(context, /3_IMPLEMENT/);
  assert.match(context, /Static HTML/);
  assert.match(context, /index\.html/);
  assert.doesNotMatch(context, /excerpt/);
  const reloaded = sessionStore(storage);
  assert.deepEqual(await reloaded.read("A"), current);
  assert.deepEqual(current.modified, ["app.css", "contact.html", "index.html"]);
  assert.deepEqual(await reloaded.read("B"), initial());
});

test("structured tool targets activate only for matching UI paths", () => {
  assert.deepEqual(targets("read", { path: "theme.CSS" }), { edit: false, files: ["theme.CSS"] });
  for (const tool of ["write", "edit"]) {
    assert.deepEqual(targets(tool, { filePath: "src/pages/index.astro" }), { edit: true, files: ["src/pages/index.astro"] });
  }
  assert.deepEqual(targets("patch", { patchText: "*** Update File: x.jinja\n*** Move to: y.njk\n*** Add File: notes.md" }).files, ["x.jinja", "y.njk"]);
  assert.deepEqual(targets("glob", { pattern: "**/*.{html,vue,md}" }).files, ["**/*.html"]);
  assert.deepEqual(targets("grep", { pattern: "match.html", include: "*.svelte" }).files, []);
  assert.deepEqual(targets("shell", { command: "echo index.html" }).files, []);
  assert.equal(shellCommand("bash", { command: "npx basecoat-cli" }), "npx basecoat-cli");
  assert.equal(isFrontendSkill("skill", { name: "frontend" }), true);
  assert.equal(isFrontendSkill("read", { name: "frontend" }), false);
});

test("TSX, Vue, and Svelte files do not trigger the frontend gate", () => {
  for (const extension of ["tsx", "vue", "svelte"]) {
    const path = `Page.${extension}`;
    assert.deepEqual(targets("read", { path }), { edit: false, files: [] });
    assert.deepEqual(targets("glob", { pattern: `**/*.${extension}` }), { edit: false, files: [] });
    for (const tool of ["write", "edit"]) {
      assert.deepEqual(targets(tool, { filePath: path }), { edit: true, files: [] });
    }
    assert.deepEqual(targets("patch", { patchText: `*** Add File: ${path}` }), { edit: true, files: [] });
  }
});
