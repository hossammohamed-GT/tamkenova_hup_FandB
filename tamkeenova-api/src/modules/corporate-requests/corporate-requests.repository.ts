import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { corporate_status } from '@prisma/client';

@Injectable()
export class CorporateRequestsRepository {

  // Initialize instance
  constructor(private readonly prisma: PrismaService) {}


  // Handle create request
  async createRequest(data: {
    requester_id: string;
    contact_name: string;
    contact_email: string;
    contact_phone?: string;
    contact_whatsapp?: string;
    company_name: string;
    sector?: string;
    country?: string;
    employees_count?: number;
    service_type: string;
    service_description: string;
    expected_budget?: string;
    project_duration?: string;
  }) {
    return this.prisma.corporate_requests.create({
      data: {
        requester_id: data.requester_id,
        contact_name: data.contact_name,
        contact_email: data.contact_email,
        contact_phone: data.contact_phone || null,
        contact_whatsapp: data.contact_whatsapp || null,
        company_name: data.company_name,
        sector: data.sector || null,
        country: data.country || null,
        employees_count: data.employees_count || null,
        service_type: data.service_type,
        service_description: data.service_description,
        expected_budget: data.expected_budget || null,
        project_duration: data.project_duration || null,
        status: 'PENDING',
      },
      select: {
        id: true,
        company_name: true,
        service_type: true,
        status: true,
        created_at: true,
      },
    });
  }


  // Handle create attachment
  async createAttachment(data: {
    request_id: string;
    file_name: string;
    file_url: string;
    file_type: string;
  }) {
    return this.prisma.corporate_request_attachments.create({
      data: {
        request_id: data.request_id,
        file_name: data.file_name,
        file_url: data.file_url,
        file_type: data.file_type,
      },
    });
  }


  // Handle get student requests
  async getStudentRequests(requesterId: string, status?: corporate_status) {
    const where: any = { requester_id: requesterId };
    if (status) where.status = status;

    return this.prisma.corporate_requests.findMany({
      where,
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        company_name: true,
        sector: true,
        country: true,
        service_type: true,
        service_description: true,
        expected_budget: true,
        project_duration: true,
        status: true,
        admin_notes: true,
        rejection_reason: true,
        created_at: true,
        updated_at: true,
        corporate_request_attachments: {
          select: {
            id: true,
            file_name: true,
            file_url: true,
            file_type: true,
            created_at: true,
          },
        },
      },
    });
  }


  // Handle get request by id
  async getRequestById(requestId: string) {
    return this.prisma.corporate_requests.findUnique({
      where: { id: requestId },
      select: {
        id: true,
        requester_id: true,
        contact_name: true,
        contact_email: true,
        contact_phone: true,
        contact_whatsapp: true,
        company_name: true,
        sector: true,
        country: true,
        employees_count: true,
        service_type: true,
        service_description: true,
        expected_budget: true,
        project_duration: true,
        status: true,
        admin_notes: true,
        assigned_to: true,
        rejection_reason: true,
        created_at: true,
        updated_at: true,
        corporate_request_attachments: {
          select: {
            id: true,
            file_name: true,
            file_url: true,
            file_type: true,
            created_at: true,
          },
        },
      },
    });
  }


  // Handle get request by id minimal
  async getRequestByIdMinimal(requestId: string) {
    return this.prisma.corporate_requests.findUnique({
      where: { id: requestId },
      select: {
        id: true,
        requester_id: true,
        company_name: true,
        status: true,
      },
    });
  }
}
