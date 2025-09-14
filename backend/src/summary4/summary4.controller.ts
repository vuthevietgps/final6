import { Controller, Get, Post, Patch, Param, Body, Query, ValidationPipe, ForbiddenException } from '@nestjs/common';
import { Summary4Service } from './summary4.service';
import { Summary4FilterDto } from './dto/summary4-filter.dto';
import { UpdateManualPaymentDto } from './dto/update-manual-payment.dto';

@Controller('summary4')
export class Summary4Controller {
  constructor(private readonly summary4Service: Summary4Service) {}

  @Get()
  findAll(@Query() filter: Summary4FilterDto) {
    return this.summary4Service.findAll(filter);
  }

  @Get('stats')
  getStats() {
    return this.summary4Service.getStats();
  }

  @Post('sync')
  syncFromTestOrder2() {
    return this.summary4Service.syncFromTestOrder2();
  }

  // Maintenance: chẩn đoán trùng lặp
  @Get('diagnostics')
  diagnostics() {
    if (process.env.ENABLE_SUMMARY4_MAINTENANCE !== 'true') {
      throw new ForbiddenException('Summary4 maintenance endpoints are disabled. Set ENABLE_SUMMARY4_MAINTENANCE=true to enable.');
    }
    return this.summary4Service.diagnostics();
  }

  // Maintenance: xoá trùng lặp
  @Post('fix-duplicates')
  fixDuplicates() {
    if (process.env.ENABLE_SUMMARY4_MAINTENANCE !== 'true') {
      throw new ForbiddenException('Summary4 maintenance endpoints are disabled. Set ENABLE_SUMMARY4_MAINTENANCE=true to enable.');
    }
    return this.summary4Service.fixDuplicates();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.summary4Service.findOne(id);
  }

  @Patch(':id/manual-payment')
  updateManualPayment(
    @Param('id') id: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true })) updateDto: UpdateManualPaymentDto,
  ) {
    return this.summary4Service.updateManualPayment(id, updateDto);
  }
}