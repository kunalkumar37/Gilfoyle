const vscode = require('vscode');

const SHIELD_STATE_KEY = 'aiSuggestionShield.stopped';
const SETTINGS_SNAPSHOT_KEY = 'aiSuggestionShield.settingsSnapshot';

const SUPPRESSION_SETTINGS = [
  { section: 'editor', key: 'inlineSuggest.enabled', stoppedValue: false, restoredValue: true },
  { section: 'editor', key: 'suggest.preview', stoppedValue: false, restoredValue: true },
  { section: 'editor', key: 'quickSuggestions', stoppedValue: false, restoredValue: { other: true, comments: false, strings: false } },
  { section: 'github.copilot', key: 'enable', stoppedValue: { '*': false }, restoredValue: undefined },
  { section: 'github.copilot', key: 'inlineSuggest.enable', stoppedValue: false, restoredValue: undefined },
  { section: 'github.copilot', key: 'editor.enableAutoCompletions', stoppedValue: false, restoredValue: undefined },
  { section: 'github.copilot.chat', key: 'codeGeneration.instructions', stoppedValue: [], restoredValue: undefined },
  { section: 'codex', key: 'enableAutoCompletions', stoppedValue: false, restoredValue: undefined },
  { section: 'codeium', key: 'enableCodeLens', stoppedValue: false, restoredValue: undefined },
  { section: 'codeium', key: 'enableConfig', stoppedValue: false, restoredValue: undefined },
  { section: 'tabnine', key: 'disable_line_regex', stoppedValue: '.*', restoredValue: undefined },
  { section: 'supermaven', key: 'disableInlineCompletion', stoppedValue: true, restoredValue: undefined },
  { section: 'amazonQ', key: 'inlineSuggestions', stoppedValue: false, restoredValue: undefined },
  { section: 'bito', key: 'codeCompletion.enableAutoCompletion', stoppedValue: false, restoredValue: undefined },
  { section: 'continue', key: 'enableTabAutocomplete', stoppedValue: false, restoredValue: undefined },
  { section: 'windsurf', key: 'enableTabAutocomplete', stoppedValue: false, restoredValue: undefined }
];

const BEST_EFFORT_STOP_COMMANDS = [
  'editor.action.inlineSuggest.hide',
  'github.copilot.inlineSuggest.hide',
  'tabnine.disable',
  'codeium.disableCodeium',
  'supermaven.disable',
  'continue.disableTabAutocomplete'
];

let statusBarItem;

function getTarget() {
  const configuredScope = vscode.workspace
    .getConfiguration('aiSuggestionShield')
    .get('targetScope', 'global');

  return configuredScope === 'workspace'
    ? vscode.ConfigurationTarget.Workspace
    : vscode.ConfigurationTarget.Global;
}

function getScopedValue(setting, target) {
  const inspected = vscode.workspace.getConfiguration(setting.section).inspect(setting.key);

  if (!inspected) {
    return undefined;
  }

  return target === vscode.ConfigurationTarget.Workspace
    ? inspected.workspaceValue
    : inspected.globalValue;
}

function getSettingId(setting) {
  return `${setting.section}.${setting.key}`;
}

async function updateSetting(setting, value, target) {
  const config = vscode.workspace.getConfiguration(setting.section);
  await config.update(setting.key, value, target);
}

async function saveSettingsSnapshot(context, target) {
  const snapshot = {};

  for (const setting of SUPPRESSION_SETTINGS) {
    snapshot[getSettingId(setting)] = getScopedValue(setting, target);
  }

  await context.globalState.update(SETTINGS_SNAPSHOT_KEY, snapshot);
}

async function applySettings(stopped, context) {
  const target = getTarget();

  if (stopped) {
    await saveSettingsSnapshot(context, target);
  }

  const snapshot = context.globalState.get(SETTINGS_SNAPSHOT_KEY, {});
  const updates = SUPPRESSION_SETTINGS.map((setting) => {
    const value = stopped ? setting.stoppedValue : snapshot[getSettingId(setting)];
    return updateSetting(setting, value, target);
  });

  const results = await Promise.allSettled(updates);

  if (!stopped) {
    await context.globalState.update(SETTINGS_SNAPSHOT_KEY, undefined);
  }

  return results.filter((result) => result.status === 'rejected').length;
}

async function runBestEffortCommands() {
  const commandSet = new Set(await vscode.commands.getCommands(true));
  const runs = BEST_EFFORT_STOP_COMMANDS
    .filter((command) => commandSet.has(command))
    .map((command) => vscode.commands.executeCommand(command));

  const results = await Promise.allSettled(runs);
  return results.filter((result) => result.status === 'rejected').length;
}

function setStoppedState(context, stopped) {
  return context.globalState.update(SHIELD_STATE_KEY, stopped);
}

function isStopped(context) {
  return context.globalState.get(SHIELD_STATE_KEY, false);
}

function updateStatusBar(context) {
  if (!statusBarItem) {
    return;
  }

  const stopped = isStopped(context);
  statusBarItem.text = stopped ? '$(shield) AI Suggestions Off' : '$(shield) AI Suggestions On';
  statusBarItem.tooltip = stopped
    ? 'AI Suggestion Shield is suppressing inline AI suggestions. Click to restore.'
    : 'AI Suggestion Shield is not active. Click to stop AI suggestions.';
  statusBarItem.command = stopped
    ? 'aiSuggestionShield.restoreSuggestions'
    : 'aiSuggestionShield.stopSuggestions';
}

async function stopSuggestions(context, showMessage = true) {
  const settingFailures = await applySettings(true, context);
  const commandFailures = await runBestEffortCommands();
  await setStoppedState(context, true);
  updateStatusBar(context);

  if (showMessage) {
    const detail = settingFailures || commandFailures
      ? ` Some optional integrations could not be reached (${settingFailures} setting writes, ${commandFailures} commands).`
      : '';
    vscode.window.showInformationMessage(`AI Suggestion Shield stopped inline suggestions and common AI assistant completions.${detail}`);
  }
}

async function restoreSuggestions(context) {
  const settingFailures = await applySettings(false, context);
  await setStoppedState(context, false);
  updateStatusBar(context);

  const detail = settingFailures
    ? ` Some optional settings could not be restored (${settingFailures} setting writes).`
    : '';
  vscode.window.showInformationMessage(`AI Suggestion Shield restored default suggestion behavior.${detail}`);
}

async function toggleSuggestions(context) {
  if (isStopped(context)) {
    await restoreSuggestions(context);
  } else {
    await stopSuggestions(context);
  }
}

function createStatusBar(context) {
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  context.subscriptions.push(statusBarItem);
  updateStatusBar(context);

  const shouldShow = vscode.workspace
    .getConfiguration('aiSuggestionShield')
    .get('showStatusBar', true);

  if (shouldShow) {
    statusBarItem.show();
  }
}

function activate(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand('aiSuggestionShield.stopSuggestions', () => stopSuggestions(context)),
    vscode.commands.registerCommand('aiSuggestionShield.restoreSuggestions', () => restoreSuggestions(context)),
    vscode.commands.registerCommand('aiSuggestionShield.toggleSuggestions', () => toggleSuggestions(context)),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('aiSuggestionShield.showStatusBar')) {
        const shouldShow = vscode.workspace
          .getConfiguration('aiSuggestionShield')
          .get('showStatusBar', true);
        if (shouldShow) {
          statusBarItem.show();
        } else {
          statusBarItem.hide();
        }
      }
    })
  );

  createStatusBar(context);

  const autoStop = vscode.workspace
    .getConfiguration('aiSuggestionShield')
    .get('autoStopOnStartup', false);

  if (autoStop) {
    stopSuggestions(context, false);
  }
}

function deactivate() {}

module.exports = {
  activate,
  deactivate
};
