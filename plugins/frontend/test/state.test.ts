// Copyright (c) 2026 John Anthony Mariquit <john@mariquit.com>
// SPDX-License-Identifier: Apache-2.0

import assert from "node:assert/strict";
import { test } from "node:test";
import { activate, banner, beforeIdle, compactionContext, discover, edited, initial, plan, readyToVerify, verify, writeGate } from "../src/state.ts";
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
  assert.match(writeGate(planning) ?? "", /submit_plan/);
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
    assert.deepEqual(targets(tool, { filePath: "Page.tsx" }), { edit: true, files: ["Page.tsx"] });
  }
  assert.deepEqual(targets("patch", { patchText: "*** Update File: x.jinja\n*** Move to: y.njk\n*** Add File: notes.md" }).files, ["x.jinja", "y.njk"]);
  assert.deepEqual(targets("glob", { pattern: "**/*.{html,vue,md}" }).files, ["**/*.html", "**/*.vue"]);
  assert.deepEqual(targets("grep", { pattern: "match.html", include: "*.svelte" }).files, ["*.svelte"]);
  assert.deepEqual(targets("shell", { command: "echo index.html" }).files, []);
  assert.equal(shellCommand("bash", { command: "npx basecoat-cli" }), "npx basecoat-cli");
  assert.equal(isFrontendSkill("skill", { name: "frontend" }), true);
  assert.equal(isFrontendSkill("read", { name: "frontend" }), false);
});
