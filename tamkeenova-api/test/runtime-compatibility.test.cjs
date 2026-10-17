const assert = require('node:assert/strict');
const { test } = require('node:test');
const { spawnSync } = require('node:child_process');
const { existsSync } = require('node:fs');
const path = require('node:path');
const deployment = require('../vercel.json');
const manifest = require('../package.json');
const lockfile = require('../package-lock.json');
const root = path.resolve(__dirname, '..');

function run(args, nodeOptions = '') {
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    env: { ...process.env, NODE_OPTIONS: nodeOptions },
    encoding: 'utf8',
    timeout: 30000,
  });
  assert.ifError(result.error);
  return result;
}

test('deployment pins Node 24 and explicitly enables require(ESM)', () => {
  assert.equal(manifest.engines.node, '24.x');
  assert.deepEqual(lockfile.packages[''].engines, manifest.engines);
  assert.equal(deployment.env.NODE_OPTIONS, '--experimental-require-module');
});

test('reproduces the reported crash when require(ESM) is disabled', () => {
  const result = run([
    '--no-experimental-require-module',
    '-e',
    "require('@nestjs/common')",
  ]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /ERR_REQUIRE_ESM/);
});

test('the deployed NODE_OPTIONS loads Nest and its CommonJS throttler dependency', () => {
  const result = run(
    [
      '-e',
      "require('@nestjs/common'); require('@nestjs/core'); require('@nestjs/throttler'); console.log('IMPORTS_OK');",
    ],
    deployment.env.NODE_OPTIONS,
  );
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /IMPORTS_OK/);
});

test('compiled main starts and serves health with deployed Node options', () => {
  assert.ok(
    existsSync(path.join(root, 'dist/main.js')),
    'Run npm run build first.',
  );
  const result = run(
    ['test/helpers/runtime-smoke.cjs'],
    deployment.env.NODE_OPTIONS,
  );
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /RUNTIME_SMOKE_OK/);
  assert.doesNotMatch(result.stdout + result.stderr, /do-not-log/);
});
