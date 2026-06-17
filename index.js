"use strict";

exports.__esModule = true;
exports.reducer = reducer;
exports.sortPlugins = void 0;
var _lodash = require("lodash");
var _tools = require("views/utils/tools");
const sortPlugins = ps => (0, _lodash.sortBy)(ps, ['priority', 'packageName']);
exports.sortPlugins = sortPlugins;
function reducer(state = [], {
  type,
  value,
  option
}) {
  const findPluginIndexByPackageName = packageName => state.findIndex(p => p.packageName === packageName);
  switch (type) {
    case '@@Plugin/initialize':
      {
        return value;
      }
    case '@@Plugin/add':
      {
        const i = findPluginIndexByPackageName(value.packageName);
        if (i === -1) {
          state = state.concat(value);
        } else {
          state[i] = value;
        }
        return sortPlugins(state);
      }
    case '@@Plugin/changeStatus':
      {
        const i = findPluginIndexByPackageName(value.packageName);
        if (!state[i]) {
          return state;
        }
        let pluginToUpdate = {
          ...state[i]
        };
        for (const opt of option) {
          const {
            path,
            status
          } = opt;
          pluginToUpdate = (0, _tools.reduxSet)(pluginToUpdate, path.split('.'), status);
        }
        state = [...state.slice(0, i), pluginToUpdate, ...state.slice(i + 1)];
        return sortPlugins(state);
      }
    case '@@Plugin/remove':
      {
        const i = findPluginIndexByPackageName(value.packageName);
        if (i !== -1) {
          state = [...state];
          state.splice(i, 1);
        }
        return state;
      }
  }
  return state;
}