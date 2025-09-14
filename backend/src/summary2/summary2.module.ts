 /**
 * File: summary2/summary2.module.ts
 * Mục đích: Khai báo module Tổng hợp 2, gom dữ liệu từ Summary1 và bổ sung các cột chi phí.
 */
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Summary2Service } from './summary2.service';
import { Summary2Controller } from './summary2.controller';
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
  controllers: [Summary2Controller],
  providers: [Summary2Service],
  exports: [Summary2Service], // Export để có thể sử dụng ở module khác
})
export class Summary2Module {}
