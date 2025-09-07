/**
 * File: ad-group/ad-group.controller.ts
 * Mục đích: REST API cho Nhóm Quảng Cáo.
 */
import { Controller, Get, Post, Body, Patch, Param, Delete, Query, BadRequestException } from '@nestjs/common';
import { AdGroupService } from './ad-group.service';
import { CreateAdGroupDto } from './dto/create-ad-group.dto';
import { UpdateAdGroupDto } from './dto/update-ad-group.dto';

@Controller('ad-groups')
export class AdGroupController {
  constructor(private readonly adGroupService: AdGroupService) {}

  @Post()
  create(@Body() dto: CreateAdGroupDto) {
  return this.adGroupService.create(dto);
  }

  @Get()
  findAll(@Query() query?: any) {
    return this.adGroupService.findAll(query);
  }

  @Get('search')
  search(@Query() query?: any) {
    return this.adGroupService.search(query);
  }

  @Get('validate/adgroupid/:adGroupId')
  async validateAdGroupId(@Param('adGroupId') adGroupId: string) {
    const exists = await this.adGroupService.existsByAdGroupId(adGroupId);
    return { exists };
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.adGroupService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAdGroupDto) {
    return this.adGroupService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.adGroupService.remove(id);
  }

  /**
   * Thống kê số lượng nhóm quảng cáo theo sản phẩm
   */
  @Get('stats/counts-by-product')
  getCountsByProduct() {
    return this.adGroupService.getCountsByProduct();
  }
}
