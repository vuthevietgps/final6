/**
 * File: test-order2/test-order2.module.ts
 */
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TestOrder2, TestOrder2Schema } from './schemas/test-order2.schema';
import { TestOrder2Service } from './test-order2.service';
import { GoogleSyncModule } from '../google-sync/google-sync.module';
import { TestOrder2Controller } from './test-order2.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TestOrder2.name, schema: TestOrder2Schema },
    ]),
    GoogleSyncModule,
  ],
  providers: [TestOrder2Service],
  controllers: [TestOrder2Controller],
})
export class TestOrder2Module {}
