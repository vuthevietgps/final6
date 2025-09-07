/**
 * File: features/test-order/models/test-order.model.ts
 */
export type TestOrderStatus = 'new' | 'processing' | 'done' | 'cancel';

export interface TestOrder {
  _id?: string;
  code: string;
  date: string; // ISO
  customerName: string;
  phone?: string;
  total: number;
  status: TestOrderStatus;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type CreateTestOrder = Omit<TestOrder, '_id' | 'createdAt' | 'updatedAt'>;
export type UpdateTestOrder = Partial<CreateTestOrder>;
