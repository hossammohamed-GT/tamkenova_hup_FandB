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
process.env.NODE_ENV = 'production';
process.env.JWT_SECRET = config.JWT_SECRET;
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

  app.listen = async () => {
    try {
      await app.init();
      const health = await request(app.getHttpServer())
        .get('/api/health')
        .expect(200)
        .expect('Cache-Control', 'private, no-store')
        .expect('X-Robots-Tag', /noindex/)
        .expect('X-Content-Type-Options', 'nosniff')
        .expect('X-Frame-Options', 'DENY')
        .expect('Content-Security-Policy', /default-src 'none'/);
      assert.equal(health.headers['x-powered-by'], undefined);
      await request(app.getHttpServer())
        .get('/api/health')
        .set('Origin', 'https://tamkeenova-hub.vercel.app')
        .expect(200)
        .expect(
          'Access-Control-Allow-Origin',
          'https://tamkeenova-hub.vercel.app',
        );
      for (const origin of [
        'https://evil.example.test',
        'http://localhost:4200',
      ]) {
        const denied = await request(app.getHttpServer())
          .get('/api/health?token=do-not-log')
          .set('Origin', origin)
          .expect(403)
          .expect('Cache-Control', 'private, no-store')
          .expect('X-Robots-Tag', /noindex/);
        assert.equal(denied.headers['access-control-allow-origin'], undefined);
      }
      await request(app.getHttpServer())
        .get('/api/admin/users')
        .expect(401)
        .expect('Cache-Control', 'private, no-store')
        .expect('X-Robots-Tag', /noindex/);
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
