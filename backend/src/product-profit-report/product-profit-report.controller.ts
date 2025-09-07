/**
 * File: product-profit-report/product-profit-report.controller.ts
 * Mục đích: Controller API cho báo cáo lợi nhuận sản phẩm theo ngày
 */
import { Controller, Get, Query } from '@nestjs/common';
import { ProductProfitReportService } from './product-profit-report.service';
import { ProductProfitFilterDto } from './dto/product-profit-filter.dto';

@Controller('product-profit-report')
export class ProductProfitReportController {
  constructor(private readonly productProfitReportService: ProductProfitReportService) {}

  /**
   * API lấy báo cáo lợi nhuận sản phẩm theo ngày
   * GET /product-profit-report
   */
  @Get()
  async getProductProfitReport(@Query() filterDto: ProductProfitFilterDto) {
    return this.productProfitReportService.getProductProfitReport(filterDto);
  }

  /**
   * API lấy danh sách năm có dữ liệu
   * GET /product-profit-report/years
   */
  @Get('years')
  async getAvailableYears() {
    const years = await this.productProfitReportService.getAvailableYears();
    return { years };
  }

  /**
   * API lấy thống kê tổng quan
   * GET /product-profit-report/summary
   */
  @Get('summary')
  async getSummary(@Query() filterDto: ProductProfitFilterDto) {
    const report = await this.productProfitReportService.getProductProfitReport(filterDto);
    return {
      summary: report.summary,
      productCount: report.products.length,
      dateRange: {
        from: report.dates[0] || null,
        to: report.dates[report.dates.length - 1] || null,
        totalDays: report.dates.length
      }
    };
  }
}
