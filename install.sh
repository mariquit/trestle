#!/bin/sh
# Copyright (c) 2026 John Anthony Mariquit <john@mariquit.com>
# SPDX-License-Identifier: Apache-2.0

set -eu

main() {
    if ! command -v node >/dev/null 2>&1 || ! node -e 'process.exit(Number(process.versions.node.split(".")[0]) < 24 ? 1 : 0)'; then
        printf '%s\n' 'Installing Trestle requires Node.js 24 or later on PATH.' >&2
        exit 1
    fi

    if [ -f "$0" ]; then
        root=$(CDPATH='' cd -P -- "$(dirname -- "$0")" && pwd)
        if [ -f "$root/install.ts" ]; then
            exec node "$root/install.ts" "$@"
        fi
    fi

    base=https://github.com/mariquit/trestle/releases/latest/download
    temp=$(mktemp -d "${TMPDIR:-/tmp}/trestle-release.XXXXXX")
    trap 'rm -rf -- "$temp"' EXIT
    trap 'exit 130' INT
    trap 'exit 143' TERM
    curl -fsSL --proto '=https' --proto-redir '=https' -o "$temp/trestle-install.sha256" "$base/trestle-install.sha256"
    curl -fsSL --proto '=https' --proto-redir '=https' -o "$temp/trestle-install.tar.gz" "$base/trestle-install.tar.gz"
    node -e '
        const { createHash } = require("node:crypto");
        const { readFileSync } = require("node:fs");
        const expected = readFileSync(process.argv[1], "utf8").trim();
        const actual = createHash("sha256").update(readFileSync(process.argv[2])).digest("hex");
        if (!/^[a-f0-9]{64}$/.test(expected) || actual !== expected) {
            console.error("Trestle release checksum mismatch; nothing was installed.");
            process.exit(1);
        }
    ' "$temp/trestle-install.sha256" "$temp/trestle-install.tar.gz"
    mkdir "$temp/source"
    tar -xzf "$temp/trestle-install.tar.gz" -C "$temp/source"
    if [ "$#" -eq 0 ] && ! [ -t 0 ]; then
        set -- --all
    fi
    node "$temp/source/install.ts" "$@"
}

main "$@"
