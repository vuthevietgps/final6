/**
 * File: features/test-order/test-order.component.ts
 * UI: Toolbar trên cùng (Thêm mới, Tìm kiếm, Lọc) + bên dưới là danh sách đơn hàng.
 */
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { TestOrderService } from './test-order.service';
import { CreateTestOrder, TestOrder, TestOrderStatus } from './models/test-order.model';

@Component({
  selector: 'app-test-order',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './test-order.component.html',
  styleUrls: ['./test-order.component.css']
})
export class TestOrderComponent implements OnInit {
  private fb = inject(FormBuilder);
  private service = inject(TestOrderService);

  orders = signal<TestOrder[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  // Toolbar state
  search = signal('');
  status = signal<TestOrderStatus | ''>('');
  from = signal('');
  to = signal('');

  // Modal
  showModal = signal(false);
  editingId: string | null = null;

  form = this.fb.group({
    code: ['', Validators.required],
    date: ['', Validators.required],
    customerName: ['', Validators.required],
    phone: [''],
    total: [0, [Validators.required, Validators.min(0)]],
    status: ['new'],
    notes: ['']
  });

  ngOnInit(): void {
    const today = new Date().toISOString().slice(0, 10);
    this.form.patchValue({ date: today });
    this.load();
  }

  load() {
    this.loading.set(true);
    this.service.getAll({ q: this.search() || undefined, status: this.status() || undefined, from: this.from() || undefined, to: this.to() || undefined }).subscribe({
      next: (data) => { this.orders.set(data); this.loading.set(false); },
      error: (e) => { console.error(e); this.error.set('Không tải được dữ liệu'); this.loading.set(false); }
    });
  }

  openCreate() {
    this.editingId = null;
    const today = new Date().toISOString().slice(0, 10);
    this.form.reset({ code: '', date: today, customerName: '', phone: '', total: 0, status: 'new', notes: '' });
    this.showModal.set(true);
  }
  openEdit(o: TestOrder) {
    this.editingId = o._id || null;
    const date = o.date?.slice(0, 10);
    this.form.reset({ code: o.code, date, customerName: o.customerName, phone: o.phone || '', total: o.total, status: o.status, notes: o.notes || '' });
    this.showModal.set(true);
  }
  closeModal() { this.showModal.set(false); }

  save() {
    if (this.form.invalid) return;
    this.loading.set(true);
    const payload = this.form.value as unknown as CreateTestOrder;
    const obs = this.editingId ? this.service.update(this.editingId, payload) : this.service.create(payload);
    obs.subscribe({
      next: () => { this.load(); this.showModal.set(false); },
      error: (e) => { console.error(e); this.error.set('Lỗi khi lưu'); this.loading.set(false); }
    });
  }
  remove(id: string) {
    if (!confirm('Xóa đơn hàng này?')) return;
    this.loading.set(true);
    this.service.delete(id).subscribe({ next: () => this.load(), error: (e) => { console.error(e); this.error.set('Lỗi khi xóa'); this.loading.set(false); } });
  }
}
