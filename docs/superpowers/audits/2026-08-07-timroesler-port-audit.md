# TimRoesler v14 Port — Audit

**Baseline:** upstream 1.5.40 (his commit 8096badd) → target: our v14 branch at 1.5.43
**Verdicts:** ADOPT (take as-is) / REWRITE (concept right, code replaced by ours) /
INVESTIGATE (unclear — resolved to ADOPT or REWRITE before Task 6 ends) / SKIP (not taken)

**Baseline integrity (checked 2026-08-07):** `git diff 1.5.40..8096badd` is NOT empty, but
both deviations are benign: `lang/it.json` differs in line endings only
(`--ignore-cr-at-eol` diff is empty) and `module-template.json` differs in file mode only
(100755 → 100644). No content drift — his baseline is trustworthy as a 1.5.40 import.

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
