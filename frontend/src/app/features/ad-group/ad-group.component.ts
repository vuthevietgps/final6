/**
 * File: features/ad-group/ad-group.component.ts
 * Mục đích: Giao diện quản lý Nhóm Quảng Cáo - inline editing như Trạng thái giao hàng.
 */
import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdGroupService } from './ad-group.service';
import { AdGroup, CreateAdGroup, AdPlatform } from './models/ad-group.model';
import { ProductService } from '../product/product.service';
import { UserService } from '../user/user.service';
import { AdAccountService } from '../ad-account/ad-account.service';
import { Product } from '../product/models/product.interface';
import { User } from '../user/user.model';
import { AdAccount } from '../ad-account/models/ad-account.model';

@Component({
  selector: 'app-ad-group',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ad-group.component.html',
  styleUrls: ['./ad-group.component.css']
})
export class AdGroupComponent implements OnInit {
  private adGroupService = inject(AdGroupService);
  private productService = inject(ProductService);
  private userService = inject(UserService);
  private adAccountService = inject(AdAccountService);

  adGroups = signal<AdGroup[]>([]);
  products = signal<Product[]>([]);
  users = signal<User[]>([]);
  adAccounts = signal<AdAccount[]>([]);
  isLoading = signal(false);
  error = signal<string | null>(null);

  // Inline editing
  editingStates = signal<{[key: string]: boolean}>({});
  platforms: AdPlatform[] = ['facebook', 'google', 'ticktock'];
  
  // Filter signals
  filterPlatform = signal('all');
  filterProductId = signal('all');
  filterAgentId = signal('all');
  filterStatus = signal('all');
  searchQuery = signal('');

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    this.isLoading.set(true);
    this.error.set(null);
    
    // Load products
    this.productService.getAll().subscribe({
      next: (prods) => this.products.set(prods),
      error: (e) => this.error.set(e.message || 'Lỗi tải sản phẩm')
    });
    
    // Load users (agents)
    this.userService.getUsers('internal_agent').subscribe({
      next: (agentsIn) => {
        this.userService.getUsers('external_agent').subscribe({
          next: (agentsOut) => {
            const map = new Map<string, User>();
            [...agentsIn, ...agentsOut].forEach(u => map.set(u._id!, u));
            this.users.set(Array.from(map.values()));
          },
          error: (e) => this.error.set(e.message || 'Lỗi tải đại lý (external)')
        });
      },
      error: (e) => this.error.set(e.message || 'Lỗi tải đại lý (internal)')
    });
    
    // Load ad accounts
    this.adAccountService.getAdAccounts().subscribe({
      next: (accounts: AdAccount[]) => this.adAccounts.set(accounts),
      error: (e: any) => this.error.set(e.message || 'Lỗi tải tài khoản quảng cáo')
    });
    
    // Load ad groups
    this.load();
  }

  load(): void {
    this.adGroupService.getAll().subscribe({
      next: (list) => {
        this.adGroups.set(list.map(l => this.normalizeAdGroup(l as any)));
        this.isLoading.set(false);
      },
      error: (e) => { this.error.set(e?.message || 'Lỗi tải dữ liệu'); this.isLoading.set(false); }
    });
  }

  refresh(): void { this.load(); }

  addNew(): void {
    const data: CreateAdGroup = {
      name: 'Nhóm quảng cáo mới',
      adGroupId: 'ADG_' + Date.now(),
      productId: this.products()[0]?._id || '',
      agentId: this.users()[0]?._id || '',
      adAccountId: this.adAccounts()[0]?._id || '',
      platform: 'facebook',
      isActive: true,
      notes: ''
    };
    this.adGroupService.create(data).subscribe({
      next: (created) => { 
        this.adGroups.update(list => [created, ...list]); 
        // Set editing state cho row mới
        this.editingStates.update(states => ({...states, [created._id!]: true}));
      },
      error: (e) => { this.error.set('Lỗi khi thêm nhóm: ' + (e?.message || e)); }
    });
  }

  // Inline editing methods
  startEdit(id: string): void {
    this.editingStates.update(states => ({...states, [id]: true}));
  }

  cancelEdit(id: string): void {
    this.editingStates.update(states => {
      const newStates = {...states};
      delete newStates[id];
      return newStates;
    });
    this.load(); // Reload to reset changes
  }

  saveEdit(group: AdGroup): void {
    this.editingStates.update(states => {
      const newStates = {...states};
      delete newStates[group._id!];
      return newStates;
    });
    // updateField sẽ tự động save thay đổi
  }

  isEditing(id: string): boolean {
    return this.editingStates()[id] || false;
  }

  updateField(group: AdGroup, field: keyof AdGroup, value: any): void {
    const patch: Partial<AdGroup> = { [field]: value } as any;
    this.adGroupService.update(group._id!, patch).subscribe({
      next: (updated) => {
        const norm = this.normalizeAdGroup(updated as any);
        this.adGroups.update(list => list.map(i => i._id === norm._id ? norm : i));
      },
      error: (e) => { this.error.set('Lỗi cập nhật: ' + (e?.message || e)); }
    });
  }

  private normalizeAdGroup(raw: any): AdGroup {
    // Accept either string ids or populated objects and normalize to strings + names
    const prod = raw.productId;
    const agent = raw.agentId;
    const acc = raw.adAccountId;
    const productId = typeof prod === 'string' ? prod : prod?._id || '';
    const agentId = typeof agent === 'string' ? agent : agent?._id || '';
    const adAccountId = typeof acc === 'string' ? acc : acc?._id || '';
    const productName = typeof prod === 'object' ? (prod?.name || undefined) : undefined;
    const agentName = typeof agent === 'object' ? (agent?.fullName || agent?.name || undefined) : undefined;
    const adAccountName = typeof acc === 'object' ? (acc?.name || undefined) : undefined;
    const adAccountAccountId = typeof acc === 'object' ? (acc?.accountId || undefined) : undefined;
    return {
      ...raw,
      productId,
      agentId,
      adAccountId,
      productName,
      agentName,
      adAccountName,
      adAccountAccountId,
    } as AdGroup;
  }

  getUserName(idOrObj: any): string {
    // If populated object passed accidentally, use its name
    if (idOrObj && typeof idOrObj === 'object') {
      return idOrObj.fullName || idOrObj.name || '';
    }
    const id = String(idOrObj || '');
    const u = this.users().find(x => x._id === id);
    return u ? (u as any).fullName || (u as any).name || id : id;
  }

  getProductName(idOrObj: any): string {
    if (idOrObj && typeof idOrObj === 'object') {
      return idOrObj.name || '';
    }
    const id = String(idOrObj || '');
    const p = this.products().find(x => x._id === id);
    return p?.name || id;
  }

  getAdAccountName(idOrObj: any): string {
    if (idOrObj && typeof idOrObj === 'object') {
      const nm = idOrObj.name || '';
      const accId = idOrObj.accountId || '';
      return nm && accId ? `${nm} (${accId})` : (nm || accId || '');
    }
    const id = String(idOrObj || '');
    const acc = this.adAccounts().find(x => x._id === id);
    return acc ? `${acc.name} (${acc.accountId})` : id;
  }

  getInitials(name: string): string {
    return name.split(' ').map(w => w.charAt(0)).join('').toUpperCase().slice(0, 2);
  }

  toggleActive(group: AdGroup): void {
    this.updateField(group, 'isActive', !group.isActive);
  }

  // Filter and search methods
  onSearch(): void {
    const filters = {
      q: this.searchQuery(),
      platform: this.filterPlatform() !== 'all' ? this.filterPlatform() : undefined,
      productId: this.filterProductId() !== 'all' ? this.filterProductId() : undefined,
      agentId: this.filterAgentId() !== 'all' ? this.filterAgentId() : undefined,
      status: this.filterStatus() !== 'all' ? this.filterStatus() as 'active' | 'inactive' : undefined
    };
    
    this.adGroupService.search(filters).subscribe({
      next: (list) => this.adGroups.set(list.map(l => this.normalizeAdGroup(l as any))),
      error: (e) => this.error.set(e?.message || 'Lỗi tìm kiếm')
    });
  }

  setSort(field: string): void {
    // Implement sorting if needed
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.filterPlatform.set('all');
    this.filterProductId.set('all');
    this.filterAgentId.set('all');
    this.filterStatus.set('all');
    this.load();
  }

  remove(group: AdGroup): void {
    if (!confirm('Xóa nhóm quảng cáo này?')) return;
    this.adGroupService.delete(group._id!).subscribe({
      next: () => this.adGroups.update(list => list.filter(g => g._id !== group._id)),
      error: (e) => this.error.set('Lỗi xóa: ' + (e?.message || e))
    });
  }

  trackById(index: number, item: AdGroup): string { return item._id!; }
}
