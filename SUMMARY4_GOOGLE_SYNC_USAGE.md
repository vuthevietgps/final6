# 📊 Summary4 Google Sync - Hướng Dẫn Sử Dụng

## 🎯 Tổng Quan

Chức năng **Summary4 Google Sync** cho phép đồng bộ dữ liệu từ Summary4 lên Google Sheets của từng đại lý một cách tự động. Khác với Summary1 Sync hiện tại, Summary4 Sync cung cấp dữ liệu đầy đủ và chi tiết hơn.

## 🚀 Cách Sử Dụng

### 1. Đồng Bộ Thủ Công Một Đại Lý

**API Endpoint:**
```http
POST /summary4/sync-google/{agentId}
```

**Ví dụ:**
```bash
curl -X POST http://localhost:3000/summary4/sync-google/67890abcdef123456789
```

**Response:**
```json
{
  "success": true,
  "message": "Summary4 đã được đồng bộ lên Google Sheet",
  "agentId": "67890abcdef123456789"
}
```

### 2. Đồng Bộ Tất Cả Đại Lý

**API Endpoint:**
```http
POST /summary4/sync-google-all
```

**Ví dụ:**
```bash
curl -X POST http://localhost:3000/summary4/sync-google-all
```

**Response:**
```json
{
  "success": true,
  "message": "Đồng bộ tất cả đại lý hoàn thành",
  "total": 25,
  "success": 23,
  "failed": 2,
  "errors": [
    "Agent 123: Missing Google Drive link",
    "Agent 456: Invalid spreadsheet ID"
  ]
}
```

### 3. Đồng Bộ Tự Động

Hệ thống sẽ tự động đồng bộ khi:
- ✅ Cập nhật Manual Payment
- ✅ Import Manual Payment từ Excel  
- ✅ Sync từ TestOrder2

**Debounce**: Có delay 2 giây để gộp các thay đổi liên tiếp.

## 📋 Cấu Trúc Dữ liệu Google Sheet

### Sheet Name: `Summary4`

| Cột | Tên Cột | Mô Tả |
|-----|----------|-------|
| A | Ngày đặt hàng | DD/MM/YYYY |
| B | Tên khách hàng | Tên người đặt hàng |
| C | Sản phẩm | Tên sản phẩm |
| D | Số lượng | Số lượng đặt |
| E | Đại lý | Tên đại lý |
| F | Ad Group ID | ID nhóm quảng cáo |
| G | Trạng thái sản xuất | Trạng thái hiện tại |
| H | Trạng thái đơn hàng | Trạng thái giao hàng |
| I | Mã vận đơn | Số tracking |
| J | Link nộp | URL nộp bài |
| K | Tiền cọc | Số tiền đặt cọc |
| L | Tiền COD | Số tiền thu hộ |
| M | Giá báo giá | Giá đã duyệt |
| N | Phải trả công ty | Số tiền phải trả |
| O | Đã trả công ty | Số tiền đã trả |
| P | Thanh toán thủ công | Số tiền thanh toán tay |
| Q | Cần thanh toán | Số tiền còn thiếu |

## ⚙️ Cấu Hình

### 1. Google Drive Link

Mỗi đại lý cần có `googleDriveLink` trong database:

```javascript
// Ví dụ User document
{
  "_id": "67890abcdef123456789",
  "fullName": "Nguyễn Văn A",
  "email": "agent@example.com",
  "googleDriveLink": "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit"
}
```

### 2. Google Credentials

Cần có biến môi trường:
```bash
GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json
# HOẶC
GOOGLE_CREDENTIALS_JSON='{"type":"service_account",...}'
```

## 🔍 Logs & Monitoring

### Check Logs
```bash
# Backend logs
tail -f backend/logs/app.log | grep "Summary4GoogleSync"

# Hoặc xem trong console
docker logs your-backend-container | grep "Summary4"
```

### Debug Mode
```bash
# Bật debug mode
export DEBUG_SUMMARY4=true
```

## 🛠️ Troubleshooting

### Lỗi Thường Gặp

#### 1. "Missing Google Drive link"
**Nguyên nhân**: User chưa có `googleDriveLink`
**Giải pháp**: Cập nhật user với Google Sheets URL

#### 2. "Cannot extract spreadsheetId"
**Nguyên nhân**: URL Google Sheets không đúng format
**Giải pháp**: Sử dụng URL dạng `/spreadsheets/d/{id}/edit`

#### 3. "Missing Google credentials"
**Nguyên nhân**: Chưa cấu hình GOOGLE_CREDENTIALS
**Giải pháp**: Thiết lập biến môi trường credentials

#### 4. "Sheet Summary4 not found"
**Nguyên nhân**: Sheet tab chưa tồn tại
**Giải pháp**: Hệ thống sẽ tự tạo sheet tab `Summary4`

### Kiểm Tra Kết Nối Google API

```bash
curl -X GET http://localhost:3000/google-sync/cred-check
```

## 📊 So Sánh với Summary1 Sync

| Tính Năng | Summary1 Sync | **Summary4 Sync** |
|-----------|---------------|-------------------|
| Nguồn dữ liệu | TestOrder2 + Quote | Summary4 (đầy đủ) |
| Tự động sync | Cron job 10 phút | Real-time trigger |
| Số cột dữ liệu | 15 cột | 17 cột |
| Manual payment | ✅ | ✅ |
| Trạng thái chi tiết | ❌ | ✅ |
| Ad Group ID | ❌ | ✅ |
| Tiền cọc | ❌ | ✅ |

## 🎯 Use Cases

### 1. Đại Lý Muốn Theo Dõi Chi Tiết
- Sử dụng Summary4 Sync để có dữ liệu đầy đủ
- Bao gồm Ad Group ID, tiền cọc, trạng thái chi tiết

### 2. Quản Lý Muốn Real-time Update
- Khi cập nhật manual payment → tự động sync
- Không cần chờ cron job

### 3. Báo Cáo Tổng Hợp
- Export Summary4 để phân tích
- Sync lên Google Sheets để chia sẻ

## 🔮 Roadmap

- [ ] **Auto-sync on Order Status Change**: Sync khi đơn hàng thay đổi trạng thái
- [ ] **Batch Import Trigger**: Sync sau khi import bulk data
- [ ] **Error Recovery**: Retry mechanism cho failed syncs
- [ ] **Webhook Integration**: Notify khi sync hoàn thành
- [ ] **Multi-sheet Support**: Sync nhiều sheet trong một spreadsheet

---
**Lưu ý**: Summary4 Sync hoạt động độc lập với Summary1 Sync. Có thể sử dụng cả hai cùng lúc.