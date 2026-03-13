# Poi Plugin Handoff Notes

This document is a handoff note for another agent or engineer. It summarizes how Poi plugins are structured, how installation actually works in practice, what was tried, what failed, and what should be treated as the current safe path.

For commit/publish boundaries between local files, the personal GitHub fork, and any upstream/public contribution, see [`docs/repo-boundary-policy.md`](repo-boundary-policy.md).

## 1. Poi plugin shape

Poi plugins in this repo follow the standard exported-module pattern:

- `package.json`
  - `name`: npm package name used by Poi plugin manager
  - `main`: entry module, here `src/index.ts`
  - `poiPlugin`: Poi-specific metadata
    - `title`
    - `description`
    - `icon`
    - `i18nDir`
    - `priority`
    - `apiVer`
- `src/index.ts`
  - exports `reactClass`
  - exports `settingsClass`
  - exports `reducer`
  - can export `pluginDidLoad`, `pluginWillUnload`, `switchPluginPath`, `windowMode`

Current plugin package name:

- `poi-plugin-kc-quest-audit`

Current plugin title shown in Poi:

- `KC Quest Audit`

## 1.1 Versioning rule

Treat version bumps as mandatory for packaged plugin changes:

- Any functional change, UI change, behavior change, data-model change, or packaging change must bump `package.json` version before creating a tarball or reinstalling into Poi.
- This applies even to small local test iterations if the installed plugin contents changed.
- Documentation-only edits may skip a version bump when they do not affect packaged runtime files.

## 2. Poi plugin installation model

Poi maintains its own plugin environment under:

- `~/Library/Application Support/poi/plugins`

Important files/directories:

- `~/Library/Application Support/poi/plugins/package.json`
  - plugin manager dependency manifest
- `~/Library/Application Support/poi/plugins/package-lock.json`
  - plugin manager lockfile
- `~/Library/Application Support/poi/plugins/node_modules`
  - actual installed plugin packages

Observed behavior:

- Poi expects plugin installation to go through its own npm-managed plugin directory.
- Directly editing `node_modules` is possible at filesystem level, but is not a safe operational path.
- The GUI field labeled `Install from npm server` appears to expect an npm package name, not an arbitrary local path.
- `npm install /path/to/plugin.tgz` inside `~/Library/Application Support/poi/plugins` does work as an npm installation path and updates the manifest correctly.

## 3. Installation attempts and findings

### Attempt A: direct symlink into Poi `node_modules`

Tried:

- replacing or adding plugin folders manually in Poi `node_modules`
- using symlinks from workspace repo to Poi plugin directory

Result:

- unsafe
- caused Poi instability / freeze

Conclusion:

- do not use direct symlink/manual replacement as a normal install strategy
- even if the filesystem shape looks correct, Poi’s plugin manager state can drift from actual package contents

### Attempt B: parallel install with official `quest-info-2`

Tried:

- installing both official `poi-plugin-quest-info-2` and this fork under a different package name

Result:

- Poi froze again

Root cause analysis:

- not primarily an install-source problem
- high probability of runtime conflict between two quest plugins of the same family
- both variants patch the same legacy reducer path in [`src/patch.ts`](../src/patch.ts)
- both are conceptually trying to own the same quest-panel integration surface

Additional contributing bug found:

- early versions of the fork were recomputing inventory/analysis too often
- live Poi inventory observation caused excessive recalculation and was a plausible freeze source

### Attempt C: tarball install via npm in Poi plugin directory

Tried:

- `npm pack` in workspace
- `npm install /path/to/poi-plugin-kc-quest-audit-0.16.0.tgz` in `~/Library/Application Support/poi/plugins`

Result:

- installation itself worked correctly
- manifest and `node_modules` were updated correctly
- runtime freeze still occurred before CSV-only refactor

Conclusion:

- Poi does accept tarball install at npm level
- the crash was not evidence that Poi rejects non-registry packages
- the dominant issue was plugin runtime behavior and/or plugin conflict

## 4. Current safe architecture

The current safe direction is:

- keep the original quest plugin architecture for:
  - quest data
  - quest list UI
  - search/filter
  - pre/post quest links
  - upstream data update/build pipeline
- do not use Poi live inventory for requirement analysis
- use manually imported CSV data stored in plugin local storage

This preserves maintainability of quest data updates while reducing runtime risk inside Poi.

## 4.1 Keep the original quest architecture

Treat the original quest plugin structure as the default architecture, even in this fork.

- Keep upstream quest download scripts and generation scripts as the main data flow.
- Keep quest translations sourced from the existing upstream quest datasets whenever possible.
- Use `src/questOverrides/data.ts` only as a temporary bridge when live maintenance adds quests faster than upstream data sources update.
- Do not turn the local overlay into a permanent second quest database or translation system.

For the operational update flow, see [`docs/rapid-quest-update.md`](rapid-quest-update.md).

## 5. Current implementation direction

Inventory analysis now uses:

- imported ship CSV
- imported equipment CSV
- plugin-local persisted storage

Relevant modules:

- [`src/importedInventory/csv.ts`](../src/importedInventory/csv.ts)
  - parses the known CSV family
- [`src/importedInventory/types.ts`](../src/importedInventory/types.ts)
  - imported inventory state types
- [`src/store/importedInventory.ts`](../src/store/importedInventory.ts)
  - storage-facing hooks/actions
- [`src/store/store.tsx`](../src/store/store.tsx)
  - persists imported inventory in plugin local storage
- [`src/Settings.tsx`](../src/Settings.tsx)
  - upload and clear UI
- [`src/store/analysis.ts`](../src/store/analysis.ts)
  - analysis now consumes imported inventory instead of Poi live inventory

Current analysis behavior:

- `ready`
- `missing_ships`
- `missing_equipments`
- `missing_both`
- `missing_inventory`
- `unsupported`

`missing_inventory` means:

- the quest is modeled
- but required imported inventory input is not available yet

## 5.1 Accuracy boundary

Treat the current quest analysis as an inventory-audit layer, not a complete quest engine.

- `ready` only means the imported inventory appears to satisfy the modeled inventory-side conditions.
- It does not guarantee the quest is fully completable in-game.
- Curated rules are the most trustworthy path.
- Inferred rules are intentionally conservative and only cover direct names, direct ship-type counts, and a small set of text patterns.
- Many quest semantics are still outside scope:
  - historical fleet aliases unless manually modeled
  - map / sortie counts
  - boss kill and victory-rank tracking
  - special fleet-shape restrictions and one-off edge cases
- If a quest is shown as `unsupported`, the plugin is missing safe structured rule data, not quest source data.
- If a quest is shown as `ready`, users should still treat it as “inventory looks sufficient” rather than “guaranteed clear”.

## 6. CSV support scope

Current scope is intentionally narrow:

- supports the same export family as the provided ship/equipment CSV files
- tolerant to column reordering
- tolerant to extra columns
- not intended to be a generic arbitrary-CSV mapper

Known required columns:

- ship CSV:
  - `艦名`
  - `艦種`
- equipment CSV:
  - `裝備名稱`
  - `類別ID`

The parser also uses IDs when present:

- ship: `艦 ID`
- equipment: `ID (Instance)`, `Master ID`

## 7. Remodel / alias handling

Current CSV normalization does not depend on Poi live master data.

Instead it uses:

- suffix-based remodel inference for common names:
  - `改`
  - `改二`
  - `改二甲`
  - `改二乙`
  - `改二丙`
  - `改二丁`
  - `改二戊`
  - `改二特`
- explicit alias overrides for rename-heavy lines such as:
  - `龍鳳改二戊`
  - `龍鳳改二護`

This is enough for the currently modeled quest set, but it is not a full canonical KanColle remodel graph.

If future quest coverage expands substantially, the better upgrade path is:

- add a maintained alias/remodel dataset
- do not reintroduce Poi live inventory dependency just to recover remodel chains

## 8. Runtime risk notes

Two high-risk patterns are now known:

### Risk A: over-observing Poi global store

Reading Poi live inventory reactively is dangerous if the selector returns new references for every store change.

Observed issue:

- store updates triggered repeated inventory normalization
- analysis recomputed too often
- quest list rerender pressure became high enough to plausibly freeze Poi

Mitigation already applied:

- inventory dependency comparison was tightened in [`src/poi/inventory.ts`](../src/poi/inventory.ts)

But current preferred path is still:

- avoid Poi live inventory entirely for requirement analysis

### Risk B: parallel quest-plugin variants

Running official `poi-plugin-quest-info-2` and this fork at the same time is unsafe.

Reason:

- they overlap conceptually
- they interact with the same quest-plugin surfaces
- they may both patch related quest reducer behavior

Recommendation:

- do not treat this fork as a plugin meant to run alongside official `quest-info-2`
- if installed for testing, disable/remove the official one first unless a future refactor fully removes that overlap

## 9. Installation recommendation going forward

Recommended test path:

1. Build and pack the plugin in workspace
2. Install via npm tarball into Poi plugin directory
3. Keep only one quest-plugin variant enabled
4. Validate Poi startup first
5. Validate CSV import UI second
6. Validate quest analysis output third

Practical commands:

```bash
cd "/path/to/poi-plugin-kc-quest-audit"
npm run build
npm pack --cache ./.npm-cache

cd "$HOME/Library/Application Support/poi/plugins"
npm install "/path/to/poi-plugin-kc-quest-audit-0.16.0.tgz"
```

Preferred uninstall:

```bash
cd "$HOME/Library/Application Support/poi/plugins"
npm uninstall poi-plugin-kc-quest-audit
```

## 10. What remains true from upstream

The fork still intentionally inherits the upstream quest plugin model for:

- quest document/update pipeline
- upstream wiki-derived quest data maintenance
- quest UI structure
- search/filter behavior
- pre/post quest relationships
- quest sync behavior unrelated to inventory analysis

This means the new inventory layer is an add-on, not a replacement for the original quest plugin architecture.

## 11. Validation status

At time of writing:

- CSV import parsing tests pass
- analysis tests pass
- export tests pass
- typecheck passes

Recent verified command results:

- `22/22` tests passed
- `npm run typeCheck` passed

## 12. Recommended next engineering move

If another agent continues from here, the safest next step is:

- install only the CSV-based version
- keep official `quest-info-2` disabled during validation
- verify:
  - Poi boots
  - plugin settings open
  - both CSV files import
  - quest cards show `missing_inventory` before import and normal analysis after import

Do not resume live Poi inventory integration unless there is a strong reason and a tighter performance envelope.
