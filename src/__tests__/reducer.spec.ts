import { QUEST_API_STATE, QuestTab } from '../poi/types'
import { RAW_QUEST_TAB_OBSERVED_ACTION_TYPE } from '../rawQuestSnapshot'
import { reducer } from '../reducer'

describe('reducer', () => {
  test('keeps the current tab quest list while accumulating observed quests', () => {
    const firstState = reducer(undefined, {
      type: '@@Response/kcsapi/api_get_member/questlist',
      path: '/kcsapi/api_get_member/questlist',
      postBody: {
        api_verno: '1',
        api_tab_id: QuestTab.ALL,
      },
      body: {
        api_completed_kind: 0,
        api_count: 1,
        api_exec_count: 0,
        api_exec_type: 0,
        api_list: [
          {
            api_no: 101,
            api_state: QUEST_API_STATE.DEFAULT,
            api_title: 'A1',
            api_detail: 'first quest',
            api_category: 1,
            api_type: 1,
            api_get_material: [0, 0, 0, 0],
            api_invalid_flag: 0,
            api_label_type: 1,
            api_progress_flag: 0,
            api_voice_id: 0,
            api_bonus_flag: 1,
          },
        ],
      },
    })

    const secondState = reducer(firstState, {
      type: '@@Response/kcsapi/api_get_member/questlist',
      path: '/kcsapi/api_get_member/questlist',
      postBody: {
        api_verno: '1',
        api_tab_id: QuestTab.WEEKLY,
      },
      body: {
        api_completed_kind: 0,
        api_count: 1,
        api_exec_count: 0,
        api_exec_type: 0,
        api_list: [
          {
            api_no: 202,
            api_state: QUEST_API_STATE.IN_PROGRESS,
            api_title: 'B1',
            api_detail: 'second quest',
            api_category: 2,
            api_type: 3,
            api_get_material: [0, 0, 0, 0],
            api_invalid_flag: 0,
            api_label_type: 1,
            api_progress_flag: 1,
            api_voice_id: 0,
            api_bonus_flag: 1,
          },
        ],
      },
    })

    expect(secondState.questList).toHaveLength(1)
    expect(secondState.questList?.[0].api_no).toBe(202)
    expect(Object.keys(secondState.observedQuestMap).sort()).toEqual([
      '101',
      '202',
    ])
    expect(secondState.observedQuestMap[101].api_title).toBe('A1')
    expect(secondState.observedQuestMap[202].api_title).toBe('B1')
    expect(secondState.tabId).toBe(QuestTab.WEEKLY)
    expect(Object.keys(secondState.rawQuestPages).sort()).toEqual([
      'api_tab_id=0&api_verno=1',
      'api_tab_id=2&api_verno=1',
    ])
    expect(
      secondState.rawQuestPages['api_tab_id=0&api_verno=1'].questIds,
    ).toEqual([101])
    expect(
      secondState.rawQuestPages['api_tab_id=2&api_verno=1'].questIds,
    ).toEqual([202])
  })

  test('keeps raw quest pages by sanitized request metadata', () => {
    const state = reducer(undefined, {
      type: '@@Response/kcsapi/api_get_member/questlist',
      path: '/kcsapi/api_get_member/questlist',
      postBody: {
        api_verno: '1',
        api_tab_id: QuestTab.ALL,
        api_page_no: '2',
        api_token: 'secret-token',
      },
      body: {
        api_completed_kind: 0,
        api_count: 1,
        api_exec_count: 0,
        api_exec_type: 0,
        api_list: [
          {
            api_no: 301,
            api_state: QUEST_API_STATE.DEFAULT,
            api_title: 'A2',
            api_detail: 'paged quest',
            api_category: 1,
            api_type: 1,
            api_get_material: [0, 0, 0, 0],
            api_invalid_flag: 0,
            api_label_type: 1,
            api_progress_flag: 0,
            api_voice_id: 0,
            api_bonus_flag: 1,
          },
        ],
      },
    })

    const [page] = Object.values(state.rawQuestPages)
    expect(page.pageKey).toBe('api_page_no=2&api_tab_id=0&api_verno=1')
    expect(page.postBody).not.toHaveProperty('api_token')
    expect(page.response.api_count).toBe(1)
    expect(page.quests[0].api_title).toBe('A2')
  })

  test('keeps explicit empty raw quest tab observations', () => {
    const state = reducer(undefined, {
      type: RAW_QUEST_TAB_OBSERVED_ACTION_TYPE,
      tabId: QuestTab.DAILY,
      observedAt: '2026-05-01T14:44:19.078Z',
      source: 'manual-empty-tab',
    })

    expect(state.rawQuestTabObservations[QuestTab.DAILY]).toEqual({
      tabId: QuestTab.DAILY,
      observedAt: '2026-05-01T14:44:19.078Z',
      source: 'manual-empty-tab',
      empty: true,
      observedQuestCount: 0,
      pageKeys: [],
    })
    expect(state.tabId).toBe(QuestTab.DAILY)
  })

  test('invalidates observed raw quest state after a quest clear response', () => {
    const observedState = reducer(undefined, {
      type: '@@Response/kcsapi/api_get_member/questlist',
      path: '/kcsapi/api_get_member/questlist',
      postBody: {
        api_verno: '1',
        api_tab_id: QuestTab.ALL,
      },
      body: {
        api_completed_kind: 0,
        api_count: 1,
        api_exec_count: 0,
        api_exec_type: 0,
        api_list: [
          {
            api_no: 101,
            api_state: QUEST_API_STATE.DEFAULT,
            api_title: 'A1',
            api_detail: 'listed quest',
            api_category: 1,
            api_type: 1,
            api_get_material: [0, 0, 0, 0],
            api_invalid_flag: 0,
            api_label_type: 1,
            api_progress_flag: 0,
            api_voice_id: 0,
            api_bonus_flag: 1,
          },
        ],
      },
    })

    const invalidatedState = reducer(observedState, {
      type: '@@Response/kcsapi/api_req_quest/clearitemget',
      path: '/kcsapi/api_req_quest/clearitemget',
      postBody: {
        api_quest_id: '101',
      },
      body: {},
    })

    expect(invalidatedState.questList).toBeNull()
    expect(invalidatedState.observedQuestMap).toEqual({})
    expect(invalidatedState.rawQuestPages).toEqual({})
    expect(invalidatedState.rawQuestTabObservations).toEqual({})
  })

  test('tracks generalized live sortie progress from questlist, battle result, and map terminal actions', () => {
    const observedState = reducer(undefined, {
      type: '@@Response/kcsapi/api_get_member/questlist',
      path: '/kcsapi/api_get_member/questlist',
      postBody: {
        api_verno: '1',
        api_tab_id: QuestTab.ALL,
      },
      body: {
        api_completed_kind: 0,
        api_count: 1,
        api_exec_count: 1,
        api_exec_type: 0,
        api_list: [
          {
            api_no: 982,
            api_state: QUEST_API_STATE.IN_PROGRESS,
            api_title: 'B186',
            api_detail:
              '旗艦塞繆爾・B・羅伯茨 Mk.II+5 自由艦 出擊 1-5、2-2、3-5 各一次 S 勝，1-6 到達終點一次',
            api_category: 2,
            api_type: 1,
            api_get_material: [0, 0, 0, 0],
            api_invalid_flag: 0,
            api_label_type: 1,
            api_progress_flag: 0,
            api_voice_id: 0,
            api_bonus_flag: 1,
          },
        ],
      },
    })

    expect(observedState.liveQuestProgress.records[982].goals).toHaveLength(4)

    const afterBattle = reducer(observedState, {
      type: '@@BattleResult',
      payload: {
        valid: true,
        time: 1780640000000,
        rank: 'S',
        boss: true,
        map: 15,
        mapCell: 12,
      },
    })
    const afterTerminal = reducer(afterBattle, {
      type: '@@Response/kcsapi/api_req_map/next',
      path: '/kcsapi/api_req_map/next',
      postBody: {},
      body: {
        api_maparea_id: 1,
        api_mapinfo_no: 6,
        api_no: 10,
        api_next: 0,
      },
    })

    expect(
      afterTerminal.liveQuestProgress.records[982].goals.map(
        (goal) => goal.count,
      ),
    ).toEqual([1, 0, 0, 1])
  })

  test('tracks live sortie progress from Poi BattleResult result actions', () => {
    const observedState = reducer(undefined, {
      type: '@@Response/kcsapi/api_get_member/questlist',
      path: '/kcsapi/api_get_member/questlist',
      postBody: {
        api_verno: '1',
        api_tab_id: QuestTab.ALL,
      },
      body: {
        api_completed_kind: 0,
        api_count: 1,
        api_exec_count: 1,
        api_exec_type: 0,
        api_list: [
          {
            api_no: 1022,
            api_state: QUEST_API_STATE.IN_PROGRESS,
            api_title: 'L2412B5',
            api_detail:
              '以包括玉波、涼波、藤波、早波、濱波中的3位組成艦隊，出2-3、4-1、5-1、7-1並各完成1次S勝。',
            api_category: 2,
            api_type: 1,
            api_get_material: [0, 0, 0, 0],
            api_invalid_flag: 0,
            api_label_type: 1,
            api_progress_flag: 0,
            api_voice_id: 0,
            api_bonus_flag: 1,
          },
        ],
      },
    })

    const afterTwoBattles = [
      {
        rank: 'S',
        boss: true,
        map: 23,
        mapCell: 17,
        deckShipId: [1, 2, 3],
      },
      {
        rank: 'S',
        boss: true,
        map: 71,
        mapCell: 15,
        deckShipId: [1, 2, 3],
      },
    ].reduce(
      (state, result, index) =>
        reducer(state, {
          type: '@@BattleResult',
          time: 1780740000000 + index,
          result,
        }),
      observedState,
    )

    expect(
      afterTwoBattles.liveQuestProgress.records[1022].goals.map(
        (goal) => goal.count,
      ),
    ).toEqual([1, 0, 0, 1])
  })

  test('seeds live sortie progress from Poi active quests before new questlist responses', () => {
    const seededState = reducer(undefined, {
      type: '@@poi-plugin-kc-quest-audit/seed-live-quest-progress-from-poi-active-quests',
      activeQuestMap: {
        1022: {
          time: 1780740000000,
          detail: {
            api_no: 1022,
            api_state: QUEST_API_STATE.IN_PROGRESS,
            api_title: 'L2412B5',
            api_detail:
              '以包括玉波、涼波、藤波、早波、濱波中的3位組成艦隊，出2-3、4-1、5-1、7-1並各完成1次S勝。',
            api_category: 2,
            api_type: 1,
            api_get_material: [0, 0, 0, 0],
            api_invalid_flag: 0,
            api_label_type: 1,
            api_progress_flag: 1,
            api_voice_id: 0,
            api_bonus_flag: 1,
          },
        },
      },
    } as any)

    expect(
      seededState.liveQuestProgress.records[1022].goals.map(
        (goal) => goal.label,
      ),
    ).toEqual([
      '2-3 S 0 / 1',
      '4-1 S 0 / 1',
      '5-1 S 0 / 1',
      '7-1 S 0 / 1',
    ])

    const afterBattle = reducer(seededState, {
      type: '@@BattleResult',
      time: 1780740000001,
      result: {
        rank: 'S',
        boss: true,
        map: 23,
        mapCell: 17,
      },
    })

    expect(
      afterBattle.liveQuestProgress.records[1022].goals.map(
        (goal) => goal.count,
      ),
    ).toEqual([1, 0, 0, 0])
  })

  test('clears live quest progress after quest clear invalidation', () => {
    const observedState = reducer(undefined, {
      type: '@@Response/kcsapi/api_get_member/questlist',
      path: '/kcsapi/api_get_member/questlist',
      postBody: {
        api_verno: '1',
        api_tab_id: QuestTab.ALL,
      },
      body: {
        api_completed_kind: 0,
        api_count: 1,
        api_exec_count: 1,
        api_exec_type: 0,
        api_list: [
          {
            api_no: 982,
            api_state: QUEST_API_STATE.IN_PROGRESS,
            api_title: 'B186',
            api_detail:
              '旗艦塞繆爾・B・羅伯茨 Mk.II+5 自由艦 出擊 1-5、2-2、3-5 各一次 S 勝，1-6 到達終點一次',
            api_category: 2,
            api_type: 1,
            api_get_material: [0, 0, 0, 0],
            api_invalid_flag: 0,
            api_label_type: 1,
            api_progress_flag: 0,
            api_voice_id: 0,
            api_bonus_flag: 1,
          },
        ],
      },
    })

    const invalidatedState = reducer(observedState, {
      type: '@@Response/kcsapi/api_req_quest/clearitemget',
      path: '/kcsapi/api_req_quest/clearitemget',
      postBody: {
        api_quest_id: '982',
      },
      body: {},
    })

    expect(invalidatedState.liveQuestProgress.records).toEqual({})
  })
})
