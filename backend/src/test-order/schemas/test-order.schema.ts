/**
 * File: test-order/schemas/test-order.schema.ts
 * Mục đích: Schema Mongoose cho Đơn Hàng Thử Nghiệm.
 */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TestOrderDocument = TestOrder & Document;

export type TestOrderStatus = 'new' | 'processing' | 'done' | 'cancel';

@Schema({ timestamps: true })
export class TestOrder {
  @Prop({ type: String, required: true, trim: true, unique: true, index: true })
  code: string; // Mã đơn hàng

  @Prop({ type: Date, required: true })
  date: Date; // Ngày đơn

  @Prop({ type: String, required: true, trim: true })
  customerName: string; // Tên khách hàng

  @Prop({ type: String, trim: true })
  phone?: string; // SĐT (tuỳ chọn)

  @Prop({ type: Number, required: true, min: 0 })
  total: number; // Tổng tiền

  @Prop({ type: String, enum: ['new', 'processing', 'done', 'cancel'], default: 'new', index: true })
  status: TestOrderStatus; // Trạng thái

  @Prop({ type: String, trim: true })
  notes?: string; // Ghi chú

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const TestOrderSchema = SchemaFactory.createForClass(TestOrder);
TestOrderSchema.index({ date: -1 });
