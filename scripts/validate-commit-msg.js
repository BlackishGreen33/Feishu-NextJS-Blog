#!/usr/bin/env node

/* eslint-disable no-console */

const fs = require('node:fs');
const path = require('node:path');

const TYPE_TO_EMOJI = {
  feat: '✨',
  fix: '🐛',
  docs: '📝',
  chore: '🔧',
  ci: '🚀',
  refactor: '♻️',
  style: '💄',
  test: '✅',
  perf: '⚡',
  revert: '⏪',
  vercel: '▲',
};

const COMMIT_MESSAGE_PATTERN =
  /^(?<emoji>\S+)\s(?<type>[a-z]+)\((?<scope>[a-z0-9][a-z0-9/-]*)\):\s(?<description>\S.*)$/u;

const EXAMPLES = [
  '✨ feat(site): add featured article section',
  '🐛 fix(sync): avoid stale feishu cache reads',
  '🔧 chore(repo): refresh local tooling',
];

const getCommitMessage = (inputPath) => {
  const resolvedPath = path.resolve(process.cwd(), inputPath);
  return fs.readFileSync(resolvedPath, 'utf8').trim();
};

const validateCommitMessage = (message) => {
  const normalizedMessage = message.trim();
  const match = normalizedMessage.match(COMMIT_MESSAGE_PATTERN);

  if (!match?.groups) {
    return {
      valid: false,
      error:
        'Commit message must match "<emoji> <type>(<scope>): <desc>" with lowercase type and scope.',
    };
  }

  const { emoji, type } = match.groups;
  const expectedEmoji = TYPE_TO_EMOJI[type];

  if (!expectedEmoji) {
    return {
      valid: false,
      error: `Unsupported type "${type}". Allowed types: ${Object.keys(TYPE_TO_EMOJI).join(', ')}.`,
    };
  }

  if (emoji !== expectedEmoji) {
    return {
      valid: false,
      error: `Type "${type}" must use emoji "${expectedEmoji}", but received "${emoji}".`,
    };
  }

  return { valid: true };
};

const printError = (message, error) => {
  console.error('\nInvalid commit message.');
  console.error(`Message: ${message || '(empty)'}`);
  console.error(`Reason: ${error}`);
  console.error('\nExpected examples:');

  for (const example of EXAMPLES) {
    console.error(`  - ${example}`);
  }
};

if (require.main === module) {
  const commitMessageFile = process.argv[2];

  if (!commitMessageFile) {
    console.error(
      'Usage: node scripts/validate-commit-msg.js <commit-message-file>',
    );
    process.exit(1);
  }

  const message = getCommitMessage(commitMessageFile);
  const result = validateCommitMessage(message);

  if (!result.valid) {
    printError(message, result.error);
    process.exit(1);
  }
}

module.exports = {
  TYPE_TO_EMOJI,
  validateCommitMessage,
};
