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

// Get all bills with pagination and search
router.get('/', authorizeOrganization, (req, res) => {
  const { search, page = 1, limit = 10, status, vendor_id, date_from, date_to } = req.query;
  const { organizationId } = req.user;

  let query = `
    SELECT b.*, 
           v.name as vendor_name,
           v.email as vendor_email,
           u.first_name || ' ' || u.last_name as created_by_name
    FROM bills b
    LEFT JOIN vendors v ON b.vendor_id = v.id
    LEFT JOIN users u ON b.created_by = u.id
    WHERE b.organization_id = :organizationId
    AND (:search IS NULL OR b.bill_number LIKE '%' || :search || '%' 
         OR v.name LIKE '%' || :search || '%')
    AND (:status IS NULL OR b.status = :status)
    AND (:vendor_id IS NULL OR b.vendor_id = :vendor_id)
    AND (:date_from IS NULL OR b.date >= :date_from)
    AND (:date_to IS NULL OR b.date <= :date_to)
    ORDER BY b.created_at DESC
    LIMIT :limit OFFSET :offset
  `;

  try {
    const result = paginate(query, { 
      organizationId, 
      search: search || null, 
      status: status || null,
      vendor_id: vendor_id || null,
      date_from: date_from || null,
      date_to: date_to || null
    }, page, limit);
    res.json(result);
  } catch (error) {
    console.error('Error fetching bills:', error);
    res.status(500).json({ error: 'Failed to fetch bills' });
  }
});

// Get bill by ID with line items
router.get('/:id', authorizeOrganization, (req, res) => {
  const { id } = req.params;
  const { organizationId } = req.user;

  try {
    const bill = db.prepare(`
      SELECT b.*, 
             v.name as vendor_name,
             v.email as vendor_email,
             v.phone as vendor_phone,
             v.billing_address as vendor_billing_address,
             u.first_name || ' ' || u.last_name as created_by_name,
             po.po_number as purchase_order_number
      FROM bills b
      LEFT JOIN vendors v ON b.vendor_id = v.id
      LEFT JOIN users u ON b.created_by = u.id
      LEFT JOIN purchase_orders po ON b.purchase_order_id = po.id
      WHERE b.id = ? AND b.organization_id = ?
    `).get(id, organizationId);

    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
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
      WHERE li.bill_id = ? AND li.organization_id = ?
      ORDER BY li.created_at ASC
    `).all(id, organizationId);

    // Get payments
    const payments = db.prepare(`
      SELECT p.*, u.first_name || ' ' || u.last_name as created_by_name
      FROM payments p
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.bill_id = ? AND p.organization_id = ?
      ORDER BY p.date DESC
    `).all(id, organizationId);

    res.json({
      ...bill,
      lineItems,
      payments
    });
  } catch (error) {
    console.error('Error fetching bill:', error);
    res.status(500).json({ error: 'Failed to fetch bill' });
  }
});

// Create new bill
router.post('/', authorizeOrganization, (req, res) => {
  const { organizationId } = req.user;
  const { lineItems, ...billData } = req.body;
  
  const bill = {
    id: generateId(),
    organization_id: organizationId,
    created_by: req.user.id,
    ...billData
  };

  try {
    // Validate required fields
    if (!bill.vendor_id || !bill.date || !bill.due_date) {
      return res.status(400).json({ error: 'Vendor, date, and due date are required' });
    }

    // Check if vendor exists and belongs to organization
    const vendor = db.prepare(`
      SELECT id FROM vendors 
      WHERE id = ? AND organization_id = ?
    `).get(bill.vendor_id, organizationId);

    if (!vendor) {
      return res.status(400).json({ error: 'Vendor not found' });
    }

    // Generate bill number
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

    bill.bill_number = billNumber;

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

    bill.subtotal = subtotal;
    bill.tax_total = taxTotal;
    bill.total = subtotal + taxTotal;
    bill.balance_due = bill.total;

    // Insert bill
    db.prepare(`
      INSERT INTO bills (
        id, organization_id, bill_number, vendor_id, purchase_order_id, date, due_date,
        status, currency, exchange_rate, notes, subtotal, tax_total, total, balance_due,
        recurring_id, created_by
      ) VALUES (
        @id, @organization_id, @bill_number, @vendor_id, @purchase_order_id, @date, @due_date,
        @status, @currency, @exchange_rate, @notes, @subtotal, @tax_total, @total, @balance_due,
        @recurring_id, @created_by
      )
    `).run(bill);

    // Insert line items
    if (lineItems && lineItems.length > 0) {
      lineItems.forEach(item => {
        const lineItem = {
          id: generateId(),
          organization_id: organizationId,
          bill_id: bill.id,
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
            id, organization_id, bill_id, item_id, description, quantity, price,
            tax_rate_id, tax_amount, total
          ) VALUES (
            @id, @organization_id, @bill_id, @item_id, @description, @quantity, @price,
            @tax_rate_id, @tax_amount, @total
          )
        `).run(lineItem);
      });
    }

    const newBill = db.prepare('SELECT * FROM bills WHERE id = ?').get(bill.id);
    res.status(201).json(newBill);
  } catch (error) {
    console.error('Error creating bill:', error);
    res.status(500).json({ error: 'Failed to create bill' });
  }
});

// Update bill
router.put('/:id', authorizeOrganization, (req, res) => {
  const { id } = req.params;
  const { organizationId } = req.user;
  const { lineItems, ...updateData } = req.body;
  
  const bill = { ...updateData, id, organization_id: organizationId };

  try {
    // Check if bill exists and belongs to organization
    const existingBill = db.prepare(`
      SELECT id, status FROM bills 
      WHERE id = ? AND organization_id = ?
    `).get(id, organizationId);

    if (!existingBill) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    // Don't allow updates to paid bills
    if (existingBill.status === 'paid') {
      return res.status(400).json({ error: 'Cannot update paid bill' });
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

    bill.subtotal = subtotal;
    bill.tax_total = taxTotal;
    bill.total = subtotal + taxTotal;
    bill.balance_due = bill.total;

    const result = db.prepare(`
      UPDATE bills 
      SET vendor_id = @vendor_id, purchase_order_id = @purchase_order_id, date = @date,
          due_date = @due_date, status = @status, currency = @currency, 
          exchange_rate = @exchange_rate, notes = @notes, subtotal = @subtotal,
          tax_total = @tax_total, total = @total, balance_due = @balance_due
      WHERE id = @id AND organization_id = @organization_id
    `).run(bill);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    // Update line items
    if (lineItems) {
      // Delete existing line items
      db.prepare('DELETE FROM line_items WHERE bill_id = ? AND organization_id = ?').run(id, organizationId);

      // Insert new line items
      lineItems.forEach(item => {
        const lineItem = {
          id: generateId(),
          organization_id: organizationId,
          bill_id: id,
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
            id, organization_id, bill_id, item_id, description, quantity, price,
            tax_rate_id, tax_amount, total
          ) VALUES (
            @id, @organization_id, @bill_id, @item_id, @description, @quantity, @price,
            @tax_rate_id, @tax_amount, @total
          )
        `).run(lineItem);
      });
    }

    const updatedBill = db.prepare('SELECT * FROM bills WHERE id = ?').get(id);
    res.json(updatedBill);
  } catch (error) {
    console.error('Error updating bill:', error);
    res.status(500).json({ error: 'Failed to update bill' });
  }
});

// Delete bill
router.delete('/:id', authorizeOrganization, (req, res) => {
  const { id } = req.params;
  const { organizationId } = req.user;

  try {
    // Check if bill exists and belongs to organization
    const existingBill = db.prepare(`
      SELECT id, status FROM bills 
      WHERE id = ? AND organization_id = ?
    `).get(id, organizationId);

    if (!existingBill) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    // Don't allow deletion of paid bills
    if (existingBill.status === 'paid') {
      return res.status(400).json({ error: 'Cannot delete paid bill' });
    }

    // Check if bill has payments
    const hasPayments = db.prepare(`
      SELECT COUNT(*) as count FROM payments 
      WHERE bill_id = ? AND organization_id = ?
    `).get(id, organizationId);

    if (hasPayments.count > 0) {
      return res.status(400).json({ error: 'Cannot delete bill with payments' });
    }

    // Delete line items first
    db.prepare('DELETE FROM line_items WHERE bill_id = ? AND organization_id = ?').run(id, organizationId);

    // Delete bill
    const result = db.prepare('DELETE FROM bills WHERE id = ? AND organization_id = ?').run(id, organizationId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    res.json({ message: 'Bill deleted successfully' });
  } catch (error) {
    console.error('Error deleting bill:', error);
    res.status(500).json({ error: 'Failed to delete bill' });
  }
});

// Update bill status
router.patch('/:id/status', authorizeOrganization, (req, res) => {
  const { id } = req.params;
  const { organizationId } = req.user;
  const { status } = req.body;

  try {
    const result = db.prepare(`
      UPDATE bills 
      SET status = ?
      WHERE id = ? AND organization_id = ?
    `).run(status, id, organizationId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    const updatedBill = db.prepare('SELECT * FROM bills WHERE id = ?').get(id);
    res.json(updatedBill);
  } catch (error) {
    console.error('Error updating bill status:', error);
    res.status(500).json({ error: 'Failed to update bill status' });
  }
});

// Get bill statistics
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
        COUNT(*) as total_bills,
        COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_bills,
        COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue_bills,
        COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_bills,
        COALESCE(SUM(total), 0) as total_amount,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN total ELSE 0 END), 0) as paid_amount,
        COALESCE(SUM(balance_due), 0) as outstanding_amount,
        COALESCE(AVG(total), 0) as avg_bill_value
      FROM bills 
      WHERE organization_id = ? ${dateFilter}
    `).get(organizationId);

    res.json(stats);
  } catch (error) {
    console.error('Error fetching bill stats:', error);
    res.status(500).json({ error: 'Failed to fetch bill statistics' });
  }
});

export default router; 