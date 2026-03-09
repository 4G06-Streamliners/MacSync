import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RefundRequestsService } from './refund-requests.service';

interface RequestWithUser extends Request {
  user: {
    sub: number;
    email: string;
  };
}

@Controller('refund-requests')
@UseGuards(JwtAuthGuard)
export class RefundRequestsController {
  constructor(
    private readonly refundRequestsService: RefundRequestsService,
  ) {}

  @Post()
  createRefundRequest(
    @Req() req: RequestWithUser,
    @Body() body: { ticketId: number; reason?: string },
  ) {
    return this.refundRequestsService.createRefundRequest(
      req.user.sub,
      body.ticketId,
      body.reason,
    );
  }

  @Get()
  getAllRefundRequests(@Req() req: RequestWithUser) {
    return this.refundRequestsService.getAllRefundRequests(req.user.sub);
  }

  @Get('my-requests')
  getUserRefundRequests(@Req() req: RequestWithUser) {
    return this.refundRequestsService.getUserRefundRequests(req.user.sub);
  }

  @Put(':id/approve')
  approveRefundRequest(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
    @Body() body: { adminResponse?: string },
  ) {
    return this.refundRequestsService.approveRefundRequest(
      +id,
      req.user.sub,
      body.adminResponse,
    );
  }

  @Put(':id/deny')
  denyRefundRequest(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
    @Body() body: { adminResponse?: string },
  ) {
    return this.refundRequestsService.denyRefundRequest(
      +id,
      req.user.sub,
      body.adminResponse,
    );
  }
}
