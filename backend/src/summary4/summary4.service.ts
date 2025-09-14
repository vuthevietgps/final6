import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Summary4, Summary4Document } from './schemas/summary4.schema';
import { Summary5Service } from '../summary5/summary5.service';
import { TestOrder2, TestOrder2Document } from '../test-order2/schemas/test-order2.schema';
import { Quote, QuoteDocument } from '../quote/schemas/quote.schema';
import { User, UserDocument } from '../user/user.schema';
import { Product, ProductDocument } from '../product/schemas/product.schema';
import { Summary4FilterDto } from './dto/summary4-filter.dto';
import { UpdateManualPaymentDto } from './dto/update-manual-payment.dto';

@Injectable()
export class Summary4Service {
  private readonly logger = new Logger(Summary4Service.name);
  private readonly debugEnabled = process.env.DEBUG_SUMMARY4 === 'true';

  constructor(
    @InjectModel(Summary4.name) private summary4Model: Model<Summary4Document>,
    @InjectModel(TestOrder2.name) private testOrder2Model: Model<TestOrder2Document>,
    @InjectModel(Quote.name) private quoteModel: Model<QuoteDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    private readonly summary5Service: Summary5Service,
  ) {}

  async findAll(filter: Summary4FilterDto = {}) {
    const {
      agentId,
      productId,
      productionStatus,
      orderStatus,
      startDate,
      endDate,
      page = 1,
      limit = 50,
      sortBy = 'orderDate',
      sortOrder = 'desc'
    } = filter;

    const query: any = { isActive: true };

  if (agentId) query.agentId = new Types.ObjectId(agentId);
  if (productId) query.productId = new Types.ObjectId(productId);
  // Case-insensitive match for statuses to tolerate casing variations in data
  const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (productionStatus) query.productionStatus = new RegExp(`^${escapeRegex(productionStatus)}$`, 'i');
  if (orderStatus) query.orderStatus = new RegExp(`^${escapeRegex(orderStatus)}$`, 'i');
    if (startDate || endDate) {
      query.orderDate = {};
      if (startDate) {
        const d = new Date(startDate);
        if (!isNaN(d.getTime())) query.orderDate.$gte = d;
      }
      if (endDate) {
        const d = new Date(endDate);
        if (!isNaN(d.getTime())) {
          // Make endDate inclusive (end of day 23:59:59.999)
          d.setHours(23, 59, 59, 999);
          query.orderDate.$lte = d;
        }
      }
    }

    const sortOption = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.summary4Model
        .find(query)
        .sort(sortOption as any)
        .skip(skip)
        .limit(limit)
        .populate('agentId', 'fullName email role')
        .populate('productId', 'name sku price')
        .exec(),
      this.summary4Model.countDocuments(query).exec()
    ]);

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  async findOne(id: string): Promise<Summary4> {
    const summary = await this.summary4Model
      .findById(id)
      .populate('agentId', 'fullName email role')
      .populate('productId', 'name sku price')
      .exec();
    
    if (!summary) {
      throw new NotFoundException(`Summary4 với ID ${id} không tìm thấy`);
    }
    return summary;
  }

  async updateManualPayment(id: string, updateDto: UpdateManualPaymentDto): Promise<Summary4> {
    const summary = await this.findOne(id);
    
    if (updateDto.manualPayment !== undefined) {
      summary.manualPayment = updateDto.manualPayment;
      summary.needToPay = summary.paidToCompany - summary.mustPayToCompany - summary.manualPayment;
    }

    await this.summary4Model.updateOne({ _id: id }, summary);

    // Trigger Summary5 sync for the specific day range of this order
    try {
      const d = new Date(summary.orderDate);
      const startDate = new Date(d); startDate.setHours(0,0,0,0);
      const endDate = new Date(d); endDate.setHours(23,59,59,999);
      await this.summary5Service.sync({ startDate: startDate.toISOString(), endDate: endDate.toISOString() });
    } catch (e) {
      this.logger.warn(`Summary5 sync failed after manualPayment update: ${e?.message || e}`);
    }
    return summary;
  }

  // Chẩn đoán trùng lặp dữ liệu theo testOrder2Id
  async diagnostics() {
    const dupAgg = await this.summary4Model.aggregate([
      { $addFields: { testOrder2IdStr: { $toString: '$testOrder2Id' } } },
      { $group: { _id: '$testOrder2IdStr', count: { $sum: 1 }, ids: { $push: '$_id' } } },
      { $match: { count: { $gt: 1 } } },
      { $sort: { count: -1 } }
    ]).exec();

    const indexInfo = await (this.summary4Model as any).collection?.indexInformation()?.catch?.(() => null);

    const total = await this.summary4Model.countDocuments({}).exec();
    const totalActive = await this.summary4Model.countDocuments({ isActive: true }).exec();

    return {
      counts: { total, totalActive },
      duplicates: dupAgg,
      indexes: indexInfo,
      note: 'Nếu có duplicates, hãy gọi POST /summary4/fix-duplicates để dọn.'
    };
  }

  // Xử lý trùng lặp: giữ lại 1 bản ghi tốt nhất cho mỗi testOrder2Id
  async fixDuplicates() {
    const dups = await this.summary4Model.aggregate([
      { $addFields: { testOrder2IdStr: { $toString: '$testOrder2Id' } } },
      { $group: { _id: '$testOrder2IdStr', docs: { $push: '$$ROOT' }, count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } }
    ]).exec();

    let removed = 0;
    for (const group of dups) {
      const docs = group.docs as any[];
      // Ưu tiên dòng có approvedQuotePrice > 0, nếu không có thì chọn updatedAt mới nhất
      const preferred = docs
        .slice()
        .sort((a, b) => {
          if ((b.approvedQuotePrice || 0) !== (a.approvedQuotePrice || 0)) {
            return (b.approvedQuotePrice || 0) - (a.approvedQuotePrice || 0);
          }
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        })[0];

      for (const doc of docs) {
        if (String(doc._id) !== String(preferred._id)) {
          await this.summary4Model.deleteOne({ _id: doc._id }).exec();
          removed++;
        }
      }

      // Chuẩn hoá field testOrder2Id về ObjectId nếu bị string
      if (preferred && typeof preferred.testOrder2Id === 'string') {
        await this.summary4Model.updateOne(
          { _id: preferred._id },
          { $set: { testOrder2Id: new Types.ObjectId(preferred.testOrder2Id) } }
        ).exec();
      }
    }

    // Đảm bảo unique index
    try {
      await (this.summary4Model as any).collection.createIndex({ testOrder2Id: 1 }, { unique: true });
    } catch (e) {
      // ignore if exists
    }

    return { groupsProcessed: dups.length, removed };
  }

  async syncFromTestOrder2(): Promise<{ processed: number; updated: number; errors: string[] }> {
    this.logger.log('Bắt đầu đồng bộ dữ liệu từ TestOrder2...');
    const result = { processed: 0, updated: 0, errors: [] };

    try {
      const testOrder2Records = await this.testOrder2Model
        .find({ isActive: true })
        .populate('agentId', 'fullName')
        .populate('productId', 'name')
        .sort({ createdAt: -1 })
        .exec();

  if (this.debugEnabled) this.logger.log(`Tìm thấy ${testOrder2Records.length} bản ghi TestOrder2`);

      for (const order of testOrder2Records) {
        result.processed++;
        
        try {
          // Tìm record hiện có theo cả 2 dạng (ObjectId hoặc string) để tránh bị lệch kiểu dữ liệu từ các lần sync cũ
          const existingSummary = await this.summary4Model.findOne({
            $or: [
              { testOrder2Id: order._id },
              { testOrder2Id: order._id.toString() as any }
            ]
          }).exec();

          const agentName = (order.agentId as any)?.fullName || 'Unknown Agent';
          const productName = (order.productId as any)?.name || 'Unknown Product';

          // Tính toán báo giá đã duyệt - Use string IDs like Quote service does
          const agentIdString = ((order.agentId as any)?._id || order.agentId)?.toString();
          const productIdString = ((order.productId as any)?._id || order.productId)?.toString();
          
          if (this.debugEnabled) this.logger.debug(`Looking for quote: agentId=${agentIdString}, productId=${productIdString}, status='Đã duyệt'`);
          
          // Use the same query pattern as Quote service (string-based)
          const approvedQuote = await this.quoteModel.findOne({
            agentId: agentIdString,
            productId: productIdString,
            status: 'Đã duyệt',
            isActive: true
          }).exec();
          
          if (this.debugEnabled) this.logger.debug(`Found quote price: ${approvedQuote?.price || 0}`);

          const approvedQuotePrice = approvedQuote?.price || 0;

          // Logic tính toán theo yêu cầu
          const mustPayToCompany = order.productionStatus === 'Đã trả kết quả' 
            ? approvedQuotePrice * order.quantity 
            : 0;

          const paidToCompany = order.orderStatus === 'Giao thành công' 
            ? order.codAmount 
            : 0;

          const manualPayment = existingSummary?.manualPayment || 0;
          const needToPay = paidToCompany - mustPayToCompany - manualPayment;

          const summaryData = {
            testOrder2Id: order._id,
            orderDate: order.createdAt,
            customerName: order.customerName,
            product: productName,
            quantity: order.quantity,
            agentName: agentName,
            adGroupId: order.adGroupId || '0',
            isActive: order.isActive,
            serviceDetails: order.serviceDetails,
            productionStatus: order.productionStatus,
            orderStatus: order.orderStatus,
            submitLink: order.submitLink,
            trackingNumber: order.trackingNumber,
            depositAmount: order.depositAmount || 0,
            codAmount: order.codAmount || 0,
            agentId: order.agentId,
            productId: order.productId,
            approvedQuotePrice,
            mustPayToCompany,
            paidToCompany,
            manualPayment,
            needToPay
          };

          // Upsert theo testOrder2Id, đồng thời xử lý cả dữ liệu cũ dùng string
          // Loại bỏ testOrder2Id khỏi $set để tránh xung đột đường dẫn
          const { testOrder2Id, ...setData } = summaryData as any;

          await this.summary4Model.updateOne(
            {
              $or: [
                { testOrder2Id: order._id },
                { testOrder2Id: order._id.toString() as any }
              ]
            },
            {
              $set: setData,
              // Đảm bảo sau update, testOrder2Id chuẩn là ObjectId
              $setOnInsert: { testOrder2Id: order._id }
            },
            { upsert: true }
          ).exec();

          result.updated++;

        } catch (error) {
          result.errors.push(`TestOrder2 ${order._id}: ${error.message}`);
        }
      }

  if (this.debugEnabled) this.logger.log(`Hoàn thành đồng bộ: ${result.updated}/${result.processed} bản ghi`);
      return result;

    } catch (error) {
      this.logger.error('Lỗi đồng bộ dữ liệu:', error);
      result.errors.push(`Lỗi chung: ${error.message}`);
      return result;
    }
  }

  async getStats() {
    const [
      totalRecords,
      totalMustPay,
      totalPaidToCompany,
      totalManualPayment,
      totalNeedToPay
    ] = await Promise.all([
      this.summary4Model.countDocuments({ isActive: true }),
      this.summary4Model.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: null, total: { $sum: '$mustPayToCompany' } } }
      ]),
      this.summary4Model.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: null, total: { $sum: '$paidToCompany' } } }
      ]),
      this.summary4Model.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: null, total: { $sum: '$manualPayment' } } }
      ]),
      this.summary4Model.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: null, total: { $sum: '$needToPay' } } }
      ])
    ]);

    return {
      totalRecords,
      totalMustPay: totalMustPay[0]?.total || 0,
      totalPaidToCompany: totalPaidToCompany[0]?.total || 0,
      totalManualPayment: totalManualPayment[0]?.total || 0,
      totalNeedToPay: totalNeedToPay[0]?.total || 0,
      timestamp: new Date()
    };
  }
}