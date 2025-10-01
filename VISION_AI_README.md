# Vision AI + Product Database Integration

## 🎯 Tổng quan

Hệ thống tích hợp Vision AI với database sản phẩm để:
- **Phân tích ảnh tự động**: Sử dụng OpenAI Vision API nhận diện sản phẩm, màu sắc, tính năng
- **Tìm kiếm thông minh**: Match sản phẩm dựa trên mô tả và keywords AI-generated
- **Chatbot gợi ý**: Tự động gợi ý sản phẩm phù hợp trong cuộc trò chuyện
- **Upload và xử lý**: Tự động optimize ảnh và tạo variants cho từng fanpage

## 🏗️ Kiến trúc

### Backend Services

```
VisionAIService
├── analyzeProductImage()     // Phân tích ảnh với OpenAI Vision
├── findSimilarProducts()     // Tìm sản phẩm tương tự
├── generateDescription()     // Tạo mô tả từ multiple images
└── calculateMatchScore()     // Tính điểm khớp sản phẩm

FileUploadService
├── processUploadedFiles()    // Xử lý file upload
├── createOptimizedVersions() // Tạo thumbnail, medium, large
├── generateFanpageVariants() // Tạo variant cho fanpage
└── validateFiles()          // Validate file type, size

ProductService (Enhanced)
├── getAIAnalysisStats()     // Thống kê AI analysis
├── updateWithAIAnalysis()   // Cập nhật product với AI data
└── Enhanced search with AI keywords
```

## 🚀 API Endpoints

### 1. Upload và Phân tích Ảnh
```http
POST /products/upload-images
Content-Type: multipart/form-data

images: [files]
fanpageId: string (optional)
configId: string (optional)
```

### 2. Tìm Sản phẩm Tương tự
```http
POST /products/find-similar
{
  "query": "iphone màu đen camera tốt",
  "fanpageId": "673123...",
  "limit": 5
}
```

### 3. Phân tích Ảnh từ URL
```http
POST /products/analyze-image
{
  "imageUrl": "https://example.com/product.jpg"
}
```

### 4. Thống kê AI Analysis
```http
GET /products/ai-stats?fanpageId=673123...
```

## 🧪 Testing

### Sample Data Commands
```bash
# Generate sample products
npm run generate:vision-samples

# Seed to database  
npm run seed:vision-products
```

### Test APIs
1. **Image Analysis**: POST /products/analyze-image
2. **Product Search**: POST /products/find-similar  
3. **File Upload**: POST /products/upload-images
4. **AI Stats**: GET /products/ai-stats

## 📁 File Structure

```
backend/
├── src/product/
│   ├── vision-ai.service.ts      # Vision AI analysis
│   ├── file-upload.service.ts    # File upload & processing
│   ├── product.controller.ts     # Enhanced with Vision AI endpoints
│   ├── product.service.ts        # AI stats & analysis methods
│   └── schemas/product.schema.ts # Enhanced with AI fields
├── uploads/
│   ├── products/                 # User uploaded images
│   └── samples/                  # Sample images for testing
├── create-vision-samples.js      # Generate sample data
└── seed-vision-products.js       # Seed database with samples
```

## 🤖 Messenger Integration

Messenger webhook automatically suggests products based on user messages:
- Extract keywords from user queries
- Find matching products using Vision AI data
- Format recommendations in chat responses
- Track user interactions and conversions

## ✅ Status

- [x] ✅ Vision AI Service implementation  
- [x] ✅ File Upload Service with optimization
- [x] ✅ Enhanced Product schema with AI fields
- [x] ✅ API endpoints for analysis and search
- [x] ✅ Sample data generation
- [x] ✅ Database seeding scripts
- [x] ✅ Documentation and testing guides

**Ready for testing!** 🚀

Place sample images in `backend/uploads/samples/` and run:
```bash
npm run seed:vision-products
```