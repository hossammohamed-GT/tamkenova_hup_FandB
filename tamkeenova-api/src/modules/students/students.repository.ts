import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { enrollment_status } from '@prisma/client';

@Injectable()
export class StudentsRepository {

  // Initialize instance
  constructor(private readonly prisma: PrismaService) {}




  // Handle get profile
  async getProfile(userId: string) {
    return this.prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        full_name: true,
        email: true,
        phone: true,
        username: true,
        profile_image: true,
        bio: true,
        location: true,
        whatsapp: true,
        website_url: true,
        linkedin_url: true,
        total_training_hours: true,
        role: true,
        created_at: true,
        student_enrollments: {
          where: { status: 'COMPLETED' },
          select: { id: true },
        },
        certificates: {
          select: { id: true },
        },
        student_skills: {
          select: { id: true, skill_name: true, source: true },
        },
      },
    });
  }


  // Handle update profile
  async updateProfile(userId: string, data: {
    full_name?: string;
    bio?: string;
    location?: string;
    username?: string;
  }) {
    return this.prisma.users.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        full_name: true,
        email: true,
        phone: true,
        username: true,
        profile_image: true,
        bio: true,
        location: true,
        role: true,
        updated_at: true,
      },
    });
  }


  // Handle update avatar
  async updateAvatar(userId: string, imageUrl: string) {
    return this.prisma.users.update({
      where: { id: userId },
      data: { profile_image: imageUrl },
      select: {
        id: true,
        full_name: true,
        email: true,
        profile_image: true,
        updated_at: true,
      },
    });
  }




  // Handle get password hash
  async getPasswordHash(userId: string) {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      select: { password: true },
    });
    return user?.password;
  }


  // Handle update password
  async updatePassword(userId: string, hashedPassword: string) {
    return this.prisma.users.update({
      where: { id: userId },
      data: { password: hashedPassword },
      select: { id: true, updated_at: true },
    });
  }




  // Handle get contact info
  async getContactInfo(userId: string) {
    return this.prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        whatsapp: true,
        website_url: true,
        linkedin_url: true,
      },
    });
  }


  // Handle update contact info
  async updateContactInfo(userId: string, data: {
    phone?: string;
    whatsapp?: string;
    email?: string;
    website_url?: string;
    linkedin_url?: string;
  }) {
    return this.prisma.users.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        phone: true,
        whatsapp: true,
        website_url: true,
        linkedin_url: true,
        updated_at: true,
      },
    });
  }




  // Handle find user by email
  async findUserByEmail(email: string) {
    return this.prisma.users.findUnique({
      where: { email },
      select: { id: true },
    });
  }


  // Handle find user by username
  async findUserByUsername(username: string) {
    return this.prisma.users.findUnique({
      where: { username },
      select: { id: true },
    });
  }


  // Handle find user by phone
  async findUserByPhone(phone: string) {
    return this.prisma.users.findUnique({
      where: { phone },
      select: { id: true },
    });
  }




  // Handle search trainers
  async searchTrainers(params: {
    search?: string;
    specialization_id?: string;
    min_rating?: number;
    page: number;
    limit: number;
  }) {
    const { search, specialization_id, min_rating, page, limit } = params;
    const skip = (page - 1) * limit;



    const where: any = {
      trainer_status: 'APPROVED',
      is_available: true,
      users: { is_active: true },
    };


    if (search) {
      const trimmed = search.trim();
      if (trimmed) {
        where.AND = [
          {
            OR: [
              {
                users: {
                  OR: [
                    { full_name: { contains: trimmed, mode: 'insensitive' } },
                    { username: { contains: trimmed, mode: 'insensitive' } },
                  ],
                },
              },
              { bio_ar: { contains: trimmed, mode: 'insensitive' } },
              { bio_en: { contains: trimmed, mode: 'insensitive' } },
              {
                specializations: {
                  OR: [
                    { name_ar: { contains: trimmed, mode: 'insensitive' } },
                    { name_en: { contains: trimmed, mode: 'insensitive' } },
                  ],
                },
              },
            ],
          },
        ];
      }
    }


    if (specialization_id) {
      where.specialization_id = specialization_id;
    }


    if (min_rating !== undefined) {
      where.average_rating = { gte: min_rating };
    }

    const [trainers, total] = await Promise.all([
      this.prisma.trainers.findMany({
        where,
        skip,
        take: limit,
        orderBy: { average_rating: 'desc' },
        select: {
          id: true,
          slug: true,
          bio_ar: true,
          bio_en: true,
          years_of_experience: true,
          consultation_price: true,
          average_rating: true,
          ratings_count: true,
          total_students: true,
          users: {
            select: {
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
      }),
      this.prisma.trainers.count({ where }),
    ]);

    return {
      data: trainers,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }




  // Handle search programs
  async searchPrograms(params: {
    search?: string;
    level?: string;
    trainer_id?: string;
    min_price?: number;
    max_price?: number;
    page: number;
    limit: number;
  }) {
    const { search, level, trainer_id, min_price, max_price, page, limit } = params;
    const skip = (page - 1) * limit;

    const where: any = {
      is_active: true,
    };


    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { short_description: { contains: search, mode: 'insensitive' } },
      ];
    }


    if (level) {
      where.level = level;
    }


    if (trainer_id) {
      where.trainer_id = trainer_id;
    }


    if (min_price !== undefined || max_price !== undefined) {
      where.price = {};
      if (min_price !== undefined) where.price.gte = min_price;
      if (max_price !== undefined) where.price.lte = max_price;
    }

    const [programs, total] = await Promise.all([
      this.prisma.training_programs.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          title: true,
          slug: true,
          image_url: true,
          short_description: true,
          price: true,
          discount_price: true,
          duration_hours: true,
          level: true,
          trainers: {
            select: {
              id: true,
              slug: true,
              users: {
                select: {
                  full_name: true,
                  profile_image: true,
                },
              },
            },
          },
          _count: {
            select: {
              student_enrollments: true,
            },
          },
        },
      }),
      this.prisma.training_programs.count({ where }),
    ]);

    return {
      data: programs.map((p) => ({
        ...p,
        enrolled_count: p._count.student_enrollments,
        _count: undefined,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }


  // Handle get program by id
  async getProgramById(programId: string) {
    return this.prisma.training_programs.findUnique({
      where: { id: programId },
      select: {
        id: true,
        title: true,
        slug: true,
        image_url: true,
        short_description: true,
        description: true,
        price: true,
        discount_price: true,
        duration_hours: true,
        level: true,
        is_active: true,
        trainers: {
          select: {
            id: true,
            slug: true,
            average_rating: true,
            users: {
              select: {
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
        _count: {
          select: {
            student_enrollments: true,
          },
        },
      },
    });
  }




  // Handle find enrollment
  async findEnrollment(studentId: string, programId: string) {
    return this.prisma.student_enrollments.findUnique({
      where: {
        student_id_program_id: {
          student_id: studentId,
          program_id: programId,
        },
      },
    });
  }


  // Handle create enrollment
  async createEnrollment(studentId: string, programId: string) {
    return this.prisma.student_enrollments.create({
      data: {
        student_id: studentId,
        program_id: programId,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        status: true,
        enrolled_at: true,
        progress: true,
        training_programs: {
          select: {
            id: true,
            title: true,
            slug: true,
            price: true,
            duration_hours: true,
            trainers: {
              select: {
                id: true,
                users: {
                  select: { full_name: true },
                },
              },
            },
          },
        },
      },
    });
  }


  // Handle get student enrollments
  async getStudentEnrollments(studentId: string, status?: enrollment_status) {
    const where: any = { student_id: studentId };
    if (status) {
      where.status = status;
    }

    return this.prisma.student_enrollments.findMany({
      where,
      orderBy: { enrolled_at: 'desc' },
      select: {
        id: true,
        status: true,
        enrolled_at: true,
        completed_at: true,
        cancelled_at: true,
        progress: true,
        trainer_notes: true,
        training_programs: {
          select: {
            id: true,
            title: true,
            slug: true,
            image_url: true,
            price: true,
            discount_price: true,
            duration_hours: true,
            level: true,
            trainers: {
              select: {
                id: true,
                slug: true,
                users: {
                  select: {
                    full_name: true,
                    profile_image: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }


  // Handle get enrollment by id
  async getEnrollmentById(enrollmentId: string, studentId: string) {
    return this.prisma.student_enrollments.findFirst({
      where: {
        id: enrollmentId,
        student_id: studentId,
      },
      select: {
        id: true,
        status: true,
        enrolled_at: true,
        completed_at: true,
        cancelled_at: true,
        progress: true,
        trainer_notes: true,
        training_programs: {
          select: {
            id: true,
            title: true,
            slug: true,
            image_url: true,
            short_description: true,
            description: true,
            price: true,
            discount_price: true,
            duration_hours: true,
            level: true,
            trainers: {
              select: {
                id: true,
                slug: true,
                average_rating: true,
                users: {
                  select: {
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
        },
      },
    });
  }


  // Handle cancel enrollment
  async cancelEnrollment(enrollmentId: string) {
    return this.prisma.student_enrollments.update({
      where: { id: enrollmentId },
      data: {
        status: 'CANCELLED',
        cancelled_at: new Date(),
      },
      select: {
        id: true,
        status: true,
        cancelled_at: true,
      },
    });
  }


  // Handle complete enrollment
  async completeEnrollment(enrollmentId: string, trainerNotes?: string) {
    return this.prisma.student_enrollments.update({
      where: { id: enrollmentId },
      data: {
        status: 'COMPLETED',
        completed_at: new Date(),
        progress: 100,
        trainer_notes: trainerNotes,
      },
    });
  }




  // Handle create certificate
  async createCertificate(data: {
    student_id: string;
    trainer_id: string;
    program_id: string;
    enrollment_id: string;
    verification_code: string;
    title: string;
    description?: string;
    training_hours?: number;
  }) {
    return this.prisma.certificates.create({
      data: {
        student_id: data.student_id,
        trainer_id: data.trainer_id,
        program_id: data.program_id,
        enrollment_id: data.enrollment_id,
        verification_code: data.verification_code,
        title: data.title,
        description: data.description,
        training_hours: data.training_hours || 0,
      },
    });
  }


  // Handle get student certificates
  async getStudentCertificates(studentId: string) {
    return this.prisma.certificates.findMany({
      where: { student_id: studentId },
      orderBy: { issued_at: 'desc' },
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
        training_programs: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
        trainers: {
          select: {
            id: true,
            slug: true,
            users: {
              select: { full_name: true },
            },
          },
        },
      },
    });
  }


  // Handle get certificate by verification code
  async getCertificateByVerificationCode(code: string) {
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
            profile_image: true,
          },
        },
        training_programs: {
          select: {
            id: true,
            title: true,
            slug: true,
            duration_hours: true,
          },
        },
        trainers: {
          select: {
            id: true,
            slug: true,
            users: {
              select: { full_name: true },
            },
          },
        },
      },
    });
  }




  // Handle get my reviews
  async getMyReviews(studentId: string) {
    return this.prisma.trainer_reviews.findMany({
      where: { student_id: studentId },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        rating: true,
        comment: true,
        created_at: true,
        trainers: {
          select: {
            id: true,
            slug: true,
            users: {
              select: { full_name: true, profile_image: true },
            },
            specializations: {
              select: { id: true, name_ar: true, name_en: true },
            },
          },
        },
      },
    });
  }


  // Handle get review by id
  async getReviewById(reviewId: string, studentId: string) {
    return this.prisma.trainer_reviews.findFirst({
      where: {
        id: reviewId,
        student_id: studentId,
      },
      select: {
        id: true,
        trainer_id: true,
        student_id: true,
        rating: true,
        comment: true,
        created_at: true,
      },
    });
  }


  // Handle update review
  async updateReview(reviewId: string, data: { rating?: number; comment?: string }) {
    return this.prisma.trainer_reviews.update({
      where: { id: reviewId },
      data,
      select: {
        id: true,
        rating: true,
        comment: true,
        created_at: true,
      },
    });
  }


  // Handle delete review
  async deleteReview(reviewId: string) {
    return this.prisma.trainer_reviews.delete({
      where: { id: reviewId },
    });
  }


  // Handle get trainer average rating
  async getTrainerAverageRating(trainerId: string) {
    const result = await this.prisma.trainer_reviews.aggregate({
      where: { trainer_id: trainerId },
      _avg: { rating: true },
      _count: { rating: true },
    });
    return {
      average: result._avg.rating || 0,
      count: result._count.rating,
    };
  }


  // Handle update trainer rating
  async updateTrainerRating(trainerId: string, average: number, count: number) {
    return this.prisma.trainers.update({
      where: { id: trainerId },
      data: {
        average_rating: average,
        ratings_count: count,
      },
    });
  }




  // Handle get public profile by username
  async getPublicProfileByUsername(username: string) {
    return this.prisma.users.findUnique({
      where: {
        username,
        is_active: true,
      },
      select: {
        id: true,
        full_name: true,
        username: true,
        profile_image: true,
        bio: true,
        location: true,
        website_url: true,
        linkedin_url: true,
        total_training_hours: true,
        role: true,
        created_at: true,
        student_enrollments: {
          where: { status: 'COMPLETED' },
          select: {
            id: true,
            completed_at: true,
            training_programs: {
              select: {
                id: true,
                title: true,
                slug: true,
                duration_hours: true,
                trainers: {
                  select: {
                    id: true,
                    slug: true,
                    users: {
                      select: { full_name: true },
                    },
                  },
                },
              },
            },
          },
        },
        certificates: {
          where: { is_valid: true },
          orderBy: { issued_at: 'desc' },
          select: {
            id: true,
            title: true,
            verification_code: true,
            issued_at: true,
            training_hours: true,
            training_programs: {
              select: { id: true, title: true },
            },
            trainers: {
              select: {
                id: true,
                slug: true,
                users: { select: { full_name: true } },
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




  // Handle get trainer user id
  async getTrainerUserId(trainerId: string) {
    const trainer = await this.prisma.trainers.findUnique({
      where: { id: trainerId },
      select: { user_id: true },
    });
    return trainer?.user_id;
  }


  // Handle get program trainer id
  async getProgramTrainerId(programId: string) {
    const program = await this.prisma.training_programs.findUnique({
      where: { id: programId },
      select: { trainer_id: true },
    });
    return program?.trainer_id;
  }
}
