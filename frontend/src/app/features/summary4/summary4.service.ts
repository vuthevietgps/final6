import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Summary4, Summary4Filter, Summary4Response, Summary4Stats, UpdateManualPayment } from './models/summary4.interface';

@Injectable({
  providedIn: 'root'
})
export class Summary4Service {
  private apiUrl = `${environment.apiUrl}/summary4`;

  constructor(private http: HttpClient) {}

  findAll(filter: Summary4Filter = {}): Observable<Summary4Response> {
    let params = new HttpParams();
    
    if (filter.agentId) params = params.set('agentId', filter.agentId);
    if (filter.productId) params = params.set('productId', filter.productId);
    if (filter.productionStatus) params = params.set('productionStatus', filter.productionStatus);
    if (filter.orderStatus) params = params.set('orderStatus', filter.orderStatus);
    if (filter.startDate) params = params.set('startDate', filter.startDate);
    if (filter.endDate) params = params.set('endDate', filter.endDate);
    if (filter.page) params = params.set('page', filter.page.toString());
    if (filter.limit) params = params.set('limit', filter.limit.toString());
    if (filter.sortBy) params = params.set('sortBy', filter.sortBy);
    if (filter.sortOrder) params = params.set('sortOrder', filter.sortOrder);

    return this.http.get<Summary4Response>(this.apiUrl, { params });
  }

  findOne(id: string): Observable<Summary4> {
    return this.http.get<Summary4>(`${this.apiUrl}/${id}`);
  }

  updateManualPayment(id: string, data: UpdateManualPayment): Observable<Summary4> {
    return this.http.patch<Summary4>(`${this.apiUrl}/${id}/manual-payment`, data);
  }

  getStats(): Observable<Summary4Stats> {
    return this.http.get<Summary4Stats>(`${this.apiUrl}/stats`);
  }

  syncFromTestOrder2(): Observable<{processed: number; updated: number; errors: string[]}> {
    return this.http.post<{processed: number; updated: number; errors: string[]}>(`${this.apiUrl}/sync`, {});
  }
}