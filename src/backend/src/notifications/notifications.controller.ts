import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StaffGuard } from '../auth/staff.guard';

interface RequestWithUser extends Request {
  user: { sub: number; email: string };
}

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('me')
  getMyNotifications(@Req() req: RequestWithUser) {
    return this.notificationsService.getForUser(req.user.sub);
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.notificationsService.markRead(+id, req.user.sub);
  }

  @Patch('read-all')
  markAllRead(@Req() req: RequestWithUser) {
    return this.notificationsService.markAllRead(req.user.sub);
  }

  @Patch('preferences')
  updatePreferences(
    @Req() req: RequestWithUser,
    @Body('notifInApp') notifInApp: boolean,
  ) {
    return this.notificationsService.updatePreference(req.user.sub, notifInApp);
  }

  // Events the logged-in staff user may send blasts for
  @Get('my-events')
  @UseGuards(StaffGuard)
  getMyEvents(@Req() req: RequestWithUser) {
    return this.notificationsService.getManagedEventsForBlast(req.user.sub);
  }

  @Post('blast')
  @UseGuards(StaffGuard)
  blast(
    @Req() req: RequestWithUser,
    @Body('eventId') eventId: number,
    @Body('message') message?: string,
  ) {
    return this.notificationsService.blast(req.user.sub, eventId, message);
  }
}
