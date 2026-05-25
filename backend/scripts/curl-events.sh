#!/usr/bin/env sh
set -eu
API_BASE="${API_BASE:-http://localhost:8787}"
AFTER="${AFTER:-0}"
curl -sS "$API_BASE/api/events?after=$AFTER"
