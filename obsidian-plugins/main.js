const {
  Modal,
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
const { TextDecoder } = require("util");

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
      "推荐使用 conda 创建固定名称为 obsd 的环境，并优先通过 conda run -n obsd 调用 obshare-cli；升级时先卸载旧版，再重新安装升级版。",
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
    "status.pathOnlyDetection": "为避免循环启动 Obsidian，本插件仅执行路径解析，不直接调用 Obsidian CLI 进程。",
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
    "share.commandName": "分享当前笔记至飞书",
    "share.ribbonTitle": "分享至飞书",
    "share.menuItem": "分享至飞书",
    "share.invalidFile": "请先选择或打开一个 Markdown 文件。",
    "share.unsaved.title": "请先保存当前笔记",
    "share.unsaved.message": "当前笔记存在未保存修改。请先保存后再分享。",
    "share.confirm.title": "分享至飞书",
    "share.confirm.file": "文件",
    "share.confirm.public.name": "公开分享",
    "share.confirm.public.desc": "任何人可访问",
    "share.confirm.copy.name": "允许复制",
    "share.confirm.copy.desc": "允许复制文档内容",
    "share.confirm.download.name": "允许下载",
    "share.confirm.download.desc": "允许下载或另存副本",
    "share.confirm.cancel": "取消",
    "share.confirm.confirm": "确认分享",
    "share.success.title": "分享成功",
    "share.success.message": "文档已上传至飞书云文档。",
    "share.success.link": "访问链接",
    "share.success.copy": "复制链接",
    "share.success.open": "在浏览器打开",
    "share.success.close": "关闭",
    "share.failure.title": "分享失败",
    "share.failure.message": "上传未完成。你可以导出日志用于排查。",
    "share.failure.summary": "错误摘要",
    "share.failure.exportLog": "导出日志",
    "share.log.exported": "已导出日志到 {path}",
    "share.log.exportFailed": "导出日志失败: {error}",
    "share.log.selectCanceled": "已取消日志导出。",
    "share.log.pickerUnavailable": "当前运行环境无法打开文件夹选择器。",
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
    "progress.caution": "请保持窗口开启，不要中断当前任务。",
    "progress.command.title": "正在执行 CLI 命令",
    "progress.command.message": "命令执行中，请稍候...",
    "progress.command.label": "当前命令",
    "progress.environment.title": "正在检测运行环境",
    "progress.environment.platform": "正在检测当前运行平台...",
    "progress.environment.conda": "正在检测 conda 可执行文件...",
    "progress.environment.condaEnv": "正在检测 conda 环境 obsd...",
    "progress.environment.python": "正在检测 Python 解释器...",
    "progress.environment.pip": "正在检测 pip 可用性...",
    "progress.environment.obsidianCli": "正在检测 Obsidian CLI...",
    "progress.environment.obshareCli": "正在检测 obshare-cli...",
    "progress.environment.save": "正在保存环境检测结果...",
    "progress.install.title": "正在执行安装命令",
    "progress.install.prepare": "正在准备安装命令...",
    "progress.install.execute": "正在执行安装或升级，请稍候...",
    "progress.install.refresh": "正在刷新环境状态...",
    "progress.install.save": "正在保存安装结果...",
    "progress.install.complete": "安装任务已完成，正在收尾...",
    "progress.upload.load.title": "正在读取共享配置",
    "progress.upload.load.message": "正在通过 CLI 读取共享配置...",
    "progress.upload.save.title": "正在保存共享配置",
    "progress.upload.save.appId": "正在保存 App ID...",
    "progress.upload.save.appSecret": "正在保存 App Secret...",
    "progress.upload.save.folderToken": "正在保存 Folder Token...",
    "progress.upload.save.userId": "正在保存 User ID...",
    "progress.upload.test.title": "正在测试配置连通性",
    "progress.upload.test.message": "正在通过 CLI 测试配置连通性...",
    "progress.docs.delete.title": "正在删除文档",
    "progress.docs.delete.message": "正在通过 CLI 删除当前文档...",
    "progress.docs.permission.title": "正在更新文档权限",
    "progress.docs.permission.message": "正在通过 CLI 更新文档权限...",
    "progress.share.title": "正在分享至飞书",
    "progress.share.validate": "正在校验笔记与分享选项...",
    "progress.share.prepare": "正在准备 CLI 上传命令...",
    "progress.share.upload": "正在上传文档到飞书...",
    "progress.share.finalize": "正在解析上传结果...",
    "progress.share.done": "上传流程已完成，正在打开结果窗口...",
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
      "Preferred path: create the fixed conda environment named obsd, then call obshare-cli through conda run -n obsd; upgrades should uninstall the existing package before reinstalling the upgraded version.",
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
    "status.pathOnlyDetection":
      "Path-only detection is used here to avoid recursively launching new Obsidian windows.",
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
    "share.commandName": "Share Current Note To Feishu",
    "share.ribbonTitle": "Share To Feishu",
    "share.menuItem": "Share To Feishu",
    "share.invalidFile": "Open or select a Markdown file first.",
    "share.unsaved.title": "Save the current note first",
    "share.unsaved.message": "The current note has unsaved changes. Save it before sharing.",
    "share.confirm.title": "Share To Feishu",
    "share.confirm.file": "File",
    "share.confirm.public.name": "Public Share",
    "share.confirm.public.desc": "Anyone with the link can access the document",
    "share.confirm.copy.name": "Allow Copy",
    "share.confirm.copy.desc": "Allow document content to be copied",
    "share.confirm.download.name": "Allow Download",
    "share.confirm.download.desc": "Allow download or create-copy actions",
    "share.confirm.cancel": "Cancel",
    "share.confirm.confirm": "Share",
    "share.success.title": "Share Successful",
    "share.success.message": "The document has been uploaded to Feishu Docs.",
    "share.success.link": "Open URL",
    "share.success.copy": "Copy Link",
    "share.success.open": "Open In Browser",
    "share.success.close": "Close",
    "share.failure.title": "Share Failed",
    "share.failure.message": "The upload did not finish. Export a log if you need to investigate it.",
    "share.failure.summary": "Error Summary",
    "share.failure.exportLog": "Export Log",
    "share.log.exported": "Exported log to {path}",
    "share.log.exportFailed": "Failed to export log: {error}",
    "share.log.selectCanceled": "Log export was canceled.",
    "share.log.pickerUnavailable": "The current runtime could not open a folder picker.",
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
    "progress.caution": "Keep this window open and do not interrupt the current task.",
    "progress.command.title": "Running CLI Command",
    "progress.command.message": "The command is running. Please wait...",
    "progress.command.label": "Current Command",
    "progress.environment.title": "Checking Runtime Environment",
    "progress.environment.platform": "Checking the current platform...",
    "progress.environment.conda": "Checking the conda executable...",
    "progress.environment.condaEnv": "Checking the conda env obsd...",
    "progress.environment.python": "Checking the Python interpreter...",
    "progress.environment.pip": "Checking pip availability...",
    "progress.environment.obsidianCli": "Checking Obsidian CLI...",
    "progress.environment.obshareCli": "Checking obshare-cli...",
    "progress.environment.save": "Saving the environment detection result...",
    "progress.install.title": "Running Install Command",
    "progress.install.prepare": "Preparing the install command...",
    "progress.install.execute": "Running install or upgrade. Please wait...",
    "progress.install.refresh": "Refreshing environment status...",
    "progress.install.save": "Saving install output...",
    "progress.install.complete": "Install task finished. Cleaning up...",
    "progress.upload.load.title": "Loading Shared Configuration",
    "progress.upload.load.message": "Reading shared configuration through the CLI...",
    "progress.upload.save.title": "Saving Shared Configuration",
    "progress.upload.save.appId": "Saving App ID...",
    "progress.upload.save.appSecret": "Saving App Secret...",
    "progress.upload.save.folderToken": "Saving Folder Token...",
    "progress.upload.save.userId": "Saving User ID...",
    "progress.upload.test.title": "Testing Configuration Connectivity",
    "progress.upload.test.message": "Testing configuration connectivity through the CLI...",
    "progress.docs.delete.title": "Deleting Document",
    "progress.docs.delete.message": "Deleting the current document through the CLI...",
    "progress.docs.permission.title": "Updating Document Permissions",
    "progress.docs.permission.message": "Updating document permissions through the CLI...",
    "progress.share.title": "Sharing To Feishu",
    "progress.share.validate": "Validating the note and share options...",
    "progress.share.prepare": "Preparing the CLI upload command...",
    "progress.share.upload": "Uploading the document to Feishu...",
    "progress.share.finalize": "Parsing the upload result...",
    "progress.share.done": "Upload finished. Opening the result window...",
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

function clampProgressPercent(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (value <= 0) {
    return 0;
  }
  if (value >= 100) {
    return 100;
  }
  return Math.floor(value);
}

function createProgressState({ mode, title, message, percent = null, commandLabel = "" }) {
  return {
    mode: mode === "spinner" ? "spinner" : "progress",
    title: title || "",
    message: message || "",
    percent: mode === "spinner" ? null : clampProgressPercent(percent),
    commandLabel: commandLabel || "",
  };
}

function computeProgressPercent(index, total) {
  if (!total || total <= 0) {
    return 100;
  }
  return clampProgressPercent((index / total) * 100);
}

function buildUploadConfigProgressPlan(draft) {
  const steps = [
    { key: "appId", value: draft.appId, args: ["config", "set-app-id", draft.appId] },
    { key: "appSecret", value: draft.appSecret, args: ["config", "set-app-secret", draft.appSecret] },
    { key: "folderToken", value: draft.folderToken, args: ["config", "set-folder", draft.folderToken] },
    { key: "userId", value: draft.userId, args: ["config", "set-user-id", draft.userId] },
  ].filter((step) => step.value);

  return steps.map((step, index) => ({
    ...step,
    percent: computeProgressPercent(index + 1, steps.length),
  }));
}

function buildEnvironmentRefreshSteps() {
  const keys = ["platform", "conda", "condaEnv", "python", "pip", "obsidianCli", "obshareCli", "save"];
  return keys.map((key, index) => ({
    key,
    percent: computeProgressPercent(index + 1, keys.length),
  }));
}

function buildInstallProgressSteps() {
  const keys = ["prepare", "execute", "refresh", "save", "complete"];
  return keys.map((key, index) => ({
    key,
    percent: computeProgressPercent(index + 1, keys.length),
  }));
}

function shouldUseSpinnerForCliCommand(command) {
  if (!Array.isArray(command) || command.length < 5) {
    return false;
  }
  const executableName = path.basename(command[0]).toLowerCase();
  return (
    (executableName === "conda" || executableName === "conda.exe") &&
    command[1] === "run" &&
    command[2] === "-n" &&
    command[3] === "obsd" &&
    command[4] === "obshare-cli"
  );
}

function isShareableMarkdownFile(file) {
  return Boolean(file && file.extension === "md");
}

function quoteCliFilePath(filePath) {
  const text = String(filePath == null ? "" : filePath);
  if (!text) {
    return '""';
  }
  if (text.startsWith('"') && text.endsWith('"')) {
    return text;
  }
  return `"${text}"`;
}

function buildShareCliArgs(filePath, options = {}) {
  const args = ["upload", quoteCliFilePath(filePath)];
  if (options.isPublic) {
    args.push("--public");
  }
  if (options.allowCopy) {
    args.push("--allow-copy");
  }
  if (options.allowDownload) {
    args.push("--allow-download");
  }
  return args;
}

function selectPathModuleForValue(filePath) {
  return String(filePath || "").includes("\\") ? path.win32 : path;
}

function buildShareExecutionContext(sourceFilePath, options = {}) {
  const pathModule = selectPathModuleForValue(sourceFilePath);
  return {
    workingDirectory: pathModule.dirname(sourceFilePath),
    cliArgs: buildShareCliArgs(pathModule.basename(sourceFilePath), options),
  };
}

function buildShareProgressStages() {
  return [
    { key: "validate", percent: 10 },
    { key: "prepare", percent: 25 },
    { key: "upload", percent: 55 },
    { key: "finalize", percent: 85 },
    { key: "done", percent: 100 },
  ];
}

function quoteCommandArgForDisplay(value) {
  const text = String(value == null ? "" : value);
  if (!text) {
    return '""';
  }
  if (text.startsWith('"') && text.endsWith('"')) {
    return text;
  }
  if (!/[\s"]/u.test(text)) {
    return text;
  }
  return `"${text.replace(/"/g, '\\"')}"`;
}

function formatCommandForDisplay(commandParts = []) {
  return commandParts.map((part) => quoteCommandArgForDisplay(part)).join(" ");
}

function padShareLogPart(value) {
  return String(value).padStart(2, "0");
}

function buildShareLogFileName(date = new Date()) {
  return [
    "obshare-upload-",
    date.getUTCFullYear(),
    "-",
    padShareLogPart(date.getUTCMonth() + 1),
    "-",
    padShareLogPart(date.getUTCDate()),
    "-",
    padShareLogPart(date.getUTCHours()),
    padShareLogPart(date.getUTCMinutes()),
    padShareLogPart(date.getUTCSeconds()),
    ".log",
  ].join("");
}

function summarizeShareFailure(result = {}) {
  if (result.data && result.data.error && result.data.error.message) {
    return String(result.data.error.message);
  }
  if (result.stderr) {
    return String(result.stderr).trim();
  }
  if (result.stdout) {
    return String(result.stdout).trim();
  }
  return "Unknown upload error";
}

function normalizeProcessChunk(chunk) {
  if (chunk == null) {
    return Buffer.alloc(0);
  }
  if (Buffer.isBuffer(chunk)) {
    return chunk;
  }
  return Buffer.from(String(chunk), "utf8");
}

function countReplacementCharacters(value) {
  const matches = String(value || "").match(/\uFFFD/g);
  return matches ? matches.length : 0;
}

function decodeBufferWithEncoding(buffer, encoding) {
  if (!buffer || !buffer.length) {
    return "";
  }
  if (encoding === "utf8") {
    return buffer.toString("utf8");
  }
  return new TextDecoder(encoding).decode(buffer);
}

function decodeProcessOutput(chunks, platform = process.platform) {
  const buffer = Buffer.concat((Array.isArray(chunks) ? chunks : [chunks]).map((chunk) => normalizeProcessChunk(chunk)));
  if (!buffer.length) {
    return "";
  }

  const utf8Text = decodeBufferWithEncoding(buffer, "utf8");
  if (platform !== "win32" || !utf8Text.includes("\uFFFD")) {
    return utf8Text;
  }

  try {
    const gbkText = decodeBufferWithEncoding(buffer, "gbk");
    if (countReplacementCharacters(gbkText) <= countReplacementCharacters(utf8Text)) {
      return gbkText;
    }
  } catch (_) {
    // Fall through to the UTF-8 decoding when GBK support is unavailable.
  }

  return utf8Text;
}

function buildShareExecutionLogText(record = {}) {
  const options = record.options || {};
  return [
    `plugin version: ${record.pluginVersion || ""}`,
    `cli version: ${record.cliVersion || ""}`,
    `timestamp: ${record.timestamp || ""}`,
    `source file: ${record.sourceFilePath || ""}`,
    `working directory: ${record.workingDirectory || ""}`,
    `command: ${record.command || ""}`,
    `exit code: ${record.exitCode == null ? "" : record.exitCode}`,
    `share options: public=${Boolean(options.isPublic)}, copy=${Boolean(options.allowCopy)}, download=${Boolean(
      options.allowDownload
    )}`,
    `error summary: ${record.errorSummary || ""}`,
    "",
    "stdout:",
    record.stdout || "",
    "",
    "stderr:",
    record.stderr || "",
  ].join("\n");
}

class ObShareProgressModal extends Modal {
  constructor(app, plugin, initialState) {
    super(app);
    this.plugin = plugin;
    this.locked = true;
    this.state = createProgressState(initialState || {});
    this.bodyEl = null;
    this.messageEl = null;
    this.percentEl = null;
    this.progressTrackEl = null;
    this.progressFillEl = null;
    this.spinnerWrapEl = null;
    this.commandLabelTitleEl = null;
    this.commandLabelValueEl = null;
    this.cautionEl = null;
  }

  onOpen() {
    const { contentEl, modalEl } = this;
    modalEl.addClass("obshare-cli-progress-modal");
    contentEl.empty();
    contentEl.addClass("obshare-cli-progress-modal__content");

    this.titleEl.setText(this.state.title);
    this.bodyEl = contentEl.createDiv({ cls: "obshare-cli-progress-modal__body" });
    this.messageEl = this.bodyEl.createEl("div", { cls: "obshare-cli-progress-modal__message" });
    this.percentEl = this.bodyEl.createEl("div", { cls: "obshare-cli-progress-modal__percent" });
    this.progressTrackEl = this.bodyEl.createDiv({ cls: "obshare-cli-progress-modal__track" });
    this.progressFillEl = this.progressTrackEl.createDiv({ cls: "obshare-cli-progress-modal__fill" });
    this.spinnerWrapEl = this.bodyEl.createDiv({ cls: "obshare-cli-progress-modal__spinner-wrap" });
    this.spinnerWrapEl.createDiv({ cls: "obshare-cli-progress-modal__spinner" });
    this.commandLabelTitleEl = this.bodyEl.createEl("div", { cls: "obshare-cli-progress-modal__command-title" });
    this.commandLabelValueEl = this.bodyEl.createEl("div", { cls: "obshare-cli-progress-modal__command-value" });
    this.cautionEl = this.bodyEl.createEl("div", {
      cls: "obshare-cli-progress-modal__caution",
      text: this.plugin.t("progress.caution"),
    });

    this.render();
  }

  onClose() {
    this.contentEl.empty();
    this.modalEl.removeClass("obshare-cli-progress-modal");
  }

  close() {
    if (this.locked) {
      return;
    }
    super.close();
  }

  release() {
    this.locked = false;
  }

  update(nextState) {
    this.state = createProgressState({
      ...this.state,
      ...nextState,
    });
    this.render();
  }

  render() {
    if (!this.bodyEl) {
      return;
    }

    this.titleEl.setText(this.state.title);
    this.messageEl.setText(this.state.message || "");

    const isSpinner = this.state.mode === "spinner";
    this.spinnerWrapEl.toggleClass("is-hidden", !isSpinner);
    this.percentEl.toggleClass("is-hidden", isSpinner);
    this.progressTrackEl.toggleClass("is-hidden", isSpinner);

    if (!isSpinner) {
      const percent = Number.isFinite(this.state.percent) ? this.state.percent : 0;
      this.percentEl.setText(`${percent}%`);
      this.progressFillEl.style.width = `${percent}%`;
    }

    const hasCommandLabel = Boolean(this.state.commandLabel);
    this.commandLabelTitleEl.toggleClass("is-hidden", !hasCommandLabel);
    this.commandLabelValueEl.toggleClass("is-hidden", !hasCommandLabel);
    this.commandLabelTitleEl.setText(this.plugin.t("progress.command.label"));
    this.commandLabelValueEl.setText(this.state.commandLabel || "");
  }
}

class ObShareInfoModal extends Modal {
  constructor(app, plugin, { title, message }) {
    super(app);
    this.plugin = plugin;
    this.titleText = title || "";
    this.messageText = message || "";
  }

  onOpen() {
    const { contentEl, modalEl } = this;
    modalEl.addClass("obshare-cli-share-modal");
    contentEl.empty();
    contentEl.addClass("obshare-cli-share-modal__content");

    this.titleEl.setText(this.titleText);
    contentEl.createEl("p", {
      text: this.messageText,
      cls: "obshare-cli-share-modal__message",
    });

    const actions = contentEl.createDiv({ cls: "obshare-cli-share-modal__actions" });
    const closeButton = actions.createEl("button", { text: this.plugin.t("share.success.close") });
    closeButton.addClass("mod-cta");
    closeButton.addEventListener("click", () => this.close());
  }

  onClose() {
    this.contentEl.empty();
    this.modalEl.removeClass("obshare-cli-share-modal");
  }
}

class ObShareConfirmModal extends Modal {
  constructor(app, plugin, file) {
    super(app);
    this.plugin = plugin;
    this.file = file;
    this.result = null;
    this.onResolve = null;
  }

  openAndWait() {
    return new Promise((resolve) => {
      this.onResolve = resolve;
      this.open();
    });
  }

  finish(result) {
    this.result = result;
    this.close();
  }

  onOpen() {
    const { contentEl, modalEl } = this;
    modalEl.addClass("obshare-cli-share-modal");
    contentEl.empty();
    contentEl.addClass("obshare-cli-share-modal__content");

    this.titleEl.setText(this.plugin.t("share.confirm.title"));
    contentEl.createEl("div", {
      text: `${this.plugin.t("share.confirm.file")}: ${this.file ? this.file.path : ""}`,
      cls: "obshare-cli-share-modal__file",
    });

    const optionsContainer = contentEl.createDiv({ cls: "obshare-cli-share-options" });
    const isPublicInput = this.renderCheckbox(
      optionsContainer,
      this.plugin.t("share.confirm.public.name"),
      this.plugin.t("share.confirm.public.desc")
    );
    const allowCopyInput = this.renderCheckbox(
      optionsContainer,
      this.plugin.t("share.confirm.copy.name"),
      this.plugin.t("share.confirm.copy.desc")
    );
    const allowDownloadInput = this.renderCheckbox(
      optionsContainer,
      this.plugin.t("share.confirm.download.name"),
      this.plugin.t("share.confirm.download.desc")
    );

    const actions = contentEl.createDiv({ cls: "obshare-cli-share-modal__actions" });
    actions
      .createEl("button", { text: this.plugin.t("share.confirm.cancel") })
      .addEventListener("click", () => this.finish(null));
    const confirmButton = actions.createEl("button", { text: this.plugin.t("share.confirm.confirm") });
    confirmButton.addClass("mod-cta");
    confirmButton.addEventListener("click", () =>
      this.finish({
        isPublic: Boolean(isPublicInput.checked),
        allowCopy: Boolean(allowCopyInput.checked),
        allowDownload: Boolean(allowDownloadInput.checked),
      })
    );
  }

  renderCheckbox(container, title, description) {
    const row = container.createDiv({ cls: "obshare-cli-share-option" });
    const textWrap = row.createDiv({ cls: "obshare-cli-share-option__text" });
    textWrap.createEl("div", {
      text: title,
      cls: "obshare-cli-share-option__title",
    });
    textWrap.createEl("div", {
      text: description,
      cls: "obshare-cli-share-option__desc",
    });
    const input = row.createEl("input", { type: "checkbox" });
    input.addClass("obshare-cli-share-option__checkbox");
    return input;
  }

  onClose() {
    const resolve = this.onResolve;
    this.contentEl.empty();
    this.modalEl.removeClass("obshare-cli-share-modal");
    this.onResolve = null;
    if (resolve) {
      resolve(this.result);
    }
  }
}

class ObShareResultModal extends Modal {
  constructor(app, plugin, result) {
    super(app);
    this.plugin = plugin;
    this.result = result;
  }

  onOpen() {
    const { contentEl, modalEl } = this;
    modalEl.addClass("obshare-cli-share-modal");
    contentEl.empty();
    contentEl.addClass("obshare-cli-share-modal__content");

    const isSuccess = Boolean(this.result && this.result.ok && this.result.data && this.result.data.document);
    this.titleEl.setText(this.plugin.t(isSuccess ? "share.success.title" : "share.failure.title"));

    if (isSuccess) {
      this.renderSuccess(contentEl, this.result.data.document.url);
      return;
    }

    this.renderFailure(contentEl);
  }

  renderSuccess(contentEl, url) {
    contentEl.createEl("p", {
      text: this.plugin.t("share.success.message"),
      cls: "obshare-cli-share-modal__message",
    });
    contentEl.createEl("div", {
      text: this.plugin.t("share.success.link"),
      cls: "obshare-cli-share-modal__label",
    });
    const linkEl = contentEl.createEl("a", {
      text: url,
      href: url,
      cls: "obshare-cli-share-modal__link",
    });
    linkEl.setAttr("target", "_blank");
    linkEl.setAttr("rel", "noopener noreferrer");

    const actions = contentEl.createDiv({ cls: "obshare-cli-share-modal__actions" });
    actions.createEl("button", { text: this.plugin.t("share.success.copy") }).addEventListener("click", async () => {
      await this.plugin.copyText(url);
    });
    actions.createEl("button", { text: this.plugin.t("share.success.open") }).addEventListener("click", () => {
      window.open(url, "_blank");
    });
    const closeButton = actions.createEl("button", { text: this.plugin.t("share.success.close") });
    closeButton.addClass("mod-cta");
    closeButton.addEventListener("click", () => this.close());
  }

  renderFailure(contentEl) {
    contentEl.createEl("p", {
      text: this.plugin.t("share.failure.message"),
      cls: "obshare-cli-share-modal__message",
    });
    contentEl.createEl("div", {
      text: this.plugin.t("share.failure.summary"),
      cls: "obshare-cli-share-modal__label",
    });
    contentEl.createEl("pre", {
      text: this.result && this.result.errorSummary ? this.result.errorSummary : "",
      cls: "obshare-cli-share-modal__summary",
    });

    const actions = contentEl.createDiv({ cls: "obshare-cli-share-modal__actions" });
    actions
      .createEl("button", { text: this.plugin.t("share.failure.exportLog") })
      .addEventListener("click", async () => {
        await this.plugin.exportShareFailureLog(this.result);
      });
    const closeButton = actions.createEl("button", { text: this.plugin.t("share.success.close") });
    closeButton.addClass("mod-cta");
    closeButton.addEventListener("click", () => this.close());
  }

  onClose() {
    this.contentEl.empty();
    this.modalEl.removeClass("obshare-cli-share-modal");
  }
}

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
        this.renderAboutTab(panel, this.plugin.settings.lastEnvironmentStatus || this.plugin.createPendingEnvironmentStatus());
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

    const status = this.plugin.settings.lastEnvironmentStatus || this.plugin.createPendingEnvironmentStatus();
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
    if (!this.settings.lastEnvironmentStatus) {
      this.settings.lastEnvironmentStatus = this.createPendingEnvironmentStatus();
    }
    await this.refreshHistory();
    await this.saveSettings();

    this.addSettingTab(new ObSharePluginSettingTab(this.app, this));
    this.registerShareEntryPoints();

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

  createPendingEnvironmentStatus() {
    const pending = {
      ok: false,
      primaryValue: this.t("common.unknown"),
      secondaryText: "",
      path: "",
      prefix: "",
      pythonPath: "",
    };

    return {
      os: this.detectPlatform(),
      conda: { ...pending },
      condaEnv: { ...pending },
      python: { ...pending },
      pip: { ...pending },
      obsidianCli: { ...pending },
      obshareCli: { ...pending },
    };
  }

  async waitForUiFrame() {
    await new Promise((resolve) => {
      window.requestAnimationFrame(() => {
        window.setTimeout(resolve, 0);
      });
    });
  }

  async withProgressDialog(initialState, runner) {
    const modal = new ObShareProgressModal(this.app, this, initialState);
    modal.open();
    await this.waitForUiFrame();

    const update = async (nextState) => {
      modal.update(nextState);
      await this.waitForUiFrame();
    };

    try {
      const result = await runner({ update, modal });
      modal.release();
      modal.close();
      return result;
    } catch (error) {
      modal.release();
      modal.close();
      throw error;
    }
  }

  environmentProgressMessage(key) {
    const mapping = {
      platform: "progress.environment.platform",
      conda: "progress.environment.conda",
      condaEnv: "progress.environment.condaEnv",
      python: "progress.environment.python",
      pip: "progress.environment.pip",
      obsidianCli: "progress.environment.obsidianCli",
      obshareCli: "progress.environment.obshareCli",
      save: "progress.environment.save",
    };
    return this.t(mapping[key] || "progress.command.message");
  }

  installProgressMessage(key) {
    const mapping = {
      prepare: "progress.install.prepare",
      execute: "progress.install.execute",
      refresh: "progress.install.refresh",
      save: "progress.install.save",
      complete: "progress.install.complete",
    };
    return this.t(mapping[key] || "progress.command.message");
  }

  uploadSaveProgressMessage(key) {
    const mapping = {
      appId: "progress.upload.save.appId",
      appSecret: "progress.upload.save.appSecret",
      folderToken: "progress.upload.save.folderToken",
      userId: "progress.upload.save.userId",
    };
    return this.t(mapping[key] || "progress.command.message");
  }

  shareProgressMessage(key) {
    const mapping = {
      validate: "progress.share.validate",
      prepare: "progress.share.prepare",
      upload: "progress.share.upload",
      finalize: "progress.share.finalize",
      done: "progress.share.done",
    };
    return this.t(mapping[key] || "progress.command.message");
  }

  registerShareEntryPoints() {
    this.addCommand({
      id: "share-to-feishu",
      name: this.t("share.commandName"),
      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveFile ? this.app.workspace.getActiveFile() : null;
        const canShare = isShareableMarkdownFile(file);
        if (checking) {
          return canShare;
        }
        if (canShare) {
          void this.startShareFlow(file);
        }
        return canShare;
      },
    });

    this.addRibbonIcon("upload-cloud", this.t("share.ribbonTitle"), async () => {
      const file = this.app.workspace.getActiveFile ? this.app.workspace.getActiveFile() : null;
      await this.startShareFlow(file);
    });

    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, file) => {
        if (!isShareableMarkdownFile(file)) {
          return;
        }
        menu.addItem((item) => {
          item
            .setTitle(this.t("share.menuItem"))
            .setIcon("upload-cloud")
            .onClick(() => {
              void this.startShareFlow(file);
            });
        });
      })
    );
  }

  async startShareFlow(file) {
    if (!isShareableMarkdownFile(file)) {
      new Notice(this.t("share.invalidFile"));
      return;
    }

    if (await this.hasUnsavedActiveNote()) {
      new ObShareInfoModal(this.app, this, {
        title: this.t("share.unsaved.title"),
        message: this.t("share.unsaved.message"),
      }).open();
      return;
    }

    const options = await new ObShareConfirmModal(this.app, this, file).openAndWait();
    if (!options) {
      return;
    }

    let result = null;
    try {
      result = await this.executeShareUpload(file, options);
    } catch (error) {
      result = {
        ok: false,
        data: null,
        timestamp: this.formatShareTimestamp(new Date()),
        sourceFilePath: file.path,
        command: "",
        exitCode: 1,
        stdout: "",
        stderr: "",
        options,
        errorSummary: error instanceof Error ? error.message : String(error),
      };
    }

    if (result.ok) {
      try {
        await this.refreshHistory();
      } catch (_) {
        // History refresh failure should not hide a successful upload result.
      }
    }

    new ObShareResultModal(this.app, this, result).open();
  }

  async hasUnsavedActiveNote() {
    const activeFile = this.app.workspace.getActiveFile ? this.app.workspace.getActiveFile() : null;
    const activeEditor = this.app.workspace.activeEditor;
    const editor = activeEditor && activeEditor.editor;
    if (!isShareableMarkdownFile(activeFile) || !editor || typeof editor.getValue !== "function") {
      return false;
    }

    try {
      const savedContent = await this.app.vault.cachedRead(activeFile);
      return editor.getValue() !== savedContent;
    } catch (_) {
      return false;
    }
  }

  resolveShareSourcePath(file) {
    if (!file || !file.path) {
      throw new Error(this.t("share.invalidFile"));
    }

    const adapter = this.app.vault && this.app.vault.adapter;
    if (adapter && typeof adapter.getFullPath === "function") {
      return adapter.getFullPath(file.path);
    }
    if (adapter && typeof adapter.getBasePath === "function") {
      return path.join(adapter.getBasePath(), file.path);
    }
    if (adapter && typeof adapter.basePath === "string" && adapter.basePath) {
      return path.join(adapter.basePath, file.path);
    }
    if (path.isAbsolute(file.path)) {
      return file.path;
    }
    throw new Error("Vault adapter does not expose a filesystem base path.");
  }

  formatShareTimestamp(date = new Date()) {
    return [
      date.getFullYear(),
      "-",
      padShareLogPart(date.getMonth() + 1),
      "-",
      padShareLogPart(date.getDate()),
      " ",
      padShareLogPart(date.getHours()),
      ":",
      padShareLogPart(date.getMinutes()),
      ":",
      padShareLogPart(date.getSeconds()),
    ].join("");
  }

  parseShareCommandResult(command, completed, sourceFilePath, options, executionContext = null) {
    const stdout = completed.stdout || "";
    const stderr = completed.stderr || "";
    let data = null;
    if (stdout) {
      try {
        data = JSON.parse(stdout);
      } catch (_) {
        data = null;
      }
    }

    const record = {
      ok: Boolean(completed.ok && data && data.success && data.document && data.document.url),
      command: formatCommandForDisplay(command),
      exitCode: completed.status || 0,
      stdout,
      stderr,
      data,
      sourceFilePath,
      workingDirectory: executionContext && executionContext.workingDirectory ? executionContext.workingDirectory : "",
      options,
      timestamp: this.formatShareTimestamp(new Date()),
    };
    record.errorSummary = record.ok ? "" : summarizeShareFailure(record);
    return record;
  }

  async executeShareUpload(file, options) {
    const stages = buildShareProgressStages();
    const firstStage = stages[0];
    return await this.withProgressDialog(
      createProgressState({
        mode: "progress",
        title: this.t("progress.share.title"),
        message: this.shareProgressMessage(firstStage.key),
        percent: 0,
      }),
      async ({ update }) => {
        const sourceFilePath = this.resolveShareSourcePath(file);
        const executionContext = buildShareExecutionContext(sourceFilePath, options);
        const command = this.buildCliCommand(executionContext.cliArgs);

        await update({
          message: this.shareProgressMessage("validate"),
          percent: stages[0].percent,
          commandLabel: "",
        });
        await update({
          message: this.shareProgressMessage("prepare"),
          percent: stages[1].percent,
          commandLabel: "",
        });
        await update({
          message: this.shareProgressMessage("upload"),
          percent: stages[2].percent,
          commandLabel: "",
        });

        const completed = await this.runCommandAsync(command[0], command.slice(1), {
          cwd: executionContext.workingDirectory,
        });

        await update({
          message: this.shareProgressMessage("finalize"),
          percent: stages[3].percent,
          commandLabel: "",
        });

        const result = this.parseShareCommandResult(command, completed, sourceFilePath, options, executionContext);

        await update({
          message: this.shareProgressMessage("done"),
          percent: stages[4].percent,
          commandLabel: "",
        });

        return result;
      }
    );
  }

  getShareLogDialog() {
    const loaders = [
      () => {
        const electron = require("electron");
        return (electron && (electron.dialog || (electron.remote && electron.remote.dialog))) || null;
      },
      () => {
        const remote = require("@electron/remote");
        return (remote && remote.dialog) || null;
      },
    ];

    for (const load of loaders) {
      try {
        const dialog = load();
        if (dialog && typeof dialog.showOpenDialog === "function") {
          return dialog;
        }
      } catch (_) {
        // Try the next desktop dialog integration.
      }
    }

    return null;
  }

  async pickDirectoryForShareLog() {
    const dialog = this.getShareLogDialog();
    if (!dialog) {
      throw new Error(this.t("share.log.pickerUnavailable"));
    }

    const result = await dialog.showOpenDialog({
      properties: ["openDirectory", "createDirectory"],
    });
    if (result.canceled || !Array.isArray(result.filePaths) || !result.filePaths[0]) {
      return "";
    }
    return result.filePaths[0];
  }

  async exportShareFailureLog(result) {
    try {
      const directory = await this.pickDirectoryForShareLog();
      if (!directory) {
        new Notice(this.t("share.log.selectCanceled"));
        return;
      }

      const fileName = buildShareLogFileName(new Date());
      const targetPath = path.join(directory, fileName);
      const logText = buildShareExecutionLogText({
        ...result,
        pluginVersion: this.manifest && this.manifest.version ? this.manifest.version : "",
        cliVersion:
          (this.settings.lastEnvironmentStatus &&
            this.settings.lastEnvironmentStatus.obshareCli &&
            this.settings.lastEnvironmentStatus.obshareCli.primaryValue) ||
          "",
      });

      await fs.writeFile(targetPath, logText, "utf8");
      new Notice(this.t("share.log.exported", { path: targetPath }));
    } catch (error) {
      new Notice(
        this.t("share.log.exportFailed", {
          error: error instanceof Error ? error.message : String(error),
        })
      );
    }
  }

  async collectEnvironmentStatus(updateProgress = null) {
    const status = {};
    const steps = buildEnvironmentRefreshSteps().filter((step) => step.key !== "save");

    for (const step of steps) {
      if (updateProgress) {
        await updateProgress({
          message: this.environmentProgressMessage(step.key),
          percent: step.percent,
          commandLabel: "",
        });
      }

      switch (step.key) {
        case "platform":
          status.os = this.detectPlatform();
          break;
        case "conda":
          status.conda = await this.detectConda();
          break;
        case "condaEnv":
          status.condaEnv = await this.detectCondaEnv(status.conda ? status.conda.path : "");
          break;
        case "python":
          status.python = await this.detectPython();
          break;
        case "pip":
          status.pip = await this.detectPip(status.python ? status.python.path : "");
          break;
        case "obsidianCli":
          status.obsidianCli = await this.detectObsidianCli();
          break;
        case "obshareCli":
          status.obshareCli = await this.detectObshareCli({
            conda: status.conda,
            condaEnv: status.condaEnv,
            python: status.python,
          });
          break;
        default:
          break;
      }
    }

    return {
      os: status.os || this.detectPlatform(),
      conda: status.conda,
      condaEnv: status.condaEnv,
      python: status.python,
      pip: status.pip,
      obsidianCli: status.obsidianCli,
      obshareCli: status.obshareCli,
    };
  }

  async refreshEnvironmentStatus(options = {}) {
    const { showProgress = true, skipNotice = false, updateProgress = null } = options;
    const saveStep = buildEnvironmentRefreshSteps().find((step) => step.key === "save");

    const runRefresh = async (progressUpdater) => {
      this.settings.lastEnvironmentStatus = await this.collectEnvironmentStatus(progressUpdater);
      if (progressUpdater && saveStep) {
        await progressUpdater({
          message: this.environmentProgressMessage("save"),
          percent: saveStep.percent,
          commandLabel: "",
        });
      }
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
      return this.settings.lastEnvironmentStatus;
    };

    const initialStep = buildEnvironmentRefreshSteps()[0] || { key: "platform", percent: 0 };
    const status = showProgress
      ? await this.withProgressDialog(
          createProgressState({
            mode: "progress",
            title: this.t("progress.environment.title"),
            message: this.environmentProgressMessage(initialStep.key),
            percent: 0,
          }),
          async ({ update }) => runRefresh(update)
        )
      : await runRefresh(updateProgress);

    if (!skipNotice) {
      new Notice(this.t("notice.envRefreshed"));
    }
    return status;
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

  async detectConda() {
    const candidates = [this.settings.condaExecutable, "conda"].filter(Boolean);
    for (const candidate of candidates) {
      const result = await this.runCommandAsync(candidate, ["--version"]);
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

  async detectCondaEnv(condaPath) {
    if (!condaPath) {
      return {
        ok: false,
        primaryValue: this.t("status.missing"),
        secondaryText: this.t("status.condaEnvMissing"),
        prefix: "",
        pythonPath: "",
      };
    }

    const result = await this.runCommandAsync(condaPath, ["env", "list", "--json"]);
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

  async detectPython() {
    const candidates = process.platform === "win32"
      ? ["py", "python", "python3"]
      : [this.settings.boundPythonExecutable, "python3", "python"].filter(Boolean);

    for (const candidate of candidates) {
      const args = candidate === "py" ? ["-3", "--version"] : ["--version"];
      const result = await this.runCommandAsync(candidate, args);
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

  async detectPip(pythonPath) {
    if (pythonPath) {
      const args = pythonPath === "py" ? ["-3", "-m", "pip", "--version"] : ["-m", "pip", "--version"];
      const result = await this.runCommandAsync(pythonPath, args);
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

  async detectObsidianCli() {
    const candidates = process.platform === "win32" ? ["obsidian", "Obsidian"] : ["obsidian"];
    const resolved = await this.resolveCommandPath(candidates);
    if (!resolved.ok) {
      return {
        ok: false,
        primaryValue: this.t("status.missing"),
        secondaryText: this.t("status.obsidianCliMissing"),
        path: "",
      };
    }

    return {
      ok: true,
      primaryValue: this.extractVersionLabel(resolved.path) || this.t("common.available"),
      secondaryText: this.formatSecondaryText({
        pathValue: resolved.path,
        extraText: this.t("status.pathOnlyDetection"),
      }),
      path: resolved.path,
    };
  }

  async detectObshareCli(status) {
    const command = this.buildCliVersionCommand();
    const result = await this.runCommandAsync(command[0], command.slice(1));
    if (result.ok) {
      return {
        ok: true,
        primaryValue: this.extractVersionLabel(result.output) || this.t("common.available"),
        secondaryText: this.formatSecondaryText({
          pathValue: this.describeCurrentBinding(status),
          extraText: formatCommandForDisplay(command),
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

  async runCommandAsync(command, args, spawnOptions = {}) {
    return await new Promise((resolve) => {
      const stdoutChunks = [];
      const stderrChunks = [];
      let settled = false;

      const finish = (result) => {
        if (settled) {
          return;
        }
        settled = true;
        resolve(result);
      };

      let child = null;
      try {
        const env = {
          ...process.env,
          ...(spawnOptions.env || {}),
        };
        if (process.platform === "win32") {
          env.PYTHONUTF8 = env.PYTHONUTF8 || "1";
          env.PYTHONIOENCODING = env.PYTHONIOENCODING || "utf-8";
        }
        child = childProcess.spawn(command, args, {
          windowsHide: true,
          ...spawnOptions,
          shell: false,
          env,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        finish({
          ok: false,
          status: 1,
          stdout: "",
          stderr: message,
          output: message,
        });
        return;
      }

      if (child.stdout) {
        child.stdout.on("data", (chunk) => {
          stdoutChunks.push(normalizeProcessChunk(chunk));
        });
      }
      if (child.stderr) {
        child.stderr.on("data", (chunk) => {
          stderrChunks.push(normalizeProcessChunk(chunk));
        });
      }

      child.on("error", (error) => {
        const stdout = decodeProcessOutput(stdoutChunks).trim();
        const stderr = decodeProcessOutput(stderrChunks).trim();
        const message = error instanceof Error ? error.message : String(error);
        finish({
          ok: false,
          status: 1,
          stdout,
          stderr: [stderr, message].filter(Boolean).join("\n"),
          output: [stdout, stderr, message].filter(Boolean).join("\n").trim(),
        });
      });

      child.on("close", (code) => {
        const trimmedStdout = decodeProcessOutput(stdoutChunks).trim();
        const trimmedStderr = decodeProcessOutput(stderrChunks).trim();
        const output = [trimmedStdout, trimmedStderr].filter(Boolean).join("\n").trim();
        finish({
          ok: code === 0,
          status: code == null ? 1 : code,
          stdout: trimmedStdout,
          stderr: trimmedStderr,
          output,
        });
      });
    });
  }

  async resolveCommandPath(candidates) {
    const resolver = process.platform === "win32" ? "where" : "which";
    for (const candidate of candidates.filter(Boolean)) {
      const result = await this.runCommandAsync(resolver, [candidate]);
      if (!result.ok || !result.output) {
        continue;
      }
      const resolvedPath = String(result.output)
        .split(/\r?\n/)
        .map((line) => line.trim())
        .find(Boolean);
      if (resolvedPath) {
        return {
          ok: true,
          candidate,
          path: resolvedPath,
        };
      }
    }

    return {
      ok: false,
      candidate: "",
      path: "",
    };
  }

  generateInstallCommand() {
    const python = this.resolveSystemPythonCommand();
    if (this.settings.runtimeType === "conda") {
      const conda = this.resolveCondaExecutable();
      return `${conda} create -n obsd python -y && ${conda} run -n obsd python -m pip install --upgrade pip && ${conda} run -n obsd pip uninstall obshare-cli -y && ${conda} run -n obsd pip install obshare-cli --upgrade`;
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
    if (this.settings.runtimeType === "conda") {
      const conda = this.resolveCondaExecutable();
      return `${conda} run -n obsd pip uninstall obshare-cli -y && ${conda} run -n obsd pip install obshare-cli --upgrade`;
    }

    return this.generateInstallCommand();
  }

  async executeInstallCommand(command) {
    this.settings.lastInstallCommand = command;
    const installSteps = buildInstallProgressSteps();
    const getInstallStep = (key) => installSteps.find((step) => step.key === key);
    try {
      await this.withProgressDialog(
        createProgressState({
          mode: "progress",
          title: this.t("progress.install.title"),
          message: this.installProgressMessage("prepare"),
          percent: 0,
        }),
        async ({ update }) => {
          const prepareStep = getInstallStep("prepare");
          if (prepareStep) {
            await update({
              message: this.installProgressMessage("prepare"),
              percent: prepareStep.percent,
              commandLabel: "",
            });
          }

          const executeStep = getInstallStep("execute");
          if (executeStep) {
            await update({
              message: this.installProgressMessage("execute"),
              percent: executeStep.percent,
              commandLabel: command,
            });
          }

          const result = await this.runShellCommand(command);
          this.settings.lastInstallOutput = result.output || this.t("status.lastInstallSuccess");

          const refreshStep = getInstallStep("refresh");
          if (refreshStep) {
            await update({
              message: this.installProgressMessage("refresh"),
              percent: refreshStep.percent,
              commandLabel: "",
            });
          }
          await this.refreshEnvironmentStatus({ showProgress: false, skipNotice: true });

          const saveStep = getInstallStep("save");
          if (saveStep) {
            await update({
              message: this.installProgressMessage("save"),
              percent: saveStep.percent,
              commandLabel: "",
            });
          }
          await this.saveSettings();

          const completeStep = getInstallStep("complete");
          if (completeStep) {
            await update({
              message: this.installProgressMessage("complete"),
              percent: completeStep.percent,
              commandLabel: "",
            });
          }
        }
      );
      new Notice(this.t("notice.installDone"));
    } catch (error) {
      this.settings.lastInstallOutput = error instanceof Error ? error.message : String(error);
      await this.saveSettings();
      new Notice(this.t("notice.installFailed"));
    }
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
    const status = this.settings.lastEnvironmentStatus;
    return this.settings.condaExecutable || (status && status.conda ? status.conda.path : "") || "conda";
  }

  resolveCondaPythonExecutable() {
    const status = this.settings.lastEnvironmentStatus;
    return (
      this.settings.condaPythonExecutable ||
      (status && status.condaEnv ? status.condaEnv.pythonPath : "") ||
      this.defaultCondaPythonPath(status && status.condaEnv ? status.condaEnv.prefix : "")
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

  async runCliJson(args, options = {}) {
    const command = this.buildCliCommand(args);
    const execute = async () => {
      const completed = await this.runCommandAsync(command[0], command.slice(1));
      const stdout = completed.stdout || "";
      const stderr = completed.stderr || "";
      let data = null;
      if (stdout) {
        try {
          data = JSON.parse(stdout);
        } catch (_) {
          data = null;
        }
      }
      return {
        ok: completed.ok,
        command: formatCommandForDisplay(command),
        exitCode: completed.status || 0,
        stdout,
        stderr,
        data,
      };
    };

    if (options.showProgress === false || !shouldUseSpinnerForCliCommand(command)) {
      return await execute();
    }

    return await this.withProgressDialog(
      createProgressState({
        mode: "spinner",
        title: options.title || this.t("progress.command.title"),
        message: options.message || this.t("progress.command.message"),
        commandLabel: formatCommandForDisplay(command),
      }),
      async () => execute()
    );
  }

  async loadUploadConfigDraft() {
    const result = await this.runCliJson(["config", "export-runtime"], {
      title: this.t("progress.upload.load.title"),
      message: this.t("progress.upload.load.message"),
    });
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
    const operations = buildUploadConfigProgressPlan(draft);
    const outputs = [];
    if (!operations.length) {
      this.settings.uploadConfigStatus = this.t("upload.noSaveAction");
      await this.saveSettings();
      return;
    }

    try {
      await this.withProgressDialog(
        createProgressState({
          mode: "progress",
          title: this.t("progress.upload.save.title"),
          message: this.uploadSaveProgressMessage(operations[0].key),
          percent: 0,
        }),
        async ({ update }) => {
          for (const operation of operations) {
            await update({
              message: this.uploadSaveProgressMessage(operation.key),
              percent: operation.percent,
              commandLabel: "",
            });

            const result = await this.runCliJson(operation.args, { showProgress: false });
            outputs.push(`${result.command}\n${result.stdout || result.stderr || ""}`.trim());
            if (!result.ok) {
              const error = new Error("upload-config-save-failed");
              error.result = result;
              throw error;
            }
          }
        }
      );
    } catch (error) {
      this.settings.uploadConfigStatus = outputs.join("\n\n");
      await this.saveSettings();
      new Notice(this.t("notice.connectivityFailed"));
      return;
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
    const result = await this.runCliJson(["config", "test"], {
      title: this.t("progress.upload.test.title"),
      message: this.t("progress.upload.test.message"),
    });
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
    const result = await this.runCliJson(["delete", token], {
      title: this.t("progress.docs.delete.title"),
      message: this.t("progress.docs.delete.message"),
    });
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

    const result = await this.runCliJson(args, {
      title: this.t("progress.docs.permission.title"),
      message: this.t("progress.docs.permission.message"),
    });
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
