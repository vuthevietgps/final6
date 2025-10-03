# 🚀 Deployment Guide - Final6 Project

## 📋 Project Overview
Management system với NestJS backend + Angular frontend
- **Backend**: http://localhost:3000
- **Frontend**: http://localhost:4200
- **Database**: MongoDB Atlas

## 🎯 Completed Features

### ✅ Pending Orders Management
- Tạo/cập nhật/duyệt đơn hàng nháp từ conversation UI
- Dropdown chọn đại lý xử lý đơn hàng
- Workflow: draft → awaiting → approved → test-order2
- AI trích xuất thông tin đơn hàng từ chat

### ✅ Conversation Management  
- Real-time message threading
- Agent selection và approval workflow
- Facebook Messenger integration
- OpenAI chatbot integration

### ✅ Authentication & Permissions
- JWT authentication với role-based permissions
- Fix 403 Forbidden errors cho pending-orders
- Token validation và refresh mechanism

### ✅ System Monitoring
- Facebook token health check
- API token management
- Error logging và debugging tools

## 🛠️ Setup Instructions

### 1. Clone Repository
```bash
git clone https://github.com/vuthevietgps/final6.git
cd final6
```

### 2. Backend Setup
```bash
cd backend
npm install
npm run start:dev
```

### 3. Frontend Setup  
```bash
cd frontend
npm install
npm start
```

### 4. Environment Variables
Create `.env` files:
- `backend/.env`: MongoDB connection, JWT secret, Facebook/OpenAI API keys
- `frontend/src/environments/`: API URLs and config

## 📱 Usage Guide

### Pending Orders Workflow:
1. Mở conversation từ danh sách hội thoại
2. AI tự động trích xuất thông tin đơn hàng
3. Chọn đại lý xử lý từ dropdown  
4. Lưu nháp hoặc gửi duyệt
5. Duyệt để tạo đơn hàng chính thức

### Key Features:
- 🤖 AI-powered order extraction
- 👥 Agent assignment system  
- 📋 Order status tracking
- 💬 Integrated chat management
- 🔐 Secure authentication

## 🔧 Development Notes

### Code Structure:
- Backend: NestJS modules (controller/service/schema pattern)
- Frontend: Angular standalone components
- Clean code với comments tiếng Việt
- Error handling và validation đầy đủ

### Security:
- JWT tokens with expiration
- Role-based permissions
- API key management
- Input validation và sanitization

## 🚨 Important Notes

1. **Database**: Ensure MongoDB Atlas connection is configured
2. **API Keys**: Set up Facebook and OpenAI API keys in environment
3. **Permissions**: Check user roles have 'pending-orders' permission
4. **CORS**: Backend configured for ports 4200/4201

## 📈 Next Steps
- [ ] Order analytics dashboard
- [ ] Advanced filtering system
- [ ] Mobile responsive improvements
- [ ] Performance optimizations

---
*Cập nhật: October 2025 - Hoàn thành Pending Orders Management System*