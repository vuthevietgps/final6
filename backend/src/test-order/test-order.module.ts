/**
 * File: test-order/test-order.module.ts
 */
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TestOrder, TestOrderSchema } from './schemas/test-order.schema';
import { TestOrderService } from './test-order.service';
import { TestOrderController } from './test-order.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: TestOrder.name, schema: TestOrderSchema }])],
  providers: [TestOrderService],
  controllers: [TestOrderController],
})
export class TestOrderModule {}
