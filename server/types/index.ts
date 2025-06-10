import { Request } from 'express';
import Database from 'better-sqlite3';

// Database types
export interface User {
  id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'staff' | 'accountant' | 'viewer';
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface UserPermission {
  id: string;
  user_id: string;
  module: string;
  permission: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  action: string;
  table_name: string;
  record_id?: string;
  old_values?: string;
  new_values?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface Organization {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  gstin?: string;
  pan_number?: string;
  logo_url?: string;
  timezone: string;
  fiscal_year_start: string;
  created_at: string;
  updated_at: string;
}

export interface OrganizationUser {
  id: string;
  organization_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'staff' | 'accountant' | 'viewer';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  organization_id: string;
  name: string;
  email: string;
  phone?: string;
  company_name?: string;
  gstin?: string;
  pan_number?: string;
  billing_address?: string;
  shipping_address?: string;
  credit_limit: number;
  payment_terms: number;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Vendor {
  id: string;
  organization_id: string;
  name: string;
  email: string;
  phone?: string;
  company_name?: string;
  gstin?: string;
  pan_number?: string;
  billing_address?: string;
  shipping_address?: string;
  payment_terms: number;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Item {
  id: string;
  organization_id: string;
  name: string;
  sku: string;
  description?: string;
  type: 'product' | 'service';
  price: number;
  cost_price: number;
  quantity: number;
  unit: string;
  tax_rate_id?: string;
  hsn_code?: string;
  category_id?: string;
  reorder_level: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  type: 'income' | 'expense' | 'item';
  parent_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TaxRate {
  id: string;
  organization_id: string;
  name: string;
  rate: number;
  type: 'percentage' | 'fixed';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SalesOrder {
  id: string;
  organization_id: string;
  order_number: string;
  customer_id: string;
  date: string;
  due_date?: string;
  status: 'draft' | 'open' | 'confirmed' | 'delivered' | 'cancelled';
  currency: string;
  exchange_rate: number;
  notes?: string;
  subtotal: number;
  tax_total: number;
  total: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  organization_id: string;
  invoice_number: string;
  customer_id: string;
  sales_order_id?: string;
  date: string;
  due_date: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  currency: string;
  exchange_rate: number;
  notes?: string;
  subtotal: number;
  tax_total: number;
  total: number;
  balance_due: number;
  recurring_id?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Bill {
  id: string;
  organization_id: string;
  bill_number: string;
  vendor_id: string;
  date: string;
  due_date: string;
  status: 'draft' | 'received' | 'paid' | 'overdue' | 'cancelled';
  currency: string;
  exchange_rate: number;
  notes?: string;
  subtotal: number;
  tax_total: number;
  total: number;
  balance_due: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  organization_id: string;
  payment_number: string;
  type: 'receipt' | 'payment';
  customer_id?: string;
  vendor_id?: string;
  invoice_id?: string;
  bill_id?: string;
  date: string;
  amount: number;
  currency: string;
  exchange_rate: number;
  payment_method: string;
  reference_number?: string;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Request types
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    organizationId: string;
    role: string;
  };
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Database helper types
export interface DatabaseInstance extends Database.Database {
  // Add any custom methods here
}

export interface QueryResult<T = any> {
  data: T[];
  total?: number;
}

// Utility types
export type Status = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
export type UserRole = 'admin' | 'staff' | 'accountant' | 'viewer';
export type OrganizationRole = 'owner' | 'admin' | 'staff' | 'accountant' | 'viewer';
export type ItemType = 'product' | 'service';
export type CategoryType = 'income' | 'expense' | 'item';
export type PaymentType = 'receipt' | 'payment';
export type TaxRateType = 'percentage' | 'fixed'; 