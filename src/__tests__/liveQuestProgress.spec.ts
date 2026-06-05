import {
  applyLiveQuestProgressEvent,
  buildLiveQuestProgressExportPayload,
  buildLiveQuestProgressRule,
  syncLiveQuestProgressWithActiveQuests,
} from '../liveQuestProgress'
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

describe('live quest progress', () => {
  test('builds generalized sortie goals from quest text instead of hard-coding B186', () => {
    const rule = buildLiveQuestProgressRule({
      gameId: 982,
      code: 'B186',
      text:
        '旗艦塞繆爾・B・羅伯茨 Mk.II+5 自由艦 出擊 1-5、2-2、3-5 各一次 S 勝，1-6 到達終點一次',
    })

    expect(rule).toMatchObject({
      gameId: 982,
      code: 'B186',
      source: 'text',
    })
    expect(rule?.goals.map((goal) => goal.label)).toEqual([
      '1-5 S 0 / 1',
      '2-2 S 0 / 1',
      '3-5 S 0 / 1',
      '1-6 terminal 0 / 1',
    ])
  })

  test('applies boss rank and terminal events once to matching active quest goals', () => {
    const state = syncLiveQuestProgressWithActiveQuests(
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

    const afterBattle = applyLiveQuestProgressEvent(state, {
      key: 'battle-1',
      type: 'battle_result',
      map: 15,
      mapCell: 12,
      boss: true,
      rank: 'S',
      observedAt: '2026-06-05T12:00:00.000Z',
    })
    const afterDuplicate = applyLiveQuestProgressEvent(afterBattle, {
      key: 'battle-1',
      type: 'battle_result',
      map: 15,
      mapCell: 12,
      boss: true,
      rank: 'S',
      observedAt: '2026-06-05T12:00:01.000Z',
    })
    const afterTerminal = applyLiveQuestProgressEvent(afterDuplicate, {
      key: 'terminal-1',
      type: 'map_terminal',
      map: 16,
      mapCell: 10,
      observedAt: '2026-06-05T12:10:00.000Z',
    })

    expect(afterTerminal.records[982].goals.map((goal) => goal.count)).toEqual([
      1, 0, 0, 1,
    ])
    expect(afterTerminal.records[982].summary).toEqual({
      completed: 2,
      total: 4,
      status: 'in_progress',
    })
  })

  test('supports cumulative map groups for recurring sortie progress quests', () => {
    const rule = buildLiveQuestProgressRule({
      gameId: 241,
      code: 'Bw7',
      text:
        '向北方海域深處 (3-3,3-4,3-5) 出擊，捕捉敵人北方艦隊的主力，擊敗敵軍主力艦 5 次',
    })

    expect(rule?.goals).toHaveLength(1)
    expect(rule?.goals[0]).toMatchObject({
      maps: [33, 34, 35],
      required: 5,
      rank: 'B',
      label: '3-3/3-4/3-5 B+ 0 / 5',
    })
  })

  test('updates only records matched by a live progress event', () => {
    const state = syncLiveQuestProgressWithActiveQuests(
      { records: {}, lastUpdatedAt: null },
      {
        998: {
          time: 1000,
          detail: activeQuest(998, '出擊 1-5 一次 S 勝'),
        },
        999: {
          time: 1000,
          detail: activeQuest(999, '出擊 1-2 一次 S 勝'),
        },
      },
      {
        998: {
          code: 'B998',
          text: '出擊 1-5 一次 S 勝',
        },
        999: {
          code: 'B999',
          text: '出擊 1-2 一次 S 勝',
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

    expect(updatedState.records[998].updatedAt).toBeNull()
    expect(updatedState.records[999].updatedAt).toBe(
      '2026-06-05T12:00:00.000Z',
    )
  })

  test('exports live progress separately from raw quest listed state', () => {
    const state = syncLiveQuestProgressWithActiveQuests(
      { records: {}, lastUpdatedAt: null },
      {
        999: {
          time: 1000,
          detail: activeQuest(999, '出擊 1-2、1-3 各一次 S 勝'),
        },
      },
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

    expect(payload.schema_version).toBe('kancolle-live-quest-progress-v1')
    expect(payload.live_progress_now['999']).toMatchObject({
      code: 'B999',
      accepted_now: true,
    })
    expect(payload.live_progress_now['999']).not.toHaveProperty('listed_now')
  })
})
