// Copyright (c) 2026 John Anthony Mariquit <john@mariquit.com>
// SPDX-License-Identifier: Apache-2.0

import assert from "node:assert/strict";
import { test } from "node:test";
import { lint } from "./lint.ts";

test("cites exact prose excerpts in source order with one-based lines", () => {
  const source = "# Queue\r\n\r\nThe report is ready. It is important to note that the queue stalled.\r\n"
    + "It stalled—once, recovered – briefly, then stalled -- again.\r\n\r\n"
    + "Not only does the job retry, but also it logs failures.\r\n\r\n"
    + "It’s not just a worker. It’s a scheduler.\r\n";
  assert.deepEqual(lint(source), [
    { rule_id: "stock-framing", line: 3, excerpt: "It is important to note that" },
    { rule_id: "dash-density", line: 4, excerpt: "—" },
    { rule_id: "dash-density", line: 4, excerpt: "–" },
    { rule_id: "dash-density", line: 4, excerpt: "--" },
    { rule_id: "repeated-contrast", line: 6, excerpt: "Not only does the job retry, but also" },
    { rule_id: "repeated-contrast", line: 8, excerpt: "It’s not just a worker. It’s" },
  ]);
});

test("leaves isolated, sparse, and similar-looking patterns alone", () => {
  const words = "The worker checks each task before scheduling the next attempt. ".repeat(8);
  assert.deepEqual(lint(`It failed—once. Then it recovered—briefly. ${words} It failed—again.\n\n`
    + "It’s not just a worker. It’s a scheduler.\n\n"
    + "The worker is not only a scheduler. We reviewed the years 2011–2014 and 2018-2019. "
    + "At its coreless end, the motor has a small bearing."), []);
});

test("skips protected Markdown and quoted language without losing source lines", () => {
  const phrase = "Let's dive in";
  const blocks = [
    `---\n${phrase}\n---`, `# ${phrase}`, `${phrase}\n====`,
    `> ${phrase}.\nThis is a lazy continuation—one—two—three.`,
    `~~~md\n${phrase}\n~~~`, `    ${phrase}`,
    `| ${phrase} |\n| --- |\n| A—B—C—D |`,
    `- ${phrase}.`, `[${phrase}](https://example.test/Here---we---go)`,
    `“${phrase}. A—B—C—D.”`, `'${phrase}. We can't use A—B—C—D.'`,
    `\`${phrase}. A—B—C—D.\``, `*${phrase}*`,
    "https://example.test/A—B—C—D", "/docs/queue--draft",
    `<span>${phrase}.</span>`, `[reference]: https://example.test/A—B—C—D "${phrase}"`,
    `The README says, “${phrase} on\nthe next line. A—B—C—D.”`,
    `It's not just \`a worker\`. It's a scheduler.`,
  ];
  const protectedText = blocks.join("\n\n");
  assert.deepEqual(lint(protectedText), []);
  assert.deepEqual(lint(`${protectedText}\n\n${phrase}.`), [
    { rule_id: "stock-framing", line: protectedText.split("\n").length + 2, excerpt: phrase },
  ]);
});
