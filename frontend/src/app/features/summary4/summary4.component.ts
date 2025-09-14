import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { Summary4Service } from './summary4.service';
import { UserService } from '../user/user.service';
import { ProductService } from '../product/product.service';
import { Summary4, Summary4Filter, Summary4Stats } from './models/summary4.interface';

@Component({
  selector: 'app-summary4',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './summary4.component.html',
  styleUrls: ['./summary4.component.css']
})
export class Summary4Component implements OnInit {
  // Signals for reactive state management
  summary4Data = signal<Summary4[]>([]);
  agents = signal<any[]>([]);
  products = signal<any[]>([]);
  stats = signal<Summary4Stats | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);
  
  // Filter state
  filter = signal<Summary4Filter>({
    page: 1,
    limit: 50,
    sortBy: 'orderDate',
    sortOrder: 'desc'
  });

  // Pagination state
  totalRecords = signal(0);
  currentPage = signal(1);
  totalPages = signal(0);

  // Edit state
  editingPayment = signal<string | null>(null);
  editPaymentValue = signal<number>(0);

  // Search state
  searchTerm = signal('');
  // UI state similar to Summary1
  showFilters = signal(false);

  // Computed for filtered data display
  filteredData = computed(() => {
    const data = this.summary4Data();
    const term = this.searchTerm().toLowerCase();
    if (!term) return data;
    
    return data.filter(item => 
      item.customerName.toLowerCase().includes(term) ||
      item.agentName.toLowerCase().includes(term) ||
      item.product.toLowerCase().includes(term) ||
      item.productionStatus.toLowerCase().includes(term) ||
      item.orderStatus.toLowerCase().includes(term)
    );
  });

  constructor(
    private summary4Service: Summary4Service,
    private userService: UserService,
    private productService: ProductService
  ) {}

  ngOnInit() {
    this.loadData();
    this.loadAgents();
    this.loadProducts();
    this.loadStats();
  }

  loadData() {
    this.loading.set(true);
    this.error.set(null);
    
    this.summary4Service.findAll(this.filter()).subscribe({
      next: (response) => {
        this.summary4Data.set(response.data);
        this.totalRecords.set(response.total);
        this.currentPage.set(response.page);
        this.totalPages.set(response.totalPages);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Lỗi khi tải dữ liệu: ' + err.message);
        this.loading.set(false);
      }
    });
  }

  loadAgents() {
    this.userService.getAgents().subscribe({
      next: (agents) => this.agents.set(agents),
      error: (err) => console.error('Lỗi khi tải danh sách đại lý:', err)
    });
  }

  loadProducts() {
    this.productService.getAll().subscribe({
      next: (products: any) => this.products.set(products),
      error: (err: any) => console.error('Lỗi khi tải danh sách sản phẩm:', err)
    });
  }

  loadStats() {
    this.summary4Service.getStats().subscribe({
      next: (stats) => this.stats.set(stats),
      error: (err) => console.error('Lỗi khi tải thống kê:', err)
    });
  }

  // Filter methods
  updateFilter<K extends keyof Summary4Filter>(key: K, value: Summary4Filter[K]) {
    this.filter.update(f => ({ ...f, [key]: value } as Summary4Filter));
    this.onFilterChange();
  }

  onFilterChange() {
    this.filter.update(f => ({ ...f, page: 1 }));
    this.loadData();
  }

  // Summary1-like helpers
  refresh() {
    this.loadData();
    this.loadStats();
  }

  goToPage(page: number) {
    if (page < 1) return;
    this.filter.update(f => ({ ...f, page }));
    this.loadData();
  }

  changePageSize(limit: number) {
    const n = Number(limit) || 50;
    this.filter.update(f => ({ ...f, limit: n, page: 1 }));
    this.loadData();
  }

  onPageChange(page: number) {
    this.filter.update(f => ({ ...f, page }));
    this.loadData();
  }

  onSortChange(sortBy: string) {
    this.filter.update(f => ({
      ...f,
      sortBy,
      sortOrder: f.sortBy === sortBy && f.sortOrder === 'asc' ? 'desc' : 'asc'
    }));
    this.loadData();
  }

  // Manual payment editing
  startEditPayment(id: string, currentValue: number) {
    this.editingPayment.set(id);
    this.editPaymentValue.set(currentValue);
  }

  savePayment(id: string) {
    this.summary4Service.updateManualPayment(id, { 
      manualPayment: this.editPaymentValue() 
    }).subscribe({
      next: (updated) => {
        const currentData = this.summary4Data();
        const index = currentData.findIndex(item => item._id === id);
        if (index !== -1) {
          currentData[index] = updated;
          this.summary4Data.set([...currentData]);
        }
        this.editingPayment.set(null);
        this.loadStats(); // Reload stats after update
      },
      error: (err) => {
        this.error.set('Lỗi khi cập nhật thanh toán: ' + err.message);
      }
    });
  }

  cancelEdit() {
    this.editingPayment.set(null);
  }

  // Always-on input blur-save (Summary1-like UX)
  onBlurManual(id: string, event: Event) {
    const target = event.target as HTMLInputElement;
    const value = Number(target?.value ?? 0);
    if (Number.isNaN(value)) return;

    const items = this.summary4Data();
    const idx = items.findIndex(i => i._id === id);
    if (idx === -1) return;

    const current = items[idx].manualPayment || 0;
    if (current === value) return; // no change

    this.summary4Service.updateManualPayment(id, { manualPayment: value }).subscribe({
      next: (updated) => {
        items[idx] = updated;
        this.summary4Data.set([...items]);
        this.loadStats();
      },
      error: (err) => {
        this.error.set('Lỗi khi cập nhật thanh toán: ' + err.message);
      }
    });
  }

  // Pagination display helpers for template
  displayFrom(): number {
    const total = this.totalRecords();
    if (!total) return 0;
    const limit = this.filter().limit || 50;
    return (this.currentPage() - 1) * limit + 1;
  }

  displayTo(): number {
    const total = this.totalRecords();
    if (!total) return 0;
    const limit = this.filter().limit || 50;
    const to = this.currentPage() * limit;
    return to > total ? total : to;
  }

  // Sync data
  syncData() {
    this.loading.set(true);
    this.summary4Service.syncFromTestOrder2().subscribe({
      next: (result) => {
        console.log('Đồng bộ hoàn thành:', result);
        this.loadData();
        this.loadStats();
      },
      error: (err) => {
        this.error.set('Lỗi khi đồng bộ: ' + err.message);
        this.loading.set(false);
      }
    });
  }

  // Utility methods
  formatCurrency(amount: number): string {
    return amount.toLocaleString('vi-VN') + ' ₫';
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('vi-VN');
  }

  getStatusColor(status: string): string {
    const statusColors: { [key: string]: string } = {
      'Đã trả kết quả': 'text-green-600',
      'Đang xử lý': 'text-yellow-600',
      'Chưa làm': 'text-gray-600',
      'Giao thành công': 'text-green-600',
      'Đang vận chuyển': 'text-blue-600',
      'Chưa có mã vận đơn': 'text-gray-600'
    };
    return statusColors[status] || 'text-gray-600';
  }

  trackByFn(index: number, item: Summary4): string {
    return item._id;
  }
}