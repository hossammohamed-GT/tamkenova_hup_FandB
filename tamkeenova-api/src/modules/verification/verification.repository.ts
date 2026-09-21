import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class VerificationRepository {

  // Initialize instance
  constructor(private readonly prisma: PrismaService) {}




  // Handle get certificate by code
  async getCertificateByCode(code: string) {
    return this.prisma.certificates.findUnique({
      where: { verification_code: code },
      select: {
        id: true,
        verification_code: true,
        title: true,
        description: true,
        pdf_url: true,
        qr_code_url: true,
        issued_at: true,
        is_valid: true,
        training_hours: true,
        users: {
          select: {
            id: true,
            full_name: true,
            username: true,
            profile_image: true,
          },
        },
        training_programs: {
          select: {
            id: true,
            title: true,
            slug: true,
            duration_hours: true,
            level: true,
          },
        },
        trainers: {
          select: {
            id: true,
            slug: true,
            users: {
              select: {
                id: true,
                full_name: true,
                profile_image: true,
              },
            },
            specializations: {
              select: {
                id: true,
                name_ar: true,
                name_en: true,
              },
            },
          },
        },
      },
    });
  }




  // Handle get user for verification
  async getUserForVerification(username: string) {
    return this.prisma.users.findUnique({
      where: {
        username,
        is_active: true,
        email_verified: true,
      },
      select: {
        id: true,
        full_name: true,
        username: true,
        profile_image: true,
        bio: true,
        location: true,
        role: true,
        created_at: true,
        total_training_hours: true,


        certificates: {
          where: { is_valid: true },
          orderBy: { issued_at: 'desc' },
          select: {
            id: true,
            verification_code: true,
            title: true,
            description: true,
            issued_at: true,
            training_hours: true,
            pdf_url: true,
            qr_code_url: true,
            training_programs: {
              select: {
                id: true,
                title: true,
                duration_hours: true,
              },
            },
            trainers: {
              select: {
                id: true,
                slug: true,
                users: {
                  select: { full_name: true, profile_image: true },
                },
                specializations: {
                  select: { name_ar: true, name_en: true },
                },
              },
            },
          },
        },


        student_enrollments: {
          where: { status: 'COMPLETED' },
          orderBy: { completed_at: 'desc' },
          select: {
            id: true,
            completed_at: true,
            training_programs: {
              select: {
                id: true,
                title: true,
                slug: true,
                duration_hours: true,
                level: true,
                trainers: {
                  select: {
                    id: true,
                    slug: true,
                    users: {
                      select: { full_name: true, profile_image: true },
                    },
                  },
                },
              },
            },
          },
        },


        student_skills: {
          select: {
            id: true,
            skill_name: true,
            source: true,
          },
        },
      },
    });
  }
}
