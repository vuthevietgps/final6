/**
 * File: test-order2/test-order2.service.ts
 * Mục đích: Nghiệp vụ Đơn Hàng Thử Nghiệm 2 (CRUD, lọc, cập nhật inline).
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { TestOrder2, TestOrder2Document } from './schemas/test-order2.schema';
import { CreateTestOrder2Dto } from './dto/create-test-order2.dto';
import { GoogleSyncService } from '../google-sync/google-sync.service';
import { UpdateTestOrder2Dto } from './dto/update-test-order2.dto';

@Injectable()
export class TestOrder2Service {
  constructor(
    @InjectModel(TestOrder2.name) private readonly model: Model<TestOrder2Document>,
    private readonly googleSync: GoogleSyncService,
  ) {}

  async create(dto: CreateTestOrder2Dto): Promise<TestOrder2> {
    const payload: Partial<TestOrder2> = {
      productId: new Types.ObjectId(dto.productId),
      customerName: dto.customerName.trim(),
      quantity: dto.quantity ?? 1,
      agentId: new Types.ObjectId(dto.agentId),
      adGroupId: dto.adGroupId?.trim() || '0',
      isActive: dto.isActive ?? true,
      serviceDetails: dto.serviceDetails?.trim() || undefined,
      productionStatus: dto.productionStatus || 'Chưa làm',
      orderStatus: dto.orderStatus || 'Chưa có mã vận đơn',
      submitLink: dto.submitLink?.trim() || undefined,
      trackingNumber: dto.trackingNumber?.trim() || undefined,
      depositAmount: dto.depositAmount ?? 0,
      codAmount: dto.codAmount ?? 0,
      receiverName: dto.receiverName?.trim() || undefined,
      receiverPhone: dto.receiverPhone?.trim() || undefined,
      receiverAddress: dto.receiverAddress?.trim() || undefined,
    };
    const saved = await new this.model(payload).save();
    // Trigger sync theo đại lý sau khi tạo đơn
    const agentId = String(saved.agentId);
    if (agentId) {
      // Dùng debounce để gộp nhiều thay đổi liên tiếp
      this.googleSync.scheduleAgentSync(agentId);
    }
    return saved;
  }

  async findAll(params?: { q?: string; productId?: string; agentId?: string; adGroupId?: string; isActive?: string; from?: string; to?: string }): Promise<TestOrder2[]> {
    const filter: any = {};
    const { q, productId, agentId, adGroupId, isActive, from, to } = params || {};
    if (q) {
      filter.$or = [
        { customerName: new RegExp(q, 'i') },
        { trackingNumber: new RegExp(q, 'i') },
        { receiverPhone: new RegExp(q, 'i') },
      ];
    }
    if (productId) filter.productId = new Types.ObjectId(productId);
    if (agentId) filter.agentId = new Types.ObjectId(agentId);
    if (adGroupId) filter.adGroupId = adGroupId;
    if (isActive === 'true') filter.isActive = true; else if (isActive === 'false') filter.isActive = false;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }
    return this.model
      .find(filter)
      .populate('productId', 'name')
      .populate('agentId', 'fullName')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string): Promise<TestOrder2> {
    const doc = await this.model.findById(id).exec();
    if (!doc) throw new NotFoundException('Không tìm thấy đơn hàng');
    return doc;
  }

  async update(id: string, dto: UpdateTestOrder2Dto): Promise<TestOrder2> {
  const update: any = {};
  if (dto.productId !== undefined) update.productId = new Types.ObjectId(dto.productId);
  if (dto.agentId !== undefined) update.agentId = new Types.ObjectId(dto.agentId);
  if (dto.customerName !== undefined) update.customerName = dto.customerName?.trim();
  if (dto.adGroupId !== undefined) update.adGroupId = dto.adGroupId?.trim();
  if (dto.isActive !== undefined) update.isActive = dto.isActive;
  if (dto.quantity !== undefined) update.quantity = dto.quantity;
  if (dto.serviceDetails !== undefined) update.serviceDetails = dto.serviceDetails?.trim();
  if (dto.productionStatus !== undefined) update.productionStatus = dto.productionStatus;
  if (dto.orderStatus !== undefined) update.orderStatus = dto.orderStatus;
  if (dto.submitLink !== undefined) update.submitLink = dto.submitLink?.trim();
  if (dto.trackingNumber !== undefined) update.trackingNumber = dto.trackingNumber?.trim();
  if (dto.depositAmount !== undefined) update.depositAmount = dto.depositAmount;
  if (dto.codAmount !== undefined) update.codAmount = dto.codAmount;
  if (dto.manualPayment !== undefined) update.manualPayment = dto.manualPayment;
  if (dto.receiverName !== undefined) update.receiverName = dto.receiverName?.trim();
  if (dto.receiverPhone !== undefined) update.receiverPhone = dto.receiverPhone?.trim();
  if (dto.receiverAddress !== undefined) update.receiverAddress = dto.receiverAddress?.trim();

    const doc = await this.model.findByIdAndUpdate(id, update, { new: true }).exec();
    if (!doc) throw new NotFoundException('Không tìm thấy đơn hàng để cập nhật');
    // Trigger sync theo đại lý của đơn hàng này
    const agentId = String(doc.agentId);
    if (agentId) {
      this.googleSync.scheduleAgentSync(agentId);
    }
    return doc;
  }

  async remove(id: string): Promise<{ message: string }> {
    const doc = await this.model.findByIdAndDelete(id).exec();
    if (!doc) throw new NotFoundException('Không tìm thấy đơn hàng để xóa');
    // Trigger sync theo đại lý sau khi xóa đơn
    const agentId = String(doc.agentId);
    if (agentId) {
      this.googleSync.scheduleAgentSync(agentId);
    }
    return { message: 'Đã xóa đơn hàng' };
  }
}
