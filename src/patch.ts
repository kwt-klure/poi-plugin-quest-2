import type { i18n } from 'i18next'
import { QUEST_DATA } from '../build'
import { importFromPoi, PACKAGE_NAME } from './poi/env'
import { getPoiStore } from './poi/store'
import { getStorage } from './store'

const LEGACY_QUEST_PLUGIN_ID = 'poi-plugin-quest-info'
const QUEST_REDUCER_PATCH_OWNER_IDS = new Set([
  'poi-plugin-quest-info-2',
  PACKAGE_NAME,
])
const HACK_KEY = `__patched-from-${PACKAGE_NAME}`

export const hasEnabledConflictingQuestPlugin = (
  plugins: Array<{ id: string; enabled: boolean }> = [],
  currentPackageName = PACKAGE_NAME,
) =>
  plugins.some(
    (plugin) =>
      plugin.enabled &&
      plugin.id !== currentPackageName &&
      QUEST_REDUCER_PATCH_OWNER_IDS.has(plugin.id),
  )

const shouldSkipLegacyQuestPluginPatch = async () => {
  const poiStore = await getPoiStore()
  const plugins = poiStore.getState().plugins ?? []

  if (
    plugins.some(
      (plugin) => plugin.id === LEGACY_QUEST_PLUGIN_ID && plugin.enabled,
    )
  ) {
    return true
  }

  return hasEnabledConflictingQuestPlugin(plugins, PACKAGE_NAME)
}

const getQuestState = (maybeLanguage: string) => {
  const dataSource = getStorage()?.dataSource
  const sourceData = QUEST_DATA.find((i) => i.key === dataSource)
  const defaultData = QUEST_DATA.find((i) => i.lang === maybeLanguage)
  const data = (sourceData ?? defaultData)?.res
  if (!data) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(data).map(([apiNo, d]) => {
      const typedData = d as (typeof data)[keyof typeof data]
      return [
        apiNo,
        {
          wiki_id: typedData.code,
          condition: [
            'memo2' in typedData ? typedData.memo2 : undefined,
            typedData.desc,
          ]
            .filter(Boolean)
            .join(' | '),
        },
      ]
    }),
  )
}

/**
 * Patch the reducer of `poi-plugin-quest-info` for poi's task panel tips
 * See https://github.com/poooi/poi/blob/da75b507e8f67615a39dc4fdb466e34ff5b5bdcf/views/components/main/parts/task-panel.es#L243
 * @env poi
 */
export const patchLegacyQuestPluginReducer = async () => {
  if (await shouldSkipLegacyQuestPluginPatch()) {
    // skip patch if legacy quest plugin or another quest-info variant is enabled
    return
  }

  try {
    const i18next: i18n | { default: i18n; __esModule: true } =
      await importFromPoi('views/env-parts/i18next')
    // Fix https://github.com/poooi/poi/issues/2539
    const language =
      '__esModule' in i18next ? i18next.default.language : i18next.language

    const initState = {
      [HACK_KEY]: true,
      quests: getQuestState(language),
      questStatus: {},
    }

    const reducer = (
      state = initState,
      action: { type: string; [x: string]: any },
    ) => {
      switch (action.type) {
        case '@@Config':
          // change language
          if (action.path === 'poi.misc.language') {
            const newLanguage = action.value
            return {
              ...state,
              quests: getQuestState(newLanguage),
            }
          }
      }
      return state
    }

    const { extendReducer } = await importFromPoi('views/create-store')
    extendReducer(LEGACY_QUEST_PLUGIN_ID, reducer)
  } catch (e) {
    console.error('Hack quest plugin reducer error', e)
  }
}

/**
 * Clear hacked reducer after unload
 * See https://github.com/poooi/poi/blob/3beedfa93ae347db273b7f0a5160f5ea01e9b8b7/views/services/plugin-manager/utils.es#L451
 * @env poi
 */
export const clearPatchLegacyQuestPluginReducer = async () => {
  if (await shouldSkipLegacyQuestPluginPatch()) {
    // skip clear if legacy quest plugin or another quest-info variant is enabled
    return
  }
  try {
    const { extendReducer } = await importFromPoi('views/create-store')
    const clearReducer = undefined
    extendReducer(LEGACY_QUEST_PLUGIN_ID, clearReducer)
  } catch (e) {
    console.error('Clear hack quest plugin reducer error', e)
  }
}
