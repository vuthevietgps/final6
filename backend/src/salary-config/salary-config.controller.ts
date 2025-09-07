import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { SalaryConfigService } from './salary-config.service';
import { CreateSalaryConfigDto } from './dto/create-salary-config.dto';
import { UpdateSalaryConfigDto } from './dto/update-salary-config.dto';

@Controller('salary-config')
export class SalaryConfigController {
  constructor(private readonly service: SalaryConfigService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  // Upsert theo userId
  @Post()
  create(@Body() dto: CreateSalaryConfigDto) {
    return this.service.createOrUpdate(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSalaryConfigDto) {
    return this.service.update(id, dto);
  }

  // Patch một trường (inline edit)
  @Patch(':id/field')
  updateField(@Param('id') id: string, @Body() patch: Partial<UpdateSalaryConfigDto>) {
    return this.service.updateField(id, patch);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
