import type { ImportedInventoryState } from '../importedInventory/types'
import type { PoiInventorySnapshot } from '../poi/inventory'
import { resolveInventorySnapshot } from '../store/resolvedInventory'

const importedInventory: ImportedInventoryState = {
  ships: [
    {
      id: 'csv-ship',
      shipId: 1,
      name: '吹雪',
      shipType: 2,
      shipClass: 1,
      compatibleNames: ['吹雪'],
      remodelRank: 0,
    },
  ],
  equipments: [
    {
      id: 'csv-equip',
      equipmentId: 10,
      name: '25mm単装機銃',
      type2: 21,
    },
  ],
  shipCsv: {
    fileName: 'ships.csv',
    importedAt: '2026-04-02T00:00:00.000Z',
    count: 1,
    format: 'external_csv',
  },
  equipmentCsv: {
    fileName: 'equips.csv',
    importedAt: '2026-04-02T00:00:00.000Z',
    count: 1,
    format: 'external_csv',
  },
}

describe('resolveInventorySnapshot', () => {
  test('prefers poi inventory when both ship and equipment data are available', () => {
    const poiInventory: PoiInventorySnapshot = {
      ships: [
        {
          id: 'poi-ship',
          shipId: 2,
          name: '綾波改二',
          shipType: 2,
          shipClass: 1,
          compatibleNames: ['綾波', '綾波改', '綾波改二'],
          remodelRank: 2,
        },
      ],
      equipments: [
        {
          id: 'poi-equip',
          equipmentId: 11,
          name: '12.7cm連装砲',
          type2: 1,
        },
      ],
      availability: {
        ships: true,
        equipments: true,
      },
    }

    expect(resolveInventorySnapshot(poiInventory, importedInventory)).toMatchObject({
      ships: poiInventory.ships,
      equipments: poiInventory.equipments,
      availability: {
        ships: true,
        equipments: true,
      },
    })
  })

  test('falls back per-part when only one poi inventory half is available', () => {
    const poiInventory: PoiInventorySnapshot = {
      ships: [],
      equipments: [
        {
          id: 'poi-equip',
          equipmentId: 11,
          name: '12.7cm連装砲',
          type2: 1,
        },
      ],
      availability: {
        ships: false,
        equipments: true,
      },
    }

    expect(resolveInventorySnapshot(poiInventory, importedInventory)).toMatchObject({
      ships: importedInventory.ships,
      equipments: poiInventory.equipments,
      availability: {
        ships: true,
        equipments: true,
      },
    })
  })

  test('keeps missing availability false when neither poi nor csv has that part', () => {
    const poiInventory: PoiInventorySnapshot = {
      ships: [],
      equipments: [],
      availability: {
        ships: false,
        equipments: false,
      },
    }

    expect(
      resolveInventorySnapshot(poiInventory, {
        ...importedInventory,
        shipCsv: null,
        equipmentCsv: null,
      }),
    ).toMatchObject({
      availability: {
        ships: false,
        equipments: false,
      },
    })
  })
})
