import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CreateTestOrder2, TestOrder2, UpdateTestOrder2 } from './models';

@Injectable({ providedIn: 'root' })
export class TestOrder2Service {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:3000/test-order2';

  getAll(params?: { q?: string; productId?: string; agentId?: string; adGroupId?: string; isActive?: string; from?: string; to?: string; productionStatus?: string; orderStatus?: string }): Observable<TestOrder2[]> {
    const url = new URL(this.baseUrl);
    const { q, productId, agentId, adGroupId, isActive, from, to, productionStatus, orderStatus } = params || {};
    if (q) url.searchParams.set('q', q);
    if (productId) url.searchParams.set('productId', productId);
    if (agentId) url.searchParams.set('agentId', agentId);
    if (adGroupId) url.searchParams.set('adGroupId', adGroupId);
    if (isActive !== undefined) url.searchParams.set('isActive', isActive);
    if (from) url.searchParams.set('from', from);
    if (to) url.searchParams.set('to', to);
    if (productionStatus) url.searchParams.set('productionStatus', productionStatus);
    if (orderStatus) url.searchParams.set('orderStatus', orderStatus);
    return this.http.get<TestOrder2[]>(url.toString());
  }

  create(data: CreateTestOrder2): Observable<TestOrder2> { return this.http.post<TestOrder2>(this.baseUrl, data); }
  update(id: string, data: UpdateTestOrder2): Observable<TestOrder2> { return this.http.patch<TestOrder2>(`${this.baseUrl}/${id}`, data); }
  delete(id: string): Observable<{ message: string }> { return this.http.delete<{ message: string }>(`${this.baseUrl}/${id}`); }
}
