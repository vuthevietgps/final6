/**
 * Summary1 Component
 * Hiển thị tổng hợp dữ liệu từ Summary1 database với manual payment tracking và filter nâng cao
 */
import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

interface Summary1Row {
  _id: string;          // Order ID (để tương thích với UI)
  summaryId: string;    // ID của Summary1 record
  customerName: string;
  trackingNumber?: string;
  receiverPhone?: string;
  receiverName?: string;
  receiverAddress?: string;
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
  needToPay: number;    // Cần thanh toán = paid - mustPay - manualPayment
  createdAt?: string;   // Ngày tạo
  adGroupId?: string;   // Ad Group ID
  isActive?: boolean;   // Trạng thái hoạt động
  serviceDetails?: string; // Chi tiết dịch vụ
  submitLink?: string;  // Link submit
  depositAmount?: number; // Số tiền đặt cọc
}

interface FilterOptions {
  agents: Array<{ id: string; name: string; email: string }>;
  products: Array<{ id: string; name: string }>;
  productionStatuses: string[];
  orderStatuses: string[];
  dateRange: { minDate: string | null; maxDate: string | null };
  sortOptions: Array<{ value: string; label: string }>;
}

interface FilterState {
  agentId: string;
  productId: string;
  productionStatus: string;
  orderStatus: string;
  fromDate: string;
  toDate: string;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

@Component({
  selector: 'app-summary1',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './summary1.component.html',
  styleUrls: ['./summary1.component.css']
})
export class Summary1Component implements OnInit {
  orders = signal<Summary1Row[]>([]);
  isLoading = signal(false);
  error = signal<string | null>(null);
  showFilters = signal(false);

  // Filter options
  filterOptions = signal<FilterOptions>({
    agents: [],
    products: [],
    productionStatuses: [],
    orderStatuses: [],
    dateRange: { minDate: null, maxDate: null },
    sortOptions: []
  });

  // Filter state
  filter = signal<FilterState>({
    agentId: '',
    productId: '',
    productionStatus: '',
    orderStatus: '',
    fromDate: '',
    toDate: '',
    page: 1,
    limit: 50,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  // Pagination info
  pagination = signal({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
  });

  // Statistics
  stats = signal({
    totalRows: 0,
    totalQuantity: 0,
    totalCodAmount: 0,
    totalQuotePrice: 0,
    totalMustPay: 0,
    totalPaid: 0,
    totalManualPayment: 0,
    totalNeedToPay: 0,
    avgQuantity: 0
  });

  // Bộ lọc tìm kiếm local
  q = signal('');

  // Computed properties for local filtering on displayed data
  filtered = computed(() => {
    const search = this.q().toLowerCase();
    let data = this.orders();
    if (search) {
      data = data.filter(o =>
        o.customerName.toLowerCase().includes(search) ||
        (o.trackingNumber || '').toLowerCase().includes(search) ||
        (o.receiverPhone || '').toLowerCase().includes(search)
      );
    }
    return data;
  });

  // Template helper methods
  Math = Math;

  constructor(private http: HttpClient) {}

  ngOnInit(): void { 
    this.loadFilterOptions();
    this.loadData();
  }

  async loadFilterOptions(): Promise<void> {
    try {
      const options = await firstValueFrom(
        this.http.get<FilterOptions>('http://localhost:3000/google-sync/summary/filter-options')
      );
      this.filterOptions.set(options);
    } catch (error) {
      console.error('Failed to load filter options:', error);
    }
  }

  async loadData(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const filterParams = this.filter();
      const queryParams = new URLSearchParams();

      // Add filter parameters
      Object.entries(filterParams).forEach(([key, value]) => {
        if (value && value !== '') {
          queryParams.append(key, value.toString());
        }
      });

      const response = await firstValueFrom(
        this.http.get<any>(`http://localhost:3000/google-sync/summary/filter?${queryParams}`)
      );

      // Transform data for compatibility with existing UI
      const transformedRows = response.rows.map((row: any) => ({
        ...row,
        _id: row.orderId || row._id,
        summaryId: row._id,
        agentId: row.agentId || { fullName: 'Unknown Agent' },
        productId: row.productId || { name: row.product },
        // Ensure all required fields exist
        createdAt: row.createdAt || row.orderDate,
        adGroupId: row.adGroupId || '',
        isActive: row.isActive !== undefined ? row.isActive : true,
        serviceDetails: row.serviceDetails || '',
        submitLink: row.submitLink || '',
        depositAmount: row.depositAmount || 0,
        receiverName: row.receiverName || '',
        receiverAddress: row.receiverAddress || '',
        receiverPhone: row.receiverPhone || ''
      }));

      this.orders.set(transformedRows);
      this.pagination.set(response.pagination);
      this.stats.set(response.stats);

    } catch (error) {
      console.error('Failed to load data:', error);
      this.error.set('Không thể tải dữ liệu Summary1');
    } finally {
      this.isLoading.set(false);
    }
  }

  // Legacy refresh method for backward compatibility
  refresh(): void {
    this.loadData();
  }

  // Filter methods
  onFilterChange(): void {
    this.filter.update(f => ({ ...f, page: 1 })); // Reset to first page
    this.loadData();
  }

  resetFilters(): void {
    this.filter.set({
      agentId: '',
      productId: '',
      productionStatus: '',
      orderStatus: '',
      fromDate: '',
      toDate: '',
      page: 1,
      limit: 50,
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
    this.loadData();
  }

  // Pagination methods
  goToPage(page: number): void {
    this.filter.update(f => ({ ...f, page }));
    this.loadData();
  }

  changePageSize(limit: number): void {
    this.filter.update(f => ({ ...f, limit, page: 1 }));
    this.loadData();
  }

  // Sorting methods
  sortBy(field: string): void {
    this.filter.update(f => ({
      ...f,
      sortBy: field,
      sortOrder: f.sortBy === field && f.sortOrder === 'asc' ? 'desc' : 'asc',
      page: 1
    }));
    this.loadData();
  }

  onBlurManual(row: Summary1Row, ev: Event) {
    const target = ev.target as HTMLInputElement;
    let val = parseFloat(target.value);
    if (isNaN(val) || val < 0) val = 0;
    
    // Gọi API Summary1 để cập nhật manualPayment và tính lại needToPay
    this.http.post(`http://localhost:3000/google-sync/summary/${row.summaryId}/manual-payment`, 
      { manualPayment: val }
    ).subscribe({
      next: (updated: any) => {
        // Cập nhật local data với kết quả từ server
        this.orders.update(rows => rows.map(r => {
          if (r.summaryId !== row.summaryId) return r;
          return { 
            ...r, 
            manualPayment: updated.manualPayment,
            needToPay: updated.needToPay
          } as any;
        }));
        // Reload stats after manual payment update
        this.loadData();
      },
      error: (e) => console.error('Failed to update manual payment:', e)
    });
  }

  // Template Export/Import Methods
  exportTemplate() {
    const currentFilter = this.filter();
    let url = 'http://localhost:3000/google-sync/summary/export-template?format=csv';
    
    // Thêm tất cả filter params vào URL
    this.addFilterParamsToUrl(url, currentFilter).then(fullUrl => {
      this.http.get(fullUrl, { responseType: 'blob', observe: 'response' })
        .subscribe({
          next: (response) => {
            const blob = response.body;
            if (!blob) return;
            
            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = 'summary1_template.csv';
            if (contentDisposition) {
              const matches = /filename="?([^"]*)"?/.exec(contentDisposition);
              if (matches && matches[1]) filename = matches[1];
            }
            
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
          },
          error: (e) => {
            console.error('Export template failed:', e);
            alert('Lỗi tải template: ' + (e.error?.message || e.message));
          }
        });
    });
  }

  exportUnpaid() {
    const currentFilter = this.filter();
    let url = 'http://localhost:3000/google-sync/summary/export-unpaid?format=csv';
    
    // Thêm tất cả filter params vào URL
    this.addFilterParamsToUrl(url, currentFilter).then(fullUrl => {
      this.http.get(fullUrl, { responseType: 'blob', observe: 'response' })
        .subscribe({
          next: (response) => {
            const blob = response.body;
            if (!blob) return;
            
            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = 'summary1_chua_thanh_toan.csv';
            if (contentDisposition) {
              const matches = /filename="?([^"]*)"?/.exec(contentDisposition);
              if (matches && matches[1]) filename = matches[1];
            }
            
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
          },
          error: (e) => {
            console.error('Export unpaid failed:', e);
            alert('Lỗi tải danh sách chưa thanh toán: ' + (e.error?.message || e.message));
          }
        });
    });
  }

  private async addFilterParamsToUrl(baseUrl: string, filter: any): Promise<string> {
    const params = new URLSearchParams();
    
    if (filter.agentId) params.append('agentId', filter.agentId);
    if (filter.productId) params.append('productId', filter.productId);
    if (filter.productionStatus) params.append('productionStatus', filter.productionStatus);
    if (filter.orderStatus) params.append('orderStatus', filter.orderStatus);
    if (filter.fromDate) params.append('fromDate', filter.fromDate);
    if (filter.toDate) params.append('toDate', filter.toDate);
    if (filter.sortBy) params.append('sortBy', filter.sortBy);
    if (filter.sortOrder) params.append('sortOrder', filter.sortOrder);
    
    // Thêm search query nếu có
    const searchQ = this.q().trim();
    if (searchQ) params.append('q', searchQ);
    
    const queryString = params.toString();
    return queryString ? `${baseUrl}&${queryString}` : baseUrl;
  }

  onTemplateFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      this.parseAndImportTemplate(content, file.name);
    };
    reader.readAsText(file, 'utf-8');
    
    // Reset input
    input.value = '';
  }

  private parseAndImportTemplate(content: string, filename: string) {
    try {
      // Parse CSV content
      const lines = content.split('\n').filter(line => line.trim());
      if (lines.length < 2) {
        alert('File template không hợp lệ (ít nhất 2 dòng)');
        return;
      }
      
      // Skip header line, parse data lines
      const data = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Simple CSV parsing - handle quoted fields
        const fields = this.parseCSVLine(line);
        if (fields.length >= 3) {
          const id = fields[0];
          const customerName = fields[1];
          const manualPayment = parseFloat(fields[2]) || 0;
          
          if (id) {
            data.push({ id, customerName, manualPayment });
          }
        }
      }
      
      if (data.length === 0) {
        alert('Không tìm thấy dữ liệu hợp lệ trong file');
        return;
      }
      
      // Confirm import
      if (!confirm(`Sẽ import ${data.length} dòng dữ liệu. Tiếp tục?`)) return;
      
      // Send import request
      this.http.post('http://localhost:3000/google-sync/summary/import-template', { data })
        .subscribe({
          next: (result: any) => {
            alert(`Import hoàn thành:\n- Thành công: ${result.success}\n- Thất bại: ${result.failed}\n${result.errors.length > 0 ? '- Lỗi: ' + result.errors.slice(0, 3).join(', ') : ''}`);
            this.refresh(); // Reload data
          },
          error: (e) => {
            console.error('Import template failed:', e);
            alert('Lỗi import: ' + (e.error?.message || e.message));
          }
        });
      
    } catch (error) {
      console.error('Parse template failed:', error);
      alert('Lỗi đọc file template');
    }
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Escaped quote
          current += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // Field separator
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    // Add last field
    result.push(current.trim());
    return result;
  }

  // Helpers hiển thị tên sản phẩm và đại lý
  displayProduct(r: Summary1Row): string {
    const p: any = (r as any).productId;
    return typeof p === 'string' ? p : (p?.name || p?._id || '(không có)');
  }

  displayAgent(r: Summary1Row): string {
    const a: any = (r as any).agentId;
    return typeof a === 'string' ? a : (a?.fullName || a?.name || a?._id || '(không có)');
  }

  // Utility methods
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  }

  formatDate(date: string | Date): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('vi-VN');
  }

  // Filter update methods
  updateAgentFilter(value: string): void {
    this.filter.update(f => ({...f, agentId: value}));
    this.onFilterChange();
  }

  updateProductFilter(value: string): void {
    this.filter.update(f => ({...f, productId: value}));
    this.onFilterChange();
  }

  updateProductionStatusFilter(value: string): void {
    this.filter.update(f => ({...f, productionStatus: value}));
    this.onFilterChange();
  }

  updateOrderStatusFilter(value: string): void {
    this.filter.update(f => ({...f, orderStatus: value}));
    this.onFilterChange();
  }

  updateFromDateFilter(value: string): void {
    this.filter.update(f => ({...f, fromDate: value}));
    this.onFilterChange();
  }

  updateToDateFilter(value: string): void {
    this.filter.update(f => ({...f, toDate: value}));
    this.onFilterChange();
  }

  updateSortByFilter(value: string): void {
    this.filter.update(f => ({...f, sortBy: value}));
    this.onFilterChange();
  }

  updateSortOrderFilter(value: string): void {
    this.filter.update(f => ({...f, sortOrder: value as 'asc' | 'desc'}));
    this.onFilterChange();
  }

  // Computed properties for statistics
  totalMustPay = computed(() => 
    this.stats().totalRows ? this.stats().totalMustPay : 0
  );

  totalPaid = computed(() => 
    this.stats().totalRows ? this.stats().totalPaid : 0
  );

  totalNeedToPay = computed(() => 
    this.stats().totalRows ? this.stats().totalNeedToPay : 0
  );
}
