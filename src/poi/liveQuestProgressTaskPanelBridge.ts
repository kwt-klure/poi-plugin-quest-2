import type {
  LiveQuestProgressRecord,
  LiveQuestProgressState,
} from '../liveQuestProgress'
import { IN_POI, PACKAGE_NAME } from './env'
import { getPoiStore } from './store'
import type { PoiState, Store } from './types'
import { getStorage } from '../store'

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

export const buildLiveQuestProgressTaskPanelRecord = (
  record: LiveQuestProgressRecord,
): TaskPanelQuestRecord => ({
  id: record.gameId,
  ...Object.fromEntries(
    record.goals.map((goal, index) => [
      `${TASK_PANEL_SUBGOAL_PREFIX}${index}`,
      {
        count: goal.count,
        required: goal.required,
        description: stripTrailingProgress(goal.label),
      },
    ]),
  ),
})

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

let stopBridgePatch = () => {}

export const startLiveQuestProgressTaskPanelBridge = async () => {
  if (!IN_POI) {
    return
  }

  const store = await getPoiStore()
  stopBridgePatch()
  stopBridgePatch = patchLiveQuestProgressTaskPanelStore(store)
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
  store.dispatch?.({ type: REFRESH_ACTION_TYPE })
}
