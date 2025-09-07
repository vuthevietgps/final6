/**
 * File: test-order/test-order.controller.ts
 * Mục đích: REST API cho Đơn Hàng Thử Nghiệm.
 */
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, ValidationPipe, UseGuards } from '@nestjs/common';
import { TestOrderService } from './test-order.service';
import { CreateTestOrderDto } from './dto/create-test-order.dto';
import { UpdateTestOrderDto } from './dto/update-test-order.dto';
import { JwtAuthGuard, RolesGuard } from '../auth/guards/auth.guard';
import { RequirePermissions } from '../auth/decorators/auth.decorator';

@Controller('test-orders')
export class TestOrderController {
  constructor(private readonly service: TestOrderService) {}

  // Bảo vệ toàn bộ endpoints và yêu cầu quyền 'orders'
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequirePermissions('orders')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body(ValidationPipe) dto: CreateTestOrderDto) {
    return this.service.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequirePermissions('orders')
  @Get()
  findAll(
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.findAll({ q, status, from, to });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequirePermissions('orders')
  @Get(':id')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequirePermissions('orders')
  @Patch(':id')
  update(@Param('id') id: string, @Body(ValidationPipe) dto: UpdateTestOrderDto) {
    return this.service.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequirePermissions('orders')
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string) { return this.service.remove(id); }
}
