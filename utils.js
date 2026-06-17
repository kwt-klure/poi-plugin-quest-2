"use strict";

exports.__esModule = true;
exports.disablePlugin = disablePlugin;
exports.enablePlugin = enablePlugin;
exports.getNpmConfig = exports.findInstalledTarball = void 0;
exports.installPackage = installPackage;
exports.notifyFailed = notifyFailed;
exports.readPlugin = readPlugin;
exports.removePackage = removePackage;
exports.repairDep = repairDep;
exports.safePhysicallyRemove = void 0;
exports.unloadPlugin = unloadPlugin;
exports.updateI18n = updateI18n;
var _lodash = require("lodash");
var remote = _interopRequireWildcard(require("@electron/remote"));
var _pathExtra = require("path-extra");
var _fsExtra = require("fs-extra");
var _react = _interopRequireDefault(require("react"));
var _reactFontawesome = _interopRequireDefault(require("@skagami/react-fontawesome"));
var _semver = _interopRequireDefault(require("semver"));
var _module = require("module");
var _bluebird = require("bluebird");
var _glob = _interopRequireDefault(require("glob"));
var _crypto = _interopRequireDefault(require("crypto"));
var _child_process = _interopRequireDefault(require("child_process"));
var _path = _interopRequireDefault(require("path"));
var _i18next = _interopRequireWildcard(require("views/env-parts/i18next"));
var _tools = require("views/utils/tools");
var _createStore = require("views/create-store");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); } /* global ROOT, config, language, toast */
const windowManager = remote.require('./lib/window');
const utils = remote.require('./lib/utils');
const NPM_EXEC_PATH = _path.default.join(ROOT, 'node_modules', 'npm', 'bin', 'npm-cli.js');
const MIRROR_JSON_PATH = _path.default.join(global.ROOT, 'assets', 'data', 'mirror.json');
const MIRRORS = require(MIRROR_JSON_PATH);

// This reducer clears the substore no matter what is given.
const clearReducer = undefined;
function calculateShasum(path) {
  return new Promise((resolve, reject) => {
    try {
      const hash = _crypto.default.createHash('sha1');
      const stream = (0, _fsExtra.createReadStream)(path);
      stream.on('data', data => {
        hash.update(data, 'utf8');
      });
      stream.on('end', function () {
        resolve(hash.digest('hex'));
      });
      stream.on('error', function (e) {
        reject(e);
      });
    } catch (e) {
      reject(e);
    }
  });
}
const findInstalledTarball = async (pluginRoot, tarballPath) => {
  const filename = (0, _pathExtra.basename)(tarballPath);
  const pluginPaths = await (0, _bluebird.promisify)(_glob.default)((0, _pathExtra.join)(pluginRoot, 'poi-plugin-*'));
  const packageDatas = await Promise.all(pluginPaths.map(pluginPath => (0, _bluebird.promisify)(_fsExtra.readJson)((0, _pathExtra.join)(pluginPath, 'package.json'))));
  // packageJson._required.raw should contain full path upon installation
  const nameMatchDatas = packageDatas.filter(packageData => (0, _lodash.get)(packageData, '_requested.raw', '').endsWith(filename));
  if (nameMatchDatas.length === 1) {
    return nameMatchDatas[0].name;
  }
  if (nameMatchDatas.length === 0) {
    throw new Error(`Error: Can' find a package matching ${tarballPath}.`);
  }
  // In EXTREMELY tricky cases 2 differently named packages might have been
  // installed from the same path. Unbelievable huh? We can still match checksum.
  // packageJson._shasum should contain shasum.
  const shasum = await calculateShasum(tarballPath);
  const shasumMatchDatas = nameMatchDatas.filter(data => data._shasum === shasum);
  if (!shasumMatchDatas[0]) throw new Error(`Error: Can' find a package installed from ${tarballPath} matching shasum ${shasum}.`);
  // I believe it won't collide.
  return shasumMatchDatas[0].name;
};
exports.findInstalledTarball = findInstalledTarball;
const runScriptAsync = (scriptPath, args, options) => new Promise(resolve => {
  const proc = _child_process.default.fork(scriptPath, args, options);
  proc.on('exit', () => resolve());
});
async function installPackage(packageName, version, npmConfig) {
  if (!packageName) {
    return;
  }
  if (version) {
    packageName = `${packageName}@${version}`;
  }
  let args = ['install', '--registry', npmConfig.registry];
  if (npmConfig.http_proxy) {
    args = [...args, '--proxy', npmConfig.http_proxy];
  }
  args = [...args, '--no-progress', '--no-prune', '--global-style', '--ignore-scripts', '--legacy-peer-deps', packageName];
  await runScriptAsync(NPM_EXEC_PATH, args, {
    cwd: npmConfig.prefix
  });
}
async function removePackage(target, npmConfig) {
  const args = ['uninstall', '--no-progress', target];
  await runScriptAsync(NPM_EXEC_PATH, args, {
    cwd: npmConfig.prefix
  });
  await repairDep([], npmConfig);
}
function updateI18n(plugin) {
  let i18nFile = null;
  if (plugin.i18nDir != null) {
    i18nFile = (0, _pathExtra.join)(plugin.pluginPath, plugin.i18nDir);
  } else {
    try {
      (0, _fsExtra.accessSync)((0, _pathExtra.join)(plugin.pluginPath, 'i18n'));
      i18nFile = (0, _pathExtra.join)(plugin.pluginPath, 'i18n');
    } catch (error) {
      try {
        (0, _fsExtra.accessSync)((0, _pathExtra.join)(plugin.pluginPath, 'assets', 'i18n'));
        i18nFile = (0, _pathExtra.join)(plugin.pluginPath, 'assets', 'i18n');
      } catch (error) {
        console.warn(`${plugin.packageName}: No translate file found.`);
      }
    }
  }
  if (i18nFile != null) {
    const namespace = plugin.id;
    (0, _lodash.each)(window.LOCALES.map(lng => lng.locale), language => {
      (0, _i18next.addGlobalI18n)(namespace);
      (0, _i18next.addResourceBundleDebounce)(language, namespace, (0, _tools.readI18nResources)((0, _pathExtra.join)(i18nFile, `${language}.json`)), true, true);
    });
    plugin = {
      ...plugin,
      name: _i18next.default.t(`${namespace}:${plugin.name}`),
      description: _i18next.default.t(`${namespace}:${plugin.description}`)
    };
  }
  return plugin;
}
async function readPlugin(pluginPath, isExtra = false) {
  let pluginData, packageData, plugin;
  try {
    pluginData = await (0, _fsExtra.readJson)((0, _pathExtra.join)(ROOT, 'assets', 'data', 'plugin.json'));
  } catch (error) {
    pluginData = {};
    utils.error(error);
  }
  try {
    packageData = await (0, _fsExtra.readJson)((0, _pathExtra.join)(pluginPath, 'package.json'));
  } catch (error) {
    packageData = {};
    utils.error(error);
  }
  plugin = packageData.poiPlugin || {};
  // omit poiPlugin to avoid circular object
  plugin.packageData = (0, _lodash.omit)(packageData, 'poiPlugin');
  plugin.packageName = plugin.packageData.name || (0, _pathExtra.basename)(pluginPath);
  if (plugin.name == null) {
    plugin.name = plugin.title || plugin.packageName;
  }
  if (plugin.id == null) {
    plugin.id = plugin.packageName;
  }
  plugin.author = (0, _lodash.get)(plugin, 'packageData.author.name') || 'unknown';
  if (typeof (0, _lodash.get)(plugin, 'packageData.author') === 'string') {
    plugin.author = plugin.packageData.author;
  }
  plugin.link = (0, _lodash.get)(plugin, 'packageData.author.links') || (0, _lodash.get)(plugin, 'packageData.author.url') || (pluginData[plugin.packageName] || {}).link || 'https://github.com/poooi';
  if (plugin.description == null) {
    plugin.description = (plugin.packageData || {}).description || (pluginData[plugin.packageName] || {})[`des${language}`] || 'unknown';
  }
  // Resolve symlink.
  plugin.pluginPath = (0, _fsExtra.realpathSync)(pluginPath);
  // check if it is symbolic linked plugin
  // since function will be called when checking update, the second call
  // will check with real path, make sure to attribute it only when symbolic link
  const pluginStat = (0, _fsExtra.lstatSync)(pluginPath);
  if (pluginStat.isSymbolicLink()) {
    plugin.linkedPlugin = true;
  }
  if (plugin.icon == null) {
    plugin.icon = 'fa/th-large';
  }
  plugin.version = (plugin.packageData || {}).version || '0.0.0';
  plugin.latestVersion = plugin.version;
  if (!plugin.earliestCompatibleMain) {
    plugin.earliestCompatibleMain = '0.0.0';
  }
  if (!plugin.lastApiVer) {
    plugin.lastApiVer = plugin.version;
  }
  if (!plugin.priority) {
    plugin.priority = 10000;
  }
  plugin.enabled = config.get(`plugin.${plugin.id}.enable`, true);
  plugin.isExtra = isExtra;
  plugin.isInstalled = true;
  plugin.isUpdating = false;
  plugin.needRollback = false;
  if (plugin.apiVer) {
    let nearestCompVer = 'v214.748.3647';
    for (const mainVersion in plugin.apiVer) {
      if (_semver.default.lte(window.POI_VERSION, mainVersion) && _semver.default.lt(mainVersion, nearestCompVer) && _semver.default.gt(plugin.version, plugin.apiVer[mainVersion])) {
        plugin.needRollback = true;
        nearestCompVer = mainVersion;
        plugin.latestVersion = plugin.apiVer[mainVersion];
      }
    }
  }
  plugin.isOutdated = plugin.needRollback;
  plugin = updateI18n(plugin);
  const icon = (0, _lodash.isArray)(plugin.icon) ? plugin.icon : plugin.icon.split('/')[1] || plugin.icon || 'th-large';
  plugin.displayIcon = (0, _lodash.isArray)(icon) ? /*#__PURE__*/_react.default.createElement(_reactFontawesome.default, {
    icon: icon
  }) : /*#__PURE__*/_react.default.createElement(_reactFontawesome.default, {
    name: icon
  });
  plugin.displayName = /*#__PURE__*/_react.default.createElement(_react.default.Fragment, null, plugin.displayIcon, " ", plugin.name);
  plugin.timestamp = Date.now();
  return plugin;
}
async function enablePlugin(plugin, reread = true) {
  if (plugin.needRollback) return plugin;
  let pluginMain;
  try {
    pluginMain = {
      ...(await (specifier => new Promise(r => r(`${specifier}`)).then(s => _interopRequireWildcard(require(s))))(plugin.pluginPath)),
      ...(reread ? await readPlugin(plugin.pluginPath, plugin.isExtra) : {})
    };
    pluginMain.enabled = true;
    pluginMain.isRead = true;
    if (!plugin.id && pluginMain.name) {
      pluginMain.id = pluginMain.name;
    }
  } catch (error) {
    console.error(error.stack);
    pluginMain = {
      enabled: false,
      isBroken: true
    };
  }
  plugin = {
    ...plugin,
    ...pluginMain
  };
  if (plugin.windowURL) {
    // eslint-disable-next-line require-atomic-updates
    plugin.realClose = !config.get(`poi.plugin.background.${plugin.id}`, !plugin.realClose);
  }
  plugin = postEnableProcess(plugin);
  return plugin;
}
async function disablePlugin(plugin) {
  plugin = {
    ...plugin,
    enabled: false
  };
  try {
    plugin = unloadPlugin(plugin);
  } catch (error) {
    console.error(error.stack);
  }
  return plugin;
}
const postEnableProcess = plugin => {
  if (plugin.isBroken) {
    return plugin;
  }
  if (plugin.reducer) {
    try {
      (0, _createStore.extendReducer)(plugin.packageName, plugin.reducer);
    } catch (e) {
      console.error(e.stack);
    }
  }
  let windowOptions;
  if (plugin.windowURL) {
    const vibrancy = ['darwin'].includes(process.platform) && config.get('poi.appearance.vibrant', 0) === 1 ? 'ultra-dark' : undefined;
    windowOptions = {
      x: config.get('poi.window.x', 0),
      y: config.get('poi.window.y', 0),
      width: 800,
      height: 600,
      webPreferences: {
        preload: (0, _pathExtra.join)(ROOT, 'assets', 'js', 'plugin-preload.js'),
        plugins: true,
        webviewTag: true,
        nodeIntegration: true,
        nodeIntegrationInWorker: true,
        nodeIntegrationInSubFrames: true,
        sandbox: false,
        enableRemoteModule: true,
        contextIsolation: false,
        affinity: 'poi-plugin',
        webSecurity: false,
        ...plugin.windowOptions?.webPreferences
      },
      ...plugin.windowOptions,
      realClose: plugin.realClose,
      backgroundColor: '#E62A2A2A',
      vibrancy
    };
    const windowURL = (0, _tools.normalizeURL)(plugin.windowURL);
    if (plugin.multiWindow) {
      plugin.handleClick = function () {
        const pluginWindow = windowManager.createWindow(windowOptions);
        pluginWindow.setMenu(require('views/components/etc/menu').appMenu);
        pluginWindow.setAutoHideMenuBar(true);
        pluginWindow.setMenuBarVisibility(false);
        pluginWindow.loadURL(windowURL);
        pluginWindow.show();
      };
    } else if (plugin.realClose) {
      plugin.pluginWindow = null;
      plugin.handleClick = function () {
        if (plugin.pluginWindow == null) {
          plugin.pluginWindow = windowManager.createWindow(windowOptions);
          plugin.pluginWindow.setMenu(require('views/components/etc/menu').appMenu);
          plugin.pluginWindow.setAutoHideMenuBar(true);
          plugin.pluginWindow.setMenuBarVisibility(false);
          plugin.pluginWindow.on('close', function () {
            plugin.pluginWindow = null;
          });
          plugin.pluginWindow.loadURL(windowURL);
          plugin.pluginWindow.show();
        } else {
          plugin.pluginWindow.show();
        }
      };
    } else {
      plugin.pluginWindow = windowManager.createWindow(windowOptions);
      plugin.pluginWindow.setMenu(require('views/components/etc/menu').appMenu);
      plugin.pluginWindow.setAutoHideMenuBar(true);
      plugin.pluginWindow.setMenuBarVisibility(false);
      plugin.pluginWindow.loadURL(windowURL);
      plugin.handleClick = function () {
        return plugin.pluginWindow.show();
      };
    }
  }
  try {
    if (typeof plugin.pluginDidLoad === 'function') {
      plugin.pluginDidLoad();
    }
  } catch (error) {
    console.error(error.stack);
  }
  return plugin;
};
function clearPluginCache(packagePath) {
  for (const path in _module.Module._cache) {
    if (path.includes((0, _pathExtra.basename)(packagePath))) {
      delete _module.Module._cache[path];
    }
  }
  for (const path in _module.Module._pathCache) {
    if (path.includes((0, _pathExtra.basename)(packagePath))) {
      delete _module.Module._pathCache[path];
    }
  }
}
function unloadPlugin(plugin) {
  try {
    if (typeof plugin.pluginWillUnload === 'function') {
      plugin.pluginWillUnload();
    }
  } catch (error) {
    console.error(error.stack);
  }
  if (plugin.pluginWindow) {
    windowManager.closeWindow(plugin.pluginWindow);
  }
  // Here we clear caches of files under pluginPath with symlinks resolved.
  // Problems still exist where deeper symlinks are not resolved.
  // But this solved the major problem of using `npm link` .
  clearPluginCache(plugin.pluginPath);
  (0, _createStore.extendReducer)(plugin.packageName, clearReducer);
  return plugin;
}
function notifyFailed(state, npmConfig) {
  const plugins = state.filter(plugin => plugin.isBroken);
  const unreadList = [];
  const reinstallList = [];
  for (let i = 0; i < plugins.length; i++) {
    const plugin = plugins[i];
    unreadList.push(plugin.name);
    if (!plugin.linkedPlugin) reinstallList.push(plugin.packageName);
  }
  if (unreadList.length > 0) {
    const content = `${unreadList.join(' / ')} ${_i18next.default.t('setting:PluginLoadFailed')}`;
    toast(content, {
      type: 'error',
      title: _i18next.default.t('setting:Plugin error')
    });
  }
  repairDep(reinstallList, npmConfig);
}
async function repairDep(brokenList, npmConfig) {
  const depList = (await new Promise(res => {
    (0, _glob.default)(_path.default.join(npmConfig.prefix, 'node_modules', '*'), (err, matches) => res(matches));
  })).filter(p => !p.includes('poi-plugin'));
  depList.forEach(p => {
    try {
      require(p);
    } catch (e) {
      safePhysicallyRemove(p, npmConfig);
    }
  });
  brokenList.forEach(pluginName => {
    installPackage(pluginName, null, npmConfig);
  });
}

// Unlink a path if it's a symlink.
// Do nothing (but logging error) if it's a git repo.
// Remove the directory otherwise.
const safePhysicallyRemove = async packagePath => {
  let packageStat;
  try {
    packageStat = await (0, _bluebird.promisify)(_fsExtra.lstat)(packagePath);
  } catch (e) {
    // No longer exists
    return;
  }
  // If it's a symlink, unlink it
  if (packageStat.isSymbolicLink()) {
    return await (0, _bluebird.promisify)(_fsExtra.unlink)(packagePath);
  }
  // If it's a git repo, log error and do nothing
  try {
    const gitStat = await (0, _bluebird.promisify)(_fsExtra.lstat)((0, _pathExtra.join)(packagePath, '.git'));
    if (gitStat.isDirectory()) {
      console.error(`${packagePath} appears to be a git repository. For the safety of your files in development, please use 'npm link' to install plugins from github.`);
      return;
    }
  } catch (e) {
    return await (0, _fsExtra.remove)(packagePath);
  }
};

/**
 * reads npm config for other methods to consume
 * @param {String} prefix path to install the npm package
 * @return NpmConfig { registry, prefix, enableBetaPluginCheck, http_proxy? }
 */
exports.safePhysicallyRemove = safePhysicallyRemove;
const getNpmConfig = prefix => {
  const mirrorConf = config.get('packageManager.mirrorName');
  const enableBetaPluginCheck = config.get('packageManager.enableBetaPluginCheck');
  const mirrorName = Object.keys(MIRRORS).includes(mirrorConf) ? mirrorConf : navigator.language === 'zh-CN' ? 'taobao' : 'npm';
  const registry = MIRRORS[mirrorName].server;
  const npmConfig = {
    registry,
    prefix,
    enableBetaPluginCheck
  };
  return npmConfig;
};
exports.getNpmConfig = getNpmConfig;