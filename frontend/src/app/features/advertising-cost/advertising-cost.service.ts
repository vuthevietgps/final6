import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AdvertisingCost, AdvertisingCostSummary, CreateAdvertisingCost, UpdateAdvertisingCost } from './models/advertising-cost.model';

@Injectable({ providedIn: 'root' })
export class AdvertisingCostService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:3000/advertising-cost';

  getAll(): Observable<AdvertisingCost[]> {
    return this.http.get<AdvertisingCost[]>(this.baseUrl);
  }

  getSummary(): Observable<AdvertisingCostSummary> {
    return this.http.get<AdvertisingCostSummary>(this.baseUrl + '/stats/summary');
  }

  create(data: CreateAdvertisingCost): Observable<AdvertisingCost> {
    return this.http.post<AdvertisingCost>(this.baseUrl, data);
  }

  update(id: string, data: UpdateAdvertisingCost): Observable<AdvertisingCost> {
    return this.http.patch<AdvertisingCost>(`${this.baseUrl}/${id}`, data);
  }

  delete(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/${id}`);
  }
}
