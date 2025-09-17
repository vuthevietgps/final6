/**
 * File: test-order2/test-order2.service.ts
 * Mục đích: Nghiệp vụ Đơn Hàng Thử Nghiệm 2 (CRUD, lọc, cập nhật inline).
 */
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as csv from 'csv-parser';
import { Model, Types } from 'mongoose';
import { Readable } from 'stream';
import * as XLSX from 'xlsx';
import { GoogleSyncService } from '../google-sync/google-sync.service';
import { Summary5Service } from '../summary5/summary5.service';
import { Summary4Service } from '../summary4/summary4.service';
import { CreateTestOrder2Dto } from './dto/create-test-order2.dto';
import { UpdateTestOrder2Dto } from './dto/update-test-order2.dto';
import { UpdateDeliveryStatusDto } from './dto/update-delivery-status.dto';
import { TestOrder2, TestOrder2Document } from './schemas/test-order2.schema';
import { Product, ProductDocument } from '../product/schemas/product.schema';

@Injectable()
export class TestOrder2Service {
  constructor(
    @InjectModel(TestOrder2.name) private readonly model: Model<TestOrder2Document>,
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
    private readonly googleSync: GoogleSyncService,
    private readonly summary4Sync: Summary4Service, // Inject Summary4Service
    private readonly summary5Service: Summary5Service, // Inject Summary5Service
  ) { }

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
    
    // Trigger sync Summary4 sau khi tạo đơn
    this.summary4Sync.syncFromTestOrder2().catch(err => {
      console.error('Failed to sync Summary4 after create:', err);
    });

    // Trigger sync Summary5 (ngày của đơn) - fire-and-forget to avoid blocking response
    {
      const d = new Date(saved.createdAt);
      const startDate = new Date(d); startDate.setHours(0,0,0,0);
      const endDate = new Date(d); endDate.setHours(23,59,59,999);
      this.summary5Service
        .sync({ startDate: startDate.toISOString(), endDate: endDate.toISOString() })
        .catch((e) => console.warn('Failed to sync Summary5 after create:', e?.message || e));
    }
    
    // Trigger sync theo đại lý sau khi tạo đơn
    const agentId = String(saved.agentId);
    if (agentId) {
      // Dùng debounce để gộp nhiều thay đổi liên tiếp
      this.googleSync.scheduleAgentSync(agentId);
    }
    return saved;
  }

  async findAll(params?: { 
    q?: string; 
    productId?: string; 
    agentId?: string; 
    adGroupId?: string; 
    isActive?: string; 
    from?: string; 
    to?: string;
    productionStatus?: string;
    orderStatus?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<{
    data: TestOrder2[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const filter: any = {};
  const { q, productId, agentId, adGroupId, isActive, from, to, productionStatus, orderStatus, page = 1, limit = 50, sortBy, sortOrder } = params || {};
    
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
    if (isActive === 'true') filter.isActive = true; 
    else if (isActive === 'false') filter.isActive = false;
    
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }
    if (productionStatus) filter.productionStatus = productionStatus;
    if (orderStatus) filter.orderStatus = orderStatus;

    // Pagination
    const skip = (page - 1) * limit;
    
    // Sorting
    const sort: any = {};
    if (sortBy) {
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    } else {
      sort.createdAt = -1; // Default sort
    }

    // Execute queries in parallel
    const [data, total] = await Promise.all([
      this.model
        .find(filter)
        .populate('productId', 'name')
        .populate('agentId', 'fullName')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.model.countDocuments(filter).exec()
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async findOne(id: string): Promise<TestOrder2> {
    const doc = await this.model.findById(id).exec();
    if (!doc) throw new NotFoundException('Không tìm thấy đơn hàng');
    return doc;
  }

  async update(id: string, dto: UpdateTestOrder2Dto): Promise<TestOrder2> {
    const update: any = {};
    if (dto.productId !== undefined) {
      update.productId = new Types.ObjectId(dto.productId);
    }
    if (dto.agentId !== undefined) update.agentId = new Types.ObjectId(dto.agentId);
    if (dto.customerName !== undefined) update.customerName = dto.customerName?.trim();
  if (dto.adGroupId !== undefined) update.adGroupId = (dto.adGroupId?.trim() || '0');
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
    
    // Trigger sync Summary4 sau khi update đơn
    this.summary4Sync.syncFromTestOrder2().catch(err => {
      console.error('Failed to sync Summary4 after update:', err);
    });

    // Trigger sync Summary5 (ngày của đơn) - fire-and-forget
    {
      const d = new Date(doc.createdAt);
      const startDate = new Date(d); startDate.setHours(0,0,0,0);
      const endDate = new Date(d); endDate.setHours(23,59,59,999);
      this.summary5Service
        .sync({ startDate: startDate.toISOString(), endDate: endDate.toISOString() })
        .catch((e) => console.warn('Failed to sync Summary5 after update:', e?.message || e));
    }
    
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
    
    // Trigger sync Summary4 sau khi xóa đơn
    this.summary4Sync.syncFromTestOrder2().catch(err => {
      console.error('Failed to sync Summary4 after delete:', err);
    });

    // Trigger sync Summary5 (ngày của đơn) - fire-and-forget
    {
      const d = new Date(doc.createdAt);
      const startDate = new Date(d); startDate.setHours(0,0,0,0);
      const endDate = new Date(d); endDate.setHours(23,59,59,999);
      this.summary5Service
        .sync({ startDate: startDate.toISOString(), endDate: endDate.toISOString() })
        .catch((e) => console.warn('Failed to sync Summary5 after delete:', e?.message || e));
    }
    
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

  /**
   * Export template đơn giản chỉ để cập nhật trạng thái giao hàng
   */
  async exportDeliveryTemplate(): Promise<{
    headers: string[];
    sampleData: any[];
    instructions: string[];
  }> {
    // Lấy một vài đơn hàng mẫu từ database
    const sampleOrders = await this.model
      .find()
      .select('_id trackingNumber orderStatus')
      .limit(5)
      .exec();

    return {
      headers: ['_id', 'trackingNumber', 'orderStatus'],
      sampleData: sampleOrders.length > 0 ? sampleOrders.map(order => ({
        '_id': order._id.toString(),
        'trackingNumber': order.trackingNumber || 'VN123456789',
        'orderStatus': order.orderStatus || 'Đã giao hàng'
      })) : [
        {
          '_id': '66e3f4b2c8d9e1234567890a',
          'trackingNumber': 'VN123456789',
          'orderStatus': 'Đã giao hàng'
        },
        {
          '_id': '66e3f4b2c8d9e1234567890b',
          'trackingNumber': 'VN987654321',
          'orderStatus': 'Đang vận chuyển'
        }
      ],
      instructions: [
        '1. Chỉ cập nhật cột trackingNumber và orderStatus',
        '2. Giữ nguyên _id để xác định đúng đơn hàng cần cập nhật',
        '3. Trạng thái có thể: "Chưa có mã vận đơn", "Đã có mã vận đơn", "Đang vận chuyển", "Đã giao hàng", "Giao không thành công", "Đã hủy"',
        '4. File chỉ chứa 3 cột để dễ xử lý và tránh lỗi'
      ]
    };
  }

  /**
   * Import file cập nhật trạng thái giao hàng đơn giản
   */
  async importDeliveryStatus(file: Express.Multer.File): Promise<{
    success: number;
    errors: Array<{ row: number; error: string; data?: any }>;
    message: string;
  }> {
    try {
      let records: any[] = [];

      if (file.mimetype === 'text/csv') {
        records = await this.parseCsvFile(file.buffer);
      } else if (file.mimetype.includes('excel') || file.mimetype.includes('spreadsheet')) {
        records = await this.parseExcelFile(file.buffer);
      } else {
        throw new BadRequestException('Định dạng file không được hỗ trợ');
      }

      const results = { success: 0, errors: [] };

      for (let i = 0; i < records.length; i++) {
        try {
          const record = records[i];
          await this.processDeliveryStatusUpdate(record, i + 1);
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
        message: `Đã cập nhật trạng thái giao hàng cho ${results.success}/${records.length} đơn hàng. Lỗi: ${results.errors.length}`
      };
    } catch (error) {
      throw new BadRequestException(`Lỗi xử lý file: ${error.message}`);
    }
  }

  /**
   * Export Excel file chỉ chứa các đơn hàng chưa giao thành công
   * Chỉ bao gồm ID, trackingNumber, orderStatus
   */
  async exportPendingDelivery(): Promise<{
    headers: string[];
    data: any[];
    fileName: string;
    totalRecords: number;
  }> {
    // Lấy tất cả đơn hàng có trạng thái không phải "Đã giao hàng" hoặc "Giao thành công"
    const successStatuses = ['Đã giao hàng', 'Giao thành công', 'Đã giao thành công'];
    
    const pendingOrders = await this.model
      .find({
        $or: [
          { orderStatus: { $nin: successStatuses } },
          { orderStatus: { $exists: false } },
          { orderStatus: null },
          { orderStatus: '' }
        ]
      })
      .select('_id trackingNumber orderStatus createdAt customerName')
      .sort({ createdAt: -1 })
      .exec();

    // Format dữ liệu cho export
    const exportData = pendingOrders.map(order => ({
      '_id': order._id.toString(),
      'trackingNumber': order.trackingNumber || '',
      'orderStatus': order.orderStatus || 'Chưa có mã vận đơn',
      'customerName': order.customerName || '',
      'createdAt': order.createdAt?.toISOString().split('T')[0] || ''
    }));

    return {
      headers: ['_id', 'trackingNumber', 'orderStatus', 'customerName', 'createdAt'],
      data: exportData,
      fileName: `don-hang-chua-giao-thanh-cong-${new Date().toISOString().split('T')[0]}.csv`,
      totalRecords: pendingOrders.length
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

    // Trigger sync Google Sheet
    const agentId = String(doc.agentId);
    if (agentId) {
      this.googleSync.scheduleAgentSync(agentId);
    }

    // Trigger sync Summary4 and Summary5 for the day
    this.summary4Sync.syncFromTestOrder2().catch(err => {
      console.error('Failed to sync Summary4 after import update:', err);
    });
    {
      const d = new Date(doc.createdAt);
      const startDate = new Date(d); startDate.setHours(0,0,0,0);
      const endDate = new Date(d); endDate.setHours(23,59,59,999);
      this.summary5Service
        .sync({ startDate: startDate.toISOString(), endDate: endDate.toISOString() })
        .catch((e) => console.warn('Failed to sync Summary5 after import update:', e?.message || e));
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

  /**
   * Xử lý cập nhật trạng thái giao hàng đơn giản chỉ với 3 trường
   */
  private async processDeliveryStatusUpdate(record: any, rowNumber: number): Promise<void> {
    try {
      if (!record._id || !record._id.trim()) {
        throw new Error(`Thiếu _id để xác định đơn hàng cần cập nhật`);
      }

      if (!record.orderStatus || !record.orderStatus.trim()) {
        throw new Error(`Thiếu orderStatus để cập nhật`);
      }

      const id = record._id.trim();
      const updateData: any = {
        orderStatus: record.orderStatus.toString().trim()
      };

      // Chỉ cập nhật trackingNumber nếu có giá trị
      if (record.trackingNumber && record.trackingNumber.toString().trim()) {
        updateData.trackingNumber = record.trackingNumber.toString().trim();
      }

      const doc = await this.model.findByIdAndUpdate(id, updateData, { new: true }).exec();
      if (!doc) {
        throw new Error(`Không tìm thấy đơn hàng với ID: ${id}`);
      }

      // Trigger sync như các update khác
      const agentId = String(doc.agentId);
      if (agentId) {
        this.googleSync.scheduleAgentSync(agentId);
      }

      // Trigger sync Summary4 và Summary5
      this.summary4Sync.syncFromTestOrder2().catch(err => {
        console.error('Failed to sync Summary4 after delivery update:', err);
      });

      {
        const d = new Date(doc.createdAt);
        const startDate = new Date(d); startDate.setHours(0,0,0,0);
        const endDate = new Date(d); endDate.setHours(23,59,59,999);
        this.summary5Service
          .sync({ startDate: startDate.toISOString(), endDate: endDate.toISOString() })
          .catch((e) => console.warn('Failed to sync Summary5 after delivery update:', e?.message || e));
      }
    } catch (error) {
      throw new Error(`Dòng ${rowNumber}: ${error.message}`);
    }
  }
}
