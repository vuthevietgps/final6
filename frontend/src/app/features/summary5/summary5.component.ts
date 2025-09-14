import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { Summary5Service } from './summary5.service';
import { Summary5, Summary5Filter, Summary5Stats } from './models/summary5.interface';

@Component({
  selector: 'app-summary5',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './summary5.component.html',
  styleUrls: ['./summary5.component.css']
})
export class Summary5Component implements OnInit {
  data = signal<Summary5[]>([]);
  stats = signal<Summary5Stats | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);
  lastSynced = signal<number | null>(null);

  filter = signal<Summary5Filter>({ page: 1, limit: 50, sortBy: 'orderDate', sortOrder: 'desc' });
  totalRecords = signal(0);
  currentPage = signal(1);
  totalPages = signal(0);
  searchTerm = signal('');
  showFilters = signal(false);

  filteredData = computed(() => {
    const t = this.searchTerm().toLowerCase();
    if (!t) return this.data();
    return this.data().filter(x =>
      x.customerName?.toLowerCase().includes(t) ||
      x.agentName?.toLowerCase().includes(t) ||
      x.product?.toLowerCase().includes(t)
    );
  });

  constructor(private svc: Summary5Service) {}

  ngOnInit() { this.load(); this.loadStats(); }

  load() {
    this.loading.set(true);
    this.svc.findAll(this.filter()).subscribe({
      next: (res) => { this.data.set(res.data); this.totalRecords.set(res.total); this.currentPage.set(res.page); this.totalPages.set(res.totalPages); this.loading.set(false); },
      error: (e) => { this.error.set(e.message || 'Lỗi tải dữ liệu'); this.loading.set(false); }
    });
  }

  loadStats() {
    const { startDate, endDate } = this.filter();
    // Stats support optional date-range; align with current filters if set
    this.svc.getStats(startDate, endDate).subscribe({
      next: s => this.stats.set(s),
      error: e => this.error.set(e.message || 'Lỗi tải thống kê')
    });
  }
  sync() {
    this.loading.set(true);
    const { startDate, endDate } = this.filter();
    this.svc.sync(startDate, endDate).subscribe({
      next: (res) => { this.lastSynced.set(res?.synced ?? 0); this.refresh(); this.loading.set(false); },
      error: (e) => { this.error.set(e.message || 'Lỗi đồng bộ'); this.loading.set(false); }
    });
  }
  updateFilter<K extends keyof Summary5Filter>(k: K, v: Summary5Filter[K]) { this.filter.update(f => ({ ...f, [k]: v })); this.onFilterChange(); }
  onFilterChange() { this.filter.update(f => ({ ...f, page: 1 })); this.load(); }
  refresh() { this.load(); this.loadStats(); }
  syncLast7Days() {
    // Compute last 7 days (inclusive today)
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 6);
    const toISODate = (d: Date) => d.toISOString().slice(0, 10);
    // Update filters to last 7 days
    this.filter.update(f => ({ ...f, startDate: toISODate(start), endDate: toISODate(end) }));
    // Trigger sync for this range
    this.sync();
  }
  goToPage(p: number) { if (p < 1) return; this.filter.update(f => ({ ...f, page: p })); this.load(); }
  changePageSize(limit: number) { const n = Number(limit)||50; this.filter.update(f => ({ ...f, limit: n, page: 1 })); this.load(); }
  displayFrom(): number { const total = this.totalRecords(); if (!total) return 0; const limit = this.filter().limit || 50; return (this.currentPage()-1)*limit + 1; }
  displayTo(): number { const total = this.totalRecords(); if (!total) return 0; const limit = this.filter().limit || 50; const to = this.currentPage()*limit; return to>total?total:to; }
  formatCurrency(n: number) { return (n||0).toLocaleString('vi-VN') + ' ₫'; }
  formatDate(s: string) { return new Date(s).toLocaleDateString('vi-VN'); }
}
