# Cauldron of Plentiful Resources — Personal v14 Fork: Design

**Date:** 2026-08-07
**Status:** Draft for review
**Final home:** `docs/superpowers/specs/2026-08-07-cpr-v14-port-design.md` in the fork repo (first commit on the `v14` branch)

## Goal

A personal fork of Cauldron of Plentiful Resources (CPR, `chris-premades`) that runs on Foundry VTT v14, installable on Ken's server via manifest URL, and kept current with upstream releases until the official module supports v14 — at which point the fork is retired and the server switches back to the official module.

This is a personal-use fork. No community support, no obligation to other users, no upstream PRs (though nothing prevents them later).

## Background

- **Upstream:** [chrisk123999/chris-premades](https://github.com/chrisk123999/chris-premades), MIT licensed, actively developed. Latest stable release **1.5.43** (2026-07-25). No v14 support yet. JavaScript, webpack build.
- **Existing port:** [TimRoesler/chris-premades-v14](https://github.com/TimRoesler/chris-premades-v14), a 7-commit fork porting **1.5.40** to v14 (region-backed templates, `system.changes` migration per dnd5e 5.3.3, roll-mode/canvas API updates, Time's Up demoted to recommended). MIT licensed, last updated 2026-07-10. **Unverified quality** — treated as a source of candidate patches to audit, not a trusted foundation.
- **Delta:** upstream moved only 3 bugfix releases (1.5.41–1.5.43) past the port's baseline; each touched a handful of macro files. The 2.x pre-release track (CAT animations, no automations) is out of scope.
- **Dependencies for v14:** dnd5e 5.3.3+, Midi-QOL 14.x, DAE 14.x, Socket Lib. Time's Up not needed on v14 (core handles effect expiry).

## Repo setup

- Fork `chrisk123999/chris-premades` on GitHub under Ken's account.
- Clone to **`F:\chris-premades`** (NTFS; N: is exFAT-over-USB and unsuitable for node_modules/git churn).
- Remotes: `origin` = Ken's fork, `upstream` = chrisk123999, `timport` = TimRoesler's fork.
- Branches: `main` tracks upstream untouched; all port work happens on **`v14`**, branched from the `1.5.43` tag.
- `module.json` on `v14`:
  - **id stays `chris-premades`** — drop-in replacement; world/item data and module settings carry over, and switching back to official later is a clean swap.
  - `manifest` and `download` URLs point at Ken's fork's GitHub releases.
  - Compatibility: `minimum: 13, verified: 14, maximum: 14`.
  - Version scheme **`1.5.43-v14.N`** (N = fork release counter) so fork versions never collide with official ones and the upstream baseline is always readable from the version string.
  - `times-up` moved from `requires` to `recommends` (pending audit confirmation).

## Phase 1 — Audit the existing port

Treat TimRoesler's port as a reviewable patch set, not trusted code.

1. Generate the full diff of his `main` against the `1.5.40` tag.
2. Review change-by-change against the official Foundry v13→v14 migration notes and dnd5e 5.3.3 release notes. Verdict per change: **adopt** / **rewrite** / **investigate**.
3. Record verdicts in `docs/superpowers/audits/2026-08-XX-timroesler-port-audit.md` — this doc becomes Phase 2's checklist.
4. Apply adopted changes onto `v14` (cherry-pick where clean, re-apply by hand where 1.5.41–1.5.43 conflict; every conflict resolved by reading the code, not by picking a side blindly). Rewrites are authored fresh. Attribution to the original port is preserved via git history/commit messages per MIT.
5. Confirm the project builds (webpack) at the end of the phase.

Fallback: if the audit shows the port is fundamentally unsound, discard it and port fresh using the audit notes as a map of what needs changing. The audit is cheap insurance either way.

## Phase 2 — Verify in a local v14 test world

Local Foundry v14 instance on Ken's PC (second install under the same license), throwaway world with dnd5e 5.3.3+, Midi-QOL 14.x, DAE 14.x, Socket Lib, and the built fork module.

1. **Smoke test:** module loads with no console errors; settings render; compendia open and unlock; one basic weapon attack and one basic damaging spell resolve correctly through Midi-QOL.
2. **Category sweep**, in risk order:
   - Templated/area spells (highest risk — measured templates became Regions in v14)
   - Aura and region-based effects
   - Summons
   - Class features (action economy, resources, third-party interactions)
   - Monster abilities
   Test representative macros per category; fix failures with our own commits (Tim's approach is reference, not gospel).
3. **Exit bar:** every spell, feature, and monster ability **actually used at Ken's table** works. Long-tail catalog macros are fixed lazily, if and when they surface in play. 100% catalog coverage is explicitly not the goal.

## Release & installation

- GitHub Actions workflow on the `v14` branch: build with webpack, zip the module, attach `module.json` + zip to a GitHub release. Reuse upstream's build/release workflow where one exists; otherwise standard Foundry module release action.
- Cut release `1.5.43-v14.1` once Phase 2's exit bar is met.
- **Server upgrade sequence:** full backup of the v13 server's user data → upgrade server to v14 → update dnd5e/Midi-QOL/DAE → install fork via manifest URL. The live server is not touched before the exit bar is met.

## Ongoing upstream tracking

- On each upstream stable release (1.5.44, …): `git merge <tag>` into `v14`, resolve conflicts, re-run smoke test plus any macros named in the release notes, cut `1.5.X-v14.1`.
- Notification: a small scheduled GitHub Action in the fork that checks upstream releases and opens an issue when a new tag appears (nice-to-have; manual checking is an acceptable start).
- **End of life:** when official CPR ships v14 support — back up, uninstall fork, install official from the Foundry package listing. Same module id makes this a settings-preserving swap. Archive the fork repo.

## Error handling & risk notes

- **Port is worse than it looks:** caught by Phase 1 audit + Phase 2 smoke test before any real-world exposure; fallback is a fresh port.
- **A macro breaks mid-session on the live server:** fork releases are versioned; the server can roll back to the previous fork release via manifest, and worst case the world still runs with the module disabled.
- **Upstream merge conflicts grow over time:** expected to stay small (upstream is in bugfix mode on 1.5.x); if upstream lands a big refactor, reassess whether tracking is still worth it vs. freezing.
- **Official v14 release uses different data conventions than our port:** mitigated by keeping the module id and by making no schema-level changes beyond what dnd5e 5.3.3 requires.

## Out of scope

- The 2.x / CAT animations pre-release track.
- Community distribution, support, or Foundry package listing.
- Upstream pull requests.
- Porting/testing macros not used at Ken's table (until they matter).
