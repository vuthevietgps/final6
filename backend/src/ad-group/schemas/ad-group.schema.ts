/**
 * File: ad-group/schemas/ad-group.schema.ts
 * Mục đích: Định nghĩa schema Mongoose cho Nhóm Quảng Cáo.
 */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AdGroupDocument = AdGroup & Document;

@Schema({ timestamps: true })
export class AdGroup {
  @Prop({ required: true, trim: true })
  name: string; // Tên nhóm quảng cáo

  @Prop({ required: true, trim: true, unique: true, index: true })
  adGroupId: string; // ID nhóm quảng cáo (nhập tay)

  @Prop({ type: Types.ObjectId, ref: 'Product', required: true, index: true })
  productId: Types.ObjectId; // Tham chiếu sản phẩm

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  agentId: Types.ObjectId; // Tham chiếu đại lý (user role: agent)

  @Prop({ type: Types.ObjectId, ref: 'AdAccount', required: true, index: true })
  adAccountId: Types.ObjectId; // Tham chiếu tài khoản quảng cáo

  @Prop({ required: true, enum: ['facebook', 'google', 'ticktock'], index: true })
  platform: 'facebook' | 'google' | 'ticktock'; // Nền tảng quảng cáo

  @Prop({ default: true, index: true })
  isActive: boolean; // Trạng thái hoạt động

  @Prop({ trim: true })
  notes?: string; // Ghi chú (không bắt buộc)
}

export const AdGroupSchema = SchemaFactory.createForClass(AdGroup);

// Indexes phục vụ truy vấn phổ biến
AdGroupSchema.index({ createdAt: -1 });
