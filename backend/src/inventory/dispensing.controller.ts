import { Controller, Post, Param, Body, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DispensingService } from './dispensing.service';
import { DispensePrescriptionDto } from './dto/dispense-prescription.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleName } from '@prisma/client';

@ApiTags('Pharmacy Dispensing')
@ApiBearerAuth()
@Controller('prescriptions')
export class DispensingController {
  constructor(private readonly dispensingService: DispensingService) {}

  @Post(':id/dispense')
  @Roles(RoleName.ADMIN, RoleName.INVENTORY_MANAGER, RoleName.RECEPTIONIST)
  @ApiOperation({ summary: 'Dispense prescription medicines using FEFO (First-Expiry-First-Out)' })
  @ApiResponse({ status: 200, description: 'Prescription items dispensed and stock deducted via FEFO' })
  async dispensePrescription(
    @Param('id') id: string,
    @Body() dto: DispensePrescriptionDto,
    @Req() req: any,
  ) {
    const userId = req.user?.userId;
    return this.dispensingService.dispensePrescription(id, dto, userId);
  }
}
