import { QUEST_DATA } from '../build'
import type { GameQuest, PoiQuestState } from './poi/types'
import { mergeQuestMap } from './questOverrides'

export type LiveQuestProgressSource = 'text' | 'curated'
export type LiveQuestProgressRank = 'S' | 'A' | 'B'
export type LiveQuestProgressGoalKind = 'battle_boss_win' | 'map_terminal'
export type LiveQuestProgressStatus = 'not_started' | 'in_progress' | 'complete'

export interface LiveQuestProgressGoal {
  id: string
  kind: LiveQuestProgressGoalKind
  maps: number[]
  mapLabels: string[]
  rank?: LiveQuestProgressRank
  required: number
  count: number
  label: string
  eventKeys: string[]
}

export interface LiveQuestProgressRule {
  gameId: number
  code: string
  source: LiveQuestProgressSource
  text: string
  goals: LiveQuestProgressGoal[]
}

export interface LiveQuestProgressRecord extends LiveQuestProgressRule {
  accepted_now: true
  updatedAt: string | null
  summary: {
    completed: number
    total: number
    status: LiveQuestProgressStatus
  }
}

export interface LiveQuestProgressState {
  records: Record<number, LiveQuestProgressRecord>
  lastUpdatedAt: string | null
}

export type LiveQuestProgressEvent =
  | {
      key: string
      type: 'battle_result'
      map: number
      mapCell?: number
      boss: boolean
      rank: string
      observedAt: string
    }
  | {
      key: string
      type: 'map_terminal'
      map: number
      mapCell?: number
      observedAt: string
    }

export interface LiveQuestProgressQuestText {
  code: string
  text: string
}

export interface LiveQuestProgressExportPayload {
  schema_version: 'kancolle-live-quest-progress-v1'
  exported_at: string
  source: {
    plugin: 'poi-plugin-kc-quest-audit'
    plugin_version: string
    capture: 'poi-redux-sidecar'
  }
  live_progress_now: Record<string, LiveQuestProgressRecord>
}

const RANK_ORDER: Record<LiveQuestProgressRank, number> = {
  B: 1,
  A: 2,
  S: 3,
}

const FULL_WIDTH_DIGIT_OFFSET = '０'.charCodeAt(0) - '0'.charCodeAt(0)

const normalizeDigits = (text: string) =>
  text.replace(/[０-９]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) - FULL_WIDTH_DIGIT_OFFSET),
  )

const parseCountToken = (token: string | undefined) => {
  if (!token) {
    return null
  }
  const normalized = normalizeDigits(token)
  if (/^\d+$/.test(normalized)) {
    return Number(normalized)
  }
  const numerals: Record<string, number> = {
    一: 1,
    二: 2,
    兩: 2,
    两: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
    八: 8,
    九: 9,
    十: 10,
  }
  return numerals[normalized] ?? null
}

const parseRequiredCount = (text: string) => {
  const normalized = normalizeDigits(text)
  const matched = normalized.match(/(\d+|一|二|兩|两|三|四|五|六|七|八|九|十)\s*(?:次|回|場|场)/u)
  return parseCountToken(matched?.[1]) ?? 1
}

const parseMaps = (text: string) => {
  const maps: Array<{ id: number; label: string }> = []
  const normalized = normalizeDigits(text)
  const pattern = /([1-7])\s*[-ー－]\s*(\d)(?:\s*[Pp]\s*(\d))?/g
  let match: RegExpExecArray | null
  while ((match = pattern.exec(normalized)) !== null) {
    const area = Number(match[1])
    const map = Number(match[2])
    if (!Number.isFinite(area) || !Number.isFinite(map)) {
      continue
    }
    const label = `${area}-${map}${match[3] ? `P${match[3]}` : ''}`
    maps.push({ id: area * 10 + map, label })
  }
  return maps
}

const uniqMaps = (maps: Array<{ id: number; label: string }>) => {
  const seen = new Set<string>()
  return maps.filter((map) => {
    const key = `${map.id}:${map.label}`
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}

const detectGoalKind = (
  text: string,
): { kind: LiveQuestProgressGoalKind; rank?: LiveQuestProgressRank } | null => {
  if (/到達(?:終點|终点|資源點|资源点)|(?:終點|终点|資源點|资源点)/u.test(text)) {
    return { kind: 'map_terminal' }
  }
  if (/S\s*(?:勝|胜)/iu.test(text)) {
    return { kind: 'battle_boss_win', rank: 'S' }
  }
  if (/A\s*(?:勝|胜)|A\s*(?:勝|胜)(?:以上|及以上)/iu.test(text)) {
    return { kind: 'battle_boss_win', rank: 'A' }
  }
  if (/BOSS|Boss|boss|擊破|击破|擊敗|击败|消滅|消灭|勝|胜/u.test(text)) {
    return { kind: 'battle_boss_win', rank: 'B' }
  }
  return null
}

const rankLabel = (rank: LiveQuestProgressRank | undefined) => {
  if (!rank) {
    return ''
  }
  return rank === 'S' ? 'S' : `${rank}+`
}

const buildGoalLabel = (
  goal: Pick<
    LiveQuestProgressGoal,
    'kind' | 'mapLabels' | 'rank' | 'count' | 'required'
  >,
) => {
  const target = goal.mapLabels.join('/')
  const condition =
    goal.kind === 'map_terminal' ? 'terminal' : rankLabel(goal.rank)
  return `${target} ${condition} ${goal.count} / ${goal.required}`
}

const makeGoal = ({
  kind,
  maps,
  rank,
  required,
  index,
}: {
  kind: LiveQuestProgressGoalKind
  maps: Array<{ id: number; label: string }>
  rank?: LiveQuestProgressRank
  required: number
  index: number
}): LiveQuestProgressGoal => {
  const mapIds = maps.map((map) => map.id)
  const mapLabels = maps.map((map) => map.label)
  const id = [kind, mapLabels.join('_'), rank ?? 'any', required, index].join(':')
  const goal: LiveQuestProgressGoal = {
    id,
    kind,
    maps: mapIds,
    mapLabels,
    rank,
    required,
    count: 0,
    label: '',
    eventKeys: [],
  }
  return {
    ...goal,
    label: buildGoalLabel(goal),
  }
}

export const buildLiveQuestProgressRule = ({
  gameId,
  code,
  text,
  source = 'text',
}: {
  gameId: number
  code: string
  text: string
  source?: LiveQuestProgressSource
}): LiveQuestProgressRule | null => {
  const clauses = normalizeDigits(text)
    .split(/[，。；;！!]/u)
    .map((clause) => clause.trim())
    .filter(Boolean)
  const goals: LiveQuestProgressGoal[] = []
  let pendingMaps: Array<{ id: number; label: string }> = []

  clauses.forEach((clause) => {
    const parsedMaps = uniqMaps(parseMaps(clause))
    if (parsedMaps.length) {
      pendingMaps = parsedMaps
    }

    const goalKind = detectGoalKind(clause)
    const mapsForGoal = parsedMaps.length ? parsedMaps : pendingMaps
    if (!goalKind || !mapsForGoal.length) {
      return
    }

    const required = parseRequiredCount(clause)
    const separateByMap = /各/u.test(clause) && mapsForGoal.length > 1
    if (separateByMap) {
      mapsForGoal.forEach((map) => {
        goals.push(
          makeGoal({
            kind: goalKind.kind,
            maps: [map],
            rank: goalKind.rank,
            required,
            index: goals.length,
          }),
        )
      })
    } else {
      goals.push(
        makeGoal({
          kind: goalKind.kind,
          maps: mapsForGoal,
          rank: goalKind.rank,
          required,
          index: goals.length,
        }),
      )
    }
    pendingMaps = []
  })

  if (!goals.length) {
    return null
  }

  return {
    gameId,
    code,
    source,
    text,
    goals,
  }
}

const rankSatisfies = (
  actual: string,
  required: LiveQuestProgressRank | undefined,
) => {
  if (!required) {
    return true
  }
  const normalized = actual.toUpperCase()
  if (!(normalized in RANK_ORDER)) {
    return false
  }
  return RANK_ORDER[normalized as LiveQuestProgressRank] >= RANK_ORDER[required]
}

const eventMatchesGoal = (
  goal: LiveQuestProgressGoal,
  event: LiveQuestProgressEvent,
) => {
  if (!goal.maps.includes(event.map)) {
    return false
  }
  if (goal.kind === 'map_terminal') {
    return event.type === 'map_terminal'
  }
  return (
    event.type === 'battle_result' &&
    event.boss &&
    rankSatisfies(event.rank, goal.rank)
  )
}

const summarizeGoals = (goals: LiveQuestProgressGoal[]) => {
  const completed = goals.filter((goal) => goal.count >= goal.required).length
  const status: LiveQuestProgressStatus =
    completed === goals.length
      ? 'complete'
      : goals.some((goal) => goal.count > 0)
        ? 'in_progress'
        : 'not_started'
  return {
    completed,
    total: goals.length,
    status,
  }
}

const withGoalLabels = (goals: LiveQuestProgressGoal[]) =>
  goals.map((goal) => ({
    ...goal,
    label: buildGoalLabel(goal),
  }))

const buildRecordFromRule = (
  rule: LiveQuestProgressRule,
  previous: LiveQuestProgressRecord | undefined,
): LiveQuestProgressRecord => {
  const goals = withGoalLabels(
    rule.goals.map((goal) => {
      const existing = previous?.goals.find((candidate) => candidate.id === goal.id)
      return existing
        ? {
            ...goal,
            count: existing.count,
            eventKeys: existing.eventKeys,
          }
        : goal
    }),
  )
  return {
    ...rule,
    accepted_now: true,
    goals,
    updatedAt: previous?.updatedAt ?? null,
    summary: summarizeGoals(goals),
  }
}

const activeQuestEntries = (activeQuestMap: PoiQuestState) =>
  Object.values(activeQuestMap)
    .map((activeQuest) => activeQuest.detail)
    .filter((quest): quest is GameQuest => Boolean(quest?.api_no))

export const buildLiveQuestProgressQuestTextMap = () => {
  const preferredData =
    QUEST_DATA.find((data) => data.key === 'zh-TW-kcanotify') ?? QUEST_DATA[0]
  const mergedMap = mergeQuestMap(preferredData.res, preferredData.key)
  return Object.fromEntries(
    Object.entries(mergedMap).map(([gameId, quest]) => [
      Number(gameId),
      {
        code: quest.code,
        text: [quest.memo2, quest.desc].filter(Boolean).join(' '),
      },
    ]),
  ) as Record<number, LiveQuestProgressQuestText>
}

export const syncLiveQuestProgressWithActiveQuests = (
  state: LiveQuestProgressState,
  activeQuestMap: PoiQuestState,
  questTextMap: Record<number, LiveQuestProgressQuestText> =
    buildLiveQuestProgressQuestTextMap(),
): LiveQuestProgressState => {
  const records: Record<number, LiveQuestProgressRecord> = {}
  activeQuestEntries(activeQuestMap).forEach((quest) => {
    const gameId = quest.api_no
    const questText = questTextMap[gameId] ?? {
      code: quest.api_title,
      text: [quest.api_detail, quest.api_title].filter(Boolean).join(' '),
    }
    const rule = buildLiveQuestProgressRule({
      gameId,
      code: questText.code,
      text: questText.text,
    })
    if (!rule) {
      return
    }
    records[gameId] = buildRecordFromRule(rule, state.records[gameId])
  })

  return {
    records,
    lastUpdatedAt: state.lastUpdatedAt,
  }
}

export const applyLiveQuestProgressEvent = (
  state: LiveQuestProgressState,
  event: LiveQuestProgressEvent,
): LiveQuestProgressState => {
  let changed = false
  const records = Object.fromEntries(
    Object.entries(state.records).map(([gameId, record]) => {
      let recordChanged = false
      const goals = withGoalLabels(
        record.goals.map((goal) => {
          if (
            goal.count >= goal.required ||
            goal.eventKeys.includes(event.key) ||
            !eventMatchesGoal(goal, event)
          ) {
            return goal
          }
          changed = true
          recordChanged = true
          return {
            ...goal,
            count: Math.min(goal.required, goal.count + 1),
            eventKeys: [...goal.eventKeys, event.key],
          }
        }),
      )
      return [
        Number(gameId),
        {
          ...record,
          goals,
          updatedAt: recordChanged ? event.observedAt : record.updatedAt,
          summary: summarizeGoals(goals),
        },
      ]
    }),
  ) as Record<number, LiveQuestProgressRecord>

  if (!changed) {
    return state
  }

  return {
    records,
    lastUpdatedAt: event.observedAt,
  }
}

export const buildLiveQuestProgressExportPayload = ({
  pluginVersion,
  state,
  exportedAt = new Date().toISOString(),
}: {
  pluginVersion: string
  state: LiveQuestProgressState
  exportedAt?: string
}): LiveQuestProgressExportPayload => ({
  schema_version: 'kancolle-live-quest-progress-v1',
  exported_at: exportedAt,
  source: {
    plugin: 'poi-plugin-kc-quest-audit',
    plugin_version: pluginVersion,
    capture: 'poi-redux-sidecar',
  },
  live_progress_now: Object.fromEntries(
    Object.entries(state.records)
      .sort(([left], [right]) => Number(left) - Number(right))
      .map(([gameId, record]) => [gameId, record]),
  ),
})
