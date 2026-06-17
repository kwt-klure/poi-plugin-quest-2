import type { PluginState } from '../reducer'
import type { RawQuestTabObservedAction } from '../rawQuestSnapshot'

export enum QUEST_API_STATE {
  DEFAULT = 1,
  IN_PROGRESS = 2,
  COMPLETED = 3,
}

// See https://github.com/poooi/poi/blob/master/views/redux/info/quests.es
export type GameQuest = {
  api_state: QUEST_API_STATE
  /**
   * Game ID, for example 101, 102
   */
  api_no: number
  api_title: string
  api_detail: string
  /**
   * 任务类别
   *
   * 1. Composition
   * 1. Sortie
   * 1. Exercise
   * 1. Expedition
   * 1. Supply/Docking
   * 1. Arsenal
   * 1. Modernization
   *
   * @see https://github.com/poooi/plugin-quest/blob/master/index.es#L49-L57
   */
  api_category: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
  /**
   * 任务类型
   *
   * 1. One-time
   * 1. Daily
   * 1. Weekly
   * 1. -3rd/-7th/-0th
   * 1. -2nd/-8th
   * 1. Monthly
   * 1. Quarterly
   *
   * @see https://github.com/poooi/plugin-quest/blob/master/index.es#L69-L77
   */
  api_type: 1 | 2 | 3 | 4 | 5 | 6 | 7
  // Rewards 油弹钢铝
  api_get_material: [number, number, number, number]
  api_invalid_flag: 0
  api_label_type: 1
  // 0: Empty: [0.0, 0.5)
  // 1: 50%: [0.5, 0.8)
  // 2: 80%: [0.8, 1.0)
  api_progress_flag: 0 | 1 | 2
  api_select_rewards?: [
    {
      api_count: number
      api_kind: number
      api_mst_id: number
      api_no: number
    }[],
  ]
  api_voice_id: 0
  api_bonus_flag: 1
}

export enum QuestTab {
  ALL = '0',
  IN_PROGRESS = '9',
  DAILY = '1',
  WEEKLY = '2',
  MONTHLY = '3',
  ONCE = '4',
  OTHERS = '5',
}

export type QuestListAction = {
  type: '@@Response/kcsapi/api_get_member/questlist'
  path: '/kcsapi/api_get_member/questlist'
  postBody: {
    api_verno?: '1'
    api_tab_id: QuestTab
    [key: string]: unknown
  }
  body: {
    api_completed_kind: number
    // api_list.length
    api_count: number
    // In progress count
    api_exec_count: number
    api_exec_type: number
    api_page_no?: string | number
    api_disp_page?: string | number
    api_page_count?: string | number
    api_list: GameQuest[]
    [key: string]: unknown
  }
}

export type QuestClearItemGetAction = {
  type: '@@Response/kcsapi/api_req_quest/clearitemget'
  path: '/kcsapi/api_req_quest/clearitemget'
  postBody?: {
    api_quest_id?: string | number
    [key: string]: unknown
  }
  body?: unknown
}

export type BattleResultAction = {
  type: '@@BattleResult'
  time?: number
  payload?: {
    valid?: boolean
    time?: number
    rank?: string
    boss?: boolean
    map?: number
    mapCell?: number
    [key: string]: unknown
  }
  result?: {
    valid?: boolean
    rank?: string
    boss?: boolean
    map?: number
    mapCell?: number
    [key: string]: unknown
  }
  [key: string]: unknown
}

export type MapNextAction = {
  type: '@@Response/kcsapi/api_req_map/next'
  path?: '/kcsapi/api_req_map/next'
  postBody?: Record<string, unknown>
  payload?: {
    body?: {
      api_maparea_id?: number
      api_mapinfo_no?: number
      api_no?: number
      api_next?: number
      [key: string]: unknown
    }
    time?: number
    [key: string]: unknown
  }
  body?: {
    api_maparea_id?: number
    api_mapinfo_no?: number
    api_no?: number
    api_next?: number
    [key: string]: unknown
  }
  time?: number
}

export type SeedLiveQuestProgressFromActiveQuestsAction = {
  type: '@@poi-plugin-kc-quest-audit/seed-live-quest-progress-from-poi-active-quests'
  activeQuestMap: PoiQuestState
}

type OtherAction = {
  type: 'otherString' // TODO fix me
  path?: string
  postBody?: unknown
  body?: unknown
}

export type PoiAction =
  | QuestListAction
  | QuestClearItemGetAction
  | BattleResultAction
  | MapNextAction
  | SeedLiveQuestProgressFromActiveQuestsAction
  | RawQuestTabObservedAction
  | OtherAction

export type PoiState = {
  ui: {
    activeMainTab: string
    activeFleetId?: number
    activePluginName?: string
  }
  info?: {
    ships?: Record<string, { api_id?: number; api_ship_id?: number }>
    equips?: Record<
      string,
      {
        api_id?: number
        api_slotitem_id?: number
        api_level?: number
        api_alv?: number
      }
    >
    quests?: {
      records?: Record<
        string | number,
        {
          id?: string | number
          count?: number
          required?: number
          active?: boolean
          time?: number
          [subgoal: string]: unknown
        }
      >
      activeQuests?: PoiQuestState
    }
  }
  const?: {
    $ships?: Record<
      string,
      {
        api_name?: string
        api_stype?: number
        api_ctype?: number
        api_aftershipid?: string | number
      }
    >
    $equips?: Record<
      string,
      {
        api_name?: string
        api_type?: number[]
        api_saku?: number
        api_houm?: number
      }
    >
  }
  ext: {
    // TODO fix use constant PACKAGE_NAME
    [packageName: string]: PluginState
  }
  plugins: { id: string; enabled: boolean; [x: string]: unknown }[]
  [x: string]: any
}

export type Store<S> = {
  getState: () => S
  subscribe: (listener: () => void) => () => void
  dispatch?: (action: { type: string; [key: string]: unknown }) => unknown
}

// state.info.quests.activeQuests
export type PoiQuestState = Record<number, { time: number; detail: GameQuest }>
