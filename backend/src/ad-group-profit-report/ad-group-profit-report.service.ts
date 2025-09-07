/**
 * File: ad-group-profit-report/ad-group-profit-report.service.ts
 * Mục đích: Service xử lý nghiệp vụ báo cáo lợi nhuận nhóm quảng cáo theo ngày
 * Trả về cấu trúc tương tự product-profit-report
 */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Summary2Service } from '../summary2/summary2.service';
import { AdGroup, AdGroupDocument } from '../ad-group/schemas/ad-group.schema';
import { Product, ProductDocument } from '../product/schemas/product.schema';
import { User, UserDocument } from '../user/user.schema';
import { AdGroupProfitFilterDto } from './dto/ad-group-profit-filter.dto';
import { AdvertisingCost, AdvertisingCostDocument } from '../advertising-cost/schemas/advertising-cost.schema';

@Injectable()
export class AdGroupProfitReportService {
  constructor(
    private summary2Service: Summary2Service,
    @InjectModel(AdGroup.name) private adGroupModel: Model<AdGroupDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
  @InjectModel(User.name) private userModel: Model<UserDocument>,
  @InjectModel(AdvertisingCost.name) private advertisingCostModel: Model<AdvertisingCostDocument>,
  ) {}

  async getAdGroupProfitReport(filter: AdGroupProfitFilterDto) {
    const { from, to } = this.calculateDateRange(filter.year, filter.period, filter.fromDate, filter.toDate);

    // Lấy dữ liệu summary2 trong khoảng ngày (doanh thu, lợi nhuận, tổng chi phí)
    const summary2Data = await this.summary2Service.getSummary2({ from: from.toISOString(), to: to.toISOString() });

    // Lấy Chi Phí Quảng Cáo 2: tổng spentAmount theo adGroupId + ngày trong khoảng
    // Kết quả: Map<adGroupId, Map<YYYY-MM-DD, spentSum>>
    const adsMatch: any = { date: { $gte: from, $lte: to } };
    if (filter.adGroupId) adsMatch.adGroupId = filter.adGroupId;
    const adsCostAgg = await this.advertisingCostModel.aggregate([
      { $match: adsMatch },
      {
        $group: {
          _id: {
            adGroupId: '$adGroupId',
            y: { $year: '$date' },
            m: { $month: '$date' },
            d: { $dayOfMonth: '$date' },
          },
          sumSpent: { $sum: { $ifNull: ['$spentAmount', 0] } },
        },
      },
      {
        $project: {
          _id: 0,
          adGroupId: '$_id.adGroupId',
          date: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: {
                $dateFromParts: { year: '$_id.y', month: '$_id.m', day: '$_id.d' }
              },
            },
          },
          sumSpent: 1,
        },
      },
    ]);
    const adsCostMap = new Map<string, Map<string, number>>();
    for (const row of adsCostAgg as any[]) {
      const agid = String(row.adGroupId || '');
      if (!agid) continue;
      if (!adsCostMap.has(agid)) adsCostMap.set(agid, new Map<string, number>());
      adsCostMap.get(agid)!.set(row.date, Number(row.sumSpent || 0));
    }

    // Lấy thông tin ad group để map tên
    const adGroups = await this.adGroupModel.find().populate('productId', 'name').populate('agentId', 'name').lean();
    const adGroupNameMap = new Map<string, { name: string; productName: string; agentName: string }>();
    adGroups.forEach(ag => {
      adGroupNameMap.set(ag.adGroupId, {
        name: ag.name,
        productName: (ag as any).productId?.name || 'Unknown',
        agentName: (ag as any).agentId?.name || 'Unknown'
      });
    });

    // Tạo danh sách ngày liên tục
    const dates: string[] = [];
    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d).toISOString().split('T')[0]);
    }

  // Nhóm dữ liệu theo adGroupId + ngày từ summary2
    type Daily = { date: string; profit: number; revenue: number; totalCost: number; orders: number };
    const byAdGroup = new Map<string, Map<string, Daily>>();

    for (const row of summary2Data) {
      const adGroupId = String((row as any).adGroupId || '');
      if (!adGroupId) continue;
      if (filter.adGroupId && adGroupId !== filter.adGroupId) continue;
      const date = new Date((row as any).createdAt).toISOString().split('T')[0];
      const revenue = Number((row as any).revenue || (row as any).mustPay || 0);
  const cost = Number((row as any).adsCost || 0) + Number((row as any).laborCost || 0) + Number((row as any).otherCost || 0) + Number((row as any).capitalCost || 0);
      const profit = Number((row as any).profit ?? (revenue - cost));

      if (!byAdGroup.has(adGroupId)) byAdGroup.set(adGroupId, new Map<string, Daily>());
      const map = byAdGroup.get(adGroupId)!;
      const current = map.get(date) || { date, profit: 0, revenue: 0, totalCost: 0, orders: 0 };
      current.profit += profit;
      current.revenue += revenue;
      current.totalCost += cost;
      current.orders += 1;
      map.set(date, current);
    }

  // Chuyển thành ma trận theo định dạng giống product report
    const data: any[] = [];
    const adGroupsOut: any[] = [];
    const allAdGroupIds = new Set<string>([...byAdGroup.keys(), ...adsCostMap.keys()]);
    allAdGroupIds.forEach((adGroupId) => {
      const dayMap = byAdGroup.get(adGroupId) || new Map<string, Daily>();
      const info = adGroupNameMap.get(adGroupId) || { name: 'Unknown', productName: 'Unknown', agentName: 'Unknown' };
      adGroupsOut.push({ id: adGroupId, name: info.name });

      const row: any = {
        adGroupId,
        adGroupName: info.name,
        productName: info.productName,
        agentName: info.agentName,
        dailyProfits: {} as Record<string, number>,
        dailyCosts: {} as Record<string, number>,
        totalProfit: 0,
        totalRevenue: 0,
        totalCost: 0,
        totalOrders: 0
      };

  const adDailyAdsCost = adsCostMap.get(adGroupId);
      dates.forEach(date => {
        const d = dayMap.get(date);
        row.dailyProfits[date] = d?.profit || 0;
        // Chi phí mỗi ngày hiển thị sẽ lấy từ Chi Phí Quảng Cáo 2 (spentAmount), nếu không có thì 0
        const adsSpent = adDailyAdsCost?.get(date) ?? 0;
        row.dailyCosts[date] = adsSpent;
        if (d) {
          row.totalProfit += d.profit;
          row.totalRevenue += d.revenue;
          // Tổng chi phí hiển thị cũng dùng tổng theo AdsSpent (cộng toàn bộ ngày)
          // Nếu muốn hiển thị tổng chi phí tổng hợp từ summary2, có thể thay bằng d.totalCost; nhưng theo yêu cầu, dùng QC2.
          row.totalCost += adsSpent;
          row.totalOrders += d.orders;
        } else {
          // Không có dòng summary trong ngày nhưng vẫn cộng chi phí QC nếu có
          row.totalCost += adsSpent;
        }
      });

      data.push(row);
    });

    const summary = {
      totalProfit: data.reduce((s, r) => s + r.totalProfit, 0),
      totalRevenue: data.reduce((s, r) => s + r.totalRevenue, 0),
      totalCost: data.reduce((s, r) => s + r.totalCost, 0),
      totalOrders: data.reduce((s, r) => s + (r.totalOrders || 0), 0),
    };

    return {
      adGroups: adGroupsOut,
      dates,
      data,
      summary
    };
  }

  private calculateDateRange(year?: number, period?: string, fromDate?: string, toDate?: string) {
    const now = new Date();
    let from: Date, to: Date;
    if (period === 'custom' && fromDate && toDate) {
      from = new Date(fromDate);
      to = new Date(toDate);
    } else if (year) {
      from = new Date(year, 0, 1);
      to = new Date(year, 11, 31, 23, 59, 59);
    } else {
      switch (period) {
        case 'week':
          from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); to = now; break;
        case '10days':
          from = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000); to = now; break;
        case '30days':
          from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); to = now; break;
        case 'lastMonth':
          from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
          break;
        case 'thisMonth':
          from = new Date(now.getFullYear(), now.getMonth(), 1); to = now; break;
        default:
          from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); to = now;
      }
    }
    return { from, to };
  }

  async getAvailableYears(): Promise<number[]> {
    // Dựa trên dữ liệu Summary2 (actually Summary1 in Summary2Service), dùng chính service phụ trợ
    // Ở đây gọi tạm từ Summary2Service không có API years, nên tạm lấy từ today and last 3 years for safety.
    const now = new Date();
    return [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2];
  }
}
