/**
 * File: features/quote/models/quote.model.ts
 * Mục đích: Khai báo kiểu dữ liệu (interface) cho Báo giá dùng ở frontend.
 */
export interface Quote {
  _id?: string;
  productId: string | Product;
  agentId: string | User;
  price: number;
  status: 'Chờ duyệt' | 'Đã duyệt' | 'Từ chối' | 'Hết hiệu lực';
  expiryDate: string;
  notes?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateQuote {
  productId: string;
  agentId: string;
  price: number;
  status: string;
  expiryDate?: string;
  notes?: string;
}

export interface UpdateQuote extends Partial<CreateQuote> {}

export interface QuoteStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  expired: number;
  approvalRate: number;
}

export interface Product {
  _id: string;
  name: string;
  sku: string;
  price: number;
}

export interface User {
  _id?: string;
  fullName: string;
  email: string;
  role: string;
  phone?: string;
  address?: string;
  isActive?: boolean;
}
