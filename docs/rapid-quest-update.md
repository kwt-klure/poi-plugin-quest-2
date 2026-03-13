# Rapid Quest Update Workflow

This document explains how to update `KC Quest Audit` quickly when KanColle adds new quests, while still preserving the original `poi-plugin-quest-2` architecture.

## Core rule

Do **not** replace the original quest data pipeline.

Keep these as the primary sources of truth:

- `kcQuests`
- `kcanotify-gamedata`
- the generated `build/*` data

The local overlay exists only as a short-term bridge when upstream data sources are behind live maintenance.

## Architecture policy

When rushing a new quest update:

- keep `scripts/downloadKcQuestsData.ts`
- keep `scripts/downloadKcanotifyGamedata.ts`
- keep `scripts/genQuestData.ts`
- keep `build/*` as generated data
- put temporary local quest patches only in `src/questOverrides/data.ts`

Do not hard-edit generated files in `build/*` just to rush a quest update.

## Translation policy

Keep the original translation model.

- Normal quest translations should continue to come from upstream quest data sources.
- The overlay is not meant to become a second permanent translation system.
- When temporary text is needed before upstream updates:
  - prefer `byDataSource` entries in `src/questOverrides/data.ts`
  - avoid inventing full multi-language text unless there is a reliable source
  - do not replace existing upstream translations with ad-hoc local rewrites

The goal is to keep compatibility with the original plugin structure, not to fork the whole translation workflow.

## Fast path decision tree

For a concrete maintenance-era working example, see:

- `docs/maintenance-2026-03-13-draft.md`

### Case 1: upstream has already updated

Use the normal pipeline.

1. Check `kcQuests` and `kcanotify-gamedata` remote versions.
2. If they already include the new quests, run:
   - `npm run update`
3. Validate:
   - `npm run typeCheck`
   - `npm test -- --runInBand --roots src/__tests__ --testPathIgnorePatterns github-fork`
4. If the quest data looks correct in Poi, no overlay is needed.

### Case 2: upstream has not updated yet

Use the overlay as a temporary bridge.

1. Collect a reliable quest list from wiki / maintenance notes / community discovery.
2. Confirm each quest's `api_no` / `gameId` from Poi.
3. Add only confirmed data to `src/questOverrides/data.ts`.
4. Re-run validation.
5. Once upstream catches up, remove the temporary overlay entries.

## How to collect `api_no` / `gameId`

Use Poi, not guesswork.

1. Open Poi and reload `KC Quest Audit`.
2. Visit the quest tabs that may contain the newly added quests.
3. Open plugin settings.
4. Click `Export quest analysis`.
5. Inspect the exported JSON fields:
   - `gameQuestSnapshot.observedQuestList`
   - `gameQuestSnapshot.unknownObservedQuests`

`unknownObservedQuests` is the main list for newly discovered quests that are not yet in the known quest dataset.

Important:

- `currentTabQuestList` only reflects the currently viewed quest response.
- `observedQuestList` is the accumulated set of quests observed across viewed tabs and is the safer source for new quest discovery.

## What to put in the overlay

Edit:

- `src/questOverrides/data.ts`

Available sections:

- `quests`
  - temporary `code / name / desc / rewards / memo2 / pre`
- `questCodeMap`
  - confirmed quest code to `gameId`
- `prePostQuest`
  - only confirmed chains
- `newQuestIds`
  - quests that should show up as `New`
- `questCategory`
  - only confirmed periodic category membership

## Overlay data rules

Use strict confirmation rules:

- Add a quest only if `gameId` is confirmed.
- If pre-quest chains are not confirmed, leave them empty.
- If category is not confirmed, do not guess.
- If reward text is not confirmed, omit it.
- If translation is not confirmed, do not fabricate a polished final translation.

The overlay should be minimal, reversible, and clearly temporary.

## Validation checklist

After any rushed quest update:

1. `npm run typeCheck`
2. `npm test -- --runInBand --roots src/__tests__ --testPathIgnorePatterns github-fork`
3. Optional packaging check:
   - `npm pack --dry-run`
4. Install or reload in Poi
5. Verify:
   - the new quests appear
   - search works
   - category tags still work
   - pre/post links do not show guessed garbage

## Cleanup after upstream catches up

When upstream data sources finally include the new quests:

1. Compare upstream quest text and metadata against the overlay.
2. Remove the corresponding entries from `src/questOverrides/data.ts`.
3. Keep the original generated data as the long-term source again.

The overlay should shrink over time, not grow forever.
