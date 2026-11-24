// Copyright (c) 2026 John Anthony Mariquit <john@mariquit.com>
// SPDX-License-Identifier: Apache-2.0

import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { open, realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { Plugin, Skill } from "@opencode/plugin";
import { Error as ToolError } from "@opencode/plugin/promise/tool";
import { z } from "zod";
import { discoverProject } from "./project.ts";
import { activate, blocksWrite, discoveryInput, edited, initial, planInput, requireStage, status, tracksWrite, verificationInput, verify, type State } from "./state.ts";

const limit = 512 * 1024;
const skill = "frontend-react";

export function editTargets(tool: string, input: unknown): string[] {
  if (!input || typeof input !== "object") return [];
  const args = input as Record<string, unknown>;
  const paths: unknown[] = [];
  if (["write", "edit"].includes(tool)) paths.push(args.path, args.filePath, args.file_path, args.file);
  if (["patch", "apply_patch"].includes(tool)) {
    const patch = args.patchText ?? args.patch ?? args.diff;
    if (typeof patch === "string") for (const match of patch.matchAll(/^\*\*\* (?:Add File|Update File|Delete File|Move to): (.+)$/gm)) paths.push(match[1].trim());
  }
  return [...new Set(paths.filter((path): path is string => typeof path === "string" && /(?:\.(?:jsx|tsx|css|html)$|(?:^|\/)components\.json$)/i.test(path)))];
}

export default Plugin.define({
  id: "trestle.frontend-react-gate",
  async setup(ctx) {
    const root = await realpath(ctx.location.directory);
    const key = (id: string) => `workflow/v1/${id}`;
    const read = async (id: string): Promise<State> => (await ctx.storage.get(key(id)) as State | undefined) ?? initial();
    const pending = new Map<string, Promise<State>>();
    const writes = new Map<string, Map<string, Map<string, string | undefined>>>();
    const update = (id: string, change: (state: State) => State | Promise<State>) => {
      const next = (pending.get(id) ?? Promise.resolve()).catch(() => {}).then(async () => {
        const current = await read(id);
        const state = await change(current);
        if (state !== current) await ctx.storage.set(key(id), JSON.parse(JSON.stringify(state)));
        return state;
      });
      pending.set(id, next);
      const clear = () => { if (pending.get(id) === next) pending.delete(id); };
      void next.then(clear, clear);
      return next;
    };

    function inside(base: string, path: string): string {
      const result = relative(base, path);
      if (isAbsolute(result) || result === ".." || result.startsWith(`..${sep}`)) throw new Error("Expected a path inside the selected project directory.");
      return result;
    }

    async function readFile(path: string, packageDir = root): Promise<string | undefined> {
      try {
        const requested = resolve(root, path);
        inside(packageDir, requested);
        const canonical = await realpath(requested);
        inside(packageDir, canonical);
        const file = await open(canonical, constants.O_RDONLY | constants.O_NONBLOCK | constants.O_NOFOLLOW);
        try {
          const stat = await file.stat();
          if (!stat.isFile() || stat.size > limit) throw new Error("Expected a regular file at most 512 KiB.");
          const buffer = Buffer.alloc(stat.size + 1);
          let size = 0;
          while (size < buffer.length) {
            const { bytesRead } = await file.read(buffer, size, buffer.length - size, size);
            if (!bytesRead) break;
            size += bytesRead;
          }
          if (size !== stat.size) throw new Error("Project evidence changed during the read.");
          return buffer.subarray(0, size).toString("utf8");
        } finally { await file.close(); }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
        throw error;
      }
    }

    async function hash(path: string) {
      const content = await readFile(path);
      return content === undefined ? undefined : createHash("sha256").update(content).digest("hex");
    }

    await ctx.command.transform((editor) => editor.add({
      name: skill,
      description: "Design a Vite + React interface with shadcn/ui",
      execute: async ({ sessionID, prompt, delivery }) => {
        const skills = prompt.skills?.some(({ id }) => id === skill)
          ? prompt.skills : [...(prompt.skills ?? []), { id: Skill.ID.make(skill) }];
        await ctx.session.prompt({ ...prompt, skills, sessionID, delivery });
      },
    }));

    await ctx.tool.transform((editor) => {
      const add = (name: string, description: string, schema: z.ZodType, change: (state: State, input: unknown) => State | Promise<State>) => {
        editor.add({
          name, description, input: z.toJSONSchema(schema),
          execute: async (input, { sessionID }) => {
            try {
              const state = await update(sessionID, (current) => {
                if (writes.get(sessionID)?.size) throw new Error("Wait for pending UI edits.");
                return change(current, input);
              });
              return { content: [status(state), name === "frontend_react_discover" ? JSON.stringify(state.config) : undefined].filter(Boolean).join("\n") };
            } catch (error) { throw new ToolError({ message: (error as Error).message }); }
          },
        });
      };
      add("frontend_react_discover", "Verify the selected package uses Vite and React DOM and summarize its shadcn configuration. Load the frontend-react skill first.", discoveryInput, async (state, input) => {
        requireStage(state, "DISCOVER");
        const discovery = discoveryInput.parse(input);
        const packageDir = resolve(root, discovery.packageRoot);
        inside(root, packageDir);
        const config = await discoverProject(discovery.packageRoot, discovery.entry, discovery.viteConfig, (path) => readFile(path, packageDir));
        return { ...state, discovery, config, stage: "PLAN" };
      });
      add("frontend_react_plan", "Record layout, component contracts, and any registry item preview before editing React UI.", planInput, (state, input) => {
        requireStage(state, "PLAN");
        return { ...state, plan: planInput.parse(input), stage: "IMPLEMENT" };
      });
      add("frontend_react_verify", "Record executed checks and passed, failed, or explicitly unverified results.", verificationInput, verify);
      add("frontend_react_stop", "End discovery when the stack is unsupported or the user withdraws the task.", z.strictObject({}), (state) => {
        requireStage(state, "DISCOVER", "PLAN");
        return { ...initial(), stage: "STOPPED" };
      });
    });

    await ctx.session.hook("prompt", async ({ sessionID, prompt }) => {
      if (prompt.skills?.some(({ id }) => id === skill) || /^\s*\/frontend-react(?:\s|$)/.test(prompt.text ?? "")) {
        await update(sessionID, activate);
      }
    });

    await ctx.tool.hook("execute.before", async ({ sessionID, id, tool, input }) => {
      const files = editTargets(tool, input);
      if (!files.length) return;
      await update(sessionID, async (state) => {
        if (blocksWrite(state)) throw new ToolError({ message: status(state)! });
        if (!tracksWrite(state)) return state;
        const snapshots = new Map<string, string | undefined>();
        for (const file of files) snapshots.set(file, await hash(file).catch(() => undefined));
        const active = writes.get(sessionID) ?? new Map();
        active.set(id, snapshots);
        writes.set(sessionID, active);
        return state;
      });
    });

    await ctx.tool.hook("execute.after", async (event) => {
      const { tool, input, sessionID, id } = event;
      if (tool === "skill" && event.status === "completed" && input && typeof input === "object" &&
          (("id" in input && input.id === skill) || ("name" in input && input.name === skill))) await update(sessionID, activate);
      const active = writes.get(sessionID);
      const snapshots = active?.get(id);
      if (!snapshots) return;
      await update(sessionID, async (state) => {
        try {
          const changed: string[] = [];
          for (const [file, before] of snapshots) {
            try {
              const after = await hash(file);
              if (after !== before || (after === undefined && event.status === "completed")) changed.push(file);
            } catch { changed.push(file); }
          }
          return edited(state, changed);
        } finally {
          active!.delete(id);
          if (!active!.size) writes.delete(sessionID);
        }
      });
    });

    await ctx.session.hook("context", async ({ sessionID, system }) => {
      await pending.get(sessionID)?.catch(() => {});
      const message = status(await read(sessionID));
      if (message) system.push({ type: "text", text: message });
    });
    await ctx.session.hook("compaction", async ({ sessionID, system }) => {
      await pending.get(sessionID)?.catch(() => {});
      const state = await read(sessionID);
      if (state.stage !== "IDLE") system.push({ type: "text", text: `Frontend React checkpoint: ${JSON.stringify({ stage: state.stage, packageRoot: state.discovery?.packageRoot, files: state.files })}` });
    });
  },
});
