// Copyright (c) 2026 John Anthony Mariquit <john@mariquit.com>
// SPDX-License-Identifier: Apache-2.0

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const IMPLICIT_VALUES = /^(?:true|false|null|yes|no|on|off)$/i;
const SECURITY_RULES = [
  ["private key header", /-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY-----/i],
  ["token-shaped credential", /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|sk-(?:proj-)?[A-Za-z0-9_-]{20,}|AKIA[A-Z0-9]{16})\b/i],
  ["potential download-and-execute", /\b(?:curl|wget)\b[^\n]*\|\s*(?:sudo\s+)?(?:\S*\/)?(?:ba|z|da|k)?sh\b/i],
  ["potential instruction override", /\b(?:ignore|disregard) (?:all )?(?:(?:previous|prior|system|developer) )+instructions\b/i],
] as const;

// Match the former checker's splitlines boundaries, including Unicode separators.
function linesOf(text: string): string[] {
  return text.split(/\r\n|[\n\r\v\f\x1c-\x1e\x85\u2028\u2029]/);
}

function lint(name: string, lines: string[]): string | undefined {
  const end = lines.indexOf("---", 1);
  if (lines[0] !== "---" || end === -1) return "expected opening and closing frontmatter delimiters";
  const fields = lines.slice(1, end).filter((line) => line.trim()).join("\n");
  if (/[\x00-\x09\x0b-\x1f\x7f-\x9f\ufeff\ufffe\uffff]/.test(fields)) {
    return "frontmatter contains a tab or unsupported control character";
  }
  // This repository deliberately uses a restricted, dependency-free YAML subset.
  const scalar = String.raw`[A-Za-z](?:[^\n\t]*[^\s])?`;
  const legacyField = name === "de-slop" ? 'argument: "[-i | --overwrite | -r | --review] <file_path_or_text>"\n'
    : name === "terse" ? "keep-coding-instructions: true\n" : "";
  const legacyMetadata = name === "de-slop" ? "\n  required-capabilities:\n    - file-read\n    - file-write" : "";
  const id = RegExp.escape(name);
  const schema = new RegExp(
    String.raw`^name: ${id}\ndescription: (${scalar})\n${RegExp.escape(legacyField)}`
    + String.raw`(?:author: (${scalar})\n)?license: Apache-2\.0\nmetadata:\n  copyright: Copyright \(c\) [0-9]{4} (${scalar})${RegExp.escape(legacyMetadata)}$`,
  );
  const match = schema.exec(fields);
  if (!match || match.slice(1).some((value) => value && /:(?:\s|$)|\s#/.test(value))) {
    return "frontmatter does not match the plain-scalar schema in AGENTS.md";
  }
  const description = match[1];
  if (Array.from(description).length > 1024 || match.slice(1).some((value) => value && IMPLICIT_VALUES.test(value))) {
    return "description must be prose of at most 1024 characters; use text, not YAML implicit values";
  }
  const slashCommand = `/${name}\``;
  const trigger = new RegExp(String.raw`(?:^|\. )Use when the user runs ${RegExp.escape("`" + slashCommand)} or asks to "[^"\n]+"\.$`);
  if (!trigger.test(description) || description.split(slashCommand).length !== 2) {
    return `finish the description with: Use when the user runs \`/${name}\` or asks to "<phrase>".`;
  }
  if (!lines.slice(end + 1).some((line) => line.trim())) return "skill body is empty";
}

function check(action: "lint" | "security", catalog: string[]): boolean {
  let passed = true;
  for (const name of catalog) {
    const filename = `${name}.md`;
    const lines = linesOf(readFileSync(join(ROOT, filename), "utf8"));
    if (action === "lint") {
      const error = lint(name, lines);
      if (error) {
        console.log(`${filename}: ${error}`);
        passed = false;
      }
    } else {
      for (const [index, line] of lines.entries()) {
        for (const [label, pattern] of SECURITY_RULES) {
          if (pattern.test(line)) {
            console.log(`${filename}:${index + 1}: ${label}`);
            passed = false;
          }
        }
      }
    }
  }
  if (passed) console.log(`${action}: checked ${catalog.length} skills`);
  return passed;
}

function main(args: string[]): number {
  const usage = "Usage: node tests/check_skills.ts [lint | security]";
  const [action] = args;
  if (args.length === 1 && (action === "-h" || action === "--help")) {
    console.log(`${usage}\nCheck the Trestle catalog's frontmatter and scan for suspicious patterns.`);
    return 0;
  }
  if (args.length > 1 || (args.length === 1 && action !== "lint" && action !== "security")) {
    console.error(usage);
    return 2;
  }
  try {
    const catalog = linesOf(execFileSync(join(ROOT, "install.sh"), ["--list-skills"], { encoding: "utf8" }));
    if (catalog.at(-1) === "") catalog.pop();
    if (!catalog.length || new Set(catalog).size !== catalog.length || catalog.some((name) => name.length > 64 || !NAME.test(name))) {
      throw new Error("skill names must be unique, lowercase kebab-case identifiers of at most 64 characters");
    }
    const actions = action === "lint" || action === "security" ? [action] as const : ["lint", "security"] as const;
    return actions.map((mode) => check(mode, catalog)).every(Boolean) ? 0 : 1;
  } catch (error) {
    console.error(`check_skills: ${error instanceof Error ? error.message : error}`);
    return 1;
  }
}

process.exitCode = main(process.argv.slice(2));
