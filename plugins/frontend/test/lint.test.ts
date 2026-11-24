// Copyright (c) 2026 John Anthony Mariquit <john@mariquit.com>
// SPDX-License-Identifier: Apache-2.0

import assert from "node:assert/strict";
import { test } from "node:test";
import { lintShell, lintUi } from "../src/lint.ts";

test("frontend lint ignores TSX imports and markup", () => {
  assert.deepEqual(lintUi('import "basecoat-css/all";\nimport "basecoat-css/tabs";\n<button />', "Page.tsx"), []);
});

test("frontend lint ignores markup in Vue and Svelte components", () => {
  for (const path of ["Page.vue", "Page.svelte"]) {
    assert.deepEqual(lintUi("<button></button>", path), []);
  }
});

test("shell lint identifies the deprecated CLI without flagging basecoat-css", () => {
  assert.match(lintShell("npx basecoat-cli@latest install")[0], /BC001/);
  assert.deepEqual(lintShell("npm install basecoat-css"), []);
});

test("mixed Basecoat script loads are flagged, but a runtime with component scripts is valid", () => {
  const component = '<script defer src="/assets/js/dropdown-menu.min.js"></script>';
  const all = '<script src="https://cdn.jsdelivr.net/npm/basecoat-css@1.3.0/dist/js/all.min.js"></script>';
  assert.deepEqual(lintUi(all + component, "index.html").map((warning) => warning.rule), ["BC002"]);
  assert.deepEqual(lintUi('<script src="/assets/js/basecoat.min.js"></script>' + component, "index.html"), []);
  assert.deepEqual(lintUi(`<script type="module">import "basecoat-css/all";\nimport "basecoat-css/tabs";</script>`, "index.html").map((warning) => warning.rule), ["BC002"]);
});

test("HTML lint reports unactionable markup with line numbers", () => {
  const markup = [
    '<button><svg aria-hidden="true"></svg></button>',
    '<div onclick="toggle()">Toggle</div>',
    '<span onClick={close}>Close</span>',
    '<input type="email" id="email" aria-invalid="true">',
    '<label for="name">Name</label>',
    '<input id="name" aria-invalid="true" aria-describedby="missing">',
  ].join("\n");
  assert.deepEqual(lintUi(markup, "page.html").map(({ line, rule }) => [line, rule]), [
    [1, "A11Y001"], [2, "A11Y002"], [3, "A11Y002"], [4, "A11Y003"], [4, "A11Y004"], [6, "A11Y004"],
  ]);
});

test("accessible controls and template comments do not produce warnings", () => {
  const markup = `
{# <button></button><input> #}
{% if can_edit %}<button aria-label="Edit"><svg aria-hidden="true"></svg></button>{% endif %}
<button aria-labelledby="edit-label"><svg></svg></button>
<button><span class="sr-only">Close</span></button>
<span id="edit-label">Edit details</span>
<label for="email">Email</label><input id="email" aria-invalid="true" aria-describedby="email-error">
<p id="email-error">Enter a valid email address.</p>
<label><input type="checkbox">Remember</label>
<input type="hidden" name="token">
<button><img src="bin.svg" alt="Delete"></button>`;
  assert.deepEqual(lintUi(markup, "form.html.jinja"), []);
  assert.deepEqual(lintUi("<input>", "app.css"), []);
});
