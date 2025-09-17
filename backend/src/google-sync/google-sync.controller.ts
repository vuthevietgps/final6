/**
 * Google Sync Controller
 * Quản lý đồng bộ dữ liệu Summary1 với Google Sheets
 */
import { Controller, Post, Param, Get, Query, Body, Res, HttpStatus } from '@nestjs/common';
import { GoogleSyncService } from './google-sync.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Summary1, Summary1Document } from './schemas/summary1.schema';
import { User, UserDocument } from '../user/user.schema';
import { Product, ProductDocument } from '../product/schemas/product.schema';
import { Response } from 'express';

@Controller('google-sync')
export class GoogleSyncController {
  constructor(
    private readonly svc: GoogleSyncService,
    @InjectModel(Summary1.name) private readonly summaryModel: Model<Summary1Document>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
  ) {}

  /** Debug: xem trạng thái credentials */
  @Get('cred-check')
  credCheck() {
    return this.svc.authDebugInfo();
  }

  /** Lấy dữ liệu Summary1 với filter nâng cao */
  @Get('summary/filter')
  async getSummaryWithFilter(
    @Query('agentId') agentId?: string,
    @Query('productId') productId?: string,
    @Query('productionStatus') productionStatus?: string,
    @Query('orderStatus') orderStatus?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ) {
    const filter: any = {};

    // Lọc theo Đại lý
    if (agentId) {
      filter.agentId = new Types.ObjectId(agentId);
    }

    // Lọc theo Sản phẩm
    if (productId) {
      filter.productId = new Types.ObjectId(productId);
    }

    // Lọc theo Trạng thái Sản xuất
    if (productionStatus) {
      filter.productionStatus = { $regex: productionStatus, $options: 'i' };
    }

    // Lọc theo Trạng thái Vận đơn
    if (orderStatus) {
      filter.orderStatus = { $regex: orderStatus, $options: 'i' };
    }

    // Lọc theo Khoảng thời gian
    if (fromDate || toDate) {
      filter.createdAt = {};
      if (fromDate) {
        filter.createdAt.$gte = new Date(fromDate);
      }
      if (toDate) {
        const endDate = new Date(toDate);
        endDate.setHours(23, 59, 59, 999); // End of day
        filter.createdAt.$lte = endDate;
      }
    }

    // Pagination
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 50;
    const skip = (pageNum - 1) * limitNum;

    // Sorting
    const sort: any = {};
    if (sortBy) {
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    } else {
      sort.createdAt = -1; // Default sort by newest
    }

    // Execute query với populate để lấy thông tin chi tiết
    const [rows, total] = await Promise.all([
      this.summaryModel
        .find(filter)
        .populate('agentId', 'fullName email')
        .populate('productId', 'name code')
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      this.summaryModel.countDocuments(filter)
    ]);

    // Thống kê
    const stats = await this.summaryModel.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalRows: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          totalCodAmount: { $sum: '$codAmount' },
          totalQuotePrice: { $sum: '$quotePrice' },
          totalMustPay: { $sum: '$mustPay' },
          totalPaid: { $sum: '$paid' },
          totalManualPayment: { $sum: '$manualPayment' },
          totalNeedToPay: { $sum: '$needToPay' },
          avgQuantity: { $avg: '$quantity' },
        }
      }
    ]);

    return {
      filter,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      },
      stats: stats[0] || {
        totalRows: 0,
        totalQuantity: 0,
        totalCodAmount: 0,
        totalQuotePrice: 0,
        totalMustPay: 0,
        totalPaid: 0,
        totalManualPayment: 0,
        totalNeedToPay: 0,
        avgQuantity: 0,
      },
      rows
    };
  }

  /** Lấy danh sách options cho filter Summary1 */
  @Get('summary/filter-options')
  async getFilterOptions() {
    // Lấy danh sách đại lý
    const agents = await this.userModel
      .find({ role: { $in: ['internal_agent', 'external_agent'] } })
      .select('_id fullName email')
      .sort({ fullName: 1 })
      .lean();

    // Lấy danh sách sản phẩm từ Summary1 (unique)
    const products = await this.summaryModel.aggregate([
      { $match: { productId: { $exists: true, $ne: null } } },
      { $group: { _id: '$productId', product: { $first: '$product' } } },
      { $project: { _id: 1, name: '$product' } },
      { $sort: { name: 1 } }
    ]);

    // Lấy danh sách trạng thái sản xuất (unique)
    const productionStatuses = await this.summaryModel.distinct('productionStatus', {
      productionStatus: { $exists: true, $ne: null, $nin: ['', null] }
    });

    // Lấy danh sách trạng thái vận đơn (unique)
    const orderStatuses = await this.summaryModel.distinct('orderStatus', {
      orderStatus: { $exists: true, $ne: null, $nin: ['', null] }
    });

    // Lấy khoảng thời gian (min/max dates)
    const dateRange = await this.summaryModel.aggregate([
      {
        $group: {
          _id: null,
          minDate: { $min: '$createdAt' },
          maxDate: { $max: '$createdAt' }
        }
      }
    ]);

    return {
      agents: agents.map(a => ({ id: a._id, name: a.fullName, email: a.email })),
      products: products.map(p => ({ id: p._id, name: p.name })),
      productionStatuses: productionStatuses.filter(s => s).sort(),
      orderStatuses: orderStatuses.filter(s => s).sort(),
      dateRange: dateRange[0] || { minDate: null, maxDate: null },
      sortOptions: [
        { value: 'createdAt', label: 'Ngày tạo' },
        { value: 'customerName', label: 'Tên khách hàng' },
        { value: 'quantity', label: 'Số lượng' },
        { value: 'codAmount', label: 'Tiền COD' },
        { value: 'needToPay', label: 'Cần thanh toán' },
        { value: 'product', label: 'Sản phẩm' },
        { value: 'productionStatus', label: 'Trạng thái sản xuất' },
        { value: 'orderStatus', label: 'Trạng thái vận đơn' }
      ]
    };
  }

  /** Lấy dữ liệu Summary1 của một đại lý từ DB */
  @Get('summary/agent/:agentId')
  async getSummaryByAgent(@Param('agentId') agentId: string) {
    const rows = await this.summaryModel
      .find({ agentId: new Types.ObjectId(agentId) })
      .sort({ createdAt: -1 })
      .lean();
    const withPrice = rows.filter((r: any) => (r.quotePrice || 0) > 0).length;
    return { agentId, count: rows.length, withQuotePrice: withPrice, withoutQuotePrice: rows.length - withPrice, rows };
  }

  /** Rebuild & save Summary1 vào DB (không ghi Google) */
  @Post('summary/agent/:agentId/rebuild')
  async rebuildSummary(@Param('agentId') agentId: string) {
    const rows = await this.svc.buildSummaryForAgent(agentId);
    await this.svc.saveSummaryToDb(agentId, rows);
    return { message: 'Đã rebuild và lưu Summary1', agentId, count: rows.length };
  }

  /** Ghi Summary1 từ DB lên Google Sheets (không rebuild) */
  @Post('summary/agent/:agentId/push')
  async pushSummary(@Param('agentId') agentId: string) {
    await this.svc.writeSummaryFromDbToGoogleSheet(agentId);
    return { message: 'Đã push Summary1 từ DB lên Google Sheet', agentId };
  }

  /** Rebuild DB và push ngay lên Google Sheets */
  @Post('summary/agent/:agentId/rebuild-and-push')
  async rebuildAndPush(@Param('agentId') agentId: string) {
    const rows = await this.svc.buildSummaryForAgent(agentId);
    await this.svc.saveSummaryToDb(agentId, rows);
    await this.svc.writeSummaryFromDbToGoogleSheet(agentId);
    return { message: 'Đã rebuild và push Summary1', agentId, count: rows.length };
  }

  /** Liệt kê các đại lý (user) để lấy agentId (userId) nhanh */
  @Get('agents')
  async listAgents(@Query('withLink') withLink?: string) {
    const filter: any = { role: { $in: ['internal_agent', 'external_agent'] } };
    if (withLink === 'true') filter.googleDriveLink = { $exists: true, $ne: '' };
    const users = await this.userModel
      .find(filter)
      .select('_id fullName email role googleDriveLink')
      .sort({ fullName: 1 })
      .lean();
    return { count: users.length, users };
  }

  /** Export Summary1 template với _id, customerName, manualPayment */
  @Get('summary/export-template')
  async exportSummaryTemplate(
    @Query('agentId') agentId?: string,
    @Query('productId') productId?: string,
    @Query('productionStatus') productionStatus?: string,
    @Query('orderStatus') orderStatus?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
    @Query('q') q?: string,
    @Query('format') format: 'csv' | 'xlsx' = 'csv',
    @Res() res?: Response
  ) {
    const filter: any = {};

    // Áp dụng tất cả filter tương tự như getSummaryWithFilter
    if (agentId) {
      filter.agentId = new Types.ObjectId(agentId);
    }
    if (productId) {
      filter.productId = new Types.ObjectId(productId);
    }
    if (productionStatus) {
      filter.productionStatus = { $regex: productionStatus, $options: 'i' };
    }
    if (orderStatus) {
      filter.orderStatus = { $regex: orderStatus, $options: 'i' };
    }
    if (fromDate || toDate) {
      filter.createdAt = {};
      if (fromDate) {
        filter.createdAt.$gte = new Date(fromDate);
      }
      if (toDate) {
        const endDate = new Date(toDate);
        endDate.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = endDate;
      }
    }
    if (q) {
      filter.$or = [
        { customerName: { $regex: q, $options: 'i' } },
        { trackingNumber: { $regex: q, $options: 'i' } },
        { product: { $regex: q, $options: 'i' } }
      ];
    }

    // Sorting
    const sort: any = {};
    if (sortBy) {
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    } else {
      sort.createdAt = -1;
    }

    // Lấy dữ liệu Summary1
    const rows = await this.summaryModel
      .find(filter)
      .populate('agentId', 'fullName')
      .sort(sort)
      .lean();

    if (format === 'xlsx') {
      const XLSX = await import('xlsx');
      const data = [
        ['ID', 'Tên khách hàng', 'Thanh toán thủ công', 'Đại lý'], // Header
        ...rows.map((r: any) => [
          String(r._id),
          r.customerName || '',
          r.manualPayment || 0,
          (r.agentId as any)?.fullName || ''
        ])
      ];
      
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'Summary1 Template');
      
      const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
      const filename = `summary1_template_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      if (res) {
        res.set({
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}"`
        });
        res.send(buffer);
        return;
      }
      return buffer;
    } else {
      // CSV format with UTF-8 BOM
      let csv = '\uFEFF'; // UTF-8 BOM
      csv += 'ID,Tên khách hàng,Thanh toán thủ công,Đại lý\n';
      
      for (const row of rows) {
        const agentName = (row.agentId as any)?.fullName || '';
        csv += `"${String(row._id)}","${(row.customerName || '').replace(/"/g, '""')}","${row.manualPayment || 0}","${agentName.replace(/"/g, '""')}"\n`;
      }
      
      const buffer = Buffer.from(csv, 'utf8');
      const filename = `summary1_template_${new Date().toISOString().split('T')[0]}.csv`;
      
      if (res) {
        res.set({
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`
        });
        res.send(buffer);
        return;
      }
      return buffer;
    }
  }

  /** Export các bản ghi Summary1 chưa thanh toán (manualPayment = 0) */
  @Get('summary/export-unpaid')
  async exportUnpaidSummary(
    @Query('agentId') agentId?: string,
    @Query('productId') productId?: string,
    @Query('productionStatus') productionStatus?: string,
    @Query('orderStatus') orderStatus?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
    @Query('q') q?: string,
    @Query('format') format: 'csv' | 'xlsx' = 'csv',
    @Res() res?: Response
  ) {
    const filter: any = {
      $and: [
        {
          $or: [
            { manualPayment: 0 },
            { manualPayment: { $exists: false } },
            { manualPayment: null }
          ]
        }
      ]
    };
    
    // Áp dụng tất cả filter khác
    const additionalFilters: any = {};
    if (agentId) {
      additionalFilters.agentId = new Types.ObjectId(agentId);
    }
    if (productId) {
      additionalFilters.productId = new Types.ObjectId(productId);
    }
    if (productionStatus) {
      additionalFilters.productionStatus = { $regex: productionStatus, $options: 'i' };
    }
    if (orderStatus) {
      additionalFilters.orderStatus = { $regex: orderStatus, $options: 'i' };
    }
    if (fromDate || toDate) {
      additionalFilters.createdAt = {};
      if (fromDate) {
        additionalFilters.createdAt.$gte = new Date(fromDate);
      }
      if (toDate) {
        const endDate = new Date(toDate);
        endDate.setHours(23, 59, 59, 999);
        additionalFilters.createdAt.$lte = endDate;
      }
    }
    if (q) {
      additionalFilters.$or = [
        { customerName: { $regex: q, $options: 'i' } },
        { trackingNumber: { $regex: q, $options: 'i' } },
        { product: { $regex: q, $options: 'i' } }
      ];
    }

    // Combine filters
    if (Object.keys(additionalFilters).length > 0) {
      filter.$and.push(additionalFilters);
    }

    // Sorting
    const sort: any = {};
    if (sortBy) {
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    } else {
      sort.createdAt = -1;
    }

    // Lấy dữ liệu Summary1 chưa thanh toán
    const rows = await this.summaryModel
      .find(filter)
      .populate('agentId', 'fullName')
      .sort(sort)
      .lean();

    if (format === 'xlsx') {
      const XLSX = await import('xlsx');
      const data = [
        ['ID', 'Tên khách hàng', 'Thanh toán thủ công', 'Đại lý', 'Cần thanh toán'], // Header
        ...rows.map((r: any) => [
          String(r._id),
          r.customerName || '',
          r.manualPayment || 0,
          (r.agentId as any)?.fullName || '',
          r.needToPay || 0
        ])
      ];
      
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'Summary1 Chưa Thanh Toán');
      
      const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
      const filename = `summary1_chua_thanh_toan_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      if (res) {
        res.set({
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}"`
        });
        res.send(buffer);
        return;
      }
      return buffer;
    } else {
      // CSV format with UTF-8 BOM
      let csv = '\uFEFF'; // UTF-8 BOM
      csv += 'ID,Tên khách hàng,Thanh toán thủ công,Đại lý,Cần thanh toán\n';
      
      for (const row of rows) {
        const agentName = (row.agentId as any)?.fullName || '';
        csv += `"${String(row._id)}","${(row.customerName || '').replace(/"/g, '""')}","${row.manualPayment || 0}","${agentName.replace(/"/g, '""')}","${row.needToPay || 0}"\n`;
      }
      
      const buffer = Buffer.from(csv, 'utf8');
      const filename = `summary1_chua_thanh_toan_${new Date().toISOString().split('T')[0]}.csv`;
      
      if (res) {
        res.set({
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`
        });
        res.send(buffer);
        return;
      }
      return buffer;
    }
  }

  /** Import Summary1 template để cập nhật customerName và manualPayment theo _id */
  @Post('summary/import-template')
  async importSummaryTemplate(@Body() body: { 
    data: Array<{ id: string; customerName?: string; manualPayment?: number }> 
  }) {
    const { data } = body;
    
    if (!data || !Array.isArray(data)) {
      throw new Error('Invalid data format');
    }

    const results = {
      total: data.length,
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (const item of data) {
      try {
        const { id, customerName, manualPayment } = item;
        
        if (!id) {
          results.failed++;
          results.errors.push('Missing ID');
          continue;
        }

        // Tìm record Summary1
        const existing = await this.summaryModel.findById(id).lean();
        if (!existing) {
          results.failed++;
          results.errors.push(`Summary1 not found: ${id}`);
          continue;
        }

        // Chuẩn bị update object
        const updateData: any = {};
        if (customerName !== undefined) {
          updateData.customerName = customerName;
        }
        if (manualPayment !== undefined) {
          updateData.manualPayment = Number(manualPayment || 0);
          
          // Tính lại needToPay
          const paid = Number(existing.paid || 0);
          const mustPay = Number(existing.mustPay || 0);
          updateData.needToPay = paid - mustPay - updateData.manualPayment;
        }

        // Cập nhật nếu có dữ liệu
        if (Object.keys(updateData).length > 0) {
          await this.summaryModel.findByIdAndUpdate(id, { $set: updateData });
          
          // Schedule push to Google Sheet
          const agentId = String(existing.agentId);
          this.svc.schedulePushOnly(agentId, 2000);
          
          results.success++;
        } else {
          results.failed++;
          results.errors.push(`No data to update for ID: ${id}`);
        }

      } catch (error: any) {
        results.failed++;
        results.errors.push(`Error processing ${item.id}: ${error.message}`);
      }
    }

    return results;
  }

  /** Cập nhật manualPayment cho một dòng Summary1 và tính lại needToPay */
  @Post('summary/:summaryId/manual-payment')
  async updateManualPayment(@Param('summaryId') summaryId: string, @Body() body: { manualPayment: number }) {
    const { manualPayment } = body;
    
    // 1. Tìm dòng Summary1
    const summary = await this.summaryModel.findById(summaryId).lean();
    if (!summary) throw new Error('Summary1 record not found');
    
    // 2. Tính lại needToPay với manualPayment mới
    const paid = Number(summary.paid || 0);
    const mustPay = Number(summary.mustPay || 0);
    const newNeedToPay = paid - mustPay - Number(manualPayment || 0);
    
    // 3. Cập nhật Summary1
    const updated = await this.summaryModel.findByIdAndUpdate(
      summaryId,
      { 
        $set: { 
          manualPayment: Number(manualPayment || 0),
          needToPay: newNeedToPay
        }
      },
      { new: true }
    ).lean();
    
    // 4. Schedule push to Google Sheet cho agent này
    const agentId = String(updated.agentId);
    this.svc.schedulePushOnly(agentId, 1500); // Push sau 1.5s
    
    return updated;
  }
}
