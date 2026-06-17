# Quest Audit Limitations

This note explains what the current `KC Quest Audit` analysis can and cannot guarantee.

## What the plugin is good at

- Showing quest info, pre/post chains, translations, and normal quest browsing from the original quest plugin data pipeline.
- Showing quests that are currently listed by the game and not yet accepted via the `Can accept` filter.
- Checking whether the currently imported ship/equipment inventory appears to satisfy some quest inventory conditions.
- Highlighting modeled quests that are already inventory-ready via the `Ready` badge and filter.
- Pointing out obvious missing ships or equipments for quests with curated rules or safe direct-text inference.

## What `Can accept` means

`Can accept` is a live questlist-state filter, not an inventory audit result.

It only means:

- the quest was observed in an in-game questlist response
- the quest state is `DEFAULT`, meaning it is listed and not currently accepted

It does **not** mean:

- the imported inventory satisfies the quest
- the quest is fully completable
- the observed questlist coverage is complete

If not all quest tabs have been visited, the `Can accept` list can still be
partial. Use the raw quest snapshot export coverage metadata when a complete
account-visible task table matters.

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

## Raw quest snapshot export

The plugin can also export a separate raw quest snapshot.

This export is different from quest analysis:

- it records observed `api_get_member/questlist` pages
- it keeps coverage metadata such as whether the All tab was observed,
  explicitly observed empty tabs, and page coverage status
- it labels quests as `listed_now` and `accepted_now`
- it does not claim `ready`, `available`, or `completable`

Use this raw export as the source for "which quests are currently listed". Use
the normal quest analysis export only for inventory-side hints.

Auto-export is enabled by default. When Poi observes a complete All-tab
questlist response, the plugin writes a sanitized raw snapshot to the active
export lane without requiring Computer Use or a manual Settings export. Manual
export remains available as a fallback, and the Settings panel can disable
auto-export if needed.

When Poi observes a quest-clear response, the plugin invalidates the observed
raw quest state until the next questlist response. This avoids leaving a
recently completed quest snapshot looking fresher than it is.

Coverage is split into two layers:

- `tabStatus` says whether the All tab has been observed. The All tab is the
  complete account-visible quest listing source; category tabs such as Daily,
  Weekly, Monthly, Once, and Others are optional extra observations.
- `pageStatus` says whether the observed tab responses look page-complete.

When the game/Poi emits a non-paginated questlist response whose `api_count`
matches the observed quest count, the snapshot marks that tab as
`full-tab-response`. If page-numbered request fields such as `api_page_no`,
`api_disp_page`, or `api_page_count` appear, the snapshot marks the tab as
`page-numbered-response` and keeps page coverage partial or unknown unless the
observed count proves complete.
