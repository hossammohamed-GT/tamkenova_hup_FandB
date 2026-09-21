import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { SpecializationsRepository } from './specializations.repository';
import { NotificationsService } from '../notifications/notifications.service';

import { RequestSpecializationDto } from './dto/request-specialization.dto';


@Injectable()
export class SpecializationsService {

  // Initialize instance
  constructor(
    private readonly specializationsRepository: SpecializationsRepository,
    private readonly notificationsService: NotificationsService,
  ) {}



  // Handle get all
  async getAll() {
    return this.specializationsRepository.getAll();
  }



  // Handle get by id
  async getById(id: string) {
    const specialization =
      await this.specializationsRepository.getById(id);

    if (!specialization) {
      throw new NotFoundException(
        'Specialization not found',
      );
    }

    return specialization;
  }



  // Handle request specialization
  async requestSpecialization(
    userId: string,
    dto: RequestSpecializationDto,
  ) {
    const exists =
      await this.specializationsRepository.findByName(
        dto.name_ar,
      );

    if (exists) {
      throw new BadRequestException(
        'Specialization already exists',
      );
    }

    const request = await this.specializationsRepository.createRequest({
      user_id: userId,
      name_ar: dto.name_ar,
      name_en: dto.name_en,
    });
    const admins = await this.notificationsService.getAdminUsers();
    await this.notificationsService.createBulkNotifications(admins.map((admin) => admin.id), {
      title: 'New specialization request',
      message: `A trainer requested the specialization ${dto.name_ar}.`,
      type: 'SPECIALIZATION_REQUEST',
      reference_id: request.id,
      reference_type: 'SPECIALIZATION_REQUEST',
    });
    return request;
  }
}
