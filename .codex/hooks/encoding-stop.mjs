#!/usr/bin/env node

import { execFileSync, spawnSync } from 'node:child_process';

function getGitRoot() {
  try {
    return execFileSync('git', ['rev-parse', '--show-toplevel'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return process.cwd();
  }
}

function emitStop(message) {
  process.stdout.write(
    JSON.stringify({
      continue: false,
      stopReason: 'Encoding check failed',
      systemMessage: message,
    })
  );

  process.exit(0);
}

const cwd = getGitRoot();
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const result = spawnSync(npmCommand, ['run', '-s', 'check:encoding:changed'], {
  cwd,
  encoding: 'utf8',
  shell: false,
});

if (result.error) {
  emitStop(
    [
      'Could not run encoding check after this Codex turn.',
      '',
      String(result.error.message ?? result.error),
      '',
      'Please run manually:',
      'npm run check:encoding:changed',
    ].join('\n')
  );
}

if (result.status === 0) {
  // Important for Codex Stop hooks:
  // success should produce no stdout.
  process.exit(0);
}

const output = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();

emitStop(
  [
    'Encoding check failed after this Codex turn.',
    '',
    'Do not rewrite the whole file automatically.',
    'Inspect `git diff`, then restore the damaged file or make a minimal targeted fix.',
    '',
    output.slice(0, 4000),
  ].join('\n')
);