# Summary1 Feature

## Tổng quan
Chức năng **Summary1** hiển thị tổng hợp dữ liệu từ database Summary1 với khả năng cập nhật manual payment.

## Kiến trúc

### Frontend Component
- **File**: `summary1.component.ts`
- **Mục đích**: Hiển thị bảng tổng hợp với manual payment tracking
- **Dependencies**: Chỉ sử dụng HttpClient để gọi API

### Backend API
- **Endpoint**: `/google-sync/summary/agent/:agentId`
- **Endpoint**: `/google-sync/summary/:summaryId/manual-payment`
- **Database**: MongoDB collection `summary1`

## Tính năng chính

### 1. Hiển thị dữ liệu Summary1
- Lấy dữ liệu từ API Summary1 thay vì TestOrder2
- Hiển thị tất cả cột cần thiết với tính toán tự động
- Tìm kiếm theo tên khách hàng, số điện thoại, mã vận đơn

### 2. Manual Payment Tracking
- Input field "Thanh toán tay" cho từng dòng
- Tự động tính lại `needToPay = paid - mustPay - manualPayment`
- Lưu trực tiếp vào Summary1 database
- Tự động đồng bộ lên Google Sheets sau 1.5s

### 3. Tổng kết tài chính
- Tổng "Phải Trả công ty"
- Tổng "Đã Trả công ty" 
- Tổng "Cần thanh toán"

## Luồng dữ liệu

```
1. Frontend gọi /google-sync/agents → Lấy danh sách đại lý
2. Frontend gọi /google-sync/summary/agent/:agentId → Lấy Summary1 của từng đại lý
3. User nhập "Thanh toán tay" → onBlurManual()
4. Frontend gọi POST /google-sync/summary/:summaryId/manual-payment
5. Backend tính lại needToPay và lưu Summary1
6. Backend schedule push lên Google Sheets sau 1.5s
7. Frontend cập nhật UI với kết quả từ server
```

## Interface

### Summary1Row
```typescript
interface Summary1Row {
  _id: string;          // Order ID
  summaryId: string;    // Summary1 record ID
  customerName: string;
  trackingNumber?: string;
  receiverPhone?: string;
  product: string;
  productId: string;
  quantity: number;
  agentId: any;
  productionStatus: string;
  orderStatus: string;
  codAmount: number;
  quotePrice: number;   // Báo giá đại lý
  mustPay: number;      // Phải Trả công ty
  paid: number;         // Đã Trả công ty
  manualPayment: number; // Thanh toán tay
  needToPay: number;    // Cần thanh toán
}
```

## Sử dụng

1. **Truy cập**: http://localhost:4200/reports/summary1
2. **Tìm kiếm**: Nhập từ khóa vào ô tìm kiếm
3. **Cập nhật manual payment**: Click vào ô "Thanh toán tay", nhập số tiền, Enter hoặc click ra ngoài
4. **Làm mới**: Click nút "🔄 Làm mới"

## Cải tiến đã thực hiện

### Code Cleanup
- ✅ Xóa dependencies không cần thiết (TestOrder2Service, QuoteService)
- ✅ Tạo interface Summary1Row riêng biệt
- ✅ Xóa method enrich() không sử dụng
- ✅ Đơn giản hóa import statements
- ✅ Cải thiện type safety

### Architecture
- ✅ Tách biệt hoàn toàn khỏi TestOrder2
- ✅ Sử dụng Summary1 API trực tiếp
- ✅ Manual payment lưu vào đúng database
- ✅ Tự động đồng bộ Google Sheets

## Tối ưu hóa

- **Performance**: Sử dụng Angular Signals cho reactive UI
- **UX**: Tự động tính toán real-time khi nhập manual payment
- **Data consistency**: Server-side calculation đảm bảo đúng công thức
- **Scalability**: API phân tách theo từng đại lý
