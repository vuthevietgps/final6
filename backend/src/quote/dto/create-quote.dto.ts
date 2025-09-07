/**
 * File: dto/create-quote.dto.ts
 * Mục đích: Định nghĩa kiểu dữ liệu và ràng buộc validate cho yêu cầu tạo mới Báo giá.
 */
import { IsNotEmpty, IsNumber, IsString, IsOptional, IsMongoId, Min, MaxLength, IsIn } from 'class-validator';
import { Type, Transform } from 'class-transformer';

// Chuẩn hoá status về dạng chuẩn (tránh lỗi do dấu/Unicode khác nhau)
function normalizeStatus(input: any): string {
  if (input == null) return input;
  const raw = String(input).trim();
  const ascii = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const map: Record<string, string> = {
    'cho duyet': 'Chờ duyệt',
    'da duyet': 'Đã duyệt',
    'tu choi': 'Từ chối',
    'het hieu luc': 'Hết hiệu lực',
    // tiếng Anh phổ biến
    'pending': 'Chờ duyệt',
    'approved': 'Đã duyệt',
    'rejected': 'Từ chối',
    'expired': 'Hết hiệu lực',
  };
  return map[ascii] ?? raw;
}
import { QUOTE_STATUS_VALUES } from '../quote.enum';

export class CreateQuoteDto {
  @IsNotEmpty()
  @IsMongoId()
  productId: string;

  @IsNotEmpty()
  @IsMongoId()
  agentId: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  price: number;

  @IsNotEmpty()
  @IsString()
  @IsIn(['Chờ duyệt', 'Đã duyệt', 'Từ chối', 'Hết hiệu lực'])
  @Transform(({ value }) => normalizeStatus(value))
  status: string;

  // Chấp nhận cả ISO (yyyy-MM-dd) lẫn dạng dd/MM/yyyy; sẽ chuẩn hóa trong service
  @IsOptional()
  @IsString()
  expiryDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
