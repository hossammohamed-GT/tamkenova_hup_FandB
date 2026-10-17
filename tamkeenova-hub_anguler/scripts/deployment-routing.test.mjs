import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const read = (name) => readFileSync(new URL(name, root), 'utf8');
const config = JSON.parse(read('vercel.json'));
const backend = 'https://tamkeenova-api.vercel.app';

test('production forwards the entire API boundary to the real HTTPS backend', () => {
  assert.deepEqual(config.rewrites[0], {
    source: '/api/:path*',
    destination: `${backend}/api/:path*`,
  });
  assert.equal(new URL(config.rewrites[0].destination).protocol, 'https:');
  assert.equal(config.redirects, undefined);
});

test('the Angular fallback comes after the API gateway, never in front of it', () => {
  assert.deepEqual(config.rewrites.at(-1), {
    source: '/(.*)',
    destination: '/index.html',
  });
  assert.equal(config.rewrites.length, 2);
  assert.equal(config.routes, undefined);
});

test('API proxy responses stay private, uncached and unindexed at the frontend edge', () => {
  const rule = config.headers.find((item) => item.source === '/api/:path*');
  assert.ok(rule);
  const headers = Object.fromEntries(
    rule.headers.map(({ key, value }) => [key.toLowerCase(), value]),
  );
  assert.equal(headers['cache-control'], 'private, no-store');
  assert.equal(headers['x-robots-tag'], 'noindex, nofollow, noarchive');
});

test('frontend environments retain same-origin API URLs and the tested bearer-token boundary', () => {
  for (const name of ['environment.ts', 'environment.prod.ts', 'environment.development.ts']) {
    const environment = read(`src/environments/${name}`);
    assert.match(environment, /apiUrl:\s*['"]\/api['"]/);
    assert.doesNotMatch(environment, /localhost|127\.0\.0\.1|tamkeenova-api\.vercel\.app/);
  }
  const angular = JSON.parse(read('angular.json'));
  const project = angular.projects['tamkeenova-hub_anguler'];
  assert.equal(project.architect.build.defaultConfiguration, 'production');
  assert.ok(
    project.architect.build.configurations.production.fileReplacements.some(
      (replacement) =>
        replacement.replace === 'src/environments/environment.ts' &&
        replacement.with === 'src/environments/environment.prod.ts',
    ),
  );
});

test('development still uses the local server-side proxy without changing browser destinations', () => {
  const proxy = JSON.parse(read('proxy.conf.json'));
  assert.equal(proxy['/api/**'].target, 'http://127.0.0.1:3000');
  assert.equal(proxy['/api/**'].changeOrigin, true);
  const angular = JSON.parse(read('angular.json'));
  assert.equal(
    angular.projects['tamkeenova-hub_anguler'].architect.serve.options.proxyConfig,
    'proxy.conf.json',
  );
});

test('security headers remain enabled while the production HTTPS proxy is added', () => {
  const global = config.headers.find((item) => item.source === '/(.*)');
  const headers = Object.fromEntries(
    global.headers.map(({ key, value }) => [key.toLowerCase(), value]),
  );
  assert.equal(headers['x-frame-options'], 'DENY');
  assert.equal(headers['x-content-type-options'], 'nosniff');
  assert.match(headers['content-security-policy'], /script-src 'self';/);
  assert.match(headers['content-security-policy'], /connect-src 'self' https:;/);
  assert.match(headers['content-security-policy'], /frame-ancestors 'none';/);
  assert.doesNotMatch(headers['content-security-policy'], /localhost|127\.0\.0\.1/);
});
