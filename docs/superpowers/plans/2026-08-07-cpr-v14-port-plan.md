# CPR v14 Personal Fork Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A personal fork of Cauldron of Plentiful Resources (`chris-premades`) that runs on Foundry VTT v14, installable on Ken's server via a GitHub-release manifest URL, tracked against upstream until the official module supports v14.

**Architecture:** Fork upstream at tag `1.5.43`, cherry-pick TimRoesler's audited v14 port commits onto a `v14` branch, re-brand the manifest/release plumbing to the fork, and verify in a local Foundry v14 test world before the live server is ever touched. There is no unit-test harness upstream (the npm `test` script is a stub) and macro behavior is only observable inside a running Foundry world — so per-task verification is: webpack build succeeds, eslint is clean on touched files, and in-world checks pass. Do not invent a test framework (YAGNI).

**Tech Stack:** JavaScript (plain ESM, no TypeScript), webpack 5 (`scripts/module.js` → `dist/main.js`), LevelDB compendium packs built by `node packData/packData.mjs`, GitHub Actions release workflow, Foundry VTT v14 + dnd5e 5.3.3+ + Midi-QOL 14.x + DAE 14.x + Socket Lib.

**Spec:** `docs/superpowers/specs/2026-08-07-cpr-v14-port-design.md`

## Task/Lane Map

Lanes-aware revision (2026-08-07, after `/lanes-init`). Lanes per `ROUTING.md`: the audit tasks are frontier-judgment work; Tasks 6, 7, 8A, and 12 touch `security_routed` paths (`module-template.json`, `module-dev.json`, `.github/workflows/**`) → KEEP by hard rule (a); Task 6 is additionally cross-cutting (>100 files) → rule (b); Tasks 9, 10, 13 are human-in-the-loop. Task 8B is the one contract-ready DELEGATE unit.

| Task | Lane | Tier | Depends on |
|---|---|---|---|
| 1 — Repo bootstrap | KEEP | — | — (**DONE 2026-08-07**) |
| 2 — Baseline build | KEEP | — | 1 (**DONE 2026-08-07**) |
| 3 — Audit artifacts + skeleton | KEEP | — | 1 |
| 4 — Audit: infrastructure | KEEP | — | 3 |
| 5 — Audit: macros + metadata | KEEP | — | 4 |
| 6 — Apply the port | KEEP | — | 5 |
| 7 — Fork identity | KEEP | — | 6 |
| 8A — Release workflow edit | KEEP | — | 7 |
| 8B — dev-link.ps1 | DELEGATE | terra | 2 |
| 9 — Test instance + smoke test | KEEP (human) | — | 6, 8B |
| 10 — Category sweep + fix loop | KEEP (human) | — | 9 |
| 11 — First release | KEEP | — | 8A, 10 |
| 12 — Upstream tracking | KEEP | — | 11 |
| 13 — Live server upgrade | KEEP (human) | — | 10, 11 |

Routing note for Task 10: individual macro fixes discovered during the sweep MAY be spun out as ad-hoc DELEGATE specs when the symptom is reproducible and the fix is single-file with a statable acceptance — doubt routes KEEP, per ROUTING.md.

## Global Constraints

- Repo home: `F:\OnisCauldronOfHubris` (NTFS; never N:, which is exFAT-over-USB).
- Module id stays exactly `chris-premades` — never rename it.
- Version scheme: `1.5.43-v14.N` (N = fork release counter, starting at 1).
- Manifest compatibility: `"minimum": "13", "verified": "14", "maximum": "14"`.
- dnd5e system compatibility: `minimum 5.3.3, verified 5.3.3, maximum 5.9.9`.
- `times-up` is `recommends` (v13 only), not `requires`; hard requires are `midi-qol` (≥13.0.48), `socketlib` (≥1.1.2), `dae` (≥13.0.17).
- Branch layout: `main` mirrors upstream's default branch untouched; all work lands on `v14` (branched from tag `1.5.43`). Never commit port work to `main`. (Discovered at execution: upstream's `main` carries the 2.x pre-release track; the 1.5.x line lives on upstream branch `v13`, whose head is the 1.5.43 release commit. Future 1.5.x stable tags are expected from that line.)
- TimRoesler's code is *candidate patches* — nothing lands without an audit verdict (adopt / rewrite / investigate). Cherry-picks use `-x` so attribution SHAs are recorded (MIT requires attribution; keeping his authorship in git history satisfies it).
- The release zip ships exactly: `module.json dist packs styles templates LICENSE lang images CHANGELOG.md` (upstream's zip line — keep it identical).
- The fork must never publish to the FoundryVTT package registry (upstream's AutoPublish step must be removed).
- The live v13 server is not touched until Phase 2's exit bar is met, and only after a full user-data backup.
- Tasks marked **[HUMAN-IN-LOOP]** need Ken at the keyboard (Foundry UI interaction, licensed downloads, live-server operations). Everything else is fully agent-executable.

## Key Reference Facts (verified 2026-08-07 via GitHub API)

- Upstream: `chrisk123999/chris-premades`, default branch `main` (2.x track; 1.5.x line on branch `v13`), latest release `1.5.43` (2026-07-25), assets `module.json` + `module.zip`.
- Upstream delta `1.5.40..1.5.43`: 6 commits, 10 files — `CHANGELOG.md`, `packData/cpr-feats-2024/Alert_ZF09cgXfQf9N0yAc.json`, and 8 macro files.
- Port: `TimRoesler/chris-premades-v14`, standalone repo (NOT a GitHub fork; shares no git history with upstream). Default branch `main`. Commits, oldest→newest:
  - `8096badd` — Baseline: chris-premades 1.5.40 (V13) *(baseline import, not a patch)*
  - `a038213d` — V14 port: region-backed templates, system.changes, messageMode, manifest *(the big one, ~115 files)*
  - `cbffb219` — Fix pre-existing missing semicolon in relentlessEndurance.js
  - `f9771dc5` — Use getCoreRollMode for remaining rollMode callsite in metamagic.js
  - `42dfa622` — Point manifest/changelog/url at TimRoesler fork *(SKIP — we point at Ken's fork instead)*
  - `6999133f` — Move times-up from requires to recommends
  - `9e7e68e0` — Document V14 port in README and CHANGELOG *(SKIP — we write our own docs)*
- Port diff vs baseline: 120 files. Infrastructure (~29 files): `scripts/lib/utilities/templateUtils.js` (+187/−27, the centerpiece), `effectUtils.js` (+40/−1), `genericUtils.js` (+22/−1), `regionUtils.js` (+13/−0), `scripts/events/template.js` (+31/−1), `scripts/hooks.js` (+20/−7), `scripts/extensions/{attach,selectTool,template,tokens,effects,conditions}.js`, `scripts/applications/{medkit-effect,troubleshooter}.js`, `scripts/lib/crosshairs.js`, plus one-line `getCoreRollMode`-style call swaps in `scripts/events/*.js`. Macros: ~87 files, mostly 1–5 line changes. Metadata: `module-template.json`, `module-dev.json`, `README.md`, `CHANGELOG.md`.
- **Guaranteed cherry-pick conflicts** (files changed by BOTH the port and upstream 1.5.41–1.5.43): `scripts/macros/2014/classFeatures/druid/circleOfTheShepard/spiritTotem.js` and `scripts/macros/2024/mechanics/heroicInspiration.js`.
- Build: `npm ci`, `npm run buildCompendiums` (packData JSON → `packs/` LevelDB), `npm run build` (webpack → `dist/main.js`). `dist/`, `packs/`, and root `module.json` are generated (absent from the repo tree).
- Release workflow `.github/workflows/main.yml`: triggers on `release: [published]`; Node 20; builds; `cat module-template.json > module.json`; substitutes `version` (tag minus leading `v`) and `download` via `restackio/update-json-file-action@2.1`; zips; attaches assets with `ncipollo/release-action@v1` (`allowUpdates: true`); then a "FoundryVTT AutoPublish" HTTP step (to be deleted in the fork).
- `module-template.json` (release manifest source): `esmodules: ["dist/main.js"]`, `manifest` hardcoded to upstream's `releases/latest/download/module.json` (workflow does NOT substitute it — must be edited to Ken's fork).
- `module-dev.json` (dev manifest source): identical but `esmodules: ["scripts/module.js"]` (unbundled — no webpack needed per dev iteration) and `manifest: "#{MANIFEST}#"`.
- Foundry v13→v14 migration notes: https://foundryvtt.com/article/migration/ — dnd5e release notes: https://github.com/foundryvtt/dnd5e/releases

## File Structure

| Path | Task | Responsibility |
|---|---|---|
| `docs/superpowers/specs/2026-08-07-cpr-v14-port-design.md` | 1 | Approved design spec (moved from repo root) |
| `docs/superpowers/plans/2026-08-07-cpr-v14-port-plan.md` | 1 | This plan (moved from repo root) |
| `docs/superpowers/audits/2026-08-07-timroesler-port-audit.md` | 3–5, 10 | Per-change audit verdicts; Phase 2 findings log |
| `scripts/**`, `module-template.json`, `module-dev.json` | 6 | Audited port commits applied |
| `module-template.json`, `module-dev.json`, `README.md` | 7 | Fork identity (URLs, banner) |
| `.github/workflows/main.yml` | 8 | Release build without registry publish |
| `tools/dev-link.ps1` | 8B | Junction-based local dev deploy into the v14 test instance |
| `.github/workflows/upstream-watch.yml` | 12 | Weekly upstream-release watcher → GitHub issue |
| `docs/superpowers/UPSTREAM_BASELINE` | 12 | Upstream tag the fork currently incorporates |
| `docs/superpowers/MAINTENANCE.md` | 12 | Merge/re-test/release + retirement procedures |

---

### Task 1: Fork, clone into place, branch layout, land the docs (LANE: KEEP) — ✅ DONE 2026-08-07

> Executed: fork `OniNoKen4192/chris-premades`; repo initialized in place; remotes `origin`/`upstream`/`timport` wired; `v14` at tag `1.5.43` (commit `31c7b73c8`), mirror branch `main` tracking `upstream/main`; docs committed (`50e45c2ac`) and both branches pushed.

**Files:**
- Create: git repo in `F:\OnisCauldronOfHubris` (init + remotes; dir already has the two loose `.md` docs)
- Create: `docs/superpowers/specs/2026-08-07-cpr-v14-port-design.md`, `docs/superpowers/plans/2026-08-07-cpr-v14-port-plan.md` (moved from root)

**Interfaces:**
- Produces: remotes `origin` (Ken's fork), `upstream` (chrisk123999), `timport` (TimRoesler); branches `main` (= `upstream/main`) and `v14` (= tag `1.5.43`); `$me` = Ken's GitHub login. All later tasks run on `v14` in this repo.

- [ ] **Step 1: Verify gh auth and fork upstream**

```powershell
gh auth status
$me = gh api user -q .login
"GitHub login: $me"
gh repo fork chrisk123999/chris-premades --clone=false
```

Expected: `gh auth status` shows a logged-in account; fork exists at `https://github.com/$me/chris-premades`. If `gh` is missing or unauthenticated, STOP and ask Ken to run `gh auth login` — do not work around it.

- [ ] **Step 2: Init in place and wire remotes** (the directory is non-empty, so `git clone` won't work; init+fetch does)

```powershell
cd F:\OnisCauldronOfHubris
git init
git remote add origin "https://github.com/$me/chris-premades.git"
git remote add upstream https://github.com/chrisk123999/chris-premades.git
git remote add timport https://github.com/TimRoesler/chris-premades-v14.git
git fetch upstream --tags
git fetch timport main
```

Expected: fetches complete; `git tag -l 1.5.43` prints `1.5.43`.

- [ ] **Step 3: Create branches**

```powershell
git checkout -b v14 1.5.43
git branch main upstream/main
git log --oneline -1
```

Expected: checkout succeeds (the two loose `.md` files at root are untracked and don't collide with any tracked path); last line shows the 1.5.43 release commit. If checkout complains about untracked files being overwritten, STOP — something unexpected is in the directory; surface it to Ken.

- [ ] **Step 4: Move the docs into the repo and commit on v14**

```powershell
New-Item -ItemType Directory -Force docs\superpowers\specs, docs\superpowers\audits | Out-Null
Move-Item .\2026-08-07-cpr-v14-port-design.md docs\superpowers\specs\
git add docs/superpowers
git commit -m "docs: add v14 port design spec and implementation plan"
```

Expected: commit contains both docs — the spec (just moved from repo root) and this plan (already at `docs/superpowers/plans/`, written there before the repo was initialized).

- [ ] **Step 5: Push both branches**

```powershell
git push -u origin main
git push -u origin v14
```

Expected: both branches visible on `https://github.com/$me/chris-premades`.

---

### Task 2: Baseline build verification (clean 1.5.43, pre-port) (LANE: KEEP) — ✅ DONE 2026-08-07

> Executed: Node v22.14.0; `npm ci` clean; `buildCompendiums` produced 37 packs; webpack compiled successfully (4 size warnings only); `git status` empty (outputs ignored, incl. root `module.json` already in upstream `.gitignore`).

**Files:**
- No repo changes. Generates `node_modules/`, `packs/`, `dist/` (all gitignored).

**Interfaces:**
- Produces: proof the toolchain works before any port change, so any later build break is attributable to the port, not the environment.

- [ ] **Step 1: Confirm Node version**

```powershell
node --version
```

Expected: v20.x or later (upstream CI uses Node 20). If older, STOP and tell Ken.

- [ ] **Step 2: Install and build everything, untouched**

```powershell
cd F:\OnisCauldronOfHubris
npm ci
npm run buildCompendiums
npm run build
```

Expected: all three succeed. `npm run build` ends with webpack `compiled successfully` (warnings acceptable); `dist\main.js` and `dist\main.js.map` exist; `packs\` contains 37 pack directories (e.g. `packs\cpr-summons`).

- [ ] **Step 3: Confirm generated outputs are ignored**

```powershell
git status --porcelain
```

Expected: empty output (nothing untracked/modified). If `dist/`, `packs/`, or `module.json` appear, add the missing lines to `.gitignore` and commit `chore: ignore generated build outputs`.

- [ ] **Step 4: Record the baseline** — no commit; note in the session that baseline builds clean.

---

### Task 3: Generate audit artifacts and the audit doc skeleton (LANE: KEEP)

**Files:**
- Create: `docs/superpowers/audits/2026-08-07-timroesler-port-audit.md`
- Create (gitignored scratch, not committed): `audit-scratch/port-full.diff`, `audit-scratch/<sha>.patch` per port commit

**Interfaces:**
- Consumes: remotes/branches from Task 1.
- Produces: the audit doc whose per-file verdict table Tasks 4–5 fill in and Task 6 executes from. Verdict vocabulary (exact strings): `ADOPT`, `REWRITE`, `INVESTIGATE`, `SKIP`.

- [ ] **Step 1: Generate diff artifacts**

```powershell
cd F:\OnisCauldronOfHubris
New-Item -ItemType Directory -Force audit-scratch | Out-Null
Add-Content .gitignore "`naudit-scratch/"
git diff 8096badd..timport/main > audit-scratch\port-full.diff
foreach ($sha in 'a038213d','cbffb219','f9771dc5','6999133f','42dfa622','9e7e68e0') { git show $sha > "audit-scratch\$sha.patch" }
git diff 1.5.40..1.5.43 -- scripts packData > audit-scratch\upstream-delta.diff
```

Expected: `port-full.diff` is non-trivial (120 files); each patch file non-empty. (`8096badd` is reachable because `timport` was fetched — it's Tim's baseline commit, byte-identical content to tag `1.5.40`. Sanity-check that claim: `git diff 1.5.40..8096badd --stat` should output nothing.)

- [ ] **Step 2: Write the audit doc skeleton** — create `docs/superpowers/audits/2026-08-07-timroesler-port-audit.md` with this exact structure:

```markdown
# TimRoesler v14 Port — Audit

**Baseline:** upstream 1.5.40 (his commit 8096badd) → target: our v14 branch at 1.5.43
**Verdicts:** ADOPT (take as-is) / REWRITE (concept right, code replaced by ours) /
INVESTIGATE (unclear — resolved to ADOPT or REWRITE before Task 6 ends) / SKIP (not taken)

## Commit dispositions

| Commit | Subject | Disposition |
|---|---|---|
| a038213d | V14 port: region-backed templates, system.changes, messageMode, manifest | (pending) |
| cbffb219 | Missing semicolon relentlessEndurance.js | (pending) |
| f9771dc5 | getCoreRollMode in metamagic.js | (pending) |
| 6999133f | times-up requires→recommends | (pending) |
| 42dfa622 | Tim's fork URLs | SKIP — superseded by our fork identity (plan Task 7) |
| 9e7e68e0 | Tim's README/CHANGELOG | SKIP — superseded by our docs (plan Task 7) |

## Infrastructure changes (Task 4)

| File | Change summary | Verdict | Notes |
|---|---|---|---|

## Macro changes (Task 5)

| Pattern / file | Change summary | Verdict | Notes |
|---|---|---|---|

## Metadata changes (Task 5)

| File | Change summary | Verdict | Notes |
|---|---|---|---|

## Expected conflicts vs 1.5.43

- scripts/macros/2014/classFeatures/druid/circleOfTheShepard/spiritTotem.js — also changed upstream in 1.5.41–1.5.43
- scripts/macros/2024/mechanics/heroicInspiration.js — also changed upstream in 1.5.41–1.5.43

## Phase 2 findings (Task 10)

| Date | Macro | Symptom | Fix commit |
|---|---|---|---|
```

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/audits/2026-08-07-timroesler-port-audit.md .gitignore
git commit -m "docs: audit skeleton for TimRoesler v14 port review"
```

---

### Task 4: Audit the infrastructure changes (LANE: KEEP)

**Files:**
- Modify: `docs/superpowers/audits/2026-08-07-timroesler-port-audit.md` (fill "Infrastructure changes" table)

**Interfaces:**
- Consumes: `audit-scratch/port-full.diff`, `audit-scratch/a038213d.patch`.
- Produces: a verdict row for every infrastructure file, used verbatim by Task 6.

- [ ] **Step 1: Fetch the migration references.** Read https://foundryvtt.com/article/migration/ (v14 section) and the dnd5e 5.3.x release notes (https://github.com/foundryvtt/dnd5e/releases — 5.3.0 through 5.3.3), noting: the MeasuredTemplate→Region transition, `ActiveEffect.changes`→`system.changes` (dnd5e), roll-mode API relocation, and any renamed canvas/token APIs. Keep notes; every verdict below must cite which migration requirement the change serves.

- [ ] **Step 2: Review each infrastructure file's hunks** from `port-full.diff`, in this order (highest risk first): `scripts/lib/utilities/templateUtils.js`, `scripts/lib/utilities/regionUtils.js`, `scripts/events/template.js`, `scripts/extensions/template.js`, `scripts/extensions/attach.js`, `scripts/hooks.js`, `scripts/lib/utilities/effectUtils.js`, `scripts/lib/utilities/genericUtils.js`, `scripts/extensions/selectTool.js`, `scripts/extensions/tokens.js`, `scripts/extensions/effects.js`, `scripts/extensions/conditions.js`, `scripts/applications/medkit-effect.js`, `scripts/applications/troubleshooter.js`, `scripts/lib/crosshairs.js`, then the one-line files (`scripts/events/*.js`, `scripts/lib/utilities/{actorUtils,crosshairUtils,itemUtils}.js`).

  For each file record: what changed, whether it matches a documented v14/dnd5e migration need, whether the code is defensively written (v13 fallback where the manifest still allows v13 — `minimum: "13"`), and the verdict. A change is `ADOPT` only if it is both *necessary* (maps to a migration note or an observable v14 API break) and *sufficient* (no missed callsite — grep the repo for the old API to confirm: e.g. if he renamed a rollMode call, `git grep -n "<oldApiName>" scripts/` on `v14` must show only sites his diff also touches).

- [ ] **Step 3: Special attention — dual-version support.** The manifest keeps `minimum: "13"`. For each infrastructure change, note in the verdict row whether the new code path is v14-only or version-guarded. If v14-only code would break v13, record `INVESTIGATE` with the question "guard or drop v13 support?" — the resolution (pick one, consistently) is decided when Task 6 applies it, and if the answer is "drop v13", Task 7 must also raise manifest `minimum` to `"14"`. Consistency matters more than the choice.

- [ ] **Step 4: Commit the filled table**

```bash
git add docs/superpowers/audits/2026-08-07-timroesler-port-audit.md
git commit -m "docs: audit verdicts for port infrastructure changes"
```

Expected: every infrastructure file listed in Key Reference Facts has a row; zero rows left `(pending)`; any `INVESTIGATE` rows carry a concrete question.

---

### Task 5: Audit the macro and metadata changes (LANE: KEEP)

**Files:**
- Modify: `docs/superpowers/audits/2026-08-07-timroesler-port-audit.md` (fill "Macro changes" and "Metadata changes" tables; set "Commit dispositions")

**Interfaces:**
- Consumes: `audit-scratch/port-full.diff`; infrastructure verdicts from Task 4 (macro changes usually consume utilities audited there).
- Produces: complete audit doc — the contract for Task 6.

- [ ] **Step 1: Classify the ~87 macro diffs into patterns.** Expected patterns (verify against the actual diff, don't assume): (a) rollMode call swap to the core API (`getCoreRollMode`-style), (b) `messageMode`/chat-message option renames, (c) template creation/lookup routed through the rewritten `templateUtils`/region helpers, (d) effect-data `changes`→`system.changes`, (e) misc one-offs (e.g. `wallOfFire.js` +39/−50 is a real rewrite — read it fully, not as a pattern member). Audit each *pattern* once against the migration notes, then spot-check ≥5 member files per pattern for faithful application. Verdict rows may cover a pattern (list member files in Notes) — except one-offs, which get individual rows.

- [ ] **Step 2: Audit the two known conflict files individually** (`spiritTotem.js` 2014, `heroicInspiration.js` 2024): read Tim's change AND the upstream 1.5.41–1.5.43 change (`audit-scratch/upstream-delta.diff`), and write in Notes exactly how the merged result should read — this is the conflict-resolution recipe Task 6 follows.

- [ ] **Step 3: Audit metadata diffs** (`module-template.json`, `module-dev.json`): confirm the port's changes are exactly — compatibility `13/14/14`, dnd5e minimum `5.2.5`→`5.3.3`, times-up moved to `recommends` with a reason string. Anything else in those diffs gets its own verdict row.

- [ ] **Step 4: Close out the doc.** Fill the "Commit dispositions" table (expected: `a038213d`, `cbffb219`, `f9771dc5`, `6999133f` = ADOPT-with-noted-rewrites or ADOPT; `42dfa622`, `9e7e68e0` = SKIP). Resolve every remaining `INVESTIGATE` to ADOPT or REWRITE — none may survive this task. Commit:

```bash
git add docs/superpowers/audits/2026-08-07-timroesler-port-audit.md
git commit -m "docs: complete port audit - macro patterns, metadata, conflict recipes"
```

**Fallback (from spec):** if the audit concludes the port is fundamentally unsound (verdict: majority REWRITE on infrastructure), STOP after this task and tell Ken — the fresh-port fallback needs a revised plan, not improvisation.

---

### Task 6: Apply the audited port onto v14 (LANE: KEEP — security_routed manifests + cross-cutting)

**Files:**
- Modify: `scripts/**` (~115 files), `module-template.json`, `module-dev.json` — via cherry-pick + audit-driven rewrites

**Interfaces:**
- Consumes: audit verdicts and conflict recipes (Tasks 4–5).
- Produces: a `v14` branch that builds, containing all port work. Tasks 7–8 build on this exact state.

- [ ] **Step 1: Cherry-pick the four adopted commits in original order**

```powershell
cd F:\OnisCauldronOfHubris
git checkout v14
git cherry-pick -x a038213d
# resolve conflicts (expected: spiritTotem.js, heroicInspiration.js, possibly CHANGELOG.md)
# using the audit doc's conflict recipes; for CHANGELOG.md take the 1.5.43 side unchanged
git cherry-pick -x cbffb219
git cherry-pick -x f9771dc5
git cherry-pick -x 6999133f
```

Expected: 4 commits on `v14`, each with `(cherry picked from commit …)` in its message. Every conflict resolution must follow the audit doc's written recipe — if a conflict appears in a file the audit didn't anticipate, stop and audit that file before resolving (add a row to the audit doc, then resolve).

- [ ] **Step 2: Apply REWRITE verdicts.** For each audit row marked `REWRITE`, replace Tim's version of that hunk with the version specified in the row's Notes, as one commit per logical group:

```bash
git add <files>
git commit -m "port(v14): rewrite <area> per audit - <one-line reason>"
```

Expected: zero audit rows whose verdict is not reflected on the branch. If the audit had no REWRITE rows, skip this step (note that in the session log).

- [ ] **Step 3: Verify the build**

```powershell
npm run build
```

Expected: webpack `compiled successfully`. A failure here is a port defect — fix it (systematic-debugging skill), commit as `fix(v14): …`.

- [ ] **Step 4: Lint the touched files only** (repo may not be globally lint-clean; don't fix pre-existing noise)

```powershell
git diff --name-only 1.5.43..HEAD -- 'scripts' | ForEach-Object { npx eslint $_ }
```

Expected: no *errors* on touched files (warnings acceptable if the same rule fires on untouched upstream code). Fix errors, commit `fix(v14): lint errors in ported files`.

- [ ] **Step 5: Grep for leftovers.** For each old-API name recorded in Task 4's verdicts (e.g. the pre-v14 rollMode accessor), run `git grep -n "<oldName>" scripts/` — expected: no hits outside comments. Any hit is a missed callsite: fix and commit `fix(v14): migrate missed <api> callsite in <file>`.

- [ ] **Step 6: Push**

```powershell
git push origin v14
```

---

### Task 7: Fork identity — manifests and README (LANE: KEEP — security_routed manifests)

**Files:**
- Modify: `module-template.json`, `module-dev.json`, `README.md`

**Interfaces:**
- Consumes: `$me` (Ken's GitHub login, from `gh api user -q .login`); post-cherry-pick manifests (which now carry Tim's compat/times-up changes but still upstream's URLs, since `42dfa622` was skipped).
- Produces: manifests pointing at Ken's fork. Task 8A's workflow and Task 11's release depend on these exact URLs.

- [ ] **Step 1: Point both manifest templates at the fork**

```powershell
cd F:\OnisCauldronOfHubris
$me = gh api user -q .login
foreach ($f in 'module-template.json','module-dev.json') {
  $c = Get-Content $f -Raw
  $c = $c.Replace('https://github.com/chrisk123999/chris-premades/blob/master/CHANGELOG.md', "https://github.com/$me/chris-premades/blob/v14/CHANGELOG.md")
  $c = $c.Replace('"url": "https://github.com/chrisk123999/chris-premades/"', "`"url`": `"https://github.com/$me/chris-premades/`"")
  $c = $c.Replace('https://github.com/chrisk123999/chris-premades/releases/latest/download/module.json', "https://github.com/$me/chris-premades/releases/latest/download/module.json")
  Set-Content $f $c -NoNewline
}
git diff --stat
```

Expected: both files changed; `git diff` shows ONLY `changelog`, `url`, and (template only) `manifest` lines — `module-dev.json`'s manifest is the `#{MANIFEST}#` token and must stay untouched. The `id` field must still read `chris-premades`.

- [ ] **Step 2: Verify the inherited port metadata is intact** (defends against a bad conflict resolution in Task 6):

```powershell
$t = Get-Content module-template.json -Raw | ConvertFrom-Json
"compat: $($t.compatibility | ConvertTo-Json -Compress)"
"dnd5e min: $(($t.relationships.systems | Where-Object id -eq 'dnd5e').compatibility.minimum)"
"requires: " + (($t.relationships.requires | ForEach-Object id) -join ',')
"recommends: " + (($t.relationships.recommends | ForEach-Object id) -join ',')
```

Expected: compat `{"minimum":"13","verified":"14","maximum":"14"}` (or `minimum:"14"` if Task 4 decided to drop v13); dnd5e min `5.3.3`; requires `midi-qol,socketlib,dae`; recommends `times-up`. Any mismatch: fix by hand to these values.

- [ ] **Step 3: Add the README banner.** Insert at the very top of `README.md`, above the existing first line:

```markdown
> ## ⚠️ Personal v14 fork — not the official module
>
> This is Ken's personal fork of [Cauldron of Plentiful Resources](https://github.com/chrisk123999/chris-premades),
> ported to Foundry VTT v14 (incorporating audited changes from
> [TimRoesler/chris-premades-v14](https://github.com/TimRoesler/chris-premades-v14)).
> **Do not report issues here to the CPR, Midi-QOL, or DAE authors.**
> When the official module ships v14 support, this fork will be retired.
> Versions are numbered `<upstream-baseline>-v14.N`.

```

- [ ] **Step 4: Commit and push**

```bash
git add module-template.json module-dev.json README.md
git commit -m "chore(v14): fork identity - manifests point at fork releases, README banner"
git push origin v14
```

---

### Task 8A: Release workflow edit (LANE: KEEP — security_routed workflows)

**Files:**
- Modify: `.github/workflows/main.yml`

**Interfaces:**
- Consumes: manifests from Task 7.
- Produces: the release workflow Task 11 triggers.

- [ ] **Step 1: Remove the registry-publish step from `main.yml`.** Delete the entire `FoundryVTT AutoPublish` step (the final step: `uses: fjogeleit/http-request-action@v2` posting to `https://foundryvtt.com/_api/packages/release_version/`) and the now-unused `FOUNDRY_MANIFEST=` line in the `get_version` step. Leave everything else byte-identical — in particular the zip line `zip -r ./module.zip module.json dist packs styles templates LICENSE lang images CHANGELOG.md` and the `restackio/update-json-file-action@2.1` substitution of `version` + `download`.

Verification: `git diff .github/workflows/main.yml` shows only deletions (plus the removed `FOUNDRY_MANIFEST` line), and `npx --yes js-yaml .github/workflows/main.yml` exits 0 (it parses the YAML and prints it as JSON — a parse error means the edit broke the file).

- [ ] **Step 2: Commit and push**

```bash
git add .github/workflows/main.yml
git commit -m "chore(v14): fork release workflow - no registry publish"
git push origin v14
```

---

### Task 8B: `tools/dev-link.ps1` — local dev deploy (LANE: DELEGATE, tier terra)

**Files:**
- Create: `tools/dev-link.ps1`

**Interfaces:**
- Consumes: `module-dev.json` at repo root — real file, containing the literal placeholder tokens `#{VERSION}#`, `#{MANIFEST}#`, and `#{DOWNLOAD}#`; npm script `buildCompendiums` (defined in `package.json` as `node packData/packData.mjs`).
- Produces (the contract Task 9 invokes):

```powershell
# invocation:
powershell -File tools\dev-link.ps1 [-FoundryData <path>] [-Packs]
# parameter block (exact):
param(
    [string]$FoundryData = 'F:\FoundryV14Data\Data',
    [switch]$Packs
)
```

**Purpose (for the implementer):** link this repo into a Foundry VTT data folder as the `chris-premades` module using an NTFS junction (zero-copy dev loop: edit file → refresh Foundry), generating a root `module.json` from `module-dev.json` so Foundry loads the unbundled sources (`scripts/module.js`) — no webpack run per iteration.

**Behavioral criteria:**
1. Fail-fast script (`$ErrorActionPreference = 'Stop'`); repo root resolved as the parent directory of the script's own directory (the script lives in `tools/`), never from the current working directory.
2. When `-Packs` is passed, run `npm run buildCompendiums` from the repo root before anything else (restore the caller's location afterward, even on failure).
3. Generate `module.json` at the repo root from `module-dev.json` by replacing `#{VERSION}#` with `0.0.0-dev` and both `#{MANIFEST}#` and `#{DOWNLOAD}#` with the empty string. No other content changes; do not append a trailing newline; never modify `module-dev.json` itself.
4. If `<FoundryData>\modules` does not exist, throw an error message that names the checked path and suggests `-FoundryData` is wrong. (Generating `module.json` before this check is acceptable.)
5. Create junction `<FoundryData>\modules\chris-premades` → repo root only if it does not already exist; a rerun with the junction present is a no-op success (idempotent). Use `New-Item -ItemType Junction`.
6. Print what happened (junction created / already present; module.json generated) to the host.
7. A comment header documents the dev loop and the constraint that Foundry must be stopped during `-Packs` (LevelDB packs are locked while Foundry runs).

**Constraints:** PowerShell 7 (pwsh) compatible; no external dependencies beyond git/npm already in the repo; writes nothing outside the repo-root `module.json` and the junction path; `module.json` is already gitignored upstream — do not commit it.

**Acceptance** (runnable without Foundry installed):

```powershell
# 1. Negative path: nonexistent data dir
powershell -File tools\dev-link.ps1 -FoundryData 'F:\definitely-not-real'
# expected: nonzero exit; error names F:\definitely-not-real\modules
# expected: module.json exists at repo root and contains "version": "0.0.0-dev"

# 2. Positive path + idempotence: scratch data dir
New-Item -ItemType Directory -Force C:\Users\kencu\AppData\Local\Temp\devlink-test\modules | Out-Null
powershell -File tools\dev-link.ps1 -FoundryData 'C:\Users\kencu\AppData\Local\Temp\devlink-test'
# expected: exit 0; junction ...\devlink-test\modules\chris-premades resolves to the repo root
powershell -File tools\dev-link.ps1 -FoundryData 'C:\Users\kencu\AppData\Local\Temp\devlink-test'
# expected: exit 0 again, reports junction already present
Remove-Item C:\Users\kencu\AppData\Local\Temp\devlink-test -Recurse -Force

# 3. Hygiene
git check-ignore module.json   # expected output: module.json
git status --porcelain          # expected: only tools/dev-link.ps1 as the new file
```

(Commit/merge is handled by the Lanes pipeline on APPROVE: work lands on `lanes/<task-id>` in the task worktree, then merges into `v14`.)

---

### Task 9: **[HUMAN-IN-LOOP]** Local Foundry v14 test instance + smoke test (LANE: KEEP)

**Files:**
- No repo changes (fixes discovered here are made in Task 10's loop). Creates `F:\FoundryV14Data\` outside the repo.

**Interfaces:**
- Consumes: `tools/dev-link.ps1` (Task 8B), built `packs/` (rerun `-Packs` if Task 6 is newer than the last `buildCompendiums`).
- Produces: a running v14 world named `cpr-test` with the module loaded — the environment for Task 10 and Task 11's install verification.

- [ ] **Step 1 [HUMAN]: Install Foundry v14** — download the v14 **Node.js** build from https://foundryvtt.com (licensed account) to e.g. `F:\FoundryV14App\`, then run it against a fresh data path so it can't touch any existing install:

```powershell
node F:\FoundryV14App\main.mjs --dataPath="F:\FoundryV14Data" --port=30014
```

Expected: server on http://localhost:30014; license accepted; data tree created at `F:\FoundryV14Data\Data`. (Desktop app with a separate data path is an acceptable alternative; the `--dataPath`/port isolation is the requirement, not the packaging.)

- [ ] **Step 2 [HUMAN]: Install the stack in the v14 instance** via Setup → Install System/Module: dnd5e (5.3.3+, within 5.x), Midi-QOL 14.x, DAE 14.x, Socket Lib. Do NOT install times-up.

- [ ] **Step 3: Link our module**

```powershell
cd F:\OnisCauldronOfHubris
powershell -File tools\dev-link.ps1 -FoundryData 'F:\FoundryV14Data\Data' -Packs
```

Expected: junction created; module.json generated. (Foundry must be stopped during `-Packs`.)

- [ ] **Step 4 [HUMAN]: Smoke test** in a new world `cpr-test` (system dnd5e), all four modules enabled, browser console (F12) open:
  1. World loads with **zero red console errors mentioning `chris-premades`**.
  2. Game Settings → Module Settings → Cauldron of Plentiful Resources renders and is savable.
  3. Compendia: "CPR Spells (2024)" and "CPR Summons" open and list entries.
  4. Two test actors (a fighter with a longsword, a target dummy): melee attack via Midi-QOL → attack card, damage card, HP applied.
  5. Wizard actor; drag *Guidance* from CPR Spells (2024) (its macro `scripts/macros/2024/spells/guidance.js` was port-touched); cast on the fighter → effect appears on target and expires per its duration **without times-up installed** (this validates the v14 core-expiry assumption behind demoting times-up).

Expected: all five pass → smoke test done, Phase 2 sweep may start. Any failure: STOP, record it in the audit doc's "Phase 2 findings" table, and fix via Task 10's loop before proceeding — the sweep builds on a loadable module.

---

### Task 10: **[HUMAN-IN-LOOP]** Category sweep and fix loop (LANE: KEEP; see routing note in Task/Lane Map)

**Files:**
- Modify: `scripts/**` (fix commits as failures surface)
- Modify: `docs/superpowers/audits/2026-08-07-timroesler-port-audit.md` ("Phase 2 findings" table)

**Interfaces:**
- Consumes: running `cpr-test` world (Task 9); audit doc.
- Produces: the spec's exit bar, which gates Tasks 11 and 13.

- [ ] **Step 1 [HUMAN]: Get the table list.** Ken lists every CPR-automated spell, class feature, and monster ability his actual party uses. Record the list at the top of the "Phase 2 findings" section. These are tested FIRST and are the exit bar.

- [ ] **Step 2 [HUMAN + agent]: Sweep by category, riskiest first.** In each category, test the table-list members plus the named representatives below (all port-touched, chosen to exercise the rewritten `templateUtils`/region path). For each: use the item in a midi workflow; expected = template/aura/summon appears, automation fires, damage/effects apply and expire, no red console errors.

  | Category | Representatives (macro files under `scripts/macros/`) |
  |---|---|
  | Templated/area spells | `2014/spells/wallOfFire.js` (largest rewrite), `2024/spells/moonbeam.js`, `2014/spells/spikeGrowth.js`, `2024/spells/cloudkill.js`, `2014/spells/darkness.js`, `2024/spells/sleetStorm.js` |
  | Auras & region effects | `2014/spells/auraOfLife.js`, `2014/classFeatures/cleric/peaceDomain/emboldeningBond.js`, `2014/classFeatures/paladin/oathOfConquest/auraOfConquest.js` |
  | Summons | `2024/spells/summonFey.js`, `2024/spells/conjureCelestial.js`, `2014/spells/bigbysHand.js`, `2014/spells/crownOfStars.js` |
  | Class features | `2024/classFeatures/barbarian/rage.js`, `2024/classFeatures/bard/bardicInspiration.js`, `2014/classFeatures/druid/circleOfTheShepard/spiritTotem.js` **(conflict-resolved file — mandatory)**, `2024/mechanics/heroicInspiration.js` **(conflict-resolved file — mandatory)**, `2014/classFeatures/druid/wildShape.js` |
  | Monster abilities | `2014/monsterFeatures/generic/gaze.js`, `2014/monsterFeatures/generic/enlarge.js`, `2014/monsterFeatures/giant/fireGiantDreadnought/shieldCharge.js` |

- [ ] **Step 3: Fix loop, per failure** (agent does this part): reproduce → use superpowers:systematic-debugging (read the macro + the utilities it calls, form a hypothesis, verify against the v14 API docs) → fix → `npm run build` if `dist` matters (dev loop uses unbundled sources, so usually just refresh Foundry) → Ken re-tests → commit:

```bash
git add <fixed files>
git commit -m "fix(v14): <macro> - <symptom in a few words>"
```

Each failure and its fix commit SHA goes in the "Phase 2 findings" table. Push after each session: `git push origin v14`.

- [ ] **Step 4 [HUMAN]: Declare the exit bar.** Exit when: every table-list item works, every representative above works, and the smoke test still passes end-to-end. Ken states this explicitly; record the date in the audit doc. Long-tail catalog macros beyond this are explicitly NOT tested (spec: fixed lazily when they surface in play).

---

### Task 11: First release `1.5.43-v14.1` and manifest-install verification (LANE: KEEP)

**Files:**
- No repo file changes (release is a GitHub object; workflow attaches assets).

**Interfaces:**
- Consumes: exit bar met (Task 10); workflow (Task 8A); manifests (Task 7).
- Produces: installable manifest URL `https://github.com/<$me>/chris-premades/releases/latest/download/module.json` — the URL Task 13 installs on the live server.

- [ ] **Step 1: Enable Actions on the fork** (forks default to disabled):

```powershell
$me = gh api user -q .login
gh api "repos/$me/chris-premades/actions/permissions" -X PUT -F enabled=true -f allowed_actions=all
```

Expected: exit 0. (If the API call is rejected, [HUMAN]: enable via the fork's Actions tab in the browser.)

- [ ] **Step 2: Cut the release**

```powershell
gh release create 1.5.43-v14.1 --target v14 --title "1.5.43-v14.1" --notes "First v14 fork release. Upstream baseline 1.5.43 + audited TimRoesler v14 port. Personal fork - see README."
gh run watch
```

Expected: workflow "Release Creation" runs and succeeds (~a few minutes; `npm ci` + compendium build + webpack on the runner).

- [ ] **Step 3: Verify the release assets**

```powershell
$m = Invoke-RestMethod "https://github.com/$me/chris-premades/releases/latest/download/module.json"
"id=$($m.id) version=$($m.version)"
"download=$($m.download)"
"verified=$($m.compatibility.verified)"
```

Expected: `id=chris-premades`, `version=1.5.43-v14.1`, download pointing at `releases/download/1.5.43-v14.1/module.zip` on the fork, `verified=14`. Any mismatch traces to Task 7 (manifest template) or the workflow substitution — fix, push, delete and re-cut the release (same tag is fine, `allowUpdates: true`).

- [ ] **Step 4 [HUMAN]: Manifest-install test.** In the v14 test instance: remove the dev junction (`Remove-Item F:\FoundryV14Data\Data\modules\chris-premades` — removes the junction, not the repo; verify the repo still exists afterward), then Setup → Install Module → paste the manifest URL. Expected: installs cleanly; `cpr-test` world loads; smoke-test items 1–3 from Task 9 pass. (Re-run `tools\dev-link.ps1` afterwards if more dev iteration is needed.)

---

### Task 12: Upstream tracking — watcher workflow, baseline marker, maintenance doc (LANE: KEEP — security_routed workflows)

**Files:**
- Create: `.github/workflows/upstream-watch.yml`, `docs/superpowers/UPSTREAM_BASELINE`, `docs/superpowers/MAINTENANCE.md`

**Interfaces:**
- Consumes: fork with Actions enabled (Task 11).
- Produces: weekly upstream check that opens a GitHub issue; the written merge/retirement procedures.

- [ ] **Step 1: Write the baseline marker** — `docs/superpowers/UPSTREAM_BASELINE`, exact content (single line, no trailing newline concerns — the workflow trims):

```
1.5.43
```

- [ ] **Step 2: Write `.github/workflows/upstream-watch.yml`** with exactly:

```yaml
name: Upstream Release Watch
on:
  schedule:
    - cron: '17 6 * * 1'
  workflow_dispatch:
jobs:
  check:
    runs-on: ubuntu-latest
    permissions:
      issues: write
      contents: read
    steps:
      - uses: actions/checkout@v6
        with:
          ref: v14
      - name: Compare upstream latest release to our baseline
        env:
          GH_TOKEN: ${{ github.token }}
        run: |
          LATEST=$(gh api repos/chrisk123999/chris-premades/releases/latest -q .tag_name)
          BASELINE=$(tr -d '[:space:]' < docs/superpowers/UPSTREAM_BASELINE)
          echo "upstream=$LATEST baseline=$BASELINE"
          if [ "$LATEST" != "$BASELINE" ]; then
            TITLE="Upstream release $LATEST available (fork baseline $BASELINE)"
            EXISTING=$(gh issue list --state open --search "in:title \"$LATEST\"" --json number --jq 'length')
            if [ "$EXISTING" = "0" ]; then
              gh issue create --title "$TITLE" --body "chrisk123999/chris-premades published **$LATEST**. Merge it into \`v14\` per docs/superpowers/MAINTENANCE.md, then update docs/superpowers/UPSTREAM_BASELINE."
            fi
          fi
```

- [ ] **Step 3: Write `docs/superpowers/MAINTENANCE.md`** with exactly:

```markdown
# Fork Maintenance

## When upstream ships a release (e.g. 1.5.44)

1. `git fetch upstream --tags`
2. `git checkout main && git merge --ff-only upstream/main && git push origin main`
3. `git checkout v14 && git merge 1.5.44` — resolve conflicts by reading both sides
   (our v14 API changes vs upstream's content changes); never resolve blindly.
4. `npm run build` — must compile.
5. Re-run the Task 9 smoke test, plus any macro named in the upstream release notes.
6. Update `docs/superpowers/UPSTREAM_BASELINE` to `1.5.44`, commit, push.
7. `gh release create 1.5.44-v14.1 --target v14 --title "1.5.44-v14.1" --notes "..."`
   (the -v14.N counter resets to 1 on each new upstream baseline)
8. Update the module on the server (it points at releases/latest).

## Fork-only fix release (no upstream change)

Bump N: e.g. `1.5.43-v14.2`. Same `gh release create` flow.

## Rollback

Foundry Setup -> install via the previous release's *versioned* manifest URL:
`https://github.com/<user>/chris-premades/releases/download/<tag>/module.json`

## Retirement (official CPR ships v14 support)

1. Full backup of server user data.
2. Uninstall the fork module; install official CPR from the Foundry package listing.
   Same module id (`chris-premades`) means settings and world data carry over.
3. Verify with the smoke test in the live world.
4. Archive the GitHub fork (`gh repo archive`), which also stops the watcher.
```

- [ ] **Step 4: Commit, push, set default branch, dry-run the watcher.** Scheduled workflows only run from the repo's default branch, so the fork's default must become `v14`  (`main` stays clean — a default-branch setting writes nothing to it):

```powershell
git add .github/workflows/upstream-watch.yml docs/superpowers/UPSTREAM_BASELINE docs/superpowers/MAINTENANCE.md
git commit -m "chore(v14): upstream release watcher + maintenance procedures"
git push origin v14
$me = gh api user -q .login
gh repo edit "$me/chris-premades" --default-branch v14
gh workflow run upstream-watch.yml --ref v14
gh run watch
```

Expected: manual `workflow_dispatch` run succeeds; since upstream latest (`1.5.43`) equals the baseline, **no issue is created** (check `gh issue list` — empty). That null result is the pass condition.

---

### Task 13: **[HUMAN-IN-LOOP]** Live server upgrade (LANE: KEEP)

**Files:**
- None in this repo. Live-server operation, gated on Task 10's exit bar + Task 11's verified release.

- [ ] **Step 1 [HUMAN]: Full backup** of the live v13 server's user-data folder (worlds, modules, config — the whole `Data` tree plus `Config`). Verify the backup exists and its size is plausible before anything else.
- [ ] **Step 2 [HUMAN]: Upgrade the server to Foundry v14** per foundryvtt.com instructions for its install type.
- [ ] **Step 3 [HUMAN]: Update the module stack**: dnd5e to 5.3.3+ (≤5.x), Midi-QOL to 14.x, DAE to 14.x; leave Socket Lib current; do not update times-up (it can remain installed-but-disabled). Companion stack (checked 2026-08-07): DDB Importer 7.4.x and DFreds Convenient Effects 9.2.x are v14-verified — update both. **Stack holdouts to re-check before upgrading**: Active Token Effects (ATE/ATL, v13 only — token-light cosmetics in 18 CPR macros degrade gracefully without it) and Active Auras (v13 only — unused by CPR, which has its own Region-based auras; only affects non-CPR imported item automations).
- [ ] **Step 4 [HUMAN]: Replace CPR**: uninstall official CPR, install the fork via `https://github.com/<user>/chris-premades/releases/latest/download/module.json` (same id — settings persist).
- [ ] **Step 5 [HUMAN]: Verify in the real world**: run the Task 9 smoke-test checklist against the live world (console clean, settings, compendia, one attack, one spell), plus one or two of the party's bread-and-butter automations.
- [ ] **Step 6 [HUMAN]: Rollback plan if it goes sideways**: restore the backup and reinstall Foundry v13 — the backup from Step 1 is the whole safety net, which is why Step 1 is verified, not assumed.

---

## Execution notes

- Tasks 1–2 are DONE. Tasks 3–8A run KEEP in-session in order; Task 8B goes through the Lanes pipeline (`/lanes-emit` this plan → worktree via `lanes-validate.mjs worktree create` → `lanes-implementer` → `lanes-reviewer` → merge on APPROVE) and only depends on Task 2, so it can dispatch any time. Task 9 blocks on Ken (licensed Foundry download, UI). Tasks 9–10 are an interactive loop. Tasks 11–12 are agent-executable once the exit bar is declared. Task 13 is Ken's, with the plan as checklist.
- `automation.level` is `manual` (no `automation` block in `.lanes/config.json`): every Lanes stage handoff is a human handoff for now.
- Commit style follows the repo's existing informal history; prefixes used here: `docs:`, `chore(v14):`, `port(v14):`, `fix(v14):`.
- If anything discovered mid-execution contradicts the audit or this plan (e.g. a fifth conflicting file, a v14 API the migration notes don't cover), update the audit doc in the same commit as the fix — the audit doc is the living record, the plan stays frozen.
