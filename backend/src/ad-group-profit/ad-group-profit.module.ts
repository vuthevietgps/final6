/**
 * File: ad-group-profit/ad-group-profit.module.ts
 * Mục đích: Module cho chức năng báo cáo lợi nhuận nhóm quảng cáo
 */
import { Module } from '@nestjs/common';
import { AdGroupProfitController } from './ad-group-profit.controller';
import { AdGroupProfitService } from './ad-group-profit.service';
import { Summary2Module } from '../summary2/summary2.module';
import { MongooseModule } from '@nestjs/mongoose';
import { AdvertisingCost, AdvertisingCostSchema } from '../advertising-cost/schemas/advertising-cost.schema';
import { AdGroup, AdGroupSchema } from '../ad-group/schemas/ad-group.schema';

@Module({
  imports: [
    Summary2Module, // Import Summary2Module để sử dụng Summary2Service
    MongooseModule.forFeature([
      { name: AdvertisingCost.name, schema: AdvertisingCostSchema },
      { name: AdGroup.name, schema: AdGroupSchema },
    ])
  ],
  controllers: [AdGroupProfitController],
  providers: [AdGroupProfitService],
  exports: [AdGroupProfitService],
})
export class AdGroupProfitModule {}
