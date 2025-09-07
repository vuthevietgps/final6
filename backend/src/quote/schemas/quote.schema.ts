/**
 * File: schemas/quote.schema.ts
 * Mục đích: Định nghĩa Mongoose Schema/Document cho Báo giá (fields, enum status, timestamps),
 *   liên kết tới sản phẩm (productId) và đại lý (agentId).
 */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { QUOTE_STATUS_VALUES, QuoteStatus } from '../quote.enum';

export type QuoteDocument = Quote & Document;

@Schema({ timestamps: true })
export class Quote {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  productId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  agentId: Types.ObjectId;

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ 
    required: true, 
    enum: QUOTE_STATUS_VALUES,
    default: QuoteStatus.PENDING
  })
  status: string;

  @Prop({ type: Date, default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }) // 30 days from now
  expiryDate: Date;

  @Prop({ maxlength: 500 })
  notes?: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const QuoteSchema = SchemaFactory.createForClass(Quote);

// Add indexes for better performance
QuoteSchema.index({ agentId: 1, status: 1 });
QuoteSchema.index({ productId: 1 });
QuoteSchema.index({ expiryDate: 1 });
