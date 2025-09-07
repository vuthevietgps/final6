/**
 * File: product-profit-report/product-profit-report.module.ts
 * Mục đích: Module báo cáo lợi nhuận sản phẩm theo ngày từ dữ liệu Summary2
 */
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductProfitReportController } from './product-profit-report.controller';
import { ProductProfitReportService } from './product-profit-report.service';
import { Summary1, Summary1Schema } from '../google-sync/schemas/summary1.schema';
import { TestOrder2, TestOrder2Schema } from '../test-order2/schemas/test-order2.schema';
import { AdvertisingCost, AdvertisingCostSchema } from '../advertising-cost/schemas/advertising-cost.schema';
import { OtherCost, OtherCostSchema } from '../other-cost/schemas/other-cost.schema';
import { LaborCost1, LaborCost1Schema } from '../labor-cost1/schemas/labor-cost1.schema';
import { Product, ProductSchema } from '../product/schemas/product.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Summary1.name, schema: Summary1Schema },
      { name: TestOrder2.name, schema: TestOrder2Schema },
      { name: AdvertisingCost.name, schema: AdvertisingCostSchema },
      { name: OtherCost.name, schema: OtherCostSchema },
      { name: LaborCost1.name, schema: LaborCost1Schema },
      { name: Product.name, schema: ProductSchema },
    ]),
  ],
  controllers: [ProductProfitReportController],
  providers: [ProductProfitReportService],
  exports: [ProductProfitReportService],
})
export class ProductProfitReportModule {}
