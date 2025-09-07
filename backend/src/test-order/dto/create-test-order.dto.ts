/**
 * File: test-order/dto/create-test-order.dto.ts
 */
import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export enum TestOrderStatusEnum {
  NEW = 'new',
  PROCESSING = 'processing',
  DONE = 'done',
  CANCEL = 'cancel',
}

export class CreateTestOrderDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsDateString()
  date: string;

  @IsString()
  @IsNotEmpty()
  customerName: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsNumber()
  @Min(0)
  total: number;

  @IsOptional()
  @IsEnum(TestOrderStatusEnum)
  status?: TestOrderStatusEnum;

  @IsOptional()
  @IsString()
  notes?: string;
}
