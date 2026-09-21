import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { consultation_status } from '@prisma/client';

@Injectable()
export class ConsultationsRepository {

  // Initialize instance
  constructor(private readonly prisma: PrismaService) {}




  // Handle create consultation
  async createConsultation(data: {
    student_id: string;
    trainer_id: string;
    title: string;
    description: string;
    preferred_date?: string;
    preferred_time?: string;
    contact_phone?: string;
    preferred_contact_method?: string;
    student_notes?: string;
    price?: number;
  }) {
    return this.prisma.consultations.create({
      data: {
        student_id: data.student_id,
        trainer_id: data.trainer_id,
        title: data.title,
        description: data.description,
        preferred_date: data.preferred_date ? new Date(data.preferred_date) : null,
        preferred_time: data.preferred_time || null,
        contact_phone: data.contact_phone || null,
        preferred_contact_method: data.preferred_contact_method || null,
        student_notes: data.student_notes || null,
        price: data.price || null,
        status: 'PENDING',
      },
      select: {
        id: true,
        title: true,
        description: true,
        preferred_date: true,
        preferred_time: true,
        status: true,
        price: true,
        contact_phone: true,
        preferred_contact_method: true,
        student_notes: true,
        created_at: true,
        trainers: {
          select: {
            id: true,
            slug: true,
            consultation_price: true,
            users: {
              select: { full_name: true, profile_image: true },
            },
          },
        },
      },
    });
  }


  // Handle get student consultations
  async getStudentConsultations(studentId: string, status?: consultation_status) {
    const where: any = { student_id: studentId };
    if (status) where.status = status;

    return this.prisma.consultations.findMany({
      where,
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        preferred_date: true,
        preferred_time: true,
        status: true,
        price: true,
        scheduled_at: true,
        completed_at: true,
        trainer_notes: true,
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


  // Handle get consultation by id
  async getConsultationById(consultationId: string) {
    return this.prisma.consultations.findUnique({
      where: { id: consultationId },
      select: {
        id: true,
        student_id: true,
        trainer_id: true,
        title: true,
        description: true,
        preferred_date: true,
        preferred_time: true,
        status: true,
        price: true,
        trainer_notes: true,
        student_notes: true,
        scheduled_at: true,
        completed_at: true,
        contact_phone: true,
        preferred_contact_method: true,
        rejection_reason: true,
        created_at: true,
        updated_at: true,
        users: {
          select: {
            id: true,
            full_name: true,
            email: true,
            phone: true,
            profile_image: true,
            bio: true,
            whatsapp: true,
            certificates: {
              select: {
                id: true,
                title: true,
                verification_code: true,
                issued_at: true,
              },
            },
          },
        },
        trainers: {
          select: {
            id: true,
            user_id: true,
            slug: true,
            consultation_price: true,
            users: {
              select: { full_name: true, email: true, profile_image: true },
            },
            specializations: {
              select: { id: true, name_ar: true, name_en: true },
            },
          },
        },
      },
    });
  }


  // Handle update consultation status
  async updateConsultationStatus(
    consultationId: string,
    status: consultation_status,
    extraData?: {
      trainer_notes?: string;
      rejection_reason?: string;
      scheduled_at?: string;
      completed_at?: Date;
    },
  ) {
    return this.prisma.consultations.update({
      where: { id: consultationId },
      data: {
        status,
        ...(extraData?.trainer_notes && { trainer_notes: extraData.trainer_notes }),
        ...(extraData?.rejection_reason && { rejection_reason: extraData.rejection_reason }),
        ...(extraData?.scheduled_at && { scheduled_at: new Date(extraData.scheduled_at) }),
        ...(extraData?.completed_at && { completed_at: extraData.completed_at }),
        updated_at: new Date(),
      },
      select: {
        id: true,
        status: true,
        trainer_notes: true,
        rejection_reason: true,
        scheduled_at: true,
        completed_at: true,
        updated_at: true,
      },
    });
  }




  // Handle get trainer consultations
  async getTrainerConsultations(trainerId: string, status?: consultation_status) {
    const where: any = { trainer_id: trainerId };
    if (status) where.status = status;

    return this.prisma.consultations.findMany({
      where,
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        preferred_date: true,
        preferred_time: true,
        status: true,
        price: true,
        scheduled_at: true,
        completed_at: true,
        trainer_notes: true,
        student_notes: true,
        created_at: true,
        users: {
          select: {
            id: true,
            full_name: true,
            email: true,
            phone: true,
            profile_image: true,
          },
        },
      },
    });
  }




  // Handle find consultation review
  async findConsultationReview(consultationId: string) {
    return this.prisma.consultation_reviews.findUnique({
      where: { consultation_id: consultationId },
    });
  }


  // Handle create review
  async createReview(data: {
    consultation_id: string;
    student_id: string;
    rating: number;
    comment?: string;
  }) {
    return this.prisma.consultation_reviews.create({
      data: {
        consultation_id: data.consultation_id,
        student_id: data.student_id,
        rating: data.rating,
        comment: data.comment || null,
      },
      select: {
        id: true,
        rating: true,
        comment: true,
        created_at: true,
      },
    });
  }


  // Handle get trainer consultation reviews
  async getTrainerConsultationReviews(trainerId: string) {
    return this.prisma.consultation_reviews.findMany({
      where: {
        consultations: { trainer_id: trainerId },
      },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        rating: true,
        comment: true,
        created_at: true,
        consultations: {
          select: { id: true, title: true },
        },
        users: {
          select: { id: true, full_name: true, profile_image: true },
        },
      },
    });
  }
}
