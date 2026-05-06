# AI Suggestion Shield

AI Suggestion Shield is a VS Code extension that gives you one shortcut to suppress inline AI ghost text and common AI coding-assistant completions.

## What it can do

- Turn off VS Code inline suggestions, suggestion previews, and quick suggestions.
- Write known suppression settings for popular assistants such as GitHub Copilot, Codex-like assistants, Codeium, Tabnine, Supermaven, Amazon Q, Continue, Bito, and Windsurf.
- Run best-effort disable or hide commands exposed by installed AI assistants when those commands are available.
- Show a status bar control so users can stop or restore suggestions quickly.

> Important: VS Code does not provide a universal API that forcibly disables every extension. This extension uses VS Code settings plus known commands/settings from common AI tools. Extensions that ignore VS Code inline-completion settings or use private APIs may need their own disable command or manual configuration.

## Shortcuts

| Action | Windows/Linux | macOS |
| --- | --- | --- |
| Stop AI suggestions | `Ctrl+Alt+Shift+A` | `Cmd+Alt+Shift+A` |
| Toggle AI suggestions | `Ctrl+Alt+Shift+T` | `Cmd+Alt+Shift+T` |

## Commands

- `AI Suggestion Shield: Stop AI Suggestions`
- `AI Suggestion Shield: Restore AI Suggestions`
- `AI Suggestion Shield: Toggle AI Suggestions`

## Settings

- `aiSuggestionShield.autoStopOnStartup`: automatically stop suggestions when VS Code starts.
- `aiSuggestionShield.showStatusBar`: show or hide the status bar control.
- `aiSuggestionShield.targetScope`: choose whether settings are written globally or only to the current workspace.

## Development

```bash
npm test
npm run test:vscode
```

`npm test` syntax-checks the extension source and test files with Node. `npm run test:vscode` launches a real VS Code extension host, activates this extension, and verifies that the stop, restore, and toggle commands update suggestion settings as expected. Set `VSCODE_TEST_EXECUTABLE` to a VS Code binary if `code` is not on your `PATH`. On headless Linux, install `xvfb-run` so the test script can launch Electron without a physical display.
