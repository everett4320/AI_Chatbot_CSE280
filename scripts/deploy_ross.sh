#!/usr/bin/env bash
set -euo pipefail
umask 022

fail() { printf '%s\n' "$*" >&2; exit 1; }

rollback=false
if [[ ${1:-} == --rollback ]]; then
  rollback=true
  shift
fi
[[ $# == 1 && $1 == /* && -d $1 ]] ||
  fail 'Usage: bash deploy_ross.sh [--rollback] /absolute/path/to/ross-web-root'

web_root=$(cd -- "$1" && pwd -P)
[[ $web_root != / && -w $web_root ]] || fail 'Use a writable Ross document root.'
script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)
state_key=$(printf '%s' "$web_root" | sha256sum | cut -d ' ' -f 1)
state_dir="${XDG_STATE_HOME:-$HOME/.local/state}/ross/$state_key"
previous="$state_dir/index.html"

exec 9<"$web_root"
flock -x 9
[[ ! -L $web_root/index.html ]] || fail 'The Ross index.html must be a regular file.'

pending_index=''
pending_backup=''
trap 'if [[ -n $pending_index ]]; then rm -f -- "$pending_index"; fi; if [[ -n $pending_backup ]]; then rm -f -- "$pending_backup"; fi' EXIT

publish_index() {
  pending_index=$(mktemp "$web_root/.ross-index.XXXXXX")
  install -m 0644 -- "$1" "$pending_index"
  mv -fT -- "$pending_index" "$web_root/index.html"
  pending_index=''
}

if "$rollback"; then
  [[ -f $previous ]] || fail 'No previous Ross release was saved for this document root.'
  publish_index "$previous"
  printf 'Restored the previous Ross release in %s\n' "$web_root"
  exit 0
fi

client="$script_dir/client"
if [[ ! -d $client ]]; then
  repo_root=$(cd -- "$script_dir/.." && pwd -P)
  app_dir="$repo_root/ai-chatbot-lehigh"
  [[ -f $app_dir/package-lock.json ]] || fail 'Use the Ross release bundle or run from the repository.'
  [[ $web_root != "$repo_root" && $web_root != "$app_dir" ]] ||
    fail 'Use the Apache document root, outside the source checkout.'
  exec 8<"$app_dir"
  flock -x 8
  (
    cd -- "$app_dir"
    export VITE_BASE_PATH="${VITE_BASE_PATH:-/}"
    node scripts/verify-deployment-config.mjs
    npm ci
    npm run verify:deployment
  )
  client="$app_dir/build/client"
fi

[[ -s $client/index.html && -d $client/assets && -d $client/figma ]] ||
  fail 'The Ross static build is incomplete.'
grep -Fq '"ssr":false' "$client/index.html" || fail 'Expected the Ross static SPA index.'

# Keep old assets available to open tabs and to the saved index.
for dir in assets figma; do
  [[ ! -L $web_root/$dir ]] || fail "The destination $dir must be a regular directory."
  for asset in "$client/$dir/"*; do
    [[ -f $asset && ! -L $asset ]] || fail "Unexpected build entry: $asset"
    destination="$web_root/$dir/${asset##*/}"
    if [[ -L $destination || ( -e $destination && ! -f $destination ) ]]; then
      fail "The destination is not a regular file: $destination"
    fi
    if [[ -f $destination ]] && ! cmp -s -- "$asset" "$destination"; then
      fail "The release would overwrite a different asset: $destination"
    fi
  done
done

rsync -r --ignore-existing --chmod=D755,F644 -- "$client/assets" "$client/figma" "$web_root/"

if [[ -f $web_root/index.html ]] && cmp -s -- "$client/index.html" "$web_root/index.html"; then
  printf 'Ross is already current in %s\n' "$web_root"
  exit 0
fi

if [[ -f $web_root/index.html ]]; then
  mkdir -p -- "$state_dir"
  pending_backup=$(mktemp "$state_dir/.index.XXXXXX")
  cp -- "$web_root/index.html" "$pending_backup"
  mv -fT -- "$pending_backup" "$previous"
  pending_backup=''
fi
publish_index "$client/index.html"
printf 'Published Ross in %s\n' "$web_root"
