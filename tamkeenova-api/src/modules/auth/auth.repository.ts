import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuthRepository {


  constructor(private readonly prisma: PrismaService) {}



  findUserByEmail(email: string) {
    return this.prisma.users.findUnique({
      where: { email },
    });
  }



  findUserByUsername(username: string) {
    return this.prisma.users.findUnique({
      where: { username },
    });
  }



  createUser(data: any) {
    return this.prisma.users.create({
      data,
    });
  }



  createOtp(data: {
    user_id: string;
    otp_code: string;
    expires_at: Date;
    purpose?: string;
  }) {
    return this.prisma.email_otps.create({
      data: {
        user_id: data.user_id,
        otp_code: data.otp_code,
        expires_at: data.expires_at,
        purpose: data.purpose || 'EMAIL_VERIFY',
      },
    });
  }



  invalidateOldOtps(userId: string, purpose = 'EMAIL_VERIFY') {
    return this.prisma.email_otps.updateMany({
      where: {
        user_id: userId,
        is_used: false,
        purpose,
      },
      data: {
        is_used: true,
      },
    });
  }

  getLatestOtp(email: string, purpose = 'EMAIL_VERIFY') {
    return this.prisma.email_otps.findFirst({
      where: {
        is_used: false,
        purpose,
        users: { email },
      },
      orderBy: { created_at: 'desc' },
      include: { users: true },
    });
  }

  incrementOtpAttempts(id: string) {
    return this.prisma.email_otps.updateMany({
      where: { id, is_used: false, attempt_count: { lt: 5 } },
      data: { attempt_count: { increment: 1 } },
    });
  }

  bumpTokenVersion(userId: string) {
    return this.prisma.users.update({
      where: { id: userId },
      data: { token_version: { increment: 1 } },
    });
  }

  updatePassword(userId: string, password: string) {
    return this.prisma.users.update({
      where: { id: userId },
      data: { password, token_version: { increment: 1 }, failed_login_attempts: 0, locked_until: null },
    });
  }

  recordFailedLogin(userId: string) {
    return this.prisma.$transaction(async (transaction) => {
      const user = await transaction.users.update({
        where: { id: userId },
        data: { failed_login_attempts: { increment: 1 } },
        select: { failed_login_attempts: true },
      });
      if (user.failed_login_attempts >= 5) {
        await transaction.users.update({ where: { id: userId }, data: { locked_until: new Date(Date.now() + 15 * 60 * 1000) } });
      }
    });
  }

  clearFailedLogin(userId: string) {
    return this.prisma.users.update({
      where: { id: userId },
      data: { failed_login_attempts: 0, locked_until: null },
    });
  }



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



  findUserForLogin(email: string) {
    return this.prisma.users.findUnique({
      where: {
        email,
      },
    });
  }



  markOtpUsed(id: string) {
    return this.prisma.email_otps.updateMany({
      where: { id, is_used: false, expires_at: { gt: new Date() }, attempt_count: { lt: 5 } },
      data: { is_used: true },
    });
  }


  findFirstAdmin() {
    return this.prisma.users.findFirst({
      where: {
        role: { in: ['ADMIN', 'SUPER_ADMIN'] },
        is_active: true,
      },
    });
  }



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



  async createTrainer(data: any) {
    return this.prisma.trainers.create({
      data,
    });
  }



  createVolunteer(data: {
    user_id: string;
    volunteer_status: 'PENDING' | 'APPROVED' | 'REJECTED';
    bio?: string | null;
  }) {
    return this.prisma.volunteers.create({
      data,
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



  findTrainerByUserId(userId: string) {
    return this.prisma.trainers.findUnique({
      where: {
        user_id: userId,
      },
    });
  }



  findUserByPhone(phone: string) {
    return this.prisma.users.findUnique({
      where: {
        phone,
      },
    });
  }



  async createNotification(data: { user_id: string; title: string; message: string; type?: string; reference_id?: string; reference_type?: string }) {
    return this.prisma.notifications.create({
      data: { user_id: data.user_id, title: data.title, message: data.message, type: data.type, reference_id: data.reference_id, reference_type: data.reference_type },
    });
  }

  createSpecializationRequest(data: { user_id: string; name_ar: string; name_en?: string }) {
    return this.prisma.specialization_requests.create({ data });
  }



  findSpecializationById(id: string) {
    return this.prisma.specializations.findUnique({
      where: {
        id,
      },
    });
  }



  createSpecialization(data: { name_ar: string; name_en: string }) {
    return this.prisma.specializations.create({
      data,
    });
  }
}
