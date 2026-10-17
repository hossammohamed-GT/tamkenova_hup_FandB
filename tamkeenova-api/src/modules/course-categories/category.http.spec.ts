import {
  beforeAll,
  afterAll,
  beforeEach,
  describe,
  it,
  expect,
  jest,
} from '@jest/globals';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { CategoryModule } from './category.module';
import { CategoryService } from './category.service';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { applicationValidationPipe } from '../../common/validation/field-validation';
const id = '11111111-1111-4111-a111-111111111111';
const draft = {
  name_ar: 'تصنيف',
  name_en: 'New category',
  slug: 'new-category',
  image_url: 'https://image.test/photo.png',
  display_order: 0,
  is_active: true,
  parent_id: null,
};
describe('Category HTTP roles, strict validation and upload boundaries', () => {
  let app: INestApplication,
    token: string,
    role = 'ADMIN',
    secret: string | undefined;
  const service: any = {};
  for (const method of ['list', 'save', 'visibility', 'remove', 'upload'])
    service[method] = jest
      .fn<(...args: any[]) => Promise<any>>()
      .mockResolvedValue({ success: true, data: [] });
  beforeAll(async () => {
    secret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = 'category-test-only';
    token = jwt.sign(
      { sub: id, tv: 0, role: 'SUPER_ADMIN' },
      process.env.JWT_SECRET,
    );
    const module = await Test.createTestingModule({ imports: [CategoryModule] })
      .overrideProvider(PrismaService)
      .useValue({
        users: {
          findUnique: async () => ({
            id,
            role,
            is_active: true,
            email_verified: true,
            token_version: 0,
          }),
        },
      })
      .overrideProvider(StorageService)
      .useValue({})
      .overrideProvider(CategoryService)
      .useValue(service)
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(applicationValidationPipe());
    await app.init();
  });
  afterAll(async () => {
    await app.close();
    if (secret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = secret;
  });
  beforeEach(() => {
    role = 'ADMIN';
    for (const fn of Object.values(service)) (fn as any).mockClear();
  });
  it('requires login', async () => {
    await request(app.getHttpServer())
      .get('/api/admin/course-categories')
      .expect(401);
    expect(service.list).not.toHaveBeenCalled();
  });
  it.each(['STUDENT', 'CLIENT', 'TRAINER', 'EMPLOYEE', 'VOLUNTEER'])(
    'blocks current %s role even with a signed admin claim',
    async (current) => {
      role = current;
      for (const method of ['get', 'post', 'put', 'patch', 'delete'] as const) {
        const path =
          method === 'get' || method === 'post'
            ? ''
            : method === 'patch'
              ? `/${id}/visibility`
              : `/${id}`;
        await request(app.getHttpServer())
          [method]('/api/admin/course-categories' + path)
          .set('Authorization', `Bearer ${token}`)
          .send(method === 'patch' ? { is_active: false } : draft)
          .expect(403);
      }
      await request(app.getHttpServer())
        .post('/api/admin/course-categories/image')
        .set('Authorization', `Bearer ${token}`)
        .attach('image', Buffer.from('not-an-image'), 'x.png')
        .expect(403);
      for (const fn of Object.values(service))
        expect(fn).not.toHaveBeenCalled();
    },
  );
  it.each(['ADMIN', 'SUPER_ADMIN'])(
    '%s can list/create/edit/hide/delete categories',
    async (current) => {
      role = current;
      const auth = { Authorization: `Bearer ${token}` };
      await request(app.getHttpServer())
        .get('/api/admin/course-categories')
        .set(auth)
        .expect(200);
      await request(app.getHttpServer())
        .post('/api/admin/course-categories')
        .set(auth)
        .send(draft)
        .expect(201);
      await request(app.getHttpServer())
        .put('/api/admin/course-categories/' + id)
        .set(auth)
        .send(draft)
        .expect(200);
      await request(app.getHttpServer())
        .patch('/api/admin/course-categories/' + id + '/visibility')
        .set(auth)
        .send({ is_active: false })
        .expect(200);
      await request(app.getHttpServer())
        .delete('/api/admin/course-categories/' + id)
        .set(auth)
        .expect(200);
      expect(service.save).toHaveBeenCalledWith(draft, id);
      expect(service.visibility).toHaveBeenCalledWith(id, false);
    },
  );
  it('returns inline field paths for invalid inputs and rejects mass assignment', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/admin/course-categories')
      .set('Authorization', `Bearer ${token}`)
      .send({
        ...draft,
        name_ar: ' ',
        image_url: 'javascript:alert(1)',
        display_order: -1,
        is_active: 'true',
        unexpected: 'value',
      })
      .expect(400);
    expect(response.body.field_errors).toMatchObject({
      name_ar: expect.any(Array),
      image_url: expect.any(Array),
      display_order: expect.any(Array),
      is_active: expect.any(Array),
      unexpected: expect.any(Array),
    });
    expect(service.save).not.toHaveBeenCalled();
  });
  it('validates UUIDs, booleans and a bounded single-file upload before calling services', async () => {
    const auth = { Authorization: `Bearer ${token}` };
    await request(app.getHttpServer())
      .delete('/api/admin/course-categories/bad-id')
      .set(auth)
      .expect(400);
    await request(app.getHttpServer())
      .patch(`/api/admin/course-categories/${id}/visibility`)
      .set(auth)
      .send({ is_active: null })
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/admin/course-categories/image')
      .set(auth)
      .attach('image', Buffer.alloc(5 * 1024 * 1024 + 1), 'big.png')
      .expect(413);
    expect(service.upload).not.toHaveBeenCalled();
  });
});
