// Copyright (c) 2026 John Anthony Mariquit <john@mariquit.com>
// SPDX-License-Identifier: Apache-2.0

export const isUiPath = (path: string): boolean => /\.(html|jinja|njk|tsx|vue|svelte|css)$/i.test(path);

const record = (input: unknown): Record<string, unknown> =>
  input && typeof input === "object" ? input as Record<string, unknown> : {};

export function isFrontendSkill(tool: string, input: unknown): boolean {
  const args = record(input);
  return tool === "skill" && (args.id === "frontend" || args.name === "frontend");
}

export function targets(tool: string, input: unknown): { edit: boolean; files: string[] } {
  const args = record(input);
  const edit = ["write", "edit", "patch", "apply_patch"].includes(tool);
  if (!edit && !["read", "glob", "grep", "find"].includes(tool)) return { edit, files: [] };

  const files = [args.filePath, args.file_path, args.path, args.file];
  if (tool === "patch" || tool === "apply_patch") {
    const patch = args.patchText ?? args.patch ?? args.diff ?? input;
    if (typeof patch === "string") {
      for (const match of patch.matchAll(/^\*\*\* (?:Add File|Update File|Delete File|Move to): (.+)$/gm)) {
        files.push(match[1].trim());
      }
    }
  }
  if (!edit && ["glob", "grep", "find"].includes(tool)) {
    // A grep's text query is not a file selector.
    for (const value of [tool === "grep" ? undefined : args.pattern, args.include, args.glob]) {
      if (typeof value !== "string") continue;
      // Only the final brace group affects the filename suffix.
      const suffix = /^(.*)\{([^{}]+)\}$/.exec(value);
      if (suffix) files.push(...suffix[2].split(",").map((part) => suffix[1] + part.trim()));
      else files.push(...value.split(",").map((part) => part.trim()));
    }
  }
  return { edit, files: [...new Set(files.filter((file): file is string =>
    typeof file === "string" && isUiPath(file)))] };
}

export function shellCommand(tool: string, input: unknown): string | undefined {
  if (tool !== "bash" && tool !== "shell") return;
  const command = record(input).command;
  return typeof command === "string" ? command : undefined;
}
