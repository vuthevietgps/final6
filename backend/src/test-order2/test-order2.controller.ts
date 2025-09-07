/**
 * File: test-order2/test-order2.controller.ts
 * REST Controller cho Đơn Hàng Thử Nghiệm 2
 */
import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { TestOrder2Service } from './test-order2.service';
import { CreateTestOrder2Dto } from './dto/create-test-order2.dto';
import { UpdateTestOrder2Dto } from './dto/update-test-order2.dto';

@Controller('test-order2')
export class TestOrder2Controller {
  constructor(private readonly service: TestOrder2Service) {}

  @Post()
  create(@Body() dto: CreateTestOrder2Dto) {
    return this.service.create(dto);
  }

  @Get()
  findAll(
    @Query('q') q?: string,
    @Query('productId') productId?: string,
    @Query('agentId') agentId?: string,
    @Query('adGroupId') adGroupId?: string,
    @Query('isActive') isActive?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.findAll({ q, productId, agentId, adGroupId, isActive, from, to });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTestOrder2Dto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
