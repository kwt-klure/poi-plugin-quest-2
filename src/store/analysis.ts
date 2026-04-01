import { useMemo } from 'react'
import {
  buildQuestAnalysisDebugMap,
  buildQuestAnalysisMap,
  summarizeQuestAnalysis,
} from '../analysis'
import { QUEST_REQUIREMENTS } from '../requirements'
import { useImportedInventory } from './importedInventory'
import { useGlobalQuestStatusQuery } from './gameQuest'
import { usePoiInventory } from '../poi/inventory'
import { useQuest } from './quest'
import { resolveInventorySnapshot } from './resolvedInventory'

export const useQuestAnalysisMap = () => {
  const quests = useQuest()
  const importedInventory = useImportedInventory()
  const poiInventory = usePoiInventory()
  const questStatusQuery = useGlobalQuestStatusQuery()
  const inventory = useMemo(
    () => resolveInventorySnapshot(poiInventory, importedInventory),
    [importedInventory, poiInventory],
  )

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
  const importedInventory = useImportedInventory()
  const poiInventory = usePoiInventory()
  const questStatusQuery = useGlobalQuestStatusQuery()
  const inventory = useMemo(
    () => resolveInventorySnapshot(poiInventory, importedInventory),
    [importedInventory, poiInventory],
  )

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
