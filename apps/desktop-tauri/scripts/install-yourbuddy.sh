#!/bin/bash
# Official macOS bootstrap entry. The packaged installer owns verification,
# durable operations, component preparation, replacement, and restart.
set -euo pipefail

fail() {
  printf '{"status":"failed","error":"%s","nextAction":"%s"}\n' "$1" "$2" >&2
  exit 1
}

usage() {
  cat <<'HELP'
Install or upgrade YourBuddy on Apple Silicon macOS without Node or a source checkout.

  bash install-yourbuddy.sh [--version latest|X.Y.Z] [--app /absolute/YourBuddy.app]
      [--proxy URL] [--offline] [--package /absolute/app.tar.gz]
      [--signature /absolute/app.tar.gz.sig] [--request-id ID] [--session-id ID]
      [--defer-stop]

--offline downloads the full Offline archive rather than Bootstrap. With --package
and --signature, no release download is needed. The native installer prepares only
local seeds/cache in offline mode. It returns an operation, not upgrade success.
Read the final outcome with `yourbuddy status --operation ID` after PATH setup.
The launcher also prints a direct status command that works before PATH setup.
A running GUI must be upgraded from its conversation or quit before terminal retry.
No shell profiles are changed. Enable terminal commands in YourBuddy to add PATH.
HELP
}

version=latest
explicit_app=
package=
signature=
proxy=
offline=false
native_args=(--json)
while [ "$#" -gt 0 ]; do
  case "$1" in
    --help|-h) usage; exit 0 ;;
    --offline) offline=true; shift ;;
    --defer-stop) native_args+=("$1"); shift ;;
    --version|--app|--proxy|--package|--signature|--request-id|--session-id)
      [ "$#" -ge 2 ] && [ -n "$2" ] || fail invalid_arguments 'Provide a value after each option; use --help.'
      case "$1" in
        --version) version=$2 ;;
        --package) package=$2 ;;
        --signature) signature=$2 ;;
        --proxy) proxy=$2 ;;
        --app)
          case "$2" in /*.app) ;; *) fail invalid_app_path 'Use an absolute path ending in .app.' ;; esac
          explicit_app=$2
          native_args+=("$1" "$2") ;;
        *) native_args+=("$1" "$2") ;;
      esac
      shift 2 ;;
    *) fail invalid_arguments 'Unknown option; use --help.' ;;
  esac
done

[ "$(uname -s)" = Darwin ] && [ "$(uname -m)" = arm64 ] \
  || fail unsupported_platform 'Use Apple Silicon macOS; other platforms are not supported.'
if [ "$version" != latest ] && ! [[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?$ ]]; then
  fail invalid_version 'Use latest or a semantic release version (major.minor.patch).'
fi
if [ -n "$package" ] || [ -n "$signature" ]; then
  [ -n "$package" ] && [ -n "$signature" ] \
    || fail incomplete_local_package 'Provide both --package and --signature from the same official release.'
  case "$package" in /*) ;; *) fail invalid_package_path 'Use an absolute --package path.' ;; esac
  case "$signature" in /*) ;; *) fail invalid_signature_path 'Use an absolute --signature path.' ;; esac
  [ -f "$package" ] && [ -f "$signature" ] \
    || fail missing_local_package 'Download the official .app.tar.gz and its .sig before retrying.'
fi

umask 077
work=$(mktemp -d "${TMPDIR:-/tmp}/yourbuddy-installer.XXXXXXXX")
trap 'rm -rf "$work"' EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
curl_args=(--fail --location --silent --show-error --connect-timeout 30 --retry 3 --retry-delay 2)
if [ -n "$proxy" ]; then
  curl_args+=(--proxy "$proxy")
  native_args+=(--proxy "$proxy")
fi

# Resume a partial file within this invocation. A server without Range support
# gets one fresh transfer; the downloaded file still goes through native signing.
download() {
  local url=$1 destination=$2 result
  if curl "${curl_args[@]}" --continue-at - --output "$destination" "$url"; then
    return 0
  else
    result=$?
  fi
  case "$result" in
    18|28|56|92)
      # A fresh curl invocation recalculates the offset after a broken transfer.
      if curl "${curl_args[@]}" --continue-at - --output "$destination" "$url"; then
        return 0
      else
        result=$?
      fi ;;
  esac
  if [ "$result" -eq 33 ]; then
    curl "${curl_args[@]}" --output "$destination" "$url" && return 0
  fi
  return 1
}

# xml1 works on the application's minimum macOS 11; plutil raw needs macOS 12.
# These protocol/version values contain only scalar text, never executable shell.
read_scalar() {
  local value
  value=$(plutil -extract "$1" xml1 -o - "$2" 2>/dev/null \
    | sed -nE 's@^[[:space:]]*<(string|integer)>([^<]*)</(string|integer)>[[:space:]]*$@\2@p') || return 1
  [ -n "$value" ] || return 1
  printf '%s\n' "$value"
}

if [ -z "$package" ]; then
  if [ "$version" = latest ]; then
    printf 'Resolving the latest official YourBuddy release…\n' >&2
    download 'https://api.github.com/repos/istarwyh/yourbuddy/releases/latest' "$work/release.json" \
      || fail release_unavailable 'Check the connection or retry with --proxy URL; a local package also works.'
    tag=$(read_scalar tag_name "$work/release.json") \
      || fail invalid_release 'The release response is incomplete; retry or choose an explicit --version.'
    case "$tag" in yourbuddy-v*) version=${tag#yourbuddy-v} ;; *) fail unsupported_release 'Choose an official YourBuddy release with --version.' ;; esac
    [[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?$ ]] \
      || fail invalid_release 'Choose an official YourBuddy release with --version.'
  fi
  flavor=bootstrap
  [ "$offline" = false ] || flavor=offline
  asset="yourbuddy-$version-$flavor-macos-arm64.app.tar.gz"
  base="https://github.com/istarwyh/yourbuddy/releases/download/yourbuddy-v$version"
  package="$work/$asset"
  signature="$package.sig"
  printf 'Downloading YourBuddy %s (%s)…\n' "$version" "$flavor" >&2
  download "$base/$asset" "$package" \
    || fail package_download_failed 'Retry with --proxy URL, or provide the official archive and signature as local files.'
  download "$base/$asset.sig" "$signature" \
    || fail signature_download_failed 'Retry or provide the archive and matching .sig from the same official release.'
fi

mkdir "$work/candidate"
tar -xzf "$package" -C "$work/candidate" \
  || fail invalid_archive 'Download the official .app.tar.gz again; a DMG is not an installer archive.'
app="$work/candidate/YourBuddy.app"
binary="$app/Contents/MacOS/yourbuddy"
[ -x "$binary" ] || fail missing_application 'Choose the official YourBuddy .app.tar.gz archive.'
protocol=$(read_scalar version "$app/Contents/Resources/installer-protocol.json") \
  || fail legacy_release 'This release has no command-line installer; use its DMG or select a newer release.'
[ "$protocol" = 1 ] \
  || fail unsupported_installer 'Download install-yourbuddy.sh from the same release as the application archive.'
if [ "$version" = latest ]; then
  version=$(read_scalar CFBundleShortVersionString "$app/Contents/Info.plist") \
    || fail missing_version 'Choose an official application archive containing its version metadata.'
fi
# Prefer an already installed, protocol-capable helper for upgrades. Never
# probe a legacy executable: unsupported flags would launch its ordinary GUI.
installed=$explicit_app
if [ -z "$installed" ]; then
  matches=0
  for existing in /Applications/YourBuddy.app "$HOME/Applications/YourBuddy.app"; do
    if [ -d "$existing" ]; then matches=$((matches + 1)); installed=$existing; fi
  done
  if [ "$matches" -ne 1 ]; then installed=; fi
fi
if [ -n "$installed" ] && [ -x "$installed/Contents/MacOS/yourbuddy" ]; then
  installed_protocol=$(read_scalar version "$installed/Contents/Resources/installer-protocol.json") || installed_protocol=
  if [ "$installed_protocol" = 1 ]; then binary="$installed/Contents/MacOS/yourbuddy"; fi
fi
[ "$offline" = false ] || native_args+=(--offline)
if "$binary" --yourbuddy-installer install --version "$version" \
  --package "$package" --signature "$signature" "${native_args[@]}" > "$work/receipt.json"; then
  cat "$work/receipt.json"
else
  result=$?
  cat "$work/receipt.json"
  exit "$result"
fi
operation=$(read_scalar id "$work/receipt.json") \
  || fail invalid_receipt 'The installer returned an unreadable receipt; inspect status before retrying.'
printf '\nAn operation receipt is not installation success. Read the result:\n  ' >&2
printf '%q status --operation %q --wait\n' \
  "${YOURBUDDY_APP_DATA_DIR:-$HOME/Library/Application Support/YourBuddy}/bin/yourbuddy" "$operation" >&2
