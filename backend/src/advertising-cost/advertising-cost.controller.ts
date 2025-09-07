/**
 * File: advertising-cost/advertising-cost.controller.ts
 * Mục đích: Cung cấp REST API CRUD cho Chi Phí Quảng Cáo.
 */
import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { AdvertisingCostService } from './advertising-cost.service';
import { CreateAdvertisingCostDto } from './dto/create-advertising-cost.dto';
import { UpdateAdvertisingCostDto } from './dto/update-advertising-cost.dto';

@Controller('advertising-cost')
export class AdvertisingCostController {
  constructor(private readonly service: AdvertisingCostService) {}

  @Post()
  create(@Body() dto: CreateAdvertisingCostDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get('stats/summary')
  stats() {
    return this.service.summary();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAdvertisingCostDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
