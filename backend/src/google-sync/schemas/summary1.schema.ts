import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ timestamps: true, collection: 'summary1' })
export class Summary1 {
  @Prop({ type: Types.ObjectId, ref: 'User', index: true, required: true })
  agentId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'TestOrder2', index: true, required: true })
  orderId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Product', index: true, required: false })
  productId?: Types.ObjectId;

  @Prop({ type: String })
  product?: string; // product name snapshot

  @Prop({ type: String })
  customerName?: string;

  @Prop({ type: Number, default: 0 })
  quantity: number;

  @Prop({ type: String })
  productionStatus?: string;

  @Prop({ type: String })
  orderStatus?: string;

  @Prop({ type: String })
  trackingNumber?: string;

  @Prop({ type: String })
  submitLink?: string;

  @Prop({ type: Number, default: 0 })
  codAmount: number;

  @Prop({ type: Number, default: 0 })
  quotePrice: number;

  @Prop({ type: Number, default: 0 })
  mustPay: number;

  @Prop({ type: Number, default: 0 })
  paid: number;

  @Prop({ type: Number, default: 0 })
  manualPayment: number;

  @Prop({ type: Number, default: 0 })
  needToPay: number;

  @Prop({ type: Date })
  createdAt?: Date;
}

export type Summary1Document = HydratedDocument<Summary1>;
export const Summary1Schema = SchemaFactory.createForClass(Summary1);
Summary1Schema.index({ agentId: 1, orderId: 1 }, { unique: true });
// Tối ưu cho cập nhật theo cặp khóa khi Báo giá thay đổi
Summary1Schema.index({ agentId: 1, productId: 1 });