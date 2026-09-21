import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
@Injectable()
export class PartnersRepository {
  constructor(private readonly prisma: PrismaService) {}
  listPublic() { return this.prisma.strategic_partners.findMany({ where: { is_active: true }, orderBy: [{ display_order: 'asc' }, { created_at: 'desc' }] }); }
  listAll() { return this.prisma.strategic_partners.findMany({ orderBy: [{ display_order: 'asc' }, { created_at: 'desc' }] }); }
  create(data: any) { return this.prisma.strategic_partners.create({ data }); }
  update(id: string, data: any) { return this.prisma.strategic_partners.update({ where: { id }, data: { ...data, updated_at: new Date() } }); }
  remove(id: string) { return this.prisma.strategic_partners.delete({ where: { id } }); }
}
