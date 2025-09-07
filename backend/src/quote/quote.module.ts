/**
 * File: quote.module.ts
 * Mục đích: Định nghĩa QuoteModule, gom controller/service/schema liên quan tới tính năng
 *   "Báo giá đại lý".
 */
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { QuoteService } from './quote.service';
import { QuoteController } from './quote.controller';
import { Quote, QuoteSchema } from './schemas/quote.schema';
import { GoogleSyncModule } from '../google-sync/google-sync.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Quote.name, schema: QuoteSchema }
    ]),
    GoogleSyncModule,
  ],
  controllers: [QuoteController],
  providers: [QuoteService],
  exports: [QuoteService]
})
export class QuoteModule {}
