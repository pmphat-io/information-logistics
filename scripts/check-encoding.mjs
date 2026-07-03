#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { TextDecoder } from 'node:util';

const args = new Set(process.argv.slice(2));
const checkChanged = args.has('--changed');
const checkStaged = args.has('--staged');

if (checkChanged && checkStaged) {
  console.error('Use only one mode: --changed or --staged.');
  process.exit(1);
}

const decoder = new TextDecoder('utf-8', { fatal: true });

const textFilePattern =
  /\.(js|cjs|mjs|ts|tsx|jsx|json|md|mdx|yml|yaml|html|css|scss|sass|less|vue|svelte|txt|sql|graphql|gql|env)$/i;

const specialTextFilePattern =
  /(^|[\\/])(Dockerfile|AGENTS\.md|README|LICENSE|\.env(?:\..*)?)$/i;

const ignorePathPattern =
  /(^|[\\/])(node_modules|dist|build|coverage|\.next|\.nuxt|\.git|\.turbo|\.cache)[\\/]/;

const suspiciousPatterns = [
  {
    name: 'replacement character',
    regex: /\uFFFD/u,
  },
  {
    name: 'common UTF-8 mojibake',
    // Examples this should catch:
    // Tiếng Việt -> Tiáº¿ng Viá»‡t
    // đăng nhập  -> Ä‘Äƒng nháº­p
    // Bạn có thể -> Báº¡n cÃ³ thá»ƒ
    regex:
      /(?:Ã[\u0080-\u00BF\u00C0-\u00FF]?|Â[\u0080-\u00BF]?|Ä[\u0080-\u00BF\u0100-\u017F]?|Å[\u0080-\u00BF\u0100-\u017F]?|Æ[\u0080-\u00BF\u0100-\u01FF]?|á[º»][\u0080-\u00BF\u00C0-\u00FF]?)/u,
  },
];

function git(gitArgs) {
  return execFileSync('git', gitArgs, {
    encoding: 'buffer',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function splitZeroBuffer(buffer) {
  return buffer.toString('utf8').split('\0').filter(Boolean);
}

function unique(items) {
  return [...new Set(items)];
}

function getFiles() {
  if (checkStaged) {
    return splitZeroBuffer(
      git(['diff', '--name-only', '-z', '--cached', '--diff-filter=ACMRT'])
    );
  }

  if (checkChanged) {
    const unstaged = splitZeroBuffer(
      git(['diff', '--name-only', '-z', '--diff-filter=ACMRT'])
    );

    const staged = splitZeroBuffer(
      git(['diff', '--name-only', '-z', '--cached', '--diff-filter=ACMRT'])
    );

    const untracked = splitZeroBuffer(
      git(['ls-files', '--others', '--exclude-standard', '-z'])
    );

    return unique([...unstaged, ...staged, ...untracked]);
  }

  return splitZeroBuffer(git(['ls-files', '-z']));
}

function isTextFile(file) {
  return textFilePattern.test(file) || specialTextFilePattern.test(file);
}

function shouldSkip(file) {
  return ignorePathPattern.test(file);
}

function lineNumberOf(text, index) {
  return text.slice(0, index).split(/\r\n|\r|\n/).length;
}

function previewAround(text, index) {
  const start = Math.max(0, index - 30);
  const end = Math.min(text.length, index + 60);
  return text.slice(start, end).replace(/\r?\n/g, '\\n');
}

const bad = [];

let files;

try {
  files = getFiles();
} catch (error) {
  console.error('Could not list files with git.');
  console.error(String(error?.message ?? error));
  process.exit(1);
}

for (const file of files) {
  if (!isTextFile(file)) continue;
  if (shouldSkip(file)) continue;
  if (!existsSync(file)) continue;

  const buffer = readFileSync(file);

  try {
    decoder.decode(buffer);
  } catch {
    bad.push({
      file,
      reason: 'Invalid UTF-8 bytes',
    });
    continue;
  }

  const text = buffer.toString('utf8');

  for (const pattern of suspiciousPatterns) {
    const match = pattern.regex.exec(text);

    if (match) {
      bad.push({
        file,
        reason: `${pattern.name} near line ${lineNumberOf(text, match.index)}: ${JSON.stringify(
          previewAround(text, match.index)
        )}`,
      });
      break;
    }
  }
}

if (bad.length > 0) {
  console.error('\nEncoding check failed:\n');

  for (const item of bad) {
    console.error(`- ${item.file}`);
    console.error(`  ${item.reason}`);
  }

  console.error(
    '\nPossible cause: Vietnamese text was decoded/re-encoded incorrectly, or a file is not valid UTF-8.'
  );

  process.exit(1);
}

const mode = checkStaged ? 'staged files' : checkChanged ? 'changed files' : 'tracked files';
console.log(`Encoding check passed (${mode}).`);