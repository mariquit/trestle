// Copyright (c) 2026 John Anthony Mariquit <john@mariquit.com>
// SPDX-License-Identifier: Apache-2.0

import type { Content, Paragraph, Root } from "mdast";
import { fromMarkdown } from "mdast-util-from-markdown";
import { gfmAutolinkLiteralFromMarkdown } from "mdast-util-gfm-autolink-literal";
import { gfmTableFromMarkdown } from "mdast-util-gfm-table";
import { gfmAutolinkLiteral } from "micromark-extension-gfm-autolink-literal";
import { gfmTable } from "micromark-extension-gfm-table";

const DASH_DENSITY = "dash-density";
const STOCK_FRAMING = "stock-framing";
const REPEATED_CONTRAST = "repeated-contrast";
type RuleId = typeof DASH_DENSITY | typeof STOCK_FRAMING | typeof REPEATED_CONTRAST;
type Finding = { rule_id: RuleId; line: number; excerpt: string };

// A non-whitespace barrier prevents a match from bridging protected content.
const MASK = "\u0000";
const QUOTATIONS = /“[^”]*(?:”|$)|‘(?:[^’]|’(?=[\p{L}\p{N}]))*(?:’|$)|(?<!\\)"(?:\\.|[^"\\])*(?:"|$)|(?<![\p{L}\p{N}\\])'(?=\S)(?:[^']|'(?=[\p{L}\p{N}]))*(?:'|$)/gu;
const PATHS = /(?<![\p{L}\p{N}._/])(?:~?\/|\.{1,2}\/|[\p{L}\p{N}_.-]+\/)[\p{L}\p{N}_.~/\-]+/gu;
const DASH = /—|–|--/gu;
const FRAMING = /(?:^\s*|[.!?]\s+)(let['’]s (?:dive in|take a closer look)|here['’]s what you need to know|it is important to note that|in this section|at its core)(?=[ \t\r\n,.:!?]|$)/gi;
const CONTRAST = /(?:^\s*|[.!?]\s+)((?:not only [^.!?\r\n\u0000]{1,100}?[ \t]+but also\b|(?:(?:it|this|that) isn['’]t|(?:it is|this is|that is|it['’]s|that['’]s) not (?:just|merely|only)) [^.!?\r\n\u0000]{1,100}?(?:[ \t]+but also\b|[.;,][ \t]+(?:it['’]s|it is|this is|that['’]s|that is)\b)))/gi;

function mask(text: string): string {
  return text.replace(/[^\r\n]/g, MASK);
}

function* paragraphs(node: Root | Content): Generator<Paragraph> {
  // Leave list items to the editor: many are labels, commands, or runbook steps.
  if (node.type === "root") {
    for (const child of node.children) yield* paragraphs(child);
  } else if (node.type === "paragraph" && !node.children.some((child) => child.type === "html")) {
    yield node;
  }
}

function eligible(source: string, paragraph: Paragraph): string {
  let cursor = paragraph.position!.start.offset!;
  let text = "";
  for (const node of paragraph.children) {
    const { start, end } = node.position!;
    text += mask(source.slice(cursor, start.offset));
    const raw = source.slice(start.offset, end.offset);
    text += node.type === "text" ? raw : mask(raw);
    cursor = end.offset!;
  }
  return text.replace(QUOTATIONS, mask).replace(PATHS, mask);
}

function withoutFrontmatter(source: string): string {
  // Frontmatter is a document prelude, not CommonMark. Blank it without changing offsets.
  const opener = /^\uFEFF?(---|\+\+\+)[ \t]*(?:\r\n|\r|\n)/.exec(source);
  if (!opener) return source;
  const close = opener[1] === "---" ? /^(?:---|\.\.\.)[ \t]*$/m : /^\+\+\+[ \t]*$/m;
  const rest = source.slice(opener[0].length);
  const end = close.exec(rest);
  if (!end) return source;
  const length = opener[0].length + end.index + end[0].length;
  return source.slice(0, length).replace(/[^\r\n]/g, " ") + source.slice(length);
}

export function lint(source: string): Finding[] {
  const tree = fromMarkdown(withoutFrontmatter(source), {
    extensions: [gfmTable(), gfmAutolinkLiteral()],
    mdastExtensions: [gfmTableFromMarkdown(), gfmAutolinkLiteralFromMarkdown()],
  });
  const findings: (Finding & { offset: number })[] = [];
  const contrasts: typeof findings = [];
  for (const paragraph of paragraphs(tree)) {
    const start = paragraph.position!.start;
    const text = eligible(source, paragraph);
    const lineStarts = [0, ...Array.from(text.matchAll(/\r\n|\r|\n/g), (match) => match.index + match[0].length)];
    function cite(rule_id: RuleId, index: number, length: number) {
      const offset = start.offset! + index;
      let low = 0;
      let high = lineStarts.length;
      while (high - low > 1) {
        const middle = Math.floor((low + high) / 2);
        if (lineStarts[middle] <= index) low = middle;
        else high = middle;
      }
      return { rule_id, offset, line: start.line + low, excerpt: source.slice(offset, offset + length) };
    }
    const dashes = [...text.matchAll(DASH)].flatMap((match) => {
      const dash = match[0];
      let before = match.index;
      let after = match.index + dash.length;
      while (text[before - 1] === " " || text[before - 1] === "\t") before--;
      while (text[after] === " " || text[after] === "\t") after++;
      if (dash !== "—" && (before === match.index || after === match.index + dash.length)) return [];
      if (!/[\p{L}\p{N})!?]$/u.test(text.slice(Math.max(0, before - 2), before)) ||
          !/^[\p{L}\p{N}(]/u.test(text.slice(after, after + 2))) return [];
      return [cite(DASH_DENSITY, match.index, dash.length)];
    });
    const words = text.match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu)?.length ?? 0;
    if (dashes.length >= 3 && words <= dashes.length * 25) {
      // Cite each match rather than including intervening protected spans.
      findings.push(...dashes);
    }
    for (const match of text.matchAll(FRAMING)) {
      findings.push(cite(STOCK_FRAMING, match.index + match[0].lastIndexOf(match[1]), match[1].length));
    }
    for (const match of text.matchAll(CONTRAST)) {
      contrasts.push(cite(REPEATED_CONTRAST, match.index + match[0].lastIndexOf(match[1]), match[1].length));
    }
  }
  if (contrasts.length >= 2) findings.push(...contrasts);
  return findings.sort((a, b) => a.offset - b.offset)
    .map(({ rule_id, line, excerpt }) => ({ rule_id, line, excerpt }));
}
