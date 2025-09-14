/**
 * Service để gọi APIs quản lý Google Service Account Credentials
 */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { GoogleCredential, CreateGoogleCredentialDto, TestConnectionResponse } from './models/google-credential.model';

@Injectable({
  providedIn: 'root'
})
export class GoogleCredentialService {
  private readonly apiUrl = `${environment.apiUrl}/google-credential`;

  constructor(private http: HttpClient) {}

  /**
   * Lấy danh sách tất cả credentials
   */
  getAllCredentials(): Observable<{
    statusCode: number;
    message: string;
    data: GoogleCredential[];
    total: number;
  }> {
    return this.http.get<{
      statusCode: number;
      message: string;
      data: GoogleCredential[];
      total: number;
    }>(this.apiUrl);
  }

  /**
   * Lấy credential đang active
   */
  getActiveCredential(): Observable<{
    statusCode: number;
    message: string;
    data: GoogleCredential | null;
  }> {
    return this.http.get<{
      statusCode: number;
      message: string;
      data: GoogleCredential | null;
    }>(`${this.apiUrl}/active`);
  }

  /**
   * Lấy credential theo ID
   */
  getCredential(id: string): Observable<{
    statusCode: number;
    message: string;
    data: GoogleCredential;
  }> {
    return this.http.get<{
      statusCode: number;
      message: string;
      data: GoogleCredential;
    }>(`${this.apiUrl}/${id}`);
  }

  /**
   * Tạo credential mới (hoặc ghi đè)
   */
  createCredential(credential: CreateGoogleCredentialDto): Observable<{
    statusCode: number;
    message: string;
    data: GoogleCredential;
  }> {
    return this.http.post<{
      statusCode: number;
      message: string;
      data: GoogleCredential;
    }>(this.apiUrl, credential);
  }

  /**
   * Cập nhật credential
   */
  updateCredential(id: string, credential: Partial<CreateGoogleCredentialDto>): Observable<{
    statusCode: number;
    message: string;
    data: GoogleCredential;
  }> {
    return this.http.patch<{
      statusCode: number;
      message: string;
      data: GoogleCredential;
    }>(`${this.apiUrl}/${id}`, credential);
  }

  /**
   * Xóa credential
   */
  deleteCredential(id: string): Observable<{
    statusCode: number;
    message: string;
  }> {
    return this.http.delete<{
      statusCode: number;
      message: string;
    }>(`${this.apiUrl}/${id}`);
  }

  /**
   * Test connection với credential
   */
  testConnection(id: string): Observable<{
    statusCode: number;
    message: string;
    data: TestConnectionResponse;
  }> {
    return this.http.post<{
      statusCode: number;
      message: string;
      data: TestConnectionResponse;
    }>(`${this.apiUrl}/${id}/test`, {});
  }

  /**
   * Kích hoạt credential
   */
  activateCredential(id: string): Observable<{
    statusCode: number;
    message: string;
    data: GoogleCredential;
  }> {
    return this.http.put<{
      statusCode: number;
      message: string;
      data: GoogleCredential;
    }>(`${this.apiUrl}/${id}/activate`, {});
  }

  /**
   * Lấy credential dưới dạng JSON để sử dụng API
   */
  getCredentialForAPI(id?: string): Observable<{
    statusCode: number;
    message: string;
    data: any;
  }> {
    const url = id ? `${this.apiUrl}/api-format/${id}` : `${this.apiUrl}/api-format`;
    return this.http.get<{
      statusCode: number;
      message: string;
      data: any;
    }>(url);
  }
}