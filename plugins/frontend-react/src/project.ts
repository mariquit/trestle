// Copyright (c) 2026 John Anthony Mariquit <john@mariquit.com>
// SPDX-License-Identifier: Apache-2.0

import { join } from "node:path";
import { z } from "zod";

const configSchema = z.object({
  style: z.string().regex(/^[\w-]+$/).max(80).optional(),
  rsc: z.boolean().optional(),
  tsx: z.boolean().optional(),
  iconLibrary: z.string().regex(/^[\w-]+$/).max(80).optional(),
  tailwind: z.object({ css: z.string().max(300).optional(), cssVariables: z.boolean().optional() }).optional(),
  aliases: z.object(Object.fromEntries(["ui", "components", "utils", "lib", "hooks"].map((key) => [key,
    z.string().regex(/^[~@#\w./-]+$/).max(160).optional(),
  ]))).optional(),
});

function json(source: string, name: string): unknown {
  try { return JSON.parse(source); } catch { throw new Error(`${name} is not valid JSON.`); }
}

export function summarizeConfig(source: string | undefined) {
  if (source === undefined) return { present: false } as const;
  const result = configSchema.safeParse(json(source, "components.json"));
  if (!result.success) throw new Error("Unexpected components.json fields in the shadcn/ui configuration summary.");
  if (result.data.rsc === true) throw new Error("React Server Components are outside the Vite + React DOM workflow.");
  return { present: true, ...result.data } as const;
}

const manifestSchema = z.object({
  dependencies: z.record(z.string(), z.string()).optional(),
  devDependencies: z.record(z.string(), z.string()).optional(),
  scripts: z.record(z.string(), z.string()).optional(),
});

const excluded = /^(?:next|react-native|expo|solito|astro|vue|nuxt|svelte|react-router(?:-dom|-config)?|wouter|@reach\/router|@(?:vitejs\/plugin-vue(?:-jsx)?|astrojs\/[^/]+|sveltejs\/[^/]+|remix-run\/[^/]+|react-router\/[^/]+|tanstack\/[^/]+))$/;

export function checkStack(manifest: string, entry: string, viteConfig?: string): void {
  const result = manifestSchema.safeParse(json(manifest, "package.json"));
  if (!result.success) throw new Error("Expected package.json with valid dependencies and scripts.");
  const { dependencies, devDependencies, scripts } = result.data;
  const declared = new Set([...Object.keys(dependencies ?? {}), ...Object.keys(devDependencies ?? {})]);
  const blocked = [...declared].filter((name) => excluded.test(name));
  if (blocked.length) throw new Error(`Unsupported target dependencies: ${blocked.join(", ")}. /frontend-react requires Vite + React DOM only.`);
  if (!["vite", "react", "react-dom"].every((name) => declared.has(name))) {
    throw new Error("The target package must declare vite, react, and react-dom directly.");
  }
  if (!Object.values(scripts ?? {}).some((script) => /(?:^|[\s;&|])vite(?:\s|$)/.test(script)) &&
      !/\bfrom\s+["']vite["']/.test(viteConfig ?? "")) {
    throw new Error("Provide a Vite build or dev script or a Vite config that imports from vite.");
  }
  if (!/\b(?:from\s+|require\(\s*)["']react-dom(?:\/client)?["']/.test(entry)) {
    throw new Error("Provide the target React DOM bootstrap that imports react-dom or react-dom/client.");
  }
}

export type ReadProjectFile = (path: string) => Promise<string | undefined>;

export async function discoverProject(root: string, entry: string, config: string | undefined, read: ReadProjectFile) {
  const manifest = await read(join(root, "package.json"));
  const bootstrap = await read(join(root, entry));
  if (manifest === undefined || bootstrap === undefined) throw new Error("The package manifest and React DOM bootstrap must exist.");
  if (config && !/^vite\.config\.[cm]?[jt]s$/.test(config)) throw new Error("Expected a Vite config filename at the package root.");
  const viteConfig = config ? await read(join(root, config)) : undefined;
  if (config && viteConfig === undefined) throw new Error("The supplied Vite config does not exist.");
  checkStack(manifest, bootstrap, viteConfig);
  return summarizeConfig(await read(join(root, "components.json")));
}
