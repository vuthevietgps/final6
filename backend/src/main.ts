/**
 * File: main.ts
 * Mục đích: Điểm khởi động ứng dụng NestJS, cấu hình global (CORS, ValidationPipe, UTF-8),
 *   và lắng nghe cổng HTTP cho backend.
 *
 * Chức năng:
 * - Khởi tạo NestJS application
 * - Cấu hình CORS cho phép frontend kết nối
 * - Khởi động server trên port 3000 (có thể cấu hình qua biến môi trường PORT)
 */

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  // Tạo NestJS application instance từ AppModule
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  // Cấu hình static files cho uploads
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });
  
  // Cấu hình CORS để cho phép frontend kết nối
  app.enableCors({
    origin: ['http://localhost:4200', 'http://localhost:4201'],  // Cho phép cả port 4200 và 4201
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',          // Các HTTP methods được phép
    credentials: true,                                   // Cho phép gửi cookies/credentials
  });

  // Cấu hình để handle UTF-8 encoding
  app.use((req, res, next) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    next();
  });

  // Thêm validation pipe cho toàn bộ ứng dụng
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,        // Chỉ cho phép properties được định nghĩa trong DTO
    forbidNonWhitelisted: true,  // Trả lỗi nếu có property không được định nghĩa
    transform: true,        // Tự động transform data type
    transformOptions: {
      enableImplicitConversion: true, // Cho phép chuyển đổi chuỗi số sang number/date tự động
    },
  }));

  // Khởi động server trên port cấu hình (PORT env) hoặc mặc định 3000
  const port = parseInt(process.env.PORT || '3000', 10);
  await app.listen(port);
  console.log(`Backend server is running on http://localhost:${port}`);
}

// Gọi hàm bootstrap để khởi động ứng dụng
bootstrap();
