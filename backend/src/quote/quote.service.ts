/**
 * File: quote.service.ts
 * Mục đích: Chứa logic nghiệp vụ cho báo giá (tạo/sửa/xoá/lấy danh sách, thống kê),
 *   truy cập MongoDB qua Mongoose Model và populate các liên kết (product, agent).
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Quote, QuoteDocument } from './schemas/quote.schema';
import { Product, ProductDocument } from '../product/schemas/product.schema';
import { GoogleSyncService } from '../google-sync/google-sync.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';

@Injectable()
export class QuoteService {
  constructor(
    @InjectModel(Quote.name) private quoteModel: Model<QuoteDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    private readonly googleSync: GoogleSyncService,
  ) {}

  async create(createQuoteDto: CreateQuoteDto): Promise<Quote> {
    // Nếu không có product name và agent name, tự động lấy từ database
    let { product, agentName } = createQuoteDto;
    
    if (!product || !agentName) {
      const [productDoc, userModel] = await Promise.all([
        this.productModel.findById(createQuoteDto.productId).exec(),
        // Import User model inline vì không có sẵn
        this.quoteModel.db.models.User || this.quoteModel.db.model('User')
      ]);
      
      const userDoc = await userModel.findById(createQuoteDto.agentId).exec();
      
      product = product || productDoc?.name || 'Unknown Product';
      agentName = agentName || userDoc?.fullName || 'Unknown Agent';
    }
    
    const createdQuote = new this.quoteModel({
      ...createQuoteDto,
      product,
      agentName
    });
    
    const saved = await createdQuote.save();
    const agentId = String(saved.agentId);
    // Cập nhật Summary1 cho cặp agent+product và chỉ push lên Google (bỏ rebuild toàn bộ)
    if (agentId && (saved as any).productId) {
      const productId = String((saved as any).productId);
      this.googleSync.updateSummaryForAgentProduct(agentId, productId)
        .then(() => this.googleSync.schedulePushOnly(agentId))
        .catch(() => this.googleSync.schedulePushOnly(agentId));
    } else if (agentId) {
      this.googleSync.schedulePushOnly(agentId);
    }
    return saved;
  }

  async findAll(query?: any): Promise<Quote[]> {
    // Xây filter rõ ràng để tránh nhận raw query gây sai lệch
    const filter: any = {};
    if (query) {
      const { agentId, productId, status, isActive } = query;
      if (agentId) filter.agentId = agentId;
      if (productId) filter.productId = productId;
      if (status) filter.status = status;
      if (isActive === 'false') filter.isActive = false; 
      else if (isActive === 'true') filter.isActive = true;
    }
    // Mặc định: hiển thị cả bản ghi chưa có trường isActive (tương thích dữ liệu cũ) và isActive=true
    if (filter.isActive === undefined) {
      filter.$or = [{ isActive: true }, { isActive: { $exists: false } }];
    }
    return this.quoteModel
      .find(filter)
      .populate('productId', 'name sku price')
      .populate('agentId', 'fullName email role')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string): Promise<Quote> {
    const quote = await this.quoteModel
      .findById(id)
      .populate('productId', 'name sku price')
      .populate('agentId', 'fullName email role')
      .exec();
    
    if (!quote) {
      throw new NotFoundException(`Quote with ID ${id} not found`);
    }
    return quote;
  }

  async update(id: string, updateQuoteDto: UpdateQuoteDto): Promise<Quote> {
    const updatedQuote = await this.quoteModel
      .findByIdAndUpdate(id, updateQuoteDto, { new: true })
      .populate('productId', 'name sku price')
      .populate('agentId', 'fullName email role')
      .exec();
    
    if (!updatedQuote) {
      throw new NotFoundException(`Quote with ID ${id} not found`);
  }
    const agentId = String((updatedQuote as any).agentId?._id || (updatedQuote as any).agentId);
    const productId = String((updatedQuote as any).productId?._id || (updatedQuote as any).productId);
    if (agentId && productId) {
      this.googleSync.updateSummaryForAgentProduct(agentId, productId)
        .then(() => this.googleSync.schedulePushOnly(agentId))
        .catch(() => this.googleSync.schedulePushOnly(agentId));
    } else if (agentId) {
      this.googleSync.schedulePushOnly(agentId);
    }
    return updatedQuote;
  }

  async remove(id: string): Promise<Quote> {
    const deletedQuote = await this.quoteModel
      .findByIdAndUpdate(id, { isActive: false }, { new: true })
      .exec();
    
    if (!deletedQuote) {
      throw new NotFoundException(`Quote with ID ${id} not found`);
  }
    const agentId = String((deletedQuote as any).agentId);
    const productId = String((deletedQuote as any).productId || '');
    if (agentId && productId) {
      this.googleSync.updateSummaryForAgentProduct(agentId, productId)
        .then(() => this.googleSync.schedulePushOnly(agentId))
        .catch(() => this.googleSync.schedulePushOnly(agentId));
    } else if (agentId) {
      this.googleSync.schedulePushOnly(agentId);
    }
    return deletedQuote;
  }

  async findByAgent(agentId: string): Promise<Quote[]> {
    return this.quoteModel
      .find({ agentId, isActive: true })
      .populate('productId', 'name sku price')
      .populate('agentId', 'fullName email role')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findByProduct(productId: string): Promise<Quote[]> {
    return this.quoteModel
      .find({ productId, isActive: true })
      .populate('productId', 'name sku price')
      .populate('agentId', 'fullName email role')
      .sort({ createdAt: -1 })
      .exec();
  }

  async getStats(): Promise<any> {
    const total = await this.quoteModel.countDocuments({ isActive: true });
    const pending = await this.quoteModel.countDocuments({ status: 'Chờ duyệt', isActive: true });
    const approved = await this.quoteModel.countDocuments({ status: 'Đã duyệt', isActive: true });
    const rejected = await this.quoteModel.countDocuments({ status: 'Từ chối', isActive: true });
    const expired = await this.quoteModel.countDocuments({ status: 'Hết hiệu lực', isActive: true });

    return {
      total,
      pending,
      approved,
      rejected,
      expired,
      approvalRate: total > 0 ? Math.round((approved / total) * 100) : 0
    };
  }

  // Diagnostics helper: liệt kê collections và thống kê chi tiết cho Quote
  async diagnostics(): Promise<any> {
    // Access underlying connection via model
    const conn = (this.quoteModel as any).db?.db;
    let collections: string[] = [];
    try {
      collections = (await conn?.listCollections()?.toArray())?.map((c: any) => c.name) || [];
    } catch (e) {
      collections = [];
    }

    // Counts
    const totalAll = await this.quoteModel.countDocuments({}).exec();
    const totalVisible = await this.quoteModel.countDocuments({ $or: [{ isActive: true }, { isActive: { $exists: false } }] }).exec();
    const totalInactive = await this.quoteModel.countDocuments({ isActive: false }).exec();
    const statusAgg = await this.quoteModel.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).exec();

    const sampleAll = await this.quoteModel.find({}).sort({ createdAt: -1 }).limit(5).lean();
    const sampleVisible = await this.quoteModel
      .find({ $or: [{ isActive: true }, { isActive: { $exists: false } }] })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    return {
      mongo: {
        collections,
      },
      quotes: {
        counts: {
          totalAll,
          totalVisible,
          totalInactive,
          byStatus: statusAgg,
        },
        samples: {
          recentAll: sampleAll,
          recentVisible: sampleVisible,
        },
        defaultFilter: { $or: [{ isActive: true }, { isActive: { $exists: false } }] },
      },
    };
  }

  /**
   * Migration: Cập nhật tất cả quotes hiện có để có trường product và agentName
   */
  async migrateProductAndAgentNames(): Promise<{
    processed: number;
    updated: number;
    errors: string[];
  }> {
    const result = { processed: 0, updated: 0, errors: [] };
    
    try {
      // Lấy tất cả quotes với populate để có tên
      const quotes = await this.quoteModel.find({
        $or: [
          { product: { $exists: false } },
          { agentName: { $exists: false } },
          { product: null },
          { agentName: null },
          { product: '' },
          { agentName: '' }
        ]
      })
      .populate('productId', 'name')
      .populate('agentId', 'fullName')
      .exec();

      console.log(`Found ${quotes.length} quotes need migration`);

      for (const quote of quotes) {
        result.processed++;
        
        try {
          const product = (quote.productId as any)?.name || 'Unknown Product';
          const agentName = (quote.agentId as any)?.fullName || 'Unknown Agent';
          
          if (product !== quote.product || agentName !== quote.agentName) {
            await this.quoteModel.findByIdAndUpdate(quote._id, {
              product,
              agentName
            });
            result.updated++;
            console.log(`Updated quote ${quote._id}: ${product} - ${agentName}`);
          }
          
        } catch (error) {
          result.errors.push(`Quote ${quote._id}: ${error.message}`);
        }
      }
      
      return result;
      
    } catch (error) {
      result.errors.push(`Migration failed: ${error.message}`);
      return result;
    }
  }
}
