/**
 * File: features/summary2/summary2.service.ts
 * Mục đích: Gọi API Tổng hợp 2 từ backend.
 */
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG, getApiUrl } from '../../shared/config/api.config';

export interface Summary2Row {
  orderId: string;
  createdAt?: string;
  product?: string;
  customerName?: string;
  quantity: number;
  productionStatus?: string;
  orderStatus?: string;
  trackingNumber?: string;
  codAmount?: number;
  quotePrice?: number;
  mustPay?: number;
  paid?: number;
  needToPay?: number;
  // Bổ sung
  adGroupId?: string;
  adsCost: number;
  laborCost: number;
  otherCost: number;
  capitalCost: number;
  revenue: number;
  profit: number;
}

@Injectable({ providedIn: 'root' })
export class Summary2Service {
  private http = inject(HttpClient);
  private baseUrl = getApiUrl(API_CONFIG.ENDPOINTS.SUMMARY2);

  getAll(params?: { agentId?: string; from?: string; to?: string }): Observable<{ count: number; rows: Summary2Row[] }> {
    const url = new URL(this.baseUrl);
    if (params?.agentId) url.searchParams.set('agentId', params.agentId);
    if (params?.from) url.searchParams.set('from', params.from);
    if (params?.to) url.searchParams.set('to', params.to);
    return this.http.get<{ count: number; rows: Summary2Row[] }>(url.toString());
  }
}
