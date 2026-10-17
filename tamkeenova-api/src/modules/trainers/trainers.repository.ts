import { publicTrainerFields, publicReviewFields } from '../../common/security/public-trainer-fields';
import { publicCourseWhere } from '../courses/public-course-policy';
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TrainersRepository {


  constructor(private readonly prisma: PrismaService) {}



  getTrainerProfile(userId: string) {
    return this.prisma.trainers.findUnique({
      where: {
        user_id: userId,
      },

      include: {
        users: {
          select: {
            id: true,
            full_name: true,
            username: true,
            email: true,
            phone: true,
            role: true,
            profile_image: true,
            email_verified: true,
            is_active: true,
            created_at: true,
          },
        },

        specializations: true,

        trainer_certificates: true,

        trainer_documents: true,
      },
    });
  }



  async updateTrainer(trainerId: string, data: any) {
    return this.prisma.trainers.update({
      where: {
        id: trainerId,
      },
      data,
    });
  }



  async deleteTrainerCertificates(trainerId: string) {
    return this.prisma.trainer_certificates.deleteMany({
      where: {
        trainer_id: trainerId,
      },
    });
  }



  async deleteTrainerDocuments(trainerId: string) {
    return this.prisma.trainer_documents.deleteMany({
      where: {
        trainer_id: trainerId,
      },
    });
  }



  async createTrainerCertificates(trainerId: string, urls: string[]) {
    if (!urls?.length) return;

    return this.prisma.trainer_certificates.createMany({
      data: urls.map((url) => ({
        trainer_id: trainerId,
        certificate_url: url,
      })),
    });
  }



  async createTrainerDocuments(
    trainerId: string,
    documents: {
      file_name: string;
      file_url: string;
      file_type: string;
    }[],
  ) {
    if (!documents?.length) return;

    return this.prisma.trainer_documents.createMany({
      data: documents.map((doc) => ({
        trainer_id: trainerId,
        file_name: doc.file_name,
        file_url: doc.file_url,
        file_type: doc.file_type,
      })),
    });
  }



  async createProgram(data: any) {
    return this.prisma.training_programs.create({
      data,
    });
  }



  async getProgramsByTrainer(trainerId: string) {
    return this.prisma.training_programs.findMany({
      where: {
        trainer_id: trainerId,
      },

      orderBy: {
        created_at: 'desc',
      },
    });
  }



  async getProgramById(id: string) {
    return this.prisma.training_programs.findUnique({
      where: {
        id,
      },
    });
  }



  async updateProgram(id: string, data: any) {
    return this.prisma.training_programs.update({
      where: {
        id,
      },
      data,
    });
  }



  async deleteProgram(id: string) {
    return this.prisma.training_programs.delete({
      where: {
        id,
      },
    });
  }



  getTrainerStatus(userId: string) {
    return this.prisma.trainers.findUnique({
      where: {
        user_id: userId,
      },

      select: {
        trainer_status: true,
        rejection_reason: true,
        approved_at: true,
      },
    });
  }



  createAvailability(data: {
    trainer_id: string;
    day_of_week: number;
    start_time: Date;
    end_time: Date;
  }) {
    return this.prisma.trainer_availability.create({
      data,
    });
  }



  getTrainerAvailability(trainerId: string) {
    return this.prisma.trainer_availability.findMany({
      where: {
        trainer_id: trainerId,
      },

      orderBy: [
        {
          day_of_week: 'asc',
        },
      ],
    });
  }



  updateAvailability(availabilityId: string, data: any) {
    return this.prisma.trainer_availability.update({
      where: {
        id: availabilityId,
      },

      data,
    });
  }



  deleteAvailability(id: string) {
    return this.prisma.trainer_availability.delete({
      where: {
        id,
      },
    });
  }



  findAvailabilityById(id: string) {
    return this.prisma.trainer_availability.findUnique({
      where: {
        id,
      },
    });
  }



  createBooking(data: any) {
    return this.prisma.trainer_bookings.create({
      data,
    });
  }



  getTrainerBookings(trainerId: string) {
    return this.prisma.trainer_bookings.findMany({
      where: {
        trainer_id: trainerId,
      },

      include: {
        users: {
          select: {
            id: true,
            full_name: true,
            email: true,
            phone: true,
          },
        },
      },

      orderBy: {
        created_at: 'desc',
      },
    });
  }



  findBookingById(id: string) {
    return this.prisma.trainer_bookings.findUnique({
      where: {
        id,
      },

      include: {
        users: true,
        trainers: true,
      },
    });
  }



  updateBooking(id: string, data: any) {
    return this.prisma.trainer_bookings.update({
      where: {
        id,
      },

      data,
    });
  }



  async createReview(data: {
    trainer_id: string;
    student_id: string;
    rating: number;
    comment?: string;
  }) {
    return this.prisma.trainer_reviews.create({
      data,
    });
  }



  findUserById(id: string) {
    return this.prisma.users.findUnique({
      where: {
        id,
      },

      select: {
        id: true,
        role: true,
      },
    });
  }



  findReviewByTrainerAndStudent(trainerId: string, studentId: string) {
    return this.prisma.trainer_reviews.findUnique({
      where: {
        trainer_id_student_id: {
          trainer_id: trainerId,
          student_id: studentId,
        },
      },
    });
  }


  getReviewStatusForStudent(studentId: string) {
    return this.prisma.trainer_reviews.findMany({
      where: { student_id: studentId },
      select: { trainer_id: true, rating: true },
    });
  }


  updateReview(id: string, data: { rating?: number; comment?: string }) {
    return this.prisma.trainer_reviews.update({
      where: {
        id,
      },

      data,
    });
  }



  getTrainerReviews(trainerId: string) {
    return this.prisma.trainer_reviews.findMany({
      where: { trainer_id: trainerId, trainers: { trainer_status: 'APPROVED' } },
      select: publicReviewFields,
      orderBy: { created_at: 'desc' },
      take: 100,
    });
  }


  async updateTrainerRating(trainerId: string) {
    const reviews = await this.prisma.trainer_reviews.findMany({
      where: {
        trainer_id: trainerId,
      },
    });

    const ratingsCount = reviews.length;

    const averageRating =
      ratingsCount === 0
        ? 0
        : reviews.reduce((sum, item) => sum + item.rating, 0) / ratingsCount;

    await this.prisma.trainers.update({
      where: {
        id: trainerId,
      },

      data: {
        average_rating: averageRating,
        ratings_count: ratingsCount,
      },
    });

    return {
      average_rating: averageRating,
      ratings_count: ratingsCount,
    };
  }



  findTrainerById(id: string) {
    return this.prisma.trainers.findUnique({
      where: {
        id,
      },
    });
  }



  async getDashboardStats(userId: string) {
    const trainer = await this.prisma.trainers.findUnique({
      where: {
        user_id: userId,
      },
    });

    if (!trainer) {
      return null;
    }

    const [
      programsCount,
      reviewsCount,
      availabilityCount,
      recordedCoursesCount,
    ] = await Promise.all([
      this.prisma.training_programs.count({
        where: {
          trainer_id: trainer.id,
        },
      }),

      this.prisma.trainer_reviews.count({
        where: {
          trainer_id: trainer.id,
        },
      }),

      this.prisma.trainer_availability.count({
        where: {
          trainer_id: trainer.id,
        },
      }),
      this.prisma.courses.count({ where: { owner_trainer_id: trainer.id } }),
    ]);

    return {
      programs_count: programsCount + recordedCoursesCount,
      recorded_courses_count: recordedCoursesCount,

      reviews_count: reviewsCount,

      availability_count: availabilityCount,

      average_rating: trainer.average_rating,

      ratings_count: trainer.ratings_count,
    };
  }



  async updateUserProfileImage(userId: string, imageUrl: string) {
    return this.prisma.users.update({
      where: {
        id: userId,
      },

      data: {
        profile_image: imageUrl,
      },
    });
  }



  getAllPrograms() {
    return this.prisma.training_programs.findMany({
      where: {
        is_active: true,
      },

      orderBy: {
        created_at: 'desc',
      },

      include: {
        trainers: {
          select: {
            ...publicTrainerFields,
            users: {
              select: {
                id: true,
                full_name: true,
                username: true,
                profile_image: true,
              },
            },

            specializations: true,
          },
        },
      },
    });
  }



  async getAllPublicTrainers() {
    return this.prisma.trainers.findMany({
      where: {
        trainer_status: 'APPROVED',
      },

      orderBy: {
        average_rating: 'desc',
      },

      select: {
        ...publicTrainerFields,
        users: {
          select: {
            id: true,
            full_name: true,
            username: true,
            profile_image: true,
          },
        },

        specializations: true,

        trainer_certificates: true,

        _count: {
          select: {
            training_programs: true,
            trainer_reviews: true,
          },
        },
      },
    });
  }



  async getPublicTrainerProfile(slug: string) {
    return this.prisma.trainers.findFirst({
      where: {
        slug,
        trainer_status: 'APPROVED',
      },

      select: {
        ...publicTrainerFields,
        users: {
          select: {
            id: true,
            full_name: true,
            username: true,
            profile_image: true,
            created_at: true,
          },
        },

        specializations: true,

        trainer_certificates: true,
        course_instructors: {
          where: { courses: { is: publicCourseWhere } },
          select: {
            courses: {
              select: {
                id: true,
                slug: true,
                title_ar: true,
                title_en: true,
                cover_image_url: true,
                duration_minutes: true,
                level: true,
                average_rating: true,
                ratings_count: true,
              },
            },
          },
        },

        trainer_reviews: {
          select: publicReviewFields,
          orderBy: { created_at: 'desc' },
          take: 100,
        },

        training_programs: {
          where: {
            is_active: true,
          },

          orderBy: {
            created_at: 'desc',
          },
        },

        _count: {
          select: {
            training_programs: true,
            trainer_reviews: true,
            trainer_bookings: true,
          },
        },
      },
    });
  }
}
