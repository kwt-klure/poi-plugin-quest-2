# Quest Audit Limitations

This note explains what the current `KC Quest Audit` analysis can and cannot guarantee.

## What the plugin is good at

- Showing quest info, pre/post chains, translations, and normal quest browsing from the original quest plugin data pipeline.
- Checking whether the currently imported ship/equipment inventory appears to satisfy some quest inventory conditions.
- Highlighting modeled quests that are already inventory-ready via the `Ready` badge and filter.
- Pointing out obvious missing ships or equipments for quests with curated rules or safe direct-text inference.

## What `Ready` means

`Ready` does **not** mean the quest is guaranteed completable.

It only means:

- the imported inventory matches the inventory-side conditions that this plugin currently knows how to check

It does **not** mean:

- sortie count is satisfied
- map clears are satisfied
- boss kill count is satisfied
- required victory rank is satisfied
- special fleet shape restrictions are fully validated
- every hidden or wiki-discovered exception is covered

The safest way to read it is:

- `Ready` = inventory looks sufficient for the currently modeled conditions

## Rule quality levels

There are currently three practical rule states:

- `curated`
  - manually modeled requirement data
  - best available accuracy in the current plugin
- `inferred`
  - best-effort parsing from quest text
  - useful, but weaker than curated rules
- `none`
  - no usable rule was available for safe judgment

When a quest shows `Inferred`, treat it as a helpful hint, not a final answer.

## Current major gaps

The plugin is still incomplete in these areas:

- quests whose requirements are only described through historical fleet names or group aliases and are not yet manually modeled
- text that implies special composition semantics beyond direct ship names and direct ship-type counts
- dynamic sortie/exercise/expedition progress tracking
- many battle-condition constraints
- one-off quest exceptions and wiki-only nuance

## CSV and inventory caveats

The plugin depends on imported CSV inventory data.

- Better CSV structure produces better quest judgments.
- Legacy/localized CSV input is still supported, but is less reliable than the newer external export format.
- If imported inventory is stale, filtered, or incomplete, the analysis can look wrong even when the rule logic is correct.

## Practical expectation

The intended use today is:

- use the plugin to narrow down quests that are likely inventory-ready
- use `missing ships` / `missing equipments` as a fast triage aid
- still verify important or complex quests manually when they involve unusual conditions

This is an audit assistant, not a full quest oracle.
