/** Component: ConversationList - danh sách hội thoại fanpage */
import { Component, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatMessageService, ConversationSummary, ChatMessage } from './chat-message.service';
import { PendingOrderService, PendingOrder, AgentOption } from './pending-order.service';
import { ProductService } from '../product/product.service';
import { Product } from '../product/models/product.interface';

@Component({
  selector: 'app-conversations',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './conversation-list.component.html',
  styleUrls: ['./conversation-list.component.css']
})
export class ConversationListComponent implements OnInit, OnDestroy {
  private service = inject(ChatMessageService);
  private pendingSvc = inject(PendingOrderService);
  private productSvc = inject(ProductService);
  loading = signal(false);
  error = signal<string|undefined>(undefined);
  page = signal(1);
  limit = signal(20);
  total = signal(0);
  items = signal<ConversationSummary[]>([]);
  filter = signal<{fanpageId?: string; senderPsid?: string; needsHuman?: string}>({});

  // detail modal
  showDetail = signal(false);
  detailLoading = signal(false);
  currentConv = signal<ConversationSummary|undefined>(undefined);
  messages = signal<ChatMessage[]>([]);
  replyText = signal('');
  sending = signal(false);
  now = signal(Date.now());
  // Order draft form state
  orderExtractLoading = signal(false);
  orderDraft = signal<PendingOrder|undefined>(undefined);
  approveLoading = signal(false);
  extractSuggestions = signal<any|undefined>(undefined);
  products = signal<Product[]>([]);
  agents = signal<AgentOption[]>([]);
  // auto refresh time every 30s for time-ago display
  private interval?: any;

  timeAgo = (d?: string) => {
    if(!d) return '';
    const diff = Date.now() - new Date(d).getTime();
    const s = Math.floor(diff/1000);
    if(s<60) return s+ 's';
    const m = Math.floor(s/60); if(m<60) return m+'m';
    const h = Math.floor(m/60); if(h<24) return h+'h';
    const day = Math.floor(h/24); return day+'d';
  };

  ngOnDestroy(){ if(this.interval) clearInterval(this.interval); }

  ngOnInit(){
    this.load();
    this.interval = setInterval(()=> this.now.set(Date.now()), 30000);
    // preload limited products (could enhance with pagination later)
    this.productSvc.getAll().subscribe({ next: list => this.products.set(list.slice(0,200)), error: _=>{} });
    // load agents list for assignment
    this.pendingSvc.listAgents().subscribe({ next: list => this.agents.set(list), error: _=>{} });
  }

  updateFilter<K extends keyof ReturnType<typeof this.filter>>(key: K, value: any){ this.filter.update(f=> ({...f,[key]: value})); }
  setPage(p: number){ if(p<1) return; this.page.set(p); this.load(); }

  private getFanpageId(fanpageId: string | {pageId: string; name: string; _id: string}): string {
    return typeof fanpageId === 'string' ? fanpageId : fanpageId._id;
  }

  // Helper methods for template
  getFanpagePageId(fanpageId: string | {pageId: string; name: string; _id: string}): string {
    return typeof fanpageId === 'string' ? fanpageId : fanpageId.pageId;
  }

  getFanpageName(fanpageId: string | {pageId: string; name: string; _id: string}): string | undefined {
    return typeof fanpageId === 'string' ? undefined : fanpageId.name;
  }

  isFanpageObject(fanpageId: string | {pageId: string; name: string; _id: string}): boolean {
    return typeof fanpageId === 'object';
  }

  load(){
    this.loading.set(true);
    const q: any = { page: this.page(), limit: this.limit() };
    const f = this.filter();
    if(f.fanpageId) q.fanpageId = f.fanpageId;
    if(f.senderPsid) q.senderPsid = f.senderPsid;
    if(f.needsHuman==='true') q.needsHuman = true;
    if(f.needsHuman==='false') q.needsHuman = false;
    this.service.listConversations(q).subscribe({
      next: resp=>{ this.items.set(resp.items); this.total.set(resp.total); this.loading.set(false); },
      error: e=>{ this.error.set(e?.error?.message||'Lỗi tải hội thoại'); this.loading.set(false); }
    });
  }

  open(conv: ConversationSummary){
    // Mở modal ngay lập tức với thông tin có sẵn từ list
    this.showDetail.set(true);
    this.currentConv.set(conv);
    this.error.set('');
    this.messages.set([]); // Clear messages cũ
    
    const fpId = this.getFanpageId(conv.fanpageId);
    
    // Reset order panel state ngay - không cần chờ API
    this.orderDraft.set({ fanpageId: fpId, senderPsid: conv.senderPsid, quantity:1 });
    
    // Chỉ load messages, không block modal
    this.detailLoading.set(true);
    
    // Load messages với timeout ngắn để modal render trước
    setTimeout(() => {
      this.service.getConversation(fpId, conv.senderPsid).subscribe({
        next: d=>{
          // Limit messages để render nhanh hơn (chỉ 50 tin nhắn gần nhất)
          const sortedMessages = d.messages.slice()
            .sort((a,b)=> new Date(b.createdAt||'').getTime() - new Date(a.createdAt||'').getTime())
            .slice(0, 50)
            .reverse(); // Đảo ngược để tin nhắn cũ ở trên
          
          this.messages.set(sortedMessages);
          this.currentConv.set(d.conversation);
          this.detailLoading.set(false);
          
          // Extract order chạy nền, không block UI
          setTimeout(() => this.extractOrder(), 200);
        },
        error: e=>{
          this.error.set(e?.error?.message||'Lỗi tải hội thoại');
          this.detailLoading.set(false);
        }
      });
    }, 50); // Delay nhỏ để modal render trước
  }

  resolve(){
    const c = this.currentConv(); if(!c) return;
    const fpId = this.getFanpageId(c.fanpageId);
    this.service.resolveConversation(fpId, c.senderPsid).subscribe({
      next: d=>{ this.currentConv.set(d.conversation); this.messages.set(d.messages.slice().sort((a,b)=> new Date(a.createdAt||'').getTime() - new Date(b.createdAt||'').getTime())); this.items.update(arr=> arr.map(x=> this.getFanpageId(x.fanpageId)===fpId && x.senderPsid===c.senderPsid ? d.conversation : x)); },
    });
  }

  toggleAI(){
    const c = this.currentConv(); if(!c) return;
    const target = !c.autoAiEnabled;
    const fpId = this.getFanpageId(c.fanpageId);
    this.service.toggleAutoAI(fpId, c.senderPsid, target).subscribe({
      next: res=>{
        this.currentConv.update(old=> old? {...old, autoAiEnabled: res.autoAiEnabled }: old);
        this.items.update(list=> list.map(x=> this.getFanpageId(x.fanpageId)===fpId && x.senderPsid===c.senderPsid ? {...x, autoAiEnabled: res.autoAiEnabled }: x));
      },
      error: e=> this.error.set(e?.error?.message||'Toggle AI thất bại')
    });
  }

  sendReply(){
    const text = this.replyText().trim();
    const c = this.currentConv();
    if(!text || !c || this.sending()) return;
    this.sending.set(true);
    const fpId = this.getFanpageId(c.fanpageId);
    this.service.sendMessage(fpId, c.senderPsid, text).subscribe({
      next: res=>{
        const m = res.saved; // bản ghi đã lưu sau khi gửi thành công
        this.messages.update(arr=> [...arr, m]);
        this.replyText.set('');
        // Reload conversation summary để cập nhật last message / counts
        this.service.getConversation(fpId, c.senderPsid).subscribe(r=>{
          this.currentConv.set(r.conversation);
          this.items.update(list=> list.map(x=> this.getFanpageId(x.fanpageId)===fpId && x.senderPsid===c.senderPsid ? r.conversation : x));
        });
        this.sending.set(false);
      },
      error: e=>{ this.sending.set(false); this.error.set(e?.error?.message||'Gửi thất bại'); }
    });
  }
  onReplyKey(e: KeyboardEvent){ if(e.key==='Enter' && (e.ctrlKey||e.metaKey)) this.sendReply(); }

  extractOrder(){
    const c = this.currentConv(); if(!c) return; 
    
    // Set loading nhưng không block UI ngay
    this.orderExtractLoading.set(true);
    const fpId = this.getFanpageId(c.fanpageId);
    
    // Chạy extract với delay để không ảnh hưởng modal
    setTimeout(() => {
      this.service.extractOrder(fpId, c.senderPsid).subscribe({
        next: data=>{
          this.extractSuggestions.set(data);
          const s = data.suggestions||{};
          const current = this.orderDraft()||{};
          
          // Chỉ fill những field chưa có data
          this.orderDraft.set({
            ...current,
            customerName: current.customerName || s.customerName,
            phone: current.phone || s.phone,
            address: current.address || s.address,
            quantity: current.quantity || s.quantity || 1,
            adGroupId: current.adGroupId || s.adGroupId
          });
          
          this.orderExtractLoading.set(false);
        },
        error: err => {
          console.warn('Extract order failed:', err);
          this.orderExtractLoading.set(false);
        }
      });
    }, 300); // Delay lớn hơn để modal ổn định trước
  }

  saveDraft(status: 'draft'|'awaiting'){
    const draft = this.orderDraft(); if(!draft) return; const body = { ...draft, status } as any;
    if(draft._id){
      this.pendingSvc.update(draft._id, body).subscribe(p=> this.orderDraft.set(p));
    } else {
      this.pendingSvc.create(body).subscribe(p=> this.orderDraft.set(p));
    }
  }

  approve(){
    const draft = this.orderDraft(); if(!draft || !draft._id) return; this.approveLoading.set(true);
    this.pendingSvc.approve(draft._id).subscribe({
      next: res=>{ this.approveLoading.set(false); const cur = this.orderDraft(); this.orderDraft.set(cur? {...cur, status:'approved'}: cur); this.currentConv.update(c=> c? {...c, orderDraftStatus:'approved', orderId: res.order?._id}: c); },
      error: _=>{ this.approveLoading.set(false); }
    });
  }

  // Field update helpers for template clarity
  setDraftField<K extends keyof PendingOrder>(key: K, value: PendingOrder[K]) {
    const cur = this.orderDraft(); if(!cur) return; this.orderDraft.set({ ...cur, [key]: value });
  }

  setOrderField<K extends keyof PendingOrder>(field: K, value: PendingOrder[K]){
    this.orderDraft.update(d => ({ ...(d||{} as any), [field]: value }) as any);
  }

  getStatusText(status: string): string {
    const statusMap = {
      'draft': '📝 Nháp',
      'awaiting': '⏳ Chờ duyệt', 
      'approved': '✅ Đã duyệt'
    };
    return statusMap[status as keyof typeof statusMap] || '❓ Không xác định';
  }
}