/**
 * File: advertising-cost/advertising-cost.module.ts
 * Mục đích: Module NestJS cho Chi Phí Quảng Cáo.
 */
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdvertisingCost, AdvertisingCostSchema } from './schemas/advertising-cost.schema';
import { AdvertisingCostService } from './advertising-cost.service';
import { AdvertisingCostController } from './advertising-cost.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AdvertisingCost.name, schema: AdvertisingCostSchema },
    ]),
  ],
  controllers: [AdvertisingCostController],
  providers: [AdvertisingCostService],
})
export class AdvertisingCostModule {}
