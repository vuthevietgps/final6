/**
 * File: schemas/product.schema.ts
 * Mục đích: Định nghĩa schema Mongoose cho Sản phẩm.
 */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProductDocument = Product & Document;

@Schema({ timestamps: true })
export class Product {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ type: Types.ObjectId, ref: 'ProductCategory', required: true })
  categoryId: Types.ObjectId;

  @Prop({ required: true, min: 0 })
  importPrice: number; // Giá nhập

  @Prop({ required: true, min: 0 })
  shippingCost: number; // Chi phí nhập

  @Prop({ required: true, min: 0 })
  packagingCost: number; // Chi phí đóng hàng

  @Prop({ min: 0, default: 10 })
  minStock: number; // Mức tồn kho tối thiểu

  @Prop({ min: 0, default: 100 })
  maxStock: number; // Mức tồn kho tối đa

  @Prop({ required: true, min: 0, default: 0 })
  estimatedDeliveryDays: number; // Dự kiến thời gian chờ nhập (ngày)

  @Prop({ 
    required: true, 
    enum: ['Hoạt động', 'Tạm dừng'], 
    default: 'Hoạt động' 
  })
  status: string; // Trạng thái

  @Prop({ trim: true })
  notes: string; // Lưu ý

  // Auto-generated fields
  @Prop({ unique: true, sparse: true })
  sku: string; // Mã sản phẩm tự động

  @Prop({ default: 0 })
  totalCost: number; // Tổng chi phí (tự động tính)
}

export const ProductSchema = SchemaFactory.createForClass(Product);

// Middleware to calculate totalCost before saving
ProductSchema.pre('save', function() {
  this.totalCost = this.importPrice + this.shippingCost + this.packagingCost;
});

// Auto-generate SKU before saving
ProductSchema.pre('save', async function() {
  if (!this.sku) {
    const count = await (this.constructor as any).countDocuments();
    this.sku = `SP${String(count + 1).padStart(4, '0')}`;
  }
});

// Create indexes for better performance
ProductSchema.index({ categoryId: 1 });
ProductSchema.index({ status: 1 });
ProductSchema.index({ createdAt: -1 });
