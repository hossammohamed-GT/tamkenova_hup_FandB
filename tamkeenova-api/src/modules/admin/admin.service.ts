import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';

import { AdminRepository } from './admin.repository';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import { StorageService } from '../storage/storage.service';

import { ChangeRoleDto } from './dto/change-role.dto';
import { SetUserActiveDto } from './dto/set-user-active.dto';
import { RejectReasonDto } from './dto/reject-reason.dto';
import { TrainerCertificateDto } from './dto/trainer-certificate.dto';
import { TrainerDocumentDto } from './dto/trainer-document.dto';
import { UpdateTrainerAdminDto } from './dto/update-trainer-admin.dto';
import { IssueCertificateDto } from './dto/issue-certificate.dto';
import { UpdateCertificateDto } from './dto/update-certificate.dto';
import { CorporateStatusDto } from './dto/corporate-status.dto';
import { SpecializationDto } from './dto/specialization.dto';


@Injectable()
export class AdminService {

  // Initialize instance
  constructor(
    private readonly adminRepo: AdminRepository,
    private readonly mailService: MailService,
    private readonly notificationsService: NotificationsService,
    private readonly storageService: StorageService,
  ) {}




  // Handle list users
  async listUsers(query: {
    search?: string;
    role?: string;
    is_active?: string;
    page?: string;
    limit?: string;
  }) {
    const page = Math.max(parseInt(query.page || '1', 10), 1);
    const limit = Math.min(parseInt(query.limit || '20', 10), 100);
    const skip = (page - 1) * limit;

    const isActive =
      query.is_active === undefined || query.is_active === ''
        ? undefined
        : query.is_active === 'true';

    const { data, total } = await this.adminRepo.getUsers({
      search: query.search,
      role: query.role,
      is_active: isActive,
      skip,
      take: limit,
    });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }


  // Handle get user
  async getUser(id: string) {
    const user = await this.adminRepo.getUserById(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }


  // Handle change user role
  async changeUserRole(adminId: string, id: string, dto: ChangeRoleDto) {
    const user = await this.adminRepo.getUserById(id);
    if (!user) throw new NotFoundException('User not found');

    const updated = await this.adminRepo.updateUserRole(id, dto.role);


    if (dto.role === 'VOLUNTEER') {
      const existing = await this.adminRepo.getVolunteerByUserId(id);
      if (!existing) {
        await this.adminRepo.createVolunteerProfile(id);
      }
    }

    await this.adminRepo.logActivity({
      user_id: id,
      action: 'ROLE_CHANGED',
      entity_type: 'USER',
      entity_id: id,
      details: `Role changed from ${user.role} to ${dto.role} by admin`,
    });

    return {
      success: true,
      message: 'User role updated successfully',
      user: updated,
    };
  }


  // Handle set user active
  async setUserActive(adminId: string, id: string, dto: SetUserActiveDto) {
    const user = await this.adminRepo.getUserById(id);
    if (!user) throw new NotFoundException('User not found');

    const updated = await this.adminRepo.updateUserActive(id, dto.is_active);

    await this.adminRepo.logActivity({
      user_id: id,
      action: dto.is_active ? 'ACCOUNT_ACTIVATED' : 'ACCOUNT_DEACTIVATED',
      entity_type: 'USER',
      entity_id: id,
      details: `Account ${dto.is_active ? 'activated' : 'deactivated'} by admin`,
    });

    return {
      success: true,
      message: dto.is_active
        ? 'User account activated'
        : 'User account deactivated',
      user: updated,
    };
  }


  // Handle get user activity
  async getUserActivity(id: string) {
    const user = await this.adminRepo.getUserById(id);
    if (!user) throw new NotFoundException('User not found');

    const logs = await this.adminRepo.getUserActivity(id);
    return { data: logs, total: logs.length };
  }




  // Handle list trainers
  async listTrainers(status?: string) {
    const trainers = await this.adminRepo.getTrainers(status);
    return { data: trainers, total: trainers.length };
  }


  // Handle get trainer
  async getTrainer(id: string) {
    const trainer = await this.adminRepo.getTrainerById(id);
    if (!trainer) throw new NotFoundException('Trainer not found');
    return trainer;
  }


  // Handle approve trainer
  async approveTrainer(adminId: string, id: string) {
    const trainer = await this.adminRepo.getTrainerById(id);
    if (!trainer) throw new NotFoundException('Trainer not found');

    const updated = await this.adminRepo.approveTrainer(id, adminId);

    await this.notifyUser(
      trainer.user_id,
      'تم اعتماد حسابك كمدرب',
      'تم قبول طلب انضمامك كمدرب في TamkeeNova HUB.',
      'TRAINER_APPROVED',
      id,
      'TRAINER',
    );

    try {
      if (trainer.users?.email) {
        await this.mailService.sendTrainerApprovedEmail(
          trainer.users.email,
          trainer.users.full_name,
        );
      }
    } catch (e) {
      console.error('Failed to send trainer approval email', e);
    }

    await this.adminRepo.logActivity({
      user_id: trainer.user_id,
      action: 'TRAINER_APPROVED',
      entity_type: 'TRAINER',
      entity_id: id,
      details: 'Trainer application approved by admin',
    });

    return { success: true, message: 'Trainer approved successfully', trainer: updated };
  }


  // Handle reject trainer
  async rejectTrainer(adminId: string, id: string, dto: RejectReasonDto) {
    const trainer = await this.adminRepo.getTrainerById(id);
    if (!trainer) throw new NotFoundException('Trainer not found');

    const updated = await this.adminRepo.rejectTrainer(id, adminId, dto.reason);

    await this.notifyUser(
      trainer.user_id,
      'تم رفض طلب الانضمام كمدرب',
      `سبب الرفض: ${dto.reason}`,
      'TRAINER_REJECTED',
      id,
      'TRAINER',
    );

    try {
      if (trainer.users?.email) {
        await this.mailService.sendTrainerRejectedEmail(
          trainer.users.email,
          dto.reason,
        );
      }
    } catch (e) {
      console.error('Failed to send trainer rejection email', e);
    }

    await this.adminRepo.logActivity({
      user_id: trainer.user_id,
      action: 'TRAINER_REJECTED',
      entity_type: 'TRAINER',
      entity_id: id,
      details: `Trainer application rejected: ${dto.reason}`,
    });

    return { success: true, message: 'Trainer rejected', trainer: updated };
  }


  // Handle suspend trainer
  async suspendTrainer(adminId: string, id: string) {
    const trainer = await this.adminRepo.getTrainerById(id);
    if (!trainer) throw new NotFoundException('Trainer not found');

    const updated = await this.adminRepo.suspendTrainer(id);

    await this.notifyUser(
      trainer.user_id,
      'تم تعليق حسابك',
      'تم تعليق حسابك كمدرب مؤقتًا. تواصل مع الإدارة لمزيد من التفاصيل.',
      'TRAINER_SUSPENDED',
      id,
      'TRAINER',
    );

    await this.adminRepo.logActivity({
      user_id: trainer.user_id,
      action: 'TRAINER_SUSPENDED',
      entity_type: 'TRAINER',
      entity_id: id,
    });

    return { success: true, message: 'Trainer suspended', trainer: updated };
  }


  // Handle activate trainer
  async activateTrainer(adminId: string, id: string) {
    const trainer = await this.adminRepo.getTrainerById(id);
    if (!trainer) throw new NotFoundException('Trainer not found');

    const updated = await this.adminRepo.activateTrainer(id);

    await this.notifyUser(
      trainer.user_id,
      'تم تفعيل حسابك',
      'تم إعادة تفعيل حسابك كمدرب.',
      'TRAINER_ACTIVATED',
      id,
      'TRAINER',
    );

    await this.adminRepo.logActivity({
      user_id: trainer.user_id,
      action: 'TRAINER_ACTIVATED',
      entity_type: 'TRAINER',
      entity_id: id,
    });

    return { success: true, message: 'Trainer activated', trainer: updated };
  }


  // Handle update trainer
  async updateTrainer(adminId: string, id: string, dto: UpdateTrainerAdminDto) {
    const trainer = await this.adminRepo.getTrainerById(id);
    if (!trainer) throw new NotFoundException('Trainer not found');

    const updated = await this.adminRepo.updateTrainer(id, dto);

    await this.adminRepo.logActivity({
      user_id: trainer.user_id,
      action: 'TRAINER_UPDATED',
      entity_type: 'TRAINER',
      entity_id: id,
    });

    return { success: true, message: 'Trainer updated successfully', trainer: updated };
  }


  // Handle add trainer certificate
  async addTrainerCertificate(
    adminId: string,
    trainerId: string,
    dto: TrainerCertificateDto,
  ) {
    const trainer = await this.adminRepo.getTrainerById(trainerId);
    if (!trainer) throw new NotFoundException('Trainer not found');

    const certificate = await this.adminRepo.addTrainerCertificate(trainerId, {
      title: dto.title || null,
      certificate_url: dto.certificate_url,
    });

    await this.adminRepo.logActivity({
      user_id: trainer.user_id,
      action: 'TRAINER_CERTIFICATE_ADDED',
      entity_type: 'TRAINER',
      entity_id: trainerId,
    });

    return { success: true, message: 'Trainer certificate added', certificate };
  }


  // Handle delete trainer certificate
  async deleteTrainerCertificate(id: string) {
    await this.adminRepo.deleteTrainerCertificate(id);
    return { success: true, message: 'Trainer certificate deleted' };
  }


  // Handle add trainer document
  async addTrainerDocument(
    adminId: string,
    trainerId: string,
    dto: TrainerDocumentDto,
  ) {
    const trainer = await this.adminRepo.getTrainerById(trainerId);
    if (!trainer) throw new NotFoundException('Trainer not found');

    const document = await this.adminRepo.addTrainerDocument(trainerId, dto);

    await this.adminRepo.logActivity({
      user_id: trainer.user_id,
      action: 'TRAINER_DOCUMENT_ADDED',
      entity_type: 'TRAINER',
      entity_id: trainerId,
    });

    return { success: true, message: 'Trainer document added', document };
  }


  // Handle delete trainer document
  async deleteTrainerDocument(id: string) {
    await this.adminRepo.deleteTrainerDocument(id);
    return { success: true, message: 'Trainer document deleted' };
  }




  // Handle list volunteers
  async listVolunteers(status?: string) {
    const volunteers = await this.adminRepo.getVolunteers(status);
    return { data: volunteers, total: volunteers.length };
  }


  // Handle get volunteer
  async getVolunteer(id: string) {
    const volunteer = await this.adminRepo.getVolunteerById(id);
    if (!volunteer) throw new NotFoundException('Volunteer not found');
    return volunteer;
  }


  // Handle approve volunteer
  async approveVolunteer(adminId: string, id: string) {
    const volunteer = await this.adminRepo.getVolunteerById(id);
    if (!volunteer) throw new NotFoundException('Volunteer not found');

    const updated = await this.adminRepo.approveVolunteer(id, adminId);

    await this.notifyUser(
      volunteer.user_id,
      'تم قبول طلب التطوع',
      'تم قبول طلب انضمامك كمتطوع في TamkeeNova HUB.',
      'VOLUNTEER_APPROVED',
      id,
      'VOLUNTEER',
    );

    try {
      if (volunteer.users?.email) {
        await this.mailService.sendVolunteerApprovedEmail(
          volunteer.users.email,
          volunteer.users.full_name,
        );
      }
    } catch (e) {
      console.error('Failed to send volunteer approval email', e);
    }

    await this.adminRepo.logActivity({
      user_id: volunteer.user_id,
      action: 'VOLUNTEER_APPROVED',
      entity_type: 'VOLUNTEER',
      entity_id: id,
    });

    return { success: true, message: 'Volunteer approved successfully', volunteer: updated };
  }


  // Handle reject volunteer
  async rejectVolunteer(adminId: string, id: string, dto: RejectReasonDto) {
    const volunteer = await this.adminRepo.getVolunteerById(id);
    if (!volunteer) throw new NotFoundException('Volunteer not found');

    const updated = await this.adminRepo.rejectVolunteer(id, adminId, dto.reason);

    await this.notifyUser(
      volunteer.user_id,
      'تم رفض طلب التطوع',
      `سبب الرفض: ${dto.reason}`,
      'VOLUNTEER_REJECTED',
      id,
      'VOLUNTEER',
    );

    try {
      if (volunteer.users?.email) {
        await this.mailService.sendVolunteerRejectedEmail(
          volunteer.users.email,
          dto.reason,
        );
      }
    } catch (e) {
      console.error('Failed to send volunteer rejection email', e);
    }

    await this.adminRepo.logActivity({
      user_id: volunteer.user_id,
      action: 'VOLUNTEER_REJECTED',
      entity_type: 'VOLUNTEER',
      entity_id: id,
      details: `Volunteer application rejected: ${dto.reason}`,
    });

    return { success: true, message: 'Volunteer rejected', volunteer: updated };
  }




  // Handle list certificates
  async listCertificates() {
    const certificates = await this.adminRepo.getCertificates();
    return { data: certificates, total: certificates.length };
  }


  // Handle issue certificate
  async issueCertificate(adminId: string, dto: IssueCertificateDto) {
    const holder = await this.adminRepo.getUserById(dto.user_id);
    if (!holder) throw new NotFoundException('User not found');

    const verificationCode = this.generateVerificationCode();
    const qrCodeUrl = this.generateQrCode(verificationCode);

    const certificate = await this.adminRepo.createCertificate({
      student_id: dto.user_id,
      trainer_id: dto.trainer_id || null,
      program_id: dto.program_id || null,
      verification_code: verificationCode,
      title: dto.title,
      description: dto.description || null,
      training_hours: dto.training_hours || 0,
      certificate_type: dto.certificate_type || 'OTHER',
      qr_code_url: qrCodeUrl,
    });

    await this.notifyUser(
      dto.user_id,
      'شهادة جديدة',
      `تم إصدار شهادة "${dto.title}" لك.`,
      'CERTIFICATE_ISSUED',
      certificate.id,
      'CERTIFICATE',
    );

    try {
      if (holder.email) {
        await this.mailService.sendCertificateIssuedEmail(
          holder.email,
          holder.full_name,
          dto.title,
          verificationCode,
        );
      }
    } catch (e) {
      console.error('Failed to send certificate email', e);
    }

    await this.adminRepo.logActivity({
      user_id: dto.user_id,
      action: 'CERTIFICATE_ISSUED',
      entity_type: 'CERTIFICATE',
      entity_id: certificate.id,
      details: `Issued certificate "${dto.title}"`,
    });

    return { success: true, message: 'Certificate issued successfully', certificate };
  }


  // Handle update certificate
  async updateCertificate(id: string, dto: UpdateCertificateDto) {
    const existing = await this.adminRepo.getCertificateById(id);
    if (!existing) throw new NotFoundException('Certificate not found');

    const updated = await this.adminRepo.updateCertificate(id, dto);
    return { success: true, message: 'Certificate updated', certificate: updated };
  }


  // Handle revoke certificate
  async revokeCertificate(id: string) {
    const existing = await this.adminRepo.getCertificateById(id);
    if (!existing) throw new NotFoundException('Certificate not found');

    const updated = await this.adminRepo.revokeCertificate(id);

    await this.adminRepo.logActivity({
      user_id: existing.student_id,
      action: 'CERTIFICATE_REVOKED',
      entity_type: 'CERTIFICATE',
      entity_id: id,
    });

    return { success: true, message: 'Certificate revoked', certificate: updated };
  }


  // Handle delete certificate
  async deleteCertificate(id: string) {
    const existing = await this.adminRepo.getCertificateById(id);
    if (!existing) throw new NotFoundException('Certificate not found');

    await this.adminRepo.deleteCertificate(id);

    await this.adminRepo.logActivity({
      user_id: existing.student_id,
      action: 'CERTIFICATE_DELETED',
      entity_type: 'CERTIFICATE',
      entity_id: id,
    });

    return { success: true, message: 'Certificate deleted' };
  }


  // Handle upload certificate pdf
  async uploadCertificatePdf(id: string, file: Express.Multer.File) {
    const existing = await this.adminRepo.getCertificateById(id);
    if (!existing) throw new NotFoundException('Certificate not found');

    if (!file) throw new BadRequestException('No file provided');

    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Only PDF files are allowed');
    }

    if (file.size > 10 * 1024 * 1024) {
      throw new BadRequestException('File size must not exceed 10MB');
    }

    const result = await this.storageService.uploadFile(
      'certificates',
      file.originalname,
      file.buffer,
      file.mimetype,
    );

    const updated = await this.adminRepo.updateCertificate(id, {
      pdf_url: result.url,
    });

    return { success: true, message: 'Certificate PDF uploaded', certificate: updated };
  }




  // Handle list corporate requests
  async listCorporateRequests(status?: string) {
    const requests = await this.adminRepo.getCorporateRequests(status);
    return { data: requests, total: requests.length };
  }


  // Handle get corporate request
  async getCorporateRequest(id: string) {
    const request = await this.adminRepo.getCorporateRequestById(id);
    if (!request) throw new NotFoundException('Corporate request not found');
    return request;
  }


  // Handle update corporate request status
  async updateCorporateRequestStatus(
    adminId: string,
    id: string,
    dto: CorporateStatusDto,
  ) {
    const request = await this.adminRepo.getCorporateRequestById(id);
    if (!request) throw new NotFoundException('Corporate request not found');

    const data: any = {
      status: dto.action,
      admin_notes: dto.admin_notes ?? request.admin_notes,
      rejection_reason:
        dto.action === 'REJECTED'
          ? dto.reason || request.rejection_reason
          : null,
    };

    if (dto.action === 'ASSIGNED') {
      if (!dto.assigned_to) {
        throw new BadRequestException(
          'assigned_to (employee id) is required when action is ASSIGNED',
        );
      }
      data.assigned_to = dto.assigned_to;
    }

    const updated = await this.adminRepo.updateCorporateRequest(id, data);


    await this.notifyUser(
      request.requester_id,
      'تحديث على طلب الشركة',
      `تم تحديث حالة طلب شركة "${request.company_name}" إلى ${dto.action}.`,
      'CORPORATE_REQUEST_UPDATED',
      id,
      'CORPORATE_REQUEST',
    );


    if (data.assigned_to) {
      await this.notifyUser(
        data.assigned_to,
        'طلب شركة جديد مسند إليك',
        `تم إسناد طلب شركة "${request.company_name}" إليك للمتابعة.`,
        'CORPORATE_REQUEST_ASSIGNED',
        id,
        'CORPORATE_REQUEST',
      );
    }

    await this.adminRepo.logActivity({
      user_id: request.requester_id,
      action: 'CORPORATE_REQUEST_UPDATED',
      entity_type: 'CORPORATE_REQUEST',
      entity_id: id,
      details: `Status changed to ${dto.action}`,
    });

    return { success: true, message: 'Corporate request updated', request: updated };
  }




  // Handle list specialization requests
  async listSpecializationRequests() {
    const requests = await this.adminRepo.getSpecializationRequests();
    return { data: requests, total: requests.length };
  }


  // Handle approve specialization request
  async approveSpecializationRequest(adminId: string, id: string) {
    const request = await this.adminRepo.getSpecializationRequestById(id);
    if (!request) throw new NotFoundException('Specialization request not found');

    const existing = await this.adminRepo.findSpecializationByName(request.name_ar);
    if (existing) {
      throw new BadRequestException('Specialization already exists');
    }

    const specialization = await this.adminRepo.createSpecialization({
      name_ar: request.name_ar,
      name_en: request.name_en || request.name_ar,
    });

    await this.adminRepo.markSpecializationRequest(id, 'APPROVED');

    await this.notifyUser(
      request.user_id,
      'تم قبول التخصص المقترح',
      `تم إضافة تخصص "${request.name_ar}" إلى المنصة.`,
      'SPECIALIZATION_APPROVED',
      specialization.id,
      'SPECIALIZATION',
    );

    await this.adminRepo.logActivity({
      user_id: request.user_id,
      action: 'SPECIALIZATION_APPROVED',
      entity_type: 'SPECIALIZATION',
      entity_id: specialization.id,
    });

    return { success: true, message: 'Specialization request approved', specialization };
  }


  // Handle reject specialization request
  async rejectSpecializationRequest(adminId: string, id: string) {
    const request = await this.adminRepo.getSpecializationRequestById(id);
    if (!request) throw new NotFoundException('Specialization request not found');

    await this.adminRepo.markSpecializationRequest(id, 'REJECTED');

    await this.notifyUser(
      request.user_id,
      'تم رفض التخصص المقترح',
      `تم رفض اقتراح التخصص "${request.name_ar}".`,
      'SPECIALIZATION_REJECTED',
      id,
      'SPECIALIZATION',
    );

    return { success: true, message: 'Specialization request rejected' };
  }


  // Handle create specialization
  async createSpecialization(adminId: string, dto: SpecializationDto) {
    const existing = await this.adminRepo.findSpecializationByName(dto.name_ar);
    if (existing) throw new BadRequestException('Specialization already exists');

    const specialization = await this.adminRepo.createSpecialization(dto);

    await this.adminRepo.logActivity({
      user_id: adminId,
      action: 'SPECIALIZATION_CREATED',
      entity_type: 'SPECIALIZATION',
      entity_id: specialization.id,
    });

    return { success: true, message: 'Specialization created', specialization };
  }


  // Handle update specialization
  async updateSpecialization(
    adminId: string,
    id: string,
    dto: SpecializationDto,
  ) {
    const existing = await this.adminRepo.getSpecializationById(id);
    if (!existing) throw new NotFoundException('Specialization not found');

    const updated = await this.adminRepo.updateSpecialization(id, dto);

    await this.adminRepo.logActivity({
      user_id: adminId,
      action: 'SPECIALIZATION_UPDATED',
      entity_type: 'SPECIALIZATION',
      entity_id: id,
    });

    return { success: true, message: 'Specialization updated', specialization: updated };
  }


  // Handle delete specialization
  async deleteSpecialization(adminId: string, id: string) {
    const existing = await this.adminRepo.getSpecializationById(id);
    if (!existing) throw new NotFoundException('Specialization not found');

    await this.adminRepo.deleteSpecialization(id);

    await this.adminRepo.logActivity({
      user_id: adminId,
      action: 'SPECIALIZATION_DELETED',
      entity_type: 'SPECIALIZATION',
      entity_id: id,
    });

    return { success: true, message: 'Specialization deleted' };
  }




  // Handle list programs
  async listPrograms() {
    const programs = await this.adminRepo.getPrograms();
    return { data: programs, total: programs.length };
  }


  // Handle update program
  async updateProgram(adminId: string, id: string, dto: any) {
    const program = await this.adminRepo.getProgramById(id);
    if (!program) throw new NotFoundException('Program not found');

    const updated = await this.adminRepo.updateProgram(id, dto);

    await this.adminRepo.logActivity({
      user_id: adminId,
      action: 'PROGRAM_UPDATED',
      entity_type: 'PROGRAM',
      entity_id: id,
    });

    return { success: true, message: 'Program updated', program: updated };
  }


  // Handle set program visibility
  async setProgramVisibility(adminId: string, id: string, isActive: boolean) {
    const program = await this.adminRepo.getProgramById(id);
    if (!program) throw new NotFoundException('Program not found');

    const updated = await this.adminRepo.updateProgram(id, { is_active: isActive });

    await this.adminRepo.logActivity({
      user_id: adminId,
      action: isActive ? 'PROGRAM_SHOWN' : 'PROGRAM_HIDDEN',
      entity_type: 'PROGRAM',
      entity_id: id,
    });

    return {
      success: true,
      message: isActive ? 'Program is now visible' : 'Program hidden',
      program: updated,
    };
  }


  // Handle delete program
  async deleteProgram(adminId: string, id: string) {
    const program = await this.adminRepo.getProgramById(id);
    if (!program) throw new NotFoundException('Program not found');

    await this.adminRepo.deleteProgram(id);

    await this.adminRepo.logActivity({
      user_id: adminId,
      action: 'PROGRAM_DELETED',
      entity_type: 'PROGRAM',
      entity_id: id,
    });

    return { success: true, message: 'Program deleted' };
  }




  // Handle get dashboard
  async getDashboard() {
    const stats = await this.adminRepo.getDashboardStats();
    return { success: true, data: stats };
  }




  // Handle notify user
  private async notifyUser(
    userId: string,
    title: string,
    message: string,
    type: string,
    referenceId: string,
    referenceType: string,
  ) {
    try {
      await this.notificationsService.createNotification({
        user_id: userId,
        title,
        message,
        type,
        reference_id: referenceId,
        reference_type: referenceType,
      });
    } catch (e) {
      console.error('Failed to create notification', e);
    }
  }


  // Handle generate verification code
  private generateVerificationCode() {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `TAM-${code}`;
  }


  // Handle generate qr code
  private generateQrCode(verificationCode: string): string {
    const frontendUrl =
      process.env.FRONTEND_URL || 'https://tamkeenova-hub.vercel.app';
    const verifyUrl = `${frontendUrl}/verify/${verificationCode}`;




    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(verifyUrl)}`;
  }
}
