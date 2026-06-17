import { QuestTab } from './poi/types'
import type { GameQuest, PoiQuestState, QuestListAction } from './poi/types'

export const RAW_QUEST_TAB_OBSERVED_ACTION_TYPE =
  '@@poi-plugin-kc-quest-audit/raw-quest-tab-observed'

export const RAW_QUEST_SNAPSHOT_FILE_PREFIX = 'kancolle_raw_quests'

export type RawQuestCoverageStatus = 'complete' | 'partial' | 'unknown'
export type RawQuestPageMode =
  | 'full-tab-response'
  | 'page-numbered-response'
  | 'empty-tab-observation'
  | 'unobserved'
export type RawQuestTabObservationSource =
  | 'questlist-response'
  | 'manual-empty-tab'

export type RawQuestTabObservedAction = {
  type: typeof RAW_QUEST_TAB_OBSERVED_ACTION_TYPE
  tabId: QuestTab
  observedAt?: string
  source?: 'manual-empty-tab'
}

type RawQuestResponseMetadata = {
  api_completed_kind: number
  api_count: number
  api_exec_count: number
  api_exec_type: number
  api_page_no?: string | number
  api_disp_page?: string | number
  api_page_count?: string | number
}

export interface RawQuestPage {
  pageKey: string
  observedAt: string
  path: '/kcsapi/api_get_member/questlist'
  tabId: QuestTab
  postBody: Record<string, unknown>
  response: RawQuestResponseMetadata
  questIds: number[]
  quests: GameQuest[]
}

export type RawQuestPageMap = Record<string, RawQuestPage>

export interface RawQuestTabObservation {
  tabId: QuestTab
  observedAt: string
  source: RawQuestTabObservationSource
  empty: boolean
  observedQuestCount: number
  pageKeys: string[]
}

export type RawQuestTabObservationMap = Record<string, RawQuestTabObservation>

export interface RawQuestTabCoverage {
  tabId: QuestTab
  observed: boolean
  observedEmpty: boolean
  observedQuestCount: number
  observedPageKeys: string[]
  pageMode: RawQuestPageMode
  pageStatus: RawQuestCoverageStatus
  notes: string[]
}

export interface RawQuestCoverage {
  status: RawQuestCoverageStatus
  tabStatus: RawQuestCoverageStatus
  pageStatus: RawQuestCoverageStatus
  observedTabs: QuestTab[]
  observedEmptyTabs: QuestTab[]
  observedPageKeys: string[]
  observedPageKeysByTab: Partial<Record<QuestTab, string[]>>
  observedQuestCount: number
  expectedTabs: QuestTab[]
  missingTabs: QuestTab[]
  tabDetails: RawQuestTabCoverage[]
  notes: string[]
}

export interface RawQuestSnapshotExportPayload {
  schema_version: 'kancolle-raw-quests-v1'
  exported_at: string
  source: {
    plugin: 'poi-plugin-kc-quest-audit'
    plugin_version: string
    endpoint: '/kcsapi/api_get_member/questlist'
    capture: 'poi-redux-response-action'
  }
  coverage: RawQuestCoverage
  raw_pages: RawQuestPage[]
  raw_tab_observations: RawQuestTabObservation[]
  quests_by_id: Record<
    string,
    GameQuest & {
      observed_page_keys: string[]
      listed_now: true
      accepted_now: boolean
    }
  >
  active_quests: PoiQuestState
}

const EXPECTED_TABS: QuestTab[] = [QuestTab.ALL]

const PAGINATION_FIELD_NAMES = [
  'api_page_no',
  'api_disp_page',
  'api_page_count',
] as const

const isSensitiveKey = (key: string) =>
  key.toLowerCase().includes('token') || key.toLowerCase().includes('password')

const sortQuestTabs = (tabs: QuestTab[]) => [...tabs].sort()

const uniq = <T>(values: T[]) => Array.from(new Set(values))

const formatRawQuestSnapshotTimestamp = (date: Date) =>
  date.toISOString().replace(/[-:]/g, '').replace(/\..+$/, '').replace('T', '-')

export const buildRawQuestSnapshotFileName = (date = new Date()) =>
  `${RAW_QUEST_SNAPSHOT_FILE_PREFIX}_${formatRawQuestSnapshotTimestamp(
    date,
  )}.json`

export const sanitizePostBody = (
  postBody: Record<string, unknown>,
): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(postBody)
      .filter(([key]) => !isSensitiveKey(key))
      .sort(([left], [right]) => left.localeCompare(right)),
  )

export const buildRawQuestPageKey = (postBody: Record<string, unknown>) => {
  const sanitized = sanitizePostBody(postBody)
  return Object.entries(sanitized)
    .map(([key, value]) => `${key}=${String(value)}`)
    .join('&')
}

const pickResponsePaginationFields = (
  response: QuestListAction['body'],
): Partial<RawQuestResponseMetadata> =>
  Object.fromEntries(
    PAGINATION_FIELD_NAMES.flatMap((fieldName) => {
      const value = response[fieldName]
      return value == null ? [] : [[fieldName, value]]
    }),
  )

export const buildRawQuestPage = (
  action: QuestListAction,
  observedAt = new Date().toISOString(),
): RawQuestPage => {
  const postBody = sanitizePostBody(action.postBody)
  return {
    pageKey: buildRawQuestPageKey(action.postBody),
    observedAt,
    path: action.path,
    tabId: action.postBody.api_tab_id,
    postBody,
    response: {
      api_completed_kind: action.body.api_completed_kind,
      api_count: action.body.api_count,
      api_exec_count: action.body.api_exec_count,
      api_exec_type: action.body.api_exec_type,
      ...pickResponsePaginationFields(action.body),
    },
    questIds: action.body.api_list.map((quest) => quest.api_no),
    quests: action.body.api_list,
  }
}

export const buildRawQuestTabObservationFromPage = (
  page: RawQuestPage,
): RawQuestTabObservation => ({
  tabId: page.tabId,
  observedAt: page.observedAt,
  source: 'questlist-response',
  empty: page.response.api_count === 0 && page.questIds.length === 0,
  observedQuestCount: page.questIds.length,
  pageKeys: [page.pageKey],
})

export const buildManualRawQuestTabObservation = (
  tabId: QuestTab,
  observedAt = new Date().toISOString(),
): RawQuestTabObservation => ({
  tabId,
  observedAt,
  source: 'manual-empty-tab',
  empty: true,
  observedQuestCount: 0,
  pageKeys: [],
})

export const mergeRawQuestTabObservation = (
  current: RawQuestTabObservation | undefined,
  next: RawQuestTabObservation,
): RawQuestTabObservation => {
  if (!current) {
    return next
  }

  const pageKeys = uniq([...current.pageKeys, ...next.pageKeys]).sort()
  const observedQuestCount = Math.max(
    current.observedQuestCount,
    next.observedQuestCount,
  )

  return {
    ...next,
    observedAt: next.observedAt,
    pageKeys,
    observedQuestCount,
    empty: pageKeys.length === 0 ? next.empty : observedQuestCount === 0,
  }
}

const hasPaginationFields = (page: RawQuestPage) =>
  PAGINATION_FIELD_NAMES.some(
    (fieldName) =>
      Object.prototype.hasOwnProperty.call(page.postBody, fieldName) ||
      Object.prototype.hasOwnProperty.call(page.response, fieldName),
  )

const buildTabCoverage = (
  tabId: QuestTab,
  pages: RawQuestPage[],
  observation: RawQuestTabObservation | undefined,
): RawQuestTabCoverage => {
  const observed = pages.length > 0 || Boolean(observation)
  const observedPageKeys = pages.map((page) => page.pageKey).sort()
  const observedQuestIds = new Set(pages.flatMap((page) => page.questIds))
  const observedQuestCount =
    pages.length > 0
      ? observedQuestIds.size
      : (observation?.observedQuestCount ?? 0)
  const observedEmpty =
    observed &&
    observedQuestCount === 0 &&
    (pages.length === 0 || pages.every((page) => page.response.api_count === 0))
  const countMismatchPages = pages.filter(
    (page) => page.response.api_count !== page.questIds.length,
  )
  const hasPageNumbering = pages.some(hasPaginationFields)
  const notes: string[] = []

  const pageMode: RawQuestPageMode = !observed
    ? 'unobserved'
    : pages.length === 0 && observedEmpty
      ? 'empty-tab-observation'
      : hasPageNumbering
        ? 'page-numbered-response'
        : 'full-tab-response'

  if (!observed) {
    notes.push('Tab has not been observed.')
  }
  if (countMismatchPages.length > 0) {
    notes.push(
      `api_count differs from observed quest count on pages: ${countMismatchPages
        .map((page) => page.pageKey)
        .join(', ')}`,
    )
  }
  if (hasPageNumbering) {
    notes.push('Page-numbered questlist response observed for this tab.')
  }
  if (pageMode === 'full-tab-response' && countMismatchPages.length === 0) {
    notes.push(
      'Non-paginated questlist response treated as full-tab coverage because api_count matches observed quests.',
    )
  }

  const pageStatus: RawQuestCoverageStatus = !observed
    ? 'unknown'
    : countMismatchPages.length > 0
      ? 'partial'
      : hasPageNumbering
        ? 'unknown'
        : 'complete'

  return {
    tabId,
    observed,
    observedEmpty,
    observedQuestCount,
    observedPageKeys,
    pageMode,
    pageStatus,
    notes,
  }
}

export const calculateCoverage = (
  pages: RawQuestPage[],
  expectedTabs = EXPECTED_TABS,
  tabObservations: RawQuestTabObservationMap = {},
): RawQuestCoverage => {
  const pagesByTab = pages.reduce(
    (acc, page) => {
      acc[page.tabId] = [...(acc[page.tabId] ?? []), page]
      return acc
    },
    {} as Partial<Record<QuestTab, RawQuestPage[]>>,
  )
  const observedTabs = sortQuestTabs(
    uniq([
      ...pages.map((page) => page.tabId),
      ...Object.values(tabObservations).map((observation) => observation.tabId),
    ]),
  )
  const allTabs = sortQuestTabs(uniq([...expectedTabs, ...observedTabs]))
  const tabDetails = allTabs.map((tabId) =>
    buildTabCoverage(tabId, pagesByTab[tabId] ?? [], tabObservations[tabId]),
  )
  const observedPageKeys = pages.map((page) => page.pageKey).sort()
  const observedPageKeysByTab = Object.fromEntries(
    observedTabs.map((tabId) => [
      tabId,
      (pagesByTab[tabId] ?? []).map((page) => page.pageKey).sort(),
    ]),
  ) as Partial<Record<QuestTab, string[]>>
  const questIds = new Set(pages.flatMap((page) => page.questIds))
  const missingTabs = expectedTabs.filter((tab) => !observedTabs.includes(tab))
  const observedEmptyTabs = sortQuestTabs(
    tabDetails
      .filter((detail) => detail.observedEmpty)
      .map((detail) => detail.tabId),
  )
  const countMismatchPages = pages.filter(
    (page) => page.response.api_count !== page.questIds.length,
  )
  const pageNumberedPages = pages.filter(hasPaginationFields)
  const notes: string[] = []

  if (pages.length === 0 && observedTabs.length === 0) {
    notes.push(
      'No raw questlist pages or tab observations have been recorded yet.',
    )
  }
  if (missingTabs.length > 0) {
    notes.push(`Missing observed quest listing source: ${missingTabs.join(', ')}`)
  }
  if (
    observedTabs.includes(QuestTab.ALL) &&
    observedTabs.some((tab) => tab !== QuestTab.ALL)
  ) {
    notes.push(
      'Category quest tabs are extra observations; the All tab is the complete listing source.',
    )
  }
  if (countMismatchPages.length > 0) {
    notes.push(
      `Some pages report api_count different from quest id count: ${countMismatchPages
        .map((page) => page.pageKey)
        .join(', ')}`,
    )
  }
  if (pageNumberedPages.length > 0) {
    notes.push(
      `Page-numbered questlist responses observed: ${pageNumberedPages
        .map((page) => page.pageKey)
        .join(', ')}`,
    )
  }

  const tabStatus: RawQuestCoverageStatus =
    observedTabs.length === 0
      ? 'unknown'
      : missingTabs.length === 0
        ? 'complete'
        : 'partial'
  const requiredTabDetails = tabDetails.filter((detail) =>
    expectedTabs.includes(detail.tabId),
  )
  const pageStatus: RawQuestCoverageStatus =
    requiredTabDetails.every((detail) => !detail.observed)
      ? 'unknown'
      : missingTabs.length === 0 &&
          requiredTabDetails.every(
            (detail) => detail.pageStatus === 'complete',
          )
        ? 'complete'
        : 'partial'
  const status: RawQuestCoverageStatus =
    observedTabs.length === 0
      ? 'unknown'
      : tabStatus === 'complete' && pageStatus === 'complete'
        ? 'complete'
        : 'partial'

  return {
    status,
    tabStatus,
    pageStatus,
    observedTabs,
    observedEmptyTabs,
    observedPageKeys,
    observedPageKeysByTab,
    observedQuestCount: questIds.size,
    expectedTabs,
    missingTabs,
    tabDetails,
    notes,
  }
}

export const buildRawQuestSnapshotExportPayload = ({
  pluginVersion,
  rawQuestPages,
  rawQuestTabObservations = {},
  activeQuestMap,
}: {
  pluginVersion: string
  rawQuestPages: RawQuestPageMap
  rawQuestTabObservations?: RawQuestTabObservationMap
  activeQuestMap: PoiQuestState
}): RawQuestSnapshotExportPayload => {
  const pages = Object.values(rawQuestPages).sort((left, right) =>
    left.pageKey.localeCompare(right.pageKey),
  )
  const tabObservations = Object.values(rawQuestTabObservations).sort(
    (left, right) => left.tabId.localeCompare(right.tabId),
  )
  const activeIds = new Set(Object.keys(activeQuestMap).map(Number))
  const questsById: RawQuestSnapshotExportPayload['quests_by_id'] = {}

  pages.forEach((page) => {
    page.quests.forEach((quest) => {
      const existing = questsById[String(quest.api_no)]
      if (existing) {
        existing.observed_page_keys = Array.from(
          new Set([...existing.observed_page_keys, page.pageKey]),
        ).sort()
        existing.accepted_now = activeIds.has(quest.api_no)
        return
      }
      questsById[String(quest.api_no)] = {
        ...quest,
        observed_page_keys: [page.pageKey],
        listed_now: true,
        accepted_now: activeIds.has(quest.api_no),
      }
    })
  })

  return {
    schema_version: 'kancolle-raw-quests-v1',
    exported_at: new Date().toISOString(),
    source: {
      plugin: 'poi-plugin-kc-quest-audit',
      plugin_version: pluginVersion,
      endpoint: '/kcsapi/api_get_member/questlist',
      capture: 'poi-redux-response-action',
    },
    coverage: calculateCoverage(pages, EXPECTED_TABS, rawQuestTabObservations),
    raw_pages: pages,
    raw_tab_observations: tabObservations,
    quests_by_id: questsById,
    active_quests: activeQuestMap,
  }
}

export const hasRawQuestSnapshotData = (
  payload: RawQuestSnapshotExportPayload,
) => payload.raw_pages.length > 0 || payload.raw_tab_observations.length > 0
