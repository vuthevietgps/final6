/**
 * File: ad-group/dto/create-ad-group.dto.ts
 * Mục đích: DTO cho tạo mới Nhóm Quảng Cáo.
 */
import { IsBoolean, IsEnum, IsMongoId, IsOptional, IsString, Length } from 'class-validator';

export class CreateAdGroupDto {
  @IsString()
  @Length(2, 200)
  name: string;

  @IsString()
  @Length(1, 200)
  adGroupId: string;

  @IsMongoId()
  productId: string;

  @IsMongoId()
  agentId: string;

  @IsMongoId()
  adAccountId: string;

  @IsEnum(['facebook', 'google', 'ticktock'])
  platform: 'facebook' | 'google' | 'ticktock';

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}
