#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-https://dev-le-chat.cc.lehigh.edu}"
OUT_DIR="${2:-fetched_site}"

mkdir -p "${OUT_DIR}/dist"

curl -fsSL "${BASE_URL}/" -o "${OUT_DIR}/index.html"
curl -fsSL "${BASE_URL}/dist/bundle-pretty.js" -o "${OUT_DIR}/dist/bundle-pretty.js"

date -u +"%Y-%m-%dT%H:%M:%SZ" > "${OUT_DIR}/FETCHED_AT_UTC.txt"
echo "Fetched site assets into ${OUT_DIR}"
