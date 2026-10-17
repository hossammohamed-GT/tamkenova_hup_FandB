import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SpecializationsRepository {


  constructor(private readonly prisma: PrismaService) {}



  getAll() {
    return this.prisma.specializations.findMany({
      orderBy: {
        name_ar: 'asc',
      },
    });
  }



  getById(id: string) {
    return this.prisma.specializations.findUnique({
      where: {
        id,
      },
    });
  }



  findByName(nameAr: string) {
    return this.prisma.specializations.findFirst({
      where: {
        name_ar: nameAr,
      },
    });
  }



  createRequest(data: {
    user_id: string;
    name_ar: string;
    name_en?: string;
  }) {
    return this.prisma.specialization_requests.create({
      data: {
        user_id: data.user_id,
        name_ar: data.name_ar,
        name_en: data.name_en,
      },
    });
  }
}