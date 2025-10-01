import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PendingOrderDocument = PendingOrder & Document;

@Schema({ timestamps: true })
export class PendingOrder {
  @Prop({ type: Types.ObjectId, ref: 'Fanpage', index: true }) fanpageId?: Types.ObjectId;
  @Prop({ trim: true }) senderPsid?: string; // who initiated conversation
  @Prop({ type: Types.ObjectId, ref: 'Product', required: false }) productId?: Types.ObjectId;
  @Prop({ type: Types.ObjectId, ref: 'User', required: false }) agentId?: Types.ObjectId;
  @Prop({ trim: true }) adGroupId?: string; // matched ad group
  @Prop({ trim: true }) customerName?: string;
  @Prop({ trim: true }) phone?: string;
  @Prop({ trim: true }) address?: string;
  @Prop({ default: 1 }) quantity?: number;
  @Prop({ default: 'draft', enum: ['draft','awaiting','approved','rejected'] }) status: 'draft' | 'awaiting' | 'approved' | 'rejected';
  @Prop({ trim: true }) notes?: string;
  @Prop({ type: Date, default: Date.now }) capturedAt: Date;
}

export const PendingOrderSchema = SchemaFactory.createForClass(PendingOrder);
PendingOrderSchema.index({ fanpageId: 1, status: 1, createdAt: -1 });
