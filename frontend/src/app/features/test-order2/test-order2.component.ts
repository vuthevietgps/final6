import { Component, OnInit, AfterViewInit, computed, signal, ElementRef, ViewChild, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TestOrder2Service } from './test-order2.service';
import { CreateTestOrder2, NamedItem, TestOrder2 } from './models';
import { ProductService } from '../product/product.service';
import { UserService } from '../user/user.service';
import { AdGroupService } from '../ad-group/ad-group.service';
import { ProductionStatusService } from '../production-status/production-status.service';
import { DeliveryStatusService } from '../delivery-status/delivery-status.service';

@Component({
  selector: 'app-test-order2',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './test-order2.component.html',
  styleUrls: ['./test-order2.component.css']
})
export class TestOrder2Component implements OnInit, AfterViewInit {
  orders = signal<TestOrder2[]>([]);
  products = signal<NamedItem[]>([]);
  agents = signal<NamedItem[]>([]);
  adGroups = signal<NamedItem[]>([]);
  productionStatuses = signal<string[]>([]);
  orderStatuses = signal<string[]>([]);
  // name -> color maps
  productionStatusColors = signal<Record<string, string>>({});
  deliveryStatusColors = signal<Record<string, string>>({});

  isLoading = signal(false);
  error = signal<string | null>(null);

  // Upload functionality
  isUploadModalOpen = signal(false);
  uploadFile = signal<File | null>(null);
  isUploading = signal(false);
  uploadResults = signal<{
    success: number;
    errors: Array<{ row: number; error: string; data?: any }>;
    message: string;
  } | null>(null);

  // Refs for measuring sticky offsets
  @ViewChild('dateHeader', { static: false }) dateHeader?: ElementRef<HTMLElement>;
  @ViewChild('tableEl', { static: false }) tableEl?: ElementRef<HTMLElement>;

  // Filters
  q = signal('');
  selectedProduct = signal('all');
  selectedAgent = signal('all');
  selectedAdGroup = signal('all');
  selectedActive = signal('all');
  from = signal('');
  to = signal('');
  selectedProductionStatus = signal('all');
  selectedOrderStatus = signal('all');

  // Quick stats for header badges
  stats = computed(() => {
    const all = this.orders();
    const filtered = this.filtered();
    const active = filtered.filter(o => !!o.isActive).length;
    return { total: all.length, filtered: filtered.length, active };
  });

  filtered = computed(() => {
    let data = this.orders();
    const search = this.q().toLowerCase();
    if (search) {
      data = data.filter(o =>
        o.customerName.toLowerCase().includes(search) ||
        (o.trackingNumber || '').toLowerCase().includes(search) ||
        (o.receiverPhone || '').toLowerCase().includes(search)
      );
    }
    // Filter by selected production status
    const prodSel = this.selectedProductionStatus();
    if (prodSel !== 'all') {
      data = data.filter(o => (o.productionStatus || '') === prodSel);
    }
    // Filter by selected order status (treat empty as default label)
    const ordSel = this.selectedOrderStatus();
    if (ordSel !== 'all') {
      data = data.filter(o => (o.orderStatus || 'Chưa có mã vận đơn') === ordSel);
    }
    return data;
  });

  constructor(
    private service: TestOrder2Service,
    private productService: ProductService,
    private userService: UserService,
    private adGroupService: AdGroupService,
    private productionStatusService: ProductionStatusService,
  private deliveryStatusService: DeliveryStatusService,
  ) {}

  ngOnInit(): void {
    this.loadAll();
  }

  ngAfterViewInit(): void {
    // Adjust sticky offsets after initial view render
    setTimeout(() => this.updateStickyOffsets(), 0);
  }

  @HostListener('window:resize')
  onResize() { this.updateStickyOffsets(); }

  private updateStickyOffsets(): void {
    const th = this.dateHeader?.nativeElement;
    const table = this.tableEl?.nativeElement;
    if (th && table) {
      const width = th.offsetWidth; // includes borders with box-sizing
      table.style.setProperty('--date-col-width', `${width}px`);
    }
  }

  loadAll(): void {
    this.isLoading.set(true);
    this.error.set(null);
    this.loadDropdowns();
    this.refresh();
  }

  refresh(): void {
    this.service.getAll({
      q: this.q() || undefined,
      productId: this.selectedProduct() !== 'all' ? this.selectedProduct() : undefined,
      agentId: this.selectedAgent() !== 'all' ? this.selectedAgent() : undefined,
      adGroupId: this.selectedAdGroup() !== 'all' ? this.selectedAdGroup() : undefined,
      isActive: this.selectedActive() !== 'all' ? this.selectedActive() : undefined,
      from: this.from() || undefined,
  to: this.to() || undefined,
  productionStatus: this.selectedProductionStatus() !== 'all' ? this.selectedProductionStatus() : undefined,
  orderStatus: this.selectedOrderStatus() !== 'all' ? this.selectedOrderStatus() : undefined,
    }).subscribe({
      next: (rows) => {
        // Ensure defaults for missing statuses
        const normalized = (rows || []).map((r: any) => ({
          ...r,
          productionStatus: r.productionStatus || 'Chưa làm',
          orderStatus: r.orderStatus || 'Chưa có mã vận đơn',
        }));
        this.orders.set(normalized);
        this.isLoading.set(false);
        // After data renders, recalc sticky offsets
        setTimeout(() => this.updateStickyOffsets(), 0);
      },
      error: (err) => { this.error.set('Không thể tải dữ liệu'); this.isLoading.set(false); console.error(err); }
    });
  }

  loadDropdowns(): void {
    this.productService.getAll().subscribe({
      next: (items) => this.products.set(items.map((i: any) => ({ _id: i._id, name: i.name }))),
      error: (e) => console.error(e)
    });
    this.userService.getAgents().subscribe({
      next: (items: any) => this.agents.set(items.map((u: any) => ({ _id: u._id, name: u.fullName || u.email }))),
      error: (e: any) => console.error(e)
    });
    this.adGroupService.getAll().subscribe({
      next: (items) => this.adGroups.set([
        { _id: '0', name: '0' },
        ...items.map((g: any) => ({ _id: g.adGroupId, name: g.adGroupId }))
      ]),
      error: (e) => console.error(e)
    });
    this.productionStatusService.getProductionStatuses(true).subscribe({
      next: (items: any[]) => {
        const names: string[] = items.map((s: any) => s.name);
        if (!names.includes('Chưa làm')) names.unshift('Chưa làm');
        this.productionStatuses.set(names);
        const map: Record<string, string> = {};
        for (const s of items) {
          if (s?.name && s?.color) map[s.name] = s.color;
        }
        this.productionStatusColors.set(map);
      },
      error: (e: any) => console.error(e)
    });
    this.deliveryStatusService.getAll().subscribe({
      next: (items: any[]) => {
        const names: string[] = items.map((s: any) => s.name);
        if (!names.includes('Chưa có mã vận đơn')) names.unshift('Chưa có mã vận đơn');
        this.orderStatuses.set(names);
        const map: Record<string, string> = {};
        for (const s of items) {
          if (s?.name && s?.color) map[s.name] = s.color;
        }
        this.deliveryStatusColors.set(map);
      },
      error: (e: any) => console.error(e)
    });
  }

  addNew(): void {
    const data: CreateTestOrder2 = {
      productId: typeof this.products()[0]?._id === 'string' ? this.products()[0]._id : '',
      customerName: 'Khách hàng mới',
      quantity: 1,
      agentId: typeof this.agents()[0]?._id === 'string' ? this.agents()[0]._id : '',
      adGroupId: '0',
      isActive: true,
      serviceDetails: '',
      productionStatus: 'Chưa làm',
      orderStatus: 'Chưa có mã vận đơn',
      submitLink: '',
      trackingNumber: '',
      depositAmount: 0,
      codAmount: 0,
      receiverName: '',
      receiverPhone: '',
      receiverAddress: ''
    };
    this.service.create(data).subscribe({
      next: (created) => this.orders.update(list => [created, ...list]),
      error: (e) => { this.error.set('Không thể tạo đơn'); console.error(e); }
    });
  }

  onBlurUpdate(order: TestOrder2, field: keyof TestOrder2, value: any): void {
    const id = order._id;
    const payload: any = { [field]: value };
    this.service.update(id, payload).subscribe({
      next: (updated) => {
        this.orders.update(rows => rows.map(r => r._id === id ? updated : r));
      },
      error: (e) => { console.error(e); }
    });
  }

  onSelectUpdate(order: TestOrder2, field: keyof TestOrder2, event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.onBlurUpdate(order, field, target.value);
  }

  onInputUpdate(order: TestOrder2, field: keyof TestOrder2, event: Event): void {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    let value: any = target.value;
    if (['quantity', 'depositAmount', 'codAmount'].includes(field as string)) {
      value = parseFloat(value) || 0;
    }
    if (field === 'isActive') {
      value = target instanceof HTMLInputElement ? target.checked : !!value;
    }
    this.onBlurUpdate(order, field, value);
  }

  delete(order: TestOrder2): void {
    if (!confirm('Xóa đơn này?')) return;
    this.service.delete(order._id).subscribe({
      next: () => this.orders.update(rows => rows.filter(r => r._id !== order._id)),
      error: (e) => console.error(e)
    });
  }

  // TrackBy to render long lists smoother
  trackById(index: number, o: TestOrder2): string { return o._id; }

  // Reset all filters to default
  resetFilters(): void {
    this.q.set('');
    this.selectedProduct.set('all');
    this.selectedAgent.set('all');
    this.selectedAdGroup.set('all');
    this.selectedActive.set('all');
    this.from.set('');
    this.to.set('');
    this.selectedProductionStatus.set('all');
    this.selectedOrderStatus.set('all');
    this.refresh();
  }

  // Helper to extract id from string or populated object
  getId(val: any): string {
    if (!val) return '';
    if (typeof val === 'string') return val;
    return val._id || '';
  }

  // Format date dd/MM/yyyy
  formatDate(value?: string): string {
    if (!value) return '';
    const d = new Date(value);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  downloadCSV(): void {
    const data = this.filtered(); // Sử dụng dữ liệu đã được lọc
    
    if (data.length === 0) {
      alert('Không có dữ liệu để tải xuống');
      return;
    }

    // Định nghĩa headers CSV
    const headers = [
      'Ngày',
      'Khách hàng', 
      'Sản phẩm',
      'Số lượng',
      'Đại lý',
      'ID Nhóm QC',
      'Kích hoạt',
      'Chi tiết dịch vụ',
      'Trạng thái sản xuất',
      'Trạng thái vận đơn',
      'Link nộp',
      'Mã vận đơn',
      'Đặt cọc',
      'COD',
      'Người nhận',
      'SĐT nhận',
      'Địa chỉ nhận'
    ];

    // Chuyển đổi data thành CSV
    const csvRows = [
      headers.join(','), // Header row
      ...data.map(order => [
        `"${this.formatDate(order.createdAt)}"`,
        `"${order.customerName || ''}"`,
        `"${this.getNameById(order.productId, this.products())}"`,
        order.quantity || 0,
        `"${this.getNameById(order.agentId, this.agents())}"`,
        `"${order.adGroupId || ''}"`,
        order.isActive ? 'Có' : 'Không',
        `"${order.serviceDetails || ''}"`,
        `"${order.productionStatus || ''}"`,
        `"${order.orderStatus || ''}"`,
        `"${order.submitLink || ''}"`,
        `"${order.trackingNumber || ''}"`,
        order.depositAmount || 0,
        order.codAmount || 0,
        `"${order.receiverName || ''}"`,
        `"${order.receiverPhone || ''}"`,
        `"${order.receiverAddress || ''}"`
      ].join(','))
    ];

    // Tạo file và tải xuống
    const csvContent = csvRows.join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `don-hang-thu-nghiem-2-${new Date().toISOString().split('T')[0]}.csv`;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  // Helper method để lấy tên từ ID
  private getNameById(id: any, items: NamedItem[]): string {
    const itemId = this.getId(id);
    const item = items.find(i => i._id === itemId);
    return item?.name || itemId || '';
  }

  // ===== Status color helpers =====
  private normalizeHex(hex?: string): string | undefined {
    if (!hex) return undefined;
    let h = hex.trim();
    if (!h.startsWith('#')) h = '#' + h;
    if (h.length === 4) {
      // e.g. #abc -> #aabbcc
      h = '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
    }
    return h;
  }

  private getContrastTextColor(hex?: string): string {
    const h = this.normalizeHex(hex);
    if (!h || h.length !== 7) return '#111827'; // default slate-900
    const r = parseInt(h.substr(1, 2), 16);
    const g = parseInt(h.substr(3, 2), 16);
    const b = parseInt(h.substr(5, 2), 16);
    // YIQ contrast
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 200 ? '#111827' : '#ffffff';
  }

  getProductionColor(name?: string): string | undefined {
    if (!name) return undefined;
    return this.productionStatusColors()[name];
  }

  getDeliveryColor(name?: string): string | undefined {
    if (!name) return undefined;
    return this.deliveryStatusColors()[name];
  }

  statusCellStyle(kind: 'prod' | 'del', name?: string): Record<string, string> {
    const color = kind === 'prod' ? this.getProductionColor(name) : this.getDeliveryColor(name);
    const bg = this.normalizeHex(color);
    if (!bg) return {};
    const fg = this.getContrastTextColor(bg);
    return { 'background-color': bg, color: fg };
  }

  statusSelectStyle(kind: 'prod' | 'del', name?: string): Record<string, string> {
    const color = kind === 'prod' ? this.getProductionColor(name) : this.getDeliveryColor(name);
    const bg = this.normalizeHex(color);
    if (!bg) return {};
    const fg = this.getContrastTextColor(bg);
    return { 'background-color': bg, color: fg, 'border-color': bg };
  }

  // Upload file methods
  openUploadModal(): void {
    this.isUploadModalOpen.set(true);
    this.uploadFile.set(null);
    this.uploadResults.set(null);
  }

  closeUploadModal(): void {
    this.isUploadModalOpen.set(false);
    this.uploadFile.set(null);
    this.uploadResults.set(null);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      
      // Validate file type
      const allowedTypes = [
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        this.error.set('Chỉ hỗ trợ file CSV và Excel (.xls, .xlsx)');
        return;
      }

      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        this.error.set('File không được vượt quá 10MB');
        return;
      }

      this.uploadFile.set(file);
      this.error.set(null);
    }
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      
      // Create a mock event for reuse of validation logic
      const mockEvent = {
        target: { files: [file] }
      } as unknown as Event;
      
      this.onFileSelected(mockEvent);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  uploadImportFile(): void {
    const file = this.uploadFile();
    if (!file) {
      this.error.set('Vui lòng chọn file để tải lên');
      return;
    }

    this.isUploading.set(true);
    this.error.set(null);

    this.service.importFromFile(file).subscribe({
      next: (result) => {
        this.uploadResults.set(result);
        this.isUploading.set(false);
        
        // Refresh data if there were successful imports
        if (result.success > 0) {
          this.refresh();
        }
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Lỗi khi tải lên file');
        this.isUploading.set(false);
      }
    });
  }

  downloadTemplate(): void {
    this.service.getTemplate().subscribe({
      next: (template) => {
        // Create CSV content
        const headers = template.headers.join(',');
        const sampleRow = template.sampleData[0];
        const values = template.headers.map(header => {
          const value = sampleRow[header];
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value}"`;
          }
          return value;
        }).join(',');
        
        const csvContent = headers + '\n' + values;
        
        // Download CSV file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'test-order2-template.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Lỗi khi tải template');
      }
    });
  }

  getStatusOptionStyle(kind: 'prod' | 'del', name?: string): Record<string, string> {
    const color = kind === 'prod' ? this.getProductionColor(name) : this.getDeliveryColor(name);
    const bg = this.normalizeHex(color);
    if (!bg) return {};
    const fg = this.getContrastTextColor(bg);
    return { 'background-color': bg, color: fg };
  }
}
