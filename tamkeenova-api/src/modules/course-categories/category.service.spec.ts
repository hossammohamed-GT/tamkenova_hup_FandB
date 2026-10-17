import 'reflect-metadata';
import { describe, it, expect, jest } from '@jest/globals';
import { CategoryService } from './category.service';
import { CoursesRepository } from '../courses/courses.repository';
import { publicCategoryWhere } from '../courses/public-course-policy';
const mock = () => jest.fn<(...args: any[]) => Promise<any>>();
const draft = {
  name_ar: 'تصنيف',
  name_en: 'Category',
  slug: 'new-category',
  image_url: 'https://example.test/image.png',
  display_order: 12,
  is_active: true,
  parent_id: null,
};
const row = {
  id: 'category',
  ...draft,
  _count: { children: 0, course_links: 0, learning_programs: 0 },
};
function setup() {
  const table = {
    findMany: mock(),
    findUnique: mock(),
    create: mock(),
    update: mock(),
    delete: mock(),
  };
  table.findUnique.mockResolvedValue(row);
  table.create.mockResolvedValue(row);
  table.update.mockResolvedValue(row);
  table.delete.mockResolvedValue(row);
  const db: any = {
    course_categories: table,
    $transaction: jest.fn(async (fn: any) => fn(db)),
  };
  const storage = { uploadFile: mock() };
  return {
    table,
    db,
    storage,
    service: new CategoryService(db, storage as any),
  };
}
describe('Admin category persistence and safe removal', () => {
  it('persists bilingual names, image, order, visibility and parent inside a serializable transaction', async () => {
    const { service, table, db } = setup();
    await service.save(draft);
    expect(table.create.mock.calls[0][0].data).toMatchObject(draft);
    expect(db.$transaction.mock.calls[0][1]).toEqual({
      isolationLevel: 'Serializable',
    });
  });
  it('updates an existing category without deleting course links', async () => {
    const { service, table } = setup();
    await service.save({ ...draft, name_en: 'Updated' }, row.id);
    expect(table.update.mock.calls[0][0].data.name_en).toBe('Updated');
    expect(table.delete).not.toHaveBeenCalled();
  });
  it('hide/show updates only the visibility flag, preserving children and associations', async () => {
    const { service, table } = setup();
    await service.visibility(row.id, false);
    expect(table.update.mock.calls[0][0].data).toEqual({ is_active: false });
    expect(table.delete).not.toHaveBeenCalled();
  });
  it.each(['children', 'course_links', 'learning_programs'])(
    'refuses deletion when %s exist, even for hidden records',
    async (key) => {
      const { service, table } = setup();
      table.findUnique.mockResolvedValue({
        ...row,
        is_active: false,
        _count: { ...row._count, [key]: 1 },
      });
      await expect(service.remove(row.id)).rejects.toMatchObject({
        status: 409,
      });
      expect(table.delete).not.toHaveBeenCalled();
    },
  );
  it('deletes only a genuinely empty category using atomic relation predicates', async () => {
    const { service, table } = setup();
    await service.remove(row.id);
    expect(table.delete.mock.calls[0][0].where).toEqual({
      id: row.id,
      course_links: { none: {} },
      learning_programs: { none: {} },
      children: { none: {} },
    });
  });
  it('handles duplicate slugs as a field error, without swallowing other failures', async () => {
    const { service, table } = setup();
    table.create.mockRejectedValue({ code: 'P2002' });
    await expect(service.save(draft)).rejects.toMatchObject({
      response: { field_errors: { slug: expect.any(Array) } },
    });
    table.create.mockRejectedValue(new Error('database unavailable'));
    await expect(service.save(draft)).rejects.toThrow('database unavailable');
  });
  it('rejects self-parenting, deep nesting and moving a parent with children', async () => {
    const { service, table } = setup();
    await expect(
      service.save({ ...draft, parent_id: row.id }, row.id),
    ).rejects.toMatchObject({ status: 400 });
    table.findUnique.mockResolvedValue({ ...row, parent_id: 'root' });
    await expect(
      service.save({ ...draft, parent_id: 'parent' }),
    ).rejects.toMatchObject({ status: 400 });
    table.findUnique
      .mockResolvedValueOnce({ ...row, _count: { ...row._count, children: 1 } })
      .mockResolvedValueOnce({ ...row, parent_id: null });
    await expect(
      service.save({ ...draft, parent_id: 'parent' }, row.id),
    ).rejects.toMatchObject({ status: 400 });
    expect(table.create).not.toHaveBeenCalled();
    expect(table.update).not.toHaveBeenCalled();
  });
  it('allows a child of a top-level category and returns not found for stale edits', async () => {
    const { service, table } = setup();
    await service.save({ ...draft, parent_id: 'parent' });
    expect(table.create.mock.calls[0][0].data.parent_id).toBe('parent');
    table.findUnique.mockResolvedValue(null);
    await expect(service.save(draft, 'missing')).rejects.toMatchObject({
      status: 404,
    });
  });
  it('never stores SVG/oversized/absent uploads; uses magic-byte-validated content type', async () => {
    const { service, storage } = setup();
    await expect(service.upload(undefined as any)).rejects.toMatchObject({
      status: 400,
    });
    await expect(
      service.upload({
        buffer: Buffer.from('<svg/>'),
        size: 6,
        mimetype: 'image/svg+xml',
      } as any),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      service.upload({
        buffer: Buffer.from('x'),
        size: 6 * 1024 * 1024,
        mimetype: 'image/png',
      } as any),
    ).rejects.toMatchObject({ status: 400 });
    expect(storage.uploadFile).not.toHaveBeenCalled();
    storage.uploadFile.mockResolvedValue({
      url: 'https://storage.test/image.png',
    });
    const file = {
      buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      size: 8,
      mimetype: 'image/png',
      originalname: 'photo.png',
    };
    await expect(service.upload(file as any)).resolves.toEqual({
      success: true,
      data: { image_url: 'https://storage.test/image.png' },
    });
    expect(storage.uploadFile).toHaveBeenCalledWith(
      'course-categories',
      'photo.png',
      file.buffer,
      'image/png',
    );
  });
  it('public category filters also require a visible root; course cards never expose hidden links', async () => {
    const queries: any[] = [];
    const capture = async (q: any) => {
      queries.push(q);
      return [];
    };
    const repo = new CoursesRepository({
      course_categories: {
        findFirst: async (q: any) => {
          queries.push(q);
          return null;
        },
      },
      courses: { findMany: capture, count: async () => 0 },
    } as any);
    await repo.getCourses({
      category: 'hidden-child',
      page: 1,
      limit: 12,
    } as any);
    expect(queries[0].where).toEqual({
      slug: 'hidden-child',
      ...publicCategoryWhere,
    });
    expect(queries[1].include.category_links.where).toEqual({
      course_categories: { is: publicCategoryWhere },
    });
    expect(queries[1].where.category_links.some.course_categories).toEqual({
      slug: 'hidden-child',
      ...publicCategoryWhere,
    });
  });
});
