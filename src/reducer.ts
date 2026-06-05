import {
  applyLiveQuestProgressEvent,
  syncLiveQuestProgressWithActiveQuests,
} from './liveQuestProgress'
import type { LiveQuestProgressEvent } from './liveQuestProgress'
import { GameQuest, PoiAction, QUEST_API_STATE, QuestTab } from './poi/types'
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
  liveQuestProgress: {
    records: {},
    lastUpdatedAt: null,
  } as ReturnType<typeof syncLiveQuestProgressWithActiveQuests>,
  rawQuestPages: {} as RawQuestPageMap,
  rawQuestTabObservations: {} as RawQuestTabObservationMap,
  tabId: QuestTab.ALL,
}

export type PluginState = { _: typeof initState }

const buildActiveQuestMapFromObservedQuests = (
  observedQuestMap: Record<number, GameQuest>,
) =>
  Object.fromEntries(
    Object.values(observedQuestMap)
      .filter((quest) => quest.api_state >= QUEST_API_STATE.IN_PROGRESS)
      .map((quest) => [
        quest.api_no,
        {
          detail: quest,
          time: Date.now(),
        },
      ]),
  )

const buildBattleResultProgressEvent = (
  action: PoiAction,
): LiveQuestProgressEvent | null => {
  if (action.type !== '@@BattleResult') {
    return null
  }
  const payload = action.payload ?? {}
  if (payload.valid === false) {
    return null
  }
  const map = Number(payload.map)
  const mapCell =
    payload.mapCell == null ? undefined : Number(payload.mapCell)
  const rank = String(payload.rank ?? '')
  const boss = Boolean(payload.boss)
  if (!Number.isFinite(map) || !rank) {
    return null
  }
  const observedAt = new Date(
    typeof payload.time === 'number' ? payload.time : Date.now(),
  ).toISOString()
  return {
    key: [
      'battle',
      payload.time ?? observedAt,
      map,
      mapCell ?? 'unknown',
      rank,
      boss ? 'boss' : 'node',
    ].join(':'),
    type: 'battle_result',
    map,
    mapCell,
    boss,
    rank,
    observedAt,
  }
}

const buildMapTerminalProgressEvent = (
  action: PoiAction,
): LiveQuestProgressEvent | null => {
  if (action.type !== '@@Response/kcsapi/api_req_map/next') {
    return null
  }
  const body = action.body ?? action.payload?.body
  if (!body || body.api_next !== 0) {
    return null
  }
  const mapAreaId = Number(body.api_maparea_id)
  const mapInfoNo = Number(body.api_mapinfo_no)
  const mapCell = Number(body.api_no)
  if (!Number.isFinite(mapAreaId) || !Number.isFinite(mapInfoNo)) {
    return null
  }
  const map = mapAreaId * 10 + mapInfoNo
  const observedAt = new Date(
    typeof action.time === 'number'
      ? action.time
      : typeof action.payload?.time === 'number'
        ? action.payload.time
        : Date.now(),
  ).toISOString()
  return {
    key: [
      'terminal',
      action.time ?? action.payload?.time ?? observedAt,
      map,
      Number.isFinite(mapCell) ? mapCell : 'unknown',
    ].join(':'),
    type: 'map_terminal',
    map,
    mapCell: Number.isFinite(mapCell) ? mapCell : undefined,
    observedAt,
  }
}

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
      const liveQuestProgress = syncLiveQuestProgressWithActiveQuests(
        state.liveQuestProgress,
        buildActiveQuestMapFromObservedQuests(observedQuestMap),
      )
      const rawQuestPage = buildRawQuestPage(action)
      const rawQuestTabObservation =
        buildRawQuestTabObservationFromPage(rawQuestPage)
      const rawQuestTabObservations = state.rawQuestTabObservations ?? {}

      return {
        ...state,
        questList: body.api_list,
        observedQuestMap,
        liveQuestProgress,
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
        liveQuestProgress: initState.liveQuestProgress,
      }
    case '@@BattleResult': {
      const event = buildBattleResultProgressEvent(action)
      if (!event) {
        return state
      }
      return {
        ...state,
        liveQuestProgress: applyLiveQuestProgressEvent(
          state.liveQuestProgress,
          event,
        ),
      }
    }
    case '@@Response/kcsapi/api_req_map/next': {
      const event = buildMapTerminalProgressEvent(action)
      if (!event) {
        return state
      }
      return {
        ...state,
        liveQuestProgress: applyLiveQuestProgressEvent(
          state.liveQuestProgress,
          event,
        ),
      }
    }
    default:
      return state
  }
}
