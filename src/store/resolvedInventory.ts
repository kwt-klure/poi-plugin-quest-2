import type { RequirementInventory } from '../analysis'
import type { ImportedInventoryState } from '../importedInventory/types'
import type { PoiInventorySnapshot } from '../poi/inventory'

export const resolveInventorySnapshot = (
  poiInventory: PoiInventorySnapshot,
  importedInventory: ImportedInventoryState,
): RequirementInventory => ({
  ships: poiInventory.availability.ships
    ? poiInventory.ships
    : importedInventory.ships,
  equipments: poiInventory.availability.equipments
    ? poiInventory.equipments
    : importedInventory.equipments,
  availability: {
    ships: poiInventory.availability.ships || Boolean(importedInventory.shipCsv),
    equipments:
      poiInventory.availability.equipments ||
      Boolean(importedInventory.equipmentCsv),
  },
})
