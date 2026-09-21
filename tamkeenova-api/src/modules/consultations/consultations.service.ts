import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { ConsultationsRepository } from './consultations.repository';
import { NotificationsService } from '../notifications/notifications.service';
import { MailService } from '../mail/mail.service';
import { CreateConsultationDto } from './dto/create-consultation.dto';
import {
  UpdateConsultationStatusDto,
  ConsultationStatusAction,
} from './dto/update-consultation-status.dto';
import { CreateConsultationReviewDto } from './dto/create-consultation-review.dto';
import { consultation_status } from '@prisma/client';

@Injectable()
export class ConsultationsService {

  // Initialize instance
  constructor(
    private readonly consultationsRepo: ConsultationsRepository,
    private readonly notificationsService: NotificationsService,
    private readonly mailService: MailService,
  ) {}




  // Handle create consultation
  async createConsultation(studentId: string, dto: CreateConsultationDto) {

    const consultation = await this.consultationsRepo.createConsultation({
      student_id: studentId,
      trainer_id: dto.trainer_id,
      title: dto.title,
      description: dto.description,
      preferred_date: dto.preferred_date,
      preferred_time: dto.preferred_time,
      contact_phone: dto.contact_phone,
      preferred_contact_method: dto.preferred_contact_method,
      student_notes: dto.student_notes,
    });


    const fullConsultation = await this.consultationsRepo.getConsultationById(
      consultation.id,
    );

    if (fullConsultation) {

      try {
        const trainerEmail = fullConsultation.trainers.users.email;
        const student = fullConsultation.users;

        await this.mailService.sendConsultationRequestEmail(
          trainerEmail,
          student.full_name,
          student.email,
          student.phone || '',
          dto.title,
          dto.description,
          dto.preferred_date,
          dto.preferred_time,
          student.certificates.map((c) => `${c.title} (${c.verification_code})`),
          student.whatsapp ?? undefined,
          student.bio ?? undefined,
        );
      } catch (emailError) {

        console.error('Failed to send consultation email to trainer:', emailError);
      }


      try {
        await this.notificationsService.createNotification({
          user_id: fullConsultation.trainers.user_id,
          title: 'طلب استشارة جديد',
          message: `لديك طلب استشارة جديد بعنوان: ${dto.title}`,
          type: 'CONSULTATION_REQUEST',
          reference_id: consultation.id,
          reference_type: 'CONSULTATION',
        });
      } catch (notifError) {
        console.error('Failed to send notification:', notifError);
      }
    }

    return {
      message: 'Consultation request sent successfully',
      consultation,
    };
  }




  // Handle get my consultations
  async getMyConsultations(studentId: string, status?: consultation_status) {
    const consultations = await this.consultationsRepo.getStudentConsultations(
      studentId,
      status,
    );
    return {
      data: consultations,
      total: consultations.length,
    };
  }


  // Handle get consultation details
  async getConsultationDetails(
    userId: string,
    consultationId: string,
    userRole: string,
  ) {
    const consultation = await this.consultationsRepo.getConsultationById(
      consultationId,
    );

    if (!consultation) {
      throw new NotFoundException('Consultation not found');
    }


    const isStudent = consultation.student_id === userId;
    const isTrainer = consultation.trainers.user_id === userId;

    if (!isStudent && !isTrainer && userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
      throw new ForbiddenException('You do not have access to this consultation');
    }

    return consultation;
  }




  // Handle cancel consultation
  async cancelConsultation(studentId: string, consultationId: string) {
    const consultation = await this.consultationsRepo.getConsultationById(
      consultationId,
    );

    if (!consultation) {
      throw new NotFoundException('Consultation not found');
    }

    if (consultation.student_id !== studentId) {
      throw new ForbiddenException('This consultation does not belong to you');
    }


    if (consultation.status !== 'PENDING') {
      throw new BadRequestException(
        `Cannot cancel consultation with status "${consultation.status}"`,
      );
    }

    const updated = await this.consultationsRepo.updateConsultationStatus(
      consultationId,
      'CANCELLED',
    );


    try {
      await this.notificationsService.createNotification({
        user_id: consultation.trainers.user_id,
        title: 'تم إلغاء طلب استشارة',
        message: `تم إلغاء طلب الاستشارة: ${consultation.title}`,
        type: 'CONSULTATION_CANCELLED',
        reference_id: consultationId,
        reference_type: 'CONSULTATION',
      });
    } catch (e) {
      console.error('Failed to send notification:', e);
    }

    return {
      message: 'Consultation cancelled successfully',
      consultation: updated,
    };
  }




  // Handle create review
  async createReview(
    studentId: string,
    consultationId: string,
    dto: CreateConsultationReviewDto,
  ) {
    const consultation = await this.consultationsRepo.getConsultationById(
      consultationId,
    );

    if (!consultation) {
      throw new NotFoundException('Consultation not found');
    }

    if (consultation.student_id !== studentId) {
      throw new ForbiddenException('This consultation does not belong to you');
    }

    if (consultation.status !== 'COMPLETED') {
      throw new BadRequestException('You can only review completed consultations');
    }


    const existingReview = await this.consultationsRepo.findConsultationReview(
      consultationId,
    );
    if (existingReview) {
      throw new ConflictException('You have already reviewed this consultation');
    }

    const review = await this.consultationsRepo.createReview({
      consultation_id: consultationId,
      student_id: studentId,
      rating: dto.rating,
      comment: dto.comment,
    });

    return {
      message: 'Review submitted successfully',
      review,
    };
  }




  // Handle update consultation status
  async updateConsultationStatus(
    trainerUserId: string,
    consultationId: string,
    dto: UpdateConsultationStatusDto,
  ) {
    const consultation = await this.consultationsRepo.getConsultationById(
      consultationId,
    );

    if (!consultation) {
      throw new NotFoundException('Consultation not found');
    }


    if (consultation.trainers.user_id !== trainerUserId) {
      throw new ForbiddenException('This consultation does not belong to you');
    }


    const validTransitions: Record<string, ConsultationStatusAction[]> = {
      PENDING: [ConsultationStatusAction.APPROVE, ConsultationStatusAction.REJECT],
      APPROVED: [ConsultationStatusAction.SCHEDULE, ConsultationStatusAction.CANCEL],
      SCHEDULED: [ConsultationStatusAction.COMPLETE, ConsultationStatusAction.CANCEL],
    };

    const allowed = validTransitions[consultation.status];
    if (!allowed || !allowed.includes(dto.action)) {
      throw new BadRequestException(
        `Cannot ${dto.action} consultation with status "${consultation.status}"`,
      );
    }


    const actionToStatus: Record<ConsultationStatusAction, consultation_status> = {
      [ConsultationStatusAction.APPROVE]: 'APPROVED',
      [ConsultationStatusAction.REJECT]: 'REJECTED',
      [ConsultationStatusAction.SCHEDULE]: 'SCHEDULED',
      [ConsultationStatusAction.COMPLETE]: 'COMPLETED',
      [ConsultationStatusAction.CANCEL]: 'CANCELLED',
    };

    const newStatus = actionToStatus[dto.action];

    const updated = await this.consultationsRepo.updateConsultationStatus(
      consultationId,
      newStatus,
      {
        trainer_notes: dto.trainer_notes,
        rejection_reason: dto.action === 'REJECT' ? dto.reason : undefined,
        scheduled_at: dto.action === 'SCHEDULE' ? dto.scheduled_at : undefined,
        completed_at: dto.action === 'COMPLETE' ? new Date() : undefined,
      },
    );


    const statusMessages: Record<string, string> = {
      APPROVED: 'تم قبول طلب الاستشارة',
      REJECTED: 'تم رفض طلب الاستشارة',
      SCHEDULED: 'تم تحديد موعد الاستشارة',
      COMPLETED: 'تم إكمال الاستشارة',
      CANCELLED: 'تم إلغاء الاستشارة',
    };

    try {
      await this.notificationsService.createNotification({
        user_id: consultation.student_id,
        title: statusMessages[newStatus] || 'تحديث حالة الاستشارة',
        message: `تحديث: ${consultation.title} — ${statusMessages[newStatus]}`,
        type: `CONSULTATION_${newStatus}`,
        reference_id: consultationId,
        reference_type: 'CONSULTATION',
      });
    } catch (e) {
      console.error('Failed to send notification:', e);
    }

    return {
      message: `Consultation ${dto.action.toLowerCase()} successfully`,
      consultation: updated,
    };
  }




  // Handle get trainer consultations
  async getTrainerConsultations(
    trainerUserId: string,
    status?: consultation_status,
  ) {

    const consultations = await this.consultationsRepo.getTrainerConsultations(
      trainerUserId,
      status,
    );
    return {
      data: consultations,
      total: consultations.length,
    };
  }




  // Handle get trainer reviews
  async getTrainerReviews(trainerUserId: string) {
    const reviews = await this.consultationsRepo.getTrainerConsultationReviews(
      trainerUserId,
    );
    return {
      data: reviews,
      total: reviews.length,
    };
  }
}
