/**
 * File: test-order2/test-order2.service.ts
 * Mục đích: Nghiệp vụ Đơn Hàng Thử Nghiệm 2 (CRUD, lọc, cập nhật inline).
 */
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { TestOrder2, TestOrder2Document } from './schemas/test-order2.schema';
import { CreateTestOrder2Dto } from './dto/create-test-order2.dto';
import { GoogleSyncService } from '../google-sync/google-sync.service';
import { UpdateTestOrder2Dto } from './dto/update-test-order2.dto';
import * as csv from 'csv-parser';
import * as XLSX from 'xlsx';
import { Readable } from 'stream';

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

  async importFromFile(file: Express.Multer.File): Promise<{ 
    success: number; 
    errors: Array<{ row: number; error: string; data?: any }>;
    message: string;
  }> {
    try {
      let records: any[] = [];

      if (file.mimetype === 'text/csv') {
        // Xử lý file CSV
        records = await this.parseCsvFile(file.buffer);
      } else if (file.mimetype.includes('excel') || file.mimetype.includes('spreadsheet')) {
        // Xử lý file Excel
        records = await this.parseExcelFile(file.buffer);
      } else {
        throw new BadRequestException('Định dạng file không được hỗ trợ');
      }

      const results = { success: 0, errors: [] };

      for (let i = 0; i < records.length; i++) {
        try {
          const record = records[i];
          await this.processImportRecord(record, i + 1);
          results.success++;
        } catch (error) {
          results.errors.push({
            row: i + 1,
            error: error.message,
            data: records[i]
          });
        }
      }

      return {
        ...results,
        message: `Đã xử lý ${records.length} bản ghi. Thành công: ${results.success}, Lỗi: ${results.errors.length}`
      };
    } catch (error) {
      throw new BadRequestException(`Lỗi xử lý file: ${error.message}`);
    }
  }

  async exportTemplate(): Promise<{ 
    headers: string[];
    sampleData: any[];
    instructions: string[];
  }> {
    return {
      headers: [
        '_id',
        'productId',
        'customerName',
        'quantity',
        'agentId', 
        'adGroupId',
        'isActive',
        'serviceDetails',
        'productionStatus',
        'orderStatus',
        'submitLink',
        'trackingNumber',
        'depositAmount',
        'codAmount',
        'manualPayment',
        'receiverName',
        'receiverPhone',
        'receiverAddress'
      ],
      sampleData: [
        {
          '_id': '66e3f4b2c8d9e1234567890a',
          'productId': '66e3f4b2c8d9e1234567890b',
          'customerName': 'Nguyễn Văn A',
          'quantity': 2,
          'agentId': '66e3f4b2c8d9e1234567890c',
          'adGroupId': 'AG001',
          'isActive': true,
          'serviceDetails': 'Giao hàng nhanh',
          'productionStatus': 'Đang làm',
          'orderStatus': 'Đã có mã vận đơn',
          'submitLink': 'https://example.com/submit/123',
          'trackingNumber': 'VN123456789',
          'depositAmount': 100000,
          'codAmount': 500000,
          'manualPayment': 0,
          'receiverName': 'Trần Thị B',
          'receiverPhone': '0901234567',
          'receiverAddress': '123 Đường ABC, Quận 1, TP.HCM'
        }
      ],
      instructions: [
        '1. Chỉ cập nhật các cột cần thiết, giữ nguyên _id để cập nhật đúng bản ghi',
        '2. productId và agentId phải là ObjectId hợp lệ',
        '3. quantity phải là số nguyên dương',
        '4. isActive: true/false',
        '5. Các trường số tiền phải là số không âm',
        '6. Để trống _id để tạo bản ghi mới'
      ]
    };
  }

  private async parseCsvFile(buffer: Buffer): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const results: any[] = [];
      const stream = Readable.from(buffer.toString());
      
      stream
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', (error) => reject(error));
    });
  }

  private async parseExcelFile(buffer: Buffer): Promise<any[]> {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      return XLSX.utils.sheet_to_json(worksheet);
    } catch (error) {
      throw new BadRequestException(`Lỗi đọc file Excel: ${error.message}`);
    }
  }

  private async processImportRecord(record: any, rowNumber: number): Promise<void> {
    try {
      // Kiểm tra nếu có _id thì cập nhật, không thì tạo mới
      if (record._id && record._id.trim()) {
        await this.updateFromImport(record._id.trim(), record);
      } else {
        await this.createFromImport(record);
      }
    } catch (error) {
      throw new Error(`Dòng ${rowNumber}: ${error.message}`);
    }
  }

  private async updateFromImport(id: string, record: any): Promise<void> {
    const updateData: any = {};
    
    if (record.productId) updateData.productId = new Types.ObjectId(record.productId);
    if (record.customerName) updateData.customerName = record.customerName.toString().trim();
    if (record.quantity !== undefined) updateData.quantity = parseInt(record.quantity);
    if (record.agentId) updateData.agentId = new Types.ObjectId(record.agentId);
    if (record.adGroupId !== undefined) updateData.adGroupId = record.adGroupId.toString().trim();
    if (record.isActive !== undefined) updateData.isActive = record.isActive === 'true' || record.isActive === true;
    if (record.serviceDetails !== undefined) updateData.serviceDetails = record.serviceDetails?.toString().trim();
    if (record.productionStatus) updateData.productionStatus = record.productionStatus.toString().trim();
    if (record.orderStatus) updateData.orderStatus = record.orderStatus.toString().trim();
    if (record.submitLink !== undefined) updateData.submitLink = record.submitLink?.toString().trim();
    if (record.trackingNumber !== undefined) updateData.trackingNumber = record.trackingNumber?.toString().trim();
    if (record.depositAmount !== undefined) updateData.depositAmount = parseFloat(record.depositAmount) || 0;
    if (record.codAmount !== undefined) updateData.codAmount = parseFloat(record.codAmount) || 0;
    if (record.manualPayment !== undefined) updateData.manualPayment = parseFloat(record.manualPayment) || 0;
    if (record.receiverName !== undefined) updateData.receiverName = record.receiverName?.toString().trim();
    if (record.receiverPhone !== undefined) updateData.receiverPhone = record.receiverPhone?.toString().trim();
    if (record.receiverAddress !== undefined) updateData.receiverAddress = record.receiverAddress?.toString().trim();

    const doc = await this.model.findByIdAndUpdate(id, updateData, { new: true }).exec();
    if (!doc) {
      throw new Error(`Không tìm thấy đơn hàng với ID: ${id}`);
    }

    // Trigger sync
    const agentId = String(doc.agentId);
    if (agentId) {
      this.googleSync.scheduleAgentSync(agentId);
    }
  }

  private async createFromImport(record: any): Promise<void> {
    const createData = {
      productId: record.productId,
      customerName: record.customerName,
      quantity: parseInt(record.quantity) || 1,
      agentId: record.agentId,
      adGroupId: record.adGroupId || '0',
      isActive: record.isActive === 'true' || record.isActive === true,
      serviceDetails: record.serviceDetails?.toString().trim(),
      productionStatus: record.productionStatus || 'Chưa làm',
      orderStatus: record.orderStatus || 'Chưa có mã vận đơn',
      submitLink: record.submitLink?.toString().trim(),
      trackingNumber: record.trackingNumber?.toString().trim(),
      depositAmount: parseFloat(record.depositAmount) || 0,
      codAmount: parseFloat(record.codAmount) || 0,
      manualPayment: parseFloat(record.manualPayment) || 0,
      receiverName: record.receiverName?.toString().trim(),
      receiverPhone: record.receiverPhone?.toString().trim(),
      receiverAddress: record.receiverAddress?.toString().trim()
    };

    await this.create(createData as CreateTestOrder2Dto);
  }
}
