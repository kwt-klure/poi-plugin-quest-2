import type { DocQuest } from '../questHelper'
import { questOverrides } from './data'
import type {
  QuestCategoryKey,
  QuestCategoryMap,
  QuestCodeMap,
  QuestDocMap,
  QuestDocPartialMap,
  QuestOverrides,
  QuestPrePostMap,
} from './types'

const QUEST_CATEGORY_KEYS: QuestCategoryKey[] = [
  'dailyQuest',
  'weeklyQuest',
  'monthlyQuest',
  'quarterlyQuest',
  'yearlyQuest',
  'singleQuest',
]

const mergeDocPartialMaps = (
  base: QuestDocPartialMap = {},
  override: QuestDocPartialMap = {},
) => {
  const merged: QuestDocPartialMap = { ...base }
  Object.entries(override).forEach(([gameId, quest]) => {
    merged[gameId] = { ...(merged[gameId] ?? {}), ...quest }
  })
  return merged
}

const resolveQuestMapEntry = (
  baseQuest: DocQuest | undefined,
  overrideQuest: Partial<DocQuest>,
) => {
  const mergedQuest = {
    ...(baseQuest ?? {}),
    ...overrideQuest,
  }

  if (!mergedQuest.code || !mergedQuest.name || !mergedQuest.desc) {
    return null
  }

  return mergedQuest as DocQuest
}

const getQuestDocOverrides = (
  overrides: QuestOverrides,
  dataSource: string | null | undefined,
) => {
  const shared = overrides.quests?.shared ?? {}
  const dataSourceSpecific = dataSource
    ? overrides.quests?.byDataSource?.[dataSource] ?? {}
    : {}
  return mergeDocPartialMaps(shared, dataSourceSpecific)
}

export const mergeQuestMap = (
  baseQuestMap: QuestDocMap,
  dataSource: string | null | undefined,
  overrides: QuestOverrides = questOverrides,
) => {
  const mergedQuestMap: QuestDocMap = { ...baseQuestMap }
  const docOverrides = getQuestDocOverrides(overrides, dataSource)

  Object.entries(docOverrides).forEach(([gameId, overrideQuest]) => {
    const mergedQuest = resolveQuestMapEntry(
      mergedQuestMap[gameId],
      overrideQuest,
    )
    if (!mergedQuest) {
      return
    }
    mergedQuestMap[gameId] = mergedQuest
  })

  return mergedQuestMap
}

export const mergeQuestCodeMap = (
  baseQuestCodeMap: QuestCodeMap,
  overrides: QuestOverrides = questOverrides,
) => ({
  ...baseQuestCodeMap,
  ...(overrides.questCodeMap ?? {}),
})

export const mergePrePostQuest = (
  basePrePostQuest: QuestPrePostMap,
  overrides: QuestOverrides = questOverrides,
) => {
  const mergedPrePostQuest: QuestPrePostMap = { ...basePrePostQuest }

  Object.entries(overrides.prePostQuest ?? {}).forEach(([gameId, override]) => {
    mergedPrePostQuest[gameId] = {
      pre: [...override.pre],
      post: [...override.post],
    }
  })

  return mergedPrePostQuest
}

export const mergeNewQuestIds = (
  baseNewQuestIds: Array<number | string>,
  overrides: QuestOverrides = questOverrides,
) =>
  Array.from(
    new Set([
      ...baseNewQuestIds.map(String),
      ...(overrides.newQuestIds ?? []).map(String),
    ]),
  )

export const mergeQuestCategory = (
  baseQuestCategory: QuestCategoryMap,
  overrides: QuestOverrides = questOverrides,
) =>
  Object.fromEntries(
    QUEST_CATEGORY_KEYS.map((key) => [
      key,
      Array.from(
        new Set([
          ...baseQuestCategory[key],
          ...((overrides.questCategory?.[key] ?? []) as number[]),
        ]),
      ),
    ]),
  ) as QuestCategoryMap

export type {
  QuestCategoryMap,
  QuestCodeMap,
  QuestDocMap,
  QuestDocPartialMap,
  QuestOverrides,
  QuestPrePostMap,
}
