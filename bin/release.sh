#!/usr/bin/env bash
# =============================================================================
# whereq.ca — Release Script
# =============================================================================
# Run the CI gates, squash local dev commits into one, push dev, merge to main,
# tag, and push. Pushing to main IS the deployment: Vercel auto-deploys from
# the connected GitHub repo, so there is no deploy.sh and no manual deploy step.
#
# Usage:
#   bin/release.sh [OPTIONS]
#
# OPTIONS:
#   -m, --message <msg>   Commit message for the squashed commit (required).
#                         Also used as the merge commit message on main.
#   --version <X.Y.Z>     Pin the release version (default: auto-derive the
#                         next version from docs/releases/, bumping minor)
#   --codename <name>     Codename for the release-notes file (default: slug of
#                         the commit message)
#   --squash <n>          Squash the last N commits (default: all commits since
#                         dev branched from main)
#   --no-squash           Skip squashing — push dev commits as-is
#   --tag-message <msg>   Annotation for the git tag (default: same as --message)
#   --major                Bump major (e.g. v1.1.0 → v2.0.0)
#   --minor                Bump minor (e.g. v1.1.0 → v1.2.0)  [default]
#   --patch                Bump patch (e.g. v1.1.0 → v1.1.1)
#   --no-notes            Don't scaffold docs/releases/<version>-<codename>-<date>.md
#   --skip-checks         Skip the CI gates (lint / type-check / build / header
#                         parity). Only for a deliberate hotfix.
#   -y, --yes              Skip the pre-release interactive confirmation
#   --dry-run             Print all commands without executing the git steps
#   -h, --help            Show this help message
#
# Tag naming convention:
#   v{MAJOR}.{MINOR}.{PATCH}          e.g. v1.1.0 → v1.2.0
#   This matches whereq.ca's own release-notes convention:
#     docs/releases/v<MAJOR>.<MINOR>.<PATCH>-<codename>-YYYY-MM-DD.md
#   The next version is derived from the newest release note on disk.
#   Override with --version X.Y.Z to pin a specific version.
#
# CI gates (run before anything is committed or pushed):
#   1. COOP/COEP/CORP header parity between vite.config.ts and vercel.json.
#      If these diverge, FFmpeg.wasm / ONNX silently fail in production.
#      See docs/ARCHITECTURE.md §16.
#   2. yarn lint            — must be 0 errors (24 warnings is the baseline)
#   3. tsc --noEmit         — must be 0 errors (app + node projects)
#   4. yarn build           — must succeed (the chunk-size warning is expected)
#
# Remote:
#   Uses git@whereq.github.com:whereq/whereq.ca.git via the SSH config host
#   alias 'whereq.github.com' (identity: ~/.ssh/wq_gh).
#
# Typical flow:
#   1. Develop on dev (uncommitted changes are fine — the script stages and
#      commits them for you)
#   2. bin/release.sh --message "Add background removal presets"
#      → CI gates → git add -A + commit → squashes dev commits → pushes dev →
#        merges to main → tags v1.2.0 → pushes main + tag
#   3. Vercel auto-deploys from the main push (~30s). Nothing else to run.
#
# GOTCHA: the commit identity is set repo-locally (`git config --local
# user.name` = whereq). The global config is still ccbus-cc, so a commit made
# outside this folder — or by a tool that ignores local config — would be
# attributed to the wrong account. The preflight checks this.
# =============================================================================
set -euo pipefail
# errtrace: make the ERR trap fire inside functions and command substitutions
# too, so a silent failure never looks like a clean exit.
set -E

# -----------------------------------------------------------------------------
# Colours
# -----------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

# -----------------------------------------------------------------------------
# Paths & remote
# -----------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
REMOTE_URL="git@whereq.github.com:whereq/whereq.ca.git"
RELEASES_DIR="${PROJECT_ROOT}/docs/releases"
PRODUCTION_URL="https://www.whereq.ca"
VERCEL_ALIAS="https://whereq-app-hub.vercel.app"

# -----------------------------------------------------------------------------
# Defaults
# -----------------------------------------------------------------------------
COMMIT_MSG=""
TAG_MSG=""
VERSION=""            # empty = auto-derive
CODENAME=""           # empty = slug of the commit message
SQUASH_N=""           # empty = all since merge-base; numeric = last N
DO_SQUASH=true
DO_NOTES=true
DO_CHECKS=true
DRY_RUN=false
BUMP_MAJOR=false
BUMP_MINOR=false
BUMP_PATCH=false
ASSUME_YES=false
DEV_BRANCH="dev"
MAIN_BRANCH="main"
STEP=0
START_TIME=$(date +%s)

declare -a STEP_NAMES=()
declare -a STEP_RESULTS=()

# -----------------------------------------------------------------------------
# Helpers
# -----------------------------------------------------------------------------
usage() {
    sed -n '3,74p' "$0" | sed 's/^# \?//'
    exit 0
}

info()    { echo -e "${CYAN}▶${NC} $*"; }
success() { echo -e "${GREEN}✔${NC} $*"; }
warn()    { echo -e "${YELLOW}⚠${NC}  $*"; }
error()   { echo -e "${RED}✖${NC} $*" >&2; }
dim()     { echo -e "${DIM}  $*${NC}"; }

step() {
    STEP=$((STEP + 1))
    echo ""
    echo -e "${BOLD}${CYAN}━━━ Step ${STEP}: $*${NC}"
    STEP_NAMES+=("$*")
}

record_result() { STEP_RESULTS+=("$1"); }

run() {
    if [[ "$DRY_RUN" == true ]]; then
        echo -e "  ${DIM}[dry-run]${NC} ${BOLD}$*${NC}"
    else
        "$@"
    fi
}

elapsed_time() {
    local secs=$(( $(date +%s) - START_TIME ))
    printf '%dm%02ds' $(( secs / 60 )) $(( secs % 60 ))
}

# -----------------------------------------------------------------------------
# Version handling
# -----------------------------------------------------------------------------

# Newest version that already has a release note, e.g. "1.1.0".
# Empty output when docs/releases/ has no versioned note yet.
latest_released_version() {
    [[ -d "$RELEASES_DIR" ]] || return 0
    # `|| true` because an empty docs/releases/ must not trip `set -e`.
    ls "$RELEASES_DIR" 2>/dev/null \
        | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+' \
        | sed -E 's/^v([0-9]+\.[0-9]+\.[0-9]+).*/\1/' \
        | sort -t. -k1,1n -k2,2n -k3,3n \
        | tail -n 1 || true
}

# The version this release will carry. Derived from the newest release note
# unless --version pins it.
next_version() {
    if [[ -n "$VERSION" ]]; then
        echo "$VERSION"
        return
    fi

    local last major minor patch
    last=$(latest_released_version)

    if [[ -z "$last" ]]; then
        major=1; minor=0; patch=0
    else
        IFS='.' read -r major minor patch <<< "$last"
    fi

    if [[ "$BUMP_MAJOR" == true ]]; then
        major=$((major + 1)); minor=0; patch=0
    elif [[ "$BUMP_PATCH" == true ]]; then
        patch=$((patch + 1))
    else
        minor=$((minor + 1))   # default bump
    fi

    echo "${major}.${minor}.${patch}"
}

# Human codename for the release notes. Falls back to a slug of the commit
# message so the release is never left without a notes file.
release_codename() {
    if [[ -n "$CODENAME" ]]; then
        echo "$CODENAME"
        return
    fi
    local slug
    slug=$(printf '%s' "$COMMIT_MSG" \
        | tr '[:upper:]' '[:lower:]' \
        | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//' \
        | cut -d- -f1-3)
    echo "${slug:-release}"
}

# Path of the release note for a version, if one already exists.
existing_notes_for_version() {
    local ver="$1"
    [[ -d "$RELEASES_DIR" ]] || return 0
    ls "$RELEASES_DIR" 2>/dev/null \
        | grep -E "^v${ver//./\\.}(-.*)?\.md$" \
        | sed -n '1p' || true
}

# -----------------------------------------------------------------------------
# Parse arguments
# -----------------------------------------------------------------------------
parse_args() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            -m|--message)
                [[ -n "${2:-}" ]] || { error "--message requires a value"; exit 1; }
                COMMIT_MSG="$2"; shift 2 ;;
            --version)
                [[ -n "${2:-}" ]] || { error "--version requires a value"; exit 1; }
                VERSION="${2#v}"; shift 2 ;;
            --codename)
                [[ -n "${2:-}" ]] || { error "--codename requires a value"; exit 1; }
                CODENAME="$2"; shift 2 ;;
            --squash)
                [[ "${2:-}" =~ ^[0-9]+$ ]] || { error "--squash requires a number"; exit 1; }
                SQUASH_N="$2"; shift 2 ;;
            --no-squash)
                DO_SQUASH=false; shift ;;
            --no-notes)
                DO_NOTES=false; shift ;;
            --skip-checks)
                DO_CHECKS=false; shift ;;
            --tag-message)
                [[ -n "${2:-}" ]] || { error "--tag-message requires a value"; exit 1; }
                TAG_MSG="$2"; shift 2 ;;
            --major)
                BUMP_MAJOR=true; shift ;;
            --minor)
                BUMP_MINOR=true; shift ;;
            --patch)
                BUMP_PATCH=true; shift ;;
            -y|--yes)
                ASSUME_YES=true; shift ;;
            --dry-run)
                DRY_RUN=true; shift ;;
            -h|--help)
                usage ;;
            *)
                error "Unknown argument: $1"
                echo "Run 'bin/release.sh --help' for usage."
                exit 1 ;;
        esac
    done

    if [[ -z "$COMMIT_MSG" ]]; then
        error "--message is required."
        echo "Use: bin/release.sh -m \"Your release summary\""
        exit 1
    fi

    [[ -z "$TAG_MSG" ]] && TAG_MSG="$COMMIT_MSG"

    if [[ -n "$VERSION" && ! "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        error "--version must look like X.Y.Z (got '${VERSION}')"
        exit 1
    fi
}

# -----------------------------------------------------------------------------
# CI gate: COOP/COEP/CORP header parity (vite.config.ts ↔ vercel.json)
# -----------------------------------------------------------------------------
check_header_parity() {
    step "Check COOP/COEP/CORP header parity"

    if [[ ! -f "${PROJECT_ROOT}/vite.config.ts" || ! -f "${PROJECT_ROOT}/vercel.json" ]]; then
        error "vite.config.ts or vercel.json is missing — cannot verify headers."
        record_result "fail"
        return 1
    fi

    local out
    out=$(cd "$PROJECT_ROOT" && node -e '
const fs = require("fs");
const HEADERS = [
    "Cross-Origin-Opener-Policy",
    "Cross-Origin-Embedder-Policy",
    "Cross-Origin-Resource-Policy",
];
const vite = fs.readFileSync("vite.config.ts", "utf8");
const vercel = JSON.parse(fs.readFileSync("vercel.json", "utf8"));
const vercelHeaders = (vercel.headers || []).flatMap((b) => b.headers || []);
let bad = 0;
for (const h of HEADERS) {
    const re = new RegExp(`"${h}"\\s*:\\s*"([^"]+)"`, "g");
    const viteVals = [...vite.matchAll(re)].map((m) => m[1]);
    const vercelVals = [...new Set(vercelHeaders.filter((x) => x.key === h).map((x) => x.value))];
    const viteSet = [...new Set(viteVals)];
    if (viteSet.length === 0) { console.log(`  MISSING  ${h} — not set in vite.config.ts`); bad++; continue; }
    if (vercelVals.length === 0) { console.log(`  MISSING  ${h} — not set in vercel.json`); bad++; continue; }
    if (viteSet.length > 1) { console.log(`  CONFLICT ${h} — vite.config.ts sets ${viteSet.join(", ")}`); bad++; continue; }
    if (vercelVals.length > 1) { console.log(`  CONFLICT ${h} — vercel.json sets ${vercelVals.join(", ")}`); bad++; continue; }
    if (viteSet[0] !== vercelVals[0]) {
        console.log(`  MISMATCH ${h} — vite="${viteSet[0]}" vercel="${vercelVals[0]}"`);
        bad++; continue;
    }
    console.log(`  ok       ${h}: ${viteSet[0]}`);
}
process.exit(bad ? 1 : 0);
' 2>&1) && local rc=0 || local rc=$?

    echo "$out" | sed 's/^/  /'
    if [[ "$rc" -ne 0 ]]; then
        error "Header parity check failed. FFmpeg.wasm / ONNX would fail silently in production."
        dim "See docs/ARCHITECTURE.md §16 — the three headers must match in vite.config.ts and vercel.json."
        record_result "fail"
        return 1
    fi

    success "Headers match in vite.config.ts and vercel.json"
    record_result "ok"
}

# -----------------------------------------------------------------------------
# CI gate: lint
# -----------------------------------------------------------------------------
check_lint() {
    step "Run lint (yarn lint)"

    if [[ "$DRY_RUN" == false ]]; then
        local out rc
        out=$(cd "$PROJECT_ROOT" && yarn lint 2>&1) && rc=0 || rc=$?
        echo "$out" | tail -5 | sed 's/^/  /'
        if [[ "$rc" -ne 0 ]]; then
            error "Lint failed — fix the errors before releasing."
            record_result "fail"
            return 1
        fi
    else
        dim "[dry-run] would run: yarn lint"
    fi

    success "Lint clean (0 errors)"
    record_result "ok"
}

# -----------------------------------------------------------------------------
# CI gate: type check
# -----------------------------------------------------------------------------
check_types() {
    step "Type-check (tsc --noEmit)"

    if [[ "$DRY_RUN" == false ]]; then
        local out rc
        out=$(cd "$PROJECT_ROOT" && npx tsc -p tsconfig.app.json --noEmit 2>&1) && rc=0 || rc=$?
        if [[ "$rc" -ne 0 ]]; then
            echo "$out" | sed 's/^/  /'
            error "Type-check failed (tsconfig.app.json)."
            record_result "fail"
            return 1
        fi
        out=$(cd "$PROJECT_ROOT" && npx tsc -p tsconfig.node.json --noEmit 2>&1) && rc=0 || rc=$?
        if [[ "$rc" -ne 0 ]]; then
            echo "$out" | sed 's/^/  /'
            error "Type-check failed (tsconfig.node.json)."
            record_result "fail"
            return 1
        fi
    else
        dim "[dry-run] would run: npx tsc -p tsconfig.app.json --noEmit"
        dim "[dry-run] would run: npx tsc -p tsconfig.node.json --noEmit"
    fi

    success "Type-check clean"
    record_result "ok"
}

# -----------------------------------------------------------------------------
# CI gate: production build
# -----------------------------------------------------------------------------
check_build() {
    step "Production build (yarn build)"

    if [[ "$DRY_RUN" == false ]]; then
        local out rc
        out=$(cd "$PROJECT_ROOT" && yarn build 2>&1) && rc=0 || rc=$?
        if [[ "$rc" -ne 0 ]]; then
            echo "$out" | tail -20 | sed 's/^/  /'
            error "Build failed."
            record_result "fail"
            return 1
        fi
        echo "$out" | grep -E '✓ built|dist/index.html' | tail -3 | sed 's/^/  /'
    else
        dim "[dry-run] would run: yarn build"
    fi

    success "Build succeeded (the chunk-size warning is expected — see §19.3)"
    record_result "ok"
}

run_ci_gates() {
    if [[ "$DO_CHECKS" == false ]]; then
        warn "Skipping CI gates (--skip-checks)"
        record_result "skip"
        return 0
    fi

    check_header_parity || exit 1
    check_lint      || exit 1
    check_types     || exit 1
    check_build     || exit 1
}

# -----------------------------------------------------------------------------
# Pre-flight checks
# -----------------------------------------------------------------------------
preflight() {
    local version tag
    version=$(next_version)
    tag="v${version}"

    info "whereq.ca release — ${DEV_BRANCH} → ${MAIN_BRANCH} | next tag: ${BOLD}${tag}${NC} | dry-run: ${BOLD}${DRY_RUN}${NC}"
    dim "Remote: ${REMOTE_URL}"
    dim "Deploy: Vercel auto-deploy on the main push → ${PRODUCTION_URL}"
    echo ""

    if ! git -C "$PROJECT_ROOT" rev-parse --git-dir &>/dev/null; then
        error "Not a git repository: ${PROJECT_ROOT}"
        exit 1
    fi

    # Commit identity: must be set repo-locally. The global config is
    # still ccbus-cc, which would attribute commits to the wrong account.
    local git_user git_email local_user
    git_user=$(git -C "$PROJECT_ROOT" config user.name || true)
    git_email=$(git -C "$PROJECT_ROOT" config user.email || true)
    local_user=$(git -C "$PROJECT_ROOT" config --local user.name || true)
    if [[ -z "$local_user" ]]; then
        error "No repo-local git user.name — commits could be attributed to the wrong account."
        dim "Fix with: git config --local user.name whereq && git config --local user.email whereq@gmail.com"
        [[ "$DRY_RUN" == true ]] || exit 1
    elif [[ "$git_user" == "ccbus-cc" ]]; then
        warn "Effective commit identity is 'ccbus-cc' (${git_email}) — expected 'whereq'."
        dim "Fix with: git config --local user.name whereq && git config --local user.email whereq@gmail.com"
    fi

    local current_branch
    current_branch=$(git -C "$PROJECT_ROOT" rev-parse --abbrev-ref HEAD)
    if [[ "$current_branch" != "$DEV_BRANCH" ]]; then
        error "Must be on '${DEV_BRANCH}' branch. Currently on: '${current_branch}'"
        dim "Create it once with: git checkout -b ${DEV_BRANCH} ${MAIN_BRANCH}"
        dim "Or fetch the shared one:  git fetch origin && git checkout ${DEV_BRANCH}"
        [[ "$DRY_RUN" == true ]] || exit 1
    fi

    # Verify the remote uses the correct SSH host alias
    local actual_remote
    actual_remote=$(git -C "$PROJECT_ROOT" remote get-url origin 2>/dev/null || true)
    if [[ "$actual_remote" != "$REMOTE_URL" ]]; then
        warn "origin remote is '${actual_remote}', expected '${REMOTE_URL}'"
        warn "Run: git remote set-url origin ${REMOTE_URL}"
    fi

    # node_modules must exist for the CI gates
    if [[ ! -d "${PROJECT_ROOT}/node_modules" ]]; then
        warn "node_modules is missing — installing dependencies…"
        if [[ "$DRY_RUN" == false ]]; then
            (cd "$PROJECT_ROOT" && yarn install --frozen-lockfile)
        fi
    fi

    if [[ "$DRY_RUN" == false ]]; then
        success "On branch ${DEV_BRANCH} as ${git_user} <${git_email}>"
    else
        dim "[dry-run] preflight: branch=${current_branch} identity=${git_user} <${git_email}> remote=${actual_remote}"
    fi

    if [[ "$ASSUME_YES" == false && "$DRY_RUN" == false ]]; then
        echo ""
        echo -e "${BOLD}About to release:${NC}"
        dim "  message : ${COMMIT_MSG}"
        dim "  version : ${version}"
        dim "  tag     : ${tag}"
        dim "  squash  : $([[ "$DO_SQUASH" == true ]] && echo "yes${SQUASH_N:+ (last ${SQUASH_N})}" || echo 'no')"
        dim "  checks  : $([[ "$DO_CHECKS" == true ]] && echo 'lint + type-check + build + header parity' || echo 'SKIPPED')"
        echo ""
        read -r -p "Proceed? [y/N] " ans
        [[ "$ans" =~ ^[Yy]$ ]] || { error "Aborted by user."; exit 1; }
    fi
}

# -----------------------------------------------------------------------------
# Step: scaffold the release note
# -----------------------------------------------------------------------------
do_release_notes() {
    local version="$1"
    local existing
    existing=$(existing_notes_for_version "$version")

    if [[ -n "$existing" ]]; then
        step "Release note ${existing} (already present)"
        dim "${RELEASES_DIR}/${existing}"
        record_result "skip"
        return 0
    fi

    if [[ "$DO_NOTES" == false ]]; then
        warn "Skipping release-note scaffold (--no-notes)"
        record_result "skip"
        return 0
    fi

    step "Scaffold release note"

    local codename today filename path
    codename=$(release_codename)
    today=$(date +%Y-%m-%d)
    filename="v${version}-${codename}-${today}.md"
    path="${RELEASES_DIR}/${filename}"

    if [[ "$DRY_RUN" == true ]]; then
        dim "[dry-run] would create ${path}"
        record_result "skip"
        return 0
    fi

    mkdir -p "$RELEASES_DIR"
    cat > "$path" <<EOF
---
version: ${version}
codename: ${codename}
date: ${today}
status: draft
audience: public
---

# WhereQ App Hub v${version} — ${codename}

> One-sentence headline for this release.

## What's in this release

- Describe each user-visible change here.

## Notes

- The release notes live in \`docs/releases/${filename}\`.
- Set \`status: shipped\` once the Vercel deploy is live.
- The git tag for this release is \`v${version}\`.

## Links

| What | Where |
|---|---|
| Live app | ${PRODUCTION_URL} |
| Vercel alias | ${VERCEL_ALIAS} |
| Source | https://github.com/whereq/whereq.ca |
EOF

    success "Created ${path}"
    record_result "ok"
}

# -----------------------------------------------------------------------------
# Step: stage and commit any pending changes
# -----------------------------------------------------------------------------
do_stage_and_commit() {
    step "Stage and commit pending changes"

    if [[ "$DRY_RUN" == true ]]; then
        dim "[dry-run] would run: git add -A && git commit -m \"${COMMIT_MSG}\""
        record_result "skip"
        return 0
    fi

    local has_changes=false
    git -C "$PROJECT_ROOT" diff --quiet || has_changes=true
    git -C "$PROJECT_ROOT" diff --cached --quiet || has_changes=true
    if [[ -n "$(git -C "$PROJECT_ROOT" ls-files --others --exclude-standard)" ]]; then
        has_changes=true
    fi

    if [[ "$has_changes" == false ]]; then
        warn "Working tree already clean — nothing to commit"
        record_result "skip"
        return 0
    fi

    # Defensive: never commit a .env file (they are gitignored, but -A on a
    # dirty index should still not be able to leak one).
    local staged_env
    staged_env=$(git -C "$PROJECT_ROOT" diff --cached --name-only | grep -E '(^|/)\.env' || true)
    if [[ -n "$staged_env" ]]; then
        error "Refusing to release — .env file(s) are staged:"
        echo "$staged_env" | sed 's/^/  /'
        dim "Unstage them: git reset HEAD -- <file>"
        exit 1
    fi

    dim "Staging all changes..."
    git -C "$PROJECT_ROOT" status --short | sed 's/^/  /'
    echo ""

    git -C "$PROJECT_ROOT" add -A
    git -C "$PROJECT_ROOT" commit -m "$COMMIT_MSG"

    success "Committed → $(git -C "$PROJECT_ROOT" log -1 --oneline)"
    record_result "ok"
}

# -----------------------------------------------------------------------------
# Step: squash commits
# -----------------------------------------------------------------------------
do_squash() {
    if [[ "$DO_SQUASH" == false ]]; then
        warn "Skipping squash (--no-squash)"
        record_result "skip"
        return 0
    fi

    local base

    if [[ -n "$SQUASH_N" ]]; then
        step "Squash last ${SQUASH_N} commits into one"
        base="HEAD~${SQUASH_N}"
    else
        step "Squash all commits since branched from ${MAIN_BRANCH}"
        if [[ "$DRY_RUN" == false ]]; then
            base=$(git -C "$PROJECT_ROOT" merge-base "$MAIN_BRANCH" HEAD)
            local commit_count
            commit_count=$(git -C "$PROJECT_ROOT" rev-list --count "${base}..HEAD")
            dim "Merge-base: ${base:0:10}  |  Squashing ${commit_count} commit(s)"

            if [[ "$commit_count" -eq 0 ]]; then
                warn "No commits to squash — '${DEV_BRANCH}' is even with '${MAIN_BRANCH}'."
                record_result "skip"
                return 0
            fi

            echo ""
            git -C "$PROJECT_ROOT" log --oneline "${base}..HEAD" | sed 's/^/  /'
            echo ""
        else
            base="<merge-base>"
            dim "[dry-run] would compute merge-base with ${MAIN_BRANCH}"
        fi
    fi

    dim "git reset --soft ${base}"
    dim "git commit -m \"${COMMIT_MSG}\""

    run git -C "$PROJECT_ROOT" reset --soft "$base"
    run git -C "$PROJECT_ROOT" commit -m "$COMMIT_MSG"

    if [[ "$DRY_RUN" == false ]]; then
        success "Squashed → $(git -C "$PROJECT_ROOT" log -1 --oneline)"
    fi

    record_result "ok"
}

# -----------------------------------------------------------------------------
# Step: push dev to remote
# -----------------------------------------------------------------------------
do_push_dev() {
    step "Push ${DEV_BRANCH} to origin"

    # --force-with-lease only makes sense once origin/dev exists; on the
    # very first release it creates the remote branch.
    if [[ "$DO_SQUASH" == true ]] && git -C "$PROJECT_ROOT" show-ref --verify --quiet "refs/remotes/origin/${DEV_BRANCH}"; then
        dim "History was rewritten — using --force-with-lease"
        run git -C "$PROJECT_ROOT" push origin "$DEV_BRANCH" --force-with-lease
    else
        run git -C "$PROJECT_ROOT" push origin "$DEV_BRANCH"
    fi

    record_result "ok"
}

# -----------------------------------------------------------------------------
# Step: merge dev into main
# -----------------------------------------------------------------------------
do_merge_to_main() {
    step "Merge ${DEV_BRANCH} → ${MAIN_BRANCH}"

    run git -C "$PROJECT_ROOT" checkout "$MAIN_BRANCH"
    run git -C "$PROJECT_ROOT" pull origin "$MAIN_BRANCH"
    run git -C "$PROJECT_ROOT" merge --no-ff "$DEV_BRANCH" -m "Merge ${DEV_BRANCH}: ${COMMIT_MSG}"

    if [[ "$DRY_RUN" == false ]]; then
        success "Merged → $(git -C "$PROJECT_ROOT" log -1 --oneline)"
    fi

    record_result "ok"
}

# -----------------------------------------------------------------------------
# Step: tag main
# -----------------------------------------------------------------------------
do_tag() {
    local tag="v$1"

    step "Tag ${MAIN_BRANCH} as ${tag}"
    dim "Message: ${TAG_MSG}"

    if [[ "$DRY_RUN" == false ]] && git -C "$PROJECT_ROOT" rev-parse "$tag" &>/dev/null; then
        error "Tag ${tag} already exists."
        dim "Delete it first if you want to recreate: git tag -d ${tag}"
        exit 1
    fi

    run git -C "$PROJECT_ROOT" tag -a "$tag" -m "$TAG_MSG"

    if [[ "$DRY_RUN" == false ]]; then
        success "Tagged: ${tag}"
    fi

    record_result "ok"
}

# -----------------------------------------------------------------------------
# Step: push main + tags
# -----------------------------------------------------------------------------
do_push_main() {
    step "Push ${MAIN_BRANCH} + tags to origin"

    run git -C "$PROJECT_ROOT" push origin "$MAIN_BRANCH"
    run git -C "$PROJECT_ROOT" push origin --tags

    record_result "ok"
}

# -----------------------------------------------------------------------------
# Step: switch back to dev
# -----------------------------------------------------------------------------
do_return_to_dev() {
    step "Switch back to ${DEV_BRANCH}"

    run git -C "$PROJECT_ROOT" checkout "$DEV_BRANCH"
    success "Back on ${DEV_BRANCH}"

    record_result "ok"
}

# -----------------------------------------------------------------------------
# Summary
# -----------------------------------------------------------------------------
print_summary() {
    echo ""
    echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD} Release Summary — whereq.ca${NC}"
    echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    printf "%-6s  %-42s  %s\n" "Step" "Action" "Result"
    echo  "──────  ──────────────────────────────────────────  ──────"

    local i
    for i in "${!STEP_NAMES[@]}"; do
        local num=$((i + 1))
        local result="${STEP_RESULTS[$i]:-?}"
        local icon
        case "$result" in
            ok)   icon="${GREEN}✔ ok${NC}" ;;
            skip) icon="${YELLOW}– skip${NC}" ;;
            fail) icon="${RED}✖ FAIL${NC}" ;;
            *)    icon="${DIM}?${NC}" ;;
        esac
        printf "%-6s  %-42s  " "$num" "${STEP_NAMES[$i]:0:42}"
        echo -e "$icon"
    done

    if [[ "$DRY_RUN" == false ]]; then
        echo ""
        echo -e "${BOLD}Recent tags:${NC}"
        git -C "$PROJECT_ROOT" tag --sort=-version:refname | sed -n '1,5p' | sed 's/^/  /'
        echo ""
        echo -e "${BOLD}Branch tips:${NC}"
        git -C "$PROJECT_ROOT" log --oneline -1 "$MAIN_BRANCH" | sed "s/^/  main:  /"
        git -C "$PROJECT_ROOT" log --oneline -1 "$DEV_BRANCH"  | sed "s/^/  dev:   /"
    fi

    echo ""
    echo -e "  Message: ${BOLD}${COMMIT_MSG}${NC}   Elapsed: ${BOLD}$(elapsed_time)${NC}"
    echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${BOLD}Deployment — automatic, nothing to run:${NC}"
    echo -e "  ${DIM}The main push above triggered Vercel. Live in ~30s:${NC}"
    echo -e "  ${DIM}${PRODUCTION_URL}${NC}"
    echo -e "  ${DIM}${VERCEL_ALIAS}${NC}"
    echo ""
    echo -e "${BOLD}Rollback (if the deploy misbehaves):${NC}"
    echo -e "  ${DIM}Vercel dashboard → Project → Deployments → Promote to Production${NC}"
    echo -e "  ${DIM}or push a revert commit to main (triggers a normal deploy)${NC}"
    echo ""
    echo -e "${BOLD}Optional local smoke test:${NC}"
    echo -e "  ${DIM}yarn preview${NC}   ${DIM}# then open http://localhost:4173${NC}"
    echo -e "  ${DIM}Multimedia → Prepare a video = the COOP/COEP smoke test (§19.6)${NC}"
}

trap 'echo ""; error "Release interrupted."; print_summary; exit 1' ERR

# -----------------------------------------------------------------------------
# Main
# -----------------------------------------------------------------------------
main() {
    parse_args "$@"

    local version
    version=$(next_version)

    preflight
    run_ci_gates
    do_release_notes "$version"
    do_stage_and_commit
    do_squash
    do_push_dev
    do_merge_to_main
    do_tag "$version"
    do_push_main
    do_return_to_dev
    print_summary
    echo -e "${GREEN}${BOLD}Release complete.${NC}"
    echo -e "${DIM}Vercel is deploying now — ${PRODUCTION_URL} goes live in ~30s.${NC}"
}

main "$@"
