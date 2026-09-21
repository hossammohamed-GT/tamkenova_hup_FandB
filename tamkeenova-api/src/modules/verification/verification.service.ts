import { Injectable, NotFoundException } from '@nestjs/common';
import { VerificationRepository } from './verification.repository';

@Injectable()
export class VerificationService {

  // Initialize instance
  constructor(private readonly verificationRepo: VerificationRepository) {}




  // Handle verify certificate
  async verifyCertificate(code: string) {
    const certificate = await this.verificationRepo.getCertificateByCode(code);

    if (!certificate) {
      throw new NotFoundException('Certificate not found');
    }

    return {
      verified: certificate.is_valid,
      status: certificate.is_valid ? 'VALID' : 'INVALID',
      certificate: {
        id: certificate.id,
        verification_code: certificate.verification_code,
        title: certificate.title,
        description: certificate.description,
        issued_at: certificate.issued_at,
        training_hours: certificate.training_hours,
        pdf_url: certificate.pdf_url,
        qr_code_url: certificate.qr_code_url,
        holder: {
          name: certificate.users.full_name,
          username: certificate.users.username,
          image: certificate.users.profile_image,
        },
        program: certificate.training_programs
          ? {
              title: certificate.training_programs.title,
              duration_hours: certificate.training_programs.duration_hours,
              level: certificate.training_programs.level,
            }
          : null,
        trainer: certificate.trainers
          ? {
              name: certificate.trainers.users.full_name,
              image: certificate.trainers.users.profile_image,
              slug: certificate.trainers.slug,
              specialization: certificate.trainers.specializations,
            }
          : null,
      },
      verified_at: new Date().toISOString(),
    };
  }




  // Handle verify user
  async verifyUser(username: string) {
    const user = await this.verificationRepo.getUserForVerification(username);

    if (!user) {
      throw new NotFoundException('User not found or not verified');
    }


    const totalHours =
      user.total_training_hours ||
      user.certificates.reduce((sum, c) => sum + (c.training_hours || 0), 0);


    const trainersMap = new Map();
    user.certificates.forEach((c) => {
      if (c.trainers && !trainersMap.has(c.trainers.id)) {
        trainersMap.set(c.trainers.id, {
          id: c.trainers.id,
          name: c.trainers.users.full_name,
          image: c.trainers.users.profile_image,
          slug: c.trainers.slug,
          specialization: c.trainers.specializations,
        });
      }
    });


    return {
      verified: true,
      user: {
        name: user.full_name,
        username: user.username,
        image: user.profile_image,
        bio: user.bio,
        location: user.location,
        role: user.role,
        member_since: user.created_at,
      },
      certificates: user.certificates.map((c) => ({
        id: c.id,
        verification_code: c.verification_code,
        title: c.title,
        description: c.description,
        issued_at: c.issued_at,
        training_hours: c.training_hours,
        pdf_url: c.pdf_url,
        qr_code_url: c.qr_code_url,
        program: c.training_programs
          ? {
              title: c.training_programs.title,
              duration_hours: c.training_programs.duration_hours,
            }
          : null,
        trainer: c.trainers
          ? {
              name: c.trainers.users.full_name,
              slug: c.trainers.slug,
            }
          : null,
      })),
      completed_programs: user.student_enrollments.map((e) => ({
        id: e.id,
        completed_at: e.completed_at,
        program: {
          title: e.training_programs.title,
          duration_hours: e.training_programs.duration_hours,
          level: e.training_programs.level,
        },
        trainer: {
          name: e.training_programs.trainers.users.full_name,
          slug: e.training_programs.trainers.slug,
        },
      })),
      trainers: Array.from(trainersMap.values()),
      skills: user.student_skills.map((s) => ({
        name: s.skill_name,
        source: s.source,
      })),
      stats: {
        total_certificates: user.certificates.length,
        total_completed_programs: user.student_enrollments.length,
        total_trainers: trainersMap.size,
        total_skills: user.student_skills.length,
        total_training_hours: totalHours,
      },
      verified_at: new Date().toISOString(),
    };
  }
}
