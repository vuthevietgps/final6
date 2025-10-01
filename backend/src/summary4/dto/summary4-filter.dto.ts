import { Transform, Type } from 'class-transformer';
import { IsOptional, IsInt, Min, Max, IsIn, IsString } from 'class-validator';

export class Summary4FilterDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Page phải là số nguyên' })
  @Min(1, { message: 'Page phải >= 1' })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit phải là số nguyên' })
  @Min(1, { message: 'Limit phải >= 1' })
  @Max(200, { message: 'Limit không được vượt quá 200' })
  limit?: number = 50;

  @IsOptional()
  @IsString()
  sortBy?: string = 'orderDate';

  @IsOptional()
  @IsIn(['asc', 'desc'], { message: 'sortOrder chỉ được là "asc" hoặc "desc"' })
  sortOrder?: 'asc' | 'desc' = 'desc';
}
