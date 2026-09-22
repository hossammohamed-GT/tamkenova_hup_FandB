import { Injectable, NotFoundException } from '@nestjs/common';
import { PartnersRepository } from './partners.repository';
@Injectable()
export class PartnersService {
  constructor(private readonly repo: PartnersRepository) {}
  listPublic() { return this.repo.listPublic(); }
  listAll() { return this.repo.listAll(); }
  create(dto: any) { return this.repo.create({ ...dto, is_active: dto.is_active ?? true, display_order: dto.display_order ?? 0 }); }
  async update(id: string, dto: any) { try { return await this.repo.update(id, dto); } catch { throw new NotFoundException('Partner not found'); } }
  async remove(id: string) { try { await this.repo.remove(id); return { success: true }; } catch { throw new NotFoundException('Partner not found'); } }
}
