import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { CorporateRequestsRepository } from './corporate-requests.repository';
import { NotificationsService } from '../notifications/notifications.service';
import { MailService } from '../mail/mail.service';
import { StorageService } from '../storage/storage.service';
import { CreateCorporateRequestDto } from './dto/create-corporate-request.dto';
import { corporate_status } from '@prisma/client';

@Injectable()
export class CorporateRequestsService {

  // Initialize instance
  constructor(
    private readonly corporateRepo: CorporateRequestsRepository,
    private readonly notificationsService: NotificationsService,
    private readonly mailService: MailService,
    private readonly storageService: StorageService,
  ) {}




  // Handle create request
  async createRequest(userId: string, dto: CreateCorporateRequestDto) {
    const request = await this.corporateRepo.createRequest({
      requester_id: userId,
      ...dto,
    });


    await this.notifyAdmins(
      request.id,
      request.company_name,
      request.service_type,
    );

    return {
      message: 'Corporate request submitted successfully',
      request,
    };
  }




  // Handle upload attachment
  async uploadAttachment(
    userId: string,
    requestId: string,
    file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }


    const request = await this.corporateRepo.getRequestByIdMinimal(requestId);
    if (!request) {
      throw new NotFoundException('Corporate request not found');
    }
    if (request.requester_id !== userId) {
      throw new ForbiddenException('This request does not belong to you');
    }


    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/webp',
    ];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Only PDF, DOC, DOCX, JPG, PNG, WEBP files are allowed',
      );
    }


    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('File size must not exceed 10MB');
    }


    const result = await this.storageService.uploadFile(
      'corporate-attachments',
      file.originalname,
      file.buffer,
      file.mimetype,
    );


    const attachment = await this.corporateRepo.createAttachment({
      request_id: requestId,
      file_name: file.originalname,
      file_url: result.url,
      file_type: file.mimetype,
    });

    return {
      message: 'Attachment uploaded successfully',
      attachment,
    };
  }




  // Handle get my requests
  async getMyRequests(userId: string, status?: corporate_status) {
    const requests = await this.corporateRepo.getStudentRequests(
      userId,
      status,
    );
    return {
      data: requests,
      total: requests.length,
    };
  }




  // Handle get request details
  async getRequestDetails(userId: string, requestId: string) {
    const request = await this.corporateRepo.getRequestById(requestId);

    if (!request) {
      throw new NotFoundException('Corporate request not found');
    }

    if (request.requester_id !== userId) {
      throw new ForbiddenException('This request does not belong to you');
    }

    return request;
  }




  // Handle notify admins
  private async notifyAdmins(
    requestId: string,
    companyName: string,
    serviceType: string,
  ) {
    try {

      const admins = await this.notificationsService.getAdminUsers();

      if (admins.length === 0) return;


      await this.notificationsService.createBulkNotifications(
        admins.map((a) => a.id),
        {
          title: 'طلب شركة جديد',
          message: `تم استلام طلب جديد من شركة "${companyName}" — نوع الخدمة: ${serviceType}`,
          type: 'CORPORATE_REQUEST',
          reference_id: requestId,
          reference_type: 'CORPORATE_REQUEST',
        },
      );


      const firstAdmin = admins[0];
      if (firstAdmin.email) {
        try {
          await this.mailService.sendCorporateRequestAdminEmail(
            firstAdmin.email,
            companyName,
            serviceType,
          );
        } catch (emailError) {
          console.error('Failed to send admin email:', emailError);
        }
      }
    } catch (error) {
      console.error('Failed to notify admins:', error);
    }
  }
}
