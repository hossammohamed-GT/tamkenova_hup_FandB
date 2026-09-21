import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TrainersRepository {

  // Initialize instance
  constructor(private readonly prisma: PrismaService) {}


  // Handle get trainer profile
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


  // Handle update trainer
  async updateTrainer(trainerId: string, data: any) {
    return this.prisma.trainers.update({
      where: {
        id: trainerId,
      },
      data,
    });
  }


  // Handle delete trainer certificates
  async deleteTrainerCertificates(trainerId: string) {
    return this.prisma.trainer_certificates.deleteMany({
      where: {
        trainer_id: trainerId,
      },
    });
  }


  // Handle delete trainer documents
  async deleteTrainerDocuments(trainerId: string) {
    return this.prisma.trainer_documents.deleteMany({
      where: {
        trainer_id: trainerId,
      },
    });
  }


  // Handle create trainer certificates
  async createTrainerCertificates(trainerId: string, urls: string[]) {
    if (!urls?.length) return;

    return this.prisma.trainer_certificates.createMany({
      data: urls.map((url) => ({
        trainer_id: trainerId,
        certificate_url: url,
      })),
    });
  }


  // Handle create trainer documents
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


  // Handle create program
  async createProgram(data: any) {
    return this.prisma.training_programs.create({
      data,
    });
  }


  // Handle get programs by trainer
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


  // Handle get program by id
  async getProgramById(id: string) {
    return this.prisma.training_programs.findUnique({
      where: {
        id,
      },
    });
  }


  // Handle update program
  async updateProgram(id: string, data: any) {
    return this.prisma.training_programs.update({
      where: {
        id,
      },
      data,
    });
  }


  // Handle delete program
  async deleteProgram(id: string) {
    return this.prisma.training_programs.delete({
      where: {
        id,
      },
    });
  }


  // Handle get trainer status
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


  // Handle create availability
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


  // Handle get trainer availability
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


  // Handle update availability
  updateAvailability(availabilityId: string, data: any) {
    return this.prisma.trainer_availability.update({
      where: {
        id: availabilityId,
      },

      data,
    });
  }


  // Handle delete availability
  deleteAvailability(id: string) {
    return this.prisma.trainer_availability.delete({
      where: {
        id,
      },
    });
  }


  // Handle find availability by id
  findAvailabilityById(id: string) {
    return this.prisma.trainer_availability.findUnique({
      where: {
        id,
      },
    });
  }


  // Handle create booking
  createBooking(data: any) {
    return this.prisma.trainer_bookings.create({
      data,
    });
  }


  // Handle get trainer bookings
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


  // Handle find booking by id
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


  // Handle update booking
  updateBooking(id: string, data: any) {
    return this.prisma.trainer_bookings.update({
      where: {
        id,
      },

      data,
    });
  }


  // Handle create review
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


  // Handle get trainer reviews
  getTrainerReviews(trainerId: string) {
    return this.prisma.trainer_reviews.findMany({
      where: {
        trainer_id: trainerId,
      },

      include: {
        users: {
          select: {
            id: true,
            full_name: true,
            profile_image: true,
          },
        },
      },

      orderBy: {
        created_at: 'desc',
      },
    });
  }


  // Handle update trainer rating
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
  }


  // Handle find trainer by id
  findTrainerById(id: string) {
    return this.prisma.trainers.findUnique({
      where: {
        id,
      },
    });
  }


  // Handle get dashboard stats
  async getDashboardStats(userId: string) {
    const trainer = await this.prisma.trainers.findUnique({
      where: {
        user_id: userId,
      },
    });

    if (!trainer) {
      return null;
    }

    const [programsCount, reviewsCount, availabilityCount] = await Promise.all([
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
    ]);

    return {
      programs_count: programsCount,

      reviews_count: reviewsCount,

      availability_count: availabilityCount,

      average_rating: trainer.average_rating,

      ratings_count: trainer.ratings_count,
    };
  }


  // Handle update user profile image
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


  // Handle get all programs
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
          include: {
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


  // Handle get all public trainers
  async getAllPublicTrainers() {
    return this.prisma.trainers.findMany({
      where: {
        trainer_status: 'APPROVED',
      },

      orderBy: {
        average_rating: 'desc',
      },

      include: {
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


  // Handle get public trainer profile
  async getPublicTrainerProfile(slug: string) {
    return this.prisma.trainers.findFirst({
      where: {
        slug,
        trainer_status: 'APPROVED',
      },

      include: {
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

        trainer_reviews: {
          include: {
            users: {
              select: {
                full_name: true,
                profile_image: true,
              },
            },
          },

          orderBy: {
            created_at: 'desc',
          },
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
