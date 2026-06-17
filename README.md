# poi-plugin-kc-quest-audit

`poi-plugin-kc-quest-audit` is a [Poi](https://github.com/poooi/poi) plugin fork of [lawvs/poi-plugin-quest-2](https://github.com/lawvs/poi-plugin-quest-2).

This fork keeps the original quest browsing experience and upstream data pipeline, but adds a practical inventory-based audit layer for KanColle quests.

If the original plugin is a quest browser, this fork is a quest browser **plus** a conservative inventory checker and maintenance-time quest staging workflow.

In practice, it helps answer questions like:

- "Do I already have the ships for this quest?"
- "Which branch of this A/B composition requirement do I satisfy?"
- "What is still missing from my current imported inventory?"
- "How do I stage newly added quests locally before upstream data sources catch up?"

## What This Fork Is

This project is not a rewrite of `poi-plugin-quest-2`.

It is a fork that deliberately keeps:

- the original quest browser
- the existing translation and generated data pipeline
- the upstream `build/*` quest data model
- the original search, tags, and pre/post quest structure

On top of that, it adds local audit and maintenance tooling that the original plugin does not provide.

## What This Fork Adds

- Inventory-based quest requirement analysis against imported ship/equipment CSV data
- Quest card summaries such as `Actionable`, `Missing ships`, `Missing equipments`, and `No definitive data`
- Conservative parser-based fallback when no curated requirement rule exists
- Curated alternative requirement branches for quests with A/B composition paths
- A `Can accept` filter for quests currently listed by the game and not yet accepted
- Export of quest analysis as JSON
- Observed in-game quest snapshot export for maintenance-time quest discovery
- Auto-exported raw quest snapshots for lower-friction current quest-state refreshes
- Live sortie quest progress sidecar files for supported active sortie quests
- Optional experimental bridge that mirrors supported sidecar progress into Poi's native task panel
- Temporary local quest overlay support without editing generated upstream data
- A maintenance draft workflow for newly added quests before `api_no / gameId` is confirmed

## Installation

There are two practical installation paths.

### Option 1: Install from Poi's plugin GUI

If this package has been published to npm, install it directly from Poi:

1. Open Poi.
2. Go to the plugin manager.
3. Paste `poi-plugin-kc-quest-audit` into `Install from npm server`.
4. Install and reload Poi.

![Poi install field](https://user-images.githubusercontent.com/18554747/161830757-0a4e500c-f246-4dbd-820d-0b9a9c5a34a4.png)

### Option 2: Build from source and install the tarball locally

This is the safer path if you want to test the fork before it is published.

1. Clone this repository.
2. Install dependencies:

   ```sh
   npm install
   ```

3. Build a package tarball:

   ```sh
   npm pack
   ```

4. Install the generated `poi-plugin-kc-quest-audit-<version>.tgz` into Poi's plugin environment:

   ```sh
   cd ~/Library/Application\ Support/poi/plugins
   npm uninstall poi-plugin-kc-quest-audit
   npm install --save /path/to/poi-plugin-kc-quest-audit-<version>.tgz
   ```

5. Reload Poi or restart the app.

The uninstall step is intentional for local tarball upgrades. It avoids stale installed files when the tarball path or package manager cache would otherwise reuse an older package tree. After installing, `package.json` and `package-lock.json` in Poi's plugin directory should both point to the local tarball path, and `node_modules/poi-plugin-kc-quest-audit` should be a real package directory, not a symlink.

## Data Sources

This fork still relies on the same public quest data ecosystem as the upstream plugin:

- [kcanotify-gamedata](https://github.com/antest1/kcanotify-gamedata)
- [kc3-translations](https://github.com/KC3Kai/kc3-translations)
- [kcQuests](https://github.com/kcwikizh/kcQuests)

The goal is to stay compatible with that pipeline, not replace it with an unrelated local system.

## Requirement Analysis Model

The audit layer is intentionally conservative.

- Curated rules are preferred over parser inference.
- `Inferred` only means the plugin derived conditions directly from quest text.
- Wiki/manual rules that have already been turned into explicit requirement data are treated as curated, not inferred.
- Curated rules can now express alternative branches such as:
  - `Langley` flagship
  - or `CVL >= 2`
- `Can accept` and `Actionable` are intentionally separate:
  - `Can accept` means the game has listed the quest with the unaccepted state.
  - `Actionable` means the quest is currently available and the modeled inventory-side conditions look ready.

When a quest has explicit alternatives:

- satisfying any branch is enough for the inventory side of `Actionable`
- the UI can show which alternative branch matched
- if none match, the UI shows the closest branch instead of dumping every possible path at once

## Architecture Principles

This fork intentionally stays close to the original `poi-plugin-quest-2` structure.

- Generated quest data still comes from the existing upstream pipeline and `build/*`.
- Runtime quest overrides are only a temporary bridge when upstream data lags behind live maintenance.
- The overlay is not meant to become a second permanent translation or quest database.
- New maintenance-era quests should not enter runtime overlay until `api_no / gameId` is confirmed.

## Maintenance Workflow

When the game adds new quests and upstream sources are behind, this fork now uses a dual-track public draft:

- human-readable notes in [`docs/maintenance-2026-03-13-draft.md`](docs/maintenance-2026-03-13-draft.md)
- machine-readable staging data in [`docs/data/maintenance-2026-03-13-public.json`](docs/data/maintenance-2026-03-13-public.json)

That draft layer is for research and later promotion only. It is not imported by runtime code.

Once `api_no / gameId` is confirmed from Poi:

- move only the confirmed data into `src/questOverrides/data.ts`
- keep the rest in docs until it is safe to promote

For the full workflow, see [`docs/rapid-quest-update.md`](docs/rapid-quest-update.md).

## Raw Quest Snapshot Lane

The settings panel includes a separate raw quest snapshot export for account-visible questlist state.

- `Auto export raw quest snapshot` is enabled by default. When Poi observes a complete All-tab questlist response, the plugin writes a sanitized raw snapshot to the active export lane without a manual Settings export.
- `Export raw quest snapshot` opens a save dialog and defaults to the active export lane.
- `Export raw snapshot to archive` writes directly to the active export lane: `~/Documents/Mira-Workspace/archive/poi-inventory-exports/` when the archive root is available, otherwise `~/Documents/Mira-Workspace/local-fallback/poi-inventory-exports/`.
- Raw snapshot filenames use `kancolle_raw_quests_YYYYMMDD-HHMMSS.json`.
- Coverage records All-tab status and page status separately. Daily / Weekly / Monthly / Once / Others tabs are optional extra observations, not required for completeness.
- If a quest tab is visually checked and empty but no questlist API response is emitted, use the empty-tab marker before exporting.
- If no raw questlist page or empty-tab observation has been captured yet, export is blocked instead of writing an empty snapshot.
- After a quest-clear response, observed raw quest state is invalidated until Poi emits the next questlist response.

Raw snapshots answer `listed_now` and `accepted_now`; they do not replace the inventory-side quest analysis layer.

## Live Quest Progress

The plugin can also keep a lightweight local sidecar for supported live sortie progress.

- The sidecar is written as `kancolle_live_quest_progress_YYYYMMDD-HHMMSS.json` in the same active export lane used by raw quest snapshots.
- Only the latest auto-exported live progress sidecar is kept for that lane prefix.
- Supported sortie quests can be split into per-map counters such as `2-3 S 0 / 1`, `4-1 S 0 / 1`, or `1-6 terminal 0 / 1`.
- Poi's native quest records still take priority. The plugin only supplies missing records when the experimental bridge is enabled.
- The bridge is conservative: it does not click, accept, clear, or play quests, and it does not override native Poi quest progress records.

This feature is meant to make Poi's existing right-side task panel more useful for quests that Poi does not already enumerate in detail. It is still a best-effort helper, not an authoritative replacement for the game's own quest state.

## Current Limits

This plugin is an audit aid, not a full authoritative quest solver.

- It mainly judges inventory and composition-side conditions.
- Dynamic progress conditions such as sortie counts, map clears, victory ranks, and many battle-side conditions are only supported for the subset of quests that the live progress parser can safely model.
- `Actionable` means the quest is currently listed by the game and the currently imported inventory appears to satisfy the modeled inventory conditions. It does not guarantee the quest is fully completable in-game.
- `Can accept` depends on observed in-game questlist pages. If not all quest tabs have been visited, the list can still be partial.
- `No definitive data` means quest data exists, but the plugin does not yet have enough structured requirement data to judge it safely.

For more detail, see [`docs/quest-audit-limitations.md`](docs/quest-audit-limitations.md).

## Publish

Versioning rule for this fork:

- Any functional change, UI change, behavior change, data-model change, or packaging change must bump `package.json`.
- This includes local tarball installs used for Poi testing.
- Pure docs-only changes may skip the version bump.

Release flow:

1. `npm install`
2. `npm run build`
3. `npm test -- --runInBand`
4. `npm publish --access public`

## Development

```sh
npm install
npm run build
npm run storybook
```

## Thanks

- [poi](https://github.com/poooi/poi)
- [plugin-quest](https://github.com/poooi/plugin-quest)
- [lawvs/poi-plugin-quest-2](https://github.com/lawvs/poi-plugin-quest-2)
- [kcanotify-gamedata](https://github.com/antest1/kcanotify-gamedata)
- [kcQuests](https://github.com/kcwikizh/kcQuests)
- [舰娘百科](https://zh.kcwiki.cn/wiki/%E8%88%B0%E5%A8%98%E7%99%BE%E7%A7%91)
- [poi-plugin-tabex](https://github.com/momocow/poi-plugin-tabex)

## License

MIT
