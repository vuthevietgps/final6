/**
 * File: advertising-cost/advertising-cost.service.ts
 * Mục đích: Xử lý nghiệp vụ CRUD cho Chi Phí Quảng Cáo.
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AdvertisingCost, AdvertisingCostDocument } from './schemas/advertising-cost.schema';
import { CreateAdvertisingCostDto } from './dto/create-advertising-cost.dto';
import { UpdateAdvertisingCostDto } from './dto/update-advertising-cost.dto';

@Injectable()
export class AdvertisingCostService {
  constructor(
    @InjectModel(AdvertisingCost.name)
    private readonly model: Model<AdvertisingCostDocument>,
  ) {}

  async create(dto: CreateAdvertisingCostDto): Promise<AdvertisingCost> {
    const payload: Partial<AdvertisingCost> = {
      adGroupId: dto.adGroupId.trim(),
      frequency: dto.frequency,
      spentAmount: dto.spentAmount ?? 0,
      cpm: dto.cpm ?? 0,
      cpc: dto.cpc ?? 0,
    };
    if (dto.date) payload.date = new Date(dto.date);
    const created = new this.model(payload);
    return created.save();
  }

  async findAll(): Promise<AdvertisingCost[]> {
    return this.model.find().sort({ date: -1, createdAt: -1 }).lean();
  }

  async findOne(id: string): Promise<AdvertisingCost> {
    const doc = await this.model.findById(id).lean();
    if (!doc) throw new NotFoundException('Không tìm thấy chi phí quảng cáo');
    return doc as any;
  }

  async update(id: string, dto: UpdateAdvertisingCostDto): Promise<AdvertisingCost> {
    const update: Partial<AdvertisingCost> = { ...dto } as any;
    if (dto.date) (update as any).date = new Date(dto.date);
    const doc = await this.model.findByIdAndUpdate(id, update, { new: true }).lean();
    if (!doc) throw new NotFoundException('Không tìm thấy chi phí quảng cáo');
    return doc as any;
  }

  async remove(id: string): Promise<void> {
    const res = await this.model.findByIdAndDelete(id);
    if (!res) throw new NotFoundException('Không tìm thấy chi phí quảng cáo');
  }

  async summary() {
    const agg = await this.model.aggregate([
      {
        $group: {
          _id: null,
          totalSpent: { $sum: { $ifNull: ['$spentAmount', 0] } },
          count: { $count: {} },
          avgCPM: { $avg: { $ifNull: ['$cpm', 0] } },
          avgCPC: { $avg: { $ifNull: ['$cpc', 0] } },
        },
      },
    ]);
    return agg[0] || { totalSpent: 0, count: 0, avgCPM: 0, avgCPC: 0 };
  }

  // Lấy chi phí ngày hôm qua cho advertising-cost-suggestion
  async getYesterdaySpentByAdGroups(): Promise<{ [adGroupId: string]: number }> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    const endOfYesterday = new Date(yesterday);
    endOfYesterday.setHours(23, 59, 59, 999);

    console.log(`Querying advertising costs for yesterday: ${yesterday.toISOString()} to ${endOfYesterday.toISOString()}`);

    const results = await this.model
      .find({
        date: {
          $gte: yesterday,
          $lte: endOfYesterday
        }
      })
      .select('adGroupId spentAmount date')
      .lean()
      .exec();

    console.log(`Found ${results.length} advertising cost records for yesterday`);

    // Convert to map for easy lookup - default 0 if no data
    const spentMap: { [adGroupId: string]: number } = {};
    results.forEach(result => {
      const spentAmount = result.spentAmount || 0;
      spentMap[result.adGroupId] = spentAmount;
      console.log(`AdGroup ${result.adGroupId}: spent ${spentAmount} on ${result.date}`);
    });

    return spentMap;
  }
}
