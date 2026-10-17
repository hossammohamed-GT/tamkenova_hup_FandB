import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';


@Injectable()
export class AdminRepository {


  constructor(private readonly prisma: PrismaService) {}





  async getUsers(options: {
    search?: string;
    role?: string;
    is_active?: boolean;
    skip: number;
    take: number;
  }) {
    const where: any = {};

    if (options.role) where.role = options.role;
    if (options.is_active !== undefined) where.is_active = options.is_active;
    if (options.search) {
      where.OR = [
        { full_name: { contains: options.search, mode: 'insensitive' } },
        { email: { contains: options.search, mode: 'insensitive' } },
        { username: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.users.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: options.skip,
        take: options.take,
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
          last_login: true,
          created_at: true,
          total_training_hours: true,
        },
      }),
      this.prisma.users.count({ where }),
    ]);

    return { data, total };
  }



  getUserById(id: string) {
    return this.prisma.users.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            certificates: true,
            student_enrollments: true,
            task_assignees: true,
          },
        },
      },
    });
  }







  updateUserRole(id: string, role: string) {
    return this.prisma.users.update({
      where: { id },
      data: { role: role as any },
    });
  }



  updateUserActive(id: string, is_active: boolean) {
    return this.prisma.users.update({
      where: { id },
      data: is_active
        ? { is_active }
        : { is_active, token_version: { increment: 1 } },
    });
  }





  async logActivity(data: {
    user_id: string;
    action: string;
    entity_type?: string;
    entity_id?: string;
    details?: string;
  }) {
    return this.prisma.activity_logs.create({ data });
  }



  getUserActivity(userId: string) {
    return this.prisma.activity_logs.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: 200,
    });
  }





  getTrainers(status?: string) {
    return this.prisma.trainers.findMany({
      where: status ? { trainer_status: status as any } : undefined,
      orderBy: { created_at: 'desc' },
      include: {
        users: {
          select: {
            id: true,
            full_name: true,
            username: true,
            email: true,
            phone: true,
            is_active: true,
            profile_image: true,
          },
        },
        specializations: true,
        trainer_certificates: true,
        trainer_documents: true,
      },
    });
  }



  getTrainerById(id: string) {
    return this.prisma.trainers.findUnique({
      where: { id },
      include: {
        users: true,
        specializations: true,
        trainer_certificates: true,
        trainer_documents: true,
      },
    });
  }



  updateTrainer(id: string, data: any) {
    return this.prisma.trainers.update({ where: { id }, data });
  }



  approveTrainer(id: string, adminId: string) {
    return this.prisma.trainers.update({
      where: { id },
      data: {
        trainer_status: 'APPROVED',
        approved_by: adminId,
        approved_at: new Date(),
        rejection_reason: null,
      },
      include: { users: true },
    });
  }



  rejectTrainer(id: string, adminId: string, reason: string) {
    return this.prisma.trainers.update({
      where: { id },
      data: {
        trainer_status: 'REJECTED',
        approved_by: adminId,
        rejection_reason: reason,
      },
      include: { users: true },
    });
  }



  suspendTrainer(id: string) {
    return this.prisma.trainers.update({
      where: { id },
      data: { trainer_status: 'SUSPENDED' },
      include: { users: true },
    });
  }



  activateTrainer(id: string) {
    return this.prisma.trainers.update({
      where: { id },
      data: { trainer_status: 'APPROVED', rejection_reason: null },
      include: { users: true },
    });
  }



  addTrainerCertificate(trainer_id: string, data: any) {
    return this.prisma.trainer_certificates.create({
      data: { trainer_id, ...data },
    });
  }



  deleteTrainerCertificate(id: string) {
    return this.prisma.trainer_certificates.delete({ where: { id } });
  }



  addTrainerDocument(trainer_id: string, data: any) {
    return this.prisma.trainer_documents.create({
      data: { trainer_id, ...data },
    });
  }



  deleteTrainerDocument(id: string) {
    return this.prisma.trainer_documents.delete({ where: { id } });
  }





  getVolunteers(status?: string) {
    return this.prisma.volunteers.findMany({
      where: status ? { volunteer_status: status as any } : undefined,
      orderBy: { created_at: 'desc' },
      include: {
        users: {
          select: {
            id: true,
            full_name: true,
            username: true,
            email: true,
            phone: true,
            is_active: true,
            profile_image: true,
          },
        },
      },
    });
  }



  getVolunteerById(id: string) {
    return this.prisma.volunteers.findUnique({
      where: { id },
      include: { users: true },
    });
  }



  createVolunteerProfile(userId: string) {
    return this.prisma.volunteers.create({
      data: {
        user_id: userId,
        volunteer_status: 'PENDING',
      },
    });
  }



  getVolunteerByUserId(userId: string) {
    return this.prisma.volunteers.findUnique({ where: { user_id: userId } });
  }



  approveVolunteer(id: string, adminId: string) {
    return this.prisma.volunteers.update({
      where: { id },
      data: {
        volunteer_status: 'APPROVED',
        approved_by: adminId,
        approved_at: new Date(),
        rejection_reason: null,
      },
      include: { users: true },
    });
  }



  rejectVolunteer(id: string, adminId: string, reason: string) {
    return this.prisma.volunteers.update({
      where: { id },
      data: {
        volunteer_status: 'REJECTED',
        approved_by: adminId,
        rejection_reason: reason,
      },
      include: { users: true },
    });
  }





  createCertificate(data: import('@prisma/client').Prisma.certificatesUncheckedCreateInput) {
    return this.prisma.certificates.create({
      data,
      include: {
        users: {
          select: {
            id: true,
            full_name: true,
            username: true,
            email: true,
            role: true,
          },
        },
        trainers: {
          select: { id: true, slug: true },
        },
        training_programs: {
          select: { id: true, title: true },
        },
      },
    });
  }



  getCertificates() {
    return this.prisma.certificates.findMany({
      orderBy: { issued_at: 'desc' },
      include: {
        users: {
          select: {
            id: true,
            full_name: true,
            username: true,
            email: true,
            role: true,
          },
        },
        trainers: { select: { id: true, slug: true } },
        training_programs: { select: { id: true, title: true } },
      },
    });
  }



  getCertificateById(id: string) {
    return this.prisma.certificates.findUnique({
      where: { id },
      include: { users: true, trainers: true, training_programs: true },
    });
  }



  updateCertificate(id: string, data: import('@prisma/client').Prisma.certificatesUncheckedUpdateInput) {
    return this.prisma.certificates.update({ where: { id }, data });
  }



  revokeCertificate(id: string) {
    return this.prisma.certificates.update({
      where: { id },
      data: { is_valid: false },
    });
  }



  deleteCertificate(id: string) {
    return this.prisma.certificates.delete({ where: { id } });
  }





  getCorporateRequests(status?: string) {
    return this.prisma.corporate_requests.findMany({
      where: status ? { status: status as any } : undefined,
      orderBy: { created_at: 'desc' },
      include: {
        users_corporate_requests_requester_idTousers: {
          select: {
            id: true,
            full_name: true,
            username: true,
            email: true,
          },
        },
        users_corporate_requests_assigned_toTousers: {
          select: {
            id: true,
            full_name: true,
            username: true,
            email: true,
          },
        },
        corporate_request_attachments: true,
      },
    });
  }



  getCorporateRequestById(id: string) {
    return this.prisma.corporate_requests.findUnique({
      where: { id },
      include: {
        users_corporate_requests_requester_idTousers: true,
        users_corporate_requests_assigned_toTousers: true,
        corporate_request_attachments: true,
      },
    });
  }



  updateCorporateRequest(id: string, data: any) {
    return this.prisma.corporate_requests.update({
      where: { id },
      data: { ...data, updated_at: new Date() },
    });
  }





  getSpecializationRequests() {
    return this.prisma.specialization_requests.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        users: {
          select: { id: true, full_name: true, username: true, email: true },
        },
      },
    });
  }



  getSpecializationRequestById(id: string) {
    return this.prisma.specialization_requests.findUnique({ where: { id } });
  }



  getSpecializationById(id: string) {
    return this.prisma.specializations.findUnique({ where: { id } });
  }



  findSpecializationByName(name_ar: string) {
    return this.prisma.specializations.findFirst({ where: { name_ar } });
  }



  createSpecialization(data: { name_ar: string; name_en: string }) {
    return this.prisma.specializations.create({ data });
  }



  updateSpecialization(id: string, data: { name_ar?: string; name_en?: string }) {
    return this.prisma.specializations.update({ where: { id }, data });
  }



  deleteSpecialization(id: string) {
    return this.prisma.specializations.delete({ where: { id } });
  }



  markSpecializationRequest(id: string, status: string) {
    return this.prisma.specialization_requests.update({
      where: { id },
      data: { status },
    });
  }





  getPrograms() {
    return this.prisma.training_programs.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        trainers: {
          include: {
            users: {
              select: { id: true, full_name: true, username: true },
            },
          },
        },
      },
    });
  }



  getProgramById(id: string) {
    return this.prisma.training_programs.findUnique({ where: { id } });
  }



  updateProgram(id: string, data: any) {
    return this.prisma.training_programs.update({
      where: { id },
      data: { ...data, updated_at: new Date() },
    });
  }



  deleteProgram(id: string) {
    return this.prisma.training_programs.delete({ where: { id } });
  }





  async getDashboardStats() {
    const [
      usersCount,
      studentsCount,
      trainersCount,
      pendingTrainersCount,
      employeesCount,
      volunteersCount,
      pendingVolunteersCount,
      programsCount,
      consultationsCount,
      corporateRequestsCount,
      pendingCorporateRequestsCount,
      certificatesCount,
      tasksCount,
    ] = await Promise.all([
      this.prisma.users.count(),
      this.prisma.users.count({ where: { role: { in: ['STUDENT', 'CLIENT'] } } }),
      this.prisma.trainers.count(),
      this.prisma.trainers.count({ where: { trainer_status: 'PENDING' } }),
      this.prisma.users.count({ where: { role: 'EMPLOYEE' } }),
      this.prisma.volunteers.count(),
      this.prisma.volunteers.count({ where: { volunteer_status: 'PENDING' } }),
      this.prisma.training_programs.count(),
      this.prisma.consultations.count(),
      this.prisma.corporate_requests.count(),
      this.prisma.corporate_requests.count({ where: { status: 'PENDING' } }),
      this.prisma.certificates.count(),
      this.prisma.tasks.count(),
    ]);

    return {
      users_count: usersCount,
      students_count: studentsCount,
      trainers_count: trainersCount,
      pending_trainers_count: pendingTrainersCount,
      employees_count: employeesCount,
      volunteers_count: volunteersCount,
      pending_volunteers_count: pendingVolunteersCount,
      programs_count: programsCount,
      consultations_count: consultationsCount,
      corporate_requests_count: corporateRequestsCount,
      pending_corporate_requests_count: pendingCorporateRequestsCount,
      certificates_count: certificatesCount,
      tasks_count: tasksCount,
    };
  }
}
