/**
 * File: features/test-order/test-order.service.ts
 */
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CreateTestOrder, TestOrder, UpdateTestOrder } from './models/test-order.model';

@Injectable({ providedIn: 'root' })
export class TestOrderService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:3000/test-orders';

  getAll(params?: { q?: string; status?: string; from?: string; to?: string }): Observable<TestOrder[]> {
    const url = new URL(this.baseUrl);
    const { q, status, from, to } = params || {};
    if (q) url.searchParams.set('q', q);
    if (status) url.searchParams.set('status', status);
    if (from) url.searchParams.set('from', from);
    if (to) url.searchParams.set('to', to);
    return this.http.get<TestOrder[]>(url.toString());
  }

  create(data: CreateTestOrder): Observable<TestOrder> { return this.http.post<TestOrder>(this.baseUrl, data); }
  update(id: string, data: UpdateTestOrder): Observable<TestOrder> { return this.http.patch<TestOrder>(`${this.baseUrl}/${id}`, data); }
  delete(id: string): Observable<{ message: string }> { return this.http.delete<{ message: string }>(`${this.baseUrl}/${id}`); }
}
