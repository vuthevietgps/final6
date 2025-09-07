/**
 * File: ad-group-profit-report/ad-group-profit-report.module.ts
 * Mục đích: Module báo cáo lợi nhuận nhóm quảng cáo.
 */
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdGroupProfitReportController } from './ad-group-profit-report.controller';
import { AdGroupProfitReportService } from './ad-group-profit-report.service';
import { Summary2Module } from '../summary2/summary2.module';
import { AdGroup, AdGroupSchema } from '../ad-group/schemas/ad-group.schema';
import { Product, ProductSchema } from '../product/schemas/product.schema';
import { User, UserSchema } from '../user/user.schema';
import { AdvertisingCost, AdvertisingCostSchema } from '../advertising-cost/schemas/advertising-cost.schema';

@Module({
  imports: [
    Summary2Module,
    MongooseModule.forFeature([
      { name: AdGroup.name, schema: AdGroupSchema },
      { name: Product.name, schema: ProductSchema },
  { name: User.name, schema: UserSchema },
  { name: AdvertisingCost.name, schema: AdvertisingCostSchema }
    ])
  ],
  controllers: [AdGroupProfitReportController],
  providers: [AdGroupProfitReportService],
  exports: [AdGroupProfitReportService]
})
export class AdGroupProfitReportModule {}
