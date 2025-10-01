/**
 * File: fanpage/fanpage.component.ts
 * Mục đích: Component quản lý Fanpage với modal form và error handling
 * Chức năng: CRUD fanpage, hiển thị danh sách, form thêm/sửa
 */
import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FanpageService, Fanpage, CreateFanpageRequest } from './fanpage.service';
import { OpenAIConfigService, OpenAIConfig } from '../openai-config/openai-config.service';

@Component({
  selector: 'app-fanpage',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './fanpage.component.html',
  styleUrls: ['./fanpage.component.css']
})
export class FanpageComponent implements OnInit {
  private service = inject(FanpageService);
  private aiConfigSvc = inject(OpenAIConfigService);

  // State signals
  fanpages = signal<Fanpage[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  showAddModal = signal(false);
  editingFanpage = signal<Fanpage | null>(null);

  // Form data for new/edit
  formData = signal<Partial<CreateFanpageRequest>>({
    status: 'active',
    messageQuota: 10000,
    subscriberCount: 0,
    aiEnabled: false,
    subscribedWebhook: false,
    timezone: 'Asia/Ho_Chi_Minh'
  });

  aiConfigs = signal<OpenAIConfig[]>([]);
  aiConfigLoading = signal(false);

  private loadAIConfigs(){
    this.aiConfigLoading.set(true);
    this.aiConfigSvc.list({ status: 'active' }).subscribe({
      next: list=>{ this.aiConfigs.set(list); this.aiConfigLoading.set(false); },
      error: _=>{ this.aiConfigLoading.set(false); }
    });
  }

  ngOnInit(){ this.load(); this.loadAIConfigs(); }

  /**
   * Tải danh sách fanpage từ server
   */
  load(){
    this.loading.set(true);
    this.error.set(null);
    this.service.list().subscribe({
      next: data => {
        this.fanpages.set(data);
        this.loading.set(false);
      },
      error: err => {
        this.handleError(err, 'Không thể tải danh sách fanpage');
        this.loading.set(false);
      }
    });
  }

  /**
   * Mở modal thêm fanpage mới
   */
  openAddModal(){
    this.formData.set({
      status: 'active',
      messageQuota: 10000,
      subscriberCount: 0,
      aiEnabled: false,
      subscribedWebhook: false,
      timezone: 'Asia/Ho_Chi_Minh'
    });
    this.editingFanpage.set(null);
    this.showAddModal.set(true);
    this.loadAIConfigs();
  }

  /**
   * Mở modal chỉnh sửa fanpage
   */
  openEditModal(fanpage: Fanpage){
    this.formData.set({...fanpage});
    this.editingFanpage.set(fanpage);
    this.showAddModal.set(true);
    this.loadAIConfigs();
  }

  /**
   * Đóng modal
   */
  closeModal(){
    this.showAddModal.set(false);
    this.editingFanpage.set(null);
    this.formData.set({});
  }

  /**
   * Lưu fanpage (tạo mới hoặc cập nhật)
   */
  saveFanpage(){
    const raw = this.formData();
    const data: any = this.buildPayload(raw);
    
    // Validation
    if (!data.pageId?.trim()) {
      alert('Vui lòng nhập Page ID');
      return;
    }
    if (!data.name?.trim()) {
      alert('Vui lòng nhập tên fanpage');
      return;
    }
    if (!data.accessToken?.trim()) {
      alert('Vui lòng nhập Access Token');
      return;
    }

    const editing = this.editingFanpage();
    if (editing) {
      // Cập nhật
      this.service.update(editing._id, data).subscribe({
        next: updated => {
          this.fanpages.update(list => list.map(f => f._id === updated._id ? updated : f));
          this.closeModal();
        },
        error: err => this.handleError(err, 'Không thể cập nhật fanpage')
      });
    } else {
      // Tạo mới
      this.service.create(data as CreateFanpageRequest).subscribe({
        next: created => {
          this.fanpages.update(list => [created, ...list]);
          this.closeModal();
        },
        error: err => this.handleError(err, 'Không thể tạo fanpage mới')
      });
    }
  }

  /**
   * Loại bỏ các field chỉ đọc (_id, createdAt, updatedAt, __v) và chỉ giữ các field hợp lệ DTO
   */
  private buildPayload(src: any){
    if(!src) return {};
    const allowed = ['pageId','name','accessToken','status','avatarUrl','connectedBy','defaultProductGroup','description','greetingScript','clarifyScript','productSuggestScript','fallbackScript','closingScript','messageQuota','subscriberCount','sentThisMonth','aiEnabled','subscribedWebhook','timezone','openAIConfigId'];
    const out: any = {};
    for(const k of allowed){ if(src[k] !== undefined && src[k] !== null) out[k]=src[k]; }
    return out;
  }

  /**
   * Xóa fanpage
   */
  deleteFanpage(fanpage: Fanpage){
    if (!confirm(`Bạn có chắc muốn xóa fanpage "${fanpage.name}"?`)) {
      return;
    }

    this.service.delete(fanpage._id).subscribe({
      next: () => {
        this.fanpages.update(list => list.filter(f => f._id !== fanpage._id));
      },
      error: err => this.handleError(err, 'Không thể xóa fanpage')
    });
  }

  /**
   * Toggle trạng thái AI
   */
  toggleAI(fanpage: Fanpage){
    this.service.update(fanpage._id, { aiEnabled: !fanpage.aiEnabled }).subscribe({
      next: updated => {
        this.fanpages.update(list => list.map(f => f._id === updated._id ? updated : f));
      },
      error: err => this.handleError(err, 'Không thể thay đổi trạng thái AI')
    });
  }

  /**
   * Tạo config AI cho fanpage chưa có config
   */
  createAIConfig(fanpage: Fanpage){
    if (!confirm(`Tạo cấu hình AI mới cho fanpage "${fanpage.name}"?`)) return;
    
    // Gọi endpoint đặc biệt để tạo config AI cho fanpage hiện có
    this.service.createAIConfig(fanpage._id).subscribe({
      next: () => {
        // Reload fanpage để lấy thông tin mới
        this.load();
      },
      error: err => this.handleError(err, 'Không thể tạo config AI')
    });
  }

  /**
   * Xử lý lỗi API
   */
  private handleError(error: any, defaultMessage: string){
    let errorMessage = defaultMessage;
    
    if (error?.status === 403) {
      errorMessage = 'Bạn không có quyền truy cập chức năng này';
    } else if (error?.status === 400 && error?.error?.message) {
      errorMessage = error.error.message;
    } else if (error?.error?.message) {
      errorMessage = error.error.message;
    }
    
    this.error.set(errorMessage);
    console.error('Fanpage API Error:', error);
  }

  /**
   * Cập nhật form data
   */
  updateFormField(field: keyof CreateFanpageRequest, value: any){
    this.formData.update(data => ({ ...data, [field]: value }));
  }

  /**
   * Xử lý input event
   */
  onInputChange(event: Event, field: keyof CreateFanpageRequest) {
    const target = event.target as HTMLInputElement;
    this.updateFormField(field, target.value);
  }

  /**
   * Xử lý number input event
   */
  onNumberChange(event: Event, field: keyof CreateFanpageRequest) {
    const target = event.target as HTMLInputElement;
    this.updateFormField(field, +target.value);
  }

  /**
   * Xử lý checkbox event
   */
  onCheckboxChange(event: Event, field: keyof CreateFanpageRequest) {
    const target = event.target as HTMLInputElement;
    this.updateFormField(field, target.checked);
  }

  trackById(index: number, item: Fanpage){ return item._id; }
}
