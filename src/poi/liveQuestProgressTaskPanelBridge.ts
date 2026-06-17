import type {
  LiveQuestProgressRecord,
  LiveQuestProgressState,
} from '../liveQuestProgress'
import { hasLiveQuestProgressEvidence } from '../liveQuestProgress'
import { IN_POI, PACKAGE_NAME } from './env'
import { getPoiStore } from './store'
import type { PoiState, Store } from './types'
import { getStorage } from '../store'
import { SEED_LIVE_QUEST_PROGRESS_FROM_POI_ACTIVE_QUESTS_ACTION_TYPE } from '../reducer'

const TASK_PANEL_SUBGOAL_PREFIX = 'kcQuestAuditLiveProgress'
const REFRESH_ACTION_TYPE =
  '@@poi-plugin-kc-quest-audit/live-progress-task-panel-bridge-refresh'

export interface TaskPanelSubgoalRecord {
  count: number
  required: number
  description?: string
}

export type TaskPanelQuestRecord = {
  id?: number | string
  count?: number
  required?: number
  active?: boolean
  time?: number
  [subgoal: string]: unknown
}

type TaskPanelQuestRecordMap = Record<string | number, TaskPanelQuestRecord>

const stripTrailingProgress = (label: string) =>
  label.replace(/\s+\d+\s*\/\s*\d+$/, '')

const sum = (values: number[]) =>
  values.reduce((total, value) => total + value, 0)

const isLowInformationMergedGoal = (goal: LiveQuestProgressRecord['goals'][number]) =>
  goal.maps.length > 1 && goal.required <= 1 && goal.eventKeys.length === 0

const isNativeLikeTaskPanelCandidate = (record: LiveQuestProgressRecord) =>
  Boolean(record.goals.length) &&
  record.goals.every((goal) => goal.required > 0) &&
  !record.goals.some(isLowInformationMergedGoal)

const shouldOverlayTaskPanelRecord = (record: LiveQuestProgressRecord) =>
  hasLiveQuestProgressEvidence(record) || isNativeLikeTaskPanelCandidate(record)

export const buildLiveQuestProgressTaskPanelRecord = (
  record: LiveQuestProgressRecord,
): TaskPanelQuestRecord => {
  const subgoals = Object.fromEntries(
    record.goals.map((goal, index) => [
      `${TASK_PANEL_SUBGOAL_PREFIX}${index}`,
      {
        count: goal.count,
        required: goal.required,
        description: stripTrailingProgress(goal.label),
      },
    ]),
  )

  return {
    id: record.gameId,
    count: sum(record.goals.map((goal) => goal.count)),
    required: sum(record.goals.map((goal) => goal.required)),
    active: true,
    ...subgoals,
  }
}

export const buildLiveQuestProgressTaskPanelRecordsOverlay = ({
  nativeRecords = {},
  liveQuestProgress,
}: {
  nativeRecords?: TaskPanelQuestRecordMap
  liveQuestProgress: LiveQuestProgressState
}): TaskPanelQuestRecordMap => {
  let added = false
  const overlay = { ...nativeRecords }

  Object.values(liveQuestProgress.records).forEach((record) => {
    if (!shouldOverlayTaskPanelRecord(record)) {
      return
    }

    const gameId = String(record.gameId)
    if (nativeRecords[gameId] || nativeRecords[record.gameId]) {
      return
    }

    Object.defineProperty(overlay, gameId, {
      value: buildLiveQuestProgressTaskPanelRecord(record),
      enumerable: false,
      configurable: true,
    })
    added = true
  })

  return added ? overlay : nativeRecords
}

let bridgeEnabledOverride: boolean | null = null

const isBridgeEnabled = () =>
  bridgeEnabledOverride ?? getStorage()?.bridgeLiveQuestProgressToTaskPanel ?? false

export const overlayPoiStateWithLiveQuestProgressTaskPanelRecords = (
  state: PoiState,
  enabled = isBridgeEnabled(),
): PoiState => {
  if (!enabled) {
    return state
  }

  const liveQuestProgress =
    state?.ext?.[PACKAGE_NAME]?._?.liveQuestProgress ?? null
  const nativeRecords = state?.info?.quests?.records ?? null
  if (!liveQuestProgress || !nativeRecords) {
    return state
  }

  const records = buildLiveQuestProgressTaskPanelRecordsOverlay({
    nativeRecords,
    liveQuestProgress,
  })
  if (records === nativeRecords) {
    return state
  }

  return {
    ...state,
    info: {
      ...state.info,
      quests: {
        ...state.info?.quests,
        records,
      },
    },
  }
}

const patchStoreGetState = (store: Store<PoiState>) => {
  const patchKey = `__${PACKAGE_NAME}LiveQuestProgressTaskPanelBridge`
  const patchedStore = store as Store<PoiState> & {
    [patchKey]?: {
      getState: Store<PoiState>['getState']
    }
  }
  if (patchedStore[patchKey]) {
    return () => {}
  }

  const originalGetState = store.getState.bind(store)
  let previousState: PoiState | null = null
  let previousLiveQuestProgress: LiveQuestProgressState | null = null
  let previousNativeRecords: TaskPanelQuestRecordMap | null = null
  let previousOverlay: PoiState | null = null

  store.getState = () => {
    const state = originalGetState()
    const liveQuestProgress =
      state?.ext?.[PACKAGE_NAME]?._?.liveQuestProgress ?? null
    const nativeRecords = state?.info?.quests?.records ?? null

    if (
      previousOverlay &&
      state === previousState &&
      liveQuestProgress === previousLiveQuestProgress &&
      nativeRecords === previousNativeRecords
    ) {
      return previousOverlay
    }

    previousState = state
    previousLiveQuestProgress = liveQuestProgress
    previousNativeRecords = nativeRecords
    previousOverlay = overlayPoiStateWithLiveQuestProgressTaskPanelRecords(
      state,
      true,
    )
    return previousOverlay
  }

  patchedStore[patchKey] = {
    getState: originalGetState,
  }

  return () => {
    store.getState = originalGetState
    delete patchedStore[patchKey]
  }
}

export const patchLiveQuestProgressTaskPanelStore = (
  store: Store<PoiState>,
  enabled = isBridgeEnabled(),
) => (enabled ? patchStoreGetState(store) : () => {})

export const seedLiveQuestProgressFromPoiActiveQuests = (
  store: Store<PoiState>,
) => {
  const activeQuestMap = store.getState()?.info?.quests?.activeQuests
  if (!activeQuestMap || !Object.keys(activeQuestMap).length) {
    return
  }
  store.dispatch?.({
    type: SEED_LIVE_QUEST_PROGRESS_FROM_POI_ACTIVE_QUESTS_ACTION_TYPE,
    activeQuestMap,
  })
}

let stopBridgePatch = () => {}

export const startLiveQuestProgressTaskPanelBridge = async () => {
  if (!IN_POI) {
    return
  }

  const store = await getPoiStore()
  const enabled = isBridgeEnabled()
  stopBridgePatch()
  stopBridgePatch = patchLiveQuestProgressTaskPanelStore(store, enabled)
  if (enabled) {
    seedLiveQuestProgressFromPoiActiveQuests(store)
  }
  store.dispatch?.({ type: REFRESH_ACTION_TYPE })
}

export const stopLiveQuestProgressTaskPanelBridge = async () => {
  stopBridgePatch()
  stopBridgePatch = () => {}
  if (!IN_POI) {
    return
  }
  const store = await getPoiStore()
  store.dispatch?.({ type: REFRESH_ACTION_TYPE })
}

export const setLiveQuestProgressTaskPanelBridgeEnabled = async (
  enabled: boolean,
) => {
  bridgeEnabledOverride = enabled
  if (!IN_POI) {
    return
  }
  const store = await getPoiStore()
  stopBridgePatch()
  stopBridgePatch = patchLiveQuestProgressTaskPanelStore(store, enabled)
  if (enabled) {
    seedLiveQuestProgressFromPoiActiveQuests(store)
  }
  store.dispatch?.({ type: REFRESH_ACTION_TYPE })
}
