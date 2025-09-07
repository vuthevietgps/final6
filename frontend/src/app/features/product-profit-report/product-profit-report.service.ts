/**
 * File: product-profit-report/product-profit-report.service.ts
 * Mục đích: Service gọi API báo cáo lợi nhuận sản phẩm theo ngày
 */
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ProductProfitFilter, ProductProfitReport } from './models/product-profit.interface';

@Injectable({
  providedIn: 'root'
})
export class ProductProfitReportService {
  private readonly baseUrl = 'http://localhost:3000/product-profit-report';

  constructor(private http: HttpClient) {}

  /**
   * Lấy báo cáo lợi nhuận sản phẩm theo ngày
   */
  getProductProfitReport(filter: ProductProfitFilter): Observable<ProductProfitReport> {
    let params = new HttpParams();
    
    if (filter.year) {
      params = params.set('year', filter.year.toString());
    }
    if (filter.period) {
      params = params.set('period', filter.period);
    }
    if (filter.fromDate) {
      params = params.set('fromDate', filter.fromDate);
    }
    if (filter.toDate) {
      params = params.set('toDate', filter.toDate);
    }
    if (filter.productId) {
      params = params.set('productId', filter.productId);
    }

    return this.http.get<ProductProfitReport>(this.baseUrl, { params });
  }

  /**
   * Lấy danh sách năm có dữ liệu
   */
  getAvailableYears(): Observable<{ years: number[] }> {
    return this.http.get<{ years: number[] }>(`${this.baseUrl}/years`);
  }

  /**
   * Lấy thống kê tổng quan
   */
  getSummary(filter: ProductProfitFilter): Observable<any> {
    let params = new HttpParams();
    
    if (filter.year) {
      params = params.set('year', filter.year.toString());
    }
    if (filter.period) {
      params = params.set('period', filter.period);
    }
    if (filter.fromDate) {
      params = params.set('fromDate', filter.fromDate);
    }
    if (filter.toDate) {
      params = params.set('toDate', filter.toDate);
    }

    return this.http.get(`${this.baseUrl}/summary`, { params });
  }
}
