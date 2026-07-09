#!/usr/bin/env node
const { execSync } = require('node:child_process');

const checks = [
  ['node', 'node --version'],
  ['pnpm', 'pnpm --version'],
  ['git', 'git --version'],
];

let failed = false;

for (const [name, cmd] of checks) {
  try {
    const out = execSync(cmd, { encoding: 'utf8' }).trim();
    console.log(`✔ ${name}: ${out}`);
  } catch {
    console.log(`✘ ${name}: not found`);
    failed = true;
  }
}

if (failed) {
  process.exitCode = 1;
}
