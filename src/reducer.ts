import { GameQuest, PoiAction, QuestTab } from './poi/types'

const initState = {
  questList: null as null | GameQuest[],
  observedQuestMap: {} as Record<number, GameQuest>,
  tabId: QuestTab.ALL,
}

export type PluginState = { _: typeof initState }

export const reducer = (
  state = initState,
  action: PoiAction,
): typeof initState => {
  switch (action.type) {
    case '@@Response/kcsapi/api_get_member/questlist': {
      const { body, postBody } = action
      const observedQuestMap = { ...state.observedQuestMap }
      body.api_list.forEach((quest) => {
        observedQuestMap[quest.api_no] = quest
      })

      return {
        ...state,
        questList: body.api_list,
        observedQuestMap,
        tabId: postBody.api_tab_id,
      }
    }
    default:
      return state
  }
}
