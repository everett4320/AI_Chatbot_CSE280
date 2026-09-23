#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "Usage: $0 <explicit-source-url> <output-directory>" >&2
  echo "This is a legacy snapshot utility. It never chooses a chatbot endpoint or output directory by default." >&2
  exit 1
fi

BASE_URL="$1"
OUT_DIR="$2"

if ! [[ "$BASE_URL" =~ ^https?:// ]]; then
  echo "Error: source URL must be an absolute http(s) URL." >&2
  exit 1
fi

mkdir -p "${OUT_DIR}/dist"

curl -fsSL "${BASE_URL}/" -o "${OUT_DIR}/index.html"
curl -fsSL "${BASE_URL}/dist/bundle-pretty.js" -o "${OUT_DIR}/dist/bundle-pretty.js"

date -u +"%Y-%m-%dT%H:%M:%SZ" > "${OUT_DIR}/FETCHED_AT_UTC.txt"
echo "Fetched site assets into ${OUT_DIR}"
