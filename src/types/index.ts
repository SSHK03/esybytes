export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  companyName?: string;
  gstin?: string;
  panNumber?: string;
  billingAddress?: string;
  shippingAddress?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Item {
  id: string;
  name: string;
  sku: string;
  description?: string;
  type: 'product' | 'service';
  price: number;
  quantity: number;
  unit?: string;
  tax?: number;
  hsnCode?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LineItem {
  id: string;
  itemId: string;
  description: string;
  quantity: number;
  price: number;
  tax: number;
  total: number;
}

export interface SalesOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  date: string;
  dueDate?: string;
  status: 'draft' | 'open' | 'confirmed' | 'delivered' | 'cancelled';
  items: LineItem[];
  notes?: string;
  subtotal: number;
  taxTotal: number;
  total: number;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  salesOrderId?: string;
  date: string;
  dueDate: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  items: LineItem[];
  notes?: string;
  subtotal: number;
  taxTotal: number;
  total: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  totalPages: number;
  total: number;
}

export interface SearchParams {
  search?: string;
  page?: number;
  limit?: number;
}