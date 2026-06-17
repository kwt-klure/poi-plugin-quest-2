"use strict";

exports.__esModule = true;
exports.PluginItem = void 0;
var _react = _interopRequireWildcard(require("react"));
var _propTypes = _interopRequireDefault(require("prop-types"));
var _reactFontawesome = _interopRequireDefault(require("react-fontawesome"));
var _reactRemarkable = _interopRequireDefault(require("react-remarkable"));
var _reactI18next = require("react-i18next");
var _core = require("@blueprintjs/core");
var _styledComponents = require("styled-components");
var _Transition = _interopRequireDefault(require("react-transition-group/Transition"));
var _checkbox = require("../components/checkbox");
var _section = require("../components/section");
var _pluginManager = _interopRequireDefault(require("views/services/plugin-manager"));
var _pluginSettingWrapper = require("./plugin-setting-wrapper");
var _dec, _class;
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
const Header = _styledComponents.styled.div.withConfig({
  displayName: "plugin-item__Header",
  componentId: "sc-1rbmhe2-0"
})(["display:flex;align-items:center;"]);
const PluginName = _styledComponents.styled.div.withConfig({
  displayName: "plugin-item__PluginName",
  componentId: "sc-1rbmhe2-1"
})(["overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;font-size:1.5em;"]);
const PluginInfo = _styledComponents.styled.div.withConfig({
  displayName: "plugin-item__PluginInfo",
  componentId: "sc-1rbmhe2-2"
})([""]);
const PluginMeta = _styledComponents.styled.div.withConfig({
  displayName: "plugin-item__PluginMeta",
  componentId: "sc-1rbmhe2-3"
})(["margin-left:-0.5em;a{font-size:1em;}"]);
const PluginDetail = _styledComponents.styled.div.withConfig({
  displayName: "plugin-item__PluginDetail",
  componentId: "sc-1rbmhe2-4"
})(["position:relative;"]);
const Fade1 = _styledComponents.styled.div.withConfig({
  displayName: "plugin-item__Fade1",
  componentId: "sc-1rbmhe2-5"
})(["transition:0.3s ease-in-out;opacity:0;", ""], ({
  state
}) => {
  switch (state) {
    case 'entering':
      return (0, _styledComponents.css)(["opacity:0;"]);
    case 'entered':
      return (0, _styledComponents.css)(["opacity:1;"]);
    case 'exiting':
      return (0, _styledComponents.css)(["opacity:0;"]);
    case 'exited':
      return (0, _styledComponents.css)(["display:none;"]);
  }
});
const Fade2 = (0, _styledComponents.styled)(Fade1).withConfig({
  displayName: "plugin-item__Fade2",
  componentId: "sc-1rbmhe2-6"
})(["", ""], ({
  state
}) => {
  switch (state) {
    case 'entering':
      return (0, _styledComponents.css)(["position:absolute;top:0;"]);
    case 'exiting':
      return (0, _styledComponents.css)(["position:absolute;top:0;"]);
  }
});
let PluginItem = exports.PluginItem = (_dec = (0, _reactI18next.withNamespaces)(['setting']), _dec(_class = class PluginItem extends _react.PureComponent {
  static propTypes = {
    plugin: _propTypes.default.object,
    onUpdate: _propTypes.default.func,
    onEnable: _propTypes.default.func,
    onRemove: _propTypes.default.func,
    onReload: _propTypes.default.func,
    t: _propTypes.default.func.isRequired,
    installable: _propTypes.default.bool,
    installing: _propTypes.default.bool,
    npmWorking: _propTypes.default.bool,
    onInstall: _propTypes.default.func
  };
  state = {
    settingOpen: false
  };
  toggleSettingPop = () => {
    this.setState({
      settingOpen: !this.state.settingOpen
    });
  };
  render() {
    const {
      plugin,
      installable,
      installing,
      npmWorking,
      t
    } = this.props;
    const {
      settingOpen
    } = this.state;
    let enableBtnText, enableBtnFAname;
    switch (_pluginManager.default.getStatusOfPlugin(plugin)) {
      case _pluginManager.default.VALID:
        enableBtnText = /*#__PURE__*/_react.default.createElement(_reactI18next.Trans, null, "setting:Disable");
        enableBtnFAname = 'pause';
        break;
      case _pluginManager.default.DISABLED:
        enableBtnText = /*#__PURE__*/_react.default.createElement(_reactI18next.Trans, null, "setting:Enable");
        enableBtnFAname = 'play';
        break;
      case _pluginManager.default.NEEDUPDATE:
        enableBtnText = /*#__PURE__*/_react.default.createElement(_reactI18next.Trans, null, "setting:Outdated");
        enableBtnFAname = 'ban';
        break;
      case _pluginManager.default.BROKEN:
        enableBtnText = /*#__PURE__*/_react.default.createElement(_reactI18next.Trans, null, "setting:Reload");
        enableBtnFAname = 'refresh';
        break;
      default:
        enableBtnText = '';
        enableBtnFAname = '';
    }
    const removeBtnText = plugin.isUninstalling ? /*#__PURE__*/_react.default.createElement(_reactI18next.Trans, null, "setting:Removing") : /*#__PURE__*/_react.default.createElement(_reactI18next.Trans, null, "setting:Remove");
    const removeBtnFAname = plugin.isInstalled ? 'trash' : 'trash-o';
    const settingAvailable = plugin.reactClass || plugin.settingsClass || plugin.switchPluginPath || !plugin.multiWindow && plugin.windowURL;
    return /*#__PURE__*/_react.default.createElement(_section.Section, {
      className: "plugin-item"
    }, /*#__PURE__*/_react.default.createElement(Header, {
      className: "plugin-header"
    }, /*#__PURE__*/_react.default.createElement(PluginName, {
      className: "plugin-name"
    }, installable ? /*#__PURE__*/_react.default.createElement(_react.default.Fragment, null, /*#__PURE__*/_react.default.createElement(_reactFontawesome.default, {
      name: plugin.icon
    }), ` ${plugin[window.language]}`) : plugin.displayName), /*#__PURE__*/_react.default.createElement(_core.ButtonGroup, {
      className: "plugin-control"
    }, settingAvailable && /*#__PURE__*/_react.default.createElement(_core.Tooltip, {
      position: _core.Position.TOP,
      content: t(settingOpen ? 'Description' : 'Settings')
    }, /*#__PURE__*/_react.default.createElement(_core.Button, {
      minimal: true,
      intent: _core.Intent.PRIMARY,
      onClick: this.toggleSettingPop
    }, /*#__PURE__*/_react.default.createElement(_reactFontawesome.default, {
      name: settingOpen ? 'file-alt' : 'gear'
    }))), installable ? /*#__PURE__*/_react.default.createElement(_core.Tooltip, {
      position: _core.Position.TOP,
      content: t(installing ? 'Installing' : 'Install')
    }, /*#__PURE__*/_react.default.createElement(_core.Button, {
      minimal: true,
      intent: _core.Intent.PRIMARY,
      disabled: npmWorking,
      onClick: this.props.onInstall
    }, /*#__PURE__*/_react.default.createElement(_reactFontawesome.default, {
      name: "download"
    }))) : /*#__PURE__*/_react.default.createElement(_react.default.Fragment, null, /*#__PURE__*/_react.default.createElement(_core.Tooltip, {
      position: _core.Position.TOP,
      content: enableBtnText
    }, /*#__PURE__*/_react.default.createElement(_core.Button, {
      minimal: true,
      intent: _core.Intent.PRIMARY,
      disabled: _pluginManager.default.getStatusOfPlugin(plugin) == _pluginManager.default.NEEDUPDATE,
      onClick: _pluginManager.default.getStatusOfPlugin(plugin) != _pluginManager.default.BROKEN ? this.props.onEnable : this.props.onReload
    }, /*#__PURE__*/_react.default.createElement(_reactFontawesome.default, {
      name: enableBtnFAname
    }))), /*#__PURE__*/_react.default.createElement(_core.Tooltip, {
      position: _core.Position.TOP,
      content: removeBtnText
    }, /*#__PURE__*/_react.default.createElement(_core.Button, {
      minimal: true,
      intent: _core.Intent.DANGER,
      onClick: this.props.onRemove,
      disabled: !plugin.isInstalled
    }, /*#__PURE__*/_react.default.createElement(_reactFontawesome.default, {
      name: removeBtnFAname
    })))))), /*#__PURE__*/_react.default.createElement(PluginInfo, {
      className: "plugin-info"
    }, /*#__PURE__*/_react.default.createElement(PluginMeta, {
      className: "plugin-meta"
    }, /*#__PURE__*/_react.default.createElement(_core.AnchorButton, {
      minimal: true,
      intent: _core.Intent.PRIMARY,
      href: plugin.link,
      target: "_blank"
    }, /*#__PURE__*/_react.default.createElement(_reactFontawesome.default, {
      name: "user"
    }), " ", plugin.author), plugin.linkedPlugin && /*#__PURE__*/_react.default.createElement(_core.AnchorButton, {
      minimal: true,
      intent: _core.Intent.PRIMARY
    }, /*#__PURE__*/_react.default.createElement(_reactFontawesome.default, {
      name: "link"
    }), " ", t('Linked')), !installable && /*#__PURE__*/_react.default.createElement(_core.AnchorButton, {
      minimal: true,
      intent: _core.Intent.PRIMARY
    }, /*#__PURE__*/_react.default.createElement(_reactFontawesome.default, {
      name: "tag"
    }), " ", plugin.version || '1.0.0'), plugin.isOutdated && /*#__PURE__*/_react.default.createElement(_core.AnchorButton, {
      minimal: true,
      intent: _core.Intent.SUCCESS,
      onClick: this.props.onUpdate
    }, /*#__PURE__*/_react.default.createElement(_reactFontawesome.default, {
      name: "cloud-download"
    }), " ", t('Available'), " ", plugin.latestVersion), plugin.isUpdating && /*#__PURE__*/_react.default.createElement(_core.AnchorButton, {
      minimal: true,
      intent: _core.Intent.PRIMARY
    }, /*#__PURE__*/_react.default.createElement(_reactFontawesome.default, {
      name: "spinner",
      pulse: true
    }), " ", t('Updating'))), /*#__PURE__*/_react.default.createElement(PluginDetail, {
      className: "plugin-detail"
    }, /*#__PURE__*/_react.default.createElement(_Transition.default, {
      in: settingOpen,
      timeout: 300
    }, state => /*#__PURE__*/_react.default.createElement(Fade1, {
      className: "plugin-setting",
      state: state
    }, !!plugin.reactClass && /*#__PURE__*/_react.default.createElement("div", null, /*#__PURE__*/_react.default.createElement(_checkbox.CheckboxLabelConfig, {
      label: /*#__PURE__*/_react.default.createElement(_reactI18next.Trans, null, "setting:Open plugin in new window"),
      configName: `poi.plugin.windowmode.${plugin.id}`,
      defaultValue: !!plugin.windowMode
    })), !!plugin.switchPluginPath && /*#__PURE__*/_react.default.createElement("div", null, /*#__PURE__*/_react.default.createElement(_checkbox.CheckboxLabelConfig, {
      label: /*#__PURE__*/_react.default.createElement(_reactI18next.Trans, null, "setting:Enable auto switch"),
      configName: `poi.autoswitch.${plugin.id}`,
      defaultValue: true
    })), !plugin.multiWindow && plugin.windowURL && /*#__PURE__*/_react.default.createElement("div", null, /*#__PURE__*/_react.default.createElement(_checkbox.CheckboxLabelConfig, {
      label: /*#__PURE__*/_react.default.createElement(_reactI18next.Trans, null, "setting:Keep plugin process running in background (re-enable to apply changes)"),
      configName: `poi.plugin.background.${plugin.id}`,
      defaultValue: !plugin.realClose
    })), !!plugin.settingsClass && /*#__PURE__*/_react.default.createElement("div", null, /*#__PURE__*/_react.default.createElement(_pluginSettingWrapper.PluginSettingWrapper, {
      plugin: plugin,
      key: plugin.timestamp || 0
    })))), /*#__PURE__*/_react.default.createElement(_Transition.default, {
      in: !settingOpen,
      timeout: 300
    }, state => /*#__PURE__*/_react.default.createElement(Fade2, {
      className: "plugin-description",
      state: state
    }, /*#__PURE__*/_react.default.createElement(_reactRemarkable.default, {
      options: {
        linkTarget: '_blank'
      },
      source: installable ? plugin[`des${window.language}`] : plugin.description
    }))))));
  }
}) || _class);