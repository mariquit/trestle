// Copyright (c) 2026 John Anthony Mariquit <john@mariquit.com>
// SPDX-License-Identifier: Apache-2.0

import { DomUtils, parseDocument } from "htmlparser2";
import { isTag } from "domhandler";

export interface Diagnostic { line: number; rule: string; message: string }

export function lintShell(command: string): string[] {
  return /(?:^|[\s/'"@;&|])basecoat-cli(?=$|[\s@'";&|])/m.test(command)
    ? ["BC001: `basecoat-cli` is deprecated; use `basecoat-css` and copy any required templates from the installed package."]
    : [];
}

const mixedBundle = /(?:^|\/)basecoat-css(?:@[^/]+)?\/(?:dist\/js\/)?all(?:\.min)?(?:\.js)?(?:$|[?#])|(?:^|\/)js\/all(?:\.min)?\.js(?:$|[?#])/i;
const individualBundle = /(?:^|\/)basecoat-css(?:@[^/]+)?\/(?:dist\/js\/)?(?:basecoat|accordion|carousel|code-block|combobox|command|dropdown-menu|drawer|input-otp|popover|range|select|sidebar|tabs|toast)(?:\.min)?(?:\.js)?(?:$|[?#])|(?:^|\/)js\/(?:basecoat|accordion|carousel|code-block|combobox|command|dropdown-menu|drawer|input-otp|popover|range|select|sidebar|tabs|toast)(?:\.min)?\.js(?:$|[?#])/i;

export function lintUi(source: string, path: string): Diagnostic[] {
  if (/\.css$/i.test(path)) return [];

  // Match source offsets while removing template comments and non-markup code.
  const markup = source.replace(/\{#[\s\S]*?#\}|\{%[\s\S]*?%\}/g, (part) => part.replace(/[^\n]/g, " "));
  const document = parseDocument(markup, { withStartIndices: true, recognizeSelfClosing: true });
  const tags = DomUtils.findAll(isTag, document.children);
  type Element = typeof tags[number];
  const warnings: Diagnostic[] = [];
  const add = (tag: Element, rule: string, message: string) => {
    if (warnings.length >= 30) return;
    const line = source.slice(0, tag.startIndex ?? 0).split("\n").length;
    warnings.push({ line, rule, message });
  };

  const scripts = tags.filter((tag) => tag.name === "script");
  const imports = (code: string) => [...code.matchAll(/(?:\bimport\s*(?:\([^)]*?\s*|[^;\n]*?\s+from\s+)?|\bexport\s+[^;\n]*?\s+from\s+)["'](basecoat-css\/[^"']+)["']/g)].map((match) => match[1]);
  const sources = scripts.flatMap((tag) => [tag.attribs.src ?? "", ...imports(DomUtils.textContent(tag))]);
  if (/\.tsx$/i.test(path)) sources.push(...imports(markup));
  if (sources.some((src) => mixedBundle.test(src)) && sources.some((src) => individualBundle.test(src))) {
    if (scripts.length) {
      add(scripts[0], "BC002", "Use the Basecoat all-in-one bundle or the runtime and individual scripts, not both.");
    } else {
      warnings.push({ line: 1, rule: "BC002", message: "Use the Basecoat all-in-one bundle or individual imports, not both." });
    }
  }

  const ids = new Set(tags.map((tag) => tag.attribs.id).filter(Boolean));
  const labels = new Set(tags.filter((tag) => tag.name === "label").map((tag) => tag.attribs.for ?? tag.attribs.htmlfor).filter(Boolean));
  const dynamic = (value: string) => /[{}]/.test(value);
  const described = (value: string) => !!value.trim() && (dynamic(value) || value.trim().split(/\s+/).every((id) => ids.has(id)));
  const accessibleText = (tag: Element): string => {
    if (tag.attribs["aria-hidden"] === "true" || "hidden" in tag.attribs) return "";
    if (tag.name === "svg") return DomUtils.textContent(tag.children.filter((child) => isTag(child) && child.name === "title"));
    if (tag.name === "img") return tag.attribs.alt ?? "";
    return tag.children.map((child) => isTag(child) ? accessibleText(child) : DomUtils.textContent(child)).join("");
  };
  for (const tag of tags) {
    const a = tag.attribs;
    const named = !!(a["aria-label"] ?? a[":aria-label"] ?? a["v-bind:aria-label"] ?? "").trim()
      || described(a["aria-labelledby"] ?? a[":aria-labelledby"] ?? "");
    if (tag.name === "button" && !named && !accessibleText(tag).trim()) {
      add(tag, "A11Y001", "Give this button an accessible name with text, aria-label, or a valid aria-labelledby reference.");
    }
    if (["div", "span"].includes(tag.name) && Object.keys(a).some((key) =>
      /^(?:onclick|on:click|@click|v-on:click)(?:\.|$)/.test(key))) {
      add(tag, "A11Y002", "Use a native button for actions or a link with href for navigation instead of a click handler on this element.");
    }
    if (!["input", "select", "textarea"].includes(tag.name) ||
      /^(?:hidden|submit|reset|button|image)$/i.test(a.type ?? "")) continue;

    let wrappingLabel = false;
    for (let parent = tag.parent; parent && isTag(parent); parent = parent.parent) {
      if (parent.name === "label") { wrappingLabel = true; break; }
    }
    if (!named && !labels.has(a.id) && !wrappingLabel) {
      add(tag, "A11Y003", "Associate this control with a visible label, or give it an accessible name when a visible label is not appropriate.");
    }
    if (a["aria-invalid"] === "true" && !described(a["aria-describedby"] ?? a[":aria-describedby"] ?? "")) {
      add(tag, "A11Y004", "Link the invalid control to its error text with aria-describedby and a matching ID.");
    }
  }
  return warnings;
}
