import { Controller, Get, Post, Param, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @Roles('ADMIN', 'RECEPTIONIST')
  async create(@Body() dto: CreatePaymentDto, @Req() req: any) {
    const userId = req.user?.id || req.user?.sub;
    const data = await this.paymentsService.create(dto, userId);
    return {
      message: 'Payment recorded successfully',
      data,
    };
  }

  @Get('invoice/:invoiceId')
  @Roles('ADMIN', 'RECEPTIONIST', 'DOCTOR')
  async findByInvoiceId(@Param('invoiceId') invoiceId: string) {
    const data = await this.paymentsService.findByInvoiceId(invoiceId);
    return { data };
  }
}
