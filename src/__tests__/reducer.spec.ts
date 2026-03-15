import { QUEST_API_STATE, QuestTab } from '../poi/types'
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
  })
})
