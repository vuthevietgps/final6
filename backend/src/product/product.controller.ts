/**
 * File: product.controller.ts
 * Mục đích: REST API CRUD cho Sản phẩm với tích hợp Vision AI.
 * Lưu ý: Sử dụng DTO để validate input và gọi service thực thi nghiệp vụ.
 */
import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFiles,
  BadRequestException
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { VisionAIService } from './vision-ai.service';
import { FileUploadService } from './file-upload.service';

@Controller('products')
export class ProductController {
  constructor(
    private readonly productService: ProductService,
    private readonly visionAIService: VisionAIService,
    private readonly fileUploadService: FileUploadService,
  ) {}

  @Post()
  create(@Body() createProductDto: CreateProductDto) {
    return this.productService.create(createProductDto);
  }

  @Get()
  findAll(@Query() query?: any) {
    return this.productService.findAll(query);
  }

  @Get('stats')
  getStats() {
    return this.productService.getStats();
  }

  @Get('category/:categoryId')
  getByCategory(@Param('categoryId') categoryId: string) {
    return this.productService.getByCategory(categoryId);
  }

  @Post('seed')
  @HttpCode(HttpStatus.CREATED)
  seedSampleData() {
    return this.productService.seedSampleData();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productService.update(id, updateProductDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.productService.remove(id);
  }

  /**
   * Upload và phân tích ảnh sản phẩm với AI
   */
  @Post('upload-images')
  @UseInterceptors(FilesInterceptor('images', 10, {}))
  async uploadProductImages(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('fanpageId') fanpageId?: string,
    @Body('configId') configId?: string
  ) {
    try {
      // Validate files
      this.fileUploadService.validateFiles(files);

      // Process uploaded files
      const uploadedFiles = await this.fileUploadService.processUploadedFiles(files);

      // Analyze each image with Vision AI
      const analyzedImages = [];
      for (const file of uploadedFiles) {
        const analysis = await this.visionAIService.analyzeProductImage(file.url, configId);
        
        analyzedImages.push({
          ...file,
          aiAnalysis: analysis
        });
      }

      return {
        success: true,
        message: `Đã tải lên và phân tích ${analyzedImages.length} ảnh`,
        data: {
          images: analyzedImages,
          totalAnalyzed: analyzedImages.length,
          totalKeywords: analyzedImages.reduce((sum, img) => 
            sum + (img.aiAnalysis?.keywords?.length || 0), 0
          )
        }
      };

    } catch (error) {
      throw new BadRequestException(`Lỗi tải ảnh: ${error.message}`);
    }
  }

  /**
   * Tìm sản phẩm tương tự dựa trên mô tả
   */
  @Post('find-similar')
  async findSimilarProducts(
    @Body('query') query: string,
    @Body('fanpageId') fanpageId: string,
    @Body('limit') limit: number = 5
  ) {
    if (!query || !fanpageId) {
      throw new BadRequestException('Thiếu thông tin query hoặc fanpageId');
    }

    const recommendations = await this.visionAIService.findSimilarProducts(
      query, 
      fanpageId, 
      limit
    );

    return {
      success: true,
      data: {
        query,
        fanpageId,
        recommendations,
        total: recommendations.length
      }
    };
  }

  /**
   * Phân tích ảnh từ URL
   */
  @Post('analyze-image')
  async analyzeImageUrl(
    @Body('imageUrl') imageUrl: string,
    @Body('configId') configId?: string
  ) {
    if (!imageUrl) {
      throw new BadRequestException('Thiếu URL ảnh');
    }

    const analysis = await this.visionAIService.analyzeProductImage(imageUrl, configId);

    return {
      success: true,
      data: {
        imageUrl,
        analysis
      }
    };
  }

  /**
   * Tạo variant ảnh cho fanpage cụ thể
   */
  @Post(':id/create-fanpage-variant')
  async createFanpageVariant(
    @Param('id') productId: string,
    @Body('fanpageId') fanpageId: string,
    @Body('imageIndex') imageIndex: number = 0,
    @Body('customization') customization?: any
  ) {
    if (!fanpageId) {
      throw new BadRequestException('Thiếu fanpageId');
    }

    const product = await this.productService.findOne(productId);
    if (!product || !product.images || product.images.length === 0) {
      throw new BadRequestException('Sản phẩm không có ảnh');
    }

    if (imageIndex >= product.images.length) {
      throw new BadRequestException('Index ảnh không hợp lệ');
    }

    const originalImage = product.images[imageIndex];
    
    // Convert product image to UploadedFile format for processing
    const uploadedFileFormat = {
      originalName: `product_${productId}_${imageIndex}`,
      filename: originalImage.url.split('/').pop() || 'image',
      path: '', // Not needed for variant generation
      url: originalImage.url,
      size: 0, // Not critical for this operation
      mimetype: 'image/jpeg' // Default assumption
    };
    
    const variantUrl = await this.fileUploadService.generateFanpageVariants(
      uploadedFileFormat,
      fanpageId,
      customization
    );

    return {
      success: true,
      data: {
        productId,
        fanpageId,
        originalImage: originalImage.url,
        variantUrl,
        customization
      }
    };
  }

  /**
   * Lấy thống kê AI analysis
   */
  @Get('ai-stats')
  async getAIStats(@Query('fanpageId') fanpageId?: string) {
    const stats = await this.productService.getAIAnalysisStats(fanpageId);
    
    return {
      success: true,
      data: stats
    };
  }
}
