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
})
