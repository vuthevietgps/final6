#!/bin/bash

echo "🚀 Đang khởi động Management System..."
echo ""

# Kiểm tra xem Node.js đã được cài đặt chưa
if ! command -v node &> /dev/null; then
    echo "❌ Node.js chưa được cài đặt. Vui lòng cài đặt Node.js trước."
    exit 1
fi

# Kiểm tra xem npm đã được cài đặt chưa
if ! command -v npm &> /dev/null; then
    echo "❌ npm chưa được cài đặt. Vui lòng cài đặt npm trước."
    exit 1
fi

echo "📦 Đang cài đặt dependencies..."

# Cài đặt dependencies cho backend
echo "Backend dependencies..."
cd backend
npm install
if [ $? -ne 0 ]; then
    echo "❌ Lỗi khi cài đặt backend dependencies"
    exit 1
fi

# Cài đặt dependencies cho frontend
echo "Frontend dependencies..."
cd ../frontend
npm install
if [ $? -ne 0 ]; then
    echo "❌ Lỗi khi cài đặt frontend dependencies"
    exit 1
fi

cd ..

echo ""
echo "✅ Hoàn tất cài đặt dependencies"
echo ""
echo "🔥 Đang khởi động servers..."
echo "Backend: http://localhost:3000"
echo "Frontend: http://localhost:4200"
echo ""

# Khởi động backend trong background
cd backend
npm run start:dev &
BACKEND_PID=$!

# Khởi động frontend trong background
cd ../frontend
npm start &
FRONTEND_PID=$!

cd ..

echo "🎉 Servers đã được khởi động!"
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo ""
echo "Nhấn Ctrl+C để dừng tất cả servers"

# Hàm cleanup khi nhấn Ctrl+C
cleanup() {
    echo ""
    echo "🛑 Đang dừng servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo "✅ Đã dừng tất cả servers"
    exit 0
}

# Bắt tín hiệu Ctrl+C
trap cleanup SIGINT

# Chờ đợi
wait
