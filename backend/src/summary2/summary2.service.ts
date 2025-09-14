/**
 * File: summary2/summary2.service.ts
 * Mục đích: Tính toán "Tổng hợp 2" từ Summary1 và bổ sung các cột chi phí theo quy tắc.
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

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function endOfDay(d: Date) { const x = new Date(d); x.setHours(23,59,59,999); return x; }

@Injectable()
export class Summary2Service {
  constructor(
    @InjectModel(Summary1.name) private readonly summary1Model: Model<Summary1Document>,
    @InjectModel(TestOrder2.name) private readonly orderModel: Model<TestOrder2Document>,
    @InjectModel(AdvertisingCost.name) private readonly adsModel: Model<AdvertisingCostDocument>,
    @InjectModel(OtherCost.name) private readonly otherCostModel: Model<OtherCostDocument>,
    @InjectModel(LaborCost1.name) private readonly laborModel: Model<LaborCost1Document>,
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
  ) {}

  /**
   * Lấy dữ liệu Tổng hợp 2 theo agent (tuỳ chọn) và khoảng ngày (tuỳ chọn)
   */
  async getSummary2(params: { agentId?: string; from?: string; to?: string }) {
    const { agentId, from, to } = params || {} as any;
    const filter: any = {};
    if (agentId) filter.agentId = new Types.ObjectId(agentId);
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    // 1) Lấy rows Summary1 (nguồn chuẩn từ Tổng hợp 1)
    const s1 = await this.summary1Model.find(filter).lean();
    if (!s1.length) return [];

    // Chuẩn bị key theo ngày và adGroup/product
    const orderIds = s1.map(r => r.orderId);
    const orders = await this.orderModel.find({ _id: { $in: orderIds } }).lean();
    const orderMap = new Map<string, any>(orders.map((o: any) => [String(o._id), o]));

    // Gom theo ngày (0h) để tính tổng ngày
    const byDayOrders = new Map<number, any[]>();
    for (const r of s1) {
      const createdAt = (r as any).createdAt ? new Date((r as any).createdAt) : new Date();
      const dayKey = startOfDay(createdAt).getTime();
      const list = byDayOrders.get(dayKey) || [];
      list.push(r);
      byDayOrders.set(dayKey, list);
    }

    // 2) Tải dữ liệu chi phí theo ngày
    // - Ads theo adGroupId + date
    // - OtherCost tổng theo ngày
    // - LaborCost1 tổng theo ngày (đã nhân theo rate), coi như chi phí lương trong ngày
    // - Product importPrice để tính giá vốn
    // Chuẩn bị product importPrice map
    const productIds = Array.from(new Set(orders.map(o => String(o.productId)).filter(Boolean))).map(id => new Types.ObjectId(id));
    const products = productIds.length ? await this.productModel.find({ _id: { $in: productIds } }).lean() : [];
    const productImportMap = new Map<string, number>(products.map((p: any) => [String(p._id), Number(p.importPrice || 0)]));

    // Chuẩn bị các ngày cần tính
    const days = Array.from(byDayOrders.keys());

    // Preload OtherCost và LaborCost1 theo ngày để giảm query lặp
    const otherByDay = new Map<number, number>();
    const laborByDay = new Map<number, number>();
    for (const key of days) {
      const day = new Date(key);
      const oc = await this.otherCostModel.aggregate([
        { $match: { date: { $gte: startOfDay(day), $lte: endOfDay(day) } } },
        { $group: { _id: null, total: { $sum: { $ifNull: ['$amount', 0] } } } },
      ]).exec();
      otherByDay.set(key, oc?.[0]?.total || 0);

      const lc = await this.laborModel.aggregate([
        { $match: { date: { $gte: startOfDay(day), $lte: endOfDay(day) } } },
        { $group: { _id: null, total: { $sum: { $ifNull: ['$cost', 0] } } } },
      ]).exec();
      laborByDay.set(key, lc?.[0]?.total || 0);
    }

    // Preload Ads by day+adGroupId
    const adsByDayAdGroup = new Map<string, number>();
  for (const key of days) {
      const day = new Date(key);
      const ads = await this.adsModel.find({ date: { $gte: startOfDay(day), $lte: endOfDay(day) } }).lean();
      for (const a of ads) {
    const k = `${key}::${(a as any).adGroupId}`;
    const prev = adsByDayAdGroup.get(k) || 0;
    adsByDayAdGroup.set(k, prev + ((a as any).spentAmount || 0));
      }
    }

    // 3) Tính toán từng dòng
    const result: any[] = [];
    for (const r of s1) {
      const order = orderMap.get(String(r.orderId));
      const createdAt = (r as any).createdAt ? new Date((r as any).createdAt) : new Date();
      const dayKey = startOfDay(createdAt).getTime();
      const rowsSameDay = byDayOrders.get(dayKey) || [];

      // Tổng số lượng của các đơn trong cùng adGroupId (cho Ads) và cùng ngày
      const adGroupId = order?.adGroupId || '0';
      const ordersSameAdGroup = rowsSameDay.filter(x => (orderMap.get(String(x.orderId))?.adGroupId || '0') === adGroupId);
      const totalQtyInAdGroup = ordersSameAdGroup.reduce((s, x) => s + (x.quantity || 0), 0) || 0;
      const adsSpent = adsByDayAdGroup.get(`${dayKey}::${adGroupId}`) || 0;
      const adsCostPerUnit = totalQtyInAdGroup > 0 ? adsSpent / totalQtyInAdGroup : 0;
      const adsCost = adsCostPerUnit * (r.quantity || 0);

      // Tổng số lượng của các đơn có productionStatus = "Đã trả kết quả" theo ngày
      const doneRows = rowsSameDay.filter(x => (x.productionStatus || '') === 'Đã trả kết quả');
      const totalQtyDone = doneRows.reduce((s, x) => s + (x.quantity || 0), 0) || 0;

      // Lương nhân công theo ngày / tổng SL done * SL của đơn
      const totalLabor = laborByDay.get(dayKey) || 0;
      const laborPerUnit = totalQtyDone > 0 ? totalLabor / totalQtyDone : 0;
      const laborCost = laborPerUnit * (r.quantity || 0);

      // Chi phí khác theo ngày / tổng SL done * SL của đơn
      const totalOther = otherByDay.get(dayKey) || 0;
      const otherPerUnit = totalQtyDone > 0 ? totalOther / totalQtyDone : 0;
      const otherCost = otherPerUnit * (r.quantity || 0);

      // Giá vốn = importPrice * SL
      const productId = order?.productId ? String(order.productId) : (r.productId ? String(r.productId) : undefined);
      const importPrice = productId ? (productImportMap.get(productId) || 0) : 0;
      const capitalCost = importPrice * (r.quantity || 0);

      // Doanh thu = mustPay (theo yêu cầu: bằng cột Phải Trả công ty)
      const revenue = r.mustPay || 0;

      // Lợi nhuận = Doanh thu - Giá vốn - Chi phí khác - Chi phí Nhân công - Chi phí ads
      const profit = revenue - capitalCost - otherCost - laborCost - adsCost;

      result.push({
        orderId: r.orderId,
        createdAt: r.createdAt,
        product: r.product,
        customerName: r.customerName,
        quantity: r.quantity,
        productionStatus: r.productionStatus,
        orderStatus: r.orderStatus,
        trackingNumber: r.trackingNumber,
        codAmount: r.codAmount,
        quotePrice: r.quotePrice,
        mustPay: r.mustPay,
        paid: r.paid,
        needToPay: r.needToPay,
        // Bổ sung cột Tổng hợp 2
        adsCost: Number(adsCost.toFixed(2)),
        laborCost: Number(laborCost.toFixed(2)),
        otherCost: Number(otherCost.toFixed(2)),
        capitalCost: Number(capitalCost.toFixed(2)),
        revenue: Number(revenue.toFixed(2)),
        profit: Number(profit.toFixed(2)),
        adGroupId,
      });
    }

    // Sắp xếp theo ngày tạo mới nhất lên trên
    return result.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA; // Descending order (mới nhất trước)
    });
  }

  /**
   * Debug method để kiểm tra dữ liệu Summary1 trong database
   */
  async debugSummary1() {
    try {
      const s1Count = await this.summary1Model.countDocuments();
      const s1Sample = await this.summary1Model.find().limit(3).lean();
      
      const orderCount = await this.orderModel.countDocuments();
      const orderSample = await this.orderModel.find().limit(3).lean();
      
      const adsCount = await this.adsModel.countDocuments();
      const otherCount = await this.otherCostModel.countDocuments();
      const laborCount = await this.laborModel.countDocuments();
      const productCount = await this.productModel.countDocuments();

      return {
        summary1: { count: s1Count, sample: s1Sample },
        testOrder2: { count: orderCount, sample: orderSample },
        advertisingCost: { count: adsCount },
        otherCost: { count: otherCount },
        laborCost1: { count: laborCount },
        product: { count: productCount }
      };
    } catch (error) {
      return { error: error.message };
    }
  }
}
