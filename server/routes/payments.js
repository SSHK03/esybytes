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

// Get all payments with pagination and search
router.get('/', authorizeOrganization, (req, res) => {
  const { search, page = 1, limit = 10, type, date_from, date_to } = req.query;
  const { organizationId } = req.user;

  let query = `
    SELECT p.*, 
           c.name as customer_name,
           v.name as vendor_name,
           i.invoice_number,
           b.bill_number,
           u.first_name || ' ' || u.last_name as created_by_name
    FROM payments p
    LEFT JOIN customers c ON p.customer_id = c.id
    LEFT JOIN vendors v ON p.vendor_id = v.id
    LEFT JOIN invoices i ON p.invoice_id = i.id
    LEFT JOIN bills b ON p.bill_id = b.id
    LEFT JOIN users u ON p.created_by = u.id
    WHERE p.organization_id = :organizationId
    AND (:search IS NULL OR p.payment_number LIKE '%' || :search || '%' 
         OR c.name LIKE '%' || :search || '%' 
         OR v.name LIKE '%' || :search || '%')
    AND (:type IS NULL OR p.type = :type)
    AND (:date_from IS NULL OR p.date >= :date_from)
    AND (:date_to IS NULL OR p.date <= :date_to)
    ORDER BY p.created_at DESC
    LIMIT :limit OFFSET :offset
  `;

  try {
    const result = paginate(query, { 
      organizationId, 
      search: search || null, 
      type: type || null,
      date_from: date_from || null,
      date_to: date_to || null
    }, page, limit);
    res.json(result);
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// Get payment by ID
router.get('/:id', authorizeOrganization, (req, res) => {
  const { id } = req.params;
  const { organizationId } = req.user;

  try {
    const payment = db.prepare(`
      SELECT p.*, 
             c.name as customer_name,
             c.email as customer_email,
             v.name as vendor_name,
             v.email as vendor_email,
             i.invoice_number,
             i.total as invoice_total,
             b.bill_number,
             b.total as bill_total,
             u.first_name || ' ' || u.last_name as created_by_name
      FROM payments p
      LEFT JOIN customers c ON p.customer_id = c.id
      LEFT JOIN vendors v ON p.vendor_id = v.id
      LEFT JOIN invoices i ON p.invoice_id = i.id
      LEFT JOIN bills b ON p.bill_id = b.id
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.id = ? AND p.organization_id = ?
    `).get(id, organizationId);

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json(payment);
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({ error: 'Failed to fetch payment' });
  }
});

// Create new payment
router.post('/', authorizeOrganization, (req, res) => {
  const { organizationId } = req.user;
  const paymentData = {
    id: generateId(),
    organization_id: organizationId,
    created_by: req.user.id,
    ...req.body
  };

  try {
    // Validate required fields
    if (!paymentData.amount || !paymentData.payment_method || !paymentData.type) {
      return res.status(400).json({ error: 'Amount, payment method, and type are required' });
    }

    // Validate that either customer_id or vendor_id is provided
    if (!paymentData.customer_id && !paymentData.vendor_id) {
      return res.status(400).json({ error: 'Either customer or vendor must be specified' });
    }

    // Generate payment number
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

    paymentData.payment_number = paymentNumber;

    // Validate related records
    if (paymentData.invoice_id) {
      const invoice = db.prepare(`
        SELECT id, customer_id, balance_due FROM invoices 
        WHERE id = ? AND organization_id = ?
      `).get(paymentData.invoice_id, organizationId);

      if (!invoice) {
        return res.status(400).json({ error: 'Invoice not found' });
      }

      if (paymentData.customer_id && invoice.customer_id !== paymentData.customer_id) {
        return res.status(400).json({ error: 'Invoice does not belong to the specified customer' });
      }

      // Check if payment amount exceeds balance due
      if (paymentData.amount > invoice.balance_due) {
        return res.status(400).json({ error: 'Payment amount exceeds invoice balance due' });
      }
    }

    if (paymentData.bill_id) {
      const bill = db.prepare(`
        SELECT id, vendor_id, balance_due FROM bills 
        WHERE id = ? AND organization_id = ?
      `).get(paymentData.bill_id, organizationId);

      if (!bill) {
        return res.status(400).json({ error: 'Bill not found' });
      }

      if (paymentData.vendor_id && bill.vendor_id !== paymentData.vendor_id) {
        return res.status(400).json({ error: 'Bill does not belong to the specified vendor' });
      }

      // Check if payment amount exceeds balance due
      if (paymentData.amount > bill.balance_due) {
        return res.status(400).json({ error: 'Payment amount exceeds bill balance due' });
      }
    }

    // Insert payment
    db.prepare(`
      INSERT INTO payments (
        id, organization_id, payment_number, customer_id, vendor_id, invoice_id, bill_id,
        date, amount, currency, exchange_rate, payment_method, reference_number, notes, type, created_by
      ) VALUES (
        @id, @organization_id, @payment_number, @customer_id, @vendor_id, @invoice_id, @bill_id,
        @date, @amount, @currency, @exchange_rate, @payment_method, @reference_number, @notes, @type, @created_by
      )
    `).run(paymentData);

    // Update invoice balance if payment is for an invoice
    if (paymentData.invoice_id) {
      db.prepare(`
        UPDATE invoices 
        SET balance_due = balance_due - ?, 
            status = CASE WHEN balance_due - ? <= 0 THEN 'paid' ELSE status END
        WHERE id = ? AND organization_id = ?
      `).run(paymentData.amount, paymentData.amount, paymentData.invoice_id, organizationId);
    }

    // Update bill balance if payment is for a bill
    if (paymentData.bill_id) {
      db.prepare(`
        UPDATE bills 
        SET balance_due = balance_due - ?, 
            status = CASE WHEN balance_due - ? <= 0 THEN 'paid' ELSE status END
        WHERE id = ? AND organization_id = ?
      `).run(paymentData.amount, paymentData.amount, paymentData.bill_id, organizationId);
    }

    const newPayment = db.prepare('SELECT * FROM payments WHERE id = ?').get(paymentData.id);
    res.status(201).json(newPayment);
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

// Update payment
router.put('/:id', authorizeOrganization, (req, res) => {
  const { id } = req.params;
  const { organizationId } = req.user;
  const updateData = { ...req.body, id, organization_id: organizationId };

  try {
    // Check if payment exists and belongs to organization
    const existingPayment = db.prepare(`
      SELECT id, amount, invoice_id, bill_id FROM payments 
      WHERE id = ? AND organization_id = ?
    `).get(id, organizationId);

    if (!existingPayment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Revert previous payment effects
    if (existingPayment.invoice_id) {
      db.prepare(`
        UPDATE invoices 
        SET balance_due = balance_due + ?, 
            status = CASE WHEN balance_due + ? > 0 THEN 'sent' ELSE 'paid' END
        WHERE id = ? AND organization_id = ?
      `).run(existingPayment.amount, existingPayment.amount, existingPayment.invoice_id, organizationId);
    }

    if (existingPayment.bill_id) {
      db.prepare(`
        UPDATE bills 
        SET balance_due = balance_due + ?, 
            status = CASE WHEN balance_due + ? > 0 THEN 'sent' ELSE 'paid' END
        WHERE id = ? AND organization_id = ?
      `).run(existingPayment.amount, existingPayment.amount, existingPayment.bill_id, organizationId);
    }

    const result = db.prepare(`
      UPDATE payments 
      SET customer_id = @customer_id, vendor_id = @vendor_id, invoice_id = @invoice_id,
          bill_id = @bill_id, date = @date, amount = @amount, currency = @currency,
          exchange_rate = @exchange_rate, payment_method = @payment_method,
          reference_number = @reference_number, notes = @notes, type = @type
      WHERE id = @id AND organization_id = @organization_id
    `).run(updateData);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Apply new payment effects
    if (updateData.invoice_id) {
      db.prepare(`
        UPDATE invoices 
        SET balance_due = balance_due - ?, 
            status = CASE WHEN balance_due - ? <= 0 THEN 'paid' ELSE status END
        WHERE id = ? AND organization_id = ?
      `).run(updateData.amount, updateData.amount, updateData.invoice_id, organizationId);
    }

    if (updateData.bill_id) {
      db.prepare(`
        UPDATE bills 
        SET balance_due = balance_due - ?, 
            status = CASE WHEN balance_due - ? <= 0 THEN 'paid' ELSE status END
        WHERE id = ? AND organization_id = ?
      `).run(updateData.amount, updateData.amount, updateData.bill_id, organizationId);
    }

    const updatedPayment = db.prepare('SELECT * FROM payments WHERE id = ?').get(id);
    res.json(updatedPayment);
  } catch (error) {
    console.error('Error updating payment:', error);
    res.status(500).json({ error: 'Failed to update payment' });
  }
});

// Delete payment
router.delete('/:id', authorizeOrganization, (req, res) => {
  const { id } = req.params;
  const { organizationId } = req.user;

  try {
    // Check if payment exists and belongs to organization
    const existingPayment = db.prepare(`
      SELECT id, amount, invoice_id, bill_id FROM payments 
      WHERE id = ? AND organization_id = ?
    `).get(id, organizationId);

    if (!existingPayment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Revert payment effects
    if (existingPayment.invoice_id) {
      db.prepare(`
        UPDATE invoices 
        SET balance_due = balance_due + ?, 
            status = CASE WHEN balance_due + ? > 0 THEN 'sent' ELSE 'paid' END
        WHERE id = ? AND organization_id = ?
      `).run(existingPayment.amount, existingPayment.amount, existingPayment.invoice_id, organizationId);
    }

    if (existingPayment.bill_id) {
      db.prepare(`
        UPDATE bills 
        SET balance_due = balance_due + ?, 
            status = CASE WHEN balance_due + ? > 0 THEN 'sent' ELSE 'paid' END
        WHERE id = ? AND organization_id = ?
      `).run(existingPayment.amount, existingPayment.amount, existingPayment.bill_id, organizationId);
    }

    // Delete payment
    const result = db.prepare('DELETE FROM payments WHERE id = ? AND organization_id = ?').run(id, organizationId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json({ message: 'Payment deleted successfully' });
  } catch (error) {
    console.error('Error deleting payment:', error);
    res.status(500).json({ error: 'Failed to delete payment' });
  }
});

// Get payment statistics
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
        COUNT(*) as total_payments,
        COUNT(CASE WHEN type = 'received' THEN 1 END) as received_payments,
        COUNT(CASE WHEN type = 'sent' THEN 1 END) as sent_payments,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(SUM(CASE WHEN type = 'received' THEN amount ELSE 0 END), 0) as received_amount,
        COALESCE(SUM(CASE WHEN type = 'sent' THEN amount ELSE 0 END), 0) as sent_amount,
        COALESCE(AVG(amount), 0) as avg_payment_value
      FROM payments 
      WHERE organization_id = ? ${dateFilter}
    `).get(organizationId);

    res.json(stats);
  } catch (error) {
    console.error('Error fetching payment stats:', error);
    res.status(500).json({ error: 'Failed to fetch payment statistics' });
  }
});

export default router; 