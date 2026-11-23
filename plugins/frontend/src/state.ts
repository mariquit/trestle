// Copyright (c) 2026 John Anthony Mariquit <john@mariquit.com>
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";

const text = z.string().trim().min(1).max(1000).refine(
  (value) => !/^(?:unknown|unverified|tbd|n\/?a|none|todo|not checked)[.!]?$/i.test(value),
  "Provide a specific value or explain why this does not apply.",
);
const items = z.array(text).max(30);

export const discoveryInput = z.strictObject({
  renderer: text,
  cssEntrypoint: text,
  basecoatOrDesignSystemVersion: text,
  audienceAndPrimaryTask: text,
  evidence: z.strictObject({
    renderer: z.strictObject({ path: text, excerpt: text }),
    css: z.strictObject({ path: text, excerpt: text }),
    designSystem: z.strictObject({ path: text, excerpt: text }),
  }),
});

export const planInput = z.strictObject({
  layoutPattern: text,
  mobileReadingOrder: items.min(1),
  componentsAndContracts: z.array(z.strictObject({
    component: text,
    kind: z.enum(["native", "basecoat", "existing-design-system"]),
    markup: text,
    behaviorOwner: text.describe("Name the browser behavior, app controller, or required component script."),
  })).min(1).max(30),
  statesHandled: z.strictObject({ empty: text, loading: text, validation: text, error: text }),
});

export const verificationInput = z.strictObject({
  checksRun: items,
  designDecisionSummary: text,
  passed: items,
  failed: items,
  unverified: items,
});

export type Discovery = z.infer<typeof discoveryInput>;
export type Plan = z.infer<typeof planInput>;
export type Verification = z.infer<typeof verificationInput>;
export type Stage = "IDLE" | "1_DISCOVER" | "2_PLAN" | "3_IMPLEMENT" | "4_VERIFY" | "DONE";

export interface State {
  stage: Stage;
  discovery?: Discovery;
  plan?: Plan;
  verification?: Verification;
  modified: string[];
  reminderSent: boolean;
}

export const initial = (): State => ({ stage: "IDLE", modified: [], reminderSent: false });

function parse<T extends z.ZodType>(schema: T, input: unknown): z.output<T> {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new Error(result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; "));
  }
  return result.data;
}

export function activate(state: State, explicit = false): State {
  return state.stage === "IDLE" || (state.stage === "DONE" && explicit)
    ? { ...initial(), stage: "1_DISCOVER" }
    : state;
}

const steps: Record<Stage, string> = {
  IDLE: "inspect a UI target or load the frontend skill",
  "1_DISCOVER": "call submit_discovery",
  "2_PLAN": "call submit_plan",
  "3_IMPLEMENT": "implement the plan, then call complete_verification",
  "4_VERIFY": "call complete_verification",
  DONE: "continue or start another frontend workflow",
};

export function writeGate(state: State): string | undefined {
  if (state.stage === "1_DISCOVER" || state.stage === "2_PLAN") {
    return `UI edits are blocked in ${state.stage}; ${steps[state.stage]} before editing.`;
  }
}

export async function discover(state: State, input: unknown, read: (path: string) => Promise<string>): Promise<State> {
  if (state.stage !== "1_DISCOVER") throw new Error(`Cannot submit discovery in ${state.stage}; ${steps[state.stage]}.`);
  const discovery = parse(discoveryInput, input);
  for (const [field, { path, excerpt }] of Object.entries(discovery.evidence)) {
    let contents: string;
    try {
      contents = await read(path);
    } catch {
      throw new Error(`Discovery evidence for ${field} must reference a readable project file: ${path}.`);
    }
    if (!contents.includes(excerpt)) throw new Error(`Discovery evidence for ${field} does not match ${path}.`);

    // Local evidence checks are deliberately narrower than semantic review of the claims.
    if (field === "css" && !/\.css$/i.test(path) && !/(?:stylesheet|\.css\b|<style\b)/i.test(excerpt)) {
      throw new Error("CSS evidence must point to a CSS file or quote a stylesheet reference or style block.");
    }
    if (field === "designSystem") {
      const claim = discovery.basecoatOrDesignSystemVersion;
      const versions = claim.match(/\b\d+\.\d+(?:\.\d+)?(?:-[\w.-]+)?\b/g) ?? [];
      if (!versions.length && !/\b(?:native|plain (?:html|css)|no (?:external |third-party )?design system|project-owned|in-house)\b/i.test(claim)) {
        throw new Error("Provide an evidenced design-system version, or confirm a native or project-owned setup.");
      }
      if (versions.length && !versions.every((version) => excerpt.includes(version))) {
        throw new Error("Design system evidence must include the claimed version; use a lockfile, manifest, or versioned asset.");
      }
      if (/\bbasecoat\b/i.test(claim) && !/basecoat/i.test(excerpt)) {
        throw new Error("Design system evidence must include the Basecoat dependency or asset reference.");
      }
    }
  }
  return { ...state, discovery, stage: "2_PLAN" };
}

export function plan(state: State, input: unknown): State {
  if (state.stage !== "2_PLAN") throw new Error(`Cannot submit a plan in ${state.stage}; ${steps[state.stage]}.`);
  return { ...state, plan: parse(planInput, input), stage: "3_IMPLEMENT" };
}

export function edited(state: State, paths: string[]): State {
  if (!paths.length || !["3_IMPLEMENT", "4_VERIFY", "DONE"].includes(state.stage)) return state;
  return {
    ...state,
    stage: "3_IMPLEMENT",
    verification: undefined,
    modified: [...new Set([...state.modified, ...paths])].sort(),
    reminderSent: false,
  };
}

export function readyToVerify(state: State): State {
  return state.stage === "3_IMPLEMENT" ? { ...state, stage: "4_VERIFY" } : state;
}

export function verify(state: State, input: unknown): State {
  if (state.stage !== "4_VERIFY") throw new Error(`Cannot verify in ${state.stage}; ${steps[state.stage]}.`);
  const verification = parse(verificationInput, input);
  if (!verification.passed.length && !verification.unverified.length) {
    throw new Error("Report at least one passed or unverified item.");
  }
  if ((verification.passed.length || verification.failed.length) && !verification.checksRun.length) {
    throw new Error("List the checks you ran before reporting passed or failed results.");
  }
  return { ...state, verification, stage: "DONE" };
}

export function beforeIdle(state: State): { state: State; remind: boolean } {
  if (!state.modified.length || !["3_IMPLEMENT", "4_VERIFY"].includes(state.stage) || state.reminderSent) {
    return { state, remind: false };
  }
  return { state: { ...readyToVerify(state), reminderSent: true }, remind: true };
}

export function banner(state: State): string | undefined {
  if (state.stage === "IDLE") return;
  const allowed = writeGate(state) ? "Reads allowed; UI edits blocked." : "UI edits allowed; new edits require verification.";
  return `Frontend gate: ${state.stage}.\n${allowed}\nNext: ${steps[state.stage]}.`;
}

export function compactionContext(state: State): string | undefined {
  if (state.stage === "IDLE") return;
  const { discovery, modified } = state;
  return `Frontend checkpoint (runtime storage is authoritative):\n${JSON.stringify({
    stage: state.stage,
    discovery: discovery && {
      renderer: discovery.renderer, cssEntrypoint: discovery.cssEntrypoint,
      basecoatOrDesignSystemVersion: discovery.basecoatOrDesignSystemVersion,
      audienceAndPrimaryTask: discovery.audienceAndPrimaryTask,
    },
    modified,
  })}`;
}
