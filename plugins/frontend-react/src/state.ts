// Copyright (c) 2026 John Anthony Mariquit <john@mariquit.com>
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";
import type { summarizeConfig } from "./project.ts";

const text = z.string().trim().min(1).max(1000);
const list = z.array(text).max(30);
const projectPath = z.string().max(300).refine((path) => path === "." ||
  (/^[\w.@ -]+(?:\/[\w.@ -]+)*$/.test(path) && path.split("/").every((part) => ![".", ".."].includes(part))),
"Use a relative path without parent traversal.");

export const discoveryInput = z.strictObject({
  packageRoot: projectPath,
  entry: projectPath.describe("React DOM bootstrap, relative to packageRoot."),
  viteConfig: text.optional().describe("Vite config filename in packageRoot if needed to establish Vite usage."),
  audienceAndTask: text,
});

export const planInput = z.strictObject({
  layout: text,
  mobileReadingOrder: list.min(1),
  states: z.strictObject({ empty: text, loading: text, validation: text, error: text }),
  components: z.array(z.strictObject({
    name: text,
    contract: text,
    behaviorOwner: text,
    source: z.discriminatedUnion("kind", [
      z.strictObject({ kind: z.literal("native") }),
      z.strictObject({ kind: z.literal("local"), path: projectPath }),
      z.strictObject({ kind: z.literal("registry"), item: text, inspection: text, files: list.min(1), dependencies: list, themeImpact: text }),
    ]),
  })).min(1).max(30),
});

export const verificationInput = z.strictObject({
  designDecision: text,
  checks: list,
  passed: list,
  failed: list,
  unverified: list,
});

export type Stage = "IDLE" | "DISCOVER" | "PLAN" | "IMPLEMENT" | "VERIFY" | "DONE" | "STOPPED";
export type State = {
  stage: Stage;
  discovery?: z.infer<typeof discoveryInput>;
  config?: ReturnType<typeof summarizeConfig>;
  plan?: z.infer<typeof planInput>;
  verification?: z.infer<typeof verificationInput>;
  files: string[];
};

export const initial = (): State => ({ stage: "IDLE", files: [] });
export const activate = (state: State): State => ["IDLE", "DONE", "STOPPED"].includes(state.stage)
  ? { ...initial(), stage: "DISCOVER" } : state;

export function requireStage(state: State, ...allowed: Stage[]): void {
  if (!allowed.includes(state.stage)) throw new Error(`Not available in ${state.stage}. ${status(state) ?? "Invoke /frontend-react first."}`);
}

export const blocksWrite = (state: State): boolean => ["DISCOVER", "PLAN"].includes(state.stage);
export const tracksWrite = (state: State): boolean => ["IMPLEMENT", "VERIFY", "DONE"].includes(state.stage);

export function edited(state: State, files: string[]): State {
  if (!files.length || !tracksWrite(state)) return state;
  return { ...state, stage: "VERIFY", verification: undefined, files: [...new Set([...state.files, ...files])].sort() };
}

export function verify(state: State, input: unknown): State {
  requireStage(state, "IMPLEMENT", "VERIFY");
  const verification = verificationInput.parse(input);
  if (!verification.passed.length && !verification.failed.length && !verification.unverified.length) throw new Error("Report an observed result or an unverified check.");
  if ((verification.passed.length || verification.failed.length) && !verification.checks.length) throw new Error("List the checks actually run.");
  return { ...state, stage: "DONE", verification };
}

const tools: Partial<Record<Stage, string>> = {
  DISCOVER: "frontend_react_discover",
  PLAN: "frontend_react_plan",
  IMPLEMENT: "Implement the plan if requested, then call frontend_react_verify",
  VERIFY: "frontend_react_verify",
};

export function status(state: State): string | undefined {
  if (state.stage === "IDLE") return;
  return `Frontend React gate: ${state.stage}.${blocksWrite(state) ? " Structured UI edits are blocked." : ""}${tools[state.stage] ? ` Next: ${tools[state.stage]}.` : ""}`;
}
