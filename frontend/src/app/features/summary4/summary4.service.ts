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
    if (filter.page) params = params.set('page', String(filter.page));
    if (filter.limit) params = params.set('limit', String(filter.limit));
    if (filter.sortBy) params = params.set('sortBy', filter.sortBy);
    if (filter.sortOrder) params = params.set('sortOrder', filter.sortOrder);
    return this.http.get<Summary4Response>(this.apiUrl, { params, withCredentials: true });
  }

  findOne(id: string): Observable<Summary4> {
    return this.http.get<Summary4>(`${this.apiUrl}/${id}`, { withCredentials: true });
  }

  updateManualPayment(id: string, data: UpdateManualPayment): Observable<Summary4> {
    return this.http.patch<Summary4>(`${this.apiUrl}/${id}/manual-payment`, data, { withCredentials: true });
  }

  getStats(): Observable<Summary4Stats> {
    return this.http.get<Summary4Stats>(`${this.apiUrl}/stats`, { withCredentials: true });
  }

  syncFromTestOrder2(): Observable<{processed: number; updated: number; errors: string[]}> {
    return this.http.post<{processed: number; updated: number; errors: string[]}>(`${this.apiUrl}/sync`, {}, { withCredentials: true });
  }

  exportUnpaidToExcel(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/export-unpaid`, { 
      responseType: 'blob',
      withCredentials: true
    });
  }

  exportManualPaymentTemplate(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/export-manual-payment-template`, { 
      responseType: 'blob',
      withCredentials: true
    });
  }

  importManualPaymentFromExcel(file: File): Observable<{processed: number; updated: number; errors: string[]}> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<{processed: number; updated: number; errors: string[]}>(`${this.apiUrl}/import-manual-payment`, formData, { 
      withCredentials: true
    });
  }

  // Agents listing removed with filter/search cleanup
}