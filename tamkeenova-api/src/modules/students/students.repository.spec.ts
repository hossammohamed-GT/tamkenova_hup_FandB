








jest.mock('@nestjs/common', () => ({
  Injectable: () => (target: unknown) => target,
}));
jest.mock('../../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { StudentsRepository } from './students.repository';

describe('StudentsRepository — searchTrainers', () => {
  let repo: StudentsRepository;
  let findManyMock: jest.Mock;
  let countMock: jest.Mock;

  beforeEach(() => {
    findManyMock = jest.fn().mockResolvedValue([]);
    countMock = jest.fn().mockResolvedValue(0);

    const prismaMock = {
      trainers: {
        findMany: findManyMock,
        count: countMock,
      },
    } as any;

    repo = new StudentsRepository(prismaMock);
  });

  it('must NOT filter by is_featured (bug: it made search always return 0 results)', async () => {
    await repo.searchTrainers({ page: 1, limit: 10 });

    const where = findManyMock.mock.calls[0][0].where;

    expect(JSON.stringify(where)).not.toContain('is_featured');
  });

  it('only returns APPROVED and available trainers with an active user account', async () => {
    await repo.searchTrainers({ page: 1, limit: 10 });

    const where = findManyMock.mock.calls[0][0].where;

    expect(where.trainer_status).toBe('APPROVED');
    expect(where.is_available).toBe(true);
    expect(where.users).toEqual({ is_active: true });
  });

  it('searches by full name, username, bios and specialization name (case-insensitive)', async () => {
    await repo.searchTrainers({ search: '  أحمد  ', page: 1, limit: 10 });

    const where = findManyMock.mock.calls[0][0].where;


    expect(where.AND).toEqual([
      {
        OR: [
          {
            users: {
              OR: [
                { full_name: { contains: 'أحمد', mode: 'insensitive' } },
                { username: { contains: 'أحمد', mode: 'insensitive' } },
              ],
            },
          },
          { bio_ar: { contains: 'أحمد', mode: 'insensitive' } },
          { bio_en: { contains: 'أحمد', mode: 'insensitive' } },
          {
            specializations: {
              OR: [
                { name_ar: { contains: 'أحمد', mode: 'insensitive' } },
                { name_en: { contains: 'أحمد', mode: 'insensitive' } },
              ],
            },
          },
        ],
      },
    ]);
  });

  it('ignores a whitespace-only search term', async () => {
    await repo.searchTrainers({ search: '   ', page: 1, limit: 10 });

    const where = findManyMock.mock.calls[0][0].where;

    expect(where.AND).toBeUndefined();
    expect(where.OR).toBeUndefined();
  });

  it('keeps the specialization and min_rating filters combined with the search', async () => {
    await repo.searchTrainers({
      search: 'ahmed',
      specialization_id: 'spec-uuid',
      min_rating: 4,
      page: 1,
      limit: 10,
    });

    const where = findManyMock.mock.calls[0][0].where;

    expect(where.specialization_id).toBe('spec-uuid');
    expect(where.average_rating).toEqual({ gte: 4 });
    expect(where.AND).toBeDefined();
  });

  it('applies pagination correctly', async () => {
    await repo.searchTrainers({ page: 3, limit: 20 });

    expect(findManyMock.mock.calls[0][0].skip).toBe(40);
    expect(findManyMock.mock.calls[0][0].take).toBe(20);
  });

  it('returns data with pagination meta', async () => {
    findManyMock.mockResolvedValue([{ id: 't1' }, { id: 't2' }]);
    countMock.mockResolvedValue(12);

    const result = await repo.searchTrainers({ page: 1, limit: 10 });

    expect(result).toEqual({
      data: [{ id: 't1' }, { id: 't2' }],
      meta: { total: 12, page: 1, limit: 10, totalPages: 2 },
    });
  });
});
