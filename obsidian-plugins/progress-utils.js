const path = require("path");

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

function computePercent(index, total) {
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
    percent: computePercent(index + 1, steps.length),
  }));
}

function buildEnvironmentRefreshSteps() {
  const keys = ["platform", "conda", "condaEnv", "python", "pip", "obsidianCli", "obshareCli", "save"];
  return keys.map((key, index) => ({
    key,
    percent: computePercent(index + 1, keys.length),
  }));
}

function buildInstallProgressSteps() {
  const keys = ["prepare", "execute", "refresh", "save", "complete"];
  return keys.map((key, index) => ({
    key,
    percent: computePercent(index + 1, keys.length),
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

module.exports = {
  clampProgressPercent,
  createProgressState,
  buildUploadConfigProgressPlan,
  buildEnvironmentRefreshSteps,
  buildInstallProgressSteps,
  shouldUseSpinnerForCliCommand,
};
