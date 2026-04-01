import type { DocQuest } from '../questHelper'

export type QuestDocMap = Record<string, DocQuest>
export type QuestDocPartialMap = Record<string, Partial<DocQuest>>
export type QuestCodeMap = Record<string, number>

export type QuestPrePost = {
  pre: string[]
  post: string[]
}

export type QuestPrePostMap = Record<string, QuestPrePost>

export type QuestCategoryKey =
  | 'dailyQuest'
  | 'weeklyQuest'
  | 'monthlyQuest'
  | 'quarterlyQuest'
  | 'yearlyQuest'
  | 'singleQuest'

export type QuestCategoryMap = Record<QuestCategoryKey, number[]>

export type QuestOverrides = {
  quests?: {
    shared?: QuestDocPartialMap
    byDataSource?: Record<string, QuestDocPartialMap>
  }
  questCodeMap?: QuestCodeMap
  prePostQuest?: QuestPrePostMap
  newQuestIds?: Array<number | string>
  questCategory?: Partial<QuestCategoryMap>
}
