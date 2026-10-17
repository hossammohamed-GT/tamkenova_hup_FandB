import { beforeAll, afterAll, describe, expect, it, jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { TrainersController } from './trainers.controller';
import { TrainersService } from './trainers.service';
import { PrismaService } from '../../prisma/prisma.service';
import { applicationValidationPipe } from '../../common/validation/field-validation';

const id = '11111111-1111-4111-a111-111111111111';
describe('Authenticated trainer rating HTTP boundary', () => {
  let app: INestApplication,
    token: string,
    oldSecret: string | undefined,
    role = 'STUDENT';
  const status = jest
    .fn<any>()
    .mockResolvedValue({
      success: true,
      data: [{ trainer_id: id, rating: 4 }],
    });
  const create = jest.fn<any>().mockResolvedValue({ success: true });
  beforeAll(async () => {
    oldSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = 'test-only-trainer-rating-secret';
    token = jwt.sign({ sub: id, tv: 0 }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const module = await Test.createTestingModule({
      controllers: [TrainersController],
      providers: [
        {
          provide: TrainersService,
          useValue: { getMyReviewStatus: status, createReview: create },
        },
        {
          provide: PrismaService,
          useValue: {
            users: {
              findUnique: async () => ({
                id,
                role,
                is_active: true,
                email_verified: true,
                token_version: 0,
              }),
            },
          },
        },
      ],
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(applicationValidationPipe());
    await app.init();
  });
  afterAll(async () => {
    await app?.close();
    if (oldSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = oldSecret;
  });
  it('does not disclose review status anonymously', async () => {
    await request(app.getHttpServer())
      .get('/api/trainers/reviews/mine')
      .expect(401);
  });
  it('private status derives identity from authentication, not query input', async () => {
    role = 'STUDENT';
    const response = await request(app.getHttpServer())
      .get('/api/trainers/reviews/mine?studentId=someone-else')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(status).toHaveBeenLastCalledWith(id);
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(response.headers.vary).toContain('Authorization');
  });
  it('rejects non-learners from the private status endpoint', async () => {
    role = 'ADMIN';
    await request(app.getHttpServer())
      .get('/api/trainers/reviews/mine')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
    role = 'STUDENT';
  });
  it('requires authentication to submit', async () => {
    await request(app.getHttpServer())
      .post(`/api/trainers/${id}/reviews`)
      .send({ rating: 5 })
      .expect(401);
  });
  it.each([0, 6, 2.5, '5'])(
    'rejects an invalid star rating: %s',
    async (rating) => {
      await request(app.getHttpServer())
        .post(`/api/trainers/${id}/reviews`)
        .set('Authorization', `Bearer ${token}`)
        .send({ rating })
        .expect(400);
    },
  );
  it('forwards valid submission with the authenticated identity', async () => {
    await request(app.getHttpServer())
      .post(`/api/trainers/${id}/reviews`)
      .set('Authorization', `Bearer ${token}`)
      .send({ rating: 5, comment: '' })
      .expect(201);
    expect(create).toHaveBeenLastCalledWith(id, id, { rating: 5, comment: '' });
  });
});
