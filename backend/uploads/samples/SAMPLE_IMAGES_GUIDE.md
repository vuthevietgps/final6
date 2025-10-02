# 📸 Sample Images cho Demo Vision AI

## 🎯 Mục đích
File này hướng dẫn tạo và chuẩn bị sample images để demo tính năng Vision AI + Product Management.

## 📁 Cấu trúc thư mục

```
backend/uploads/samples/
├── iphone-15-pro-max.jpg     # iPhone 15 Pro Max demo
├── macbook-air-m2.jpg        # MacBook Air M2 demo  
├── airpods-pro-2.jpg         # AirPods Pro 2 demo
├── galaxy-s24-ultra.jpg      # Samsung Galaxy S24 Ultra demo
├── iphone-case-15pro.jpg     # iPhone case demo
└── README.md                 # Hướng dẫn này
```

## 🖼️ Cách tạo sample images

### Option 1: Download từ Internet (Recommended)

#### iPhone 15 Pro Max
```bash
# Search Google Images với từ khóa:
"iPhone 15 Pro Max product photo white background"

# Hoặc download từ:
- Apple Official Website
- GSMArena product photos
- Tech review sites (clean product shots)

# Save as: iphone-15-pro-max.jpg
# Size: 800x800px or larger
# Background: White/transparent preferred
```

#### MacBook Air M2
```bash
# Search: "MacBook Air M2 2022 product photo"
# Save as: macbook-air-m2.jpg
# Requirements: Clear laptop view, preferably open
```

#### AirPods Pro 2
```bash
# Search: "AirPods Pro 2nd generation product photo"
# Save as: airpods-pro-2.jpg
# Requirements: Show both earbuds and case
```

#### Samsung Galaxy S24 Ultra
```bash
# Search: "Samsung Galaxy S24 Ultra official product photo"
# Save as: galaxy-s24-ultra.jpg
# Requirements: Clear phone view with S Pen if possible
```

#### iPhone Case
```bash
# Search: "iPhone 15 Pro Max case silicone product photo"
# Save as: iphone-case-15pro.jpg
# Requirements: Clear case view, preferably colored
```

### Option 2: Sử dụng AI Generated Images

```bash
# Prompts cho AI image generators (DALL-E, Midjourney, etc.):

# iPhone:
"Professional product photo of iPhone 15 Pro Max, black titanium color, on white background, studio lighting, high resolution"

# MacBook:
"Professional product photo of MacBook Air M2, midnight blue color, slightly open, on white background, studio lighting"

# AirPods:
"Professional product photo of Apple AirPods Pro 2nd generation, white color, with charging case, on white background"

# Samsung:
"Professional product photo of Samsung Galaxy S24 Ultra, titanium gray color, with S Pen, on white background"

# Case:
"Professional product photo of iPhone silicone case, blue color, on white background, studio lighting"
```

### Option 3: Tạo placeholder images đơn giản

Nếu không có ảnh thật, có thể tạo placeholder:

```bash
# Sử dụng online tools:
- placeholder.com
- picsum.photos
- unsplash.it

# Example URLs:
https://via.placeholder.com/800x800/000000/FFFFFF?text=iPhone+15+Pro+Max
https://via.placeholder.com/800x800/1e1e1e/FFFFFF?text=MacBook+Air+M2
https://via.placeholder.com/800x800/ffffff/000000?text=AirPods+Pro+2
```

## 📐 Yêu cầu kỹ thuật

### Image Specifications
```
✅ Format: JPG, PNG, WebP
✅ Size: 500KB - 5MB (optimal)
✅ Resolution: 800x800px minimum
✅ Aspect ratio: 1:1 preferred (square)
✅ Background: White/transparent for best AI analysis
✅ Quality: High, not blurry or pixelated
```

### AI Analysis Optimization
```
✅ Product centered in frame
✅ Good lighting, no shadows
✅ Single product per image
✅ Clear brand/model visibility
✅ No watermarks or text overlays
✅ High contrast with background
```

## 🧪 Testing Sample Images

Sau khi có đủ sample images:

### 1. Place images in correct folder
```bash
# Copy images to:
backend/uploads/samples/

# Check files exist:
ls backend/uploads/samples/
```

### 2. Start backend server
```bash
cd backend
npm run start:dev
```

### 3. Test image access
```bash
# Test URLs in browser:
http://localhost:3000/uploads/samples/iphone-15-pro-max.jpg
http://localhost:3000/uploads/samples/macbook-air-m2.jpg
http://localhost:3000/uploads/samples/airpods-pro-2.jpg
```

### 4. Seed sample data
```bash
# Generate sample products with image URLs:
npm run generate:vision-samples

# Seed to database:
npm run seed:vision-products
```

### 5. Test Vision AI analysis
```bash
# Test API endpoint:
POST http://localhost:3000/products/analyze-image
Content-Type: application/json

{
  "imageUrl": "http://localhost:3000/uploads/samples/iphone-15-pro-max.jpg"
}

# Expected response:
{
  "success": true,
  "data": {
    "analysis": {
      "objects": ["iPhone", "smartphone", "điện thoại"],
      "colors": ["đen", "titanium"],
      "features": ["camera pro", "titanium frame"],
      "keywords": ["iphone", "15", "pro", "max"],
      "confidence": 0.95
    }
  }
}
```

## 📱 Demo Screenshots

### Giao diện upload trong fanpage:

```
┌─────────────── 📷 Upload Ảnh Sản Phẩm ──────────────────┐
│                                                         │
│ [📁 Chọn file ảnh...]                                  │
│                                                         │
│ Đã chọn: iphone-15-pro-max.jpg (2.3MB)                │
│                                                         │
│ 🤖 Đang phân tích với AI... ⏳                         │
│                                                         │
│ ✅ Kết quả phân tích:                                  │
│ ├── 🎯 Đối tượng: iPhone, smartphone                   │
│ ├── 🎨 Màu sắc: Đen, Titanium                         │
│ ├── ⭐ Tính năng: Camera Pro, USB-C                    │
│ ├── 🔍 Keywords: iphone, 15, pro, max                 │
│ ├── 📝 Mô tả: "iPhone 15 Pro Max màu đen..."          │
│ └── 🎲 Độ tin cậy: 95%                                 │
│                                                         │
│                            [📤 Upload] [❌ Cancel]    │
└─────────────────────────────────────────────────────────┘
```

### Kết quả trong product list:

```
📱 Sản phẩm đã được phân tích:

┌─────────────────────────────────────────────────────────┐
│ 🖼️ [ảnh iPhone]  📱 iPhone 15 Pro Max                  │
│                                                         │
│ 🤖 AI Analysis:                                        │
│ ├── Keywords: iphone, 15, pro, max, apple, camera     │
│ ├── Description: iPhone 15 Pro Max với camera Pro...  │
│ ├── Colors: Đen, Titanium                             │
│ └── Confidence: 95%                                    │
│                                                         │
│ 💰 Giá: 25.000.000đ  📊 Priority: 10  ✅ Active      │
│                                [✏️ Edit] [🗑️ Delete] │
└─────────────────────────────────────────────────────────┘
```

## 🚀 Production Tips

### Cho môi trường production:

1. **Sử dụng CDN** cho images:
   ```bash
   # Upload to Cloudinary, AWS S3, etc.
   # Update BASE_URL in environment
   ```

2. **Optimize images** trước khi upload:
   ```bash
   # Resize to optimal dimensions
   # Compress without quality loss
   # Convert to WebP format
   ```

3. **Backup strategy**:
   ```bash
   # Regular backup of uploads folder
   # Version control for sample data
   # Database backup including image URLs
   ```

## 🎬 Video Demo Script

### Script để record demo video:

```
🎬 DEMO SCRIPT:

1. "Chào mừng đến với demo Vision AI + Product Management"

2. "Tôi sẽ demo cách thêm sản phẩm vào fanpage với AI analysis"

3. [Click vào Fanpage menu] "Đầu tiên, vào quản lý fanpage"

4. [Click Thêm mới] "Tạo fanpage mới cho demo"

5. [Điền thông tin] "Nhập thông tin cơ bản về fanpage"

6. [Scroll xuống] "Bây giờ thêm sản phẩm vào fanpage"

7. [Click Thêm sản phẩm] "Chọn sản phẩm từ danh sách có sẵn"

8. [Upload ảnh] "Upload ảnh sản phẩm để AI phân tích"

9. [Chờ AI] "AI đang phân tích ảnh và tạo keywords..."

10. [Show results] "Kết quả: đối tượng, màu sắc, tính năng đã được detect"

11. [Customize] "Có thể tùy chỉnh tên, giá, mô tả cho fanpage này"

12. [Save] "Lưu và sản phẩm đã được thêm thành công!"

13. "Bây giờ chatbot có thể gợi ý sản phẩm này khi user hỏi"
```

---

**✨ Với sample images chuẩn bị tốt, bạn sẽ có demo Vision AI hoạt động mượt mà và ấn tượng!** 🚀