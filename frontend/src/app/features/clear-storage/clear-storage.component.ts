import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-clear-storage',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container">
      <div class="card">
        <h2>🔧 Xóa Session & Đăng Nhập Lại</h2>
        
        <div class="status" [ngClass]="statusClass">
          {{ statusMessage }}
        </div>
        
        <div class="buttons">
          <button (click)="clearStorage()" class="btn btn-danger">
            🧹 Xóa Tất Cả Session
          </button>
          
          <button (click)="testLogin()" class="btn btn-success" [disabled]="loading">
            🔑 Test Login Director
          </button>
          
          <button (click)="goToApp()" class="btn btn-primary">
            🚀 Vào Ứng Dụng
          </button>
        </div>
        
        <div *ngIf="results" class="results">
          <h4>Kết quả:</h4>
          <pre>{{ results }}</pre>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .container {
      max-width: 600px;
      margin: 50px auto;
      padding: 20px;
      font-family: Arial, sans-serif;
    }
    
    .card {
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    
    .status {
      padding: 15px;
      margin: 15px 0;
      border-radius: 5px;
      font-weight: bold;
    }
    
    .status.success {
      background: #d4edda;
      color: #155724;
      border: 1px solid #c3e6cb;
    }
    
    .status.error {
      background: #f8d7da;
      color: #721c24;
      border: 1px solid #f5c6cb;
    }
    
    .status.info {
      background: #d1ecf1;
      color: #0c5460;
      border: 1px solid #b8daff;
    }
    
    .buttons {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      margin: 20px 0;
    }
    
    .btn {
      padding: 12px 24px;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 16px;
      font-weight: bold;
    }
    
    .btn-danger { background: #dc3545; color: white; }
    .btn-success { background: #28a745; color: white; }
    .btn-primary { background: #007bff; color: white; }
    
    .btn:hover:not(:disabled) { opacity: 0.8; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    
    .results {
      margin-top: 20px;
    }
    
    pre {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 5px;
      overflow-x: auto;
      font-size: 14px;
    }
  `]
})
export class ClearStorageComponent implements OnInit {
  statusMessage = '🏠 Sẵn sàng xử lý lỗi đăng nhập';
  statusClass = 'info';
  loading = false;
  results = '';

  constructor(private router: Router) {}

  ngOnInit() {
    this.checkCurrentStorage();
  }

  checkCurrentStorage() {
    const token = localStorage.getItem('access_token');
    const user = localStorage.getItem('current_user');
    
    if (token || user) {
      this.statusMessage = '⚠️ Phát hiện session cũ - cần xóa để tránh lỗi 401';
      this.statusClass = 'error';
    }
  }

  clearStorage() {
    try {
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear cookies
      document.cookie.split(";").forEach((c) => {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
      
      this.statusMessage = '✅ Đã xóa tất cả session thành công!';
      this.statusClass = 'success';
      this.results = 'LocalStorage và SessionStorage đã được xóa sạch.';
      
    } catch (error: any) {
      this.statusMessage = '❌ Lỗi khi xóa session: ' + error.message;
      this.statusClass = 'error';
    }
  }

  async testLogin() {
    this.loading = true;
    this.statusMessage = '🔄 Đang test đăng nhập...';
    this.statusClass = 'info';
    
    try {
      const response = await fetch('http://localhost:3000/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'director@example.com',
          password: '123456'
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('current_user', JSON.stringify(data.user));
        
        this.statusMessage = '✅ Đăng nhập thành công!';
        this.statusClass = 'success';
        this.results = JSON.stringify({
          user: data.user,
          tokenPrefix: data.access_token.substring(0, 20) + '...'
        }, null, 2);
      } else {
        this.statusMessage = '❌ Đăng nhập thất bại: ' + data.message;
        this.statusClass = 'error';
        this.results = JSON.stringify(data, null, 2);
      }
    } catch (error: any) {
      this.statusMessage = '❌ Lỗi kết nối: ' + error.message;
      this.statusClass = 'error';
      this.results = error.message;
    } finally {
      this.loading = false;
    }
  }

  goToApp() {
    this.router.navigate(['/dashboard']);
  }
}