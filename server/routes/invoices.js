import express from 'express';
import { db, generateId } from '../database.js';
import { authorizeOrganization } from '../auth.js';

const router = express.Router();

// Helper function for pagination
const paginate = (query, params, page = 1, limit = 10) => {
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

// Get all invoices with pagination and search
router.get('/', authorizeOrganization, (req, res) => {
  const { search, page = 1, limit = 10, status, customer_id, date_from, date_to } = req.query;
  const { organizationId } = req.user;

  let query = `
    SELECT i.*, 
           c.name as customer_name,
           c.email as customer_email,
           u.first_name || ' ' || u.last_name as created_by_name
    FROM invoices i
    LEFT JOIN customers c ON i.customer_id = c.id
    LEFT JOIN users u ON i.created_by = u.id
    WHERE i.organization_id = :organizationId
    AND (:search IS NULL OR i.invoice_number LIKE '%' || :search || '%' 
         OR c.name LIKE '%' || :search || '%')
    AND (:status IS NULL OR i.status = :status)
    AND (:customer_id IS NULL OR i.customer_id = :customer_id)
    AND (:date_from IS NULL OR i.date >= :date_from)
    AND (:date_to IS NULL OR i.date <= :date_to)
    ORDER BY i.created_at DESC
    LIMIT :limit OFFSET :offset
  `;

  try {
    const result = paginate(query, { 
      organizationId, 
      search: search || null, 
      status: status || null,
      customer_id: customer_id || null,
      date_from: date_from || null,
      date_to: date_to || null
    }, page, limit);
    res.json(result);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// Get invoice by ID with line items
router.get('/:id', authorizeOrganization, (req, res) => {
  const { id } = req.params;
  const { organizationId } = req.user;

  try {
    const invoice = db.prepare(`
      SELECT i.*, 
             c.name as customer_name,
             c.email as customer_email,
             c.phone as customer_phone,
             c.billing_address as customer_billing_address,
             c.shipping_address as customer_shipping_address,
             u.first_name || ' ' || u.last_name as created_by_name,
             so.order_number as sales_order_number
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      LEFT JOIN users u ON i.created_by = u.id
      LEFT JOIN sales_orders so ON i.sales_order_id = so.id
      WHERE i.id = ? AND i.organization_id = ?
    `).get(id, organizationId);

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Get line items
    const lineItems = db.prepare(`
      SELECT li.*, 
             i.name as item_name,
             i.sku as item_sku,
             t.name as tax_rate_name,
             t.rate as tax_rate
      FROM line_items li
      LEFT JOIN items i ON li.item_id = i.id
      LEFT JOIN tax_rates t ON li.tax_rate_id = t.id
      WHERE li.invoice_id = ? AND li.organization_id = ?
      ORDER BY li.created_at ASC
    `).all(id, organizationId);

    // Get payments
    const payments = db.prepare(`
      SELECT p.*, u.first_name || ' ' || u.last_name as created_by_name
      FROM payments p
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.invoice_id = ? AND p.organization_id = ?
      ORDER BY p.date DESC
    `).all(id, organizationId);

    res.json({
      ...invoice,
      lineItems,
      payments
    });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
});

// Create new invoice
router.post('/', authorizeOrganization, (req, res) => {
  const { organizationId } = req.user;
  const { lineItems, ...invoiceData } = req.body;
  
  const invoice = {
    id: generateId(),
    organization_id: organizationId,
    created_by: req.user.id,
    ...invoiceData
  };

  try {
    // Validate required fields
    if (!invoice.customer_id || !invoice.date || !invoice.due_date) {
      return res.status(400).json({ error: 'Customer, date, and due date are required' });
    }

    // Check if customer exists and belongs to organization
    const customer = db.prepare(`
      SELECT id FROM customers 
      WHERE id = ? AND organization_id = ?
    `).get(invoice.customer_id, organizationId);

    if (!customer) {
      return res.status(400).json({ error: 'Customer not found' });
    }

    // Generate invoice number
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

    invoice.invoice_number = invoiceNumber;

    // Calculate totals
    let subtotal = 0;
    let taxTotal = 0;

    if (lineItems && lineItems.length > 0) {
      lineItems.forEach(item => {
        const itemTotal = item.quantity * item.price;
        subtotal += itemTotal;
        taxTotal += item.tax_amount || 0;
      });
    }

    invoice.subtotal = subtotal;
    invoice.tax_total = taxTotal;
    invoice.total = subtotal + taxTotal;
    invoice.balance_due = invoice.total;

    // Insert invoice
    db.prepare(`
      INSERT INTO invoices (
        id, organization_id, invoice_number, customer_id, sales_order_id, date, due_date,
        status, currency, exchange_rate, notes, subtotal, tax_total, total, balance_due,
        recurring_id, created_by
      ) VALUES (
        @id, @organization_id, @invoice_number, @customer_id, @sales_order_id, @date, @due_date,
        @status, @currency, @exchange_rate, @notes, @subtotal, @tax_total, @total, @balance_due,
        @recurring_id, @created_by
      )
    `).run(invoice);

    // Insert line items
    if (lineItems && lineItems.length > 0) {
      lineItems.forEach(item => {
        const lineItem = {
          id: generateId(),
          organization_id: organizationId,
          invoice_id: invoice.id,
          item_id: item.item_id,
          description: item.description,
          quantity: item.quantity,
          price: item.price,
          tax_rate_id: item.tax_rate_id,
          tax_amount: item.tax_amount || 0,
          total: (item.quantity * item.price) + (item.tax_amount || 0)
        };

        db.prepare(`
          INSERT INTO line_items (
            id, organization_id, invoice_id, item_id, description, quantity, price,
            tax_rate_id, tax_amount, total
          ) VALUES (
            @id, @organization_id, @invoice_id, @item_id, @description, @quantity, @price,
            @tax_rate_id, @tax_amount, @total
          )
        `).run(lineItem);
      });
    }

    const newInvoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoice.id);
    res.status(201).json(newInvoice);
  } catch (error) {
    console.error('Error creating invoice:', error);
    res.status(500).json({ error: 'Failed to create invoice' });
  }
});

// Update invoice
router.put('/:id', authorizeOrganization, (req, res) => {
  const { id } = req.params;
  const { organizationId } = req.user;
  const { lineItems, ...updateData } = req.body;
  
  const invoice = { ...updateData, id, organization_id: organizationId };

  try {
    // Check if invoice exists and belongs to organization
    const existingInvoice = db.prepare(`
      SELECT id, status FROM invoices 
      WHERE id = ? AND organization_id = ?
    `).get(id, organizationId);

    if (!existingInvoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Don't allow updates to paid invoices
    if (existingInvoice.status === 'paid') {
      return res.status(400).json({ error: 'Cannot update paid invoice' });
    }

    // Calculate totals
    let subtotal = 0;
    let taxTotal = 0;

    if (lineItems && lineItems.length > 0) {
      lineItems.forEach(item => {
        const itemTotal = item.quantity * item.price;
        subtotal += itemTotal;
        taxTotal += item.tax_amount || 0;
      });
    }

    invoice.subtotal = subtotal;
    invoice.tax_total = taxTotal;
    invoice.total = subtotal + taxTotal;
    invoice.balance_due = invoice.total;

    const result = db.prepare(`
      UPDATE invoices 
      SET customer_id = @customer_id, sales_order_id = @sales_order_id, date = @date,
          due_date = @due_date, status = @status, currency = @currency, 
          exchange_rate = @exchange_rate, notes = @notes, subtotal = @subtotal,
          tax_total = @tax_total, total = @total, balance_due = @balance_due
      WHERE id = @id AND organization_id = @organization_id
    `).run(invoice);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Update line items
    if (lineItems) {
      // Delete existing line items
      db.prepare('DELETE FROM line_items WHERE invoice_id = ? AND organization_id = ?').run(id, organizationId);

      // Insert new line items
      lineItems.forEach(item => {
        const lineItem = {
          id: generateId(),
          organization_id: organizationId,
          invoice_id: id,
          item_id: item.item_id,
          description: item.description,
          quantity: item.quantity,
          price: item.price,
          tax_rate_id: item.tax_rate_id,
          tax_amount: item.tax_amount || 0,
          total: (item.quantity * item.price) + (item.tax_amount || 0)
        };

        db.prepare(`
          INSERT INTO line_items (
            id, organization_id, invoice_id, item_id, description, quantity, price,
            tax_rate_id, tax_amount, total
          ) VALUES (
            @id, @organization_id, @invoice_id, @item_id, @description, @quantity, @price,
            @tax_rate_id, @tax_amount, @total
          )
        `).run(lineItem);
      });
    }

    const updatedInvoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id);
    res.json(updatedInvoice);
  } catch (error) {
    console.error('Error updating invoice:', error);
    res.status(500).json({ error: 'Failed to update invoice' });
  }
});

// Delete invoice
router.delete('/:id', authorizeOrganization, (req, res) => {
  const { id } = req.params;
  const { organizationId } = req.user;

  try {
    // Check if invoice exists and belongs to organization
    const existingInvoice = db.prepare(`
      SELECT id, status FROM invoices 
      WHERE id = ? AND organization_id = ?
    `).get(id, organizationId);

    if (!existingInvoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Don't allow deletion of paid invoices
    if (existingInvoice.status === 'paid') {
      return res.status(400).json({ error: 'Cannot delete paid invoice' });
    }

    // Check if invoice has payments
    const hasPayments = db.prepare(`
      SELECT COUNT(*) as count FROM payments 
      WHERE invoice_id = ? AND organization_id = ?
    `).get(id, organizationId);

    if (hasPayments.count > 0) {
      return res.status(400).json({ error: 'Cannot delete invoice with payments' });
    }

    // Delete line items first
    db.prepare('DELETE FROM line_items WHERE invoice_id = ? AND organization_id = ?').run(id, organizationId);

    // Delete invoice
    const result = db.prepare('DELETE FROM invoices WHERE id = ? AND organization_id = ?').run(id, organizationId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    res.status(500).json({ error: 'Failed to delete invoice' });
  }
});

// Update invoice status
router.patch('/:id/status', authorizeOrganization, (req, res) => {
  const { id } = req.params;
  const { organizationId } = req.user;
  const { status } = req.body;

  try {
    const result = db.prepare(`
      UPDATE invoices 
      SET status = ?
      WHERE id = ? AND organization_id = ?
    `).run(status, id, organizationId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const updatedInvoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id);
    res.json(updatedInvoice);
  } catch (error) {
    console.error('Error updating invoice status:', error);
    res.status(500).json({ error: 'Failed to update invoice status' });
  }
});

// Get invoice statistics
router.get('/stats/summary', authorizeOrganization, (req, res) => {
  const { organizationId } = req.user;
  const { period = 'month' } = req.query;

  try {
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
        COUNT(*) as total_invoices,
        COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_invoices,
        COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue_invoices,
        COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_invoices,
        COALESCE(SUM(total), 0) as total_amount,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN total ELSE 0 END), 0) as paid_amount,
        COALESCE(SUM(balance_due), 0) as outstanding_amount,
        COALESCE(AVG(total), 0) as avg_invoice_value
      FROM invoices 
      WHERE organization_id = ? ${dateFilter}
    `).get(organizationId);

    res.json(stats);
  } catch (error) {
    console.error('Error fetching invoice stats:', error);
    res.status(500).json({ error: 'Failed to fetch invoice statistics' });
  }
});

export default router; 