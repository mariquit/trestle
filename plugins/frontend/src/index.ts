// Copyright (c) 2026 John Anthony Mariquit <john@mariquit.com>
// SPDX-License-Identifier: Apache-2.0

import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { open, realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { Plugin } from "@opencode/plugin";
import { Error as ToolError } from "@opencode/plugin/promise/tool";
import { z } from "zod";
import { lintShell, lintUi } from "./lint.ts";
import {
  activate, banner, beforeIdle, compactionContext, discover, discoveryInput, edited,
  plan, planInput, readyToVerify, stop, unsupportedStackMessage, verificationInput, verify, writeGate,
} from "./state.ts";
import { sessionStore } from "./store.ts";
import { isFrontendSkill, shellCommand, targets } from "./targets.ts";

const limit = 512 * 1024;
type Snapshot = { contents: string; hash: string } | undefined;

export default Plugin.define({
  id: "trestle.frontend-gate",
  async setup(ctx) {
    const root = await realpath(ctx.location.directory);
    const store = sessionStore({
      get: (key) => ctx.storage.get(key),
      set: (key, state) => ctx.storage.set(key, JSON.parse(JSON.stringify(state))),
    });
    const writes = new Map<string, Map<string, Map<string, Snapshot>>>();

    function localPath(path: string): string {
      const local = relative(root, resolve(root, path));
      if (!local || local === ".." || local.startsWith(`..${sep}`) || isAbsolute(local)) {
        throw new Error("Expected a path inside the active project location.");
      }
      return local;
    }

    async function snapshot(path: string): Promise<Snapshot> {
      try {
        const canonical = localPath(await realpath(resolve(root, localPath(path))));
        const file = await open(resolve(root, canonical), constants.O_RDONLY | constants.O_NONBLOCK | constants.O_NOFOLLOW);
        try {
          const stat = await file.stat();
          if (!stat.isFile() || stat.size > limit) throw new Error("Expected a regular file no larger than 512 KiB.");
          const buffer = Buffer.alloc(stat.size + 1);
          let bytesRead = 0;
          while (bytesRead < buffer.length) {
            const chunk = await file.read(buffer, bytesRead, buffer.length - bytesRead, bytesRead);
            if (!chunk.bytesRead) break;
            bytesRead += chunk.bytesRead;
          }
          if (bytesRead > stat.size) throw new Error("File changed while it was being read.");
          const contents = buffer.subarray(0, bytesRead);
          return { contents: contents.toString("utf8"), hash: createHash("sha256").update(contents).digest("hex") };
        } finally { await file.close(); }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
        throw error;
      }
    }

    await ctx.tool.transform((editor) => {
      editor.add({
        name: "submit_discovery",
        description: "Record a supported HTML-first stack for the target app. Quote literal excerpts from project files. For native or project-owned styling, cite a local style or asset reference. If the stack is unclear, ask the user to confirm it before submitting discovery. For React, Vue, or Svelte targets, or if the user declines classification, call stop_frontend instead.",
        input: z.toJSONSchema(discoveryInput),
        execute: async (input, { sessionID }) => {
          try {
            const state = await store.update(sessionID, (current) => discover(current, input, async (path) => {
              const file = await snapshot(path);
              if (!file) throw new Error("Evidence file does not exist.");
              return file.contents;
            }));
            return { content: banner(state) };
          } catch (error) { throw new ToolError({ message: (error as Error).message }); }
        },
      });
      const stopInput = z.strictObject({ reason: z.enum(["react", "vue", "svelte", "unclassified"]) });
      editor.add({
        name: "stop_frontend",
        description: "End /frontend discovery without a flag when the target uses React, Vue, or Svelte, or the user declines to classify it.",
        input: z.toJSONSchema(stopInput),
        execute: async (input, { sessionID }) => {
          try {
            const { reason } = stopInput.parse(input);
            await store.update(sessionID, stop);
            return { content: reason === "unclassified" ? "Frontend workflow ended without a stack flag." : unsupportedStackMessage[reason] };
          } catch (error) { throw new ToolError({ message: (error as Error).message }); }
        },
      });
      editor.add({
        name: "submit_plan",
        description: "Declare the frontend layout, mobile reading order, component contracts, and state handling before editing UI files.",
        input: z.toJSONSchema(planInput),
        execute: async (input, { sessionID }) => {
          try {
            return { content: banner(await store.update(sessionID, (state) => plan(state, input))) };
          } catch (error) { throw new ToolError({ message: (error as Error).message }); }
        },
      });
      editor.add({
        name: "complete_verification",
        description: "Report checks run, the key design decision, and passed, failed, or explicitly unverified frontend work.",
        input: z.toJSONSchema(verificationInput),
        execute: async (input, { sessionID }) => {
          try {
            const state = await store.update(sessionID, (current) => {
              if (writes.get(sessionID)?.size) throw new Error("Wait for pending UI edits before completing verification.");
              return verify(readyToVerify(current), input);
            });
            return { content: banner(state) };
          } catch (error) { throw new ToolError({ message: (error as Error).message }); }
        },
      });
    });

    await ctx.session.hook("prompt", async (event) => {
      if (event.prompt.skills?.some(({ id }) => id === "frontend") || /^\s*\/frontend(?:\s|$)/.test(event.prompt.text ?? "")) {
        await store.update(event.sessionID, (state) => activate(state, true));
      }
    });

    await ctx.tool.hook("execute.before", async ({ tool, input, sessionID, id }) => {
      const { edit, files } = targets(tool, input);
      if (!files.length) return;
      await store.update(sessionID, async (state) => {
        const active = activate(state);
        if (!edit || active.stage === "STOPPED" || writeGate(active)) return active;
        const call = new Map<string, Snapshot>();
        for (const file of files) {
          let path = file;
          try {
            path = localPath(file);
            call.set(path, await snapshot(path));
          } catch {
            // Unknown snapshots still require verification if the tool succeeds.
            call.set(path, undefined);
          }
        }
        const inFlight = writes.get(sessionID) ?? new Map();
        inFlight.set(id, call);
        writes.set(sessionID, inFlight);
        return active;
      }).then((state) => {
        const blocked = edit && writeGate(state);
        if (blocked) throw new ToolError({ message: blocked });
      });
    });

    await ctx.tool.hook("execute.after", async (event) => {
      const { tool, input, sessionID, id } = event;
      if (event.status === "completed" && isFrontendSkill(tool, input)) {
        await store.update(sessionID, (state) => activate(state, true));
      }
      const inFlight = writes.get(sessionID);
      const call = inFlight?.get(id);
      const command = shellCommand(tool, input);
      if (!call && !command) return;
      const warnings: string[] = [];
      await store.update(sessionID, async (state) => {
        try {
          if (command && ["3_IMPLEMENT", "4_VERIFY"].includes(state.stage)) warnings.push(...lintShell(command));
          if (!call) return state;
          const changed: string[] = [];
          for (const [path, previous] of call) {
            try {
              const current = await snapshot(path);
              if (previous && current?.hash === previous.hash) continue;
              if (!previous && !current && event.status === "error") continue;
              changed.push(path);
              if (current) {
                warnings.push(...lintUi(current.contents, path).map(({ rule, line, message }) => `${path}:${line}: ${rule}: ${message}`));
              }
            } catch {
              if (event.status === "completed" || previous) changed.push(path);
              warnings.push(`${path}: Static lint could not read a project UI file within the 512 KiB limit; verify it separately.`);
            }
          }
          return edited(state, changed);
        } finally {
          inFlight?.delete(id);
          if (!inFlight?.size) writes.delete(sessionID);
        }
      });

      if (!warnings.length) return;
      const text = `Frontend lint:\n${warnings.slice(0, 30).join("\n")}${warnings.length > 30 ? "\nAdditional diagnostics were omitted." : ""}`;
      if (event.status === "completed") {
        const existing = event.result.content;
        event.result = {
          ...event.result,
          content: typeof existing === "string" ? `${existing}\n\n${text}` : [...(existing ?? []), { type: "text", text }],
        };
      }
    });

    await ctx.session.hook("context", async ({ sessionID, system }) => {
      const status = banner(await store.read(sessionID));
      if (status) system.push({ type: "text", text: status });
    });

    await ctx.session.hook("compaction", async ({ sessionID, system }) => {
      const checkpoint = compactionContext(await store.read(sessionID));
      if (checkpoint) system.push({ type: "text", text: checkpoint });
    });

    await ctx.session.hook("experimental.idle", async ({ sessionID }) => {
      let remind = false;
      await store.update(sessionID, (state) => {
        if (writes.get(sessionID)?.size) return state;
        const next = beforeIdle(state);
        remind = next.remind;
        return next.state;
      });
      if (!remind) return;
      try {
        await ctx.session.synthetic({
          sessionID,
          text: "Frontend gate is still in 4_VERIFY after UI edits. Call complete_verification with the checks actually run and explicitly list any unverified behavior before signing off.",
        });
      } catch (error) {
        await store.update(sessionID, (state) => state.stage === "4_VERIFY" ? { ...state, reminderSent: false } : state);
        throw error;
      }
    });
  },
});
