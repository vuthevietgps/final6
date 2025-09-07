/**
 * File: product.service.ts
 * Mục đích: Nghiệp vụ Sản phẩm và thao tác dữ liệu MongoDB.
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product, ProductDocument } from './schemas/product.schema';

@Injectable()
export class ProductService {
  constructor(
    @InjectModel(Product.name) 
    private productModel: Model<ProductDocument>
  ) {}

  async create(createProductDto: CreateProductDto): Promise<Product> {
    // Set default values
    if (!createProductDto.estimatedDeliveryDays) {
      createProductDto.estimatedDeliveryDays = 0;
    }
    if (!createProductDto.status) {
      createProductDto.status = 'Hoạt động';
    }

    const createdProduct = new this.productModel(createProductDto);
    return createdProduct.save();
  }

  async findAll(query?: any): Promise<Product[]> {
    const filter = {};
    
    // Filter by category
    if (query?.categoryId) {
      filter['categoryId'] = new Types.ObjectId(query.categoryId);
    }
    
    // Filter by status
    if (query?.status) {
      filter['status'] = query.status;
    }
    
    // Search by name
    if (query?.search) {
      filter['name'] = { $regex: query.search, $options: 'i' };
    }

    return this.productModel
      .find(filter)
      .populate('categoryId', 'name code icon color')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.productModel
      .findById(id)
      .populate('categoryId', 'name code icon color')
      .exec();
    
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto): Promise<Product> {
    const updatedProduct = await this.productModel
      .findByIdAndUpdate(id, updateProductDto, { new: true })
      .populate('categoryId', 'name code icon color')
      .exec();
    
    if (!updatedProduct) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    return updatedProduct;
  }

  async remove(id: string): Promise<void> {
    const result = await this.productModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
  }

  // Get products by category
  async getByCategory(categoryId: string): Promise<Product[]> {
    return this.productModel
      .find({ categoryId: new Types.ObjectId(categoryId) })
      .populate('categoryId', 'name code icon color')
      .sort({ createdAt: -1 })
      .exec();
  }

  // Get products statistics
  async getStats() {
    const total = await this.productModel.countDocuments();
    const active = await this.productModel.countDocuments({ status: 'Hoạt động' });
    const inactive = await this.productModel.countDocuments({ status: 'Tạm dừng' });
    
    // Calculate average costs
    const avgCosts = await this.productModel.aggregate([
      {
        $group: {
          _id: null,
          avgImportPrice: { $avg: '$importPrice' },
          avgShippingCost: { $avg: '$shippingCost' },
          avgPackagingCost: { $avg: '$packagingCost' },
          avgTotalCost: { $avg: '$totalCost' },
          avgDeliveryDays: { $avg: '$estimatedDeliveryDays' }
        }
      }
    ]);

    const averages = avgCosts[0] || {
      avgImportPrice: 0,
      avgShippingCost: 0,
      avgPackagingCost: 0,
      avgTotalCost: 0,
      avgDeliveryDays: 0
    };

    return {
      total,
      active,
      inactive,
      averageImportPrice: Math.round(averages.avgImportPrice || 0),
      averageShippingCost: Math.round(averages.avgShippingCost || 0),
      averagePackagingCost: Math.round(averages.avgPackagingCost || 0),
      averageTotalCost: Math.round(averages.avgTotalCost || 0),
      averageDeliveryDays: Math.round(averages.avgDeliveryDays || 0)
    };
  }

  // Seed sample data
  async seedSampleData(): Promise<Product[]> {
    // Get some categories first
    const categoryModel = this.productModel.db.model('ProductCategory');
    const categories = await categoryModel.find().limit(3);
    
    if (categories.length === 0) {
      throw new Error('No product categories found. Please create categories first.');
    }

    // Clear existing data
    await this.productModel.deleteMany({});

    const sampleData = [
      {
        name: 'iPhone 15 Pro Max',
        categoryId: categories[0]._id,
        importPrice: 25000000,
        shippingCost: 500000,
        packagingCost: 200000,
        estimatedDeliveryDays: 7,
        status: 'Hoạt động',
        notes: 'Flagship iPhone model với chip A17 Pro'
      },
      {
        name: 'Samsung Galaxy S24 Ultra',
        categoryId: categories[0]._id,
        importPrice: 22000000,
        shippingCost: 450000,
        packagingCost: 180000,
        estimatedDeliveryDays: 5,
        status: 'Hoạt động',
        notes: 'Smartphone cao cấp với S Pen'
      },
      {
        name: 'Áo thun nam cotton',
        categoryId: categories[1]?._id || categories[0]._id,
        importPrice: 150000,
        shippingCost: 25000,
        packagingCost: 15000,
        estimatedDeliveryDays: 3,
        status: 'Hoạt động',
        notes: 'Chất liệu cotton 100% từ Việt Nam'
      },
      {
        name: 'Quần jeans nam',
        categoryId: categories[1]?._id || categories[0]._id,
        importPrice: 300000,
        shippingCost: 35000,
        packagingCost: 20000,
        estimatedDeliveryDays: 4,
        status: 'Hoạt động',
        notes: 'Denim cao cấp, form slim fit'
      },
      {
        name: 'Nồi cơm điện Panasonic',
        categoryId: categories[2]?._id || categories[0]._id,
        importPrice: 1200000,
        shippingCost: 100000,
        packagingCost: 50000,
        estimatedDeliveryDays: 2,
        status: 'Tạm dừng',
        notes: 'Tạm hết hàng, chờ nhập thêm'
      }
    ];

    const createdProducts = [];
    for (const data of sampleData) {
      const product = new this.productModel(data);
      createdProducts.push(await product.save());
    }

    return createdProducts;
  }
}
