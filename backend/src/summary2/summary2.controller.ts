/**
 * File: summary2/summary2.controller.ts
 * Mục đích: Cung cấp API lấy dữ liệu "Tổng hợp 2".
 */
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Summary2Service } from './summary2.service';
import { JwtAuthGuard, RolesGuard } from '../auth/guards/auth.guard';
import { RequirePermissions } from '../auth/decorators/auth.decorator';

@Controller('summary2')
@UseGuards(JwtAuthGuard, RolesGuard)
export class Summary2Controller {
  constructor(private readonly svc: Summary2Service) {}

  @Get()
  @RequirePermissions('reports')
  async list(
    @Query('agentId') agentId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const rows = await this.svc.getSummary2({ agentId, from, to });
    return { count: rows.length, rows };
  }

  @Get('debug')
  @RequirePermissions('reports')
  async debug() {
    return await this.svc.debugSummary1();
  }
}
