import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';


@Injectable()
export class AdminRepository {

  // Initialize instance
  constructor(private readonly prisma: PrismaService) {}




  // Handle get users
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


  // Handle get user by id
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


  // Handle update user role
  updateUserRole(id: string, role: string) {
    return this.prisma.users.update({
      where: { id },
      data: { role: role as any },
    });
  }


  // Handle update user active
  updateUserActive(id: string, is_active: boolean) {
    return this.prisma.users.update({
      where: { id },
      data: { is_active },
    });
  }




  // Handle log activity
  async logActivity(data: {
    user_id: string;
    action: string;
    entity_type?: string;
    entity_id?: string;
    details?: string;
  }) {
    return this.prisma.activity_logs.create({ data });
  }


  // Handle get user activity
  getUserActivity(userId: string) {
    return this.prisma.activity_logs.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: 200,
    });
  }




  // Handle get trainers
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


  // Handle get trainer by id
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


  // Handle update trainer
  updateTrainer(id: string, data: any) {
    return this.prisma.trainers.update({ where: { id }, data });
  }


  // Handle approve trainer
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


  // Handle reject trainer
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


  // Handle suspend trainer
  suspendTrainer(id: string) {
    return this.prisma.trainers.update({
      where: { id },
      data: { trainer_status: 'SUSPENDED' },
      include: { users: true },
    });
  }


  // Handle activate trainer
  activateTrainer(id: string) {
    return this.prisma.trainers.update({
      where: { id },
      data: { trainer_status: 'APPROVED', rejection_reason: null },
      include: { users: true },
    });
  }


  // Handle add trainer certificate
  addTrainerCertificate(trainer_id: string, data: any) {
    return this.prisma.trainer_certificates.create({
      data: { trainer_id, ...data },
    });
  }


  // Handle delete trainer certificate
  deleteTrainerCertificate(id: string) {
    return this.prisma.trainer_certificates.delete({ where: { id } });
  }


  // Handle add trainer document
  addTrainerDocument(trainer_id: string, data: any) {
    return this.prisma.trainer_documents.create({
      data: { trainer_id, ...data },
    });
  }


  // Handle delete trainer document
  deleteTrainerDocument(id: string) {
    return this.prisma.trainer_documents.delete({ where: { id } });
  }




  // Handle get volunteers
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


  // Handle get volunteer by id
  getVolunteerById(id: string) {
    return this.prisma.volunteers.findUnique({
      where: { id },
      include: { users: true },
    });
  }


  // Handle create volunteer profile
  createVolunteerProfile(userId: string) {
    return this.prisma.volunteers.create({
      data: {
        user_id: userId,
        volunteer_status: 'PENDING',
      },
    });
  }


  // Handle get volunteer by user id
  getVolunteerByUserId(userId: string) {
    return this.prisma.volunteers.findUnique({ where: { user_id: userId } });
  }


  // Handle approve volunteer
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


  // Handle reject volunteer
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




  // Handle create certificate
  createCertificate(data: {
    student_id: string;
    trainer_id?: string | null;
    program_id?: string | null;
    verification_code: string;
    title: string;
    description?: string | null;
    pdf_url?: string | null;
    qr_code_url?: string | null;
    training_hours?: number;
    certificate_type?: string;
  }) {
    return this.prisma.certificates.create({
      data: {
        student_id: data.student_id,
        trainer_id: data.trainer_id || null,
        program_id: data.program_id || null,
        verification_code: data.verification_code,
        title: data.title,
        description: data.description || null,
        pdf_url: data.pdf_url || null,
        qr_code_url: data.qr_code_url || null,
        training_hours: data.training_hours || 0,
        certificate_type: (data.certificate_type as any) || 'OTHER',
      },
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


  // Handle get certificates
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


  // Handle get certificate by id
  getCertificateById(id: string) {
    return this.prisma.certificates.findUnique({
      where: { id },
      include: { users: true, trainers: true, training_programs: true },
    });
  }


  // Handle update certificate
  updateCertificate(id: string, data: any) {
    return this.prisma.certificates.update({ where: { id }, data });
  }


  // Handle revoke certificate
  revokeCertificate(id: string) {
    return this.prisma.certificates.update({
      where: { id },
      data: { is_valid: false },
    });
  }


  // Handle delete certificate
  deleteCertificate(id: string) {
    return this.prisma.certificates.delete({ where: { id } });
  }




  // Handle get corporate requests
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


  // Handle get corporate request by id
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


  // Handle update corporate request
  updateCorporateRequest(id: string, data: any) {
    return this.prisma.corporate_requests.update({
      where: { id },
      data: { ...data, updated_at: new Date() },
    });
  }




  // Handle get specialization requests
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


  // Handle get specialization request by id
  getSpecializationRequestById(id: string) {
    return this.prisma.specialization_requests.findUnique({ where: { id } });
  }


  // Handle get specialization by id
  getSpecializationById(id: string) {
    return this.prisma.specializations.findUnique({ where: { id } });
  }


  // Handle find specialization by name
  findSpecializationByName(name_ar: string) {
    return this.prisma.specializations.findFirst({ where: { name_ar } });
  }


  // Handle create specialization
  createSpecialization(data: { name_ar: string; name_en: string }) {
    return this.prisma.specializations.create({ data });
  }


  // Handle update specialization
  updateSpecialization(id: string, data: { name_ar?: string; name_en?: string }) {
    return this.prisma.specializations.update({ where: { id }, data });
  }


  // Handle delete specialization
  deleteSpecialization(id: string) {
    return this.prisma.specializations.delete({ where: { id } });
  }


  // Handle mark specialization request
  markSpecializationRequest(id: string, status: string) {
    return this.prisma.specialization_requests.update({
      where: { id },
      data: { status },
    });
  }




  // Handle get programs
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


  // Handle get program by id
  getProgramById(id: string) {
    return this.prisma.training_programs.findUnique({ where: { id } });
  }


  // Handle update program
  updateProgram(id: string, data: any) {
    return this.prisma.training_programs.update({
      where: { id },
      data: { ...data, updated_at: new Date() },
    });
  }


  // Handle delete program
  deleteProgram(id: string) {
    return this.prisma.training_programs.delete({ where: { id } });
  }




  // Handle get dashboard stats
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
