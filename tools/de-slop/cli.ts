// Copyright (c) 2026 John Anthony Mariquit <john@mariquit.com>
// SPDX-License-Identifier: Apache-2.0

import { readFileSync } from "node:fs";
import { lint } from "./lint.ts";

const args = process.argv.slice(2);
if (args.length !== 1 || args[0] === "--help") {
  const help = args.length === 1;
  (help ? console.log : console.error)("Usage: node lint.mjs <markdown-file | ->");
  process.exitCode = help ? 0 : 2;
} else {
  try {
    const source = readFileSync(args[0] === "-" ? 0 : args[0], "utf8");
    console.log(JSON.stringify(lint(source)));
  } catch (error) {
    console.error(`de-slop lint: ${error instanceof Error ? error.message : error}`);
    process.exitCode = 1;
  }
}
