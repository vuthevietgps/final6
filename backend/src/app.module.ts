/**
 * File: app.module.ts
 * Mục đích: Root module của ứng dụng NestJS, import các module con (user, product,
 *   quote, v.v.), cấu hình Mongoose và các provider toàn cục nếu cần.
 */
/**
 * App Module - Module chính của ứng dụng NestJS
 * 
 * Chức năng:
 * - Khởi tạo kết nối MongoDB Atlas
 * - Import các module con (UserModule, ExportUserModule, ImportUserModule)
 * - Cấu hình các providers và controllers chính
 */

import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { ExportUserModule } from './export-user/export-user.module';
import { ImportUserModule } from './import-user/import-user.module';
import { ProductionStatusModule } from './production-status/production-status.module';
import { OrderStatusModule } from './order-status/order-status.module';
import { DeliveryStatusModule } from './delivery-status/delivery-status.module';
import { ProductCategoryModule } from './product-category/product-category.module';
import { ProductModule } from './product/product.module';
import { QuoteModule } from './quote/quote.module';
import { AdGroupModule } from './ad-group/ad-group.module';
import { AdAccountModule } from './ad-account/ad-account.module';
import { OtherCostModule } from './other-cost/other-cost.module';
import { AdvertisingCostModule } from './advertising-cost/advertising-cost.module';
import { TestOrderModule } from './test-order/test-order.module';
import { TestOrder2Module } from './test-order2/test-order2.module';
import { SalaryConfigModule } from './salary-config/salary-config.module';
import { LaborCost1Module } from './labor-cost1/labor-cost1.module';
import { GoogleSyncModule } from './google-sync/google-sync.module';
import { HealthModule } from './health/health.module';
import { Summary2Module } from './summary2/summary2.module';
import { AdGroupProfitModule } from './ad-group-profit/ad-group-profit.module';
import { ProductProfitReportModule } from './product-profit-report/product-profit-report.module';
import { AdGroupProfitReportModule } from './ad-group-profit-report/ad-group-profit-report.module';

@Module({
  imports: [
  // Bật scheduler để dùng cron job
  ScheduleModule.forRoot(),
  // Kết nối MongoDB Atlas với connection string chứa credentials và UTF-8 config
  MongooseModule.forRoot('mongodb+srv://dinhvigps07:zn0dOrNeZH2yx2yO@smarterp-dev.khsfdta.mongodb.net/management-system', {
      connectionFactory: (connection) => {
        connection.on('connected', () => {
          console.log('MongoDB connected with UTF-8 support');
        });
        return connection;
      },
    }),
    
    // Import AuthModule để sử dụng JWT authentication
    AuthModule,
    
  // Import UserModule để sử dụng các chức năng quản lý user
    UserModule,
    
    // Import ExportUserModule để sử dụng các chức năng xuất CSV
  ExportUserModule,
    
    // Import ImportUserModule để sử dụng các chức năng nhập CSV
    ImportUserModule,
    
    // Import ProductionStatusModule để quản lý trạng thái sản xuất
    ProductionStatusModule,
    
    // Import OrderStatusModule để quản lý trạng thái đơn hàng
    OrderStatusModule,
    
    // Import DeliveryStatusModule để quản lý trạng thái giao hàng
    DeliveryStatusModule,
    
    // Import ProductCategoryModule để quản lý nhóm sản phẩm
    ProductCategoryModule,
    
    // Import ProductModule để quản lý sản phẩm
    ProductModule,
    
    // Import QuoteModule để quản lý báo giá đại lý
    QuoteModule,
    
  // Import AdGroupModule để quản lý nhóm quảng cáo
  AdGroupModule,
  // Import AdAccountModule để quản lý tài khoản quảng cáo
  AdAccountModule,
  // Import OtherCostModule để quản lý Chi Phí Khác
  OtherCostModule,
  // Module Đơn Hàng Thử Nghiệm
  TestOrderModule,
  // Module Đơn Hàng Thử Nghiệm 2
  TestOrder2Module,
  AdvertisingCostModule,
  SalaryConfigModule,
  Summary2Module,
  LaborCost1Module,
  // Module đồng bộ Google Sheets định kỳ
  GoogleSyncModule,
  // Health check endpoint
  HealthModule,
  // Module báo cáo lợi nhuận nhóm quảng cáo
  AdGroupProfitModule,
  // Module báo cáo lợi nhuận sản phẩm theo ngày
  ProductProfitReportModule,
  // Module báo cáo lợi nhuận của Quảng Cáo theo ngày
  AdGroupProfitReportModule,
  ],
  controllers: [], // Không có controllers ở level app, chỉ có ở modules con
  providers: [],   // Không có providers chung ở level app
})
export class AppModule {}
