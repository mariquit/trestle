#!/bin/sh
# Copyright (c) 2026 John Anthony Mariquit <john@mariquit.com>
# SPDX-License-Identifier: Apache-2.0

set -eu
root=$(CDPATH='' cd -P -- "$(dirname -- "$0")" && pwd)
if ! command -v node >/dev/null 2>&1 || ! node -e 'process.exit(Number(process.versions.node.split(".")[0]) < 24 ? 1 : 0)'; then
    printf '%s\n' 'Installing Trestle requires Node.js 24 or later on PATH.' >&2
    exit 1
fi
exec node "$root/install.ts" "$@"
