/**
 * TestOrder2 Service - Quản lý đơn hàng với đồng bộ tự động
 * Features: CRUD, sync với Summary4/Summary5, bảo vệ manualPayment
 */
import { BadRequestException, Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Readable } from 'stream';
import * as csv from 'csv-parser';
import * as XLSX from 'xlsx';

import { GoogleSyncService } from '../google-sync/google-sync.service';
import { Summary4Service } from '../summary4/summary4.service';
import { Summary5Service } from '../summary5/summary5.service';
import { Product, ProductDocument } from '../product/schemas/product.schema';
import { TestOrder2, TestOrder2Document } from './schemas/test-order2.schema';
import { CreateTestOrder2Dto } from './dto/create-test-order2.dto';
import { UpdateTestOrder2Dto } from './dto/update-test-order2.dto';
import { UpdateDeliveryStatusDto } from './dto/update-delivery-status.dto';
import { DeleteResponse } from './interfaces/delete-response.interface';

@Injectable()
export class TestOrder2Service {
  private readonly logger = new Logger(TestOrder2Service.name);

  constructor(
    @InjectModel(TestOrder2.name) private readonly model: Model<TestOrder2Document>,
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
    private readonly googleSync: GoogleSyncService,
    private readonly summary4Sync: Summary4Service,
    private readonly summary5Service: Summary5Service,
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
    
    // Trigger post-create sync operations (fire-and-forget)
    this.triggerPostCreateSyncs(saved);
    
    return saved;
  }

  /**
   * Trigger các sync operations sau khi tạo đơn hàng
   * Sử dụng fire-and-forget pattern để không block response
   */
  private triggerPostCreateSyncs(savedDoc: TestOrder2Document): void {
    const orderId = String(savedDoc._id);
    const agentId = String(savedDoc.agentId);
    const orderDate = new Date(savedDoc.createdAt);

    // Sync Summary4
    this.summary4Sync.syncFromTestOrder2().catch(err => {
      this.logger.error(`Summary4 sync failed after create ${orderId}:`, err.message);
    });

    // Sync Summary5 theo ngày
    const startDate = new Date(orderDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(orderDate);
    endDate.setHours(23, 59, 59, 999);

    this.summary5Service
      .sync({ 
        startDate: startDate.toISOString(), 
        endDate: endDate.toISOString() 
      })
      .catch(err => {
        this.logger.error(`Summary5 sync failed after create ${orderId}:`, err.message || err);
      });
    
    // Sync Google Ads theo agent
    if (agentId && agentId !== 'undefined' && agentId !== 'null') {
      this.googleSync.scheduleAgentSync(agentId);
    }
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
    
    // Build update object dynamically
    const fieldMappings = {
      productId: (val) => new Types.ObjectId(val),
      agentId: (val) => new Types.ObjectId(val),
      customerName: (val) => val?.trim(),
      adGroupId: (val) => val?.trim() || '0',
      serviceDetails: (val) => val?.trim(),
      submitLink: (val) => val?.trim(),
      trackingNumber: (val) => val?.trim(),
      receiverName: (val) => val?.trim(),
      receiverPhone: (val) => val?.trim(),
      receiverAddress: (val) => val?.trim(),
    };

    // Apply transformations
    Object.keys(dto).forEach(key => {
      if (dto[key] !== undefined) {
        update[key] = fieldMappings[key] ? fieldMappings[key](dto[key]) : dto[key];
      }
    });

    const doc = await this.model.findByIdAndUpdate(id, update, { new: true }).exec();
    if (!doc) {
      throw new NotFoundException('Không tìm thấy đơn hàng để cập nhật');
    }
    
    // Trigger post-update sync operations (fire-and-forget)
    this.triggerPostUpdateSyncs(doc);
    
    return doc;
  }

  /**
   * Trigger các sync operations sau khi update đơn hàng
   * Sử dụng fire-and-forget pattern để không block response
   */
  private triggerPostUpdateSyncs(updatedDoc: TestOrder2Document): void {
    const orderId = String(updatedDoc._id);
    const agentId = String(updatedDoc.agentId);
    const orderDate = new Date(updatedDoc.createdAt);

    // Sync Summary4
    this.summary4Sync.syncFromTestOrder2().catch(err => {
      this.logger.error(`Summary4 sync failed after update ${orderId}:`, err.message);
    });

    // Sync Summary5 theo ngày
    const startDate = new Date(orderDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(orderDate);
    endDate.setHours(23, 59, 59, 999);

    this.summary5Service
      .sync({ 
        startDate: startDate.toISOString(), 
        endDate: endDate.toISOString() 
      })
      .catch(err => {
        this.logger.error(`Summary5 sync failed after update ${orderId}:`, err.message || err);
      });
    
    // Sync Google Ads theo agent
    if (agentId && agentId !== 'undefined' && agentId !== 'null') {
      this.googleSync.scheduleAgentSync(agentId);
    }
  }

  async remove(id: string): Promise<DeleteResponse> {
    const startTime = Date.now();
    
    try {
      // Validate input
      if (!id || !Types.ObjectId.isValid(id)) {
        console.warn(`[TestOrder2Service.remove] Invalid ID provided: ${id}`);
        throw new BadRequestException('ID đơn hàng không hợp lệ');
      }

      console.log(`[TestOrder2Service.remove] Processing delete request for order: ${id}`);

      // Tìm đơn hàng trước khi xóa
      const doc = await this.model.findById(id).exec();
      if (!doc) {
        console.warn(`[TestOrder2Service.remove] Order not found: ${id}`);
        throw new NotFoundException('Không tìm thấy đơn hàng để xóa');
      }

      console.log(`[TestOrder2Service.remove] Order found, checking manualPayment for: ${id}`);

      // Kiểm tra Summary4 có manualPayment hay không
      const summary4Record = await this.summary4Sync.findByTestOrder2Id(id);
      
      if (summary4Record?.manualPayment && summary4Record.manualPayment > 0) {
        console.log(`[TestOrder2Service.remove] ManualPayment detected: ${summary4Record.manualPayment} VNĐ, changing status for order: ${id}`);
        
        // Có manualPayment -> Không xóa, chuyển trạng thái thành "Tạm Dừng Xử Lý"
        const updatedOrder = await this.model.findByIdAndUpdate(id, { 
          productionStatus: 'Tạm Dừng Xử Lý' 
        }, { new: true }).exec();

        if (!updatedOrder) {
          console.error(`[TestOrder2Service.remove] Failed to update status for order: ${id}`);
          throw new Error('Không thể cập nhật trạng thái đơn hàng');
        }
        
        // Đồng bộ ngay sau khi đổi trạng thái để Summary4/Summary5 phản ánh kịp thời
        try {
          this.triggerPostUpdateSyncs(updatedOrder);
        } catch (syncErr) {
          this.logger.error(`[TestOrder2Service.remove] Post-status-change sync failed for order ${id}:`, syncErr?.message || syncErr);
        }

        const response: DeleteResponse = { 
          message: `Không thể xóa đơn hàng vì đã có thanh toán tay ${summary4Record.manualPayment.toLocaleString('vi-VN')} VNĐ. Đã chuyển trạng thái thành "Tạm Dừng Xử Lý"`,
          action: 'status_changed',
          manualPayment: summary4Record.manualPayment
        };

        console.log(`[TestOrder2Service.remove] Status changed successfully for order: ${id} (${Date.now() - startTime}ms)`);
        return response;
      }

      console.log(`[TestOrder2Service.remove] No manualPayment found, proceeding with deletion for order: ${id}`);

      // Không có manualPayment -> Xóa bình thường
      const deletedOrder = await this.model.findByIdAndDelete(id).exec();
      if (!deletedOrder) {
        console.error(`[TestOrder2Service.remove] Failed to delete order: ${id}`);
        throw new Error('Không thể xóa đơn hàng từ database');
      }

      console.log(`[TestOrder2Service.remove] Order deleted successfully: ${id}`);
      
      // Trigger async syncs (fire-and-forget pattern)
      this.triggerPostDeleteSyncs(doc);
      
      const response: DeleteResponse = { 
        message: 'Đã xóa đơn hàng thành công',
        action: 'deleted'
      };

      console.log(`[TestOrder2Service.remove] Delete operation completed for order: ${id} (${Date.now() - startTime}ms)`);
      return response;

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[TestOrder2Service.remove] Error deleting order ${id} (${duration}ms):`, {
        error: error.message,
        stack: error.stack,
        type: error.constructor.name,
        orderId: id
      });
      throw error;
    }
  }

  /**
   * Trigger các sync operations sau khi xóa đơn hàng
   * Sử dụng fire-and-forget pattern để không block response
   */
  private triggerPostDeleteSyncs(deletedDoc: TestOrder2Document): void {
    const orderId = String(deletedDoc._id);
    const agentId = String(deletedDoc.agentId);
    const orderDate = new Date(deletedDoc.createdAt);
    
    console.log(`[TestOrder2Service.triggerPostDeleteSyncs] Starting sync operations for deleted order: ${orderId}`);

    // Xóa Summary4 record tương ứng
    console.log(`[TestOrder2Service.triggerPostDeleteSyncs] Deleting Summary4 record for order: ${orderId}`);
    this.summary4Sync.deleteByTestOrder2Id(orderId).then(result => {
      console.log(`[TestOrder2Service.triggerPostDeleteSyncs] Summary4 delete result for order ${orderId}:`, {
        success: result.success,
        deletedCount: result.deletedCount,
        message: result.message
      });
    }).catch(err => {
      console.error(`[TestOrder2Service.triggerPostDeleteSyncs] Summary4 delete failed for order ${orderId}:`, {
        error: err.message,
        orderId,
        timestamp: new Date().toISOString()
      });
    });

    // Sync Summary5 theo ngày
    const startDate = new Date(orderDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(orderDate);
    endDate.setHours(23, 59, 59, 999);

    console.log(`[TestOrder2Service.triggerPostDeleteSyncs] Triggering Summary5 sync for date: ${orderDate.toISOString().split('T')[0]} (order: ${orderId})`);
    this.summary5Service
      .sync({ 
        startDate: startDate.toISOString(), 
        endDate: endDate.toISOString() 
      })
      .catch(err => {
        console.error(`[TestOrder2Service.triggerPostDeleteSyncs] Summary5 sync failed for order ${orderId}:`, {
          error: err.message || err,
          orderId,
          orderDate: orderDate.toISOString().split('T')[0],
          timestamp: new Date().toISOString()
        });
      });
    
    // Sync Google Ads theo agent
    if (agentId && agentId !== 'undefined' && agentId !== 'null') {
      console.log(`[TestOrder2Service.triggerPostDeleteSyncs] Triggering Google Ads sync for agent: ${agentId} (order: ${orderId})`);
      try {
        this.googleSync.scheduleAgentSync(agentId);
      } catch (err) {
        console.error(`[TestOrder2Service.triggerPostDeleteSyncs] Google Ads sync scheduling failed:`, {
          error: err.message,
          orderId,
          agentId,
          timestamp: new Date().toISOString()
        });
      }
    } else {
      console.warn(`[TestOrder2Service.triggerPostDeleteSyncs] Invalid agentId, skipping Google Ads sync for order: ${orderId} (agentId: ${agentId})`);
    }

    console.log(`[TestOrder2Service.triggerPostDeleteSyncs] All sync operations triggered for order: ${orderId}`);
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
   * Export template đơn giản để cập nhật trạng thái giao hàng với 7 cột
   */
  async exportDeliveryTemplate(): Promise<{
    headers: string[];
    sampleData: any[];
    instructions: string[];
  }> {
    // Lấy một vài đơn hàng mẫu từ database
    const sampleOrders = await this.model
      .find()
      .select('_id trackingNumber orderStatus codAmount receiverName receiverPhone receiverAddress')
      .limit(5)
      .exec();

    return {
      headers: ['_id', 'trackingNumber', 'orderStatus', 'codAmount', 'receiverName', 'receiverPhone', 'receiverAddress'],
      sampleData: sampleOrders.length > 0 ? sampleOrders.map(order => ({
        '_id': order._id.toString(),
        'trackingNumber': order.trackingNumber || 'VN123456789',
        'orderStatus': order.orderStatus || 'Đã giao hàng',
        'codAmount': order.codAmount || 0,
        'receiverName': order.receiverName || 'Nguyễn Văn A',
        'receiverPhone': order.receiverPhone || '0901234567',
        'receiverAddress': order.receiverAddress || '123 Đường ABC, Quận 1, TP.HCM'
      })) : [
        {
          '_id': '66e3f4b2c8d9e1234567890a',
          'trackingNumber': 'VN123456789',
          'orderStatus': 'Đã giao hàng',
          'codAmount': 500000,
          'receiverName': 'Nguyễn Văn A',
          'receiverPhone': '0901234567',
          'receiverAddress': '123 Đường ABC, Quận 1, TP.HCM'
        },
        {
          '_id': '66e3f4b2c8d9e1234567890b',
          'trackingNumber': 'VN987654321',
          'orderStatus': 'Đang vận chuyển',
          'codAmount': 300000,
          'receiverName': 'Trần Thị B',
          'receiverPhone': '0912345678',
          'receiverAddress': '456 Đường XYZ, Quận 2, TP.HCM'
        }
      ],
      instructions: [
        '1. Cập nhật 6 cột: trackingNumber, orderStatus, codAmount, receiverName, receiverPhone, receiverAddress',
        '2. Giữ nguyên _id để xác định đúng đơn hàng cần cập nhật',
        '3. Trạng thái có thể: "Chưa có mã vận đơn", "Đã có mã vận đơn", "Đang vận chuyển", "Đã giao hàng", "Giao không thành công", "Đã hủy"',
        '4. codAmount phải là số (0 nếu không có COD)',
        '5. Các trường text có thể để trống nếu không cần cập nhật'
      ]
    };
  }

  /**
   * Import file cập nhật trạng thái giao hàng với 7 cột
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
        message: `Đã cập nhật trạng thái giao hàng cho ${results.success}/${records.length} đơn hàng. Thành công: ${results.success}, Lỗi: ${results.errors.length}`
      };
    } catch (error) {
      throw new BadRequestException(`Lỗi xử lý file: ${error.message}`);
    }
  }

  /**
   * Export Excel file chứa các đơn hàng chưa giao thành công
   * Bao gồm 7 cột: ID, trackingNumber, orderStatus, codAmount, receiverName, receiverPhone, receiverAddress
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
      .select('_id trackingNumber orderStatus codAmount receiverName receiverPhone receiverAddress createdAt customerName')
      .sort({ createdAt: -1 })
      .exec();

    // Format dữ liệu cho export
    const exportData = pendingOrders.map(order => ({
      '_id': order._id.toString(),
      'trackingNumber': order.trackingNumber || '',
      'orderStatus': order.orderStatus || 'Chưa có mã vận đơn',
      'codAmount': order.codAmount || 0,
      'receiverName': order.receiverName || '',
      'receiverPhone': order.receiverPhone || '',
      'receiverAddress': order.receiverAddress || '',
      'customerName': order.customerName || '',
      'createdAt': order.createdAt?.toISOString().split('T')[0] || ''
    }));

    return {
      headers: ['_id', 'trackingNumber', 'orderStatus', 'codAmount', 'receiverName', 'receiverPhone', 'receiverAddress', 'customerName', 'createdAt'],
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
   * Xử lý cập nhật trạng thái giao hàng với 7 cột (6 cột được cập nhật theo _id)
   */
  private async processDeliveryStatusUpdate(record: any, rowNumber: number): Promise<void> {
    try {
      if (!record._id || !record._id.trim()) {
        throw new Error(`Thiếu _id để xác định đơn hàng cần cập nhật`);
      }

      const id = record._id.trim();
      const updateData: any = {};

      // Cập nhật các trường nếu có giá trị
      if (record.trackingNumber !== undefined) {
        updateData.trackingNumber = record.trackingNumber ? record.trackingNumber.toString().trim() : '';
      }

      if (record.orderStatus !== undefined && record.orderStatus.toString().trim()) {
        updateData.orderStatus = record.orderStatus.toString().trim();
      }

      if (record.codAmount !== undefined) {
        const codValue = parseFloat(record.codAmount);
        updateData.codAmount = isNaN(codValue) ? 0 : codValue;
      }

      if (record.receiverName !== undefined) {
        updateData.receiverName = record.receiverName ? record.receiverName.toString().trim() : '';
      }

      if (record.receiverPhone !== undefined) {
        updateData.receiverPhone = record.receiverPhone ? record.receiverPhone.toString().trim() : '';
      }

      if (record.receiverAddress !== undefined) {
        updateData.receiverAddress = record.receiverAddress ? record.receiverAddress.toString().trim() : '';
      }

      // Chỉ cập nhật nếu có ít nhất một trường được cập nhật
      if (Object.keys(updateData).length === 0) {
        throw new Error(`Không có dữ liệu để cập nhật`);
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
