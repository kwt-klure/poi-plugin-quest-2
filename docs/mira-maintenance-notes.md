# Mira Maintenance Notes

## Source boundaries

- Quest text, names, rewards, and generated quest docs stay on the upstream/original data pipeline.
- This fork does **not** maintain its own translated quest text layer.
- Japanese/source-side upstream data is the primary source of truth.
- `fleet.diablohu.com` is only a fallback reference for Chinese-side checking, not the primary maintained source.

## Requirement analysis boundaries

- Requirement analysis is about **whether the account can assemble the requirement**, not whether the current active fleet already matches it.
- `flagship`, `second`, `shipTypes`, `shipClasses`, and named-ship conditions are all interpreted as roster/composition feasibility.
- Do not silently turn the requirement matcher into an active-fleet checker unless the product explicitly changes scope.

## Inventory source policy

- Poi live inventory is the primary source for ship/equipment requirement checks.
- Imported CSV stays enabled, but only as fallback/manual override support.
- Fallback is **per-part**:
  - if Poi ships are unavailable, fallback to imported ship CSV
  - if Poi equipments are unavailable, fallback to imported equipment CSV
- Do not add noisy source badges to the main quest card UI unless product intent changes.

## `not_applicable` vs `unsupported`

- `not_applicable` means the quest has no specific ship/composition/equipment condition that can be inventory-checked.
- `unsupported` means the quest appears to contain inventory-relevant conditions, but the current matcher cannot safely model them yet.
- Generic progress words such as `主力` or `遠征` should not be parsed as ship/equipment requirements.

## Local persistence

- Imported CSV content is not stored back into this repo as raw `.csv` files.
- The plugin stores parsed imported inventory state in Poi local storage LevelDB under the plugin key.
- Poi itself also maintains local master/runtime data separately; do not confuse upstream quest text data, Poi runtime inventory, and this plugin's imported CSV state.
