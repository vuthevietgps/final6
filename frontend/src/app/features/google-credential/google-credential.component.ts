/**
 * Component quản lý Google Service Account Credentials
 * Cho phép thêm, sửa, xóa, test connection và kích hoạt credentials
 */

import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { GoogleCredentialService } from './google-credential.service';
import { GoogleCredential, CreateGoogleCredentialDto } from './models/google-credential.model';

@Component({
  selector: 'app-google-credential',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './google-credential.component.html',
  styleUrls: ['./google-credential.component.css']
})
export class GoogleCredentialComponent implements OnInit {
  // Signals để quản lý state reactively
  credentials = signal<GoogleCredential[]>([]);
  activeCredential = signal<GoogleCredential | null>(null);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);

  credentialForm: FormGroup;
  isEditing = signal<boolean>(false);
  editingId = signal<string | null>(null);

  // Flags cho các loading states
  testingIds = signal<Set<string>>(new Set());
  activatingIds = signal<Set<string>>(new Set());
  deletingIds = signal<Set<string>>(new Set());

  constructor(
    private fb: FormBuilder,
    private googleCredentialService: GoogleCredentialService
  ) {
    this.credentialForm = this.createForm();
  }

  ngOnInit(): void {
    this.loadCredentials();
    this.loadActiveCredential();
  }

  /**
   * Tạo reactive form với validation
   */
  private createForm(): FormGroup {
    return this.fb.group({
      type: ['service_account', [Validators.required]],
      project_id: ['', [Validators.required]],
      private_key_id: ['', [Validators.required]],
      private_key: ['', [Validators.required]],
      client_email: ['', [Validators.required, Validators.email]],
      client_id: ['', [Validators.required]],
      auth_uri: ['https://accounts.google.com/o/oauth2/auth'],
      token_uri: ['https://oauth2.googleapis.com/token'],
      auth_provider_x509_cert_url: ['https://www.googleapis.com/oauth2/v1/certs'],
      client_x509_cert_url: ['', [Validators.required]],
      universe_domain: ['googleapis.com'],
      description: ['']
    });
  }

  /**
   * Load danh sách tất cả credentials
   */
  loadCredentials(): void {
    this.loading.set(true);
    this.error.set(null);

    this.googleCredentialService.getAllCredentials().subscribe({
      next: (response) => {
        this.credentials.set(response.data || []);
        this.loading.set(false);
      },
      error: (error) => {
        this.error.set('Lỗi khi tải danh sách credentials: ' + (error.error?.message || error.message));
        this.loading.set(false);
      }
    });
  }

  /**
   * Load credential đang active
   */
  loadActiveCredential(): void {
    this.googleCredentialService.getActiveCredential().subscribe({
      next: (response) => {
        this.activeCredential.set(response.data);
      },
      error: (error) => {
        console.error('Lỗi khi tải active credential:', error);
      }
    });
  }

  /**
   * Lưu credential (tạo mới hoặc cập nhật)
   */
  onSave(): void {
    if (this.credentialForm.invalid) {
      this.markAllFieldsAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.success.set(null);

    const formData = this.credentialForm.value as CreateGoogleCredentialDto;

    const saveObservable = this.isEditing() && this.editingId()
      ? this.googleCredentialService.updateCredential(this.editingId()!, formData)
      : this.googleCredentialService.createCredential(formData);

    saveObservable.subscribe({
      next: (response) => {
        this.success.set(response.message);
        this.resetForm();
        this.loadCredentials();
        this.loadActiveCredential();
        this.loading.set(false);
      },
      error: (error) => {
        this.error.set('Lỗi khi lưu credential: ' + (error.error?.error || error.error?.message || error.message));
        this.loading.set(false);
      }
    });
  }

  /**
   * Test connection với credential
   */
  onTestConnection(credential: GoogleCredential): void {
    if (!credential._id) return;

    const testingSet = new Set(this.testingIds());
    testingSet.add(credential._id);
    this.testingIds.set(testingSet);

    this.error.set(null);
    this.success.set(null);

    this.googleCredentialService.testConnection(credential._id).subscribe({
      next: (response) => {
        const message = response.data.success 
          ? `✅ ${response.data.message}`
          : `❌ ${response.data.message}`;
        
        if (response.data.success) {
          this.success.set(message);
        } else {
          this.error.set(message);
        }

        this.loadCredentials(); // Refresh để cập nhật test status
        
        const testingSet = new Set(this.testingIds());
        testingSet.delete(credential._id!);
        this.testingIds.set(testingSet);
      },
      error: (error) => {
        this.error.set('Lỗi khi test connection: ' + (error.error?.message || error.message));
        
        const testingSet = new Set(this.testingIds());
        testingSet.delete(credential._id!);
        this.testingIds.set(testingSet);
      }
    });
  }

  /**
   * Kích hoạt credential
   */
  onActivate(credential: GoogleCredential): void {
    if (!credential._id) return;

    const activatingSet = new Set(this.activatingIds());
    activatingSet.add(credential._id);
    this.activatingIds.set(activatingSet);

    this.error.set(null);
    this.success.set(null);

    this.googleCredentialService.activateCredential(credential._id).subscribe({
      next: (response) => {
        this.success.set(response.message);
        this.loadCredentials();
        this.loadActiveCredential();
        
        const activatingSet = new Set(this.activatingIds());
        activatingSet.delete(credential._id!);
        this.activatingIds.set(activatingSet);
      },
      error: (error) => {
        this.error.set('Lỗi khi kích hoạt credential: ' + (error.error?.message || error.message));
        
        const activatingSet = new Set(this.activatingIds());
        activatingSet.delete(credential._id!);
        this.activatingIds.set(activatingSet);
      }
    });
  }

  /**
   * Xóa credential
   */
  onDelete(credential: GoogleCredential): void {
    if (!credential._id) return;

    if (!confirm(`Bạn có chắc chắn muốn xóa credential "${credential.project_id}"?`)) {
      return;
    }

    const deletingSet = new Set(this.deletingIds());
    deletingSet.add(credential._id);
    this.deletingIds.set(deletingSet);

    this.error.set(null);
    this.success.set(null);

    this.googleCredentialService.deleteCredential(credential._id).subscribe({
      next: (response) => {
        this.success.set(response.message);
        this.loadCredentials();
        this.loadActiveCredential();
        
        const deletingSet = new Set(this.deletingIds());
        deletingSet.delete(credential._id!);
        this.deletingIds.set(deletingSet);
      },
      error: (error) => {
        this.error.set('Lỗi khi xóa credential: ' + (error.error?.message || error.message));
        
        const deletingSet = new Set(this.deletingIds());
        deletingSet.delete(credential._id!);
        this.deletingIds.set(deletingSet);
      }
    });
  }

  /**
   * Chỉnh sửa credential
   */
  onEdit(credential: GoogleCredential): void {
    this.isEditing.set(true);
    this.editingId.set(credential._id || null);
    
    this.credentialForm.patchValue({
      type: credential.type,
      project_id: credential.project_id,
      private_key_id: credential.private_key_id,
      private_key: credential.private_key,
      client_email: credential.client_email,
      client_id: credential.client_id,
      auth_uri: credential.auth_uri,
      token_uri: credential.token_uri,
      auth_provider_x509_cert_url: credential.auth_provider_x509_cert_url,
      client_x509_cert_url: credential.client_x509_cert_url,
      universe_domain: credential.universe_domain,
      description: credential.description
    });

    // Scroll to form
    document.getElementById('credential-form')?.scrollIntoView({ behavior: 'smooth' });
  }

  /**
   * Paste JSON credential
   */
  onPasteJSON(): void {
    const jsonText = prompt('Dán nội dung JSON credential vào đây:');
    if (!jsonText) return;

    try {
      const credentialData = JSON.parse(jsonText);
      
      this.credentialForm.patchValue({
        type: credentialData.type || 'service_account',
        project_id: credentialData.project_id || '',
        private_key_id: credentialData.private_key_id || '',
        private_key: credentialData.private_key || '',
        client_email: credentialData.client_email || '',
        client_id: credentialData.client_id || '',
        auth_uri: credentialData.auth_uri || 'https://accounts.google.com/o/oauth2/auth',
        token_uri: credentialData.token_uri || 'https://oauth2.googleapis.com/token',
        auth_provider_x509_cert_url: credentialData.auth_provider_x509_cert_url || 'https://www.googleapis.com/oauth2/v1/certs',
        client_x509_cert_url: credentialData.client_x509_cert_url || '',
        universe_domain: credentialData.universe_domain || 'googleapis.com'
      });

      this.success.set('Đã paste JSON credential thành công!');
    } catch (error) {
      this.error.set('JSON không hợp lệ. Vui lòng kiểm tra lại format.');
    }
  }

  /**
   * Reset form về trạng thái tạo mới
   */
  resetForm(): void {
    this.credentialForm.reset();
    this.credentialForm.patchValue({
      type: 'service_account',
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      universe_domain: 'googleapis.com'
    });
    this.isEditing.set(false);
    this.editingId.set(null);
  }

  /**
   * Đánh dấu tất cả fields đã touched để hiển thị validation errors
   */
  private markAllFieldsAsTouched(): void {
    Object.keys(this.credentialForm.controls).forEach(key => {
      this.credentialForm.get(key)?.markAsTouched();
    });
  }

  /**
   * Kiểm tra field có lỗi và đã touched
   */
  hasError(fieldName: string): boolean {
    const field = this.credentialForm.get(fieldName);
    return !!(field?.invalid && field?.touched);
  }

  /**
   * Lấy error message cho field
   */
  getErrorMessage(fieldName: string): string {
    const field = this.credentialForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) {
        return `${fieldName} là bắt buộc`;
      }
      if (field.errors['email']) {
        return 'Email không đúng định dạng';
      }
    }
    return '';
  }

  /**
   * Format date để hiển thị
   */
  formatDate(date: Date | string | undefined): string {
    if (!date) return 'Chưa có';
    const d = new Date(date);
    return d.toLocaleString('vi-VN');
  }

  /**
   * Get status badge class
   */
  getStatusBadgeClass(status?: string): string {
    switch (status) {
      case 'success':
        return 'badge-success';
      case 'failed':
        return 'badge-error';
      default:
        return 'badge-unknown';
    }
  }

  /**
   * Get status text
   */
  getStatusText(status?: string): string {
    switch (status) {
      case 'success':
        return 'Thành công';
      case 'failed':
        return 'Thất bại';
      default:
        return 'Chưa test';
    }
  }

  /**
   * Get count of active credentials
   */
  getActiveCredentialsCount(): number {
    return this.credentials().filter(c => c.isActive).length;
  }
}