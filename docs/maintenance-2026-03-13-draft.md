# 2026-03-13 Maintenance Quest Draft

This document tracks the quests added around the 2026-03-13 maintenance window.

It now works as the human-readable half of a **dual-track draft layer**:

- this markdown file for narrative context and source notes
- `docs/data/maintenance-2026-03-13-public.json` for machine-readable public data

Important:

- Neither file is runtime data.
- Do **not** copy entries into `src/questOverrides/data.ts` until `api_no` / `gameId` is confirmed.
- Long-term quest text and translations should still come from the original upstream pipeline once it catches up.

## Source status on 2026-03-16

As of 2026-03-16:

- `kcQuests` is still behind this maintenance wave.
- `kcanotify-gamedata` is still behind this maintenance wave.
- the Chinese latest-quest page is now updated enough to support a public draft
- public sources still do **not** provide a safe, confirmed `api_no` / `gameId` list

More specifically:

- the `kcQuests` public JSON still does not include the exact quest names from this 2026-03-13 wave
- the Chinese latest-quest page now exposes quest codes, names, conditions, rewards, and some notes/prerequisites for several of the new entries
- the Japanese quest front page remains useful as a cross-check, especially for entries that are still incomplete on the Chinese side

## Public draft artifacts

For this maintenance wave we keep both:

- `docs/maintenance-2026-03-13-draft.md`
- `docs/data/maintenance-2026-03-13-public.json`

The JSON draft is keyed by quest code and exists only to make later promotion easier once internal ids are known.

Current quests tracked there:

1. `2603B4` `【WD限定任務】軽空母、出撃！2026`
2. `2603B5` `【期間限定任務】春の旗艦は……私だからっ！`
3. `2603D1` `【期間限定:拡張任務】水雷戦隊遠征作戦！`
4. `2603G2` `【期間限定:拡張任務】夕雲型改装任務！`
5. `F142` `【工廠任務】水雷戦隊新改装艦、改装準備！`
6. `B215` `三十二駆「玉波改二」、出撃いたします。`

## What the public sources are good for now

Public sources are now good enough to draft:

- quest code
- Japanese and Chinese quest names
- quest text
- public reward text when already listed
- known prerequisite notes when already listed
- curated requirement drafts for obvious inventory / composition checks

Public sources are **not** yet good enough to activate runtime overlay entries, because we still lack:

- confirmed `api_no`
- confirmed `gameId`
- confirmed overlay-safe quest map entries

## Current interpretation rule

When a wiki page has already turned quest text into clear requirement notes, we treat that as a **curated draft source**, not as parser inference.

Example:

- `2603B4`
  - `Langley` flagship
  - **or** any flagship with `CVL >= 2`

That kind of A/B condition belongs in curated draft data and should not be marked as `推測` once it is manually formalized.

At the same time, we still distinguish between:

- conditions the plugin can check now
- conditions that remain documented as notes only

For example, sortie map order, boss count, and S-rank progress can be written into notes without pretending they are already auto-checked.

## What is still blocked

The blocker for runtime overlay remains unchanged:

- no confirmed `api_no` / `gameId`

Without those ids, this draft layer is intentionally **not** promoted into:

- `src/questOverrides/data.ts`

## Recommended next step

Use Poi export to gather internal ids:

1. Reload `KC Quest Audit`
2. Visit the quest tabs that may contain the new quests
3. Export quest analysis JSON
4. Inspect:
   - `gameQuestSnapshot.observedQuestList`
   - `gameQuestSnapshot.unknownObservedQuests`

Once a quest appears there with a confirmed `api_no`, move only the confirmed data into:

- `src/questOverrides/data.ts`

## Cleanup rule

This draft layer is temporary working context.

Once upstream quest sources catch up and the local overlay is no longer needed:

- remove temporary overlay entries from `src/questOverrides/data.ts`
- keep `docs/maintenance-2026-03-13-draft.md` only as maintenance notes if still useful
- archive or delete `docs/data/maintenance-2026-03-13-public.json` if it no longer serves a maintenance handoff purpose
