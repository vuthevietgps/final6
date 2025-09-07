/**
 * File: product-profit-report/product-profit-report.service.ts
 * Mục đích: Service tính toán báo cáo lợi nhuận sản phẩm theo ngày từ dữ liệu Summary2
 */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Summary1, Summary1Document } from '../google-sync/schemas/summary1.schema';
import { TestOrder2, TestOrder2Document } from '../test-order2/schemas/test-order2.schema';
import { AdvertisingCost, AdvertisingCostDocument } from '../advertising-cost/schemas/advertising-cost.schema';
import { OtherCost, OtherCostDocument } from '../other-cost/schemas/other-cost.schema';
import { LaborCost1, LaborCost1Document } from '../labor-cost1/schemas/labor-cost1.schema';
import { Product, ProductDocument } from '../product/schemas/product.schema';
import { ProductProfitFilterDto } from './dto/product-profit-filter.dto';

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function endOfDay(d: Date) { const x = new Date(d); x.setHours(23,59,59,999); return x; }

interface DailyProductProfit {
  productId: string;
  productName: string;
  date: string;
  profit: number;
  revenue: number;
  totalCost: number;
  quantity: number;
}

@Injectable()
export class ProductProfitReportService {
  constructor(
    @InjectModel(Summary1.name) private readonly summary1Model: Model<Summary1Document>,
    @InjectModel(TestOrder2.name) private readonly orderModel: Model<TestOrder2Document>,
    @InjectModel(AdvertisingCost.name) private readonly adsModel: Model<AdvertisingCostDocument>,
    @InjectModel(OtherCost.name) private readonly otherCostModel: Model<OtherCostDocument>,
    @InjectModel(LaborCost1.name) private readonly laborModel: Model<LaborCost1Document>,
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
  ) {}

  /**
   * Tính toán báo cáo lợi nhuận sản phẩm theo ngày
   */
  async getProductProfitReport(filterDto: ProductProfitFilterDto) {
    const { year, period, fromDate, toDate, productId } = filterDto;

    // 1. Xác định khoảng thời gian
    const dateRange = this.calculateDateRange(year, period, fromDate, toDate);
    
    // 2. Filter Summary1 data
    const filter: any = {
      createdAt: {
        $gte: dateRange.from,
        $lte: dateRange.to
      }
    };

    if (productId) {
      filter.productId = new Types.ObjectId(productId);
    }

    const summary1Data = await this.summary1Model.find(filter).lean();
    if (!summary1Data.length) {
      return {
        products: [],
        dates: [],
        data: [],
        summary: {
          totalProfit: 0,
          totalRevenue: 0,
          totalCost: 0,
          totalQuantity: 0
        }
      };
    }

    // 3. Lấy thông tin orders và products
    const orderIds = summary1Data.map(r => r.orderId);
    const orders = await this.orderModel.find({ _id: { $in: orderIds } }).lean();
    const orderMap = new Map<string, any>(orders.map((o: any) => [String(o._id), o]));

    const productIds = Array.from(new Set(
      orders.map(o => String(o.productId)).filter(Boolean)
    )).map(id => new Types.ObjectId(id));
    
    const products = await this.productModel.find({ _id: { $in: productIds } }).lean();
    const productMap = new Map<string, any>(products.map((p: any) => [String(p._id), p]));

    // 4. Tính toán chi phí và lợi nhuận cho từng ngày và sản phẩm
    const dailyData = await this.calculateDailyProfits(summary1Data, orderMap, productMap, dateRange);

    // 5. Tổ chức dữ liệu theo format báo cáo
    const reportData = this.formatReportData(dailyData, dateRange);

    return reportData;
  }

  /**
   * Xác định khoảng thời gian dựa trên filter
   */
  private calculateDateRange(year?: number, period?: string, fromDate?: string, toDate?: string) {
    const now = new Date();
    let from: Date, to: Date;

    if (period === 'custom' && fromDate && toDate) {
      from = new Date(fromDate);
      to = new Date(toDate);
    } else if (year) {
      from = new Date(year, 0, 1); // 1/1/year
      to = new Date(year, 11, 31, 23, 59, 59); // 31/12/year
    } else {
      // Xử lý các period khác
      switch (period) {
        case 'week':
          from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          to = now;
          break;
        case '10days':
          from = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
          to = now;
          break;
        case '30days':
          from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          to = now;
          break;
        case 'lastMonth':
          from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
          break;
        case 'thisMonth':
          from = new Date(now.getFullYear(), now.getMonth(), 1);
          to = now;
          break;
        default:
          // Mặc định: 30 ngày gần nhất
          from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          to = now;
      }
    }

    return {
      from: startOfDay(from),
      to: endOfDay(to)
    };
  }

  /**
   * Tính toán lợi nhuận hàng ngày cho từng sản phẩm (tương tự logic Summary2)
   */
  private async calculateDailyProfits(
    summary1Data: any[],
    orderMap: Map<string, any>,
    productMap: Map<string, any>,
    dateRange: { from: Date; to: Date }
  ): Promise<DailyProductProfit[]> {
    const dailyProfits: DailyProductProfit[] = [];

    // Gom nhóm theo ngày
    const byDay = new Map<string, any[]>();
    for (const record of summary1Data) {
      const date = startOfDay(new Date(record.createdAt));
      const dateKey = date.toISOString().split('T')[0];
      
      if (!byDay.has(dateKey)) {
        byDay.set(dateKey, []);
      }
      byDay.get(dateKey)!.push(record);
    }

    // Preload chi phí theo ngày
    const costByDay = await this.preloadDailyCosts(Array.from(byDay.keys()));

    // Tính toán cho từng ngày
    for (const [dateKey, records] of byDay.entries()) {
      const date = new Date(dateKey);
      const dayKey = date.getTime();

      // Gom theo sản phẩm trong ngày
      const byProduct = new Map<string, any[]>();
      for (const record of records) {
        const order = orderMap.get(String(record.orderId));
        const productId = order?.productId ? String(order.productId) : 'unknown';
        
        if (!byProduct.has(productId)) {
          byProduct.set(productId, []);
        }
        byProduct.get(productId)!.push({ record, order });
      }

      // Tính lợi nhuận cho từng sản phẩm trong ngày
      for (const [productId, productRecords] of byProduct.entries()) {
        const product = productMap.get(productId);
        const productName = product?.name || 'Sản phẩm không xác định';

        let totalRevenue = 0;
        let totalCapitalCost = 0;
        let totalQuantity = 0;
        let totalAdsCost = 0;
        let totalLaborCost = 0;
        let totalOtherCost = 0;

        const importPrice = product?.importPrice || 0;

        // Tính tổng cho sản phẩm trong ngày
        for (const { record, order } of productRecords) {
          const quantity = record.quantity || 0;
          totalQuantity += quantity;
          totalRevenue += record.mustPay || 0;
          totalCapitalCost += importPrice * quantity;
        }

        // Phân bổ chi phí ads, labor, other theo tỷ lệ
        const costs = costByDay.get(dateKey) || { ads: 0, labor: 0, other: 0, totalQty: 0 };
        if (costs.totalQty > 0) {
          const ratio = totalQuantity / costs.totalQty;
          totalAdsCost = costs.ads * ratio;
          totalLaborCost = costs.labor * ratio;
          totalOtherCost = costs.other * ratio;
        }

        const totalCost = totalCapitalCost + totalAdsCost + totalLaborCost + totalOtherCost;
        const profit = totalRevenue - totalCost;

        dailyProfits.push({
          productId,
          productName,
          date: dateKey,
          profit: Number(profit.toFixed(2)),
          revenue: Number(totalRevenue.toFixed(2)),
          totalCost: Number(totalCost.toFixed(2)),
          quantity: totalQuantity
        });
      }
    }

    return dailyProfits;
  }

  /**
   * Preload chi phí theo ngày
   */
  private async preloadDailyCosts(dates: string[]) {
    const costByDay = new Map<string, any>();

    for (const dateKey of dates) {
      const date = new Date(dateKey);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);

      // Tổng chi phí khác trong ngày
      const otherCosts = await this.otherCostModel.aggregate([
        { $match: { date: { $gte: dayStart, $lte: dayEnd } } },
        { $group: { _id: null, total: { $sum: { $ifNull: ['$amount', 0] } } } }
      ]);

      // Tổng chi phí lao động trong ngày
      const laborCosts = await this.laborModel.aggregate([
        { $match: { date: { $gte: dayStart, $lte: dayEnd } } },
        { $group: { _id: null, total: { $sum: { $ifNull: ['$cost', 0] } } } }
      ]);

      // Tổng chi phí ads trong ngày
      const adsCosts = await this.adsModel.aggregate([
        { $match: { date: { $gte: dayStart, $lte: dayEnd } } },
        { $group: { _id: null, total: { $sum: { $ifNull: ['$spentAmount', 0] } } } }
      ]);

      // Tổng số lượng đã hoàn thành trong ngày
      const summary1InDay = await this.summary1Model.find({
        createdAt: { $gte: dayStart, $lte: dayEnd },
        productionStatus: 'Đã trả kết quả'
      });
      const totalQty = summary1InDay.reduce((sum, r) => sum + (r.quantity || 0), 0);

      costByDay.set(dateKey, {
        other: otherCosts[0]?.total || 0,
        labor: laborCosts[0]?.total || 0,
        ads: adsCosts[0]?.total || 0,
        totalQty
      });
    }

    return costByDay;
  }

  /**
   * Format dữ liệu thành structure cho báo cáo
   */
  private formatReportData(dailyProfits: DailyProductProfit[], dateRange: { from: Date; to: Date }) {
    // Lấy danh sách sản phẩm duy nhất
    const uniqueProducts = Array.from(
      new Set(dailyProfits.map(d => d.productId))
    ).map(productId => {
      const sample = dailyProfits.find(d => d.productId === productId);
      return {
        id: productId,
        name: sample?.productName || 'Unknown'
      };
    });

    // Tạo danh sách ngày liên tục
    const dates: string[] = [];
    const currentDate = new Date(dateRange.from);
    while (currentDate <= dateRange.to) {
      dates.push(currentDate.toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Tạo ma trận dữ liệu [product][date] = profit
    const dataMatrix: any[] = [];
    for (const product of uniqueProducts) {
      const productRow: any = {
        productId: product.id,
        productName: product.name,
        dailyProfits: {},
        totalProfit: 0,
        totalRevenue: 0,
        totalCost: 0,
        totalQuantity: 0
      };

      for (const date of dates) {
        const dayData = dailyProfits.find(d => 
          d.productId === product.id && d.date === date
        );
        
        productRow.dailyProfits[date] = dayData?.profit || 0;
        if (dayData) {
          productRow.totalProfit += dayData.profit;
          productRow.totalRevenue += dayData.revenue;
          productRow.totalCost += dayData.totalCost;
          productRow.totalQuantity += dayData.quantity;
        }
      }

      dataMatrix.push(productRow);
    }

    // Tính tổng summary
    const summary = {
      totalProfit: dataMatrix.reduce((sum, row) => sum + row.totalProfit, 0),
      totalRevenue: dataMatrix.reduce((sum, row) => sum + row.totalRevenue, 0),
      totalCost: dataMatrix.reduce((sum, row) => sum + row.totalCost, 0),
      totalQuantity: dataMatrix.reduce((sum, row) => sum + row.totalQuantity, 0)
    };

    return {
      products: uniqueProducts,
      dates,
      data: dataMatrix,
      summary
    };
  }

  /**
   * Lấy danh sách các năm có dữ liệu
   */
  async getAvailableYears(): Promise<number[]> {
    const pipeline = [
      {
        $group: {
          _id: { $year: '$createdAt' },
        }
      },
      {
        $sort: { _id: -1 as any }
      }
    ];

    const result = await this.summary1Model.aggregate(pipeline);
    return result.map(item => item._id).filter(year => year && year > 2020);
  }
}
