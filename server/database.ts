import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import { DatabaseInstance } from './types/index.js';

const db: DatabaseInstance = new Database('ajuun-tex.db') as DatabaseInstance;

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  -- User Management Tables
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'staff', 'accountant', 'viewer')),
    is_active BOOLEAN DEFAULT 1,
    last_login DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS user_permissions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    module TEXT NOT NULL,
    permission TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id TEXT,
    old_values TEXT,
    new_values TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  -- Company and Organization Tables
  CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    gstin TEXT,
    pan_number TEXT,
    logo_url TEXT,
    timezone TEXT DEFAULT 'Asia/Kolkata',
    fiscal_year_start DATE DEFAULT '2024-04-01',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS organization_users (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'staff', 'accountant', 'viewer')),
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(organization_id, user_id)
  );

  -- Enhanced Customer Table
  CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    company_name TEXT,
    gstin TEXT,
    pan_number TEXT,
    billing_address TEXT,
    shipping_address TEXT,
    credit_limit DECIMAL(10,2) DEFAULT 0,
    payment_terms INTEGER DEFAULT 30,
    currency TEXT DEFAULT 'INR',
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
  );

  -- Enhanced Vendor Table
  CREATE TABLE IF NOT EXISTS vendors (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    company_name TEXT,
    gstin TEXT,
    pan_number TEXT,
    billing_address TEXT,
    shipping_address TEXT,
    payment_terms INTEGER DEFAULT 30,
    currency TEXT DEFAULT 'INR',
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
  );

  -- Enhanced Items Table
  CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    name TEXT NOT NULL,
    sku TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('product', 'service')),
    price DECIMAL(10,2) NOT NULL,
    cost_price DECIMAL(10,2) DEFAULT 0,
    quantity INTEGER DEFAULT 0,
    unit TEXT DEFAULT 'piece',
    tax_rate_id TEXT,
    hsn_code TEXT,
    category_id TEXT,
    reorder_level INTEGER DEFAULT 10,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (tax_rate_id) REFERENCES tax_rates(id),
    FOREIGN KEY (category_id) REFERENCES categories(id),
    UNIQUE(organization_id, sku)
  );

  -- Categories Table
  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'item')),
    parent_id TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (parent_id) REFERENCES categories(id)
  );

  -- Enhanced Sales Orders Table
  CREATE TABLE IF NOT EXISTS sales_orders (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    order_number TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    date DATE NOT NULL,
    due_date DATE,
    status TEXT NOT NULL CHECK (status IN ('draft', 'open', 'confirmed', 'delivered', 'cancelled')),
    currency TEXT DEFAULT 'INR',
    exchange_rate DECIMAL(10,6) DEFAULT 1.0,
    notes TEXT,
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    tax_total DECIMAL(10,2) NOT NULL DEFAULT 0,
    total DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_by TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    UNIQUE(organization_id, order_number)
  );

  -- Enhanced Invoices Table
  CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    invoice_number TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    sales_order_id TEXT,
    date DATE NOT NULL,
    due_date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
    currency TEXT DEFAULT 'INR',
    exchange_rate DECIMAL(10,6) DEFAULT 1.0,
    notes TEXT,
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    tax_total DECIMAL(10,2) NOT NULL DEFAULT 0,
    total DECIMAL(10,2) NOT NULL DEFAULT 0,
    balance_due DECIMAL(10,2) NOT NULL DEFAULT 0,
    recurring_id TEXT,
    created_by TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (sales_order_id) REFERENCES sales_orders(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    UNIQUE(organization_id, invoice_number)
  );

  -- Enhanced Bills Table
  CREATE TABLE IF NOT EXISTS bills (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    bill_number TEXT NOT NULL,
    vendor_id TEXT NOT NULL,
    date DATE NOT NULL,
    due_date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('draft', 'received', 'paid', 'overdue', 'cancelled')),
    currency TEXT DEFAULT 'INR',
    exchange_rate DECIMAL(10,6) DEFAULT 1.0,
    notes TEXT,
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    tax_total DECIMAL(10,2) NOT NULL DEFAULT 0,
    total DECIMAL(10,2) NOT NULL DEFAULT 0,
    balance_due DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_by TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (vendor_id) REFERENCES vendors(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    UNIQUE(organization_id, bill_number)
  );

  -- Enhanced Payments Table
  CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    payment_number TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('receipt', 'payment')),
    customer_id TEXT,
    vendor_id TEXT,
    invoice_id TEXT,
    bill_id TEXT,
    date DATE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'INR',
    exchange_rate DECIMAL(10,6) DEFAULT 1.0,
    payment_method TEXT NOT NULL,
    reference_number TEXT,
    notes TEXT,
    created_by TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (vendor_id) REFERENCES vendors(id),
    FOREIGN KEY (invoice_id) REFERENCES invoices(id),
    FOREIGN KEY (bill_id) REFERENCES bills(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    UNIQUE(organization_id, payment_number)
  );

  -- Enhanced Tax Rates Table
  CREATE TABLE IF NOT EXISTS tax_rates (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    name TEXT NOT NULL,
    rate DECIMAL(5,2) NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('percentage', 'fixed')),
    description TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
  );

  -- Company Settings Table
  CREATE TABLE IF NOT EXISTS company_settings (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    company_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    gstin TEXT,
    pan_number TEXT,
    currency TEXT DEFAULT 'INR',
    date_format TEXT DEFAULT 'dd/MM/yyyy',
    invoice_prefix TEXT DEFAULT 'INV-',
    order_prefix TEXT DEFAULT 'SO-',
    bill_prefix TEXT DEFAULT 'BILL-',
    po_prefix TEXT DEFAULT 'PO-',
    expense_prefix TEXT DEFAULT 'EXP-',
    payment_prefix TEXT DEFAULT 'PAY-',
    credit_note_prefix TEXT DEFAULT 'CN-',
    terms_and_conditions TEXT,
    logo_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
  );

  -- Notifications Table
  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT 0,
    data TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  -- Insert default data
  INSERT OR IGNORE INTO organizations (id, name, email) VALUES
    ('default-org', 'Ajuun Tex', 'admin@ajuuntex.com');

  INSERT OR IGNORE INTO users (id, email, password_hash, first_name, last_name, role) VALUES
    ('admin-user', 'admin@ajuuntex.com', '${bcrypt.hashSync('admin123', 10)}', 'Admin', 'User', 'admin');

  INSERT OR IGNORE INTO organization_users (id, organization_id, user_id, role) VALUES
    ('default-org-user', 'default-org', 'admin-user', 'owner');

  INSERT OR IGNORE INTO company_settings (id, organization_id, company_name) VALUES
    ('default-settings', 'default-org', 'Ajuun Tex');

  -- Insert default tax rates
  INSERT OR IGNORE INTO tax_rates (id, organization_id, name, rate, type, description) VALUES
    ('gst-5-default', 'default-org', 'GST 5%', 5.00, 'percentage', 'Goods and Services Tax 5%'),
    ('gst-12-default', 'default-org', 'GST 12%', 12.00, 'percentage', 'Goods and Services Tax 12%'),
    ('gst-18-default', 'default-org', 'GST 18%', 18.00, 'percentage', 'Goods and Services Tax 18%'),
    ('gst-28-default', 'default-org', 'GST 28%', 28.00, 'percentage', 'Goods and Services Tax 28%');

  -- Insert default categories
  INSERT OR IGNORE INTO categories (id, organization_id, name, type) VALUES
    ('income-default', 'default-org', 'Sales', 'income'),
    ('expense-default', 'default-org', 'General Expenses', 'expense'),
    ('item-default', 'default-org', 'General Items', 'item');
`);

// Helper function to generate UUID
const generateId = (): string => uuidv4();

// Helper function to hash passwords
const hashPassword = (password: string): string => bcrypt.hashSync(password, 10);

// Helper function to verify passwords
const verifyPassword = (password: string, hash: string): boolean => bcrypt.compareSync(password, hash);

export { db, generateId, hashPassword, verifyPassword }; 