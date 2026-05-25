#!/usr/bin/env sh
set -eu
API_BASE="${API_BASE:-http://localhost:8787}"
curl -sS -X POST "$API_BASE/api/capture" \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"Use Traditional Chinese (Taiwan). Describe the external camera image, read visible text, mention risks, and give one next action."}'
