// Copyright (c) 2026 John Anthony Mariquit <john@mariquit.com>
// SPDX-License-Identifier: Apache-2.0

import { initial, type State } from "./state.ts";

export interface Storage {
  get(key: string): Promise<unknown>;
  set(key: string, state: State): Promise<void>;
}

export function sessionStore(storage: Storage) {
  const pending = new Map<string, Promise<unknown>>();
  const key = (id: string) => `frontend-gate/v1/${id}`;
  const load = async (id: string): Promise<State> => (await storage.get(key(id)) as State | undefined) ?? initial();

  return {
    async read(id: string): Promise<State> {
      await pending.get(id)?.catch(() => {});
      return load(id);
    },
    update(id: string, change: (state: State) => State | Promise<State>): Promise<State> {
      const next = (pending.get(id) ?? Promise.resolve()).catch(() => {}).then(async () => {
        const current = await load(id);
        const updated = await change(current);
        if (updated !== current) await storage.set(key(id), updated);
        return updated;
      });
      pending.set(id, next);
      const cleanup = () => { if (pending.get(id) === next) pending.delete(id); };
      void next.then(cleanup, cleanup);
      return next;
    },
  };
}
