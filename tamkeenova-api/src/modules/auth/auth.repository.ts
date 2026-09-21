import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuthRepository {

  // Initialize instance
  constructor(private readonly prisma: PrismaService) {}


  // Handle find user by email
  findUserByEmail(email: string) {
    return this.prisma.users.findUnique({
      where: { email },
    });
  }


  // Handle find user by username
  findUserByUsername(username: string) {
    return this.prisma.users.findUnique({
      where: { username },
    });
  }


  // Handle create user
  createUser(data: any) {
    return this.prisma.users.create({
      data,
    });
  }


  // Handle create otp
  createOtp(data: any) {
    return this.prisma.email_otps.create({
      data,
    });
  }


  // Handle invalidate old otps
  invalidateOldOtps(userId: string) {
    return this.prisma.email_otps.updateMany({
      where: {
        user_id: userId,
        is_used: false,
      },
      data: {
        is_used: true,
      },
    });
  }


  // Handle get valid otp
  getValidOtp(email: string, otp: string) {
    return this.prisma.email_otps.findFirst({
      where: {
        otp_code: otp,
        is_used: false,
        users: {
          email,
        },
      },
      include: {
        users: true,
      },
    });
  }


  // Handle verify user
  verifyUser(userId: string) {
    return this.prisma.users.update({
      where: {
        id: userId,
      },
      data: {
        email_verified: true,
      },
    });
  }


  // Handle update last login
  updateLastLogin(userId: string) {
    return this.prisma.users.update({
      where: {
        id: userId,
      },
      data: {
        last_login: new Date(),
      },
    });
  }


  // Handle find user for login
  findUserForLogin(email: string) {
    return this.prisma.users.findUnique({
      where: {
        email,
      },
    });
  }


  // Handle mark otp used
  markOtpUsed(id: string) {
    return this.prisma.email_otps.update({
      where: {
        id,
      },
      data: {
        is_used: true,
      },
    });
  }


  // Handle find first admin
  findFirstAdmin() {
    return this.prisma.users.findFirst({
      where: {
        role: 'ADMIN',
        is_active: true,
      },
    });
  }


  // Handle get pending trainers
  getPendingTrainers() {
    return this.prisma.trainers.findMany({
      where: {
        trainer_status: 'PENDING',
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
    });
  }


  // Handle approve trainer
  approveTrainer(trainerId: string, adminId: string) {
    return this.prisma.trainers.update({
      where: {
        id: trainerId,
      },

      data: {
        trainer_status: 'APPROVED',
        approved_by: adminId,
        approved_at: new Date(),
        rejection_reason: null,
      },

      include: {
        users: true,
      },
    });
  }


  // Handle reject trainer
  rejectTrainer(trainerId: string, adminId: string, reason: string) {
    return this.prisma.trainers.update({
      where: {
        id: trainerId,
      },

      data: {
        trainer_status: 'REJECTED',
        approved_by: adminId,
        rejection_reason: reason,
      },

      include: {
        users: true,
      },
    });
  }


  // Handle create trainer
  async createTrainer(data: any) {
    return this.prisma.trainers.create({
      data,
    });
  }


  // Handle create volunteer
  createVolunteer(data: {
    user_id: string;
    volunteer_status: 'PENDING' | 'APPROVED' | 'REJECTED';
    bio?: string | null;
  }) {
    return this.prisma.volunteers.create({
      data,
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


  // Handle find trainer by user id
  findTrainerByUserId(userId: string) {
    return this.prisma.trainers.findUnique({
      where: {
        user_id: userId,
      },
    });
  }


  // Handle find user by phone
  findUserByPhone(phone: string) {
    return this.prisma.users.findUnique({
      where: {
        phone,
      },
    });
  }


  // Handle create notification
  async createNotification(data: {
    user_id: string;
    title: string;
    message: string;
  }) {
    return this.prisma.notifications.create({
      data: {
        user_id: data.user_id,
        title: data.title,
        message: data.message,
      },
    });
  }


  // Handle find specialization by id
  findSpecializationById(id: string) {
    return this.prisma.specializations.findUnique({
      where: {
        id,
      },
    });
  }


  // Handle create specialization
  createSpecialization(data: { name_ar: string; name_en: string }) {
    return this.prisma.specializations.create({
      data,
    });
  }
}
