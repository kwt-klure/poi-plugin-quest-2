# poi-plugin-kc-quest-audit

`poi-plugin-kc-quest-audit` is a [Poi](https://github.com/poooi/poi) plugin fork of [lawvs/poi-plugin-quest-2](https://github.com/lawvs/poi-plugin-quest-2).

This fork keeps the original quest browsing experience and upstream data pipeline, but adds a practical inventory-based audit layer for KanColle quests.

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
- Quest card summaries such as `Ready`, `Missing ships`, `Missing equipments`, and `No definitive data`
- Conservative parser-based fallback when no curated requirement rule exists
- Curated alternative requirement branches for quests with A/B composition paths
- Export of quest analysis as JSON
- Observed in-game quest snapshot export for maintenance-time quest discovery
- Temporary local quest overlay support without editing generated upstream data
- A maintenance draft workflow for newly added quests before `api_no / gameId` is confirmed

## Installation

If this package has been published to npm, install it from Poi's plugin GUI.

1. Open Poi.
2. Go to the plugin manager.
3. Paste `poi-plugin-kc-quest-audit` into `Install from npm server`.
4. Install and reload Poi.

![Poi install field](https://user-images.githubusercontent.com/18554747/161830757-0a4e500c-f246-4dbd-820d-0b9a9c5a34a4.png)

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

When a quest has explicit alternatives:

- satisfying any branch is enough for `Ready`
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

## Current Limits

This plugin is an audit aid, not a full authoritative quest solver.

- It mainly judges inventory and composition-side conditions.
- Dynamic progress conditions such as sortie counts, map clears, victory ranks, and many battle-side conditions are still not fully audited.
- `Ready` means the currently imported inventory appears to satisfy the modeled inventory conditions. It does not guarantee the quest is fully completable in-game.
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
