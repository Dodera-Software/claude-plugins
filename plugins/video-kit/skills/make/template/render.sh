#!/usr/bin/env bash
# Every video command: see scripts/render.mjs, which does the work on macOS, Linux and Windows.
# On Windows (Git Bash) arguments like /pricing must reach it as written, not as Windows paths.
export MSYS_NO_PATHCONV=1 MSYS2_ARG_CONV_EXCL='*'
exec node "$(dirname "$0")/scripts/render.mjs" "$@"
