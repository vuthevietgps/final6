# Quy tắc làm việc trong dự án

1. Tổ chức code theo chuẩn NestJS và Angular.
   - Mỗi chức năng (feature) phải được tách thành thư mục riêng và bao gồm tối thiểu các file: `*.module.ts`, `*.controller.ts`, `*.component.ts`, `*.service.ts`....
   - Backend (NestJS): giữ pattern module/controller/service/dto/schema.
   - Frontend (Angular): giữ feature-based structure, component/service/module tương ứng.

2. Khi chạy lệnh trong terminal luôn sử dụng `;` thay vì `&&`.
   - Ví dụ (PowerShell): `Set-Location -Path 'backend'; npm install`.

3. Luôn bật server (backend/frontend) trước, rồi mở terminal mới để test API.
   - Nếu test trong cùng một terminal sẽ tắt server đang chạy (do lệnh mới chạy chồng lên). Luôn mở terminal mới khi chạy các lệnh kiểm tra hoặc gọi API.

4. Hướng dẫn khởi động servers:
   - Luôn khởi động backend trước, sau đó frontend trong terminal riêng.
   - Backend chạy tại: http://localhost:3000
   - Frontend chạy tại: http://localhost:4200

5. Giao tiếp và tài liệu bằng Tiếng Việt.
   - Toàn bộ trao đổi, phản hồi, commit message, mô tả PR, và tài liệu nội bộ sử dụng Tiếng Việt rõ ràng, dễ hiểu.

6. Thêm chú thích (comment) có ý nghĩa trong mã nguồn.
   - Ở đầu mỗi file, viết chú thích ngắn gọn mô tả vai trò/tác dụng tổng quan của file.
   - Với các đoạn code quan trọng/phức tạp, thêm comment giải thích ý nghĩa, luồng xử lý, ràng buộc, và lý do quyết định kỹ thuật.

Ngắn gọn: tuân thủ cấu trúc module/component/service, dùng `;` trong terminal, dùng terminal riêng khi test, và khởi động backend trước frontend.
