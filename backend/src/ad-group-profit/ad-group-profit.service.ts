/**
 * File: ad-group-profit/ad-group-profit.service.ts
 * Mục đích: Tính toán báo cáo lợi nhuận theo nhóm quảng cáo theo ngày từ dữ liệu Summary2
 */
import { Injectable } from '@nestjs/common';
import { Summary2Service } from '../summary2/summary2.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AdvertisingCost, AdvertisingCostDocument } from '../advertising-cost/schemas/advertising-cost.schema';
import { AdGroup, AdGroupDocument } from '../ad-group/schemas/ad-group.schema';

export interface AdGroupProfitReport {
  date: string; // Ngày tháng (YYYY-MM-DD)
  adGroupId: string; // ID nhóm quảng cáo
  adGroupName: string; // Tên nhóm quảng cáo
  adsCost: number; // Chi phí quảng cáo theo ngày (QC2)
  totalProfit: number; // Lợi nhuận tổng hợp (Summary2)
  orderCount: number; // Số đơn hàng
  totalQuantity: number; // Tổng số lượng
  totalRevenue: number; // Tổng doanh thu
}

@Injectable()
export class AdGroupProfitService {
  constructor(
    private readonly summary2Service: Summary2Service,
    @InjectModel(AdvertisingCost.name) private readonly advertisingCostModel: Model<AdvertisingCostDocument>,
    @InjectModel(AdGroup.name) private readonly adGroupModel: Model<AdGroupDocument>,
  ) {}

  /**
   * Lấy báo cáo lợi nhuận theo nhóm quảng cáo theo ngày
   */
  async getAdGroupProfitReport(params: { 
    from?: string; 
    to?: string; 
    agentId?: string;
  }): Promise<AdGroupProfitReport[]> {
    try {
      // Lấy dữ liệu từ Summary2
      const summary2Data = await this.summary2Service.getSummary2(params);
      
      if (!summary2Data || summary2Data.length === 0) {
        return [];
      }

  // Gom nhóm theo ngày và adGroupId từ Summary2 (lợi nhuận/doanh thu/số lượng)
      const groupedData = new Map<string, {
        date: string;
        adGroupId: string;
        adGroupName: string;
        orders: any[];
      }>();

      for (const item of summary2Data) {
        // Chuyển đổi ngày về định dạng YYYY-MM-DD
        const date = new Date(item.createdAt);
        const dateKey = date.toISOString().split('T')[0];
        
        const adGroupId = item.adGroupId || 'unknown';
        const key = `${dateKey}_${adGroupId}`;
        
        if (!groupedData.has(key)) {
          groupedData.set(key, {
            date: dateKey,
            adGroupId,
            adGroupName: `Nhóm QC ${adGroupId}`, // Tạm thời dùng tên mặc định
            orders: []
          });
        }
        
        groupedData.get(key)!.orders.push(item);
      }

      // Map tên nhóm quảng cáo thực tế
      const adGroupIds = Array.from(new Set(Array.from(groupedData.values()).map(v => v.adGroupId)));
      const adGroupDocs = await this.adGroupModel.find({ adGroupId: { $in: adGroupIds } }).lean();
      const nameMap = new Map<string, string>();
      for (const ag of adGroupDocs) nameMap.set((ag as any).adGroupId, (ag as any).name || `Nhóm QC ${(ag as any).adGroupId}`);

      // Lấy chi phí quảng cáo theo ngày từ AdvertisingCost (QC2)
      let adsMatch: any = {};
      if (params.from) adsMatch.date = { ...(adsMatch.date || {}), $gte: new Date(params.from) };
      if (params.to) adsMatch.date = { ...(adsMatch.date || {}), $lte: new Date(params.to) };
      if (adGroupIds.length) adsMatch.adGroupId = { $in: adGroupIds };
      const costAgg = await this.advertisingCostModel.aggregate([
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
                date: { $dateFromParts: { year: '$_id.y', month: '$_id.m', day: '$_id.d' } },
              },
            },
            sumSpent: 1,
          },
        },
      ]);
      const costMap = new Map<string, Map<string, number>>();
      for (const row of costAgg as any[]) {
        const agid = String(row.adGroupId || '');
        if (!agid) continue;
        if (!costMap.has(agid)) costMap.set(agid, new Map<string, number>());
        costMap.get(agid)!.set(row.date, Number(row.sumSpent || 0));
      }

      // Tính toán báo cáo
      const reports: AdGroupProfitReport[] = [];
      
      for (const group of groupedData.values()) {
        const totalProfit = group.orders.reduce((sum, order) => sum + (order.profit || 0), 0);
        const totalQuantity = group.orders.reduce((sum, order) => sum + (order.quantity || 0), 0);
        const totalRevenue = group.orders.reduce((sum, order) => sum + (order.revenue || 0), 0);
        const orderCount = group.orders.length;
        const name = nameMap.get(group.adGroupId) || group.adGroupName;
        const adsCost = costMap.get(group.adGroupId)?.get(group.date) ?? 0;

        reports.push({
          date: group.date,
          adGroupId: group.adGroupId,
          adGroupName: name,
          adsCost,
          totalProfit: Number(totalProfit.toFixed(2)),
          orderCount,
          totalQuantity,
          totalRevenue: Number(totalRevenue.toFixed(2))
        });
      }

      // Sắp xếp theo ngày giảm dần, sau đó theo tên nhóm
      reports.sort((a, b) => {
        const dateCompare = new Date(b.date).getTime() - new Date(a.date).getTime();
        if (dateCompare !== 0) return dateCompare;
        return a.adGroupName.localeCompare(b.adGroupName);
      });

      return reports;
    } catch (error) {
      console.error('Lỗi khi tạo báo cáo lợi nhuận nhóm quảng cáo:', error);
      throw new Error('Không thể tạo báo cáo lợi nhuận nhóm quảng cáo');
    }
  }

  /**
   * Lấy thống kê tổng quan
   */
  async getSummaryStats(params: { 
    from?: string; 
    to?: string; 
    agentId?: string;
  }): Promise<{
    totalProfit: number;
    totalOrders: number;
    totalAdGroups: number;
    avgProfitPerOrder: number;
  }> {
    try {
      const reports = await this.getAdGroupProfitReport(params);
      
      const totalProfit = reports.reduce((sum, report) => sum + report.totalProfit, 0);
      const totalOrders = reports.reduce((sum, report) => sum + report.orderCount, 0);
    const uniqueAdGroups = new Set(reports.map(r => r.adGroupId || r.adGroupName)).size;
      const avgProfitPerOrder = totalOrders > 0 ? totalProfit / totalOrders : 0;

      return {
        totalProfit: Number(totalProfit.toFixed(2)),
        totalOrders,
        totalAdGroups: uniqueAdGroups,
        avgProfitPerOrder: Number(avgProfitPerOrder.toFixed(2))
      };
    } catch (error) {
      console.error('Lỗi khi tính thống kê tổng quan:', error);
      return {
        totalProfit: 0,
        totalOrders: 0,
        totalAdGroups: 0,
        avgProfitPerOrder: 0
      };
    }
  }
}
