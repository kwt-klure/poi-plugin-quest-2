# poi-plugin-kc-quest-audit

`poi-plugin-kc-quest-audit` is a [poi](https://github.com/poooi/poi) plugin fork based on [lawvs/poi-plugin-quest-2](https://github.com/lawvs/poi-plugin-quest-2). It keeps the original quest browsing experience and adds inventory-based requirement comparison for KanColle quests.

Data is maintained by [kcanotify-gamedata](https://github.com/antest1/kcanotify-gamedata), [kc3-translations](https://github.com/KC3Kai/kc3-translations), and [kcQuests](https://github.com/kcwikizh/kcQuests).

<img width="700" alt="demo" src="https://user-images.githubusercontent.com/18554747/196052461-97d36ffe-8be4-4618-80ed-459e97085454.png">

## Installation

This package is meant to be installed through Poi's plugin GUI after it has been published to npm.

Paste `poi-plugin-kc-quest-audit` in Poi's `Install from npm server` field and click the install button.

![image](https://user-images.githubusercontent.com/18554747/161830757-0a4e500c-f246-4dbd-820d-0b9a9c5a34a4.png)

## Features

- Translated quest info (English/Simplified Chinese/Traditional Chinese/Korean).
- Task panel translation.
- Quest search and filter.
- Sync with game quest data.
- Auto switch to quest tab when enter quest views.
- Export quest analysis to a JSON file.
- Compare modeled quest requirements against current owned ships and equipments.
- Show `ready`, `missing ships`, `missing equipments`, and `not modeled` summaries on quest cards.

## Architecture Principles

This fork intentionally stays close to the original `poi-plugin-quest-2` structure.

- Quest browsing, translations, search, filters, pre/post chains, and the main quest data flow still follow the original plugin architecture.
- Generated quest data still comes from the existing upstream data sources and `build/*` pipeline.
- Local quest overrides are only a temporary bridge for newly added quests when upstream sources lag behind live maintenance.
- The overlay is not intended to replace the original translation pipeline.

For the maintenance workflow used when the game adds new quests, see [`docs/rapid-quest-update.md`](docs/rapid-quest-update.md).

## Current Limits

The inventory audit is helpful, but it is not a full authoritative quest solver yet.

- It only judges inventory-related conditions that are either manually modeled or safely inferred from quest text.
- It does not fully understand every quest, every fleet alias, every historical composition name, or every special exception.
- Dynamic progress conditions such as sortie counts, map clears, victory ranks, and many battle-side conditions are not fully audited.
- `Ready` means the currently imported inventory appears to satisfy the modeled inventory conditions. It does not guarantee the quest is fully completable in-game.
- `Inferred` means the plugin parsed direct conditions from quest text conservatively. These results are useful, but less trustworthy than curated rules.
- `No definitive data` means the quest data exists, but the plugin does not yet have enough structured requirement data to judge it safely.

For a more detailed limitations note, see [`docs/quest-audit-limitations.md`](docs/quest-audit-limitations.md).

## Publish

Versioning rule for this project:

- Any functional change, UI change, behavior change, data-model change, or packaging change must bump `package.json` version before packing/installing the plugin into Poi, even if the change is small.
- This includes local tarball installs used for manual testing in Poi.
- Pure documentation-only edits may skip the version bump if no packaged runtime files change.

1. Run `npm install`
2. Run `npm run build`
3. Run tests with `npx jest src/__tests__/analysis.spec.ts src/__tests__/inventory.spec.ts src/__tests__/export.spec.ts --runInBand`
4. Log in with `npm login`
5. Publish with `npm publish --access public`

If you want the settings page to show project links, add `homepage` and `bugs.url` to `package.json` before publishing.

## Development

```sh
# Install dependencies
npm install

# Download game data from github and convert assets to base64
# try set `http_proxy` or `https_proxy` as environment when download fail
npm run build

# Run the plugin in web environment
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
