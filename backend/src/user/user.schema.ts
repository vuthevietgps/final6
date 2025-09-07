/**
 * File: user.schema.ts
 * Mục đích: Định nghĩa Mongoose Schema cho Người dùng (thông tin, vai trò, kích hoạt...).
 */
/**
 * User Schema - Định nghĩa cấu trúc dữ liệu User trong MongoDB
 * 
 * Chức năng:
 * - Định nghĩa các fields và kiểu dữ liệu
 * - Thiết lập validation rules
 * - Tự động thêm timestamps (createdAt, updatedAt)
 * - Tạo unique index cho email
 */

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { UserRole } from './user.enum';

// Type cho User document khi query từ MongoDB
export type UserDocument = User & Document;

@Schema({ timestamps: true }) // Tự động thêm createdAt và updatedAt
export class User {
  // Bắt buộc nhập họ tên
  @Prop({ required: true })
  fullName: string;

  // Email bắt buộc và không được trùng
  @Prop({ required: true, unique: true })
  email: string;

  // Mật khẩu bắt buộc
  @Prop({ required: true })
  password: string;

  // Số điện thoại bắt buộc
  @Prop()
  phone: string;

  // Vai trò bắt buộc, phải thuộc UserRole enum
  @Prop({ required: true, enum: UserRole })
  role: UserRole;

  // Địa chỉ không bắt buộc
  @Prop()
  address: string;

  // Trạng thái hoạt động, mặc định là true
  @Prop({ default: true })
  isActive: boolean;

  // ID phòng ban (không bắt buộc)
  @Prop()
  departmentId: string;

  // ID quản lý trực tiếp (không bắt buộc)
  @Prop()
  managerId: string;

  // Ghi chú (không bắt buộc)
  @Prop()
  notes: string;

  // Link Google Drive của user (không bắt buộc)
  @Prop()
  googleDriveLink?: string;

  // Timestamps sẽ được Mongoose tự động thêm do timestamps: true
  createdAt?: Date;
  updatedAt?: Date;
}

// Tạo Mongoose schema từ class User
export const UserSchema = SchemaFactory.createForClass(User);
