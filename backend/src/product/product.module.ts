/**
 * File: product.module.ts
 * Mục đích: Gom các thành phần quản lý Sản phẩm với Vision AI (controller, service, schema).
 */
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { VisionAIService } from './vision-ai.service';
import { FileUploadService } from './file-upload.service';
import { Product, ProductSchema } from './schemas/product.schema';
import { OpenAIConfigModule } from '../openai-config/openai-config.module';

// Ensure upload directory exists
const uploadPath = join(process.cwd(), 'uploads', 'products');
if (!existsSync(uploadPath)) {
  mkdirSync(uploadPath, { recursive: true });
}

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema }
    ]),
    MulterModule.register({
      storage: diskStorage({
        destination: uploadPath,
        filename: (req, file, cb) => {
          const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
          cb(null, uniqueName);
        },
      }),
      fileFilter: (req, file, cb) => {
        const allowedMimeTypes = [
          'image/jpeg',
          'image/png', 
          'image/webp',
          'image/gif'
        ];
        if (allowedMimeTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error(`Định dạng file không được hỗ trợ. Chỉ chấp nhận: ${allowedMimeTypes.join(', ')}`), false);
        }
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
        files: 10
      },
    }),
    OpenAIConfigModule
  ],
  controllers: [ProductController],
  providers: [ProductService, VisionAIService, FileUploadService],
  exports: [ProductService, VisionAIService]
})
export class ProductModule {}
