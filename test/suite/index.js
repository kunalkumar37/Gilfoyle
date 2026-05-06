const assert = require('assert');
const vscode = require('vscode');

async function activateExtension() {
  const extension = vscode.extensions.getExtension('gilfoyle.ai-suggestion-shield');
  assert.ok(extension, 'Expected the AI Suggestion Shield extension to be installed in the extension host.');
  await extension.activate();
}

function getValue(section, key) {
  return vscode.workspace.getConfiguration(section).get(key);
}

async function setValue(section, key, value) {
  await vscode.workspace
    .getConfiguration(section)
    .update(key, value, vscode.ConfigurationTarget.Global);
}

async function run() {
  await activateExtension();

  await setValue('aiSuggestionShield', 'targetScope', 'global');
  await setValue('editor', 'inlineSuggest.enabled', true);
  await setValue('editor', 'suggest.preview', true);
  await setValue('editor', 'quickSuggestions', { other: true, comments: true, strings: true });

  await vscode.commands.executeCommand('aiSuggestionShield.stopSuggestions');

  assert.strictEqual(getValue('editor', 'inlineSuggest.enabled'), false, 'Stop command should disable editor inline suggestions.');
  assert.strictEqual(getValue('editor', 'suggest.preview'), false, 'Stop command should disable suggestion previews.');
  assert.strictEqual(getValue('editor', 'quickSuggestions'), false, 'Stop command should disable quick suggestions.');

  await vscode.commands.executeCommand('aiSuggestionShield.restoreSuggestions');

  assert.strictEqual(getValue('editor', 'inlineSuggest.enabled'), true, 'Restore command should restore inline suggestions.');
  assert.strictEqual(getValue('editor', 'suggest.preview'), true, 'Restore command should restore suggestion previews.');
  assert.deepStrictEqual(
    getValue('editor', 'quickSuggestions'),
    { other: true, comments: true, strings: true },
    'Restore command should restore the previous quickSuggestions object.'
  );

  await vscode.commands.executeCommand('aiSuggestionShield.toggleSuggestions');
  assert.strictEqual(getValue('editor', 'inlineSuggest.enabled'), false, 'Toggle command should stop suggestions when the shield is off.');

  await vscode.commands.executeCommand('aiSuggestionShield.toggleSuggestions');
  assert.strictEqual(getValue('editor', 'inlineSuggest.enabled'), true, 'Toggle command should restore suggestions when the shield is on.');
}

module.exports = { run };
