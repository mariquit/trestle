#!/bin/sh
# Copyright (c) 2026 John Anthony Mariquit <john@mariquit.com>
# SPDX-License-Identifier: Apache-2.0

set -eu
root=$(CDPATH='' cd -P -- "$(dirname -- "$0")" && pwd)
exec "${PYTHON:-python3}" "$root/install.py" "$@"
