/**
 * File: features/summary2/summary2.component.ts
 * Mục đích: Tổng hợp 2 - hiển thị dữ liệu từ Summary1 kèm các cột chi phí và lợi nhuận.
 */
import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Summary2Row, Summary2Service } from './summary2.service';

@Component({
  selector: 'app-summary2',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './summary2.component.html',
  styleUrls: ['./summary2.component.css']
})
export class Summary2Component implements OnInit {
  rows = signal<Summary2Row[]>([]);
  isLoading = signal(false);
  error = signal<string | null>(null);

  q = signal('');
  from = signal('');
  to = signal('');

  filtered = computed(() => {
    const search = this.q().toLowerCase();
    let data = this.rows();
    if (search) {
      data = data.filter(r =>
        (r.customerName || '').toLowerCase().includes(search) ||
        (r.product || '').toLowerCase().includes(search) ||
        (r.trackingNumber || '').toLowerCase().includes(search)
      );
    }
    return data;
  });

  totalRevenue = computed(() => this.filtered().reduce((s, r) => s + (r.revenue || 0), 0));
  totalProfit = computed(() => this.filtered().reduce((s, r) => s + (r.profit || 0), 0));

  constructor(private svc: Summary2Service) {}

  ngOnInit(): void { this.refresh(); }

  refresh(): void {
    this.isLoading.set(true);
    this.error.set(null);
    this.svc.getAll({ from: this.from() || undefined, to: this.to() || undefined }).subscribe({
      next: res => { this.rows.set(res.rows || []); this.isLoading.set(false); },
      error: e => { console.error(e); this.error.set('Không thể tải dữ liệu'); this.isLoading.set(false); }
    });
  }

  fmt(n?: number) { return (n ?? 0).toLocaleString('vi-VN'); }
  fmtDate(d?: string) { if (!d) return ''; const x = new Date(d); return `${x.getDate().toString().padStart(2,'0')}/${(x.getMonth()+1).toString().padStart(2,'0')}/${x.getFullYear()}`; }
}
