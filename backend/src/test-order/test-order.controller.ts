/**
 * File: test-order/test-order.controller.ts
 * Mục đích: REST API cho Đơn Hàng Thử Nghiệm.
 */
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, ValidationPipe } from '@nestjs/common';
import { TestOrderService } from './test-order.service';
import { CreateTestOrderDto } from './dto/create-test-order.dto';
import { UpdateTestOrderDto } from './dto/update-test-order.dto';

@Controller('test-orders')
export class TestOrderController {
  constructor(private readonly service: TestOrderService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body(ValidationPipe) dto: CreateTestOrderDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll(
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.findAll({ q, status, from, to });
  }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Patch(':id')
  update(@Param('id') id: string, @Body(ValidationPipe) dto: UpdateTestOrderDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string) { return this.service.remove(id); }
}
