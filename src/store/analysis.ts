import { useMemo } from 'react'
import {
  buildQuestAnalysisDebugMap,
  buildQuestAnalysisMap,
  summarizeQuestAnalysis,
} from '../analysis'
import { QUEST_REQUIREMENTS } from '../requirements'
import { useImportedInventory } from './importedInventory'
import { useGlobalQuestStatusQuery } from './gameQuest'
import { useQuest } from './quest'

export const useQuestAnalysisMap = () => {
  const quests = useQuest()
  const inventory = useImportedInventory()
  const questStatusQuery = useGlobalQuestStatusQuery()

  return useMemo(
    () =>
      buildQuestAnalysisMap(
        quests,
        QUEST_REQUIREMENTS,
        inventory,
        questStatusQuery,
      ),
    [inventory, questStatusQuery, quests],
  )
}

export const useQuestAnalysisSummary = () => {
  const analysisMap = useQuestAnalysisMap()
  return useMemo(() => summarizeQuestAnalysis(analysisMap), [analysisMap])
}

export const useQuestAnalysisDebugMap = () => {
  const quests = useQuest()
  const inventory = useImportedInventory()
  const questStatusQuery = useGlobalQuestStatusQuery()

  return useMemo(
    () =>
      buildQuestAnalysisDebugMap(
        quests,
        QUEST_REQUIREMENTS,
        inventory,
        questStatusQuery,
      ),
    [inventory, questStatusQuery, quests],
  )
}
