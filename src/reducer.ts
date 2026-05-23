import { GameQuest, PoiAction, QuestTab } from './poi/types'
import {
  RAW_QUEST_TAB_OBSERVED_ACTION_TYPE,
  buildManualRawQuestTabObservation,
  buildRawQuestPage,
  buildRawQuestTabObservationFromPage,
  mergeRawQuestTabObservation,
} from './rawQuestSnapshot'
import type {
  RawQuestPageMap,
  RawQuestTabObservationMap,
} from './rawQuestSnapshot'

const initState = {
  questList: null as null | GameQuest[],
  observedQuestMap: {} as Record<number, GameQuest>,
  rawQuestPages: {} as RawQuestPageMap,
  rawQuestTabObservations: {} as RawQuestTabObservationMap,
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
      const rawQuestPage = buildRawQuestPage(action)
      const rawQuestTabObservation =
        buildRawQuestTabObservationFromPage(rawQuestPage)
      const rawQuestTabObservations = state.rawQuestTabObservations ?? {}

      return {
        ...state,
        questList: body.api_list,
        observedQuestMap,
        rawQuestPages: {
          ...(state.rawQuestPages ?? {}),
          [rawQuestPage.pageKey]: rawQuestPage,
        },
        rawQuestTabObservations: {
          ...rawQuestTabObservations,
          [rawQuestTabObservation.tabId]: mergeRawQuestTabObservation(
            rawQuestTabObservations[rawQuestTabObservation.tabId],
            rawQuestTabObservation,
          ),
        },
        tabId: postBody.api_tab_id,
      }
    }
    case RAW_QUEST_TAB_OBSERVED_ACTION_TYPE: {
      const rawQuestTabObservation = buildManualRawQuestTabObservation(
        action.tabId,
        action.observedAt,
      )
      const rawQuestTabObservations = state.rawQuestTabObservations ?? {}

      return {
        ...state,
        rawQuestTabObservations: {
          ...rawQuestTabObservations,
          [rawQuestTabObservation.tabId]: mergeRawQuestTabObservation(
            rawQuestTabObservations[rawQuestTabObservation.tabId],
            rawQuestTabObservation,
          ),
        },
        tabId: action.tabId,
      }
    }
    case '@@Response/kcsapi/api_req_quest/clearitemget':
      return {
        ...state,
        questList: null,
        observedQuestMap: {},
        rawQuestPages: {},
        rawQuestTabObservations: {},
      }
    default:
      return state
  }
}
