/**
 * Schema MongoDB cho Google Service Account Credentials
 * Lưu trữ thông tin xác thực Google để sử dụng trong đồng bộ Google Sheets
 */

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type GoogleCredentialDocument = GoogleCredential & Document;

@Schema({
  timestamps: true, // Tự động thêm createdAt và updatedAt
  versionKey: false,
})
export class GoogleCredential {
  @Prop({ required: true, enum: ['service_account'] })
  type: string;

  @Prop({ required: true })
  project_id: string;

  @Prop({ required: true })
  private_key_id: string;

  @Prop({ required: true })
  private_key: string;

  @Prop({ required: true })
  client_email: string;

  @Prop({ required: true })
  client_id: string;

  @Prop({ required: true, default: 'https://accounts.google.com/o/oauth2/auth' })
  auth_uri: string;

  @Prop({ required: true, default: 'https://oauth2.googleapis.com/token' })
  token_uri: string;

  @Prop({ required: true, default: 'https://www.googleapis.com/oauth2/v1/certs' })
  auth_provider_x509_cert_url: string;

  @Prop({ required: true })
  client_x509_cert_url: string;

  @Prop({ required: true, default: 'googleapis.com' })
  universe_domain: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  description?: string; // Mô tả credential này dùng cho mục đích gì

  @Prop()
  lastTestDate?: Date; // Lần cuối test connection

  @Prop()
  testStatus?: string; // Kết quả test: 'success', 'failed', 'unknown'

  @Prop()
  testMessage?: string; // Message từ lần test cuối
}

export const GoogleCredentialSchema = SchemaFactory.createForClass(GoogleCredential);