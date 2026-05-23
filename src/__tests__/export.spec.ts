import { buildQuestExportPayload } from '../export'
import { QuestTab } from '../poi/types'
import {
  buildRawQuestSnapshotExportPayload,
  buildRawQuestSnapshotFileName,
  hasRawQuestSnapshotData,
} from '../rawQuestSnapshot'

describe('buildQuestExportPayload', () => {
  test('includes quest metadata, analysis, and debug payload', () => {
    const payload = buildQuestExportPayload({
      pluginVersion: '0.16.0',
      inventory: {
        shipCsv: {
          fileName: 'kancolle_kan_26-03-12.csv',
          importedAt: '2026-03-12T01:23:45.000Z',
          count: 478,
          format: 'external_csv',
        },
        equipmentCsv: {
          fileName: 'kancolle_equips_2026-03-07.csv',
          importedAt: '2026-03-12T01:23:45.000Z',
          count: 1234,
          format: 'external_csv',
        },
      },
      currentTabQuestList: [
        {
          api_no: 903,
          api_state: 2,
          api_title: '拡張「六水戦」、最前線へ！',
          api_detail: 'quest description',
        },
        {
          api_no: 1999,
          api_state: 1,
          api_title: '未收錄新任務',
          api_detail: 'unknown quest description',
        },
      ] as any,
      observedQuestList: [
        {
          api_no: 903,
          api_state: 2,
          api_title: '拡張「六水戦」、最前線へ！',
          api_detail: 'quest description',
        },
        {
          api_no: 1999,
          api_state: 1,
          api_title: '未收錄新任務',
          api_detail: 'unknown quest description',
        },
        {
          api_no: 2000,
          api_state: 1,
          api_title: '別分頁新任務',
          api_detail: 'unknown tab quest description',
        },
      ] as any,
      activeQuestMap: {
        903: {
          time: 0,
          detail: {
            api_no: 903,
            api_state: 2,
            api_title: '拡張「六水戦」、最前線へ！',
            api_detail: 'quest description',
          },
        },
        1999: {
          time: 0,
          detail: {
            api_no: 1999,
            api_state: 1,
            api_title: '未收錄新任務',
            api_detail: 'unknown quest description',
          },
        },
      } as any,
      summary: {
        actionable: 0,
        blocked: 1,
        already_done: 0,
        probably_done: 0,
        state_unknown: 0,
        not_applicable: 0,
        unsupported: 0,
      },
      quests: [
        {
          gameId: 903,
          gameQuest: { api_no: 903, api_state: 2 },
          docQuest: {
            code: 'B139',
            name: '拡張「六水戦」、最前線へ！',
            desc: 'quest description',
            rewards: 'reward text',
            memo2: 'detail text',
          },
        },
      ] as any,
      analysisMap: {
        903: {
          gameId: 903,
          status: 'blocked',
          structuralFeasibility: 'missing_inventory',
          acceptability: 'available',
          completionState: 'incomplete',
          origin: 'curated',
          missingShips: [],
          missingEquipments: [],
          missingInventoryParts: ['ships', 'equipments'],
          notes: ['import inventory first'],
          requirement: null,
        },
      },
      debugMap: {
        903: {
          gameId: 903,
          status: 'blocked',
          structuralFeasibility: 'missing_inventory',
          acceptability: 'available',
          completionState: 'incomplete',
          origin: 'curated',
          shipMatchers: [],
          equipmentMatchers: [],
        },
      },
    })

    expect(payload.pluginVersion).toBe('0.16.0')
    expect(payload.inventory).toEqual({
      shipCsv: {
        fileName: 'kancolle_kan_26-03-12.csv',
        importedAt: '2026-03-12T01:23:45.000Z',
        count: 478,
        format: 'external_csv',
      },
      equipmentCsv: {
        fileName: 'kancolle_equips_2026-03-07.csv',
        importedAt: '2026-03-12T01:23:45.000Z',
        count: 1234,
        format: 'external_csv',
      },
    })
    expect(payload.analysisSummary.blocked).toBe(1)
    expect(payload.gameQuestSnapshot.currentTabQuestList).toEqual([
      {
        api_no: 903,
        api_state: 2,
        api_title: '拡張「六水戦」、最前線へ！',
        api_detail: 'quest description',
      },
      {
        api_no: 1999,
        api_state: 1,
        api_title: '未收錄新任務',
        api_detail: 'unknown quest description',
      },
    ])
    expect(payload.gameQuestSnapshot.unknownObservedQuests).toEqual([
      {
        api_no: 1999,
        api_state: 1,
        api_title: '未收錄新任務',
        api_detail: 'unknown quest description',
      },
      {
        api_no: 2000,
        api_state: 1,
        api_title: '別分頁新任務',
        api_detail: 'unknown tab quest description',
      },
    ])
    expect(payload.gameQuestSnapshot.unknownActiveQuests).toEqual([
      {
        api_no: 1999,
        api_state: 1,
        api_title: '未收錄新任務',
        api_detail: 'unknown quest description',
      },
    ])
    expect(payload.quests).toEqual([
      {
        gameId: 903,
        code: 'B139',
        name: '拡張「六水戦」、最前線へ！',
        description: 'quest description',
        rewards: 'reward text',
        details: 'detail text',
        inGameState: 2,
        analysis: {
          status: 'blocked',
          structuralFeasibility: 'missing_inventory',
          acceptability: 'available',
          completionState: 'incomplete',
          origin: 'curated',
          missingShips: [],
          missingEquipments: [],
          missingInventoryParts: ['ships', 'equipments'],
          notes: ['import inventory first'],
        },
        debug: {
          gameId: 903,
          status: 'blocked',
          structuralFeasibility: 'missing_inventory',
          acceptability: 'available',
          completionState: 'incomplete',
          origin: 'curated',
          shipMatchers: [],
          equipmentMatchers: [],
        },
      },
    ])
    expect(payload.generatedAt).toEqual(expect.any(String))
  })

  test('falls back to unsupported analysis when a quest has no analysis result', () => {
    const payload = buildQuestExportPayload({
      pluginVersion: '0.16.0',
      inventory: {
        shipCsv: null,
        equipmentCsv: null,
      },
      currentTabQuestList: [],
      observedQuestList: [],
      activeQuestMap: {},
      summary: {
        actionable: 0,
        blocked: 0,
        already_done: 0,
        probably_done: 0,
        state_unknown: 0,
        not_applicable: 0,
        unsupported: 1,
      },
      quests: [
        {
          gameId: 1,
          docQuest: {
            code: 'A1',
            name: '編成任務',
            desc: 'quest description',
          },
        },
      ] as any,
      analysisMap: {},
      debugMap: {},
    })

    expect(payload.quests[0]).toMatchObject({
      gameId: 1,
      code: 'A1',
      analysis: {
        status: 'unsupported',
        structuralFeasibility: 'unsupported',
        acceptability: 'unknown',
        completionState: 'unknown',
        origin: 'none',
        missingShips: [],
        missingEquipments: [],
        missingInventoryParts: [],
        notes: [],
      },
    })
  })
})

describe('buildRawQuestSnapshotExportPayload', () => {
  test('uses downstream raw snapshot filename convention', () => {
    expect(
      buildRawQuestSnapshotFileName(new Date('2026-05-01T14:44:19.078Z')),
    ).toBe('kancolle_raw_quests_20260501-144419.json')
  })

  test('exports raw quest pages without analysis inference', () => {
    const payload = buildRawQuestSnapshotExportPayload({
      pluginVersion: '0.18.0',
      activeQuestMap: {
        202: {
          time: 0,
          detail: {
            api_no: 202,
            api_state: 2,
            api_title: 'B1',
            api_detail: 'active quest',
          },
        },
      } as any,
      rawQuestPages: {
        'api_tab_id=0&api_verno=1': {
          pageKey: 'api_tab_id=0&api_verno=1',
          observedAt: '2026-04-28T00:00:00.000Z',
          path: '/kcsapi/api_get_member/questlist',
          tabId: QuestTab.ALL,
          postBody: {
            api_tab_id: QuestTab.ALL,
            api_verno: '1',
          },
          response: {
            api_completed_kind: 0,
            api_count: 2,
            api_exec_count: 1,
            api_exec_type: 0,
          },
          questIds: [101, 202],
          quests: [
            {
              api_no: 101,
              api_state: 1,
              api_title: 'A1',
              api_detail: 'listed quest',
            },
            {
              api_no: 202,
              api_state: 2,
              api_title: 'B1',
              api_detail: 'active quest',
            },
          ] as any,
        },
        'api_tab_id=2&api_verno=1': {
          pageKey: 'api_tab_id=2&api_verno=1',
          observedAt: '2026-04-28T00:01:00.000Z',
          path: '/kcsapi/api_get_member/questlist',
          tabId: QuestTab.WEEKLY,
          postBody: {
            api_tab_id: QuestTab.WEEKLY,
            api_verno: '1',
          },
          response: {
            api_completed_kind: 0,
            api_count: 1,
            api_exec_count: 1,
            api_exec_type: 0,
          },
          questIds: [202],
          quests: [
            {
              api_no: 202,
              api_state: 2,
              api_title: 'B1',
              api_detail: 'active quest',
            },
          ] as any,
        },
      },
    })

    expect(payload.schema_version).toBe('kancolle-raw-quests-v1')
    expect(payload.source).toMatchObject({
      plugin: 'poi-plugin-kc-quest-audit',
      plugin_version: '0.18.0',
      endpoint: '/kcsapi/api_get_member/questlist',
    })
    expect(payload.coverage.status).toBe('complete')
    expect(payload.coverage.observedTabs).toEqual(['0', '2'])
    expect(payload.coverage.expectedTabs).toEqual([QuestTab.ALL])
    expect(payload.coverage.missingTabs).toEqual([])
    expect(payload.coverage.tabStatus).toBe('complete')
    expect(payload.coverage.pageStatus).toBe('complete')
    expect(payload.coverage.notes).toEqual(
      expect.arrayContaining([
        'Category quest tabs are extra observations; the All tab is the complete listing source.',
      ]),
    )
    expect(payload.coverage.tabDetails).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          tabId: QuestTab.ALL,
          pageMode: 'full-tab-response',
          pageStatus: 'complete',
          observedPageKeys: ['api_tab_id=0&api_verno=1'],
        }),
      ]),
    )
    expect(payload.raw_pages).toHaveLength(2)
    expect(payload.quests_by_id['101']).toMatchObject({
      api_title: 'A1',
      listed_now: true,
      accepted_now: false,
      observed_page_keys: ['api_tab_id=0&api_verno=1'],
    })
    expect(payload.quests_by_id['202']).toMatchObject({
      api_title: 'B1',
      listed_now: true,
      accepted_now: true,
      observed_page_keys: [
        'api_tab_id=0&api_verno=1',
        'api_tab_id=2&api_verno=1',
      ],
    })
    expect(payload).not.toHaveProperty('analysisSummary')
    expect(hasRawQuestSnapshotData(payload)).toBe(true)
  })

  test('treats All tab as the complete raw quest listing source', () => {
    const payload = buildRawQuestSnapshotExportPayload({
      pluginVersion: '0.18.0',
      activeQuestMap: {},
      rawQuestPages: {
        'api_tab_id=0&api_verno=1': {
          pageKey: 'api_tab_id=0&api_verno=1',
          observedAt: '2026-05-04T00:00:00.000Z',
          path: '/kcsapi/api_get_member/questlist',
          tabId: QuestTab.ALL,
          postBody: {
            api_tab_id: QuestTab.ALL,
            api_verno: '1',
          },
          response: {
            api_completed_kind: 0,
            api_count: 1,
            api_exec_count: 0,
            api_exec_type: 0,
          },
          questIds: [101],
          quests: [
            {
              api_no: 101,
              api_state: 1,
              api_title: 'A1',
              api_detail: 'listed quest',
            },
          ] as any,
        },
      },
    })

    expect(payload.coverage.status).toBe('complete')
    expect(payload.coverage.tabStatus).toBe('complete')
    expect(payload.coverage.pageStatus).toBe('complete')
    expect(payload.coverage.expectedTabs).toEqual([QuestTab.ALL])
    expect(payload.coverage.missingTabs).toEqual([])
  })

  test('treats explicitly observed empty tabs as covered', () => {
    const payload = buildRawQuestSnapshotExportPayload({
      pluginVersion: '0.18.0',
      activeQuestMap: {},
      rawQuestPages: {},
      rawQuestTabObservations: {
        [QuestTab.DAILY]: {
          tabId: QuestTab.DAILY,
          observedAt: '2026-05-01T14:44:19.078Z',
          source: 'manual-empty-tab',
          empty: true,
          observedQuestCount: 0,
          pageKeys: [],
        },
      },
    })

    expect(payload.coverage.status).toBe('partial')
    expect(payload.coverage.observedTabs).toContain(QuestTab.DAILY)
    expect(payload.coverage.observedEmptyTabs).toEqual([QuestTab.DAILY])
    expect(payload.coverage.missingTabs).not.toContain(QuestTab.DAILY)
    expect(payload.coverage.missingTabs).toEqual([QuestTab.ALL])
    expect(payload.coverage.tabDetails).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          tabId: QuestTab.DAILY,
          observed: true,
          observedEmpty: true,
          pageMode: 'empty-tab-observation',
          pageStatus: 'complete',
        }),
      ]),
    )
    expect(hasRawQuestSnapshotData(payload)).toBe(true)
  })

  test('detects empty raw quest snapshots before writing files', () => {
    const payload = buildRawQuestSnapshotExportPayload({
      pluginVersion: '0.18.0',
      activeQuestMap: {},
      rawQuestPages: {},
    })

    expect(payload.coverage.status).toBe('unknown')
    expect(payload.raw_pages).toHaveLength(0)
    expect(payload.raw_tab_observations).toHaveLength(0)
    expect(payload.quests_by_id).toEqual({})
    expect(hasRawQuestSnapshotData(payload)).toBe(false)
  })

  test('makes page-numbered questlist coverage explicit instead of assuming full tab coverage', () => {
    const payload = buildRawQuestSnapshotExportPayload({
      pluginVersion: '0.18.0',
      activeQuestMap: {},
      rawQuestPages: {
        'api_page_no=1&api_tab_id=0&api_verno=1': {
          pageKey: 'api_page_no=1&api_tab_id=0&api_verno=1',
          observedAt: '2026-05-01T14:44:19.078Z',
          path: '/kcsapi/api_get_member/questlist',
          tabId: QuestTab.ALL,
          postBody: {
            api_page_no: '1',
            api_tab_id: QuestTab.ALL,
            api_verno: '1',
          },
          response: {
            api_completed_kind: 0,
            api_count: 3,
            api_exec_count: 0,
            api_exec_type: 0,
          },
          questIds: [101, 102],
          quests: [
            {
              api_no: 101,
              api_state: 1,
              api_title: 'A1',
              api_detail: 'listed quest',
            },
            {
              api_no: 102,
              api_state: 1,
              api_title: 'A2',
              api_detail: 'listed quest',
            },
          ] as any,
        },
      },
    })

    expect(payload.coverage.pageStatus).toBe('partial')
    expect(payload.coverage.tabDetails).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          tabId: QuestTab.ALL,
          pageMode: 'page-numbered-response',
          pageStatus: 'partial',
          observedPageKeys: ['api_page_no=1&api_tab_id=0&api_verno=1'],
        }),
      ]),
    )
    expect(payload.coverage.notes).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Page-numbered questlist responses observed'),
      ]),
    )
  })
})
