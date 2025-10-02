# 📊 Summary4 Google Sync Integration Plan

## 🎯 Mục Tiêu
Đồng bộ dữ liệu từ **Summary4** lên Google Sheet của mỗi user thay vì sử dụng Summary1 như hiện tại. Khi Summary4 có cập nhật sẽ tự động trigger đồng bộ lên Google Sheet.

## 🔍 Phân Tích Hiện Tại

### Summary4 (Tổng hợp 4)
- **Schema**: Chứa dữ liệu đầy đủ về đơn hàng, thanh toán, trạng thái
- **Features**: Manual payment, sync từ TestOrder2, export Excel
- **Trigger**: Hiện tại chỉ sync với Summary5 khi có update manual payment

### Google Sync (Hiện tại)
- **Nguồn dữ liệu**: Summary1 (được build từ TestOrder2 + Quote)
- **Chức năng**: Đồng bộ lên Google Sheet theo agentId
- **Cron Job**: Chạy mỗi 10 phút
- **API**: Có sẵn các endpoint để sync manual hoặc auto

## 🏗️ Kiến Trúc Mới

### 1. Summary4 Google Sync Service
```typescript
// File: summary4/summary4-google-sync.service.ts
@Injectable()
export class Summary4GoogleSyncService {
  // Inject GoogleSyncService để tái sử dụng Google API logic
  constructor(
    private readonly googleSyncService: GoogleSyncService,
    @InjectModel(Summary4.name) private summary4Model: Model<Summary4Document>,
    @InjectModel(User.name) private userModel: Model<UserDocument>
  ) {}

  // Đồng bộ Summary4 của một agent lên Google Sheet
  async syncAgentSummary4(agentId: string): Promise<void>

  // Build dữ liệu Summary4 thành format Google Sheet
  async buildSummary4ForAgent(agentId: string): Promise<any[]>

  // Ghi dữ liệu lên Google Sheet (sheet name: 'Summary4')
  async writeSummary4ToGoogleSheet(agentId: string, data: any[]): Promise<void>
}
```

### 2. Trigger Points (Điểm Kích Hoạt)
1. **Manual Payment Update**: Khi user cập nhật manual payment
2. **Sync from TestOrder2**: Khi sync dữ liệu từ TestOrder2
3. **Import Manual Payment**: Khi import Excel manual payment
4. **Manual Trigger**: API endpoint để sync thủ công

### 3. API Endpoints Mới
```typescript
// File: summary4/summary4.controller.ts
@Post('sync-google/:agentId')
syncToGoogle(@Param('agentId') agentId: string)

@Post('sync-google-all')  
syncAllToGoogle()
```

## 🔧 Implementation Steps

### Step 1: Tạo Summary4GoogleSyncService
- Tái sử dụng Google Auth logic từ GoogleSyncService hiện tại
- Build data từ Summary4 thay vì Summary1
- Ghi lên sheet 'Summary4' thay vì 'Summary1'

### Step 2: Cập Nhật Summary4Service
- Thêm trigger sync Google khi có update
- Tích hợp với Summary4GoogleSyncService

### Step 3: Thêm API Endpoints
- Endpoint sync thủ công
- Endpoint sync tất cả agents

### Step 4: Cập Nhật Frontend
- Thêm button "Sync to Google" trong Summary4 UI
- Hiển thị trạng thái sync

## 📋 Data Mapping

### Summary4 → Google Sheet Columns
```
A: Ngày đặt hàng (orderDate)
B: Tên khách hàng (customerName)  
C: Sản phẩm (product)
D: Số lượng (quantity)
E: Đại lý (agentName)
F: Ad Group ID (adGroupId)
G: Trạng thái sản xuất (productionStatus)
H: Trạng thái đơn hàng (orderStatus)
I: Mã vận đơn (trackingNumber)
J: Link nộp (submitLink)
K: Tiền cọc (depositAmount)
L: Tiền COD (codAmount)
M: Giá báo giá (approvedQuotePrice)
N: Phải trả công ty (mustPayToCompany)
O: Đã trả công ty (paidToCompany)
P: Thanh toán thủ công (manualPayment)
Q: Cần thanh toán (needToPay)
```

## 🚀 Benefits

### Ưu Điểm
1. **Dữ liệu đầy đủ hơn**: Summary4 có nhiều thông tin hơn Summary1
2. **Real-time sync**: Sync ngay khi có update thay vì chờ cron job
3. **Tách biệt logic**: Không ảnh hưởng đến Google Sync hiện tại
4. **Linh hoạt**: Có thể tùy chỉnh format dữ liệu dễ dàng

### Tương Thích
- Không ảnh hưởng đến Summary1 Google Sync hiện tại
- Có thể chạy song song
- User có thể chọn sử dụng Summary1 hoặc Summary4

## ⚠️ Considerations

### Hiệu Suất
- Cần debounce để tránh sync quá nhiều lần
- Batch update cho import Excel

### Lỗi Handling
- Retry mechanism khi Google API lỗi
- Log chi tiết cho debugging

### Security
- Tái sử dụng Google Auth từ service hiện tại
- Validate agentId permissions

---
**Next Steps**: Implement Summary4GoogleSyncService và test với một agent trước