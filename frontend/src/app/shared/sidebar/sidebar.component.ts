/**
 * File: shared/sidebar/sidebar.component.ts
 * Mục đích: Thành phần Sidebar điều hướng trái, chứa menu tới các tính năng.
 */
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

interface MenuItem {
  icon: string;
  label: string;
  route: string;
  children?: MenuItem[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent {
  constructor(public authService: AuthService) {}

  menuItems: MenuItem[] = [
    {
      icon: '👥',
      label: 'Quản Lý Người Dùng',
      route: '/users'
    },
    {
      icon: '📦',
      label: 'Quản Lý Đơn Hàng',
      route: '/orders',
      children: [
        { icon: '🧪', label: 'Đơn Hàng Thử Nghiệm', route: '/orders/test' },
        { icon: '🧪', label: 'Đơn Hàng Thử Nghiệm 2', route: '/orders/test2' }
      ]
    },
    {
      icon: '🤝',
      label: 'Quản Lý Khách Hàng',
      route: '/customers'
    },
    {
      icon: '🛍️',
      label: 'Sản Phẩm',
      route: '/products',
      children: [
        { icon: '📦', label: 'Nhóm Sản Phẩm', route: '/product-category' },
        { icon: '🛍️', label: 'Quản Lý Sản Phẩm', route: '/product' }
      ]
    },
    {
      icon: '📢',
      label: 'Quảng Cáo',
      route: '/advertising',
      children: [
        { icon: '🎯', label: 'Tài Khoản Quảng Cáo', route: '/ad-accounts' },
        { icon: '💰', label: 'Chi Phí Quảng Cáo 2', route: '/costs/advertising2' },
        { icon: '📢', label: 'Nhóm Quảng Cáo', route: '/ad-groups' },
        { icon: '📊', label: 'Số Lượng Nhóm Quảng Cáo', route: '/ad-group-counts' }
      ]
    },
    {
      icon: '💰',
      label: 'Chi Phí',
      route: '/costs',
      children: [
  { icon: '🧑‍🏭', label: 'Chi Phí Nhân Công 1', route: '/costs/labor1' },
        { icon: '🛒', label: 'Chi Phí Nhập Hàng', route: '/costs/purchase' },
        { icon: '💸', label: 'Chi Phí Khác', route: '/costs/other' }
      ]
    },
    {
      icon: '💵',
      label: 'Cấu Hình Lương',
      route: '/costs/salary'
    },
    {
      icon: '🔄',
      label: 'Quản Lý Trạng Thái',
      route: '/status',
      children: [
        { icon: '🏭', label: 'Trạng Thái Sản Xuất', route: '/production-status' },
        { icon: '🚚', label: 'Trạng Thái Giao Hàng', route: '/delivery-status' }
      ]
    },
    {
      icon: '📈',
      label: 'Báo Cáo',
      route: '/reports',
      children: [
  { icon: '📊', label: 'Lợi nhuận và chi phí quảng cáo', route: '/reports/ad-group-profit' },
  { icon: '📈', label: 'Lợi Nhuận QC Theo Ngày', route: '/reports/ad-group-profit-report' },
        { icon: '📈', label: 'Tổng Hợp 1', route: '/reports/summary1' },
        { icon: '📑', label: 'Tổng Hợp 2', route: '/reports/summary2' },
        { icon: '📅', label: 'Lợi Nhuận Sản Phẩm Theo Ngày', route: '/reports/product-profit' }
      ]
    },
    {
      icon: '💹',
      label: 'Báo Giá Đại Lý',
      route: '/quotes'
    },
    {
      icon: '💰',
      label: 'Lợi Nhuận',
      route: '/profit'
    },
    {
      icon: '⚙️',
      label: 'Cài Đặt',
      route: '/settings'
    }
  ];

  expandedItems: Set<string> = new Set();

  toggleExpanded(route: string): void {
    if (this.expandedItems.has(route)) {
      this.expandedItems.delete(route);
    } else {
      this.expandedItems.add(route);
    }
  }

  isExpanded(route: string): boolean {
    return this.expandedItems.has(route);
  }

  // Kiểm tra quyền hiển thị một menu item (cha hoặc con)
  canShow(item: MenuItem): boolean {
    // Nếu chưa đăng nhập: chỉ cho phép menu Login
    if (!this.authService.isAuthenticated()) {
      return item.route === '/login';
    }

    const routePermMap: Record<string, string> = {
      '/users': 'users',
      '/orders': 'orders',
      '/orders/test': 'orders',
      '/orders/test2': 'orders',
      '/products': 'products',
      '/product-category': 'product-categories',
      '/product': 'products',
  '/customers': 'customers',
      '/ad-accounts': 'ad-accounts',
      '/costs/advertising2': 'advertising-costs',
      '/ad-groups': 'ad-groups',
      '/ad-group-counts': 'ad-groups',
  // Sử dụng đường dẫn đầy đủ dưới nhóm /costs cho labor1
  '/costs/labor1': 'labor-costs',
  // Giữ ánh xạ cũ để tránh lỗi nếu còn nơi nào dùng route cũ
  '/labor1': 'labor-costs',
  '/costs/purchase': 'purchase-costs',
      '/costs/other': 'other-costs',
  '/costs/salary': 'salary-config',
      '/production-status': 'production-status',
      '/delivery-status': 'delivery-status',
      '/quotes': 'quotes',
      '/reports/ad-group-profit': 'reports',
      '/reports/ad-group-profit-report': 'reports',
      '/reports/summary1': 'reports',
      '/reports/summary2': 'reports',
      '/reports/product-profit': 'reports',
  '/profit': 'reports',
      '/settings': 'settings'
    };

    const permission = routePermMap[item.route];
    if (!permission && !item.children?.length) {
      return true; // không yêu cầu quyền cụ thể
    }

    if (item.children?.length) {
      // Hiển thị item cha nếu có ít nhất một child có quyền
      return item.children.some(child => this.canShow(child));
    }

    return this.authService.hasPermission(permission);
  }
}
