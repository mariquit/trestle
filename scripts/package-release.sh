#!/bin/sh
# Copyright (c) 2026 John Anthony Mariquit <john@mariquit.com>
# SPDX-License-Identifier: Apache-2.0

set -eu
if [ "$#" -ne 1 ]; then
    printf '%s\n' 'Usage: sh scripts/package-release.sh NEW_OUTPUT_DIRECTORY' >&2
    exit 2
fi
root=$(CDPATH='' cd -P -- "$(dirname -- "$0")/.." && pwd)
mkdir -- "$1"
out=$(CDPATH='' cd -P -- "$1" && pwd)
cd "$root"

skills=$(node install.ts --list-skills)
set -- install.ts LICENSE NOTICE
for skill in $skills; do
    set -- "$@" "$skill.md"
done
tar -czf "$out/trestle-install.tar.gz" "$@" \
    plugins/frontend/package.json plugins/frontend/package-lock.json plugins/frontend/README.md plugins/frontend/src \
    plugins/frontend-react/package.json plugins/frontend-react/package-lock.json plugins/frontend-react/README.md plugins/frontend-react/src \
    tools/de-slop/bundle/lint.mjs tools/de-slop/bundle/THIRD-PARTY-LICENSES.txt
node -e 'const {createHash} = require("node:crypto"); const {readFileSync} = require("node:fs"); console.log(createHash("sha256").update(readFileSync(process.argv[1])).digest("hex"));' \
    "$out/trestle-install.tar.gz" > "$out/trestle-install.sha256"
cp install.sh "$out/install.sh"
