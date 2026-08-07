# TASK: dev-link-script

## Meta
- **Task ID**: CPR-V14-PORT-PLAN.08B
- **Parent plan**: docs/superpowers/plans/2026-08-07-cpr-v14-port-plan.md
- **Depends on**: none
- **Estimated scope**: M (2 files)
- **Model hint**: terra

## Objective
After this task, a developer at the repo root can run `pwsh -NoProfile -File tools/dev-link.ps1 [-FoundryData <path>] [-Packs]` and get: a generated `module.json` at the repo root (dev manifest derived from `module-dev.json`), and an idempotently-created NTFS junction `<FoundryData>\modules\chris-premades` pointing at the repo root. `pwsh -NoProfile -File tools/dev-link.accept.ps1` exits 0, proving the behavioral criteria below.

## Context
This repo is a Foundry VTT module (id `chris-premades`). The dev loop must not require a webpack build per iteration: `module-dev.json` is the dev variant of the manifest whose `esmodules` entry points at the unbundled source `scripts/module.js`, so linking the repo itself into a Foundry data folder and generating `module.json` from `module-dev.json` gives a zero-copy edit→refresh loop. A junction (not a copy) is the decided mechanism. The root `module.json` is a generated file and is already gitignored — that is settled; do not commit it or touch `.gitignore`. Foundry locks its LevelDB compendium packs while running, which is why the `-Packs` rebuild path must be documented as requiring Foundry to be stopped. This project has no e2e/UX review suite configured, which is why "Affected workflow IDs" is "none".

## Files

### Touch
| Path | Action | Notes |
|------|--------|-------|
| `tools/dev-link.accept.ps1` | create | acceptance harness — create FIRST; see Acceptance |
| `tools/dev-link.ps1` | create | the dev-link script |

### Do NOT touch
- `module-dev.json` — read-only input to this task (behavioral criterion 3 asserts it is unmodified)
- `module-template.json`, `module-dev.json` — security-routed (owned by tasks 6/7)
- `.github/workflows/**` — security-routed (owned by tasks 8A/12)
- `scripts/**` — owned by task 6 (includes security-routed `scripts/migrations.js`)
- `README.md` — owned by task 7
- `.gitignore`, `package.json` — settled; no changes needed for this task
- Any file not listed under Touch. If completing the objective seems to
  require touching an unlisted file, STOP and report BLOCKED (see below).

**Standing exclusions (apply to every task):**
- Security-routed files (`.lanes/config.json` `security_routed`): `scripts/migrations.js`, `module-template.json`, `module-dev.json`, `.github/workflows/**`
- Do-not-touch list (`.lanes/config.json` `do_not_touch`): `package-lock.json`, `LICENSE`, `packData/**`, `lang/**`, `images/**`
- Pipeline-owned artifacts: `docs/superpowers/plans/**`, `docs/superpowers/tasks/**`, `.superpowers/sdd/**` — outputs, never task inputs
- Lockfile — no new dependencies in this task

## Interfaces

```powershell
# tools/dev-link.ps1 — exact parameter block:
param(
    [string]$FoundryData = 'F:\FoundryV14Data\Data',
    [switch]$Packs
)
# Fail-fast: $ErrorActionPreference = 'Stop'
# Repo root = parent directory of the script's own directory ($PSScriptRoot),
# never the current working directory.
# Throws (nonzero exit) when "<FoundryData>\modules" does not exist; the error
# message must contain that checked path.
```

```text
# module-dev.json — real excerpts of the three literal placeholder tokens
# this task substitutes (they appear exactly like this in the file):
  "version": "#{VERSION}#",
  "manifest": "#{MANIFEST}#",
  "download": "#{DOWNLOAD}#",
# Substitution contract: #{VERSION}# -> 0.0.0-dev ; #{MANIFEST}# -> "" ;
# #{DOWNLOAD}# -> "" ; output written to <repo-root>/module.json with no
# other content changes and no appended trailing newline.
```

```powershell
# tools/dev-link.accept.ps1 — contract:
# - invoked as: pwsh -NoProfile -File tools/dev-link.accept.ps1
# - exits 0 iff ALL behavioral criteria below hold, nonzero otherwise
# - prints one line per criterion with PASS/FAIL
# - uses a scratch dir under $env:TEMP for the positive-path checks and
#   removes it before exiting (also on failure)
# - must not require Foundry, network access, or npm
```

## Constraints
- PowerShell 7 (pwsh) compatible; Windows NTFS junctions via `New-Item -ItemType Junction`.
- No new dependencies; nothing beyond pwsh built-ins plus (for `-Packs` only) `npm run buildCompendiums`.
- `-Packs` behavior (not harness-tested; reviewer verifies by reading the code): when passed, run `npm run buildCompendiums` from the repo root before generating `module.json`, restoring the caller's location afterward even on failure (Push-Location/try/finally/Pop-Location or equivalent).
- `tools/dev-link.ps1` starts with a comment header documenting the dev loop (edit → refresh Foundry) and that Foundry must be STOPPED during `-Packs` (LevelDB packs are locked while Foundry runs).
- Writes nothing outside: the repo-root `module.json`, the junction path, and the harness's own `$env:TEMP` scratch dir.
- Never run any git command that writes; leave all changes uncommitted.
- Status messages (junction created / already present; module.json generated) go to the host.

## Acceptance

**Test command (must exit 0):**
```bash
pwsh -NoProfile -File tools/dev-link.accept.ps1 && npx eslint --no-eslintrc --version
```
(The project's `command_prefix` is empty — commands run at the repo root. The trailing eslint call is a no-op version check standing in for lint: this task creates PowerShell files, which the project's JS lint does not cover. The harness does not exist yet — creating it is the FIRST Touch entry, which waives the runnable-red requirement.)

**Behavioral criteria** (each must be asserted by `tools/dev-link.accept.ps1`):
1. Running `tools/dev-link.ps1 -FoundryData <nonexistent-path>` exits nonzero and its error output contains `<nonexistent-path>\modules`.
2. After any run (including the failed one above — generation precedes the path check), `<repo-root>/module.json` exists, contains `"version": "0.0.0-dev"`, and contains no `#{` token remnants.
3. `module-dev.json` is byte-identical before and after all harness runs.
4. With a scratch data dir containing an empty `modules/` subdirectory: the script exits 0 and `<scratch>\modules\chris-premades` exists with LinkType `Junction` whose target is the repo root.
5. A second identical run exits 0 and the junction is still present (idempotent; no error, no duplicate).

**Affected workflow IDs**: none

**Regression guard (task level — implementer runs this):**
```bash
npm run build
```

## Out of Scope
- Do not add parameters, config files, or environment-variable handling beyond the two specified parameters.
- Do not invoke webpack, launch Foundry, or mirror the release-zip file list.
- Do not modify `.gitignore`, `module-dev.json`, or any manifest.
- Do not fix unrelated issues (e.g. the known pre-existing eslint error in `scripts/`); report them instead.
- Do not update documentation.

## Report Format
Return exactly this structure:

```text
STATUS: IMPLEMENTED | IMPLEMENTED_WITH_DEVIATIONS | BLOCKED | BACKEND_FAILURE | RATE_LIMITED
FILES_CHANGED: <list with one-line summary each>
TEST_OUTPUT: <last 20 lines of the acceptance command>
DEVIATIONS: <anything done differently than specified, and why — or "none".
  IMPLEMENTED requires "none"; IMPLEMENTED_WITH_DEVIATIONS requires a
  non-empty list>
BLOCKED_REASON: <only if BLOCKED: what was needed that the spec didn't provide>
```
