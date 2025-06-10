import { db, generateId } from '../database.js';

// Pagination helper
export const paginate = (query, params, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const countQuery = query.replace(/SELECT .* FROM/, 'SELECT COUNT(*) as total FROM').split('LIMIT')[0];
  const total = db.prepare(countQuery).get(params).total;
  const data = db.prepare(query).all({ ...params, offset, limit });

  return {
    data,
    page: parseInt(page),
    totalPages: Math.ceil(total / limit),
    total
  };
};

// Search helper
export const buildSearchQuery = (baseQuery, searchFields, searchTerm) => {
  if (!searchTerm) {
    return baseQuery;
  }

  const searchConditions = searchFields.map(field => 
    `${field} LIKE '%' || :search || '%'`
  ).join(' OR ');

  return baseQuery.replace('WHERE', `WHERE (${searchConditions}) AND`);
};

// Date range helper
export const buildDateRangeQuery = (baseQuery, dateField, dateFrom, dateTo) => {
  let query = baseQuery;
  
  if (dateFrom) {
    query = query.replace('WHERE', `WHERE ${dateField} >= :dateFrom AND`);
  }
  
  if (dateTo) {
    query = query.replace('WHERE', `WHERE ${dateField} <= :dateTo AND`);
  }
  
  return query;
};

// Transaction helper
export const executeTransaction = (operations) => {
  const transaction = db.transaction(operations);
  return transaction();
};

// Audit logging helper
export const logAudit = (userId, action, tableName, recordId, oldValues, newValues, ipAddress, userAgent) => {
  try {
    const auditLog = {
      id: generateId(),
      user_id: userId,
      action,
      table_name: tableName,
      record_id: recordId,
      old_values: oldValues ? JSON.stringify(oldValues) : null,
      new_values: newValues ? JSON.stringify(newValues) : null,
      ip_address: ipAddress,
      user_agent: userAgent
    };

    db.prepare(`
      INSERT INTO audit_logs (id, user_id, action, table_name, record_id, old_values, new_values, ip_address, user_agent)
      VALUES (@id, @user_id, @action, @table_name, @record_id, @old_values, @new_values, @ip_address, @user_agent)
    `).run(auditLog);
  } catch (error) {
    console.error('Error logging audit:', error);
  }
};

// Number generation helpers
export const generateInvoiceNumber = (organizationId) => {
  const lastInvoice = db.prepare(`
    SELECT invoice_number FROM invoices 
    WHERE organization_id = ? 
    ORDER BY CAST(SUBSTR(invoice_number, 5) AS INTEGER) DESC 
    LIMIT 1
  `).get(organizationId);

  let invoiceNumber = 'INV-0001';
  if (lastInvoice) {
    const lastNumber = parseInt(lastInvoice.invoice_number.split('-')[1]);
    invoiceNumber = `INV-${String(lastNumber + 1).padStart(4, '0')}`;
  }

  return invoiceNumber;
};

export const generateBillNumber = (organizationId) => {
  const lastBill = db.prepare(`
    SELECT bill_number FROM bills 
    WHERE organization_id = ? 
    ORDER BY CAST(SUBSTR(bill_number, 5) AS INTEGER) DESC 
    LIMIT 1
  `).get(organizationId);

  let billNumber = 'BILL-0001';
  if (lastBill) {
    const lastNumber = parseInt(lastBill.bill_number.split('-')[1]);
    billNumber = `BILL-${String(lastNumber + 1).padStart(4, '0')}`;
  }

  return billNumber;
};

export const generatePaymentNumber = (organizationId) => {
  const lastPayment = db.prepare(`
    SELECT payment_number FROM payments 
    WHERE organization_id = ? 
    ORDER BY CAST(SUBSTR(payment_number, 5) AS INTEGER) DESC 
    LIMIT 1
  `).get(organizationId);

  let paymentNumber = 'PAY-0001';
  if (lastPayment) {
    const lastNumber = parseInt(lastPayment.payment_number.split('-')[1]);
    paymentNumber = `PAY-${String(lastNumber + 1).padStart(4, '0')}`;
  }

  return paymentNumber;
};

export const generateOrderNumber = (organizationId) => {
  const lastOrder = db.prepare(`
    SELECT order_number FROM sales_orders 
    WHERE organization_id = ? 
    ORDER BY CAST(SUBSTR(order_number, 4) AS INTEGER) DESC 
    LIMIT 1
  `).get(organizationId);

  let orderNumber = 'SO-0001';
  if (lastOrder) {
    const lastNumber = parseInt(lastOrder.order_number.split('-')[1]);
    orderNumber = `SO-${String(lastNumber + 1).padStart(4, '0')}`;
  }

  return orderNumber;
};

// Validation helpers
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhone = (phone) => {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone);
};

export const validateGSTIN = (gstin) => {
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return gstinRegex.test(gstin);
};

export const validatePAN = (pan) => {
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  return panRegex.test(pan);
};

// Calculation helpers
export const calculateTax = (amount, taxRate) => {
  return (amount * taxRate) / 100;
};

export const calculateTotal = (subtotal, taxAmount) => {
  return subtotal + taxAmount;
};

export const calculateBalanceDue = (total, paidAmount) => {
  return Math.max(0, total - paidAmount);
};

// Status helpers
export const updateInvoiceStatus = (invoiceId, organizationId) => {
  const invoice = db.prepare(`
    SELECT total, balance_due FROM invoices 
    WHERE id = ? AND organization_id = ?
  `).get(invoiceId, organizationId);

  if (invoice) {
    const newStatus = invoice.balance_due <= 0 ? 'paid' : 
                     invoice.balance_due < invoice.total ? 'partial' : 'sent';
    
    db.prepare(`
      UPDATE invoices 
      SET status = ?
      WHERE id = ? AND organization_id = ?
    `).run(newStatus, invoiceId, organizationId);
  }
};

export const updateBillStatus = (billId, organizationId) => {
  const bill = db.prepare(`
    SELECT total, balance_due FROM bills 
    WHERE id = ? AND organization_id = ?
  `).get(billId, organizationId);

  if (bill) {
    const newStatus = bill.balance_due <= 0 ? 'paid' : 
                     bill.balance_due < bill.total ? 'partial' : 'sent';
    
    db.prepare(`
      UPDATE bills 
      SET status = ?
      WHERE id = ? AND organization_id = ?
    `).run(newStatus, billId, organizationId);
  }
};

// Inventory helpers
export const updateItemQuantity = (itemId, quantity, adjustmentType, organizationId) => {
  const item = db.prepare(`
    SELECT quantity FROM items 
    WHERE id = ? AND organization_id = ?
  `).get(itemId, organizationId);

  if (!item) {
    throw new Error('Item not found');
  }

  let newQuantity = item.quantity;
  
  switch (adjustmentType) {
    case 'add':
      newQuantity += quantity;
      break;
    case 'subtract':
      newQuantity -= quantity;
      if (newQuantity < 0) {
        throw new Error('Insufficient stock');
      }
      break;
    case 'set':
      newQuantity = quantity;
      break;
    default:
      throw new Error('Invalid adjustment type');
  }

  db.prepare(`
    UPDATE items 
    SET quantity = ?
    WHERE id = ? AND organization_id = ?
  `).run(newQuantity, itemId, organizationId);

  return newQuantity;
};

// Statistics helpers
export const getDashboardStats = (organizationId, period = 'month') => {
  let dateFilter = '';
  switch (period) {
    case 'week':
      dateFilter = "AND date >= date('now', '-7 days')";
      break;
    case 'month':
      dateFilter = "AND date >= date('now', '-1 month')";
      break;
    case 'quarter':
      dateFilter = "AND date >= date('now', '-3 months')";
      break;
    case 'year':
      dateFilter = "AND date >= date('now', '-1 year')";
      break;
  }

  const stats = db.prepare(`
    SELECT 
      (SELECT COUNT(*) FROM invoices WHERE organization_id = ? ${dateFilter}) as total_invoices,
      (SELECT COUNT(*) FROM bills WHERE organization_id = ? ${dateFilter}) as total_bills,
      (SELECT COUNT(*) FROM payments WHERE organization_id = ? ${dateFilter}) as total_payments,
      (SELECT COALESCE(SUM(total), 0) FROM invoices WHERE organization_id = ? ${dateFilter}) as total_revenue,
      (SELECT COALESCE(SUM(total), 0) FROM bills WHERE organization_id = ? ${dateFilter}) as total_expenses,
      (SELECT COALESCE(SUM(balance_due), 0) FROM invoices WHERE organization_id = ?) as outstanding_receivables,
      (SELECT COALESCE(SUM(balance_due), 0) FROM bills WHERE organization_id = ?) as outstanding_payables
  `).get(organizationId, organizationId, organizationId, organizationId, organizationId, organizationId, organizationId);

  return stats;
};

// Export all helpers
export default {
  paginate,
  buildSearchQuery,
  buildDateRangeQuery,
  executeTransaction,
  logAudit,
  generateInvoiceNumber,
  generateBillNumber,
  generatePaymentNumber,
  generateOrderNumber,
  validateEmail,
  validatePhone,
  validateGSTIN,
  validatePAN,
  calculateTax,
  calculateTotal,
  calculateBalanceDue,
  updateInvoiceStatus,
  updateBillStatus,
  updateItemQuantity,
  getDashboardStats
}; 