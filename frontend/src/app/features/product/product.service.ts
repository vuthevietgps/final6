/**
 * File: features/product/product.service.ts
 * Mục đích: Giao tiếp API Sản phẩm (CRUD, tra cứu danh mục).
 */
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { 
  Product, 
  CreateProductDto, 
  UpdateProductDto,
  ProductStats,
  ProductQuery
} from './models/product.interface';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private apiUrl = 'http://localhost:3000/products';

  constructor(private http: HttpClient) {}

  // Get all products
  getAll(query?: ProductQuery): Observable<Product[]> {
    let params = new HttpParams();
    
    if (query?.categoryId) {
      params = params.set('categoryId', query.categoryId);
    }
    if (query?.status) {
      params = params.set('status', query.status);
    }
    if (query?.search) {
      params = params.set('search', query.search);
    }

    return this.http.get<Product[]>(this.apiUrl, { params });
  }

  // Get product by ID
  getById(id: string): Observable<Product> {
    return this.http.get<Product>(`${this.apiUrl}/${id}`);
  }

  // Create new product
  create(data: CreateProductDto): Observable<Product> {
    return this.http.post<Product>(this.apiUrl, data);
  }

  // Update product
  update(id: string, data: UpdateProductDto): Observable<Product> {
    return this.http.patch<Product>(`${this.apiUrl}/${id}`, data);
  }

  // Delete product
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // Get products by category
  getByCategory(categoryId: string): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.apiUrl}/category/${categoryId}`);
  }

  // Get statistics
  getStats(): Observable<ProductStats> {
    return this.http.get<ProductStats>(`${this.apiUrl}/stats`);
  }

  // Seed sample data
  seedSampleData(): Observable<Product[]> {
    return this.http.post<Product[]>(`${this.apiUrl}/seed`, {});
  }
}
