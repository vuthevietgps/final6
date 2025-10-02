# 📱 Hướng Dẫn Sử Dụng Quản Lý Sản Phẩm Fanpage

## 🎯 Tổng quan

Chức năng quản lý sản phẩm fanpage cho phép bạn:
- ➕ Thêm sản phẩm vào fanpage cụ thể
- ✏️ Tùy chỉnh tên, mô tả, giá cho từng fanpage
- 🖼️ Upload và quản lý ảnh sản phẩm với Vision AI
- 🤖 Tự động phân tích ảnh và tạo keywords
- 💬 Tích hợp chatbot gợi ý sản phẩm thông minh

---

## 🚀 Cách Sử Dụng Chi Tiết

### Bước 1: Truy cập Quản Lý Fanpage

1. **Đăng nhập** vào hệ thống quản lý
2. **Vào menu bên trái** → chọn "📄 Fanpage"
3. **Bấm nút "Thêm mới"** hoặc chọn fanpage có sẵn để chỉnh sửa

```
🏠 Dashboard
├── 📄 Fanpage ← Click vào đây
├── 💬 Chat Messages
├── 📦 Sản phẩm
└── ...
```

### Bước 2: Cấu hình Thông Tin Fanpage

Điền các thông tin cơ bản:

```
📝 Thông Tin Fanpage:
┌─────────────────────────────────────┐
│ 🏷️ Tên fanpage: iPhone Store VN     │
│ 🆔 Page ID: 123456789012345         │  
│ 📝 Mô tả: Chuyên bán iPhone chính   │
│    hãng giá tốt nhất thị trường     │
│ 🤖 Bật AI: ✅ Có                    │
│ 💬 Lời chào: Xin chào! Cần hỗ trợ? │
└─────────────────────────────────────┘
```

### Bước 3: Thêm Sản Phẩm Vào Fanpage

#### 3.1 Tìm và Chọn Sản Phẩm

1. **Scroll xuống** section "🛍️ Quản Lý Sản Phẩm"
2. **Bấm "➕ Thêm Sản Phẩm"**
3. **Tìm kiếm** sản phẩm theo tên:

```
🔍 Tìm kiếm sản phẩm:
┌─────────────────────────────────────┐
│ [🔍 iphone 15 pro max            ] │
│                                     │
│ Kết quả tìm kiếm:                  │
│ ☐ iPhone 15 Pro Max 256GB          │
│ ☐ iPhone 15 Pro 128GB              │  
│ ☐ iPhone 15 Plus 256GB             │
│                                     │
│ [✅ Thêm Sản Phẩm Đã Chọn]        │
└─────────────────────────────────────┘
```

#### 3.2 Tùy Chỉnh Thông Tin Sản Phẩm

Sau khi thêm, bạn có thể customize cho fanpage:

```
✏️ Tùy chỉnh sản phẩm cho fanpage:

📱 iPhone 15 Pro Max 256GB
├── 🏷️ Tên tùy chỉnh: "iPhone 15 Pro Max - Chính hãng VN/A"
├── 💰 Giá bán: 29.990.000đ (thay vì giá gốc 25.000.000đ)
├── 📝 Mô tả tùy chỉnh:
│   "🔥 IPHONE 15 PRO MAX MỚI NHẤT 2024
│    ✅ Chính hãng VN/A, full box
│    🎁 Tặng ốp lưng + cường lực
│    🚚 Freeship toàn quốc
│    💯 Bảo hành 12 tháng"
├── 🎯 Độ ưu tiên: 9/10
└── ✅ Trạng thái: Đang bán
```

### Bước 4: Upload và Quản Lý Ảnh Sản Phẩm

#### 4.1 Upload Ảnh Mới

1. **Bấm tab "📷 Ảnh Sản Phẩm"**
2. **Click "📁 Upload Ảnh"**
3. **Chọn file ảnh** (JPG, PNG, WebP - tối đa 10MB)

```
📁 Upload Ảnh:
┌─────────────────────────────────────┐
│ Kéo thả file vào đây hoặc click     │
│ 📸 Chọn ảnh từ máy tính             │
│                                     │
│ ✅ Định dạng: JPG, PNG, WebP        │
│ ✅ Kích thước: Tối đa 10MB          │
│ ✅ Số lượng: Tối đa 10 ảnh/lần      │
└─────────────────────────────────────┘
```

#### 4.2 AI Phân Tích Ảnh Tự Động

Hệ thống sẽ tự động phân tích ảnh:

```
🤖 Đang phân tích ảnh với AI...

✅ Kết quả phân tích:
┌─────────────────────────────────────┐
│ 🎯 Đối tượng: iPhone, smartphone    │
│ 🎨 Màu sắc: Đen, Titanium, Xám     │
│ ⭐ Tính năng: Camera Pro, USB-C     │
│ 🔍 Keywords: iphone, 15, pro, max  │
│ 📝 Mô tả AI: "iPhone 15 Pro Max    │
│    màu đen titanium với camera..."  │
│ 🎲 Độ tin cậy: 95%                 │
└─────────────────────────────────────┘
```

#### 4.3 Tối Ưu Ảnh Tự Động

Hệ thống tạo 3 kích cỡ tự động:

```
📐 Ảnh được tối ưu thành:
├── 🖼️ Thumbnail: 150x150px (cho danh sách)
├── 📱 Medium: 400x400px (cho chi tiết)  
└── 🖥️ Large: 800x800px (cho zoom)

💾 Định dạng: WebP (tiết kiệm 70% dung lượng)
🌐 URL: http://localhost:3000/uploads/products/
```

### Bước 5: Test Chatbot và Gợi Ý Sản Phẩm

#### 5.1 Kết Nối Messenger

1. **Cấu hình Webhook** trong Facebook App
2. **Nhập Page Access Token**
3. **Test kết nối** với Messenger

```
🔗 Webhook Configuration:
┌─────────────────────────────────────┐
│ URL: https://yourdomain.com/webhook │
│ /messenger                          │
│ Token: YOUR_VERIFY_TOKEN            │
│ Events: messages, messaging_postbacks │
└─────────────────────────────────────┘
```

#### 5.2 Test Chatbot Response

Gửi tin nhắn để test:

```
👤 User: "Cho mình xem iPhone màu đen"

🤖 Bot Response:
"Chào bạn! Mình có một số iPhone màu đen phù hợp:

📱 iPhone 15 Pro Max - Chính hãng VN/A
💰 29.990.000đ
✨ Camera Pro 48MP, Titanium cao cấp
🎯 Khớp 95% với yêu cầu

📱 iPhone 15 Pro - Like New  
💰 22.990.000đ
✨ Chip A17 Pro, màn hình Super Retina
🎯 Khớp 87% với yêu cầu

Bạn quan tâm mẫu nào để mình tư vấn chi tiết? 😊"
```

---

## 🖼️ Demo Ảnh Minh Họa

### Giao Diện Chính

```
🖥️ Giao diện quản lý fanpage:

┌─────────────────────────────────────────────────────────────┐
│ 📄 Quản Lý Fanpage                    [➕ Thêm mới]      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 📋 Danh sách fanpage:                                      │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🏷️ iPhone Store VN              📊 15 sản phẩm        │ │
│ │ 🆔 ID: 123456789012345           🤖 AI: Bật            │ │  
│ │ 📝 Chuyên bán iPhone chính hãng  ✅ Hoạt động         │ │
│ │                           [✏️ Sửa] [🗑️ Xóa]        │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🏷️ Samsung Official Store       📊 8 sản phẩm         │ │
│ │ 🆔 ID: 987654321098765           🤖 AI: Tắt            │ │
│ │ 📝 Samsung chính hãng giá tốt    ⏸️ Tạm dừng          │ │
│ │                           [✏️ Sửa] [🗑️ Xóa]        │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Modal Thêm/Sửa Fanpage

```
┌───────────────── ✏️ Chỉnh Sửa Fanpage ─────────────────────┐
│                                                             │
│ 📝 Thông tin cơ bản:                                       │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🏷️ Tên fanpage: [iPhone Store VN                    ] │ │
│ │ 🆔 Page ID:     [123456789012345                    ] │ │
│ │ 📝 Mô tả:       [Chuyên bán iPhone chính hãng       ] │ │
│ │ 🤖 Bật AI:      [✅] Có  [ ] Không                   │ │
│ │ 💬 Lời chào:    [Xin chào! Cần hỗ trợ gì không?    ] │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ 🛍️ Quản lý sản phẩm:                 [➕ Thêm Sản Phẩm] │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📱 iPhone 15 Pro Max - Chính hãng VN/A                 │ │
│ │ 💰 29.990.000đ  🎯 Ưu tiên: 9  ✅ Đang bán           │ │
│ │ 📝 🔥 IPHONE 15 PRO MAX MỚI NHẤT 2024...              │ │
│ │ 🖼️ 3 ảnh  🤖 95% tin cậy        [✏️] [🗑️]          │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📱 iPhone 15 Pro 128GB                                  │ │
│ │ 💰 22.990.000đ  🎯 Ưu tiên: 7  ✅ Đang bán           │ │
│ │ 📝 iPhone 15 Pro chính hãng, full box                  │ │
│ │ 🖼️ 2 ảnh  🤖 92% tin cậy        [✏️] [🗑️]          │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│                              [💾 Lưu] [❌ Hủy]           │
└─────────────────────────────────────────────────────────────┘
```

### Upload Ảnh với AI Analysis

```
┌────────────── 📷 Upload Ảnh Sản Phẩm ──────────────────────┐
│                                                             │
│ 📁 Kéo thả ảnh vào đây hoặc click để chọn:               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │                                                         │ │
│ │               📸 Click để chọn ảnh                      │ │
│ │           hoặc kéo thả file vào đây                     │ │
│ │                                                         │ │
│ │     ✅ JPG, PNG, WebP  📏 Tối đa 10MB  📊 Tối đa 10 ảnh │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ 🤖 Kết quả phân tích AI:                                   │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🖼️ iphone-15-pro-max.jpg                               │ │
│ │ ├── 🎯 Đối tượng: iPhone, smartphone, điện thoại       │ │
│ │ ├── 🎨 Màu sắc: Đen, Titanium, Midnight               │ │
│ │ ├── ⭐ Tính năng: Camera Pro, USB-C, A17 chip          │ │
│ │ ├── 🔍 Keywords: iphone, 15, pro, max, apple          │ │
│ │ ├── 📝 Mô tả: "iPhone 15 Pro Max màu đen titanium..." │ │
│ │ └── 🎲 Độ tin cậy: 95%                                 │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ 📐 Ảnh đã tối ưu:                                          │
│ ├── 🖼️ Thumbnail: 150x150px                               │
│ ├── 📱 Medium: 400x400px                                   │
│ └── 🖥️ Large: 800x800px                                    │
│                                                             │
│                              [📤 Upload] [❌ Hủy]        │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 Cấu Hình Kỹ Thuật

### 1. Cài Đặt Environment

```bash
# Backend .env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/db
OPENAI_API_KEY=sk-proj-your-openai-api-key-here
BASE_URL=http://localhost:3000
FB_GRAPH_VERSION=v23.0
MAX_FILE_SIZE=10485760

# Frontend environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000',
  uploadUrl: 'http://localhost:3000/uploads'
};
```

### 2. Khởi Động Hệ Thống

```bash
# Terminal 1: Backend
cd backend
npm install
npm run start:dev

# Terminal 2: Frontend  
cd frontend
npm install
npm start

# Terminal 3: Ngrok (optional - for webhook testing)
ngrok http 3000
```

### 3. Cấu Hình Facebook Webhook

```bash
# Facebook App Settings
Webhook URL: https://your-ngrok-url.ngrok.io/webhook/messenger
Verify Token: your-verify-token
Subscribe to: messages, messaging_postbacks

# Page Access Token
Get từ Facebook Graph API Explorer
Scope: pages_messaging, pages_manage_metadata
```

---

## 🎯 Tips & Best Practices

### Upload Ảnh Hiệu Quả

1. **Chất lượng ảnh**:
   - Độ phân giải: 800x800px trở lên
   - Nền trắng hoặc trong suốt
   - Sản phẩm rõ ràng, không bị mờ

2. **Tối ưu SEO**:
   - Đặt tên file có ý nghĩa: `iphone-15-pro-max-black.jpg`
   - Sử dụng keywords trong description
   - Tags phù hợp với sản phẩm

3. **AI Analysis**:
   - Ảnh có ánh sáng tốt → Confidence cao hơn
   - Góc chụp thẳng → Nhận diện chính xác hơn
   - Không có watermark → Phân tích tốt hơn

### Quản Lý Sản Phẩm Hiệu Quả

1. **Phân loại rõ ràng**:
   - Mỗi fanpage chuyên về 1 nhóm sản phẩm
   - Tên sản phẩm nhất quán
   - Mô tả chi tiết, hấp dẫn

2. **Pricing Strategy**:
   - Giá nhập + Margin phù hợp
   - So sánh với thị trường
   - Promotion/discount theo season

3. **AI Optimization**:
   - Review keywords AI generate
   - Bổ sung keywords thủ công nếu cần
   - Monitor chatbot performance

---

## 🚨 Troubleshooting

### Lỗi Upload Ảnh

```
❌ "File quá lớn"
→ Giảm kích thước file xuống dưới 10MB

❌ "Định dạng không được hỗ trợ"  
→ Chỉ dùng JPG, PNG, WebP

❌ "AI analysis failed"
→ Kiểm tra OPENAI_API_KEY trong .env
→ Ảnh có thể bị lỗi hoặc không rõ ràng
```

### Lỗi Chatbot

```
❌ "Không nhận được tin nhắn từ Messenger"
→ Kiểm tra Webhook URL và Verify Token
→ Page Access Token còn hiệu lực không

❌ "Bot không trả lời"
→ Kiểm tra AI config trong fanpage
→ OpenAI API key và quota
```

### Performance Issues

```
❌ "Upload chậm"
→ Optimize image trước khi upload
→ Kiểm tra kết nối internet

❌ "Search sản phẩm chậm"  
→ Tăng MongoDB connection pool
→ Tối ưu database indexes
```

---

## 📞 Hỗ Trợ

Nếu cần hỗ trợ thêm:
1. **Check logs** trong browser Console (F12)
2. **Check backend logs** trong terminal
3. **Verify API endpoints** bằng Postman
4. **Contact developer** với error screenshots

---

**🎉 Chúc bạn sử dụng thành công hệ thống quản lý sản phẩm fanpage với Vision AI!** 🚀