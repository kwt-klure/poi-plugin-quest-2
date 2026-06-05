import {
  applyLiveQuestProgressEvent,
  buildLiveQuestProgressExportPayload,
  syncLiveQuestProgressWithActiveQuests,
} from '../liveQuestProgress'
import {
  buildLiveQuestProgressAutoExportKey,
  shouldAutoExportLiveQuestProgress,
  writeLiveQuestProgressPayloadToExportLane,
} from '../poi/liveQuestProgressAutoExport'
import { PACKAGE_NAME } from '../poi/env'
import { QUEST_API_STATE, type PoiQuestState } from '../poi/types'

const activeQuestMap: PoiQuestState = {
  999: {
    time: 1000,
    detail: {
      api_no: 999,
      api_title: 'B999',
      api_detail: '出擊 1-2、1-3 各一次 S 勝',
      api_category: 2,
      api_type: 1,
      api_state: QUEST_API_STATE.IN_PROGRESS,
      api_get_material: [0, 0, 0, 0],
      api_invalid_flag: 0,
      api_label_type: 1,
      api_progress_flag: 0,
      api_voice_id: 0,
      api_bonus_flag: 1,
    },
  },
}

describe('live quest progress auto export decision', () => {
  afterEach(() => {
    delete (globalThis as { remote?: unknown }).remote
  })

  test('auto-exports non-empty live quest progress snapshots only', () => {
    const emptyPayload = buildLiveQuestProgressExportPayload({
      pluginVersion: '0.0.0-test',
      state: { records: {}, lastUpdatedAt: null },
    })
    const state = syncLiveQuestProgressWithActiveQuests(
      { records: {}, lastUpdatedAt: null },
      activeQuestMap,
      {
        999: {
          code: 'B999',
          text: '出擊 1-2、1-3 各一次 S 勝',
        },
      },
    )
    const payload = buildLiveQuestProgressExportPayload({
      pluginVersion: '0.0.0-test',
      state,
    })

    expect(shouldAutoExportLiveQuestProgress(emptyPayload)).toBe(false)
    expect(shouldAutoExportLiveQuestProgress(payload)).toBe(true)
  })

  test('auto-export key ignores export timestamp but tracks progress counts', () => {
    const state = syncLiveQuestProgressWithActiveQuests(
      { records: {}, lastUpdatedAt: null },
      activeQuestMap,
      {
        999: {
          code: 'B999',
          text: '出擊 1-2、1-3 各一次 S 勝',
        },
      },
    )
    const updatedState = applyLiveQuestProgressEvent(state, {
      key: 'battle-1',
      type: 'battle_result',
      map: 12,
      boss: true,
      rank: 'S',
      observedAt: '2026-06-05T12:00:00.000Z',
    })

    const first = buildLiveQuestProgressExportPayload({
      pluginVersion: '0.0.0-test',
      state,
      exportedAt: '2026-06-05T12:00:00.000Z',
    })
    const second = buildLiveQuestProgressExportPayload({
      pluginVersion: '0.0.0-test',
      state,
      exportedAt: '2026-06-05T12:01:00.000Z',
    })
    const changed = buildLiveQuestProgressExportPayload({
      pluginVersion: '0.0.0-test',
      state: updatedState,
      exportedAt: '2026-06-05T12:02:00.000Z',
    })

    expect(buildLiveQuestProgressAutoExportKey(first)).toBe(
      buildLiveQuestProgressAutoExportKey(second),
    )
    expect(buildLiveQuestProgressAutoExportKey(first)).not.toBe(
      buildLiveQuestProgressAutoExportKey(changed),
    )
  })

  test('cleans older live progress auto-export files after writing the latest snapshot', () => {
    const deleted: string[] = []
    const written: string[] = []
    const targetDirectory =
      '/Users/mira/Documents/Mira-Workspace/local-fallback/poi-inventory-exports'
    ;(globalThis as any).remote = {
      app: {
        getPath: () => '/Users/mira/Documents',
      },
      require: (moduleName: string) => {
        if (moduleName === 'fs') {
          return {
            existsSync: () => false,
            mkdirSync: jest.fn(),
            readdirSync: () => [
              'kancolle_live_quest_progress_20260606-000001.json',
              'kancolle_raw_quests_20260606-000001.json',
            ],
            unlinkSync: (filePath: string) => deleted.push(filePath),
            writeFileSync: (filePath: string) => written.push(filePath),
          }
        }
        if (moduleName === 'path') {
          return {
            basename: (filePath: string) => filePath.split('/').pop(),
            join: (...parts: string[]) => parts.join('/'),
          }
        }
        throw new Error(`Unexpected module ${moduleName}`)
      },
    }

    const filePath = writeLiveQuestProgressPayloadToExportLane({} as any)

    expect(filePath).toBe(written[0])
    expect(
      filePath.startsWith(`${targetDirectory}/kancolle_live_quest_progress_`),
    ).toBe(true)
    expect(deleted).toEqual([
      `${targetDirectory}/kancolle_live_quest_progress_20260606-000001.json`,
    ])
  })

  test('ignores unrelated Poi store updates before rebuilding live progress payloads', () => {
    const liveQuestProgressAutoExport = require('../poi/liveQuestProgressAutoExport')
    const createListener =
      liveQuestProgressAutoExport.createLiveQuestProgressAutoExportStateListener
    const handleRelevantState = jest.fn()

    expect(typeof createListener).toBe('function')
    if (typeof createListener !== 'function') {
      return
    }

    const liveQuestProgress = {
      records: {},
      lastUpdatedAt: null,
    }
    const listener = createListener(handleRelevantState)
    const baseState = {
      ext: {
        [PACKAGE_NAME]: {
          _: {
            liveQuestProgress,
          },
        },
      },
      info: {
        admiral: {
          level: 116,
        },
      },
    }

    listener(baseState)
    listener({
      ...baseState,
      info: {
        admiral: {
          level: 117,
        },
      },
    })
    listener({
      ...baseState,
      ext: {
        [PACKAGE_NAME]: {
          _: {
            liveQuestProgress: {
              records: {},
              lastUpdatedAt: null,
            },
          },
        },
      },
    })

    expect(handleRelevantState).toHaveBeenCalledTimes(2)
  })
})
