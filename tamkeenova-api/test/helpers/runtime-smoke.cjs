// Native Node smoke test for the compiled entrypoint, not a Jest transform.
// Only external services/configuration are replaced; no real credentials or DB
// connections are needed. main.js still applies its real middleware and routes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
require('reflect-metadata');
const { NestFactory } = require('@nestjs/core');
const { Test } = require('@nestjs/testing');
const { ConfigService } = require('@nestjs/config');
const request = require('supertest');
const { PrismaService } = require('../../dist/prisma/prisma.service.js');
const {
  StorageService,
} = require('../../dist/modules/storage/storage.service.js');

const config = {
  JWT_SECRET: 'runtime-smoke-test-only-not-a-real-secret',
  JWT_EXPIRES_IN: '1h',
};

process.env.VERCEL = '1';
fs.mkdirSync = fs.createWriteStream = () => {
  throw Object.assign(new Error('read-only file system'), { code: 'EROFS' });
};

let started = false;
NestFactory.create = async (rootModule, options) => {
  const fixture = await Test.createTestingModule({ imports: [rootModule] })
    .overrideProvider(PrismaService)
    .useValue({})
    .overrideProvider(StorageService)
    .useValue({})
    .overrideProvider(ConfigService)
    .useValue({
      get: (key) => config[key],
      getOrThrow: (key) => {
        assert.ok(key in config, `Unexpected configuration key: ${key}`);
        return config[key];
      },
    })
    .compile();

  const app = fixture.createNestApplication(options);
  // Don't open a persistent server. Supertest uses an ephemeral test listener.
  app.listen = async () => {
    try {
      await app.init();
      const health = await request(app.getHttpServer())
        .get('/api/health')
        .expect(200);
      assert.deepEqual(health.body, { success: true, status: 'ok' });
      const root = await request(app.getHttpServer()).get('/api').expect(200);
      assert.equal(root.body.message, 'Tamkeenova API Running');
      started = true;
      console.log('RUNTIME_SMOKE_OK');
    } finally {
      await app.close();
    }
  };
  return app;
};

process.on('beforeExit', () => {
  if (!started) {
    console.error('The compiled bootstrap did not finish the health checks.');
    process.exitCode = 1;
  }
});
require('../../dist/main.js');
