import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { LaborCost1Service } from './labor-cost1.service';
import { CreateLaborCost1Dto } from './dto/create-labor-cost1.dto';
import { UpdateLaborCost1Dto } from './dto/update-labor-cost1.dto';

@Controller('labor-cost1')
export class LaborCost1Controller {
  constructor(private readonly service: LaborCost1Service) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post()
  create(@Body() dto: CreateLaborCost1Dto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateLaborCost1Dto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
