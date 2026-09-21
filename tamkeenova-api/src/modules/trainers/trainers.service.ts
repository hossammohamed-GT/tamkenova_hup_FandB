import { Injectable, BadRequestException } from '@nestjs/common';

import { TrainersRepository } from './trainers.repository';

import { UpdateTrainerProfileDto } from './dto/update-trainer-profile.dto';

import { CreateProgramDto } from './dto/create-program.dto';

import { UpdateProgramDto } from './dto/update-program.dto';

import { CreateAvailabilityDto } from './dto/create-availability.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';

import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';

import { CreateReviewDto } from './dto/create-review.dto';
import { StorageService } from '../storage/storage.service';

import { Multer } from 'multer';

@Injectable()
export class TrainersService {

  // Initialize instance
  constructor(
    private readonly trainersRepository: TrainersRepository,
    private readonly storageService: StorageService,
  ) {}



  // Handle get my profile
  async getMyProfile(userId: string) {
    return this.trainersRepository.getTrainerProfile(userId);
  }



  // Handle update my profile
  async updateMyProfile(userId: string, dto: UpdateTrainerProfileDto) {
    const trainer = await this.trainersRepository.getTrainerProfile(userId);

    if (!trainer) {
      throw new BadRequestException('Trainer not found');
    }

    await this.trainersRepository.updateTrainer(trainer.id, {
      bio_ar: dto.bio_ar,
      bio_en: dto.bio_en,

      description_ar: dto.description_ar,
      description_en: dto.description_en,

      cover_letter: dto.cover_letter,

      linkedin_url: dto.linkedin_url,
      facebook_url: dto.facebook_url,
      website_url: dto.website_url,
      portfolio_url: dto.portfolio_url,

      consultation_price_from: dto.consultation_price_from,

      consultation_price_to: dto.consultation_price_to,

      consultation_duration: dto.consultation_duration,
    });

    if (dto.certificate_urls) {
      await this.trainersRepository.deleteTrainerCertificates(trainer.id);

      await this.trainersRepository.createTrainerCertificates(
        trainer.id,
        dto.certificate_urls,
      );
    }

    if (dto.documents) {
      await this.trainersRepository.deleteTrainerDocuments(trainer.id);

      await this.trainersRepository.createTrainerDocuments(
        trainer.id,
        dto.documents,
      );
    }

    return {
      success: true,
      message: 'Profile updated successfully',
    };
  }



  // Handle create program
  async createProgram(userId: string, dto: CreateProgramDto) {
    const trainer = await this.trainersRepository.getTrainerProfile(userId);

    if (!trainer) {
      throw new BadRequestException('Trainer not found');
    }

    const slug =
      dto.title.toLowerCase().replace(/\s+/g, '-') +
      '-' +
      Math.floor(Math.random() * 100000);

    return this.trainersRepository.createProgram({
      trainer_id: trainer.id,

      title: dto.title,

      slug,

      image_url: dto.image_url,

      short_description: dto.short_description,

      description: dto.description,

      price: dto.price,

      discount_price: dto.discount_price || null,

      duration_hours: dto.duration_hours || 0,

      level: dto.level || 'BEGINNER',
    });
  }



  // Handle get my programs
  async getMyPrograms(userId: string) {
    const trainer = await this.trainersRepository.getTrainerProfile(userId);

    if (!trainer) {
      throw new BadRequestException('Trainer not found');
    }

    return this.trainersRepository.getProgramsByTrainer(trainer.id);
  }



  // Handle update program
  async updateProgram(
    userId: string,
    programId: string,
    dto: UpdateProgramDto,
  ) {
    const trainer = await this.trainersRepository.getTrainerProfile(userId);

    if (!trainer) {
      throw new BadRequestException('Trainer not found');
    }

    const program = await this.trainersRepository.getProgramById(programId);

    if (!program) {
      throw new BadRequestException('Program not found');
    }

    if (program.trainer_id !== trainer.id) {
      throw new BadRequestException('Unauthorized');
    }

    return this.trainersRepository.updateProgram(programId, dto);
  }



  // Handle delete program
  async deleteProgram(userId: string, programId: string) {
    const trainer = await this.trainersRepository.getTrainerProfile(userId);

    if (!trainer) {
      throw new BadRequestException('Trainer not found');
    }

    const program = await this.trainersRepository.getProgramById(programId);

    if (!program) {
      throw new BadRequestException('Program not found');
    }

    if (program.trainer_id !== trainer.id) {
      throw new BadRequestException('Unauthorized');
    }

    await this.trainersRepository.deleteProgram(programId);

    return {
      success: true,
      message: 'Program deleted successfully',
    };
  }



  // Handle get application status
  async getApplicationStatus(userId: string) {
    const trainer = await this.trainersRepository.getTrainerStatus(userId);

    if (!trainer) {
      throw new BadRequestException('Trainer not found');
    }

    return {
      success: true,

      data: {
        status: trainer.trainer_status,

        reason: trainer.rejection_reason,

        approved_at: trainer.approved_at,
      },
    };
  }



  // Handle create availability
  async createAvailability(userId: string, dto: CreateAvailabilityDto) {
    const trainer = await this.trainersRepository.getTrainerProfile(userId);

    if (!trainer) {
      throw new BadRequestException('Trainer not found');
    }

    return this.trainersRepository.createAvailability({
      trainer_id: trainer.id,

      day_of_week: dto.day_of_week,

      start_time: new Date(`1970-01-01T${dto.start_time}`),

      end_time: new Date(`1970-01-01T${dto.end_time}`),
    });
  }



  // Handle get availability
  async getAvailability(userId: string) {
    const trainer = await this.trainersRepository.getTrainerProfile(userId);

    if (!trainer) {
      throw new BadRequestException('Trainer not found');
    }

    return this.trainersRepository.getTrainerAvailability(trainer.id);
  }



  // Handle update availability
  async updateAvailability(
    userId: string,
    availabilityId: string,
    dto: UpdateAvailabilityDto,
  ) {
    const trainer = await this.trainersRepository.getTrainerProfile(userId);

    if (!trainer) {
      throw new BadRequestException('Trainer not found');
    }

    const availability =
      await this.trainersRepository.findAvailabilityById(availabilityId);

    if (!availability) {
      throw new BadRequestException('Availability not found');
    }

    if (availability.trainer_id !== trainer.id) {
      throw new BadRequestException('Unauthorized');
    }

    return this.trainersRepository.updateAvailability(availabilityId, {
      ...(dto.day_of_week !== undefined && {
        day_of_week: dto.day_of_week,
      }),

      ...(dto.start_time && {
        start_time: new Date(`1970-01-01T${dto.start_time}`),
      }),

      ...(dto.end_time && {
        end_time: new Date(`1970-01-01T${dto.end_time}`),
      }),
    });
  }



  // Handle delete availability
  async deleteAvailability(userId: string, availabilityId: string) {
    const trainer = await this.trainersRepository.getTrainerProfile(userId);

    if (!trainer) {
      throw new BadRequestException('Trainer not found');
    }

    const availability =
      await this.trainersRepository.findAvailabilityById(availabilityId);

    if (!availability) {
      throw new BadRequestException('Availability not found');
    }

    if (availability.trainer_id !== trainer.id) {
      throw new BadRequestException('Unauthorized');
    }

    await this.trainersRepository.deleteAvailability(availabilityId);

    return {
      success: true,
      message: 'Availability deleted successfully',
    };
  }



  // Handle get bookings
  async getBookings(userId: string) {
    const trainer = await this.trainersRepository.getTrainerProfile(userId);

    if (!trainer) {
      throw new BadRequestException('Trainer not found');
    }

    return this.trainersRepository.getTrainerBookings(trainer.id);
  }



  // Handle get booking details
  async getBookingDetails(userId: string, bookingId: string) {
    const trainer = await this.trainersRepository.getTrainerProfile(userId);

    if (!trainer) {
      throw new BadRequestException('Trainer not found');
    }

    const booking = await this.trainersRepository.findBookingById(bookingId);

    if (!booking) {
      throw new BadRequestException('Booking not found');
    }

    if (booking.trainer_id !== trainer.id) {
      throw new BadRequestException('Unauthorized');
    }

    return booking;
  }



  // Handle update booking status
  async updateBookingStatus(
    userId: string,
    bookingId: string,
    dto: UpdateBookingStatusDto,
  ) {
    const trainer = await this.trainersRepository.getTrainerProfile(userId);

    if (!trainer) {
      throw new BadRequestException('Trainer not found');
    }

    const booking = await this.trainersRepository.findBookingById(bookingId);

    if (!booking) {
      throw new BadRequestException('Booking not found');
    }

    if (booking.trainer_id !== trainer.id) {
      throw new BadRequestException('Unauthorized');
    }

    return this.trainersRepository.updateBooking(bookingId, {
      status: dto.status,

      trainer_notes: dto.trainer_notes,
    });
  }



  // Handle create review
  async createReview(userId: string, trainerId: string, dto: CreateReviewDto) {
    const trainer = await this.trainersRepository.findTrainerById(trainerId);

    if (!trainer) {
      throw new BadRequestException('Trainer not found');
    }

    await this.trainersRepository.createReview({
      trainer_id: trainerId,
      student_id: userId,
      rating: dto.rating,
      comment: dto.comment,
    });

    await this.trainersRepository.updateTrainerRating(trainerId);

    return {
      success: true,
      message: 'Review added successfully',
    };
  }



  // Handle get trainer reviews
  async getTrainerReviews(trainerId: string) {
    return this.trainersRepository.getTrainerReviews(trainerId);
  }



  // Handle get dashboard stats
  async getDashboardStats(userId: string) {
    const stats = await this.trainersRepository.getDashboardStats(userId);

    if (!stats) {
      throw new BadRequestException('Trainer not found');
    }

    return {
      success: true,
      data: stats,
    };
  }



  // Handle upload profile image
  async uploadProfileImage(userId: string, file: Express.Multer.File) {
    const trainer = await this.trainersRepository.getTrainerProfile(userId);

    if (!trainer) {
      throw new BadRequestException('Trainer not found');
    }

    const uploaded = await this.storageService.uploadFile(
      'profile-images',
      file.originalname,
      file.buffer,
      file.mimetype,
    );

    await this.trainersRepository.updateUserProfileImage(userId, uploaded.url);

    return {
      success: true,
      image_url: uploaded.url,
    };
  }



  // Handle get all programs
  async getAllPrograms() {
    const programs = await this.trainersRepository.getAllPrograms();

    return {
      success: true,
      count: programs.length,
      data: programs,
    };
  }


  // Handle get all public trainers
  async getAllPublicTrainers() {
    const trainers = await this.trainersRepository.getAllPublicTrainers();

    return {
      success: true,
      count: trainers.length,
      data: trainers,
    };
  }


  // Handle get public trainer profile
  async getPublicTrainerProfile(slug: string) {
    const trainer = await this.trainersRepository.getPublicTrainerProfile(slug);

    if (!trainer) {
      throw new BadRequestException('Trainer not found');
    }

    return {
      success: true,
      data: trainer,
    };
  }
}
