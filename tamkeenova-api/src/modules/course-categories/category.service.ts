import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { assertSafeImage } from '../../common/security/file-upload';
import { invalidField } from '../../common/validation/field-validation';
import { CategoryDto } from './category.dto';
const counts = {
  _count: {
    select: { children: true, course_links: true, learning_programs: true },
  },
} as const;
@Injectable()
export class CategoryService {
  constructor(
    private readonly db: PrismaService,
    private readonly storage: StorageService,
  ) {}
  async list() {
    return {
      success: true,
      data: await this.db.course_categories.findMany({
        orderBy: [{ display_order: 'asc' }, { name_en: 'asc' }],
        include: counts,
      }),
    };
  }
  private async mutate<T>(
    operation: (tx: Prisma.TransactionClient) => Promise<T>,
  ) {
    try {
      return await this.db.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === 'P2002')
        invalidField(
          'slug',
          'الرابط مستخدم بالفعل / This category slug is already in use',
        );
      if (code === 'P2003' || code === 'P2034')
        throw new ConflictException(
          'تغيّر التصنيف أو أصبح مرتبطًا ببيانات. حدّث الصفحة / Category changed or is referenced; refresh and retry',
        );
      if (code === 'P2025')
        throw new NotFoundException('التصنيف غير موجود / Category not found');
      throw e;
    }
  }
  async save(dto: CategoryDto, id?: string) {
    return this.mutate(async (tx) => {
      const previous = id
        ? await tx.course_categories.findUnique({
            where: { id },
            include: counts,
          })
        : null;
      if (id && !previous) throw new NotFoundException('Category not found');
      if (dto.parent_id) {
        if (dto.parent_id === id)
          invalidField(
            'parent_id',
            'التصنيف لا يمكن أن يكون أبًا لنفسه / A category cannot parent itself',
          );
        const parent = await tx.course_categories.findUnique({
          where: { id: dto.parent_id },
        });
        if (!parent || parent.parent_id)
          invalidField(
            'parent_id',
            'اختر تصنيفًا رئيسيًا موجودًا / Choose an existing top-level category',
          );
        if (previous?._count.children)
          invalidField(
            'parent_id',
            'انقل التصنيفات الفرعية أولًا / Move child categories before changing this parent',
          );
      }

      const data = {
        name_ar: dto.name_ar,
        name_en: dto.name_en,
        slug: dto.slug,
        description_ar: dto.description_ar?.trim() || null,
        description_en: dto.description_en?.trim() || null,
        image_url: dto.image_url || null,
        parent_id: dto.parent_id || null,
        display_order: dto.display_order,
        is_active: dto.is_active,
      };
      const row = id
        ? await tx.course_categories.update({
            where: { id },
            data,
            include: counts,
          })
        : await tx.course_categories.create({ data, include: counts });
      return { success: true, data: row };
    });
  }
  async visibility(id: string, is_active: boolean) {
    return this.mutate(async (tx) => ({
      success: true,
      data: await tx.course_categories.update({
        where: { id },
        data: { is_active },
        include: counts,
      }),
    }));
  }
  async remove(id: string) {
    return this.mutate(async (tx) => {
      const row = await tx.course_categories.findUnique({
        where: { id },
        include: counts,
      });
      if (!row) throw new NotFoundException('Category not found');
      if (Object.values(row._count).some((n) => n > 0))
        throw new ConflictException(
          'التصنيف مرتبط بكورسات أو برامج أو تصنيفات فرعية؛ أخفه بدل الحذف أو انقل الارتباطات أولًا / This category has courses, programs or children; hide it instead, or move its references first',
        );

      await tx.course_categories.delete({
        where: {
          id,
          course_links: { none: {} },
          learning_programs: { none: {} },
          children: { none: {} },
        },
      });
      return { success: true };
    });
  }
  async upload(file: Express.Multer.File) {
    const mime = assertSafeImage(file);
    const image = await this.storage.uploadFile(
      'course-categories',
      file.originalname,
      file.buffer,
      mime,
    );
    return { success: true, data: { image_url: image.url } };
  }
}
