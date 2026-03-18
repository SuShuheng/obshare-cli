const {
  Plugin,
  Notice,
  MarkdownRenderer,
  Component,
  PluginSettingTab,
  Setting,
} = require("obsidian");
const childProcess = require("child_process");
const fs = require("fs/promises");
const os = require("os");
const path = require("path");

const REPOSITORY_URL = "https://github.com/SuShuheng/obshare-cli";
const MINICONDA_URL = "https://docs.conda.io/en/latest/miniconda.html";

const TAB_ENVIRONMENT = "environment";
const TAB_UPLOAD = "upload";
const TAB_DOCUMENTS = "documents";
const TAB_ABOUT = "about";

const TAB_DEFINITIONS = [
  { id: TAB_ENVIRONMENT, labelKey: "tabs.environment" },
  { id: TAB_UPLOAD, labelKey: "tabs.upload" },
  { id: TAB_DOCUMENTS, labelKey: "tabs.documents" },
  { id: TAB_ABOUT, labelKey: "tabs.about" },
];

const MESSAGES = {
  zh_cn: {
    "shell.title": "obshare-cli",
    "shell.intro":
      "面向 obshare-cli 的桌面协作插件，用于环境配置、文档管理与 Mermaid 渲染桥接。",
    "tabs.environment": "环境配置",
    "tabs.upload": "上传配置",
    "tabs.documents": "文档管理",
    "tabs.about": "关于",
    "common.refresh": "刷新",
    "common.copy": "复制",
    "common.execute": "执行",
    "common.save": "保存",
    "common.import": "导入",
    "common.export": "导出",
    "common.open": "打开",
    "common.delete": "删除",
    "common.public": "公开",
    "common.private": "私有",
    "common.testConnectivity": "测试连通性",
    "common.recommended": "推荐",
    "common.notRecommended": "不推荐",
    "common.browse": "打开",
    "common.unknown": "未知",
    "common.available": "可用",
    "env.title": "环境配置",
    "env.description":
      "检测 conda、Python、Obsidian CLI 与 obshare-cli 的可用性，并保存插件后续执行 CLI 所使用的运行时绑定。",
    "env.refresh.name": "刷新环境状态",
    "env.refresh.desc":
      "重新探测 conda、conda 环境 obsd、Python、pip、Obsidian CLI 与 obshare-cli。",
    "env.runtimeType.name": "运行环境",
    "env.runtimeType.desc": "优先推荐 conda (obsd)。venv 与 system Python 仅作为兼容方案。",
    "env.runtimeType.conda": "conda (obsd) · 推荐",
    "env.runtimeType.venv": "venv (obsd) · 不推荐",
    "env.runtimeType.system": "system Python · 不推荐",
    "env.executionMode.name": "CLI 调用方式",
    "env.executionMode.desc":
      "当绑定 conda (obsd) 时，优先使用 conda run -n obsd；也支持切换到环境内 Python 绝对路径。",
    "env.executionMode.condaRun": "conda run -n obsd · 推荐",
    "env.executionMode.condaPython": "obsd Python 路径 -m obshare_cli",
    "env.executionMode.venvPython": "venv Python 路径 -m obshare_cli",
    "env.executionMode.systemPython": "system Python -m obshare_cli",
    "env.conda.name": "conda 可执行文件",
    "env.conda.desc": "默认优先使用 conda 命令调用 obshare-cli。",
    "env.condaEnv.name": "conda 环境名称",
    "env.condaEnv.desc": "与既有标准保持一致，固定为 obsd。",
    "env.condaPython.name": "obsd 环境 Python 路径",
    "env.condaPython.desc":
      "当你选择使用环境内 Python 绝对路径调用时，在这里绑定 obsd 环境的 Python 路径。",
    "env.python.name": "绑定的 Python 可执行文件",
    "env.python.desc": "system Python 模式下用于执行 CLI 的 Python 解释器。",
    "env.cli.name": "绑定的 obshare-cli 可执行文件",
    "env.cli.desc":
      "system Python 模式下可选的 obshare-cli 可执行文件绝对路径覆盖。conda 模式会优先使用 conda 绑定。",
    "env.venv.name": "venv 路径",
    "env.venv.desc": "venv (obsd) 模式下所使用的虚拟环境目录。",
    "env.envName.name": "venv/conda 环境名称",
    "env.envName.desc": "统一固定为 obsd，与既有标准保持一致。",
    "env.bridge.name": "Bridge 目录",
    "env.bridge.desc": "供 obshare-cli 与此 Obsidian 插件共同访问的共享目录。",
    "env.timeout.name": "渲染超时",
    "env.timeout.desc": "等待 Mermaid SVG 渲染完成的最长时间。",
    "env.installGuidance": "安装指引",
    "env.installGuidance.conda":
      "推荐使用 conda 创建固定名称为 obsd 的环境，并优先通过 conda run -n obsd 调用 obshare-cli。",
    "env.installGuidance.venv":
      "venv 仅作为兼容方案。插件会使用固定名称为 obsd 的虚拟环境目录并通过环境内 Python 调用 obshare-cli。",
    "env.installGuidance.system":
      "system Python 仅作为兼容方案。插件会在当前绑定解释器中安装或升级 obshare-cli。",
    "env.miniconda.title": "Miniconda 安装引导",
    "env.miniconda.desc":
      "未检测到 conda。建议优先安装更轻量的 Miniconda，然后创建名为 obsd 的环境并在其中安装 obshare-cli。",
    "env.miniconda.open": "打开 Miniconda 官网",
    "env.installActions.name": "安装命令操作",
    "env.installActions.desc": "复制生成的命令或直接在 Obsidian 中执行。",
    "env.boundRuntime.name": "当前绑定运行环境",
    "env.boundRuntime.desc": "文档管理、上传配置测试、以及 CLI 更新都会复用这里的绑定配置。",
    "env.lastInstall": "最近一次安装结果",
    "upload.title": "上传配置",
    "upload.description": "管理存放在 ~/.obshare 中的共享飞书上传配置。",
    "upload.refresh.name": "刷新共享配置",
    "upload.refresh.desc": "通过 CLI 的原始 JSON 接口读取当前共享配置真实值，并可测试连通性。",
    "upload.appId.name": "App ID",
    "upload.appId.desc": "通过 CLI 原始配置导出接口读取真实值。",
    "upload.appSecret.name": "App Secret",
    "upload.appSecret.desc": "通过 CLI 原始配置导出接口读取真实值。",
    "upload.folderToken.name": "Folder Token",
    "upload.folderToken.desc": "通过 CLI 原始配置导出接口读取真实值。",
    "upload.userId.name": "User ID",
    "upload.userId.desc": "用于文档所有权和权限操作的飞书 User ID。",
    "upload.save.name": "保存共享配置",
    "upload.save.desc": "通过 obshare-cli 的 config 子命令持久化更新。",
    "upload.import.name": "导入路径",
    "upload.import.desc": "把已有配置文件复制到 ~/.obshare/config.json。",
    "upload.export.name": "导出路径",
    "upload.export.desc": "把当前共享配置导出到指定路径。",
    "docs.title": "文档管理",
    "docs.description": "读取共享上传历史，并通过 obshare-cli 执行删除和权限更新操作。",
    "docs.refresh.name": "刷新历史记录",
    "docs.refresh.desc": "重新读取 ~/.obshare/history.json",
    "docs.empty": "当前没有共享历史记录。",
    "docs.untitled": "未命名文档",
    "docs.token": "Token",
    "docs.url": "URL",
    "docs.time": "时间",
    "docs.permissions": "权限",
    "docs.publicOpen": "公开 + 可复制/下载",
    "about.title": "关于",
    "about.description": "查看插件版本、CLI 版本、仓库地址与插件/CLI 更新入口。",
    "about.language.name": "插件语言",
    "about.language.desc": "切换插件界面语言。技术名词保持英文。",
    "about.language.zh_cn": "中文(简体)",
    "about.language.en_us": "English",
    "about.pluginVersion": "插件版本",
    "about.cliVersion": "CLI 版本",
    "about.repository": "仓库地址",
    "about.pluginUpdate": "插件更新指引",
    "about.pluginUpdateDesc":
      "使用仓库中的最新插件文件替换 .obsidian/plugins/obshare-cli/ 下的内容，然后在 Obsidian 中重新加载插件。",
    "about.pluginActions.name": "插件更新操作",
    "about.pluginActions.desc": "打开仓库查看最新插件文件或版本说明。",
    "about.cliUpdate": "CLI 更新",
    "about.cliActions.name": "CLI 更新操作",
    "about.cliActions.desc": "在当前绑定运行环境中升级 obshare-cli。",
    "status.detectedOs": "检测到的系统",
    "status.conda": "conda",
    "status.condaEnv": "conda env: obsd",
    "status.python": "Python",
    "status.pip": "pip",
    "status.obsidianCli": "Obsidian CLI",
    "status.obshareCli": "obshare-cli",
    "status.missing": "缺失",
    "status.unavailable": "不可用",
    "status.primaryPlatform": "主要支持平台",
    "status.nonTargetPlatform": "非目标运行平台",
    "status.pythonMissing": "未检测到 Python",
    "status.pipMissing": "未检测到 pip",
    "status.condaMissing": "未检测到 conda",
    "status.condaEnvMissing": "未检测到 conda 环境 obsd",
    "status.obsidianCliMissing": "未检测到 Obsidian CLI",
    "status.obshareCliMissing": "未检测到 obshare-cli",
    "status.path": "路径",
    "status.command": "命令",
    "notice.copyUnavailable": "当前环境无法使用剪贴板。",
    "notice.copied": "已复制到剪贴板。",
    "notice.envRefreshed": "已刷新 obshare-cli 环境状态。",
    "notice.installDone": "obshare-cli 安装命令已执行完成。",
    "notice.installFailed": "obshare-cli 安装命令执行失败。",
    "notice.uploadSaved": "已通过 obshare-cli 保存上传配置。",
    "notice.uploadImported": "已导入共享上传配置。",
    "notice.uploadExported": "已导出共享上传配置。",
    "notice.connectivityOk": "CLI 连通性测试成功。",
    "notice.connectivityFailed": "CLI 连通性测试失败。",
    "notice.deleted": "已删除 {token}",
    "notice.deleteFailed": "删除 {token} 失败",
    "notice.permissionsUpdated": "已更新 {token} 的权限",
    "notice.permissionsFailed": "更新 {token} 的权限失败",
    "notice.languageChanged": "已切换插件语言。",
    "about.pluginId": "插件 ID",
    "status.lastInstallSuccess": "命令已成功执行。",
    "upload.loaded": "已通过 CLI 原始导出接口加载共享配置。",
    "upload.loadFailed": "通过 CLI 加载共享配置失败。",
    "upload.noSaveAction": "当前没有可保存的字段。",
    "upload.importEmpty": "导入路径为空。",
    "upload.exportEmpty": "导出路径为空。",
    "upload.imported": "已从 {path} 导入共享配置。",
    "upload.exported": "已导出共享配置到 {path}。",
    "history.none": "当前还没有共享历史文件。",
    "history.failed": "读取共享历史失败: {error}",
    "bridge.notConfigured": "尚未配置 Bridge 目录。",
    "bridge.noPending": "当前没有待处理的渲染请求。",
  },
  en_us: {
    "shell.title": "obshare-cli",
    "shell.intro":
      "Desktop companion plugin for obshare-cli environment setup, document management, and Mermaid bridge rendering.",
    "tabs.environment": "Environment Configuration",
    "tabs.upload": "Upload Configuration",
    "tabs.documents": "Document Management",
    "tabs.about": "About",
    "common.refresh": "Refresh",
    "common.copy": "Copy",
    "common.execute": "Execute",
    "common.save": "Save",
    "common.import": "Import",
    "common.export": "Export",
    "common.open": "Open",
    "common.delete": "Delete",
    "common.public": "Public",
    "common.private": "Private",
    "common.testConnectivity": "Test Connectivity",
    "common.recommended": "Recommended",
    "common.notRecommended": "Not Recommended",
    "common.browse": "Open",
    "common.unknown": "Unknown",
    "common.available": "Available",
    "env.title": "Environment Configuration",
    "env.description":
      "Detect conda, Python, Obsidian CLI, and obshare-cli availability, then persist the runtime binding used for future CLI calls.",
    "env.refresh.name": "Refresh Environment Status",
    "env.refresh.desc":
      "Probe conda, conda env obsd, Python, pip, Obsidian CLI, and obshare-cli again.",
    "env.runtimeType.name": "Runtime",
    "env.runtimeType.desc":
      "Prefer conda (obsd). venv and system Python remain available as compatibility paths.",
    "env.runtimeType.conda": "conda (obsd) · Recommended",
    "env.runtimeType.venv": "venv (obsd) · Not Recommended",
    "env.runtimeType.system": "system Python · Not Recommended",
    "env.executionMode.name": "CLI Execution Mode",
    "env.executionMode.desc":
      "When bound to conda (obsd), prefer conda run -n obsd and optionally switch to the absolute Python path inside the env.",
    "env.executionMode.condaRun": "conda run -n obsd · Recommended",
    "env.executionMode.condaPython": "obsd Python Path -m obshare_cli",
    "env.executionMode.venvPython": "venv Python Path -m obshare_cli",
    "env.executionMode.systemPython": "system Python -m obshare_cli",
    "env.conda.name": "conda Executable",
    "env.conda.desc": "The plugin prefers calling obshare-cli through the conda command in conda mode.",
    "env.condaEnv.name": "conda Environment Name",
    "env.condaEnv.desc": "Fixed to obsd to stay aligned with the existing standard.",
    "env.condaPython.name": "obsd Python Path",
    "env.condaPython.desc":
      "Bind the absolute Python path inside the obsd environment when you choose the conda-python execution path.",
    "env.python.name": "Bound Python Executable",
    "env.python.desc": "The Python interpreter used when system Python mode is selected.",
    "env.cli.name": "Bound obshare-cli Executable",
    "env.cli.desc":
      "Optional absolute obshare-cli executable override for system Python mode. conda mode still prefers its conda binding.",
    "env.venv.name": "venv Path",
    "env.venv.desc": "The virtual-environment directory used by the venv (obsd) compatibility path.",
    "env.envName.name": "venv/conda Environment Name",
    "env.envName.desc": "Fixed to obsd to stay aligned with the existing standard.",
    "env.bridge.name": "Bridge Directory",
    "env.bridge.desc": "Shared directory readable by both obshare-cli and this Obsidian plugin.",
    "env.timeout.name": "Render Timeout",
    "env.timeout.desc": "Maximum time to wait for Mermaid SVG rendering.",
    "env.installGuidance": "Installation Guidance",
    "env.installGuidance.conda":
      "Preferred path: create the fixed conda environment named obsd, then call obshare-cli through conda run -n obsd.",
    "env.installGuidance.venv":
      "venv is a compatibility path. The plugin uses the fixed virtual environment named obsd and calls obshare-cli through the env-local Python.",
    "env.installGuidance.system":
      "system Python is a compatibility path. The plugin installs or upgrades obshare-cli in the currently bound interpreter.",
    "env.miniconda.title": "Miniconda Guidance",
    "env.miniconda.desc":
      "conda was not detected. Install the lighter Miniconda first, then create the obsd environment and install obshare-cli there.",
    "env.miniconda.open": "Open Miniconda Website",
    "env.installActions.name": "Install Command Actions",
    "env.installActions.desc": "Copy the generated command or execute it directly from Obsidian.",
    "env.boundRuntime.name": "Current Runtime Binding",
    "env.boundRuntime.desc":
      "Document Management, Upload Configuration testing, and CLI upgrades all reuse this binding.",
    "env.lastInstall": "Last Install Result",
    "upload.title": "Upload Configuration",
    "upload.description": "Manage the shared Feishu upload configuration stored under ~/.obshare.",
    "upload.refresh.name": "Refresh Shared Configuration",
    "upload.refresh.desc":
      "Load the true shared configuration values through the raw CLI JSON export contract and test connectivity.",
    "upload.appId.name": "App ID",
    "upload.appId.desc": "Loaded as a real value through the raw CLI config export contract.",
    "upload.appSecret.name": "App Secret",
    "upload.appSecret.desc": "Loaded as a real value through the raw CLI config export contract.",
    "upload.folderToken.name": "Folder Token",
    "upload.folderToken.desc": "Loaded as a real value through the raw CLI config export contract.",
    "upload.userId.name": "User ID",
    "upload.userId.desc": "The Feishu User ID used for ownership and permission operations.",
    "upload.save.name": "Save Shared Configuration",
    "upload.save.desc": "Persist updates through obshare-cli config subcommands.",
    "upload.import.name": "Import Path",
    "upload.import.desc": "Copy an existing config file into ~/.obshare/config.json.",
    "upload.export.name": "Export Path",
    "upload.export.desc": "Copy the current shared config to another path.",
    "docs.title": "Document Management",
    "docs.description": "Read shared upload history and dispatch delete or permission updates through obshare-cli.",
    "docs.refresh.name": "Refresh History",
    "docs.refresh.desc": "Reload ~/.obshare/history.json",
    "docs.empty": "No shared history records found.",
    "docs.untitled": "Untitled Document",
    "docs.token": "Token",
    "docs.url": "URL",
    "docs.time": "Time",
    "docs.permissions": "Permissions",
    "docs.publicOpen": "Public + Copy/Download",
    "about.title": "About",
    "about.description":
      "Version, repository, and update controls for both the Obsidian plugin and the bound obshare-cli runtime.",
    "about.language.name": "Plugin Language",
    "about.language.desc": "Switch the plugin UI language. Technical nouns remain in English.",
    "about.language.zh_cn": "中文(简体)",
    "about.language.en_us": "English",
    "about.pluginVersion": "Plugin Version",
    "about.cliVersion": "CLI Version",
    "about.repository": "Repository",
    "about.pluginUpdate": "Plugin Update Guidance",
    "about.pluginUpdateDesc":
      "Replace the plugin files under .obsidian/plugins/obshare-cli/ with the latest release contents from the repository, then reload the plugin in Obsidian.",
    "about.pluginActions.name": "Plugin Update Actions",
    "about.pluginActions.desc": "Open the repository for plugin release notes and updated plugin files.",
    "about.cliUpdate": "CLI Update",
    "about.cliActions.name": "CLI Update Actions",
    "about.cliActions.desc": "Upgrade obshare-cli in the currently bound runtime.",
    "status.detectedOs": "Detected OS",
    "status.conda": "conda",
    "status.condaEnv": "conda env: obsd",
    "status.python": "Python",
    "status.pip": "pip",
    "status.obsidianCli": "Obsidian CLI",
    "status.obshareCli": "obshare-cli",
    "status.missing": "Missing",
    "status.unavailable": "Unavailable",
    "status.primaryPlatform": "Primary supported platform",
    "status.nonTargetPlatform": "Non-target development platform",
    "status.pythonMissing": "Python not found",
    "status.pipMissing": "pip not found",
    "status.condaMissing": "conda not found",
    "status.condaEnvMissing": "conda environment obsd not found",
    "status.obsidianCliMissing": "Obsidian CLI not found",
    "status.obshareCliMissing": "obshare-cli not found",
    "status.path": "Path",
    "status.command": "Command",
    "notice.copyUnavailable": "Clipboard access is unavailable in this environment.",
    "notice.copied": "Copied to clipboard.",
    "notice.envRefreshed": "obshare-cli environment status refreshed.",
    "notice.installDone": "The obshare-cli install command finished.",
    "notice.installFailed": "The obshare-cli install command failed.",
    "notice.uploadSaved": "Upload configuration saved through obshare-cli.",
    "notice.uploadImported": "Shared upload configuration imported.",
    "notice.uploadExported": "Shared upload configuration exported.",
    "notice.connectivityOk": "CLI connectivity test succeeded.",
    "notice.connectivityFailed": "CLI connectivity test failed.",
    "notice.deleted": "Deleted {token}",
    "notice.deleteFailed": "Failed to delete {token}",
    "notice.permissionsUpdated": "Updated permissions for {token}",
    "notice.permissionsFailed": "Failed to update permissions for {token}",
    "notice.languageChanged": "Plugin language changed.",
    "about.pluginId": "Plugin ID",
    "status.lastInstallSuccess": "Command completed successfully.",
    "upload.loaded": "Loaded shared configuration through the raw CLI export contract.",
    "upload.loadFailed": "Failed to load shared configuration through the CLI.",
    "upload.noSaveAction": "No save action was performed.",
    "upload.importEmpty": "Import path is empty.",
    "upload.exportEmpty": "Export path is empty.",
    "upload.imported": "Imported shared config from {path}.",
    "upload.exported": "Exported shared config to {path}.",
    "history.none": "No shared history file found yet.",
    "history.failed": "Failed to read shared history: {error}",
    "bridge.notConfigured": "Bridge directory is not configured.",
    "bridge.noPending": "No pending render request was found.",
  },
};

const DEFAULT_SETTINGS = {
  activeTab: TAB_ENVIRONMENT,
  bridgeDir: "",
  renderTimeoutMs: 10000,
  scale: 2,
  backgroundColor: "#ffffff",
  installMode: "system",
  runtimeType: "conda",
  executionMode: "conda-run",
  condaExecutable: "",
  condaEnvName: "obsd",
  condaPythonExecutable: "",
  isolatedEnvName: "obsd",
  boundPythonExecutable: "",
  boundCliExecutable: "",
  boundVirtualEnvPath: "",
  language: "zh_cn",
  lastEnvironmentStatus: null,
  lastInstallCommand: "",
  lastInstallOutput: "",
  uploadConfigDraft: {
    appId: "",
    appSecret: "",
    folderToken: "",
    userId: "",
  },
  uploadConfigImportPath: "",
  uploadConfigExportPath: "",
  uploadConfigStatus: "",
  historyRecords: [],
  historyStatus: "",
};

class ObSharePluginSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.addClass("obshare-cli-settings");

    containerEl.createEl("h2", { text: this.plugin.t("shell.title") });
    containerEl.createEl("p", {
      text: this.plugin.t("shell.intro"),
      cls: "obshare-cli-settings__intro",
    });

    this.renderTabs(containerEl);
  }

  renderTabs(containerEl) {
    const tabBar = containerEl.createDiv({ cls: "obshare-cli-tabs" });
    const panel = containerEl.createDiv({ cls: "obshare-cli-panel" });

    TAB_DEFINITIONS.forEach((tab) => {
      const button = tabBar.createEl("button", {
        text: this.plugin.t(tab.labelKey),
        cls: "obshare-cli-tabs__button",
      });
      if (this.plugin.settings.activeTab === tab.id) {
        button.addClass("is-active");
      }
      button.addEventListener("click", async () => {
        this.plugin.settings.activeTab = tab.id;
        await this.plugin.saveSettings();
        this.display();
      });
    });

    switch (this.plugin.settings.activeTab) {
      case TAB_ENVIRONMENT:
        this.renderEnvironmentTab(panel);
        return;
      case TAB_UPLOAD:
        this.renderUploadTab(panel);
        return;
      case TAB_DOCUMENTS:
        this.renderDocumentsTab(panel);
        return;
      case TAB_ABOUT:
        this.renderAboutTab(panel, this.plugin.settings.lastEnvironmentStatus || this.plugin.detectEnvironmentStatus());
        return;
      default:
        this.renderPlaceholderTab(panel, this.plugin.t("common.unknown"), this.plugin.t("common.unknown"));
    }
  }

  renderEnvironmentTab(panel) {
    panel.createEl("h3", { text: this.plugin.t("env.title") });
    panel.createEl("p", { text: this.plugin.t("env.description") });

    new Setting(panel)
      .setName(this.plugin.t("env.refresh.name"))
      .setDesc(this.plugin.t("env.refresh.desc"))
      .addButton((button) =>
        button.setButtonText(this.plugin.t("common.refresh")).onClick(async () => {
          await this.plugin.refreshEnvironmentStatus();
          this.display();
        })
      );

    const status = this.plugin.settings.lastEnvironmentStatus || this.plugin.detectEnvironmentStatus();
    this.renderEnvironmentStatus(panel, status);

    new Setting(panel)
      .setName(this.plugin.t("env.runtimeType.name"))
      .setDesc(this.plugin.t("env.runtimeType.desc"))
      .addDropdown((dropdown) =>
        dropdown
          .addOption("conda", this.plugin.t("env.runtimeType.conda"))
          .addOption("venv", this.plugin.t("env.runtimeType.venv"))
          .addOption("system", this.plugin.t("env.runtimeType.system"))
          .setValue(this.plugin.settings.runtimeType)
          .onChange(async (value) => {
            this.plugin.settings.runtimeType = value;
            this.plugin.settings.executionMode = this.plugin.defaultExecutionModeForRuntime(value);
            await this.plugin.saveSettings();
            this.display();
          })
      );

    new Setting(panel)
      .setName(this.plugin.t("env.executionMode.name"))
      .setDesc(this.plugin.t("env.executionMode.desc"))
      .addDropdown((dropdown) => {
        if (this.plugin.settings.runtimeType === "conda") {
          dropdown
            .addOption("conda-run", this.plugin.t("env.executionMode.condaRun"))
            .addOption("conda-python", this.plugin.t("env.executionMode.condaPython"));
        } else if (this.plugin.settings.runtimeType === "venv") {
          dropdown.addOption("venv-python", this.plugin.t("env.executionMode.venvPython"));
        } else {
          dropdown.addOption("system-python", this.plugin.t("env.executionMode.systemPython"));
        }

        return dropdown
          .setValue(this.plugin.settings.executionMode)
          .onChange(async (value) => {
            this.plugin.settings.executionMode = value;
            await this.plugin.saveSettings();
            this.display();
          });
      });

    new Setting(panel)
      .setName(this.plugin.t("env.boundRuntime.name"))
      .setDesc(this.plugin.t("env.boundRuntime.desc"))
      .addText((text) =>
        text
          .setValue(this.plugin.describeCurrentBinding(status))
          .setDisabled(true)
      );

    new Setting(panel)
      .setName(this.plugin.t("env.conda.name"))
      .setDesc(this.plugin.t("env.conda.desc"))
      .addText((text) =>
        text
          .setPlaceholder(status.conda.path || "conda")
          .setValue(this.plugin.settings.condaExecutable || "")
          .onChange(async (value) => {
            this.plugin.settings.condaExecutable = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(panel)
      .setName(this.plugin.t("env.condaEnv.name"))
      .setDesc(this.plugin.t("env.condaEnv.desc"))
      .addText((text) => text.setValue(this.plugin.settings.condaEnvName || "obsd").setDisabled(true));

    new Setting(panel)
      .setName(this.plugin.t("env.condaPython.name"))
      .setDesc(this.plugin.t("env.condaPython.desc"))
      .addText((text) =>
        text
          .setPlaceholder(status.condaEnv.pythonPath || this.plugin.defaultCondaPythonPath(status.condaEnv.prefix))
          .setValue(this.plugin.settings.condaPythonExecutable || "")
          .onChange(async (value) => {
            this.plugin.settings.condaPythonExecutable = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(panel)
      .setName(this.plugin.t("env.python.name"))
      .setDesc(this.plugin.t("env.python.desc"))
      .addText((text) =>
        text
          .setPlaceholder(status.python.path || this.plugin.defaultPythonCommand())
          .setValue(this.plugin.settings.boundPythonExecutable)
          .onChange(async (value) => {
            this.plugin.settings.boundPythonExecutable = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(panel)
      .setName(this.plugin.t("env.cli.name"))
      .setDesc(this.plugin.t("env.cli.desc"))
      .addText((text) =>
        text
          .setPlaceholder(status.obshareCli.path || "obshare-cli")
          .setValue(this.plugin.settings.boundCliExecutable)
          .onChange(async (value) => {
            this.plugin.settings.boundCliExecutable = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(panel)
      .setName(this.plugin.t("env.venv.name"))
      .setDesc(this.plugin.t("env.venv.desc"))
      .addText((text) =>
        text
          .setPlaceholder(this.plugin.defaultIsolatedEnvPath())
          .setValue(this.plugin.settings.boundVirtualEnvPath)
          .onChange(async (value) => {
            this.plugin.settings.boundVirtualEnvPath = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(panel)
      .setName(this.plugin.t("env.envName.name"))
      .setDesc(this.plugin.t("env.envName.desc"))
      .addText((text) => text.setValue(this.plugin.settings.isolatedEnvName).setDisabled(true));

    new Setting(panel)
      .setName(this.plugin.t("env.bridge.name"))
      .setDesc(this.plugin.t("env.bridge.desc"))
      .addText((text) =>
        text
          .setPlaceholder("/path/to/obshare-bridge")
          .setValue(this.plugin.settings.bridgeDir)
          .onChange(async (value) => {
            this.plugin.settings.bridgeDir = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(panel)
      .setName(this.plugin.t("env.timeout.name"))
      .setDesc(this.plugin.t("env.timeout.desc"))
      .addText((text) =>
        text
          .setPlaceholder("10000")
          .setValue(String(this.plugin.settings.renderTimeoutMs))
          .onChange(async (value) => {
            const parsed = Number.parseInt(value, 10);
            if (!Number.isNaN(parsed) && parsed > 0) {
              this.plugin.settings.renderTimeoutMs = parsed;
              await this.plugin.saveSettings();
            }
          })
      );

    const installCommand = this.plugin.generateInstallCommand();
    panel.createEl("h4", { text: this.plugin.t("env.installGuidance") });
    panel.createEl("p", {
      text: this.plugin.installGuidanceText(),
    });

    if (!status.conda.ok) {
      panel.createEl("h4", { text: this.plugin.t("env.miniconda.title") });
      panel.createEl("p", { text: this.plugin.t("env.miniconda.desc") });
      new Setting(panel)
        .setName(this.plugin.t("env.miniconda.title"))
        .setDesc(this.plugin.t("env.miniconda.desc"))
        .addButton((button) =>
          button.setButtonText(this.plugin.t("env.miniconda.open")).setCta().onClick(() => {
            window.open(MINICONDA_URL, "_blank");
          })
        )
        .addButton((button) =>
          button.setButtonText(this.plugin.t("common.copy")).onClick(async () => {
            await this.plugin.copyText(MINICONDA_URL);
          })
        );
    }

    const installBox = panel.createEl("pre", { cls: "obshare-cli-command-box" });
    installBox.setText(installCommand);

    new Setting(panel)
      .setName(this.plugin.t("env.installActions.name"))
      .setDesc(this.plugin.t("env.installActions.desc"))
      .addButton((button) =>
        button.setButtonText(this.plugin.t("common.copy")).onClick(async () => {
          await this.plugin.copyText(installCommand);
        })
      )
      .addButton((button) =>
        button.setButtonText(this.plugin.t("common.execute")).setCta().onClick(async () => {
          await this.plugin.executeInstallCommand(installCommand);
          this.display();
        })
      );

    if (this.plugin.settings.lastInstallOutput) {
      panel.createEl("h4", { text: this.plugin.t("env.lastInstall") });
      panel.createEl("pre", {
        text: this.plugin.settings.lastInstallOutput,
        cls: "obshare-cli-command-box",
      });
    }
  }

  renderUploadTab(panel) {
    panel.createEl("h3", { text: this.plugin.t("upload.title") });
    panel.createEl("p", { text: this.plugin.t("upload.description") });

    new Setting(panel)
      .setName(this.plugin.t("upload.refresh.name"))
      .setDesc(this.plugin.t("upload.refresh.desc"))
      .addButton((button) =>
        button.setButtonText(this.plugin.t("common.refresh")).onClick(async () => {
          await this.plugin.loadUploadConfigDraft();
          this.display();
        })
      )
      .addButton((button) =>
        button.setButtonText(this.plugin.t("common.testConnectivity")).onClick(async () => {
          await this.plugin.testUploadConfig();
          this.display();
        })
      );

    const draft = this.plugin.settings.uploadConfigDraft;

    new Setting(panel)
      .setName(this.plugin.t("upload.appId.name"))
      .setDesc(this.plugin.t("upload.appId.desc"))
      .addText((text) =>
        text.setValue(draft.appId || "").onChange(async (value) => {
          this.plugin.settings.uploadConfigDraft.appId = value.trim();
          await this.plugin.saveSettings();
        })
      );

    new Setting(panel)
      .setName(this.plugin.t("upload.appSecret.name"))
      .setDesc(this.plugin.t("upload.appSecret.desc"))
      .addText((text) =>
        text.setValue(draft.appSecret || "").onChange(async (value) => {
          this.plugin.settings.uploadConfigDraft.appSecret = value.trim();
          await this.plugin.saveSettings();
        })
      );

    new Setting(panel)
      .setName(this.plugin.t("upload.folderToken.name"))
      .setDesc(this.plugin.t("upload.folderToken.desc"))
      .addText((text) =>
        text.setValue(draft.folderToken || "").onChange(async (value) => {
          this.plugin.settings.uploadConfigDraft.folderToken = value.trim();
          await this.plugin.saveSettings();
        })
      );

    new Setting(panel)
      .setName(this.plugin.t("upload.userId.name"))
      .setDesc(this.plugin.t("upload.userId.desc"))
      .addText((text) =>
        text.setValue(draft.userId || "").onChange(async (value) => {
          this.plugin.settings.uploadConfigDraft.userId = value.trim();
          await this.plugin.saveSettings();
        })
      );

    new Setting(panel)
      .setName(this.plugin.t("upload.save.name"))
      .setDesc(this.plugin.t("upload.save.desc"))
      .addButton((button) =>
        button.setButtonText(this.plugin.t("common.save")).setCta().onClick(async () => {
          await this.plugin.saveUploadConfigDraft();
          this.display();
        })
      );

    new Setting(panel)
      .setName(this.plugin.t("upload.import.name"))
      .setDesc(this.plugin.t("upload.import.desc"))
      .addText((text) =>
        text
          .setPlaceholder("/path/to/config.json")
          .setValue(this.plugin.settings.uploadConfigImportPath)
          .onChange(async (value) => {
            this.plugin.settings.uploadConfigImportPath = value.trim();
            await this.plugin.saveSettings();
          })
      )
      .addButton((button) =>
        button.setButtonText(this.plugin.t("common.import")).onClick(async () => {
          await this.plugin.importUploadConfig();
          this.display();
        })
      );

    new Setting(panel)
      .setName(this.plugin.t("upload.export.name"))
      .setDesc(this.plugin.t("upload.export.desc"))
      .addText((text) =>
        text
          .setPlaceholder("/path/to/exported-config.json")
          .setValue(this.plugin.settings.uploadConfigExportPath)
          .onChange(async (value) => {
            this.plugin.settings.uploadConfigExportPath = value.trim();
            await this.plugin.saveSettings();
          })
      )
      .addButton((button) =>
        button.setButtonText(this.plugin.t("common.export")).onClick(async () => {
          await this.plugin.exportUploadConfig();
          this.display();
        })
      );

    if (this.plugin.settings.uploadConfigStatus) {
      panel.createEl("pre", {
        text: this.plugin.settings.uploadConfigStatus,
        cls: "obshare-cli-command-box",
      });
    }
  }

  renderDocumentsTab(panel) {
    panel.createEl("h3", { text: this.plugin.t("docs.title") });
    panel.createEl("p", { text: this.plugin.t("docs.description") });

    new Setting(panel)
      .setName(this.plugin.t("docs.refresh.name"))
      .setDesc(this.plugin.t("docs.refresh.desc"))
      .addButton((button) =>
        button.setButtonText(this.plugin.t("common.refresh")).onClick(async () => {
          await this.plugin.refreshHistory();
          this.display();
        })
      );

    if (this.plugin.settings.historyStatus) {
      panel.createEl("pre", {
        text: this.plugin.settings.historyStatus,
        cls: "obshare-cli-command-box",
      });
    }

    const records = this.plugin.settings.historyRecords || [];
    if (!records.length) {
      panel.createEl("p", {
        text: this.plugin.t("docs.empty"),
        cls: "obshare-cli-empty",
      });
      return;
    }

    const list = panel.createDiv({ cls: "obshare-cli-history-list" });
    records.forEach((item) => {
      const card = list.createDiv({ cls: "obshare-cli-history-card" });
      card.createEl("h4", { text: item.title || this.plugin.t("docs.untitled") });
      card.createEl("div", {
        text: `${this.plugin.t("docs.token")}: ${item.docToken || this.plugin.t("common.unknown")}`,
        cls: "obshare-cli-history-card__meta",
      });
      card.createEl("div", {
        text: `${this.plugin.t("docs.url")}: ${item.url || this.plugin.t("common.unknown")}`,
        cls: "obshare-cli-history-card__meta",
      });
      card.createEl("div", {
        text: `${this.plugin.t("docs.time")}: ${item.uploadTime || this.plugin.t("common.unknown")}`,
        cls: "obshare-cli-history-card__meta",
      });

      const permissions = item.permissions || {};
      card.createEl("div", {
        text: `${this.plugin.t("docs.permissions")}: public=${Boolean(permissions.isPublic)}, copy=${Boolean(
          permissions.allowCopy
        )}, download=${Boolean(permissions.allowCreateCopy)}`,
        cls: "obshare-cli-history-card__meta",
      });

      const actions = card.createDiv({ cls: "obshare-cli-history-card__actions" });
      const openButton = actions.createEl("button", { text: this.plugin.t("common.open") });
      openButton.addEventListener("click", () => {
        if (item.url) {
          window.open(item.url, "_blank");
        }
      });

      const deleteButton = actions.createEl("button", { text: this.plugin.t("common.delete") });
      deleteButton.addEventListener("click", async () => {
        await this.plugin.deleteDocument(item.docToken);
        this.display();
      });

      const publicButton = actions.createEl("button", { text: this.plugin.t("common.public") });
      publicButton.addEventListener("click", async () => {
        await this.plugin.updateDocumentPermissions(item.docToken, {
          public: true,
          allowCopy: false,
          allowDownload: false,
        });
        this.display();
      });

      const openAccessButton = actions.createEl("button", {
        text: this.plugin.t("docs.publicOpen"),
      });
      openAccessButton.addEventListener("click", async () => {
        await this.plugin.updateDocumentPermissions(item.docToken, {
          public: true,
          allowCopy: true,
          allowDownload: true,
        });
        this.display();
      });

      const privateButton = actions.createEl("button", { text: this.plugin.t("common.private") });
      privateButton.addEventListener("click", async () => {
        await this.plugin.updateDocumentPermissions(item.docToken, {
          public: false,
          allowCopy: false,
          allowDownload: false,
        });
        this.display();
      });
    });
  }

  renderAboutTab(panel, status) {
    panel.createEl("h3", { text: this.plugin.t("about.title") });
    panel.createEl("p", { text: this.plugin.t("about.description") });

    new Setting(panel)
      .setName(this.plugin.t("about.language.name"))
      .setDesc(this.plugin.t("about.language.desc"))
      .addDropdown((dropdown) =>
        dropdown
          .addOption("zh_cn", this.plugin.t("about.language.zh_cn"))
          .addOption("en_us", this.plugin.t("about.language.en_us"))
          .setValue(this.plugin.settings.language)
          .onChange(async (value) => {
            this.plugin.settings.language = value;
            await this.plugin.saveSettings();
            new Notice(this.plugin.t("notice.languageChanged"));
            this.display();
          })
      );

    const infoGrid = panel.createDiv({ cls: "obshare-cli-status-grid" });
    this.renderStatusCard(infoGrid, this.plugin.t("about.pluginVersion"), {
      ok: true,
      primaryValue: this.plugin.manifest.version,
      secondaryText: `${this.plugin.t("about.pluginId")}: ${this.plugin.manifest.id}`,
    });
    this.renderStatusCard(infoGrid, this.plugin.t("about.cliVersion"), status.obshareCli);
    this.renderStatusCard(infoGrid, this.plugin.t("about.repository"), {
      ok: true,
      primaryValue: "GitHub",
      secondaryText: REPOSITORY_URL,
    });

    panel.createEl("h4", { text: this.plugin.t("about.pluginUpdate") });
    panel.createEl("p", { text: this.plugin.t("about.pluginUpdateDesc") });
    new Setting(panel)
      .setName(this.plugin.t("about.pluginActions.name"))
      .setDesc(this.plugin.t("about.pluginActions.desc"))
      .addButton((button) =>
        button.setButtonText(this.plugin.t("common.open")).setCta().onClick(() => {
          window.open(REPOSITORY_URL, "_blank");
        })
      )
      .addButton((button) =>
        button.setButtonText(this.plugin.t("common.copy")).onClick(async () => {
          await this.plugin.copyText(REPOSITORY_URL);
        })
      );

    const upgradeCommand = this.plugin.generateUpgradeCommand();
    panel.createEl("h4", { text: this.plugin.t("about.cliUpdate") });
    panel.createEl("pre", {
      text: upgradeCommand,
      cls: "obshare-cli-command-box",
    });
    new Setting(panel)
      .setName(this.plugin.t("about.cliActions.name"))
      .setDesc(this.plugin.t("about.cliActions.desc"))
      .addButton((button) =>
        button.setButtonText(this.plugin.t("common.copy")).onClick(async () => {
          await this.plugin.copyText(upgradeCommand);
        })
      )
      .addButton((button) =>
        button.setButtonText(this.plugin.t("common.execute")).setCta().onClick(async () => {
          await this.plugin.executeInstallCommand(upgradeCommand);
          this.display();
        })
      );
  }

  renderEnvironmentStatus(panel, status) {
    const statusGrid = panel.createDiv({ cls: "obshare-cli-status-grid" });
    this.renderStatusCard(statusGrid, this.plugin.t("status.detectedOs"), status.os);
    this.renderStatusCard(statusGrid, this.plugin.t("status.conda"), status.conda);
    this.renderStatusCard(statusGrid, this.plugin.t("status.condaEnv"), status.condaEnv);
    this.renderStatusCard(statusGrid, this.plugin.t("status.python"), status.python);
    this.renderStatusCard(statusGrid, this.plugin.t("status.pip"), status.pip);
    this.renderStatusCard(statusGrid, this.plugin.t("status.obsidianCli"), status.obsidianCli);
    this.renderStatusCard(statusGrid, this.plugin.t("status.obshareCli"), status.obshareCli);
  }

  renderStatusCard(container, title, status) {
    const card = container.createDiv({
      cls: `obshare-cli-status-card ${status.ok ? "is-ok" : "is-missing"}`,
    });
    card.createEl("h4", { text: title });
    card.createEl("div", {
      text: status.primaryValue || this.plugin.t("common.unknown"),
      cls: "obshare-cli-status-card__value",
    });
    if (status.secondaryText) {
      card.createEl("div", {
        text: status.secondaryText,
        cls: "obshare-cli-status-card__detail",
      });
    }
  }

  renderPlaceholderTab(panel, title, body) {
    panel.createEl("h3", { text: title });
    panel.createEl("p", { text: body });
  }
}

module.exports = class ObShareCliPlugin extends Plugin {
  async onload() {
    this.settings = this.normalizeSettings(Object.assign({}, DEFAULT_SETTINGS, await this.loadData()));

    this.settings.lastEnvironmentStatus = this.detectEnvironmentStatus();

    await this.loadUploadConfigDraft();
    await this.refreshHistory();
    await this.saveSettings();

    this.addSettingTab(new ObSharePluginSettingTab(this.app, this));

    this.addCommand({
      id: "process-render-request",
      name: "Process next obshare-cli Mermaid render request",
      callback: async () => {
        await this.processNextRequest();
      },
    });
  }

  async saveSettings() {
    this.settings = this.normalizeSettings(this.settings);
    await this.saveData(this.settings);
  }

  t(key, vars = {}) {
    const language = this.settings.language || "zh_cn";
    const messages = MESSAGES[language] || MESSAGES.zh_cn;
    let value = messages[key] || MESSAGES.en_us[key] || key;
    for (const [name, replacement] of Object.entries(vars)) {
      value = value.replaceAll(`{${name}}`, String(replacement));
    }
    return value;
  }

  defaultPythonCommand() {
    return process.platform === "win32" ? "py" : "python3";
  }

  defaultIsolatedEnvPath() {
    return path.join(os.homedir(), ".obshare", this.settings.isolatedEnvName || "obsd");
  }

  defaultExecutionModeForRuntime(runtimeType) {
    if (runtimeType === "conda") {
      return "conda-run";
    }
    if (runtimeType === "venv") {
      return "venv-python";
    }
    return "system-python";
  }

  normalizeSettings(settings) {
    const normalized = Object.assign({}, DEFAULT_SETTINGS, settings || {});
    if (!normalized.runtimeType) {
      normalized.runtimeType = normalized.installMode === "isolated" ? "venv" : "system";
    }
    if (!normalized.executionMode) {
      normalized.executionMode = this.defaultExecutionModeForRuntime(normalized.runtimeType);
    }
    if (normalized.runtimeType === "conda" && !["conda-run", "conda-python"].includes(normalized.executionMode)) {
      normalized.executionMode = "conda-run";
    }
    if (normalized.runtimeType === "venv") {
      normalized.executionMode = "venv-python";
      normalized.installMode = "isolated";
    }
    if (normalized.runtimeType === "system") {
      normalized.executionMode = "system-python";
      normalized.installMode = "system";
    }
    if (normalized.runtimeType === "conda" && !["conda-run", "conda-python"].includes(normalized.executionMode)) {
      normalized.executionMode = "conda-run";
    }
    normalized.condaEnvName = "obsd";
    normalized.isolatedEnvName = "obsd";
    if (!normalized.boundVirtualEnvPath) {
      normalized.boundVirtualEnvPath = path.join(os.homedir(), ".obshare", "obsd");
    }
    if (!normalized.language) {
      normalized.language = "zh_cn";
    }
    return normalized;
  }

  defaultCondaPythonPath(prefix) {
    if (!prefix) {
      return "";
    }
    return process.platform === "win32"
      ? path.join(prefix, "python.exe")
      : path.join(prefix, "bin", "python");
  }

  getSharedConfigPath() {
    return path.join(os.homedir(), ".obshare", "config.json");
  }

  getSharedHistoryPath() {
    return path.join(os.homedir(), ".obshare", "history.json");
  }

  detectEnvironmentStatus() {
    const osStatus = this.detectPlatform();
    const conda = this.detectConda();
    const condaEnv = this.detectCondaEnv(conda.path);
    const python = this.detectPython();
    const pip = this.detectPip(python.path);
    const obsidianCli = this.detectObsidianCli();
    const obshareCli = this.detectObshareCli({ conda, condaEnv, python });

    return {
      os: osStatus,
      conda,
      condaEnv,
      python,
      pip,
      obsidianCli,
      obshareCli,
    };
  }

  async refreshEnvironmentStatus() {
    this.settings.lastEnvironmentStatus = this.detectEnvironmentStatus();
    if (this.settings.lastEnvironmentStatus.conda.path) {
      this.settings.condaExecutable = this.settings.lastEnvironmentStatus.conda.path;
    }
    if (this.settings.lastEnvironmentStatus.condaEnv.pythonPath) {
      this.settings.condaPythonExecutable = this.settings.lastEnvironmentStatus.condaEnv.pythonPath;
    }
    if (this.settings.lastEnvironmentStatus.python.path) {
      this.settings.boundPythonExecutable = this.settings.lastEnvironmentStatus.python.path;
    }
    await this.saveSettings();
    new Notice(this.t("notice.envRefreshed"));
  }

  detectPlatform() {
    const platform = process.platform;
    if (platform === "win32") {
      return {
        ok: true,
        primaryValue: "Windows",
        secondaryText: this.t("status.primaryPlatform"),
      };
    }
    if (platform === "darwin") {
      return {
        ok: true,
        primaryValue: "macOS",
        secondaryText: this.t("status.primaryPlatform"),
      };
    }
    return {
      ok: true,
      primaryValue: platform,
      secondaryText: this.t("status.nonTargetPlatform"),
    };
  }

  detectConda() {
    const candidates = [this.settings.condaExecutable, "conda"].filter(Boolean);
    for (const candidate of candidates) {
      const result = this.runCommand(candidate, ["--version"]);
      if (result.ok) {
        return {
          ok: true,
          primaryValue: this.extractVersionLabel(result.output) || this.t("common.available"),
          secondaryText: this.formatSecondaryText({ pathValue: candidate, extraText: result.output }),
          path: candidate,
        };
      }
    }

    return {
      ok: false,
      primaryValue: this.t("status.missing"),
      secondaryText: this.t("status.condaMissing"),
      path: "",
    };
  }

  detectCondaEnv(condaPath) {
    if (!condaPath) {
      return {
        ok: false,
        primaryValue: this.t("status.missing"),
        secondaryText: this.t("status.condaEnvMissing"),
        prefix: "",
        pythonPath: "",
      };
    }

    const result = this.runCommand(condaPath, ["env", "list", "--json"]);
    if (result.ok) {
      try {
        const parsed = JSON.parse(result.output || "{}");
        const envs = Array.isArray(parsed.envs) ? parsed.envs : [];
        const matchedPrefix = envs.find((entry) => path.basename(entry) === "obsd") || "";
        if (matchedPrefix) {
          const pythonPath = this.defaultCondaPythonPath(matchedPrefix);
          return {
            ok: true,
            primaryValue: "obsd",
            secondaryText: this.formatSecondaryText({ pathValue: matchedPrefix, extraText: pythonPath }),
            prefix: matchedPrefix,
            pythonPath,
          };
        }
      } catch (_) {
        // fall through to text fallback
      }
    }

    return {
      ok: false,
      primaryValue: this.t("status.missing"),
      secondaryText: this.t("status.condaEnvMissing"),
      prefix: "",
      pythonPath: "",
    };
  }

  detectPython() {
    const candidates = process.platform === "win32"
      ? ["py", "python", "python3"]
      : [this.settings.boundPythonExecutable, "python3", "python"].filter(Boolean);

    for (const candidate of candidates) {
      const args = candidate === "py" ? ["-3", "--version"] : ["--version"];
      const result = this.runCommand(candidate, args);
      if (result.ok) {
        return {
          ok: true,
          primaryValue: this.extractVersionLabel(result.output) || this.t("common.available"),
          secondaryText: this.formatSecondaryText({ pathValue: candidate, extraText: result.output }),
          path: candidate,
        };
      }
    }

    return {
      ok: false,
      primaryValue: this.t("status.missing"),
      secondaryText: this.t("status.pythonMissing"),
      path: "",
    };
  }

  detectPip(pythonPath) {
    if (pythonPath) {
      const args = pythonPath === "py" ? ["-3", "-m", "pip", "--version"] : ["-m", "pip", "--version"];
      const result = this.runCommand(pythonPath, args);
      if (result.ok) {
        return {
          ok: true,
          primaryValue: this.extractVersionLabel(result.output) || this.t("common.available"),
          secondaryText: this.formatSecondaryText({ pathValue: pythonPath, extraText: result.output }),
          path: pythonPath,
        };
      }
    }

    return {
      ok: false,
      primaryValue: this.t("status.missing"),
      secondaryText: this.t("status.pipMissing"),
      path: "",
    };
  }

  detectObsidianCli() {
    const candidates = process.platform === "win32" ? ["obsidian", "Obsidian"] : ["obsidian"];
    for (const candidate of candidates) {
      const versionResult = this.runCommand(candidate, ["--version"]);
      if (versionResult.ok) {
        return {
          ok: true,
          primaryValue: this.extractVersionLabel(versionResult.output) || this.t("common.available"),
          secondaryText: this.formatSecondaryText({ pathValue: candidate, extraText: versionResult.output }),
          path: candidate,
        };
      }

      const helpResult = this.runCommand(candidate, ["--help"]);
      if (helpResult.output) {
        return this.parseObsidianCliStatus(candidate, helpResult.output, helpResult.ok);
      }
    }

    return {
      ok: false,
      primaryValue: this.t("status.missing"),
      secondaryText: this.t("status.obsidianCliMissing"),
      path: "",
    };
  }

  detectObshareCli(status) {
    const command = this.buildCliVersionCommand();
    const result = this.runCommand(command[0], command.slice(1));
    if (result.ok) {
      return {
        ok: true,
        primaryValue: this.extractVersionLabel(result.output) || this.t("common.available"),
        secondaryText: this.formatSecondaryText({
          pathValue: this.describeCurrentBinding(status),
          extraText: command.join(" "),
        }),
        path: command[0],
      };
    }

    return {
      ok: false,
      primaryValue: this.t("status.unavailable"),
      secondaryText: this.formatSecondaryText({
        pathValue: this.describeCurrentBinding(status),
        extraText: result.output || this.t("status.obshareCliMissing"),
      }),
      path: "",
    };
  }

  runCommand(command, args) {
    try {
      const completed = childProcess.spawnSync(command, args, {
        encoding: "utf8",
        shell: process.platform === "win32",
      });
      const output = (completed.stdout || completed.stderr || "").trim();
      if (completed.error || completed.status !== 0) {
        return {
          ok: false,
          output,
        };
      }
      return {
        ok: true,
        output,
      };
    } catch (error) {
      return {
        ok: false,
        output: error instanceof Error ? error.message : String(error),
      };
    }
  }

  generateInstallCommand() {
    const python = this.resolveSystemPythonCommand();
    if (this.settings.runtimeType === "conda") {
      const conda = this.resolveCondaExecutable();
      return `${conda} create -n obsd python -y && ${conda} run -n obsd python -m pip install --upgrade pip && ${conda} run -n obsd python -m pip install --upgrade obshare-cli`;
    }
    if (this.settings.runtimeType === "venv") {
      const envPath = this.settings.boundVirtualEnvPath || this.defaultIsolatedEnvPath();
      const pythonInside =
        process.platform === "win32"
          ? path.join(envPath, "Scripts", "python.exe")
          : path.join(envPath, "bin", "python");
      const pythonInvocation = python === "py" ? "py -3" : python;
      return `${pythonInvocation} -m venv "${envPath}" && "${pythonInside}" -m pip install --upgrade pip obshare-cli`;
    }

    const pythonInvocation = python === "py" ? "py -3" : python;
    return `${pythonInvocation} -m pip install --upgrade obshare-cli`;
  }

  generateUpgradeCommand() {
    return this.generateInstallCommand();
  }

  async executeInstallCommand(command) {
    this.settings.lastInstallCommand = command;
    try {
      const result = await this.runShellCommand(command);
      this.settings.lastInstallOutput = result.output || this.t("status.lastInstallSuccess");
      await this.refreshEnvironmentStatus();
      new Notice(this.t("notice.installDone"));
    } catch (error) {
      this.settings.lastInstallOutput = error instanceof Error ? error.message : String(error);
      new Notice(this.t("notice.installFailed"));
    }
    await this.saveSettings();
  }

  async copyText(text) {
    try {
      if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        new Notice(this.t("notice.copied"));
        return;
      }
    } catch (_) {
      // fall through to notice
    }
    new Notice(this.t("notice.copyUnavailable"));
  }

  async runShellCommand(command) {
    return await new Promise((resolve, reject) => {
      childProcess.exec(
        command,
        { shell: true, maxBuffer: 8 * 1024 * 1024 },
        (error, stdout, stderr) => {
          const output = [stdout, stderr].filter(Boolean).join("\n").trim();
          if (error) {
            reject(new Error(output || error.message));
            return;
          }
          resolve({ output });
        }
      );
    });
  }

  resolveSystemPythonCommand() {
    return this.settings.boundPythonExecutable || this.defaultPythonCommand();
  }

  resolveCondaExecutable() {
    const status = this.settings.lastEnvironmentStatus || this.detectEnvironmentStatus();
    return this.settings.condaExecutable || status.conda.path || "conda";
  }

  resolveCondaPythonExecutable() {
    const status = this.settings.lastEnvironmentStatus || this.detectEnvironmentStatus();
    return (
      this.settings.condaPythonExecutable ||
      status.condaEnv.pythonPath ||
      this.defaultCondaPythonPath(status.condaEnv.prefix)
    );
  }

  describeCurrentBinding(status = null) {
    if (this.settings.runtimeType === "conda") {
      if (this.settings.executionMode === "conda-python") {
        return `conda (obsd) / ${this.settings.executionMode} / ${this.resolveCondaPythonExecutable() || this.t("common.unknown")}`;
      }
      return `conda (obsd) / ${this.settings.executionMode} / ${this.resolveCondaExecutable()}`;
    }
    if (this.settings.runtimeType === "venv") {
      const envPath = this.settings.boundVirtualEnvPath || this.defaultIsolatedEnvPath();
      return `venv (obsd) / ${envPath}`;
    }
    return `system Python / ${this.resolveSystemPythonCommand()}${
      this.settings.boundCliExecutable ? ` / ${this.settings.boundCliExecutable}` : ""
    }`;
  }

  installGuidanceText() {
    if (this.settings.runtimeType === "conda") {
      return this.t("env.installGuidance.conda");
    }
    if (this.settings.runtimeType === "venv") {
      return this.t("env.installGuidance.venv");
    }
    return this.t("env.installGuidance.system");
  }

  buildCliBaseCommand() {
    if (this.settings.runtimeType === "conda") {
      if (this.settings.executionMode === "conda-python") {
        const condaPython = this.resolveCondaPythonExecutable();
        return [condaPython, "-m", "obshare_cli"];
      }
      return [this.resolveCondaExecutable(), "run", "-n", "obsd", "obshare-cli"];
    }

    if (this.settings.runtimeType === "venv") {
      const envPath = this.settings.boundVirtualEnvPath || this.defaultIsolatedEnvPath();
      const pythonInside =
        process.platform === "win32"
          ? path.join(envPath, "Scripts", "python.exe")
          : path.join(envPath, "bin", "python");
      return [pythonInside, "-m", "obshare_cli"];
    }

    if (this.settings.boundCliExecutable) {
      return [this.settings.boundCliExecutable];
    }

    const python = this.resolveSystemPythonCommand();
    if (python === "py") {
      return ["py", "-3", "-m", "obshare_cli"];
    }
    return [python, "-m", "obshare_cli"];
  }

  buildCliCommand(args) {
    return [...this.buildCliBaseCommand(), "--json", ...args];
  }

  buildCliVersionCommand() {
    return [...this.buildCliBaseCommand(), "--version"];
  }

  async runCliJson(args) {
    const command = this.buildCliCommand(args);
    return await new Promise((resolve) => {
      const completed = childProcess.spawnSync(command[0], command.slice(1), {
        encoding: "utf8",
        shell: process.platform === "win32",
      });
      const stdout = (completed.stdout || "").trim();
      const stderr = (completed.stderr || "").trim();
      let data = null;
      if (stdout) {
        try {
          data = JSON.parse(stdout);
        } catch (_) {
          data = null;
        }
      }
      resolve({
        ok: completed.status === 0,
        command: command.join(" "),
        exitCode: completed.status || 0,
        stdout,
        stderr,
        data,
      });
    });
  }

  async loadUploadConfigDraft() {
    const result = await this.runCliJson(["config", "export-runtime"]);
    if (result.ok && result.data) {
      this.settings.uploadConfigDraft = {
        appId: result.data.app_id || "",
        appSecret: result.data.app_secret || "",
        folderToken: result.data.folder_token || "",
        userId: result.data.user_id || "",
      };
      this.settings.uploadConfigStatus = `${this.t("upload.loaded")}\n${result.command}`;
    } else {
      this.settings.uploadConfigStatus =
        `${this.t("upload.loadFailed")}\n${result.command}\n${result.stderr || result.stdout}`;
    }
    await this.saveSettings();
  }

  async saveUploadConfigDraft() {
    const draft = this.settings.uploadConfigDraft;
    const operations = [
      { value: draft.appId, skip: !draft.appId, args: ["config", "set-app-id", draft.appId] },
      { value: draft.appSecret, skip: !draft.appSecret, args: ["config", "set-app-secret", draft.appSecret] },
      { value: draft.folderToken, skip: !draft.folderToken, args: ["config", "set-folder", draft.folderToken] },
      { value: draft.userId, skip: !draft.userId, args: ["config", "set-user-id", draft.userId] },
    ];

    const outputs = [];
    for (const operation of operations) {
      if (operation.skip) {
        continue;
      }
      const result = await this.runCliJson(operation.args);
      outputs.push(`${result.command}\n${result.stdout || result.stderr || ""}`.trim());
      if (!result.ok) {
        this.settings.uploadConfigStatus = outputs.join("\n\n");
        await this.saveSettings();
        new Notice(this.t("notice.connectivityFailed"));
        return;
      }
    }

    if (!outputs.length) {
      this.settings.uploadConfigStatus = this.t("upload.noSaveAction");
    } else {
      this.settings.uploadConfigStatus = outputs.join("\n\n");
    }
    await this.saveSettings();
    new Notice(this.t("notice.uploadSaved"));
  }

  async testUploadConfig() {
    const result = await this.runCliJson(["config", "test"]);
    this.settings.uploadConfigStatus = [result.command, result.stdout || result.stderr || ""]
      .filter(Boolean)
      .join("\n");
    await this.saveSettings();
    new Notice(result.ok ? this.t("notice.connectivityOk") : this.t("notice.connectivityFailed"));
  }

  async importUploadConfig() {
    const source = this.settings.uploadConfigImportPath;
    if (!source) {
      this.settings.uploadConfigStatus = this.t("upload.importEmpty");
      await this.saveSettings();
      return;
    }

    await fs.mkdir(path.dirname(this.getSharedConfigPath()), { recursive: true });
    await fs.copyFile(source, this.getSharedConfigPath());
    this.settings.uploadConfigStatus = this.t("upload.imported", { path: source });
    await this.loadUploadConfigDraft();
    new Notice(this.t("notice.uploadImported"));
  }

  async exportUploadConfig() {
    const target = this.settings.uploadConfigExportPath;
    if (!target) {
      this.settings.uploadConfigStatus = this.t("upload.exportEmpty");
      await this.saveSettings();
      return;
    }

    await fs.copyFile(this.getSharedConfigPath(), target);
    this.settings.uploadConfigStatus = this.t("upload.exported", { path: target });
    await this.saveSettings();
    new Notice(this.t("notice.uploadExported"));
  }

  async refreshHistory() {
    try {
      const raw = await fs.readFile(this.getSharedHistoryPath(), "utf8");
      this.settings.historyRecords = JSON.parse(raw);
      this.settings.historyStatus = `Loaded ${this.settings.historyRecords.length} history item(s) from ${this.getSharedHistoryPath()}`;
    } catch (error) {
      this.settings.historyRecords = [];
      this.settings.historyStatus =
        error && error.code === "ENOENT"
          ? this.t("history.none")
          : this.t("history.failed", { error: error instanceof Error ? error.message : String(error) });
    }
    await this.saveSettings();
  }

  async deleteDocument(token) {
    const result = await this.runCliJson(["delete", token]);
    this.settings.historyStatus = [result.command, result.stdout || result.stderr || ""]
      .filter(Boolean)
      .join("\n");
    await this.refreshHistory();
    new Notice(result.ok ? this.t("notice.deleted", { token }) : this.t("notice.deleteFailed", { token }));
  }

  async updateDocumentPermissions(token, options) {
    const args = ["permission", "set", token];
    if (options.public) {
      args.push("--public");
    }
    if (options.allowCopy) {
      args.push("--allow-copy");
    }
    if (options.allowDownload) {
      args.push("--allow-download");
    }

    const result = await this.runCliJson(args);
    this.settings.historyStatus = [result.command, result.stdout || result.stderr || ""]
      .filter(Boolean)
      .join("\n");
    await this.refreshHistory();
    new Notice(
      result.ok
        ? this.t("notice.permissionsUpdated", { token })
        : this.t("notice.permissionsFailed", { token })
    );
  }

  extractVersionLabel(text) {
    if (!text) {
      return "";
    }
    const match = text.match(/(\d+\.\d+\.\d+(?:[-+][A-Za-z0-9_.-]+)?)/);
    return match ? `v${match[1]}` : "";
  }

  formatSecondaryText({ pathValue = "", extraText = "" }) {
    const parts = [];
    if (pathValue) {
      parts.push(`${this.t("status.path")}: ${pathValue}`);
    }
    if (extraText) {
      const trimmed = String(extraText).trim();
      if (trimmed && trimmed !== pathValue) {
        parts.push(trimmed);
      }
    }
    return parts.join("\n");
  }

  parseObsidianCliStatus(candidate, output, ok) {
    const lines = String(output || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const version = this.extractVersionLabel(output);
    const pathLine =
      lines.find((line) => line.includes(".asar")) ||
      lines.find((line) => /[A-Za-z]:\\|^\//.test(line)) ||
      candidate;
    const warningLines = lines.filter((line) => line !== pathLine && !line.includes(version.replace(/^v/, "")));
    const hasBlockingWarning = warningLines.some((line) =>
      /not enabled|out of date|download the latest installer/i.test(line)
    );

    return {
      ok: ok && !hasBlockingWarning,
      primaryValue: version || (ok ? this.t("common.available") : this.t("status.unavailable")),
      secondaryText: this.formatSecondaryText({
        pathValue: pathLine,
        extraText: warningLines.join("\n"),
      }),
      path: candidate,
    };
  }

  async processNextRequest() {
    if (!this.settings.bridgeDir) {
      new Notice(this.t("bridge.notConfigured"));
      throw new Error(this.t("bridge.notConfigured"));
    }

    const requestPath = await this.findNextRequestPath();
    if (!requestPath) {
      new Notice(this.t("bridge.noPending"));
      return;
    }

    const request = JSON.parse(await fs.readFile(requestPath, "utf8"));
    try {
      const renderResult = await this.renderMermaidToPng(request.mermaid);
      await fs.mkdir(path.dirname(request.outputPngPath), { recursive: true });
      await fs.writeFile(
        request.outputPngPath,
        Buffer.from(renderResult.pngBase64, "base64")
      );
      await fs.writeFile(
        request.resultPath,
        JSON.stringify(
          {
            status: "success",
            pngPath: request.outputPngPath,
            width: renderResult.originalWidth,
            height: renderResult.originalHeight,
          },
          null,
          2
        ),
        "utf8"
      );
    } catch (error) {
      await fs.writeFile(
        request.resultPath,
        JSON.stringify(
          {
            status: "error",
            error: error instanceof Error ? error.message : String(error),
          },
          null,
          2
        ),
        "utf8"
      );
      throw error;
    } finally {
      await fs.rm(requestPath, { force: true });
    }
  }

  async findNextRequestPath() {
    const entries = await fs.readdir(this.settings.bridgeDir);
    const requestNames = entries.filter((name) => name.endsWith(".request.json")).sort();
    if (!requestNames.length) {
      return null;
    }
    return path.join(this.settings.bridgeDir, requestNames[0]);
  }

  async renderMermaidToPng(mermaidContent) {
    let tempContainer = null;
    let component = null;
    try {
      tempContainer = document.createElement("div");
      tempContainer.classList.add("obshare-mermaid-temp-container");
      tempContainer.style.position = "fixed";
      tempContainer.style.left = "-10000px";
      tempContainer.style.top = "0";
      tempContainer.style.opacity = "0";
      document.body.appendChild(tempContainer);

      component = new Component();
      const markdownContent = `\`\`\`mermaid\n${mermaidContent}\n\`\`\``;
      await MarkdownRenderer.render(this.app, markdownContent, tempContainer, "", component);
      await this.waitForMermaidRender(tempContainer);

      const svgElement = tempContainer.querySelector("svg");
      if (!svgElement) {
        throw new Error("Rendered Mermaid SVG not found.");
      }

      const size = this.measureSvg(svgElement);
      const pngBase64 = await this.svgElementToPng(svgElement, size);
      return {
        pngBase64,
        originalWidth: Math.round(size.width),
        originalHeight: Math.round(size.height),
      };
    } finally {
      if (component) {
        component.unload();
      }
      if (tempContainer && tempContainer.parentNode) {
        tempContainer.parentNode.removeChild(tempContainer);
      }
    }
  }

  waitForMermaidRender(container) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const checkRender = () => {
        const svgElement = container.querySelector("svg");
        if (svgElement) {
          setTimeout(resolve, 100);
          return;
        }
        if (Date.now() - startTime > this.settings.renderTimeoutMs) {
          reject(new Error("Mermaid render timed out."));
          return;
        }
        setTimeout(checkRender, 50);
      };
      checkRender();
    });
  }

  measureSvg(svgElement) {
    const widthAttr = svgElement.getAttribute("width");
    const heightAttr = svgElement.getAttribute("height");
    if (widthAttr && heightAttr && !widthAttr.includes("%") && !heightAttr.includes("%")) {
      return {
        width: Math.max(parseFloat(widthAttr), 100),
        height: Math.max(parseFloat(heightAttr), 100),
      };
    }

    const rect = svgElement.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      return {
        width: Math.max(rect.width, 100),
        height: Math.max(rect.height, 100),
      };
    }

    try {
      const bbox = svgElement.getBBox();
      return {
        width: Math.max(bbox.width || svgElement.clientWidth || 800, 100),
        height: Math.max(bbox.height || svgElement.clientHeight || 600, 100),
      };
    } catch (_) {
      return {
        width: Math.max(svgElement.clientWidth || 800, 100),
        height: Math.max(svgElement.clientHeight || 600, 100),
      };
    }
  }

  async svgElementToPng(svgElement, size) {
    const scale = this.settings.scale || DEFAULT_SETTINGS.scale;
    const targetWidth = Math.round(size.width * scale);
    const targetHeight = Math.round(size.height * scale);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Failed to create canvas context.");
    }

    canvas.width = targetWidth;
    canvas.height = targetHeight;
    ctx.fillStyle = this.settings.backgroundColor || DEFAULT_SETTINGS.backgroundColor;
    ctx.fillRect(0, 0, targetWidth, targetHeight);

    const clonedNode = svgElement.cloneNode(true);
    if (!(clonedNode instanceof SVGSVGElement)) {
      throw new Error("Failed to clone Mermaid SVG.");
    }

    clonedNode.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clonedNode.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
    clonedNode.setAttribute("width", String(size.width));
    clonedNode.setAttribute("height", String(size.height));
    clonedNode.setAttribute("viewBox", `0 0 ${size.width} ${size.height}`);
    this.inlineStyles(clonedNode);

    const svgData = new XMLSerializer().serializeToString(clonedNode);
    const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgData)}`;
    const img = new Image();

    return await new Promise((resolve, reject) => {
      img.onload = () => {
        try {
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
          const pngDataUrl = canvas.toDataURL("image/png", 1);
          const base64Data = pngDataUrl.split(",")[1];
          if (!base64Data) {
            reject(new Error("Failed to encode Mermaid PNG."));
            return;
          }
          resolve(base64Data);
        } catch (error) {
          reject(error instanceof Error ? error : new Error(String(error)));
        }
      };
      img.onerror = () => reject(new Error("Failed to load Mermaid SVG into image."));
      img.src = svgDataUrl;
    });
  }

  inlineStyles(svgElement) {
    try {
      const allElements = svgElement.querySelectorAll("*");
      const importantStyles = [
        "fill",
        "stroke",
        "stroke-width",
        "stroke-dasharray",
        "stroke-linecap",
        "font-family",
        "font-size",
        "font-weight",
        "font-style",
        "text-anchor",
        "dominant-baseline",
        "alignment-baseline",
        "opacity",
        "visibility",
        "display",
      ];
      allElements.forEach((element) => {
        const computedStyle = window.getComputedStyle(element);
        importantStyles.forEach((prop) => {
          const value = computedStyle.getPropertyValue(prop);
          if (value && value !== "initial" && value !== "inherit") {
            element.setAttribute(prop, value.trim());
          }
        });
      });
    } catch (error) {
      console.warn("[obshare-cli] Failed to inline SVG styles", error);
    }
  }
};
