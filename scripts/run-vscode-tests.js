const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const fixturesWorkspace = path.join(root, 'test', 'fixtures', 'workspace');
const extensionTestsPath = path.join(root, 'test', 'suite', 'index.js');
const tmpRoot = path.join(root, '.vscode-test');

function findExecutable() {
  if (process.env.VSCODE_TEST_EXECUTABLE) {
    return process.env.VSCODE_TEST_EXECUTABLE;
  }

  const candidates = [
    'code',
    'code-insiders',
    path.join(tmpRoot, 'VSCode-linux-x64', 'bin', 'code'),
    path.join(tmpRoot, 'vscode-linux-x64', 'bin', 'code')
  ];

  for (const candidate of candidates) {
    const resolved = candidate.includes(path.sep) ? candidate : findOnPath(candidate);
    if (resolved && fs.existsSync(resolved)) {
      return resolved;
    }
  }

  return undefined;
}

function findOnPath(command) {
  const paths = (process.env.PATH || '').split(path.delimiter);
  const extensions = os.platform() === 'win32' ? ['.cmd', '.exe', ''] : [''];

  for (const entry of paths) {
    for (const extension of extensions) {
      const candidate = path.join(entry, `${command}${extension}`);
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
  }

  return undefined;
}

function ensureDirectory(directory) {
  fs.mkdirSync(directory, { recursive: true });
}

const executable = findExecutable();

if (!executable) {
  console.error('Unable to find a VS Code executable. Install VS Code or set VSCODE_TEST_EXECUTABLE to the code binary before running npm run test:vscode.');
  process.exit(1);
}

ensureDirectory(fixturesWorkspace);
ensureDirectory(tmpRoot);

const args = [
  '--no-sandbox',
  '--disable-gpu',
  '--disable-updates',
  '--skip-welcome',
  '--skip-release-notes',
  `--user-data-dir=${path.join(tmpRoot, 'user-data')}`,
  `--extensions-dir=${path.join(tmpRoot, 'extensions')}`,
  `--extensionDevelopmentPath=${root}`,
  `--extensionTestsPath=${extensionTestsPath}`,
  fixturesWorkspace
];

const runner = process.platform === 'linux' && !process.env.DISPLAY && findOnPath('xvfb-run');
const command = runner || executable;
const commandArgs = runner ? ['-a', executable, ...args] : args;

const result = spawnSync(command, commandArgs, {
  cwd: root,
  encoding: 'utf8',
  stdio: 'inherit',
  env: {
    ...process.env,
    ELECTRON_DISABLE_SECURITY_WARNINGS: '1'
  }
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
