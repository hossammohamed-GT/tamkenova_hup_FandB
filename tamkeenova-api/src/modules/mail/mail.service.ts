import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import {
  getOtpEmailTemplate,
  getTrainerRequestEmailTemplate,
  getTrainerApprovedEmailTemplate,
  getTrainerRejectedEmailTemplate,
  getConsultationRequestEmailTemplate,
  getCorporateRequestAdminEmailTemplate,
  getVolunteerRequestEmailTemplate,
  getVolunteerApprovedEmailTemplate,
  getVolunteerRejectedEmailTemplate,
  getTaskAssignedEmailTemplate,
  getTaskSubmittedAdminEmailTemplate,
  getCertificateIssuedEmailTemplate,
  getPasswordResetEmailTemplate,
} from './templates/mail-templates';


@Injectable()
export class MailService {
  private transporter;



  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      disableFileAccess: true,
      disableUrlAccess: true,
      auth: {
        user: this.configService.get('MAIL_USER'),
        pass: this.configService.get('MAIL_PASSWORD'),
      },
    });
  }




  private async sendEmail(
    to: string,
    subject: string,
    html: string,
    text?: string,
  ) {
    return this.transporter.sendMail({
      from: `"TamkeeNova HUB" <${this.configService.get('MAIL_USER')}>`,
      to,
      subject,
      html,
      text,
      replyTo: this.configService.get('MAIL_USER'),
      headers: {
        'X-Auto-Response-Suppress': 'All',
        'List-Unsubscribe': `<mailto:${this.configService.get('MAIL_USER')}?subject=unsubscribe>`,
      },
    });
  }




  async sendPasswordResetOtp(email: string, otp: string) {
    await this.sendEmail(
      email,
      'إعادة تعيين كلمة المرور — TamkeeNova HUB',
      getPasswordResetEmailTemplate(otp),
      `كود إعادة تعيين كلمة المرور: ${otp} — ينتهي خلال 10 دقايق.`,
    );
  }

  async sendOtp(email: string, otp: string) {
    await this.sendEmail(
      email,
      'كود التحقق من TamkeeNova HUB',
      getOtpEmailTemplate(otp),
      `كود التحقق بتاعك هو: ${otp} — الكود ده هينتهي خلال 10 دقايق.`,
    );
  }




  async sendTrainerRequestEmail(
    adminEmail: string,
    trainerName: string,
    trainerEmail: string,
  ) {
    await this.sendEmail(
      adminEmail,
      'طلب انضمام مدرب جديد — TamkeeNova HUB',
      getTrainerRequestEmailTemplate(trainerName, trainerEmail),
    );
  }




  async sendTrainerApprovedEmail(email: string, trainerName?: string) {
    await this.sendEmail(
      email,
      'تم اعتماد حسابك — TamkeeNova HUB',
      getTrainerApprovedEmailTemplate(trainerName),
    );
  }




  async sendTrainerRejectedEmail(email: string, reason: string) {
    await this.sendEmail(
      email,
      'طلب الانضمام — TamkeeNova HUB',
      getTrainerRejectedEmailTemplate(reason),
    );
  }




  async sendConsultationRequestEmail(
    trainerEmail: string,
    studentName: string,
    studentEmail: string,
    studentPhone: string,
    consultationTitle: string,
    consultationDescription: string,
    preferredDate?: string,
    preferredTime?: string,
    certificates?: string[],
    whatsapp?: string,
    bio?: string,
  ) {
    await this.sendEmail(
      trainerEmail,
      `طلب استشارة جديد: ${consultationTitle} — TamkeeNova HUB`,
      getConsultationRequestEmailTemplate({
        studentName,
        studentEmail,
        studentPhone,
        whatsapp,
        bio,
        consultationTitle,
        consultationDescription,
        preferredDate,
        preferredTime,
        certificates,
      }),
    );
  }




  async sendCorporateRequestAdminEmail(
    adminEmail: string,
    companyName: string,
    serviceType: string,
  ) {
    await this.sendEmail(
      adminEmail,
      `طلب شركة جديد: ${companyName} — TamkeeNova HUB`,
      getCorporateRequestAdminEmailTemplate(companyName, serviceType),
    );
  }




  async sendVolunteerRequestEmail(
    adminEmail: string,
    volunteerName: string,
    volunteerEmail: string,
  ) {
    await this.sendEmail(
      adminEmail,
      'طلب انضمام متطوع جديد — TamkeeNova HUB',
      getVolunteerRequestEmailTemplate(volunteerName, volunteerEmail),
    );
  }




  async sendVolunteerApprovedEmail(email: string, volunteerName?: string) {
    await this.sendEmail(
      email,
      'تم قبول طلب التطوع — TamkeeNova HUB',
      getVolunteerApprovedEmailTemplate(volunteerName),
    );
  }




  async sendVolunteerRejectedEmail(email: string, reason: string) {
    await this.sendEmail(
      email,
      'طلب التطوع — TamkeeNova HUB',
      getVolunteerRejectedEmailTemplate(reason),
    );
  }




  async sendTaskAssignedEmail(
    assigneeEmail: string,
    assigneeName: string,
    taskTitle: string,
    deadline?: string,
    priority?: string,
  ) {
    await this.sendEmail(
      assigneeEmail,
      `New Task Assigned: ${taskTitle} — TamkeeNova HUB`,
      getTaskAssignedEmailTemplate({
        assigneeName,
        taskTitle,
        deadline,
        priority,
      }),
    );
  }




  async sendTaskSubmittedAdminEmail(
    adminEmail: string,
    assigneeName: string,
    taskTitle: string,
  ) {
    await this.sendEmail(
      adminEmail,
      `تسليم مهمة جديد: ${taskTitle} — TamkeeNova HUB`,
      getTaskSubmittedAdminEmailTemplate(assigneeName, taskTitle),
    );
  }




  async sendCertificateIssuedEmail(
    email: string,
    holderName: string,
    certificateTitle: string,
    verificationCode?: string,
  ) {
    await this.sendEmail(
      email,
      `شهادة جديدة: ${certificateTitle} — TamkeeNova HUB`,
      getCertificateIssuedEmailTemplate(
        holderName,
        certificateTitle,
        verificationCode,
      ),
    );
  }
}
