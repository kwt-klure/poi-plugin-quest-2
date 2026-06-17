import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { QuestExportPayload } from '../export'
import type { LiveQuestProgressState } from '../liveQuestProgress'
import {
  RAW_QUEST_TAB_OBSERVED_ACTION_TYPE,
  buildRawQuestSnapshotFileName,
} from '../rawQuestSnapshot'
import type {
  RawQuestPageMap,
  RawQuestSnapshotExportPayload,
  RawQuestTabObservationMap,
} from '../rawQuestSnapshot'
import { PACKAGE_NAME } from './env'
import { resolvePoiInventoryExportDirectory } from './exportDirectory'
import {
  exportPoiState,
  getPoiStore,
  importPoiState,
  observePluginStore,
  observePoiStore,
} from './store'
import { GameQuest, PoiQuestState, PoiState, QuestTab } from './types'

export const activeQuestsSelector = (state: PoiState): PoiQuestState =>
  state?.info?.quests?.activeQuests ?? {}

export const useActiveQuest = () => {
  const [activeQuests, setActiveQuests] = useState<PoiQuestState>({})

  useEffect(() => {
    const listener = (activeQuests: PoiQuestState) =>
      setActiveQuests(activeQuests)

    return observePoiStore(listener, activeQuestsSelector)
  }, [])

  return activeQuests
}

export const usePluginTranslation = () => {
  // @ts-expect-error we declared a incorrect types in i18n/index.ts
  return useTranslation(PACKAGE_NAME)
}

const emptyArray: GameQuest[] = []
const emptyLiveQuestProgress: LiveQuestProgressState = {
  records: {},
  lastUpdatedAt: null,
}
/**
 * Use `useGlobalGameQuest` instead
 *
 * Only use this hook to set context
 */
export const useGameQuest = () => {
  const [quests, setQuests] = useState<GameQuest[]>([])
  useEffect(() => {
    const listener = (quests: GameQuest[] | null) =>
      setQuests(quests ?? emptyArray)
    // See reducer.ts
    return observePluginStore(listener, (i) => i?._?.questList)
  }, [setQuests])
  return quests
}

export const usePoiLiveQuestProgress = () => {
  const [liveQuestProgress, setLiveQuestProgress] =
    useState<LiveQuestProgressState>(emptyLiveQuestProgress)
  useEffect(() => {
    const listener = (progress: LiveQuestProgressState | null) =>
      setLiveQuestProgress(progress ?? emptyLiveQuestProgress)
    return observePluginStore(
      listener,
      (i) => i?._?.liveQuestProgress ?? null,
    )
  }, [])
  return liveQuestProgress
}

export const useObservedGameQuest = () => {
  const [quests, setQuests] = useState<GameQuest[]>([])
  useEffect(() => {
    const listener = (observedQuestMap: Record<number, GameQuest> | null) =>
      setQuests(observedQuestMap ? Object.values(observedQuestMap) : emptyArray)
    return observePluginStore(listener, (i) => i?._?.observedQuestMap ?? null)
  }, [setQuests])
  return quests
}

export const useRawQuestPages = () => {
  const [rawQuestPages, setRawQuestPages] = useState<RawQuestPageMap>({})
  useEffect(() => {
    const listener = (pages: RawQuestPageMap | null) =>
      setRawQuestPages(pages ?? {})
    return observePluginStore(listener, (i) => i?._?.rawQuestPages ?? null)
  }, [setRawQuestPages])
  return rawQuestPages
}

export const useRawQuestTabObservations = () => {
  const [rawQuestTabObservations, setRawQuestTabObservations] =
    useState<RawQuestTabObservationMap>({})
  useEffect(() => {
    const listener = (observations: RawQuestTabObservationMap | null) =>
      setRawQuestTabObservations(observations ?? {})
    return observePluginStore(
      listener,
      (i) => i?._?.rawQuestTabObservations ?? null,
    )
  }, [setRawQuestTabObservations])
  return rawQuestTabObservations
}

export const useGameTab = () => {
  const [tab, setTab] = useState<QuestTab>(QuestTab.ALL)
  useEffect(() => {
    const listener = (tabId: QuestTab | null) => setTab(tabId ?? QuestTab.ALL)
    return observePluginStore(listener, (i) => i?._?.tabId)
  }, [])
  return tab
}

const UNKNOWN_TAB = 'unknown'
const useActiveTab = () => {
  const [activeMainTab, setActiveMainTab] = useState<string>(UNKNOWN_TAB)

  useEffect(() => {
    const listener = (activeMainTab: string) => setActiveMainTab(activeMainTab)
    // poooi/poi/views/redux/ui.es
    return observePoiStore(
      listener,
      (state) => state?.ui?.activeMainTab ?? UNKNOWN_TAB,
    )
  }, [])

  return activeMainTab
}

export const useIsQuestPluginTab = () => {
  const activeMainTab = useActiveTab()
  return activeMainTab === PACKAGE_NAME
}

export const useMarkRawQuestTabObserved = () =>
  useCallback(async (tabId: QuestTab) => {
    const store = await getPoiStore()
    if (!store.dispatch) {
      throw new Error('Failed to mark quest tab! Poi dispatch unavailable!')
    }
    store.dispatch({
      type: RAW_QUEST_TAB_OBSERVED_ACTION_TYPE,
      tabId,
      observedAt: new Date().toISOString(),
      source: 'manual-empty-tab',
    })
  }, [])

const checkQuestList = (questList: unknown): questList is GameQuest[] => {
  if (!Array.isArray(questList)) {
    return false
  }
  // just a simple check
  return questList.every((q) => q && q.api_no)
}

export const useStateExporter = () => {
  const assertQuestListAvailable = async () => {
    const state = await exportPoiState()
    if (!state?.ext?.[PACKAGE_NAME]?._?.questList) {
      console.error('poi state', state)
      throw new Error('Failed to export quest data! questList not found!')
    }
  }

  const getRawQuestArchiveDirectory = (remote: any) => {
    const path = remote.require('path')
    const fs = remote.require('fs')
    return resolvePoiInventoryExportDirectory({
      documentsPath: remote.app.getPath('documents'),
      existsSync: fs.existsSync,
      joinPath: path.join,
      realpathSync: fs.realpathSync,
    }).path
  }

  const buildTimestampedFileName = (
    fileNamePrefix: string,
    date = new Date(),
  ) =>
    `${fileNamePrefix}-${date
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\..+$/, '')
      .replace('T', '-')}.json`

  const getRemote = () => {
    const remote = (globalThis as { remote?: any }).remote
    if (!remote?.dialog?.showSaveDialog || !remote?.require) {
      throw new Error(
        'Failed to export quest data! Save dialog is unavailable!',
      )
    }
    return remote
  }

  const exportJsonPayloadToFile = async (
    payload: QuestExportPayload | RawQuestSnapshotExportPayload,
    fileName: string,
    options: {
      defaultDirectory?: (remote: any) => string
      requireQuestList?: boolean
    } = {},
  ) => {
    if (options.requireQuestList ?? true) {
      await assertQuestListAvailable()
    }

    const remote = getRemote()
    const path = remote.require('path')
    const defaultDirectory =
      options.defaultDirectory?.(remote) ?? remote.app.getPath('documents')
    const defaultPath = path.join(defaultDirectory, fileName)
    const result = await remote.dialog.showSaveDialog({
      defaultPath,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    })

    if (result.canceled || !result.filePath) {
      return false
    }

    const fs = remote.require('fs')
    fs.writeFileSync(result.filePath, JSON.stringify(payload, null, 2))
    return true
  }

  const writeJsonPayloadToFile = async (
    payload: RawQuestSnapshotExportPayload,
    fileName: string,
    directory: (remote: any) => string,
  ) => {
    const remote = getRemote()
    const fs = remote.require('fs')
    const path = remote.require('path')
    const targetDirectory = directory(remote)
    fs.mkdirSync(targetDirectory, { recursive: true })
    const filePath = path.join(targetDirectory, fileName)
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2))
    return filePath as string
  }

  const exportQuestDataToFile = async (payload: QuestExportPayload) =>
    exportJsonPayloadToFile(
      payload,
      buildTimestampedFileName('poi-quest-analysis'),
      {
        requireQuestList: true,
      },
    )

  const exportRawQuestSnapshotToFile = async (
    payload: RawQuestSnapshotExportPayload,
  ) =>
    exportJsonPayloadToFile(payload, buildRawQuestSnapshotFileName(), {
      defaultDirectory: getRawQuestArchiveDirectory,
      requireQuestList: false,
    })

  const exportRawQuestSnapshotToArchive = async (
    payload: RawQuestSnapshotExportPayload,
  ) =>
    writeJsonPayloadToFile(
      payload,
      buildRawQuestSnapshotFileName(),
      getRawQuestArchiveDirectory,
    )

  const importAsPoiState = (stateString: string) => {
    const maybeQuestList: unknown = JSON.parse(stateString)

    if (!checkQuestList(maybeQuestList)) {
      console.error(maybeQuestList)
      throw new Error('Failed to import quest state! Incorrect data format!')
    }

    importPoiState({
      ext: {
        [PACKAGE_NAME]: {
          _: {
            questList: maybeQuestList,
            observedQuestMap: Object.fromEntries(
              maybeQuestList.map((quest) => [quest.api_no, quest]),
            ),
            rawQuestPages: {},
            rawQuestTabObservations: {},
            liveQuestProgress: emptyLiveQuestProgress,
            tabId: QuestTab.ALL,
          },
        },
      },
      ui: {
        activeMainTab: '',
        activeFleetId: undefined,
        activePluginName: undefined,
      },
      plugins: [],
    })
  }

  return {
    exportQuestDataToFile,
    exportRawQuestSnapshotToArchive,
    exportRawQuestSnapshotToFile,
    importAsPoiState,
  }
}
