// See https://dev.poooi.app/docs/plugin-exports.html

import {
  clearPatchLegacyQuestPluginReducer,
  patchLegacyQuestPluginReducer,
} from './patch'

export const windowMode = false

export const pluginDidLoad = () => {
  patchLegacyQuestPluginReducer()
}

export const pluginWillUnload = () => {
  clearPatchLegacyQuestPluginReducer()
}

export { App as reactClass } from './App'
export { Settings as settingsClass } from './Settings'
export { reducer } from './reducer'
export const switchPluginPath = ['/kcsapi/api_get_member/questlist']
