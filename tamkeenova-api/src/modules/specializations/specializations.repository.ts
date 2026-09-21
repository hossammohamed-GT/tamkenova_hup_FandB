import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SpecializationsRepository {

  // Initialize instance
  constructor(private readonly prisma: PrismaService) {}


  // Handle get all
  getAll() {
    return this.prisma.specializations.findMany({
      orderBy: {
        name_ar: 'asc',
      },
    });
  }


  // Handle get by id
  getById(id: string) {
    return this.prisma.specializations.findUnique({
      where: {
        id,
      },
    });
  }


  // Handle find by name
  findByName(nameAr: string) {
    return this.prisma.specializations.findFirst({
      where: {
        name_ar: nameAr,
      },
    });
  }


  // Handle create request
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