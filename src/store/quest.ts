import { useMemo } from 'react'
import { QUEST_DATA } from '../../build'
import { usePluginTranslation } from '../poi/hooks'
import { mergeQuestMap } from '../questOverrides'
import {
  DocQuest,
  getCategory,
  getQuestIdByCode,
  QUEST_STATUS,
  UnionQuest,
} from '../questHelper'
import {
  useGlobalGameQuest,
  useGlobalObservedGameQuest,
  useGlobalQuestStatusQuery,
} from './gameQuest'
import { DataSource, useStore } from './store'

const useLanguage = () => {
  const {
    i18n: { language },
  } = usePluginTranslation()
  return language
}

export const useDataSource = () => {
  const {
    store: { dataSource },
    updateStore,
  } = useStore()
  const lang = useLanguage()
  const setDataSource = (val: DataSource | null) =>
    updateStore({ dataSource: val })
  const isValid =
    dataSource && Object.values(QUEST_DATA).find((i) => i.key === dataSource)
  const normalizedDataSource = isValid
    ? dataSource
    : (QUEST_DATA.find((i) => i.lang === lang)?.key ?? QUEST_DATA[0].key)
  return { dataSource: normalizedDataSource, setDataSource }
}

export const buildUnionQuests = (
  docQuestMap: Record<string, DocQuest>,
  gameQuest: ReturnType<typeof useGlobalGameQuest>,
  observedGameQuest: ReturnType<typeof useGlobalObservedGameQuest>,
): UnionQuest[] => {
  const currentGameQuestMap = new Map(
    gameQuest.map((quest) => [quest.api_no, quest]),
  )
  const observedGameQuestMap = new Map(
    observedGameQuest.map((quest) => [quest.api_no, quest]),
  )

  const knownQuests = Object.entries(docQuestMap).map(([gameId, val]) => {
    const parsedGameId = Number(gameId)
    return {
      gameId: parsedGameId,
      gameQuest:
        currentGameQuestMap.get(parsedGameId) ??
        observedGameQuestMap.get(parsedGameId),
      docQuest: val,
    }
  })

  const unknownObservedQuests = Array.from(observedGameQuestMap.values())
    .filter((quest) => !(String(quest.api_no) in docQuestMap))
    .sort((left, right) => left.api_no - right.api_no)
    .map((quest) => ({
      gameId: quest.api_no,
      gameQuest: quest,
      docQuest: {
        code: `${getCategory(quest.api_category).wikiSymbol}?`,
        name: quest.api_title,
        desc: quest.api_detail,
      },
    }))

  return [...knownQuests, ...unknownObservedQuests]
}

const useQuestMap = (): Record<string, DocQuest> => {
  const { dataSource } = useDataSource()
  if (!QUEST_DATA.length) {
    throw new Error('QUEST_DATA is empty')
  }
  const data = QUEST_DATA.find((i) => i.key === dataSource) ?? QUEST_DATA[0]
  return useMemo(() => mergeQuestMap(data.res, data.key), [data.key, data.res])
}

export const useQuest = (): UnionQuest[] => {
  const docQuestMap = useQuestMap()
  const gameQuest = useGlobalGameQuest()
  const observedGameQuest = useGlobalObservedGameQuest()

  return useMemo(
    () => buildUnionQuests(docQuestMap, gameQuest, observedGameQuest),
    [docQuestMap, gameQuest, observedGameQuest],
  )
}

export const useQuestByCode = (code: string) => {
  const questMap = useQuestMap()
  const gameId = getQuestIdByCode(code)
  if (gameId && gameId in questMap) {
    return {
      gameId,
      docQuest: questMap[String(gameId) as keyof typeof questMap],
    }
  }
  return null
}

/**
 * Get the completion status of a specific game quest
 */
export const useQuestStatus = (gameId: number | null) => {
  const searcher = useGlobalQuestStatusQuery()
  if (!gameId) {
    return QUEST_STATUS.UNKNOWN
  }
  return searcher(gameId)
}
