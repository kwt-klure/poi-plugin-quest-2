import {
  applyLiveQuestProgressEvent,
  syncLiveQuestProgressWithActiveQuests,
} from '../liveQuestProgress'
import {
  buildLiveQuestProgressTaskPanelRecord,
  buildLiveQuestProgressTaskPanelRecordsOverlay,
  seedLiveQuestProgressFromPoiActiveQuests,
} from '../poi/liveQuestProgressTaskPanelBridge'
import { QUEST_API_STATE } from '../poi/types'

const activeQuest = (api_no: number, api_detail: string) => ({
  api_no,
  api_title: `Quest ${api_no}`,
  api_detail,
  api_category: 2 as const,
  api_type: 1 as const,
  api_state: QUEST_API_STATE.IN_PROGRESS,
  api_get_material: [0, 0, 0, 0] as [number, number, number, number],
  api_invalid_flag: 0 as const,
  api_label_type: 1 as const,
  api_progress_flag: 0 as const,
  api_voice_id: 0 as const,
  api_bonus_flag: 1 as const,
})

const liveProgressState = () => {
  const synced = syncLiveQuestProgressWithActiveQuests(
    { records: {}, lastUpdatedAt: null },
    {
      982: {
        time: 1000,
        detail: activeQuest(
          982,
          '旗艦塞繆爾・B・羅伯茨 Mk.II+5 自由艦 出擊 1-5、2-2、3-5 各一次 S 勝，1-6 到達終點一次',
        ),
      },
    },
    {
      982: {
        code: 'B186',
        text:
          '旗艦塞繆爾・B・羅伯茨 Mk.II+5 自由艦 出擊 1-5、2-2、3-5 各一次 S 勝，1-6 到達終點一次',
      },
    },
  )

  return applyLiveQuestProgressEvent(synced, {
    key: 'battle-1',
    type: 'battle_result',
    map: 15,
    mapCell: 12,
    boss: true,
    rank: 'S',
    observedAt: '2026-06-06T00:00:00.000Z',
  })
}

const liveProgressStateWithoutEvents = () =>
  syncLiveQuestProgressWithActiveQuests(
    { records: {}, lastUpdatedAt: null },
    {
      982: {
        time: 1000,
        detail: activeQuest(
          982,
          '旗艦塞繆爾・B・羅伯茨 Mk.II+5 自由艦 出擊 1-5、2-2、3-5 各一次 S 勝，1-6 到達終點一次',
        ),
      },
    },
    {
      982: {
        code: 'B186',
        text:
          '旗艦塞繆爾・B・羅伯茨 Mk.II+5 自由艦 出擊 1-5、2-2、3-5 各一次 S 勝，1-6 到達終點一次',
      },
    },
  )

const b121LiveProgressStateWithoutEvents = () =>
  syncLiveQuestProgressWithActiveQuests(
    { records: {}, lastUpdatedAt: null },
    {
      889: {
        time: 1000,
        detail: activeQuest(
          889,
          '精銳驅逐隊「二七驅」第一小隊「白露改二」以及「時雨改二」在內組成的強力的艦隊出擊 2-3,4-1,5-5,6-5，將敵人消滅，需要擊破 BOSS 及 S 勝各一次',
        ),
      },
    },
    {
      889: {
        code: 'B121',
        text:
          '精銳驅逐隊「二七驅」第一小隊「白露改二」以及「時雨改二」在內組成的強力的艦隊出擊 2-3,4-1,5-5,6-5，將敵人消滅，需要擊破 BOSS 及 S 勝各一次',
      },
    },
  )

const lowInformationLiveProgressStateWithoutEvents = () =>
  syncLiveQuestProgressWithActiveQuests(
    { records: {}, lastUpdatedAt: null },
    {
      990: {
        time: 1000,
        detail: activeQuest(990, '出擊 2-3,4-1，將敵人消滅'),
      },
    },
    {
      990: {
        code: 'B990',
        text: '出擊 2-3,4-1，將敵人消滅',
      },
    },
  )

describe('live quest progress task panel bridge', () => {
  test('builds a Poi task-panel-compatible record from sidecar progress', () => {
    const record = buildLiveQuestProgressTaskPanelRecord(
      liveProgressState().records[982],
    )

    expect(record).toMatchObject({
      id: 982,
      kcQuestAuditLiveProgress0: {
        count: 1,
        required: 1,
        description: '1-5 S',
      },
      kcQuestAuditLiveProgress1: {
        count: 0,
        required: 1,
        description: '2-2 S',
      },
      kcQuestAuditLiveProgress3: {
        count: 0,
        required: 1,
        description: '1-6 terminal',
      },
    })
  })

  test('adds synthetic records as non-enumerable overlay entries', () => {
    const nativeRecord = {
      id: 241,
      battle_boss_win: {
        count: 3,
        required: 5,
        description: 'native',
      },
    }
    const overlay = buildLiveQuestProgressTaskPanelRecordsOverlay({
      nativeRecords: {
        241: nativeRecord,
      },
      liveQuestProgress: liveProgressState(),
    })

    expect(overlay[982]).toMatchObject({
      id: 982,
      kcQuestAuditLiveProgress0: {
        count: 1,
        required: 1,
      },
    })
    expect(overlay[241]).toBe(nativeRecord)
    expect(Object.keys(overlay)).toEqual(['241'])
    expect(JSON.stringify(overlay)).not.toContain('kcQuestAuditLiveProgress')
  })

  test('does not override native Poi quest records', () => {
    const nativeRecord = {
      id: 982,
      battle_boss_win: {
        count: 1,
        required: 1,
        description: 'native',
      },
    }

    const overlay = buildLiveQuestProgressTaskPanelRecordsOverlay({
      nativeRecords: {
        982: nativeRecord,
      },
      liveQuestProgress: liveProgressState(),
    })

    expect(overlay[982]).toBe(nativeRecord)
  })

  test('adds native-like zero progress records when generated subgoals are specific enough', () => {
    const nativeRecords = {}
    const overlay = buildLiveQuestProgressTaskPanelRecordsOverlay({
      nativeRecords,
      liveQuestProgress: b121LiveProgressStateWithoutEvents(),
    })

    expect(overlay[889]).toMatchObject({
      id: 889,
      count: 0,
      required: 4,
      kcQuestAuditLiveProgress0: {
        count: 0,
        required: 1,
        description: '2-3 S',
      },
      kcQuestAuditLiveProgress1: {
        count: 0,
        required: 1,
        description: '4-1 S',
      },
      kcQuestAuditLiveProgress2: {
        count: 0,
        required: 1,
        description: '5-5 S',
      },
      kcQuestAuditLiveProgress3: {
        count: 0,
        required: 1,
        description: '6-5 S',
      },
    })
  })

  test('does not add low-information merged task-panel records without observed event evidence', () => {
    const nativeRecords = {}
    const overlay = buildLiveQuestProgressTaskPanelRecordsOverlay({
      nativeRecords,
      liveQuestProgress: lowInformationLiveProgressStateWithoutEvents(),
    })

    expect(overlay).toBe(nativeRecords)
  })

  test('does not patch Poi getState while the task panel bridge is disabled', () => {
    const bridge = require('../poi/liveQuestProgressTaskPanelBridge')
    const patchStore = bridge.patchLiveQuestProgressTaskPanelStore
    const getState = jest.fn(() => ({}))
    const store = {
      getState,
      dispatch: jest.fn(),
      subscribe: jest.fn(),
    }

    expect(typeof patchStore).toBe('function')
    if (typeof patchStore !== 'function') {
      return
    }

    const stop = patchStore(store, false)

    expect(store.getState).toBe(getState)
    stop()
    expect(store.getState).toBe(getState)
  })

  test('dispatches a seed action from Poi active quests when bridge starts after questlist state already exists', () => {
    const dispatch = jest.fn()
    const store = {
      getState: () => ({
        info: {
          quests: {
            activeQuests: {
              1022: {
                time: 1780740000000,
                detail: activeQuest(
                  1022,
                  '以包括玉波、涼波、藤波、早波、濱波中的3位組成艦隊，出2-3、4-1、5-1、7-1並各完成1次S勝。',
                ),
              },
            },
          },
        },
      }),
      dispatch,
      subscribe: jest.fn(),
    }

    seedLiveQuestProgressFromPoiActiveQuests(store as any)

    expect(dispatch).toHaveBeenCalledWith({
      type: '@@poi-plugin-kc-quest-audit/seed-live-quest-progress-from-poi-active-quests',
      activeQuestMap: store.getState().info.quests.activeQuests,
    })
  })
})
