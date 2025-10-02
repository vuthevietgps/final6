# 🌟 SETUP GUIDE - Final7 Repository

## 📥 Clone và Setup Môi Trường Mới

### **1. Clone Repository:**
```bash
git clone https://github.com/vuthevietgps/final7.git
cd final7
```

### **2. Cài Đặt Dependencies:**
```bash
# Backend
cd backend
npm install

# Frontend (terminal mới)
cd frontend
npm install
```

### **3. Cấu Hình Environment Variables:**

Tạo file `.env` trong thư mục `backend/`:
```env
# Database Connection
MONGODB_URI=mongodb://localhost:27017/management
MONGODB_URI_ATLAS=your_atlas_connection_string

# JWT Authentication
JWT_SECRET=your_jwt_secret_here_32_characters_minimum
JWT_EXPIRES_IN=7d

# Facebook API Integration
FACEBOOK_ACCESS_TOKEN=your_facebook_access_token
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret

# Facebook Token Encryption (32 characters)
FACEBOOK_TOKEN_ENCRYPTION_KEY=12345678901234567890123456789012

# OpenAI API
OPENAI_API_KEY=your_openai_api_key

# Google Cloud Credentials
GOOGLE_APPLICATION_CREDENTIALS=./dongbodulieuweb-8de0c9a12896.json

# CORS Settings
CORS_ORIGIN=http://localhost:4200,http://localhost:4201

# Server Configuration
PORT=3000
NODE_ENV=development
```

### **4. Database Setup:**

**MongoDB Local:**
```bash
# Cài đặt MongoDB trên Windows
winget install MongoDB.Server

# Hoặc tải từ: https://www.mongodb.com/try/download/community
# Start MongoDB service
net start MongoDB
```

**MongoDB Atlas (Cloud):**
1. Tạo cluster tại: https://cloud.mongodb.com
2. Whitelist IP: 0.0.0.0/0 (development)
3. Tạo database user
4. Copy connection string vào `MONGODB_URI_ATLAS`

### **5. Khởi Động Ứng Dụng:**

**Terminal 1 - Backend:**
```bash
cd backend
npm run start:dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```

**Access URLs:**
- Frontend: http://localhost:4200
- Backend API: http://localhost:3000

## ✅ Tính Năng Đã Hoàn Thành

### **🔑 Facebook Token Management System**
- **Security**: AES-256 encryption cho token storage
- **Features**: CRUD, token testing, default token management
- **Auto-sync**: Cron jobs đồng bộ chi phí hàng ngày
- **UI**: Vertical layout design, mobile-friendly

### **📊 Core Management Modules**
- **👥 User Management**: 7 user types, CSV import/export
- **📦 Products**: Categories, products với full CRUD
- **🚚 Delivery Status**: Trạng thái giao hàng với colors & icons
- **🏭 Production Status**: Quản lý trạng thái sản xuất
- **📋 Orders**: Order status management với workflow

### **💰 Cost & Profit Management**
- **Advertising Costs**: Facebook ads cost tracking
- **Labor Costs**: Chi phí nhân công theo ngày
- **Other Costs**: Chi phí khác phân loại
- **Profit Reports**: Matrix view với charts và analytics

### **🤖 AI & Integration**
- **OpenAI Chat**: AI-powered chat system
- **Fanpage Management**: Facebook fanpage integration
- **Google Sync**: Google Sheets synchronization
- **Vision AI**: Product image recognition

## 🛠️ VS Code Tasks Available

Sử dụng `Ctrl+Shift+P` → `Tasks: Run Task`:

- **"Start All (Backend + Frontend)"** - Khởi động cả hai
- **"Start Backend"** - Chỉ backend development server
- **"Start Frontend"** - Chỉ frontend development server
- **"Install All Dependencies"** - Cài đặt dependencies

## 📁 Project Structure

```
final7/
├── backend/                    # NestJS Backend
│   ├── src/
│   │   ├── facebook-token/     # 🔑 Facebook Token Management
│   │   ├── facebook-ads-sync/  # 🔄 Facebook Ads Sync
│   │   ├── user/              # 👥 User Management
│   │   ├── product/           # 📦 Product Management  
│   │   ├── ad-group/          # 📊 Ad Group Management
│   │   ├── advertising-cost/  # 💰 Advertising Costs
│   │   ├── chat-message/      # 💬 AI Chat System
│   │   ├── openai-config/     # 🤖 OpenAI Configuration
│   │   ├── google-sync/       # 🔄 Google Integration
│   │   └── ...               # Other modules
│   ├── uploads/              # File uploads storage
│   └── .env                  # Environment variables
├── frontend/                 # Angular Frontend
│   ├── src/app/
│   │   ├── features/         # Feature modules
│   │   │   ├── facebook-token/
│   │   │   ├── facebook-ads-sync/
│   │   │   ├── user/
│   │   │   └── ...
│   │   ├── shared/           # Shared components
│   │   └── core/             # Core services
└── README.md                 # This file
```

## 🔐 Key Security Features

- **JWT Authentication** với role-based permissions
- **AES-256 Token Encryption** cho Facebook tokens
- **Environment Variables** cho sensitive data
- **CORS Protection** configured properly
- **Input Validation** với class-validator
- **SQL Injection Protection** với MongoDB/Mongoose

## 📚 API Documentation

### **Facebook Token Management**
```
GET    /facebook-tokens           # List all tokens
POST   /facebook-tokens           # Create new token
PATCH  /facebook-tokens/:id       # Update token
DELETE /facebook-tokens/:id       # Delete token
POST   /facebook-tokens/:id/test  # Test token validity
POST   /facebook-tokens/:id/set-default  # Set as default
```

### **Facebook Ads Sync**
```
POST /facebook-ads-sync/sync-default    # Sync with default token
POST /facebook-ads-sync/sync-yesterday  # Sync yesterday data
POST /facebook-ads-sync/sync-last-week  # Sync last week data
```

## 🚀 Development Workflow

### **1. Code Organization**
- Feature-based modules (backend)
- Standalone components (frontend)
- Shared services và utilities
- Type-safe với TypeScript

### **2. Development Process**
```bash
# Tạo feature mới
nest g module new-feature    # Backend
ng g c features/new-feature  # Frontend

# Development
npm run start:dev           # Backend với hot reload
npm start                   # Frontend với live reload

# Testing
npm run test               # Unit tests
npm run test:e2e          # E2E tests
```

### **3. Code Quality**
- ESLint + Prettier configuration
- Pre-commit hooks với Husky
- TypeScript strict mode
- Unit test coverage

## 🌐 Production Deployment

### **Environment Setup**
```env
NODE_ENV=production
MONGODB_URI=mongodb_atlas_production_url
JWT_SECRET=strong_production_secret
CORS_ORIGIN=https://yourdomain.com
```

### **Build Commands**
```bash
# Backend
npm run build
npm run start:prod

# Frontend  
npm run build
# Deploy dist/ folder to web server
```

## 🆘 Troubleshooting

### **Backend không khởi động:**
- ✅ Check MongoDB connection
- ✅ Verify .env file exists
- ✅ Check port 3000 availability
- ✅ Verify all dependencies installed

### **Frontend không load:**
- ✅ Check backend is running
- ✅ Verify CORS settings
- ✅ Check console for errors
- ✅ Ensure npm start completed

### **Database connection issues:**
- ✅ MongoDB service running
- ✅ Connection string correct
- ✅ Network/firewall settings
- ✅ Atlas IP whitelist (if using Atlas)

### **Token encryption errors:**
- ✅ FACEBOOK_TOKEN_ENCRYPTION_KEY exactly 32 characters
- ✅ No special characters in key
- ✅ Environment variable loaded correctly

## 📞 Support & Documentation

- **GitHub Issues**: https://github.com/vuthevietgps/final7/issues
- **Development Docs**: See individual feature README files
- **API Testing**: Use Postman collection (if available)

---

**🎉 Happy Development! Chúc các bạn code vui vẻ!**