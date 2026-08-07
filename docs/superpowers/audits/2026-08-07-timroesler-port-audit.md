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

Reviewed 2026-08-07 against the confirmed v14 migration facts: MeasuredTemplates absorbed
into Scene Regions (`flags.core.MeasuredTemplate`-backed Regions, Region document hooks,
`canvas.regions.placeRegion`); dnd5e 5.3.x is the v13+v14 compat line (AE roll-mode fix);
core `rollMode` setting renamed `messageMode` on v14; core `gridTemplates` setting removed.
Every change below is version-guarded (`game.release.generation` checks) — v13 code paths
are preserved intact, consistent with manifest `minimum: "13"`. **Dual-version support is
CONFIRMED as the design: do NOT drop v13 paths in Task 6** (resolves Task 4 Step 3's
guard-or-drop question: guard).

Missed-callsite greps over Tim's full tree (sufficiency check): zero raw
`settings.get('core','rollMode')` reads remain; all remaining `scene/canvas.templates`
reads are version-guarded or optional-chained; all `gridTemplates` reads are wrapped in
`settings.has` guards. No missed callsites found.

| File | Change summary | Verdict | Notes |
|---|---|---|---|
| lib/utilities/templateUtils.js | +102-line abstraction: `resolveTemplate` (v14 compat-proxy → backing Region), `isRegionTemplate`, `getSceneTemplates`, geometry accessors (`getTemplatePosition/Distance/Width/Radius/Ray/Center`), `moveTemplate`/`copyTemplatePlacement` via shape shifting, elevation-aware `testRegionTemplatePoint` (1px tolerance for parity), multi-polygon `overlap` | ADOPT | Centerpiece; well-made. Region calls (`rayIntersectsRegion`, `getIntersections`) bind to functions that already existed in upstream regionUtils (pre-v14 aura support) — verified exported. `getTemplatePosition` uses first polygon point for point-shapes (heuristic; fine for CPR's generated shapes) |
| lib/utilities/regionUtils.js | adds `rayToRegionShape` (rectangle polygon around a ray segment) | ADOPT | Clean geometry; consumed by line-template macros |
| lib/utilities/effectUtils.js | `getChanges`/`setChanges`/`changesUpdateData`/`normalizeChanges` dual-path helpers; `normalizeChanges` called in create paths; convention: legacy top-level `changes` key wins over `system.changes` in mixed payloads | ADOPT | Design assumption: v14/dnd5e creation-time shim migrates legacy `changes` creation payloads (macros still assign `effectData.changes = [...]` in ~12 files). Directly exercised by Phase 2 smoke test step 5 (Guidance) — if that passes, assumption holds |
| lib/utilities/genericUtils.js | `update()` rewrites legacy `{changes}` payloads to `{system:{changes}}` on v14; `createEmbeddedDocuments` normalizes mixed payloads and maps created MeasuredTemplates → backing Regions; `deleteEmbeddedDocuments` retargets type `MeasuredTemplate`→`Region` on v14 (shared ids); adds `getCoreRollMode()` (`messageMode` on v14) | ADOPT | The delete retarget relies on template/Region id sharing — same assumption as `resolveTemplate`, consistent |
| events/template.js | adds `createRegionTemplate`/`updateRegionTemplate`/`deleteRegionTemplate` handlers filtering on `flags.core.MeasuredTemplate`, delegating to existing template logic | ADOPT | Move detection reads `chris-premades.oldPosition` set by the paired preUpdate hook — wiring verified consistent |
| hooks.js | version-guarded hook registration: Region document hooks on v14, MeasuredTemplate hooks on v13 | ADOPT | Registration split is exhaustive for template hooks (pre/create/update/delete all covered) |
| extensions/attach.js | Region-aware attachment moves (shape shifting, no top-level x/y) | ADOPT | Also fixes a real pre-existing bug: `setFlag(document,…)` referenced the wrong variable (browser global); corrected to `entity`. Behavior fix beyond porting — keep |
| extensions/template.js | adds `preCreateRegionTemplate`/`preUpdateRegionTemplate` (flag-filtered, delegate/record oldPosition) | ADOPT | Pairs with events/template.js + hooks.js |
| extensions/selectTool.js | drops the templates layer on v14 (layer no longer exists), guards layer lookups, namespaces `AmbientLight` under `foundry.canvas.placeables` | ADOPT | Defensive guards (`?.tools`, layer existence) are correct for both versions |
| extensions/tokens.js | `effect.changes` reads → `getChanges()` | ADOPT | Subtle semantic delta in `preCreateUpdateActiveEffect`: an update explicitly emptying `changes` now falls back to the effect's changes (original used the empty update array). Only affects size-animation bookkeeping — harmless; noted for completeness |
| extensions/effects.js, extensions/conditions.js | `changes` reads/writes → `getChanges()`/`changesUpdateData()` | ADOPT | Mechanical, faithful |
| applications/medkit-effect.js | `changes` reads → `getChanges()` | ADOPT | INVESTIGATE resolved 2026-08-07: the `getChanges(effectData).push(…)` callsite's `effectData` is always `duplicate(this.effectDocument.toObject())` (line ~364) — an existing effect's data always carries a changes array (top-level on v13, `system.changes` on v14), so the push lands on the real array. No hardening needed |
| applications/troubleshooter.js | template count version-guarded via region filter | ADOPT | Cosmetic diagnostic |
| lib/crosshairs.js | `loadTexture` → `foundry.canvas.loadTexture`; `canvas.templates` optional-chained; removed-setting guard for `gridTemplates` | ADOPT | Crosshairs still extends `foundry.canvas.placeables.MeasuredTemplate` for the PREVIEW workflow only — placement result is resolved to a Region via `placeTemplate`'s `resolveTemplate`; acceptable on v14 as long as the class remains constructible (smoke-test covered: every templated spell exercises it) |
| events/{abilityCheck,abilitySave,skillCheck,toolCheck,combat}.js | `settings.get('core','rollMode')` → `genericUtils.getCoreRollMode()` | ADOPT | Pattern: rollMode swap (5 files, verified 1-line each) |
| events/{effects,movement}.js, lib/utilities/{actorUtils,itemUtils}.js | `effect.changes` → `getChanges()`; `scene.templates` → `getSceneTemplates()` | ADOPT | Pattern members, faithful |
| lib/utilities/crosshairUtils.js | removed-setting guards (`gridTemplates`/`gridDiagonals` via `settings.has`) | ADOPT | Pattern member |

## Macro changes (Task 5)

Reviewed 2026-08-07. The ~87 macro diffs decompose into four mechanical patterns plus
individually-read one-offs. Each pattern audited once against the migration facts, with
≥5 member files spot-checked for faithful application.

| Pattern / file | Change summary | Verdict | Notes |
|---|---|---|---|
| Pattern A: rollMode swap | `game.settings.get('core','rollMode')` → `genericUtils.getCoreRollMode()` | ADOPT | Spot-checked (7): heroicInspiration (2024), metamagic, plus the 5 events files (abilityCheck, abilitySave, skillCheck, toolCheck, combat) — faithful swaps. Tree-wide grep confirms zero raw reads remain |
| Pattern B: changes access | `effect.changes`/`effectData.changes` reads → `effectUtils.getChanges()` | ADOPT | Spot-checked (8): spiritTotem, rage (2014+2024), bless, hexWarrior, enlargeReduce, bardicInspiration (2024), hex (2024). All pushes/reads route through `getChanges` on data that provably carries a changes array; legacy creation payloads (`effectData.changes = [...]`) deliberately retained per the legacy-key-wins convention — verified by Phase 2 smoke test |
| Pattern C: template accessors | `template.x/y`, `template.object.{shape,ray,center}`, `scene.templates`, raw x/y updates → `templateUtils.getTemplatePosition/getTemplateCenter/getTemplateRay/containsPoint/moveTemplate/copyTemplatePlacement/getSceneTemplates`; `getIntersections` now takes the document | ADOPT | Spot-checked (9): moonbeam, darkness, fogCloud, spikeGrowth, callLightning, dawn, gustOfWind (2014), sleetStorm + hungerOfHadar (2024). `wallOfFire.js` (+39/−50, the largest) read IN FULL: same pattern applied densely with hoisted locals — not a logic rewrite. (Removed-setting guards for `gridTemplates`/`gridDiagonals` live only in the two crosshair infrastructure files — no macro members; see infrastructure table) |
| One-off: relentlessEndurance.js | missing semicolon fix (commit cbffb219) | ADOPT | Matches the exact pre-existing eslint error confirmed in this repo (`npx eslint scripts` → 1 error, this line) |

## Metadata changes (Task 5)

| File | Change summary | Verdict | Notes |
|---|---|---|---|
| module-template.json | compatibility `13/13/13` → `13/14/14`; dnd5e minimum `5.2.5` → `5.3.3`; times-up moved `requires` → `recommends` with reason string | ADOPT | Matches spec exactly; dnd5e 5.3.x confirmed as the v13+v14 compat line. Tim's URL changes (commit 42dfa622) are SKIPPED — plan Task 7 sets our fork's URLs instead |
| module-dev.json | same compat/dnd5e/…changes minus manifest handling | ADOPT | Note: Tim did NOT move times-up to recommends in module-dev.json (kept `requires`) — inconsistent with module-template.json. Harmless for dev use; Task 7 Step 2 verification will align it |

## Commit dispositions (final)

| Commit | Disposition |
|---|---|
| a038213d | ADOPT (cherry-pick; conflicts resolved per recipes below) |
| cbffb219 | ADOPT (cherry-pick) |
| f9771dc5 | ADOPT (cherry-pick) |
| 6999133f | ADOPT (cherry-pick) |
| 42dfa622 | SKIP — superseded by our fork identity (plan Task 7) |
| 9e7e68e0 | SKIP — superseded by our docs (plan Task 7) |

No REWRITE verdicts; no unresolved INVESTIGATE. The fallback (fresh port) is not needed.

## Expected conflicts vs 1.5.43 — resolution recipes

- `scripts/macros/2014/classFeatures/druid/circleOfTheShepard/spiritTotem.js` — upstream
  (1.5.41–43) removed the `statuses: ['ethereal'],` line in `use()`; Tim swapped two
  `effectData.changes.push` → `effectUtils.getChanges(effectData).push` in `create()`.
  Non-overlapping. **Merged result: 1.5.43 text (no statuses line) + Tim's two getChanges
  swaps.** (The push targets a literal `changes` array built in the same function — safe.)
- `scripts/macros/2024/mechanics/heroicInspiration.js` — upstream changed the
  `dialogUtils.selectDie` call wording (`Dialog.UseAttack` + attackTotal) on the lines
  adjacent to Tim's rollMode swaps in both `attack()` and `damage()`. **Merged result:
  1.5.43 dialog text + Tim's `genericUtils.getCoreRollMode()` in both functions.**

## Phase 2 findings (Task 10)

| Date | Macro | Symptom | Fix commit |
|---|---|---|---|
