# 🧪 Vision AI Testing Guide - Complete Walkthrough

## 🎯 Mục đích Testing

Guide này hướng dẫn cách test toàn bộ tính năng Vision AI + Product Management từ A-Z, bao gồm:
- ✅ Setup và chuẩn bị môi trường
- ✅ Test manual từng tính năng
- ✅ Test automated với demo script
- ✅ Verify kết quả và troubleshooting

---

## 🔧 Setup Môi Trường Test

### 1. Chuẩn bị Sample Images

```bash
# Tạo thư mục sample images
mkdir -p backend/uploads/samples

# Download hoặc copy sample images:
# - iphone-15-pro-max.jpg (iPhone product photo)
# - macbook-air-m2.jpg (MacBook product photo)  
# - airpods-pro-2.jpg (AirPods product photo)
# - galaxy-s24-ultra.jpg (Samsung phone photo)
# - iphone-case-15pro.jpg (Phone case photo)

# Verify images exist:
ls backend/uploads/samples/
```

**📸 Image Requirements:**
- Format: JPG, PNG, WebP
- Size: 500KB - 5MB  
- Resolution: 800x800px minimum
- Background: White/clean preferred
- Quality: High, clear product visibility

### 2. Environment Variables

```bash
# backend/.env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/db
OPENAI_API_KEY=sk-proj-your-openai-api-key-here
BASE_URL=http://localhost:3000
FB_GRAPH_VERSION=v23.0
MAX_FILE_SIZE=10485760
CHAT_WEBHOOK_DEBUG=1

# frontend/src/environments/environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000',
  uploadUrl: 'http://localhost:3000/uploads'
};
```

### 3. Start Development Servers

```bash
# Terminal 1: Backend
cd backend
npm install
npm run start:dev

# Terminal 2: Frontend
cd frontend  
npm install
npm start

# Terminal 3: Optional - Ngrok for webhook testing
ngrok http 3000
```

**✅ Verify Setup:**
- Backend: http://localhost:3000 (should show NestJS info)
- Frontend: http://localhost:4200 (should show login page)
- Sample images: http://localhost:3000/uploads/samples/iphone-15-pro-max.jpg

---

## 🧪 Manual Testing Scenarios

### Test Case 1: Vision AI Image Analysis

**Objective:** Verify OpenAI Vision API analyzes product images correctly

**Steps:**
1. **API Test với Postman/curl:**
   ```bash
   POST http://localhost:3000/products/analyze-image
   Content-Type: application/json

   {
     "imageUrl": "http://localhost:3000/uploads/samples/iphone-15-pro-max.jpg"
   }
   ```

2. **Expected Response:**
   ```json
   {
     "success": true,
     "data": {
       "imageUrl": "http://localhost:3000/uploads/samples/iphone-15-pro-max.jpg",
       "analysis": {
         "objects": ["iPhone", "smartphone", "điện thoại"],
         "colors": ["đen", "titanium", "xám"],
         "features": ["camera pro", "titanium frame", "usb-c"],
         "keywords": ["iphone", "15", "pro", "max", "apple"],
         "description": "iPhone 15 Pro Max màu đen titanium với camera Pro...",
         "confidence": 0.95
       }
     }
   }
   ```

3. **Validation Criteria:**
   - ✅ Response time < 5 seconds
   - ✅ Confidence score > 0.8
   - ✅ Objects array contains relevant items
   - ✅ Keywords include product-specific terms
   - ✅ Description in Vietnamese
   - ✅ Colors match image content

**Test Cases for Different Images:**
- iPhone → Should detect: phone, smartphone, apple, camera
- MacBook → Should detect: laptop, computer, apple, macbook
- AirPods → Should detect: headphones, earbuds, apple, wireless
- Samsung → Should detect: phone, samsung, android, s pen
- Case → Should detect: case, protection, accessory

### Test Case 2: Product Search với AI Keywords

**Objective:** Test smart product matching với AI-generated keywords

**Prerequisites:** At least 3 products created with AI analysis

**Steps:**
1. **Search API Test:**
   ```bash
   POST http://localhost:3000/products/find-similar
   Content-Type: application/json

   {
     "query": "iphone camera đẹp",
     "fanpageId": "your_fanpage_id_here",
     "limit": 5
   }
   ```

2. **Expected Response:**
   ```json
   {
     "success": true,
     "data": {
       "query": "iphone camera đẹp",
       "recommendations": [
         {
           "product": {
             "_id": "...",
             "name": "iPhone 15 Pro Max",
             "searchKeywords": ["iphone", "camera", "pro"],
             "aiDescription": "iPhone với camera chuyên nghiệp..."
           },
           "matchScore": 15,
           "matchReasons": [
             "Khớp tên sản phẩm: \"iphone\"",
             "Khớp từ khóa: \"camera\""
           ]
         }
       ],
       "total": 1
     }
   }
   ```

3. **Test Different Queries:**
   - "điện thoại" → Should return phones
   - "laptop apple" → Should return MacBooks
   - "tai nghe không dây" → Should return AirPods
   - "samsung galaxy" → Should return Samsung products
   - "ốp lưng bảo vệ" → Should return cases

**Validation Criteria:**
- ✅ Relevant products returned
- ✅ Match scores > 0 for relevant items  
- ✅ Match reasons explain why product matched
- ✅ Results sorted by score + priority
- ✅ Fanpage filtering working correctly

### Test Case 3: File Upload với Processing

**Objective:** Test image upload, optimization, và AI analysis workflow

**Steps:**
1. **Upload via API:**
   ```bash
   POST http://localhost:3000/products/upload-images
   Content-Type: multipart/form-data

   images: [select image files]
   fanpageId: optional_fanpage_id
   ```

2. **Expected Response:**
   ```json
   {
     "success": true,
     "message": "Đã tải lên và phân tích 1 ảnh",
     "data": {
       "images": [
         {
           "originalName": "test-product.jpg",
           "filename": "uuid-generated.jpg",
           "url": "http://localhost:3000/uploads/products/uuid.jpg",
           "size": 1024000,
           "optimized": {
             "thumbnail": "http://localhost:3000/uploads/products/uuid_thumb.webp",
             "medium": "http://localhost:3000/uploads/products/uuid_medium.webp",
             "large": "http://localhost:3000/uploads/products/uuid_large.webp"
           },
           "aiAnalysis": {
             "objects": ["product", "item"],
             "confidence": 0.85
           }
         }
       ]
     }
   }
   ```

3. **Validate File Processing:**
   - ✅ Original file saved in uploads/products/
   - ✅ 3 optimized versions created (.webp format)
   - ✅ File sizes: thumbnail < medium < large < original
   - ✅ All URLs accessible via browser
   - ✅ AI analysis ran automatically

**Error Testing:**
- Upload file > 10MB → Should return error
- Upload non-image file → Should return error
- Upload 11+ files → Should return error
- Invalid fanpageId → Should still work, just skip fanpage association

### Test Case 4: Frontend UI Integration

**Objective:** Test complete UI workflow in Angular frontend

**Steps:**
1. **Login to System:**
   - Go to http://localhost:4200
   - Login with admin credentials
   - Navigate to Fanpage management

2. **Create New Fanpage:**
   ```
   📝 Fill form:
   - Name: "Test Vision AI Store"
   - Page ID: "test_vision_ai_123"
   - Description: "Testing Vision AI capabilities"
   - AI Enabled: ✅ Yes
   - Greeting: "Hello! I'm AI assistant with vision capabilities"
   ```

3. **Add Product to Fanpage:**
   - Scroll to "🛍️ Quản Lý Sản Phẩm" section
   - Click "➕ Thêm Sản Phẩm"
   - Search existing products or create new
   - Select products to add

4. **Upload Product Images:**
   - Click "📷 Ảnh Sản Phẩm" tab
   - Click "📁 Upload Ảnh"
   - Select image files
   - Wait for AI analysis
   - Verify results displayed

5. **Customize Product for Fanpage:**
   - Edit product name for this fanpage
   - Set custom price (markup from import price)
   - Write custom description
   - Set priority level
   - Save changes

**UI Validation Checklist:**
- ✅ Form validation working correctly
- ✅ File upload progress indicator
- ✅ AI analysis results displayed
- ✅ Error messages shown for invalid input
- ✅ Success notifications on save
- ✅ Product list updates after changes
- ✅ Responsive design on mobile/tablet

### Test Case 5: Messenger Webhook Integration

**Objective:** Test chatbot với smart product recommendations

**Prerequisites:** 
- Fanpage with products added
- Facebook webhook configured
- Ngrok or public URL for webhook

**Steps:**
1. **Configure Webhook:**
   ```bash
   # Facebook App Settings
   Webhook URL: https://your-ngrok-url.ngrok.io/webhook/messenger
   Verify Token: your-verify-token
   Subscribe: messages, messaging_postbacks
   ```

2. **Test Webhook Verification:**
   ```bash
   GET https://your-ngrok-url.ngrok.io/webhook/messenger?hub.mode=subscribe&hub.verify_token=your-token&hub.challenge=test
   # Should return: test
   ```

3. **Send Test Messages:**
   - "Tôi muốn mua iPhone" → Should suggest iPhone products
   - "Laptop apple" → Should suggest MacBook
   - "Tai nghe không dây" → Should suggest AirPods
   - "Samsung galaxy" → Should suggest Samsung products

4. **Expected Bot Responses:**
   ```
   User: "Tôi muốn mua iPhone"
   
   Bot: "Chào bạn! Mình có một số iPhone phù hợp:
   
   📱 iPhone 15 Pro Max - Chính hãng VN/A
   💰 29.990.000đ
   ✨ Camera Pro 48MP, Titanium cao cấp
   🎯 Khớp 95% với yêu cầu
   
   Bạn quan tâm mẫu nào để mình tư vấn chi tiết? 😊"
   ```

**Webhook Validation:**
- ✅ Receives messages from Facebook
- ✅ Identifies product-related keywords
- ✅ Finds matching products
- ✅ Formats response với product info
- ✅ Sends response back to user
- ✅ Logs conversation to database

---

## 🤖 Automated Testing với Demo Script

### Run Complete Demo

```bash
# Make sure servers are running
cd backend && npm run start:dev &
cd frontend && npm start &

# Install demo script dependencies
npm install axios

# Run automated demo
npm run demo:vision-ai
```

### Expected Demo Output

```bash
🎬 Vision AI + Product Management Demo Started!
============================================================

📍 Step 1: Checking server status...
✅ Backend server is running

📍 Step 2: Checking sample images...
✅ All sample images found

📍 Step 3: Creating demo fanpage...
✅ Demo fanpage created: Vision AI Demo Store
🆔 Fanpage ID: 507f1f77bcf86cd799439011

──────────────────────────────────────────────────────────

📍 Step 4: Analyzing image: iphone-15-pro-max.jpg
🖼️  Image URL: http://localhost:3000/uploads/samples/iphone-15-pro-max.jpg
🤖 Sending to Vision AI...
✅ AI Analysis Results:
   🎯 Objects: iPhone, smartphone, điện thoại
   🎨 Colors: đen, titanium, xám
   ⭐ Features: camera pro, titanium frame, usb-c
   🔍 Keywords: iphone, 15, pro, max, apple
   📝 Description: iPhone 15 Pro Max màu đen titanium với camera Pro 48MP và khung...
   🎲 Confidence: 95.0%
✅ Expected keywords found: iphone, 15, pro, max, apple

📍 Step 5: Creating product: iPhone 15 Pro Max 256GB
✅ Product created: iPhone 15 Pro Max 256GB
💰 Price: 25,000,000đ
🏷️  Fanpage price: 32,500,000đ

[... continues for other products ...]

══════════════════════════════════════════════════════════
🔍 TESTING SEARCH FUNCTIONALITY
══════════════════════════════════════════════════════════

📍 Step 8: Testing product search: "iphone camera đẹp"
✅ Found 1 matching products:

   1. iPhone 15 Pro Max 256GB
      🎯 Match Score: 15
      💡 Reasons: Khớp tên sản phẩm: "iphone", Khớp từ khóa: "camera"
      💰 Price: 25,000,000đ

══════════════════════════════════════════════════════════
📊 FINAL STATISTICS
══════════════════════════════════════════════════════════

📍 Step 11: Getting AI analysis statistics...
📊 AI Analysis Statistics:
   📦 Total products: 3
   🤖 Products with AI: 3
   📈 AI coverage: 100%
   🖼️  Total images: 3
   🔍 Total keywords: 15
   🎯 Avg confidence: 0.92
   🏆 Top keywords:
      - iphone: 1 times
      - apple: 3 times
      - camera: 2 times

🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉
🎊 DEMO COMPLETED SUCCESSFULLY! 🎊
🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉
```

---

## 🔍 Performance Testing

### Load Testing AI Analysis

```bash
# Test concurrent AI analysis requests
for i in {1..5}; do
  curl -X POST http://localhost:3000/products/analyze-image \
    -H "Content-Type: application/json" \
    -d '{"imageUrl":"http://localhost:3000/uploads/samples/iphone-15-pro-max.jpg"}' &
done
wait

# Measure response times - should be < 5 seconds each
```

### Database Performance

```bash
# Test search performance với large dataset
# Create 100+ products first, then:

time curl -X POST http://localhost:3000/products/find-similar \
  -H "Content-Type: application/json" \
  -d '{"query":"smartphone camera", "fanpageId":"your_id", "limit":10}'

# Should return results in < 500ms
```

### File Upload Performance

```bash
# Test multiple file uploads
curl -X POST http://localhost:3000/products/upload-images \
  -F "images=@image1.jpg" \
  -F "images=@image2.jpg" \
  -F "images=@image3.jpg" \
  -F "fanpageId=your_fanpage_id"

# Verify all 3 images processed correctly
```

---

## 🚨 Troubleshooting Common Issues

### Issue 1: Vision AI Analysis Fails

**Symptoms:**
```json
{
  "success": false,
  "error": "OpenAI Vision API error: Invalid API key"
}
```

**Solutions:**
1. ✅ Check OPENAI_API_KEY in .env file
2. ✅ Verify API key has Vision API access
3. ✅ Check OpenAI account quota/billing
4. ✅ Test API key directly với OpenAI

### Issue 2: Low Confidence Scores

**Symptoms:**
```json
{
  "analysis": {
    "confidence": 0.3,
    "objects": ["object", "item"],
    "keywords": ["generic"]
  }
}
```

**Solutions:**
1. ✅ Use higher quality images (800x800px+)
2. ✅ Ensure good lighting và contrast
3. ✅ Remove watermarks/text overlays
4. ✅ Center product in frame
5. ✅ Use white/clean background

### Issue 3: Search Not Returning Results

**Symptoms:**
```json
{
  "recommendations": [],
  "total": 0
}
```

**Solutions:**
1. ✅ Check if products exist in database
2. ✅ Verify fanpageId is correct
3. ✅ Check searchKeywords field populated
4. ✅ Try broader search terms
5. ✅ Check MongoDB indexes on searchKeywords

### Issue 4: File Upload Fails

**Symptoms:**
- "File quá lớn" error
- "Định dạng không được hỗ trợ" error
- Upload hangs/times out

**Solutions:**
1. ✅ Check file size < 10MB
2. ✅ Use supported formats: JPG, PNG, WebP
3. ✅ Verify uploads/ directory permissions
4. ✅ Check disk space available
5. ✅ Restart backend server

### Issue 5: Frontend UI Not Loading

**Symptoms:**
- Blank page hoặc loading spinner forever
- Console errors về API calls
- Components not rendering

**Solutions:**
1. ✅ Check backend server running on port 3000
2. ✅ Verify CORS configuration allows localhost:4200
3. ✅ Check browser console for errors
4. ✅ Clear browser cache/localStorage
5. ✅ Check frontend environment.ts settings

---

## ✅ Test Completion Checklist

### Backend API Tests
- [ ] ✅ Vision AI analysis working với all sample images
- [ ] ✅ File upload và optimization working
- [ ] ✅ Product search returning relevant results
- [ ] ✅ AI stats API working correctly
- [ ] ✅ Error handling working for invalid inputs
- [ ] ✅ Performance acceptable (< 5s for AI, < 500ms for search)

### Frontend UI Tests  
- [ ] ✅ Login và navigation working
- [ ] ✅ Fanpage CRUD operations working
- [ ] ✅ Product management UI functional
- [ ] ✅ File upload with progress indication
- [ ] ✅ AI results displayed correctly
- [ ] ✅ Responsive design on mobile/tablet
- [ ] ✅ Error handling với user-friendly messages

### Integration Tests
- [ ] ✅ End-to-end workflow: Create fanpage → Add products → Upload images → AI analysis → Search testing
- [ ] ✅ Messenger webhook receiving và responding correctly
- [ ] ✅ Database persistence working
- [ ] ✅ File storage và serving working
- [ ] ✅ AI-generated data feeding into search

### Production Readiness
- [ ] ✅ Environment variables properly configured
- [ ] ✅ Security validations in place
- [ ] ✅ Error logging và monitoring setup
- [ ] ✅ Backup strategy for uploads và database
- [ ] ✅ Performance optimization completed
- [ ] ✅ Documentation complete và accurate

---

**🎊 Sau khi hoàn thành tất cả tests, Vision AI + Product Management system sẽ sẵn sàng cho production deployment!** 🚀

**📞 Support:** Nếu gặp issues trong quá trình testing, check logs trong browser console và backend terminal để troubleshoot.