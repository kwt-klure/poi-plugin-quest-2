# 2026-04-07 Maintenance Quest Draft

This document tracks the quests added around the 2026-04-07 maintenance window.

It is the human-readable half of the maintenance draft layer for this wave:

- this markdown file for source notes and promotion status
- `docs/data/maintenance-2026-04-07-public.json` for machine-readable staging

Important:

- This is **not** runtime data by itself.
- Do **not** add entries to `src/questOverrides/data.ts` until `api_no` / `gameId` is confirmed.
- Long-term quest text should still come from the upstream generated data pipeline once it catches up.

## Source status on 2026-04-08

As of 2026-04-08:

- `kcQuests` and `kcanotify-gamedata` still do **not** include the four new 2026-04-07 spring sortie / first-strike tasks.
- `Cs3` (`春季大演習`) is already present in upstream generated data and does **not** need a local overlay.
- The public latest-quest pages are good enough to stage:
  - Japanese quest names
  - Japanese quest text where exposed
  - public reward choices
  - some prerequisite / route notes
- The main blocker for runtime overlay remains unchanged:
  - no confirmed `api_no` / `gameId` for the four newly added April sortie tasks

## Current wave summary

This wave currently includes five public-facing entries of interest:

1. `【春限定】春の近海哨戒お散歩！2026`
2. `【春限定】続：春のお散歩哨戒です！`
3. `【第一遊撃部隊任務】出撃準備を実施せよ！`
4. `【第一遊撃部隊任務】南西諸島防衛戦に出撃！`
5. `Cs3 春季大演習`

Only `Cs3` is safe for runtime identification today, because:

- code is public
- `gameId = 315` is already known in existing generated data
- upstream already contains the correct current seasonal exercise text

The other four entries stay in draft only for now.

## Draft promotion rule for this wave

### Safe to keep in draft only

The following entries remain draft-only until ids are confirmed:

- `【春限定】春の近海哨戒お散歩！2026`
- `【春限定】続：春のお散歩哨戒です！`
- `【第一遊撃部隊任務】出撃準備を実施せよ！`
- `【第一遊撃部隊任務】南西諸島防衛戦に出撃！`

Reason:

- public pages currently expose text/rewards/notes
- but do not safely expose confirmed `api_no` / `gameId`

### Do not add overlay just because text is available

For this wave, the correct behavior is:

- keep the four April sortie tasks in draft docs / draft JSON
- wait for Poi export or in-game observation to confirm ids
- promote only confirmed entries into `src/questOverrides/data.ts`

## Sources used for this draft

- Chinese latest-quest page:
  - <https://zh.kcwiki.cn/wiki/任务/最新任务>
- Japanese quest list / mission front page:
  - <https://wikiwiki.jp/kancolle/任務>

For this wave:

- Chinese page is useful for public reward tables and some note formatting
- Japanese quest list is useful to confirm that `Cs3` is the current seasonal exercise code

## What to do next

To promote any of the four April sortie tasks into runtime overlay:

1. Reload `KC Quest Audit` in Poi
2. Visit the quest tabs that contain the new tasks
3. Export quest analysis JSON
4. Inspect:
   - `gameQuestSnapshot.observedQuestList`
   - `gameQuestSnapshot.unknownObservedQuests`
5. Once `api_no` / `gameId` is confirmed for an entry:
   - update `docs/data/maintenance-2026-04-07-public.json`
   - set `overlayReady: true`
   - add only that confirmed entry to `src/questOverrides/data.ts`

## Cleanup rule

Once upstream catches up for the 2026-04-07 wave:

- remove any temporary overlay entries added for this wave
- keep this file only as maintenance context if still useful
- archive or delete the corresponding public draft JSON if it is no longer needed
