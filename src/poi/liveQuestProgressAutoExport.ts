import PKG from '../../package.json'
import {
  buildLiveQuestProgressExportPayload,
  type LiveQuestProgressExportPayload,
  type LiveQuestProgressState,
} from '../liveQuestProgress'
import { getStorage } from '../store'
import { noop } from '../utils'
import { cleanupOldAutoExportFiles } from './autoExportCleanup'
import { PACKAGE_NAME } from './env'
import { resolvePoiInventoryExportDirectory } from './exportDirectory'
import { getPoiStore } from './store'
import type { PoiState } from './types'

export const LIVE_QUEST_PROGRESS_FILE_PREFIX = 'kancolle_live_quest_progress'
export const LIVE_QUEST_PROGRESS_AUTO_EXPORT_DEBOUNCE_MS = 1500

let lastSeenAutoExportKey: string | null = null
let pendingAutoExportKey: string | null = null
let pendingAutoExportTimeout: ReturnType<typeof setTimeout> | null = null
let unsubscribeLiveQuestProgressAutoExport: () => void = noop
let initializedLiveQuestProgressAutoExport = false
const emptyLiveQuestProgress: LiveQuestProgressState = {
  records: {},
  lastUpdatedAt: null,
}

const formatLiveQuestProgressTimestamp = (date: Date) =>
  date.toISOString().replace(/[-:]/g, '').replace(/\..+$/, '').replace('T', '-')

export const buildLiveQuestProgressFileName = (date = new Date()) =>
  `${LIVE_QUEST_PROGRESS_FILE_PREFIX}_${formatLiveQuestProgressTimestamp(
    date,
  )}.json`

export const shouldAutoExportLiveQuestProgress = (
  payload: LiveQuestProgressExportPayload,
) => Object.keys(payload.live_progress_now).length > 0

export const buildLiveQuestProgressAutoExportKey = (
  payload: LiveQuestProgressExportPayload,
) =>
  JSON.stringify(
    Object.entries(payload.live_progress_now)
      .sort(([left], [right]) => Number(left) - Number(right))
      .map(([questId, record]) => ({
        questId,
        code: record.code,
        summary: record.summary,
        goals: record.goals.map((goal) => ({
          id: goal.id,
          count: goal.count,
          required: goal.required,
          eventKeys: goal.eventKeys,
        })),
      })),
  )

const shouldAutoExportFromStorage = () =>
  getStorage()?.autoExportLiveQuestProgress ?? true

const clearPendingAutoExport = () => {
  if (pendingAutoExportTimeout) {
    clearTimeout(pendingAutoExportTimeout)
  }
  pendingAutoExportKey = null
  pendingAutoExportTimeout = null
}

export const selectLiveQuestProgressAutoExportState = (state: PoiState) =>
  state?.ext?.[PACKAGE_NAME]?._?.liveQuestProgress ?? emptyLiveQuestProgress

export const createLiveQuestProgressAutoExportStateListener = (
  onRelevantState: (state: PoiState) => void,
) => {
  let previousLiveQuestProgress: LiveQuestProgressState | null = null

  return (state: PoiState) => {
    const nextLiveQuestProgress = selectLiveQuestProgressAutoExportState(state)
    if (previousLiveQuestProgress === nextLiveQuestProgress) {
      return
    }

    previousLiveQuestProgress = nextLiveQuestProgress
    onRelevantState(state)
  }
}

const buildLiveQuestProgressPayloadFromPoiState = (state: PoiState) =>
  buildLiveQuestProgressExportPayload({
    pluginVersion: PKG.version,
    state: selectLiveQuestProgressAutoExportState(state),
  })

export const writeLiveQuestProgressPayloadToExportLane = (
  payload: LiveQuestProgressExportPayload,
) => {
  const remote = (globalThis as { remote?: any }).remote
  if (!remote?.require) {
    throw new Error('Failed to auto-export live quest progress! remote unavailable')
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
  const filePath = path.join(targetDirectory, buildLiveQuestProgressFileName())
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2))
  try {
    cleanupOldAutoExportFiles({
      fs,
      path,
      targetDirectory,
      currentFilePath: filePath,
      filePrefix: LIVE_QUEST_PROGRESS_FILE_PREFIX,
    })
  } catch (error) {
    console.warn('Failed to clean old live quest progress snapshots', error)
  }
  return filePath as string
}

const queueAutoExport = (
  payload: LiveQuestProgressExportPayload,
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
      const filePath = writeLiveQuestProgressPayloadToExportLane(payload)
      lastSeenAutoExportKey = key
      console.info('Auto-exported live quest progress', filePath)
    } catch (error) {
      console.warn('Failed to auto-export live quest progress', error)
    } finally {
      pendingAutoExportKey = null
      pendingAutoExportTimeout = null
    }
  }, LIVE_QUEST_PROGRESS_AUTO_EXPORT_DEBOUNCE_MS)
}

const handleLiveQuestProgressAutoExportState = (state: PoiState) => {
  const payload = buildLiveQuestProgressPayloadFromPoiState(state)
  const key = shouldAutoExportLiveQuestProgress(payload)
    ? buildLiveQuestProgressAutoExportKey(payload)
    : null

  if (!initializedLiveQuestProgressAutoExport) {
    initializedLiveQuestProgressAutoExport = true
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

export const startLiveQuestProgressAutoExport = async () => {
  const store = await getPoiStore()
  unsubscribeLiveQuestProgressAutoExport()
  initializedLiveQuestProgressAutoExport = false
  const handleRelevantState = createLiveQuestProgressAutoExportStateListener(
    handleLiveQuestProgressAutoExportState,
  )
  unsubscribeLiveQuestProgressAutoExport = store.subscribe(() =>
    handleRelevantState(store.getState()),
  )
  handleRelevantState(store.getState())
}

export const stopLiveQuestProgressAutoExport = () => {
  unsubscribeLiveQuestProgressAutoExport()
  unsubscribeLiveQuestProgressAutoExport = noop
  clearPendingAutoExport()
}
