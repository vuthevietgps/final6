export interface Summary4 {
  _id: string;
  testOrder2Id: string;
  orderDate: string;
  customerName: string;
  product: string;
  quantity: number;
  agentName: string;
  adGroupId: string;
  isActive: boolean;
  serviceDetails?: string;
  productionStatus: string;
  orderStatus: string;
  submitLink?: string;
  trackingNumber?: string;
  depositAmount: number;
  codAmount: number;
  agentId: string | Agent;
  productId: string | Product;
  approvedQuotePrice: number;
  mustPayToCompany: number;
  paidToCompany: number;
  manualPayment: number;
  needToPay: number;
  createdAt: string;
  updatedAt: string;
}

export interface Agent {
  _id: string;
  fullName: string;
  email: string;
  role: string;
}

export interface Product {
  _id: string;
  name: string;
  sku: string;
  price: number;
}

export interface Summary4Filter {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface Summary4Response {
  data: Summary4[];
  total: number;
  page: number;
  totalPages: number;
  requestedPage?: number;
  redirectedToPage?: number;
}

export interface Summary4Stats {
  totalRecords: number;
  totalMustPay: number;
  totalPaidToCompany: number;
  totalManualPayment: number;
  totalNeedToPay: number;
  timestamp: string;
}

export interface UpdateManualPayment {
  manualPayment: number;
}