/**
 * File: test-order/test-order.service.ts
 * Mục đích: Nghiệp vụ quản lý Đơn Hàng Thử Nghiệm (CRUD + tìm kiếm, lọc theo ngày và trạng thái).
 */
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TestOrder, TestOrderDocument } from './schemas/test-order.schema';
import { CreateTestOrderDto } from './dto/create-test-order.dto';
import { UpdateTestOrderDto } from './dto/update-test-order.dto';

@Injectable()
export class TestOrderService {
  constructor(
    @InjectModel(TestOrder.name) private readonly model: Model<TestOrderDocument>,
  ) {}

  async create(dto: CreateTestOrderDto): Promise<TestOrder> {
    const exists = await this.model.findOne({ code: dto.code }).lean();
    if (exists) throw new BadRequestException('Mã đơn hàng đã tồn tại');
    const payload: Partial<TestOrder> = {
      code: dto.code.trim(),
      date: new Date(dto.date),
      customerName: dto.customerName.trim(),
      phone: dto.phone?.trim(),
      total: dto.total,
      status: (dto.status as any) ?? 'new',
      notes: dto.notes?.trim(),
    };
    return new this.model(payload).save();
  }

  async findAll(params?: { q?: string; status?: string; from?: string; to?: string }): Promise<TestOrder[]> {
    const filter: any = {};
    const { q, status, from, to } = params || {};
    if (q) {
      filter.$or = [
        { code: new RegExp(q, 'i') },
        { customerName: new RegExp(q, 'i') },
        { phone: new RegExp(q, 'i') },
      ];
    }
    if (status) filter.status = status;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }
    return this.model.find(filter).sort({ date: -1, createdAt: -1 }).exec();
  }

  async findOne(id: string): Promise<TestOrder> {
    const doc = await this.model.findById(id).exec();
    if (!doc) throw new NotFoundException('Không tìm thấy đơn hàng');
    return doc;
  }

  async update(id: string, dto: UpdateTestOrderDto): Promise<TestOrder> {
    const update: any = { ...dto };
    if (dto.code) {
      const dup = await this.model.findOne({ code: dto.code, _id: { $ne: id } });
      if (dup) throw new BadRequestException('Mã đơn hàng đã tồn tại');
      update.code = dto.code.trim();
    }
    if (dto.date) update.date = new Date(dto.date);
    if (dto.customerName) update.customerName = dto.customerName.trim();
    if (dto.phone !== undefined) update.phone = dto.phone?.trim();
    if (dto.notes !== undefined) update.notes = dto.notes?.trim();
    const doc = await this.model.findByIdAndUpdate(id, update, { new: true }).exec();
    if (!doc) throw new NotFoundException('Không tìm thấy đơn hàng để cập nhật');
    return doc;
  }

  async remove(id: string): Promise<{ message: string }> {
    const doc = await this.model.findByIdAndDelete(id).exec();
    if (!doc) throw new NotFoundException('Không tìm thấy đơn hàng để xóa');
    return { message: 'Đã xóa đơn hàng' };
  }
}
