import { QUEST_STATUS, type UnionQuest } from './questHelper'
import { resolveQuestRequirement, SHIP_GROUPS } from './requirements'
import type {
  PositionRequirement,
  QuestRequirement,
  QuestRequirementBase,
  QuestRequirementBranch,
  ShipRequirement,
} from './requirements'
import type { ImportedInventoryState } from './importedInventory/types'

export type OwnedShip = {
  id: string
  shipId: number
  name: string
  shipType: number
  shipClass: number
  compatibleNames: string[]
  remodelRank: number
}

export type OwnedEquipment = {
  id: string
  equipmentId: number
  name: string
  type2: number
}

export interface InventorySnapshot {
  ships: OwnedShip[]
  equipments: OwnedEquipment[]
}

export type QuestStructuralFeasibility =
  | 'ready'
  | 'missing_ships'
  | 'missing_equipments'
  | 'missing_both'
  | 'missing_inventory'
  | 'not_applicable'
  | 'unsupported'

export type QuestPlanningStatus =
  | 'actionable'
  | 'blocked'
  | 'already_done'
  | 'probably_done'
  | 'state_unknown'
  | 'not_applicable'
  | 'unsupported'

export type QuestAcceptability = 'available' | 'locked' | 'unknown'

export type QuestCompletionState =
  | 'completed_live'
  | 'completed_inferred'
  | 'incomplete'
  | 'unknown'

export type QuestAnalysisOrigin = 'curated' | 'inferred' | 'none'

export interface QuestAnalysis {
  gameId: number
  status: QuestPlanningStatus
  structuralFeasibility: QuestStructuralFeasibility
  acceptability: QuestAcceptability
  completionState: QuestCompletionState
  origin: QuestAnalysisOrigin
  missingShips: string[]
  missingEquipments: string[]
  missingInventoryParts: Array<'ships' | 'equipments'>
  notes: string[]
  requirement: QuestRequirement | null
}

export interface QuestAnalysisSummary {
  actionable: number
  blocked: number
  already_done: number
  probably_done: number
  state_unknown: number
  not_applicable: number
  unsupported: number
}

type ShipMatcher = {
  label: string
  count: number
  match: (ship: OwnedShip) => boolean
}

type RequirementEvaluation = {
  status: QuestStructuralFeasibility
  missingShips: string[]
  missingEquipments: string[]
  missingInventoryParts: Array<'ships' | 'equipments'>
  notes: string[]
}

type EvaluatedAlternative = {
  label: string
  requirement: QuestRequirementBase
  evaluation: RequirementEvaluation
}

export interface ShipMatcherDebug {
  label: string
  count: number
  matchedShips: Array<{
    id: string
    name: string
    remodelRank: number
    compatibleNames: string[]
  }>
  missing: number
}

export interface EquipmentMatcherDebug {
  label: string
  count: number
  matchedEquipments: Array<{
    id: string
    name: string
    type2: number
  }>
  missing: number
}

export interface QuestAnalysisDebug {
  gameId: number
  status: QuestPlanningStatus
  structuralFeasibility: QuestStructuralFeasibility
  acceptability: QuestAcceptability
  completionState: QuestCompletionState
  origin: QuestAnalysisOrigin
  shipMatchers: ShipMatcherDebug[]
  equipmentMatchers: EquipmentMatcherDebug[]
}

type QuestLiveState = {
  acceptability: QuestAcceptability
  completionState: QuestCompletionState
}

const resolveShipNames = (shipRequirement: ShipRequirement): string[] => {
  if (shipRequirement.group) {
    return SHIP_GROUPS[shipRequirement.group] ?? []
  }
  return shipRequirement.names ?? []
}

const matchPositionRequirement = (
  ship: OwnedShip,
  positionRequirement: PositionRequirement,
) =>
  ((positionRequirement.names ?? []).some((requiredName) =>
    ship.compatibleNames.includes(requiredName),
  ) &&
    ship.remodelRank >= (positionRequirement.minRemodelRank ?? 0)) ||
  (positionRequirement.shipTypes?.includes(ship.shipType) ?? false) ||
  (positionRequirement.shipClasses?.includes(ship.shipClass) ?? false)

const buildShipMatcher = (requirement: QuestRequirementBase): ShipMatcher[] => {
  const matchers: ShipMatcher[] = []

  requirement.positions?.flagship?.forEach((positionRequirement) => {
    matchers.push({
      label: positionRequirement.label,
      count: 1,
      match: (ship) => matchPositionRequirement(ship, positionRequirement),
    })
  })

  requirement.positions?.second?.forEach((positionRequirement) => {
    matchers.push({
      label: positionRequirement.label,
      count: 1,
      match: (ship) => matchPositionRequirement(ship, positionRequirement),
    })
  })

  requirement.ships?.forEach((shipRequirement) => {
    const names = resolveShipNames(shipRequirement)
    matchers.push({
      label: shipRequirement.label,
      count: shipRequirement.count ?? 1,
      match: (ship) =>
        ship.remodelRank >= (shipRequirement.minRemodelRank ?? 0) &&
        names.some((requiredName) => ship.compatibleNames.includes(requiredName)),
    })
  })

  requirement.shipTypes?.forEach((shipTypeRequirement) => {
    matchers.push({
      label: shipTypeRequirement.label,
      count: shipTypeRequirement.count,
      match: (ship) => shipTypeRequirement.shipTypes.includes(ship.shipType),
    })
  })

  requirement.shipClasses?.forEach((shipClassRequirement) => {
    matchers.push({
      label: shipClassRequirement.label,
      count: shipClassRequirement.count,
      match: (ship) => shipClassRequirement.shipClasses.includes(ship.shipClass),
    })
  })

  return matchers
}

const buildEquipmentDeficits = (
  requirement: QuestRequirementBase,
  inventory: InventorySnapshot,
): string[] =>
  (requirement.equipments ?? [])
    .map((equipmentRequirement) => {
      const matches = inventory.equipments.filter((equipment) => {
        if (equipmentRequirement.names?.includes(equipment.name)) {
          return true
        }
        if (equipmentRequirement.type2?.includes(equipment.type2)) {
          return true
        }
        return false
      }).length
      const missing = Math.max(0, equipmentRequirement.count - matches)
      return missing > 0 ? `${equipmentRequirement.label} x${missing}` : null
    })
    .filter(Boolean) as string[]

const buildEquipmentMatcherDebug = (
  requirement: QuestRequirementBase,
  inventory: InventorySnapshot,
): EquipmentMatcherDebug[] =>
  (requirement.equipments ?? []).map((equipmentRequirement) => {
    const matchedEquipments = inventory.equipments
      .filter((equipment) => {
        if (equipmentRequirement.names?.includes(equipment.name)) {
          return true
        }
        if (equipmentRequirement.type2?.includes(equipment.type2)) {
          return true
        }
        return false
      })
      .map((equipment) => ({
        id: equipment.id,
        name: equipment.name,
        type2: equipment.type2,
      }))

    return {
      label: equipmentRequirement.label,
      count: equipmentRequirement.count,
      matchedEquipments,
      missing: Math.max(0, equipmentRequirement.count - matchedEquipments.length),
    }
  })

const buildShipDeficits = (
  requirement: QuestRequirementBase,
  inventory: InventorySnapshot,
): string[] =>
  buildShipMatcher(requirement)
    .map((matcher) => {
      const matches = inventory.ships.filter((ship) => matcher.match(ship)).length
      const missing = Math.max(0, matcher.count - matches)
      return missing > 0 ? `${matcher.label} x${missing}` : null
    })
    .filter(Boolean) as string[]

const canAssignShips = (matchers: ShipMatcher[], ships: OwnedShip[]): boolean => {
  const slots = matchers.flatMap((matcher) =>
    Array.from({ length: matcher.count }, (_, index) => ({
      key: `${matcher.label}-${index}`,
      match: matcher.match,
    })),
  )

  if (!slots.length) {
    return true
  }

  const orderedSlots = slots
    .map((slot) => ({
      ...slot,
      candidateIndexes: ships
        .map((ship, index) => (slot.match(ship) ? index : -1))
        .filter((index) => index !== -1),
    }))
    .sort((a, b) => a.candidateIndexes.length - b.candidateIndexes.length)

  const used = new Set<number>()

  const solve = (slotIndex: number): boolean => {
    if (slotIndex >= orderedSlots.length) {
      return true
    }

    const slot = orderedSlots[slotIndex]
    for (const candidateIndex of slot.candidateIndexes) {
      if (used.has(candidateIndex)) {
        continue
      }
      used.add(candidateIndex)
      if (solve(slotIndex + 1)) {
        return true
      }
      used.delete(candidateIndex)
    }
    return false
  }

  return solve(0)
}

const countMissingEntries = (entries: string[]) =>
  entries.reduce((total, entry) => {
    const matched = entry.match(/x(\d+)$/)
    if (!matched) {
      return total + 1
    }
    return total + Number(matched[1])
  }, 0)

const getBaseRequirement = (
  requirement: QuestRequirement,
): QuestRequirementBase => {
  const { anyOf: _anyOf, ...baseRequirement } = requirement
  return baseRequirement
}

const mergePositions = (
  base?: QuestRequirementBase['positions'],
  branch?: QuestRequirementBase['positions'],
): QuestRequirementBase['positions'] => {
  const flagship = [...(base?.flagship ?? []), ...(branch?.flagship ?? [])]
  const second = [...(base?.second ?? []), ...(branch?.second ?? [])]

  if (!flagship.length && !second.length) {
    return undefined
  }

  return {
    ...(flagship.length > 0 ? { flagship } : {}),
    ...(second.length > 0 ? { second } : {}),
  }
}

const mergeRequirementBranch = (
  baseRequirement: QuestRequirementBase,
  branch: QuestRequirementBranch,
): QuestRequirementBase => ({
  ships: [...(baseRequirement.ships ?? []), ...(branch.ships ?? [])],
  shipTypes: [...(baseRequirement.shipTypes ?? []), ...(branch.shipTypes ?? [])],
  shipClasses: [
    ...(baseRequirement.shipClasses ?? []),
    ...(branch.shipClasses ?? []),
  ],
  positions: mergePositions(baseRequirement.positions, branch.positions),
  equipments: [...(baseRequirement.equipments ?? []), ...(branch.equipments ?? [])],
  forbidden: [...(baseRequirement.forbidden ?? []), ...(branch.forbidden ?? [])],
  notes: [...(baseRequirement.notes ?? []), ...(branch.notes ?? [])],
})

const hasRequirementConditions = (requirement: QuestRequirementBase) =>
  Boolean(requirement.ships?.length) ||
  Boolean(requirement.shipTypes?.length) ||
  Boolean(requirement.shipClasses?.length) ||
  Boolean(requirement.positions?.flagship?.length) ||
  Boolean(requirement.positions?.second?.length)

const resolveQuestLiveState = (questStatus: QUEST_STATUS): QuestLiveState => {
  switch (questStatus) {
    case QUEST_STATUS.COMPLETED:
      return {
        acceptability: 'available',
        completionState: 'completed_live',
      }
    case QUEST_STATUS.ALREADY_COMPLETED:
      return {
        acceptability: 'available',
        completionState: 'completed_inferred',
      }
    case QUEST_STATUS.LOCKED:
      return {
        acceptability: 'locked',
        completionState: 'incomplete',
      }
    case QUEST_STATUS.DEFAULT:
    case QUEST_STATUS.IN_PROGRESS:
      return {
        acceptability: 'available',
        completionState: 'incomplete',
      }
    case QUEST_STATUS.UNKNOWN:
    default:
      return {
        acceptability: 'unknown',
        completionState: 'unknown',
      }
  }
}

const resolvePlanningStatus = ({
  acceptability,
  completionState,
  structuralFeasibility,
}: QuestLiveState & {
  structuralFeasibility: QuestStructuralFeasibility
}): QuestPlanningStatus => {
  if (completionState === 'completed_live') {
    return 'already_done'
  }
  if (completionState === 'completed_inferred') {
    return 'already_done'
  }
  if (acceptability === 'locked') {
    return 'blocked'
  }
  if (acceptability === 'unknown') {
    return 'state_unknown'
  }
  if (structuralFeasibility === 'ready') {
    return 'actionable'
  }
  if (structuralFeasibility === 'not_applicable') {
    return 'not_applicable'
  }
  if (structuralFeasibility === 'unsupported') {
    return 'unsupported'
  }
  return 'blocked'
}

const evaluateRequirement = (
  requirement: QuestRequirementBase,
  inventory: InventorySnapshot | ImportedInventoryState,
): RequirementEvaluation => {
  const requiresShips = hasRequirementConditions(requirement)
  const requiresEquipments = Boolean(requirement.equipments?.length)
  const missingInventoryParts: Array<'ships' | 'equipments'> = []

  if (requiresShips && 'shipCsv' in inventory && !inventory.shipCsv) {
    missingInventoryParts.push('ships')
  }
  if (requiresEquipments && 'equipmentCsv' in inventory && !inventory.equipmentCsv) {
    missingInventoryParts.push('equipments')
  }

  if (missingInventoryParts.length > 0) {
    return {
      status: 'missing_inventory',
      missingShips: [],
      missingEquipments: [],
      missingInventoryParts,
      notes: requirement.notes ?? [],
    }
  }

  const shipDeficits = buildShipDeficits(requirement, inventory)
  const equipmentDeficits = buildEquipmentDeficits(requirement, inventory)
  const shipReady = canAssignShips(buildShipMatcher(requirement), inventory.ships)
  const equipmentReady = equipmentDeficits.length === 0

  if (!shipReady && shipDeficits.length === 0) {
    shipDeficits.push('艦隊編成條件衝突 x1')
  }

  let status: QuestStructuralFeasibility = 'ready'
  if (!shipReady && !equipmentReady) {
    status = 'missing_both'
  } else if (!shipReady) {
    status = 'missing_ships'
  } else if (!equipmentReady) {
    status = 'missing_equipments'
  }

  return {
    status,
    missingShips: shipDeficits,
    missingEquipments: equipmentDeficits,
    missingInventoryParts: [],
    notes: requirement.notes ?? [],
  }
}

const pickClosestAlternative = (
  alternatives: EvaluatedAlternative[],
): EvaluatedAlternative =>
  alternatives.reduce((best, current) => {
    const bestScore =
      countMissingEntries(best.evaluation.missingShips) +
      countMissingEntries(best.evaluation.missingEquipments) +
      best.evaluation.missingInventoryParts.length
    const currentScore =
      countMissingEntries(current.evaluation.missingShips) +
      countMissingEntries(current.evaluation.missingEquipments) +
      current.evaluation.missingInventoryParts.length

    return currentScore < bestScore ? current : best
  })

const resolveRequirementEvaluation = (
  requirement: QuestRequirement,
  inventory: InventorySnapshot | ImportedInventoryState,
): {
  evaluation: RequirementEvaluation
  debugRequirement: QuestRequirementBase
} => {
  if (!requirement.anyOf?.length) {
    const baseRequirement = getBaseRequirement(requirement)
    return {
      evaluation: evaluateRequirement(baseRequirement, inventory),
      debugRequirement: baseRequirement,
    }
  }

  const baseRequirement = getBaseRequirement(requirement)
  const alternatives = requirement.anyOf.map((branch) => {
    const mergedRequirement = mergeRequirementBranch(baseRequirement, branch)
    return {
      label: branch.label,
      requirement: mergedRequirement,
      evaluation: evaluateRequirement(mergedRequirement, inventory),
    }
  })

  const matchedAlternative = alternatives.find(
    (alternative) => alternative.evaluation.status === 'ready',
  )
  if (matchedAlternative) {
    return {
      evaluation: {
        ...matchedAlternative.evaluation,
        notes: [
          ...matchedAlternative.evaluation.notes,
          `已符合替代條件：${matchedAlternative.label}`,
        ],
      },
      debugRequirement: matchedAlternative.requirement,
    }
  }

  const closestAlternative = pickClosestAlternative(alternatives)
  return {
    evaluation: {
      ...closestAlternative.evaluation,
      notes: [
        ...closestAlternative.evaluation.notes,
        `目前最接近的替代條件：${closestAlternative.label}`,
      ],
    },
    debugRequirement: closestAlternative.requirement,
  }
}

export const analyzeQuestRequirement = (
  gameId: number,
  requirement: QuestRequirement | null | undefined,
  inventory: InventorySnapshot | ImportedInventoryState,
  questStatus: QUEST_STATUS = QUEST_STATUS.UNKNOWN,
  origin: QuestAnalysisOrigin = 'curated',
): QuestAnalysis => {
  const liveState = resolveQuestLiveState(questStatus)

  if (!requirement) {
    return {
      gameId,
      status: resolvePlanningStatus({
        ...liveState,
        structuralFeasibility: 'unsupported',
      }),
      structuralFeasibility: 'unsupported',
      acceptability: liveState.acceptability,
      completionState: liveState.completionState,
      origin: 'none',
      missingShips: [],
      missingEquipments: [],
      missingInventoryParts: [],
      notes: [],
      requirement: null,
    }
  }

  const { evaluation } = resolveRequirementEvaluation(requirement, inventory)

  return {
    gameId,
    status: resolvePlanningStatus({
      ...liveState,
      structuralFeasibility: evaluation.status,
    }),
    structuralFeasibility: evaluation.status,
    acceptability: liveState.acceptability,
    completionState: liveState.completionState,
    origin,
    missingShips: evaluation.missingShips,
    missingEquipments: evaluation.missingEquipments,
    missingInventoryParts: evaluation.missingInventoryParts,
    notes: evaluation.notes,
    requirement,
  }
}

export const debugQuestRequirement = (
  gameId: number,
  requirement: QuestRequirement | null | undefined,
  inventory: InventorySnapshot | ImportedInventoryState,
  questStatus: QUEST_STATUS = QUEST_STATUS.UNKNOWN,
  origin: QuestAnalysisOrigin = 'curated',
): QuestAnalysisDebug => {
  const analysis = analyzeQuestRequirement(
    gameId,
    requirement,
    inventory,
    questStatus,
    origin,
  )
  if (!requirement) {
    return {
      gameId,
      status: analysis.status,
      structuralFeasibility: analysis.structuralFeasibility,
      acceptability: analysis.acceptability,
      completionState: analysis.completionState,
      origin: analysis.origin,
      shipMatchers: [],
      equipmentMatchers: [],
    }
  }

  const { debugRequirement } = resolveRequirementEvaluation(requirement, inventory)

  const shipMatchers = buildShipMatcher(debugRequirement).map((matcher) => {
    const matchedShips = inventory.ships
      .filter((ship) => matcher.match(ship))
      .map((ship) => ({
        id: ship.id,
        name: ship.name,
        remodelRank: ship.remodelRank,
        compatibleNames: ship.compatibleNames,
      }))

    return {
      label: matcher.label,
      count: matcher.count,
      matchedShips,
      missing: Math.max(0, matcher.count - matchedShips.length),
    }
  })

  return {
    gameId,
    status: analysis.status,
    structuralFeasibility: analysis.structuralFeasibility,
    acceptability: analysis.acceptability,
    completionState: analysis.completionState,
    origin: analysis.origin,
    shipMatchers,
    equipmentMatchers: buildEquipmentMatcherDebug(debugRequirement, inventory),
  }
}

const buildStaticQuestAnalysis = (
  gameId: number,
  structuralFeasibility: Extract<
    QuestStructuralFeasibility,
    'unsupported' | 'not_applicable'
  >,
  questStatus: QUEST_STATUS = QUEST_STATUS.UNKNOWN,
): QuestAnalysis => ({
  gameId,
  status: resolvePlanningStatus({
    ...resolveQuestLiveState(questStatus),
    structuralFeasibility,
  }),
  structuralFeasibility,
  ...resolveQuestLiveState(questStatus),
  origin: 'none',
  missingShips: [],
  missingEquipments: [],
  missingInventoryParts: [],
  notes: [],
  requirement: null,
})

export const buildQuestAnalysisMap = (
  quests: UnionQuest[],
  requirementMap: Record<number, QuestRequirement>,
  inventory: InventorySnapshot | ImportedInventoryState,
  questStatusQuery: (gameId: number) => QUEST_STATUS = () => QUEST_STATUS.UNKNOWN,
): Record<number, QuestAnalysis> =>
  Object.fromEntries(
    quests.map((quest) => {
      const questStatus = questStatusQuery(quest.gameId)
      const resolvedRequirement = resolveQuestRequirement(
        quest,
        requirementMap[quest.gameId],
      )

      switch (resolvedRequirement.kind) {
        case 'curated':
          return [
            quest.gameId,
            analyzeQuestRequirement(
              quest.gameId,
              resolvedRequirement.requirement,
              inventory,
              questStatus,
              'curated',
            ),
          ]
        case 'inferred':
          return [
            quest.gameId,
            analyzeQuestRequirement(
              quest.gameId,
              resolvedRequirement.requirement,
              inventory,
              questStatus,
              'inferred',
            ),
          ]
        case 'not_applicable':
          return [
            quest.gameId,
            buildStaticQuestAnalysis(quest.gameId, 'not_applicable', questStatus),
          ]
        case 'unsupported':
        default:
          return [
            quest.gameId,
            buildStaticQuestAnalysis(quest.gameId, 'unsupported', questStatus),
          ]
      }
    }),
  )

export const summarizeQuestAnalysis = (
  analysisMap: Record<number, QuestAnalysis>,
): QuestAnalysisSummary => {
  const summary: QuestAnalysisSummary = {
    actionable: 0,
    blocked: 0,
    already_done: 0,
    probably_done: 0,
    state_unknown: 0,
    not_applicable: 0,
    unsupported: 0,
  }

  Object.values(analysisMap).forEach((analysis) => {
    summary[analysis.status] += 1
  })

  return summary
}

export const isQuestActionable = (
  analysis: QuestAnalysis | null | undefined,
) => analysis?.status === 'actionable'

export const buildActionableQuestFilter =
  (analysisMap: Record<number, QuestAnalysis>) => (quest: UnionQuest) =>
    isQuestActionable(analysisMap[quest.gameId])

export const buildQuestAnalysisDebugMap = (
  quests: UnionQuest[],
  requirementMap: Record<number, QuestRequirement>,
  inventory: InventorySnapshot | ImportedInventoryState,
  questStatusQuery: (gameId: number) => QUEST_STATUS = () => QUEST_STATUS.UNKNOWN,
): Record<number, QuestAnalysisDebug> =>
  Object.fromEntries(
    quests.map((quest) => {
      const questStatus = questStatusQuery(quest.gameId)
      const resolvedRequirement = resolveQuestRequirement(
        quest,
        requirementMap[quest.gameId],
      )

      switch (resolvedRequirement.kind) {
        case 'curated':
          return [
            quest.gameId,
            debugQuestRequirement(
              quest.gameId,
              resolvedRequirement.requirement,
              inventory,
              questStatus,
              'curated',
            ),
          ]
        case 'inferred':
          return [
            quest.gameId,
            debugQuestRequirement(
              quest.gameId,
              resolvedRequirement.requirement,
              inventory,
              questStatus,
              'inferred',
            ),
          ]
        case 'not_applicable':
          return [
            quest.gameId,
            {
              gameId: quest.gameId,
              status: resolvePlanningStatus({
                ...resolveQuestLiveState(questStatus),
                structuralFeasibility: 'not_applicable',
              }),
              structuralFeasibility: 'not_applicable',
              ...resolveQuestLiveState(questStatus),
              origin: 'none',
              shipMatchers: [],
              equipmentMatchers: [],
            },
          ]
        case 'unsupported':
        default:
          return [
            quest.gameId,
            {
              gameId: quest.gameId,
              status: resolvePlanningStatus({
                ...resolveQuestLiveState(questStatus),
                structuralFeasibility: 'unsupported',
              }),
              structuralFeasibility: 'unsupported',
              ...resolveQuestLiveState(questStatus),
              origin: 'none',
              shipMatchers: [],
              equipmentMatchers: [],
            },
          ]
      }
    }),
  )
