import {
  Controller,
  Get,
  Patch,
  Param,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {


  constructor(private readonly notificationsService: NotificationsService) {}






  @Get()
  async getMyNotifications(@CurrentUser() user: any) {
    return this.notificationsService.getMyNotifications(user.sub);
  }






  @Get('unread-count')
  async getUnreadCount(@CurrentUser() user: any) {
    return this.notificationsService.getUnreadCount(user.sub);
  }






  @Patch(':id/read')
  async markAsRead(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.notificationsService.markAsRead(id, user.sub);
  }






  @Patch('read-all')
  async markAllAsRead(@CurrentUser() user: any) {
    return this.notificationsService.markAllAsRead(user.sub);
  }
}
