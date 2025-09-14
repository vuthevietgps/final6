# Management System Startup Script
# Khởi động Backend và Frontend

Write-Host "🚀 Đang khởi động Management System..." -ForegroundColor Green
Write-Host ""

# Kiểm tra Node.js
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green
}
catch {
    Write-Host "❌ Node.js chưa được cài đặt. Vui lòng cài đặt Node.js trước." -ForegroundColor Red
    exit 1
}

# Kiểm tra npm
try {
    $npmVersion = npm --version
    Write-Host "✅ npm version: $npmVersion" -ForegroundColor Green
}
catch {
    Write-Host "❌ npm chưa được cài đặt. Vui lòng cài đặt npm trước." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📦 Đang cài đặt dependencies..." -ForegroundColor Yellow

# Cài đặt backend dependencies
Write-Host "Installing backend dependencies..." -ForegroundColor Cyan
Set-Location backend
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Lỗi khi cài đặt backend dependencies" -ForegroundColor Red
    exit 1
}

# Cài đặt frontend dependencies  
Write-Host "Installing frontend dependencies..." -ForegroundColor Cyan
Set-Location ../frontend
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Lỗi khi cài đặt frontend dependencies" -ForegroundColor Red
    exit 1
}

Set-Location ..

Write-Host ""
Write-Host "✅ Hoàn tất cài đặt dependencies" -ForegroundColor Green
Write-Host ""
Write-Host "🔥 Đang khởi động servers..." -ForegroundColor Yellow
Write-Host "Backend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:4200" -ForegroundColor Cyan
Write-Host ""

# Khởi động backend
Write-Host "Starting backend server..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; npm run start:dev"

# Đợi 3 giây để backend khởi động
Start-Sleep -Seconds 3

# Khởi động frontend
Write-Host "Starting frontend server..." -ForegroundColor Cyan  
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm start"

Write-Host ""
Write-Host "🎉 Servers đã được khởi động!" -ForegroundColor Green
Write-Host "Kiểm tra các terminal windows để xem logs" -ForegroundColor Yellow
Write-Host ""
Write-Host "Đợi vài giây để servers khởi động hoàn toàn..." -ForegroundColor Yellow

# Đợi 10 giây rồi mở browser
Start-Sleep -Seconds 10

Write-Host "🌐 Đang mở trình duyệt..." -ForegroundColor Cyan
Start-Process "http://localhost:4200"

Write-Host ""
Write-Host "✅ Hoàn tất! Hệ thống đã sẵn sàng sử dụng." -ForegroundColor Green
