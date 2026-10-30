#!/bin/sh
cd -- "$(dirname -- "$0")" || exit 1
exec node release/server.mjs
