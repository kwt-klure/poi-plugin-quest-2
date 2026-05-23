import PKG from '../../package.json'
import {
  buildRawQuestSnapshotFileName,
  buildRawQuestSnapshotExportPayload,
  hasRawQuestSnapshotData,
} from '../rawQuestSnapshot'
import type { RawQuestSnapshotExportPayload } from '../rawQuestSnapshot'
import { getStorage } from '../store'
import { noop } from '../utils'
import { PACKAGE_NAME } from './env'
import { resolvePoiInventoryExportDirectory } from './exportDirectory'
import { getPoiStore } from './store'
import type { PoiState } from './types'

export const RAW_QUEST_AUTO_EXPORT_DEBOUNCE_MS = 1500

let lastSeenAutoExportKey: string | null = null
let pendingAutoExportKey: string | null = null
let pendingAutoExportTimeout: ReturnType<typeof setTimeout> | null = null
let unsubscribeRawQuestAutoExport: () => void = noop

export const shouldAutoExportRawQuestSnapshot = (
  payload: RawQuestSnapshotExportPayload,
) => hasRawQuestSnapshotData(payload) && payload.coverage.status === 'complete'

export const buildRawQuestSnapshotAutoExportKey = (
  payload: RawQuestSnapshotExportPayload,
) =>
  JSON.stringify({
    coverage: payload.coverage.status,
    pages: payload.raw_pages.map((page) => ({
      pageKey: page.pageKey,
      observedAt: page.observedAt,
      response: page.response,
      questIds: page.questIds,
      quests: page.quests.map((quest) => ({
        api_no: quest.api_no,
        api_state: quest.api_state,
        api_progress_flag: quest.api_progress_flag,
      })),
    })),
    tabObservations: payload.raw_tab_observations,
    activeQuests: Object.entries(payload.active_quests)
      .sort(([left], [right]) => Number(left) - Number(right))
      .map(([questId, activeQuest]) => ({
        questId,
        time: activeQuest.time,
        api_state: activeQuest.detail?.api_state,
        api_progress_flag: activeQuest.detail?.api_progress_flag,
      })),
  })

const shouldAutoExportFromStorage = () =>
  getStorage()?.autoExportRawQuestSnapshot ?? true

const clearPendingAutoExport = () => {
  if (pendingAutoExportTimeout) {
    clearTimeout(pendingAutoExportTimeout)
  }
  pendingAutoExportKey = null
  pendingAutoExportTimeout = null
}

const buildRawQuestSnapshotPayloadFromPoiState = (state: PoiState) =>
  buildRawQuestSnapshotExportPayload({
    pluginVersion: PKG.version,
    rawQuestPages: state?.ext?.[PACKAGE_NAME]?._?.rawQuestPages ?? {},
    rawQuestTabObservations:
      state?.ext?.[PACKAGE_NAME]?._?.rawQuestTabObservations ?? {},
    activeQuestMap: state?.info?.quests?.activeQuests ?? {},
  })

export const writeRawQuestSnapshotPayloadToExportLane = (
  payload: RawQuestSnapshotExportPayload,
) => {
  const remote = (globalThis as { remote?: any }).remote
  if (!remote?.require) {
    throw new Error(
      'Failed to auto-export raw quest snapshot! remote unavailable',
    )
  }

  const fs = remote.require('fs')
  const path = remote.require('path')
  const targetDirectory = resolvePoiInventoryExportDirectory({
    documentsPath: remote.app.getPath('documents'),
    existsSync: fs.existsSync,
    joinPath: path.join,
    realpathSync: fs.realpathSync,
  }).path
  fs.mkdirSync(targetDirectory, { recursive: true })
  const filePath = path.join(targetDirectory, buildRawQuestSnapshotFileName())
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2))
  return filePath as string
}

const queueAutoExport = (
  payload: RawQuestSnapshotExportPayload,
  key: string,
) => {
  if (key === lastSeenAutoExportKey || key === pendingAutoExportKey) {
    return
  }

  if (pendingAutoExportTimeout) {
    clearTimeout(pendingAutoExportTimeout)
  }

  pendingAutoExportKey = key
  pendingAutoExportTimeout = setTimeout(() => {
    try {
      writeRawQuestSnapshotPayloadToExportLane(payload)
      lastSeenAutoExportKey = key
    } catch (error) {
      console.warn('Failed to auto-export raw quest snapshot', error)
    } finally {
      pendingAutoExportKey = null
      pendingAutoExportTimeout = null
    }
  }, RAW_QUEST_AUTO_EXPORT_DEBOUNCE_MS)
}

let initializedRawQuestAutoExport = false

const handleRawQuestAutoExportState = (state: PoiState) => {
  const payload = buildRawQuestSnapshotPayloadFromPoiState(state)
  const key = shouldAutoExportRawQuestSnapshot(payload)
    ? buildRawQuestSnapshotAutoExportKey(payload)
    : null

  if (!initializedRawQuestAutoExport) {
    initializedRawQuestAutoExport = true
    lastSeenAutoExportKey = key
    return
  }

  if (!shouldAutoExportFromStorage()) {
    clearPendingAutoExport()
    lastSeenAutoExportKey = key
    return
  }

  if (!key) {
    clearPendingAutoExport()
    lastSeenAutoExportKey = null
    return
  }

  queueAutoExport(payload, key)
}

export const startRawQuestSnapshotAutoExport = async () => {
  const store = await getPoiStore()
  unsubscribeRawQuestAutoExport()
  initializedRawQuestAutoExport = false
  unsubscribeRawQuestAutoExport = store.subscribe(() =>
    handleRawQuestAutoExportState(store.getState()),
  )
  handleRawQuestAutoExportState(store.getState())
}

export const stopRawQuestSnapshotAutoExport = () => {
  unsubscribeRawQuestAutoExport()
  unsubscribeRawQuestAutoExport = noop
  clearPendingAutoExport()
}
