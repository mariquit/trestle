// Copyright (c) 2026 John Anthony Mariquit <john@mariquit.com>
// SPDX-License-Identifier: Apache-2.0

import assert from "node:assert/strict";
import { test } from "node:test";
import { checkStack, discoverProject, summarizeConfig } from "../src/project.ts";
import { activate, blocksWrite, edited, initial, planInput, verify } from "../src/state.ts";
import { editTargets } from "../src/index.ts";

const bootstrap = 'import { createRoot } from "react-dom/client";';
const manifest = (extra = {}) => JSON.stringify({
  dependencies: { react: "19", "react-dom": "19", ...extra },
  devDependencies: { vite: "8" }, scripts: { build: "tsc -b && vite build" },
});

test("discovery accepts the target Vite React package without inspecting unrelated packages", async () => {
  const files = new Map([
    ["package.json", manifest({ next: "16" })],
    ["apps/ui/package.json", manifest()],
    ["apps/ui/src/main.tsx", bootstrap],
    ["apps/ui/components.json", '{"style":"base-nova","rsc":false}'],
  ]);
  assert.deepEqual(await discoverProject("apps/ui", "src/main.tsx", undefined, async (path) => files.get(path)), {
    present: true, style: "base-nova", rsc: false,
  });
});

test("unsupported dependencies and non-React entry points do not qualify", () => {
  for (const name of ["next", "vue", "nuxt", "@remix-run/react", "react-router-dom", "@tanstack/react-router", "svelte", "@sveltejs/kit", "react-native"]) {
    assert.throws(() => checkStack(manifest({ [name]: "1" }), bootstrap), /Unsupported target dependencies/);
  }
  assert.throws(() => checkStack(manifest(), 'import { createApp } from "vue";'), /React DOM bootstrap/);
  assert.throws(() => checkStack('{"dependencies":{"react":"19","react-dom":"19"}}', bootstrap), /vite, react, and react-dom/);
});

test("shadcn summary omits registry credentials and accepts manually adopted setups", () => {
  assert.deepEqual(summarizeConfig(undefined), { present: false });
  assert.deepEqual(summarizeConfig(JSON.stringify({
    style: "base-nova", aliases: { ui: "~/components/ui" }, tailwind: { css: "src/styles/globals.css" },
    registries: { "@internal": { url: "https://example.test/{name}?key=sensitive", headers: { Authorization: "sensitive" } } },
  })), { present: true, style: "base-nova", aliases: { ui: "~/components/ui" }, tailwind: { css: "src/styles/globals.css" } });
  assert.throws(() => summarizeConfig('{"rsc":true}'), /Server Components/);
});

test("registry plans require a file preview, dependency list, and theme impact", () => {
  const source = { kind: "registry", item: "dialog", inspection: "Reviewed shadcn add dialog --dry-run", files: ["src/ui/dialog.tsx"], dependencies: [], themeImpact: "No changes" };
  const layout = { layout: "Single column", mobileReadingOrder: ["Heading", "Action"], states: { empty: "No records", loading: "Spinner", validation: "Field errors", error: "Retry" } };
  const component = { name: "Dialog", contract: "Trigger and titled content", behaviorOwner: "Dialog primitive" };
  assert.ok(planInput.safeParse({ ...layout, components: [{ ...component, source }] }).success);
  assert.ok(!planInput.safeParse({ ...layout, components: [{ ...component, source: { ...source, files: [], themeImpact: "" } }] }).success);
});

test("early structured UI edits are gated and later edits invalidate verification", () => {
  assert.equal(blocksWrite(initial()), false);
  assert.equal(blocksWrite(activate(initial())), true);
  assert.equal(blocksWrite({ stage: "PLAN", files: [] }), true);
  assert.deepEqual(editTargets("patch", { patchText: "*** Update File: App.tsx\n*** Add File: components.json\n*** Add File: notes.md" }), ["App.tsx", "components.json"]);
  assert.deepEqual(editTargets("read", { path: "App.tsx" }), []);
  const report = { designDecision: "Put the action next to the heading.", checks: [], passed: [], failed: [], unverified: ["Browser keyboard behavior"] };
  assert.throws(() => verify(activate(initial()), report), /DISCOVER/);
  const done = verify(edited({ stage: "IMPLEMENT", files: [] }, ["App.tsx"]), report);
  assert.equal(done.stage, "DONE");
  assert.deepEqual(edited(done, ["App.tsx", "styles.css"]).files, ["App.tsx", "styles.css"]);
  assert.equal(edited(done, ["App.tsx"]).verification, undefined);
});
