# 2026-03-13 Maintenance Quest Draft

This document is a working draft for the quests added around the 2026-03-13 maintenance window.

It exists to help us prepare a local overlay **without** replacing the original `poi-plugin-quest-2` quest data pipeline.

Important:

- This file is **not** runtime data.
- Do **not** copy entries from here into `src/questOverrides/data.ts` until `api_no` / `gameId` is confirmed.
- Translation and long-term quest text should still come from the original upstream quest sources once they catch up.

## Source status on 2026-03-14

As of 2026-03-14:

- `kcQuests` is still behind this maintenance update.
- `kcanotify-gamedata` is still behind this maintenance update.
- the Chinese latest-quest page is not fully updated for this wave yet.
- Japanese wiki sources are partially updated and are currently the best public reference.

More specifically:

- the `kcQuests` main branch is still at the 2026-03-08 refresh point
- `quests-scn-new.json` does contain some newer high-id quests, but not the specific names we are tracking for this 2026-03-13 maintenance wave
- this means we should not assume that "new quest data exists in kcQuests" automatically means "this wave is already covered"

## Public source summary

### Maintenance notice

The Japanese maintenance notice confirms that at least one White Day limited-time quest was added:

- `〖White Day〗特別任務x1の期間限定実装`
- described there as a `軽空母` White Day sortie quest

Reference:

- [wikiwiki maintenance notice](https://wikiwiki.jp/kancolle/%E6%83%85%E5%A0%B1%E5%80%89%E5%BA%AB/%E9%81%8B%E5%96%B6%E9%8E%AE%E5%AE%88%E5%BA%9C%E3%81%8B%E3%82%89%E3%81%AE%E3%81%8A%E7%9F%A5%E3%82%89%E3%81%9B/2025)

### Community-observed quest names

The Japanese quest front page currently appears to contain player-observed names for several quests from this maintenance wave.

Reference:

- [wikiwiki quest front page](https://wikiwiki.jp/kancolle/%E4%BB%BB%E5%8B%99/%E3%83%95%E3%83%AD%E3%83%B3%E3%83%88%E3%83%9A%E3%83%BC%E3%82%B8)

At the time of writing, the following quest names are worth tracking:

1. `〖WD限定任務〗軽空母、出撃！2026`
   - confidence: medium
   - source: maintenance notice + wiki/community references
   - current status: likely real and likely limited-time

2. `〖期間限定任務〗春の旗艦は……私だからっ！`
   - confidence: medium
   - source: wiki/community reference
   - current status: name observed, internal id not confirmed

3. `〖期間限定:拡張任務〗水雷戦隊遠征作戦！`
   - confidence: medium
   - source: wiki/community reference
   - current status: name observed, internal id not confirmed

4. `〖期間限定:拡張任務〗夕雲型改装任務！`
   - confidence: medium
   - source: wiki/community reference
   - current status: name observed, internal id not confirmed

5. `〖工廠任務〗水雷戦隊新改装艦、改装準備！`
   - confidence: medium
   - source: wiki/community reference
   - current status: name observed, internal id not confirmed

6. `三十二駆「玉波改二」、出撃いたします。`
   - confidence: medium
   - source: wiki/community reference
   - current status: name observed, internal id not confirmed

## What we checked and what it means

### `kcQuests`

We checked the public `kcQuests` quest JSON directly.

Current conclusion:

- it already contains some newer quests related to the `三十二駆` line
- however, it still does **not** contain the specific quest names we are currently tracking from the 2026-03-13 wave
- because of that, we should treat `kcQuests` as **not yet caught up for this specific update**

This is an important distinction:

- "some newer quests exist" is not enough
- "the exact quest names from this maintenance wave are present" is the real threshold

### Chinese latest-quest page

We also checked the Chinese latest-quest page.

Current conclusion:

- it does not yet expose a complete 2026-03-13 section for this wave
- it is not currently sufficient as the sole source for overlay data

### Japanese wiki pages

The Japanese side is currently the most useful public reference, but still only partially ready.

Current conclusion:

- maintenance notes confirm at least one White Day limited-time quest
- community-facing quest pages suggest multiple quests were added
- but public pages still do not give us a clean, confirmed `api_no` / `gameId` list
- therefore they are good for a tracking draft, but not yet good enough for direct overlay input

## What is still missing

For overlay use, we still need at least:

- confirmed `api_no` / `gameId`
- confirmed quest code
- confirmed quest category or periodic type, if applicable
- confirmed `pre` / `post` chain if we want to show it
- confirmed reward text if we want to display it before upstream catches up

In practice, the first missing item is the blocker:

- without confirmed `api_no` / `gameId`, we cannot safely insert runtime overlay data while preserving the original quest architecture

Right now this draft is **not** enough to safely populate `src/questOverrides/data.ts`.

## Recommended next step

Use Poi export to gather the internal ids:

1. Reload `KC Quest Audit`
2. Visit the tabs that may contain the new quests
3. Export quest analysis JSON
4. Inspect:
   - `gameQuestSnapshot.observedQuestList`
   - `gameQuestSnapshot.unknownObservedQuests`

Once a quest appears there with a confirmed `api_no`, move only the confirmed data into:

- `src/questOverrides/data.ts`

## Cleanup rule

This draft is temporary working context.

Once upstream quest sources catch up and the local overlay is no longer needed:

- remove any temporary overlay entries
- keep the original quest pipeline as the long-term source of truth
