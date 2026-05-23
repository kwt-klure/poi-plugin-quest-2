// See https://dev.poooi.app/docs/plugin-exports.html

import {
  clearPatchLegacyQuestPluginReducer,
  patchLegacyQuestPluginReducer,
} from './patch'
import {
  startRawQuestSnapshotAutoExport,
  stopRawQuestSnapshotAutoExport,
} from './poi/rawQuestAutoExport'

export const windowMode = false

export const pluginDidLoad = () => {
  patchLegacyQuestPluginReducer().catch((error) => {
    console.error('Hack quest plugin reducer error', error)
  })
  startRawQuestSnapshotAutoExport().catch((error) => {
    console.warn('Failed to start raw quest snapshot auto-export', error)
  })
}

export const pluginWillUnload = () => {
  clearPatchLegacyQuestPluginReducer()
  stopRawQuestSnapshotAutoExport()
}

export { App as reactClass } from './App'
export { Settings as settingsClass } from './Settings'
export { reducer } from './reducer'
export const switchPluginPath = [
  '/kcsapi/api_get_member/questlist',
  '/kcsapi/api_req_quest/clearitemget',
]
