# Management System Setup Guide

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- MongoDB (local or MongoDB Atlas)
- Git

### 1. Clone Repository
```bash
git clone https://github.com/vuthevietgps/final5.git
cd final5
```

### 2. Backend Setup
```bash
cd backend
npm install
```

#### Environment Configuration
Create `backend/.env`:
```env
# Database
MONGODB_URI=mongodb://localhost:27017/management-system
# Or MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/management-system

# JWT
JWT_SECRET=your-super-secret-jwt-key-here

# Google Sheets (Optional)
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json
# Or inline JSON:
# GOOGLE_CREDENTIALS_JSON={"type":"service_account",...}

# Server
PORT=3000
```

#### Start Backend Development Server
```bash
npm run start:dev
```
Backend will run on: http://localhost:3000

### 3. Frontend Setup
```bash
cd frontend
npm install
npm start
```
Frontend will run on: http://localhost:4200

## 📊 Features Overview

### Core Modules
- **👥 User Management**: Directors, Managers, Employees, Agents, Suppliers
- **📦 Test Order 2**: Advanced order management with filters, CSV export/import
- **💰 Quote Management**: Agent quotes with validation and auto-sync
- **📈 Summary1**: Google Sheets integration for agent reporting
- **🚚 Delivery Status**: Status tracking with colors and icons
- **📂 Product Categories**: Category management with product counts

### Advanced Features
- **Split-table UI** with synchronized scrolling for Test Order 2
- **Real-time Google Sheets sync** with debounce optimization
- **CSV/Excel import/export** with UTF-8 encoding
- **Manual payment tracking** with automatic calculations
- **Responsive design** with modern CSS

## 🗃️ Database Schema

### Key Collections
- `users` - User accounts and agent information
- `testorder2` - Main order management
- `quotes` - Agent quotes with auto-fill names
- `summary1` - Aggregated data for Google Sheets sync
- `products` - Product catalog
- `productcategories` - Category management
- `deliverystatuses` - Status definitions

### Summary1 Calculations
```
quotePrice = Latest approved quote price for product
mustPay = quotePrice × quantity (when production complete)
paid = codAmount (when order delivered)
needToPay = paid - mustPay - manualPayment
```

## 🔧 Development Commands

### Backend
```bash
npm run start:dev    # Development with hot reload
npm run build        # Production build
npm run start:prod   # Production server
npm run lint         # ESLint check
npm run format       # Prettier format
```

### Frontend
```bash
npm start            # Development server
npm run build        # Production build
npm run lint         # Angular lint
npm test             # Unit tests
```

## 🌐 API Endpoints

### Core APIs
- `GET/POST/PATCH/DELETE /users` - User management
- `GET/POST/PATCH/DELETE /test-order2` - Order management
- `GET/POST/PATCH/DELETE /quotes` - Quote management
- `GET/POST/PATCH/DELETE /products` - Product catalog
- `GET/POST/PATCH/DELETE /product-category` - Categories
- `GET/POST/PATCH/DELETE /delivery-status` - Status management

### Google Sync APIs
- `GET /google-sync/summary/agent/:agentId` - View Summary1 data
- `POST /google-sync/summary/agent/:agentId/rebuild-and-push` - Sync to Google
- `GET /google-sync/summary/export-template` - Export for manual payment
- `POST /google-sync/summary/import-template` - Import manual payments

### Filter & Search
- `GET /test-order2?productionStatus=...&orderStatus=...&fromDate=...&toDate=...`
- `GET /google-sync/summary/filter?agentId=...&productId=...`

## 📝 Recent Updates (Latest)

### Quote Validation Fix
- Made `product` and `agentName` optional in CreateQuoteDto
- Added controller normalization for empty strings
- Service auto-fills names from database when not provided

### Test Order 2 Enhancements
- Split-table layout with fixed left columns
- Synchronized horizontal scrolling
- Expanded column widths for better UX
- Backend filter support for productionStatus/orderStatus
- Non-blocking Summary5 sync for faster responses

## 🔐 Google Sheets Integration

### Setup Service Account
1. Go to Google Cloud Console
2. Create/select project → Enable Sheets API
3. Create Service Account → Download JSON key
4. Set `GOOGLE_APPLICATION_CREDENTIALS` or `GOOGLE_CREDENTIALS_JSON`

### Agent Configuration
1. Create Google Sheet for agent
2. Set `googleDriveLink` in user record
3. System will auto-create "Summary1" tab if needed

### Sync Process
- **Automatic**: Triggered by order/quote changes (debounced)
- **Manual**: Via API endpoints or admin panel
- **Data**: Writes to A3+ range, preserves headers in A1-A2

## 🚨 Troubleshooting

### Common Issues

#### Backend not starting
```bash
# Check MongoDB connection
mongosh "mongodb://localhost:27017"
# Or check Atlas connection string

# Verify Node version
node --version  # Should be 18+
```

#### Frontend compilation errors
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### Google Sheets sync failing
```bash
# Test credentials
curl http://localhost:3000/google-sync/cred-check
# Check service account permissions on target sheet
```

### Performance Tips
- Use MongoDB indexes (auto-created via schemas)
- Enable gzip compression for large CSV exports
- Monitor debounce delays in Google Sync logs

## 📞 Support
- Check console logs for detailed error messages
- Use `/diagnostics` endpoints for debugging
- Review network requests in browser dev tools

## 🎯 Next Steps
1. Set up environment variables
2. Start backend and verify API responses
3. Start frontend and test core features
4. Configure Google Sheets integration (optional)
5. Customize UI themes and branding
6. Add additional business logic as needed

Happy coding! 🚀