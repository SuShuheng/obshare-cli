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

const TAB_ENVIRONMENT = "environment";
const TAB_UPLOAD = "upload";
const TAB_DOCUMENTS = "documents";
const TAB_ABOUT = "about";

const TAB_DEFINITIONS = [
  { id: TAB_ENVIRONMENT, label: "Environment Configuration" },
  { id: TAB_UPLOAD, label: "Upload Configuration" },
  { id: TAB_DOCUMENTS, label: "Document Management" },
  { id: TAB_ABOUT, label: "About" },
];

const DEFAULT_SETTINGS = {
  activeTab: TAB_ENVIRONMENT,
  bridgeDir: "",
  renderTimeoutMs: 10000,
  scale: 2,
  backgroundColor: "#ffffff",
  installMode: "system",
  isolatedEnvName: "obsd",
  boundPythonExecutable: "",
  boundCliExecutable: "",
  boundVirtualEnvPath: "",
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

    containerEl.createEl("h2", { text: "obshare-cli" });
    containerEl.createEl("p", {
      text: "Desktop companion shell for obshare-cli environment setup, document management, and Mermaid rendering.",
      cls: "obshare-cli-settings__intro",
    });

    this.renderTabs(containerEl);
  }

  renderTabs(containerEl) {
    const tabBar = containerEl.createDiv({ cls: "obshare-cli-tabs" });
    const panel = containerEl.createDiv({ cls: "obshare-cli-panel" });

    TAB_DEFINITIONS.forEach((tab) => {
      const button = tabBar.createEl("button", {
        text: tab.label,
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
        this.renderPlaceholderTab(panel, "Unknown", "Unknown tab state.");
    }
  }

  renderEnvironmentTab(panel) {
    panel.createEl("h3", { text: "Environment Configuration" });
    panel.createEl("p", {
      text: "Detect platform status, choose an install mode, and persist the runtime binding used by the plugin.",
    });

    new Setting(panel)
      .setName("Refresh environment status")
      .setDesc("Probe Python, pip, Obsidian CLI, and obshare-cli on this machine.")
      .addButton((button) =>
        button.setButtonText("Refresh").onClick(async () => {
          await this.plugin.refreshEnvironmentStatus();
          this.display();
        })
      );

    const status =
      this.plugin.settings.lastEnvironmentStatus || this.plugin.detectEnvironmentStatus();
    this.renderEnvironmentStatus(panel, status);

    new Setting(panel)
      .setName("Install mode")
      .setDesc(
        "Choose whether the plugin should target system Python or the fixed isolated environment obsd."
      )
      .addDropdown((dropdown) =>
        dropdown
          .addOption("system", "System Python")
          .addOption("isolated", "Isolated Environment (obsd)")
          .setValue(this.plugin.settings.installMode)
          .onChange(async (value) => {
            this.plugin.settings.installMode = value;
            await this.plugin.saveSettings();
            this.display();
          })
      );

    new Setting(panel)
      .setName("Bound Python executable")
      .setDesc("The Python interpreter currently selected for CLI execution.")
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
      .setName("Bound CLI executable")
      .setDesc("Optional direct obshare-cli executable override.")
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
      .setName("Bound isolated environment path")
      .setDesc("Used when the plugin is configured to work with the fixed obsd isolated environment.")
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
      .setName("Isolated environment name")
      .setDesc("This remains fixed to the shared standard name obsd.")
      .addText((text) => text.setValue(this.plugin.settings.isolatedEnvName).setDisabled(true));

    new Setting(panel)
      .setName("Bridge directory")
      .setDesc("Shared directory readable by both obshare-cli and this Obsidian plugin.")
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
      .setName("Render timeout")
      .setDesc("Maximum time to wait for Mermaid SVG output.")
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
    panel.createEl("h4", { text: "Installation Guidance" });
    panel.createEl("p", {
      text:
        this.plugin.settings.installMode === "isolated"
          ? "The isolated install path always uses the fixed environment name obsd."
          : "System Python mode installs or upgrades obshare-cli in the selected interpreter.",
    });

    const installBox = panel.createEl("pre", { cls: "obshare-cli-command-box" });
    installBox.setText(installCommand);

    new Setting(panel)
      .setName("Install command actions")
      .setDesc("Copy the generated command or execute it directly from Obsidian.")
      .addButton((button) =>
        button.setButtonText("Copy").onClick(async () => {
          await this.plugin.copyText(installCommand);
        })
      )
      .addButton((button) =>
        button.setButtonText("Execute").setCta().onClick(async () => {
          await this.plugin.executeInstallCommand(installCommand);
          this.display();
        })
      );

    if (this.plugin.settings.lastInstallOutput) {
      panel.createEl("h4", { text: "Last install result" });
      panel.createEl("pre", {
        text: this.plugin.settings.lastInstallOutput,
        cls: "obshare-cli-command-box",
      });
    }
  }

  renderUploadTab(panel) {
    panel.createEl("h3", { text: "Upload Configuration" });
    panel.createEl("p", {
      text: "Manage the shared Feishu upload configuration stored under ~/.obshare.",
    });

    new Setting(panel)
      .setName("Refresh shared configuration")
      .setDesc("Load the current masked configuration from the CLI and shared state.")
      .addButton((button) =>
        button.setButtonText("Refresh").onClick(async () => {
          await this.plugin.loadUploadConfigDraft();
          this.display();
        })
      )
      .addButton((button) =>
        button.setButtonText("Test Connectivity").onClick(async () => {
          await this.plugin.testUploadConfig();
          this.display();
        })
      );

    const draft = this.plugin.settings.uploadConfigDraft;

    new Setting(panel)
      .setName("App ID")
      .setDesc("Partially masked when loaded from existing CLI config.")
      .addText((text) =>
        text.setValue(draft.appId || "").onChange(async (value) => {
          this.plugin.settings.uploadConfigDraft.appId = value.trim();
          await this.plugin.saveSettings();
        })
      );

    new Setting(panel)
      .setName("App Secret")
      .setDesc("Leave unchanged to preserve the current secret.")
      .addText((text) =>
        text.setValue(draft.appSecret || "").onChange(async (value) => {
          this.plugin.settings.uploadConfigDraft.appSecret = value.trim();
          await this.plugin.saveSettings();
        })
      );

    new Setting(panel)
      .setName("Folder Token")
      .setDesc("Partially masked when loaded from existing CLI config.")
      .addText((text) =>
        text.setValue(draft.folderToken || "").onChange(async (value) => {
          this.plugin.settings.uploadConfigDraft.folderToken = value.trim();
          await this.plugin.saveSettings();
        })
      );

    new Setting(panel)
      .setName("User ID")
      .setDesc("The Feishu user ID used for ownership and permission operations.")
      .addText((text) =>
        text.setValue(draft.userId || "").onChange(async (value) => {
          this.plugin.settings.uploadConfigDraft.userId = value.trim();
          await this.plugin.saveSettings();
        })
      );

    new Setting(panel)
      .setName("Save shared configuration")
      .setDesc("Persist updated values through obshare-cli config commands.")
      .addButton((button) =>
        button.setButtonText("Save").setCta().onClick(async () => {
          await this.plugin.saveUploadConfigDraft();
          this.display();
        })
      );

    new Setting(panel)
      .setName("Import path")
      .setDesc("Copy an existing shared config file into ~/.obshare/config.json.")
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
        button.setButtonText("Import").onClick(async () => {
          await this.plugin.importUploadConfig();
          this.display();
        })
      );

    new Setting(panel)
      .setName("Export path")
      .setDesc("Copy the current shared config file to another location.")
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
        button.setButtonText("Export").onClick(async () => {
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
    panel.createEl("h3", { text: "Document Management" });
    panel.createEl("p", {
      text: "Read shared upload history and dispatch delete or permission actions through obshare-cli.",
    });

    new Setting(panel)
      .setName("Refresh history")
      .setDesc("Reload ~/.obshare/history.json")
      .addButton((button) =>
        button.setButtonText("Refresh").onClick(async () => {
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
        text: "No shared history records found.",
        cls: "obshare-cli-empty",
      });
      return;
    }

    const list = panel.createDiv({ cls: "obshare-cli-history-list" });
    records.forEach((item) => {
      const card = list.createDiv({ cls: "obshare-cli-history-card" });
      card.createEl("h4", { text: item.title || "Untitled" });
      card.createEl("div", {
        text: `Token: ${item.docToken || "Unknown"}`,
        cls: "obshare-cli-history-card__meta",
      });
      card.createEl("div", {
        text: `URL: ${item.url || "Unknown"}`,
        cls: "obshare-cli-history-card__meta",
      });
      card.createEl("div", {
        text: `Time: ${item.uploadTime || "Unknown"}`,
        cls: "obshare-cli-history-card__meta",
      });

      const permissions = item.permissions || {};
      card.createEl("div", {
        text: `Permissions: public=${Boolean(permissions.isPublic)}, copy=${Boolean(
          permissions.allowCopy
        )}, download=${Boolean(permissions.allowCreateCopy)}`,
        cls: "obshare-cli-history-card__meta",
      });

      const actions = card.createDiv({ cls: "obshare-cli-history-card__actions" });
      const openButton = actions.createEl("button", { text: "Open" });
      openButton.addEventListener("click", () => {
        if (item.url) {
          window.open(item.url, "_blank");
        }
      });

      const deleteButton = actions.createEl("button", { text: "Delete" });
      deleteButton.addEventListener("click", async () => {
        await this.plugin.deleteDocument(item.docToken);
        this.display();
      });

      const publicButton = actions.createEl("button", { text: "Public" });
      publicButton.addEventListener("click", async () => {
        await this.plugin.updateDocumentPermissions(item.docToken, {
          public: true,
          allowCopy: false,
          allowDownload: false,
        });
        this.display();
      });

      const openAccessButton = actions.createEl("button", {
        text: "Public + Copy/Download",
      });
      openAccessButton.addEventListener("click", async () => {
        await this.plugin.updateDocumentPermissions(item.docToken, {
          public: true,
          allowCopy: true,
          allowDownload: true,
        });
        this.display();
      });

      const privateButton = actions.createEl("button", { text: "Private" });
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
    panel.createEl("h3", { text: "About" });
    panel.createEl("p", {
      text: "Version, repository, and update controls for both the Obsidian plugin and the bound obshare-cli runtime.",
    });

    const infoGrid = panel.createDiv({ cls: "obshare-cli-status-grid" });
    this.renderStatusCard(
      infoGrid,
      "Plugin Version",
      this.plugin.manifest.version,
      true,
      `Plugin ID: ${this.plugin.manifest.id}`
    );
    this.renderStatusCard(
      infoGrid,
      "CLI Version",
      status.obshareCli.label,
      status.obshareCli.ok,
      status.obshareCli.detail
    );
    this.renderStatusCard(
      infoGrid,
      "Repository",
      "GitHub",
      true,
      REPOSITORY_URL
    );

    panel.createEl("h4", { text: "Plugin Update Guidance" });
    panel.createEl("p", {
      text: "Replace the plugin files under .obsidian/plugins/obshare-cli/ with the latest release contents from the repository, then reload the plugin in Obsidian.",
    });
    new Setting(panel)
      .setName("Plugin update actions")
      .setDesc("Open the repository for plugin release notes and updated plugin files.")
      .addButton((button) =>
        button.setButtonText("Open Repository").setCta().onClick(() => {
          window.open(REPOSITORY_URL, "_blank");
        })
      )
      .addButton((button) =>
        button.setButtonText("Copy Repository URL").onClick(async () => {
          await this.plugin.copyText(REPOSITORY_URL);
        })
      );

    const upgradeCommand = this.plugin.generateUpgradeCommand();
    panel.createEl("h4", { text: "CLI Update" });
    panel.createEl("pre", {
      text: upgradeCommand,
      cls: "obshare-cli-command-box",
    });
    new Setting(panel)
      .setName("CLI update actions")
      .setDesc("Upgrade obshare-cli in the currently bound runtime.")
      .addButton((button) =>
        button.setButtonText("Copy").onClick(async () => {
          await this.plugin.copyText(upgradeCommand);
        })
      )
      .addButton((button) =>
        button.setButtonText("Execute").setCta().onClick(async () => {
          await this.plugin.executeInstallCommand(upgradeCommand);
          this.display();
        })
      );
  }

  renderEnvironmentStatus(panel, status) {
    const statusGrid = panel.createDiv({ cls: "obshare-cli-status-grid" });
    this.renderStatusCard(statusGrid, "Detected OS", status.os.label, true, status.os.detail);
    this.renderStatusCard(statusGrid, "Python", status.python.label, status.python.ok, status.python.detail);
    this.renderStatusCard(statusGrid, "pip", status.pip.label, status.pip.ok, status.pip.detail);
    this.renderStatusCard(
      statusGrid,
      "Obsidian CLI",
      status.obsidianCli.label,
      status.obsidianCli.ok,
      status.obsidianCli.detail
    );
    this.renderStatusCard(
      statusGrid,
      "obshare-cli",
      status.obshareCli.label,
      status.obshareCli.ok,
      status.obshareCli.detail
    );
  }

  renderStatusCard(container, title, value, ok, detail) {
    const card = container.createDiv({
      cls: `obshare-cli-status-card ${ok ? "is-ok" : "is-missing"}`,
    });
    card.createEl("h4", { text: title });
    card.createEl("div", { text: value, cls: "obshare-cli-status-card__value" });
    if (detail) {
      card.createEl("div", { text: detail, cls: "obshare-cli-status-card__detail" });
    }
  }

  renderPlaceholderTab(panel, title, body) {
    panel.createEl("h3", { text: title });
    panel.createEl("p", { text: body });
  }
}

module.exports = class ObShareCliPlugin extends Plugin {
  async onload() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

    if (!this.settings.boundVirtualEnvPath) {
      this.settings.boundVirtualEnvPath = this.defaultIsolatedEnvPath();
    }
    if (!this.settings.lastEnvironmentStatus) {
      this.settings.lastEnvironmentStatus = this.detectEnvironmentStatus();
    }

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
    await this.saveData(this.settings);
  }

  defaultPythonCommand() {
    return process.platform === "win32" ? "py -3" : "python3";
  }

  defaultIsolatedEnvPath() {
    return path.join(os.homedir(), ".obshare", this.settings.isolatedEnvName || "obsd");
  }

  getSharedConfigPath() {
    return path.join(os.homedir(), ".obshare", "config.json");
  }

  getSharedHistoryPath() {
    return path.join(os.homedir(), ".obshare", "history.json");
  }

  detectEnvironmentStatus() {
    const osStatus = this.detectPlatform();
    const python = this.detectPython();
    const pip = this.detectPip(python.path);
    const obsidianCli = this.detectObsidianCli();
    const obshareCli = this.detectObshareCli(python.path);

    return {
      os: osStatus,
      python,
      pip,
      obsidianCli,
      obshareCli,
    };
  }

  async refreshEnvironmentStatus() {
    this.settings.lastEnvironmentStatus = this.detectEnvironmentStatus();
    if (this.settings.lastEnvironmentStatus.python.path) {
      this.settings.boundPythonExecutable = this.settings.lastEnvironmentStatus.python.path;
    }
    if (
      this.settings.lastEnvironmentStatus.obshareCli.ok &&
      this.settings.lastEnvironmentStatus.obshareCli.detectedBy === "direct"
    ) {
      this.settings.boundCliExecutable = this.settings.lastEnvironmentStatus.obshareCli.path;
    }
    await this.saveSettings();
    new Notice("obshare-cli environment status refreshed.");
  }

  detectPlatform() {
    const platform = process.platform;
    if (platform === "win32") {
      return { label: "Windows", detail: "Primary supported platform" };
    }
    if (platform === "darwin") {
      return { label: "macOS", detail: "Primary supported platform" };
    }
    return { label: platform, detail: "Non-target development platform" };
  }

  detectPython() {
    const candidates = process.platform === "win32"
      ? ["py", "python", "python3"]
      : [
          this.settings.boundPythonExecutable,
          "python3",
          "python",
        ].filter(Boolean);

    for (const candidate of candidates) {
      const args = candidate === "py" ? ["-3", "--version"] : ["--version"];
      const result = this.runCommand(candidate, args);
      if (result.ok) {
        return {
          ok: true,
          label: result.output || candidate,
          detail: result.output || candidate,
          path: candidate,
        };
      }
    }

    return {
      ok: false,
      label: "Missing",
      detail: "Python not found",
      path: "",
    };
  }

  detectPip(pythonPath) {
    if (pythonPath) {
      const args =
        pythonPath === "py"
          ? ["-3", "-m", "pip", "--version"]
          : ["-m", "pip", "--version"];
      const result = this.runCommand(pythonPath, args);
      if (result.ok) {
        return {
          ok: true,
          label: "Available",
          detail: result.output,
          path: pythonPath,
        };
      }
    }

    const candidates = process.platform === "win32" ? ["pip", "pip3"] : ["pip3", "pip"];
    return this.findFirstWorkingCommand(candidates, ["--version"], "pip not found");
  }

  detectObsidianCli() {
    const candidates = process.platform === "win32" ? ["obsidian", "Obsidian"] : ["obsidian"];
    return this.findFirstWorkingCommand(candidates, ["--help"], "Obsidian CLI not found");
  }

  detectObshareCli(pythonPath) {
    if (this.settings.boundCliExecutable) {
      const direct = this.runCommand(this.settings.boundCliExecutable, ["--version"]);
      if (direct.ok) {
        return {
          ok: true,
          label: direct.output || this.settings.boundCliExecutable,
          detail: "Detected direct obshare-cli executable",
          path: this.settings.boundCliExecutable,
          detectedBy: "direct",
        };
      }
    }

    if (pythonPath) {
      const args = pythonPath === "py"
        ? ["-3", "-m", "obshare_cli", "--version"]
        : ["-m", "obshare_cli", "--version"];
      const moduleResult = this.runCommand(pythonPath, args);
      if (moduleResult.ok) {
        return {
          ok: true,
          label: moduleResult.output || "obshare-cli",
          detail: "Detected through python -m obshare_cli",
          path: pythonPath,
          detectedBy: "python-module",
        };
      }
    }

    return {
      ...this.findFirstWorkingCommand(["obshare-cli"], ["--version"], "obshare-cli not found"),
      detectedBy: "direct",
    };
  }

  findFirstWorkingCommand(candidates, args, missingMessage) {
    for (const candidate of candidates) {
      const result = this.runCommand(candidate, args);
      if (result.ok) {
        return {
          ok: true,
          label: result.output || candidate,
          detail: result.output || candidate,
          path: candidate,
        };
      }
    }

    return {
      ok: false,
      label: "Missing",
      detail: missingMessage,
      path: "",
    };
  }

  runCommand(command, args) {
    try {
      const completed = childProcess.spawnSync(command, args, {
        encoding: "utf8",
        shell: process.platform === "win32",
      });
      if (completed.error || completed.status !== 0) {
        return {
          ok: false,
          output: (completed.stderr || completed.stdout || "").trim(),
        };
      }
      return {
        ok: true,
        output: (completed.stdout || completed.stderr || "").trim(),
      };
    } catch (error) {
      return {
        ok: false,
        output: error instanceof Error ? error.message : String(error),
      };
    }
  }

  generateInstallCommand() {
    const python = this.settings.boundPythonExecutable || this.defaultPythonCommand();
    if (this.settings.installMode === "isolated") {
      const envPath = this.settings.boundVirtualEnvPath || this.defaultIsolatedEnvPath();
      const pythonInside =
        process.platform === "win32"
          ? path.join(envPath, "Scripts", "python.exe")
          : path.join(envPath, "bin", "python");
      const pythonInvocation =
        python === "py" ? "py -3" : python;
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
      this.settings.lastInstallOutput = result.output || "Command completed successfully.";
      await this.refreshEnvironmentStatus();
      new Notice("obshare-cli installation command finished.");
    } catch (error) {
      this.settings.lastInstallOutput = error instanceof Error ? error.message : String(error);
      new Notice("obshare-cli installation command failed.");
    }
    await this.saveSettings();
  }

  async copyText(text) {
    try {
      if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        new Notice("Command copied to clipboard.");
        return;
      }
    } catch (_) {
      // fall through to notice
    }
    new Notice("Clipboard copy is unavailable in this environment.");
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

  buildCliCommand(args) {
    if (this.settings.boundCliExecutable) {
      return [this.settings.boundCliExecutable, "--json", ...args];
    }

    if (this.settings.installMode === "isolated") {
      const envPath = this.settings.boundVirtualEnvPath || this.defaultIsolatedEnvPath();
      const pythonInside =
        process.platform === "win32"
          ? path.join(envPath, "Scripts", "python.exe")
          : path.join(envPath, "bin", "python");
      return [pythonInside, "-m", "obshare_cli", "--json", ...args];
    }

    const python = this.settings.boundPythonExecutable || this.defaultPythonCommand();
    if (python === "py") {
      return ["py", "-3", "-m", "obshare_cli", "--json", ...args];
    }
    return [python, "-m", "obshare_cli", "--json", ...args];
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
    const result = await this.runCliJson(["config", "show"]);
    if (result.ok && result.data) {
      this.settings.uploadConfigDraft = {
        appId: result.data.app_id || "",
        appSecret: result.data.app_secret || "",
        folderToken: result.data.folder_token || "",
        userId: result.data.user_id || "",
      };
      this.settings.uploadConfigStatus = `Loaded shared configuration via CLI.\n${result.command}`;
    } else {
      this.settings.uploadConfigStatus =
        `Failed to load shared configuration.\n${result.command}\n${result.stderr || result.stdout}`;
    }
    await this.saveSettings();
  }

  async saveUploadConfigDraft() {
    const draft = this.settings.uploadConfigDraft;
    const operations = [
      { value: draft.appId, skip: !draft.appId || draft.appId.endsWith("..."), args: ["config", "set-app-id", draft.appId] },
      { value: draft.appSecret, skip: !draft.appSecret || draft.appSecret === "***", args: ["config", "set-app-secret", draft.appSecret] },
      { value: draft.folderToken, skip: !draft.folderToken || draft.folderToken.endsWith("..."), args: ["config", "set-folder", draft.folderToken] },
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
        new Notice("Failed to save upload configuration.");
        return;
      }
    }

    if (!outputs.length) {
      this.settings.uploadConfigStatus =
        "No save action was performed. Masked values are treated as unchanged.";
    } else {
      this.settings.uploadConfigStatus = outputs.join("\n\n");
    }
    await this.saveSettings();
    new Notice("Upload configuration saved through obshare-cli.");
  }

  async testUploadConfig() {
    const result = await this.runCliJson(["config", "test"]);
    this.settings.uploadConfigStatus = [
      result.command,
      result.stdout || result.stderr || "",
    ]
      .filter(Boolean)
      .join("\n");
    await this.saveSettings();
    new Notice(result.ok ? "CLI connectivity test succeeded." : "CLI connectivity test failed.");
  }

  async importUploadConfig() {
    const source = this.settings.uploadConfigImportPath;
    if (!source) {
      this.settings.uploadConfigStatus = "Import path is empty.";
      await this.saveSettings();
      return;
    }

    await fs.mkdir(path.dirname(this.getSharedConfigPath()), { recursive: true });
    await fs.copyFile(source, this.getSharedConfigPath());
    this.settings.uploadConfigStatus = `Imported shared config from ${source}`;
    await this.loadUploadConfigDraft();
    new Notice("Shared upload configuration imported.");
  }

  async exportUploadConfig() {
    const target = this.settings.uploadConfigExportPath;
    if (!target) {
      this.settings.uploadConfigStatus = "Export path is empty.";
      await this.saveSettings();
      return;
    }

    await fs.copyFile(this.getSharedConfigPath(), target);
    this.settings.uploadConfigStatus = `Exported shared config to ${target}`;
    await this.saveSettings();
    new Notice("Shared upload configuration exported.");
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
          ? "No shared history file found yet."
          : `Failed to read shared history: ${error instanceof Error ? error.message : String(error)}`;
    }
    await this.saveSettings();
  }

  async deleteDocument(token) {
    const result = await this.runCliJson(["delete", token]);
    this.settings.historyStatus = [
      result.command,
      result.stdout || result.stderr || "",
    ]
      .filter(Boolean)
      .join("\n");
    await this.refreshHistory();
    new Notice(result.ok ? `Deleted ${token}` : `Failed to delete ${token}`);
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
    this.settings.historyStatus = [
      result.command,
      result.stdout || result.stderr || "",
    ]
      .filter(Boolean)
      .join("\n");
    await this.refreshHistory();
    new Notice(result.ok ? `Updated permissions for ${token}` : `Failed to update permissions for ${token}`);
  }

  async processNextRequest() {
    if (!this.settings.bridgeDir) {
      new Notice("ObShare bridge directory is not configured.");
      throw new Error("Bridge directory is not configured.");
    }

    const requestPath = await this.findNextRequestPath();
    if (!requestPath) {
      new Notice("No pending ObShare render request found.");
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
