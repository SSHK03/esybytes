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

// Get all customers with pagination and search
router.get('/', authorizeOrganization, (req, res) => {
  const { search, page = 1, limit = 10, status } = req.query;
  const { organizationId } = req.user;

  let query = `
    SELECT c.*, 
           COUNT(DISTINCT i.id) as invoice_count,
           COUNT(DISTINCT so.id) as order_count,
           COALESCE(SUM(i.total), 0) as total_invoiced,
           COALESCE(SUM(i.balance_due), 0) as outstanding_balance
    FROM customers c
    LEFT JOIN invoices i ON c.id = i.customer_id
    LEFT JOIN sales_orders so ON c.id = so.customer_id
    WHERE c.organization_id = :organizationId
    AND (:search IS NULL OR c.name LIKE '%' || :search || '%' 
         OR c.email LIKE '%' || :search || '%' 
         OR c.company_name LIKE '%' || :search || '%')
    AND (:status IS NULL OR c.is_active = :status)
    GROUP BY c.id
    ORDER BY c.created_at DESC
    LIMIT :limit OFFSET :offset
  `;

  try {
    const result = paginate(query, { 
      organizationId, 
      search: search || null, 
      status: status === 'active' ? 1 : status === 'inactive' ? 0 : null 
    }, page, limit);
    res.json(result);
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// Get customer by ID with related data
router.get('/:id', authorizeOrganization, (req, res) => {
  const { id } = req.params;
  const { organizationId } = req.user;

  try {
    const customer = db.prepare(`
      SELECT c.*, 
             COUNT(DISTINCT i.id) as invoice_count,
             COUNT(DISTINCT so.id) as order_count,
             COALESCE(SUM(i.total), 0) as total_invoiced,
             COALESCE(SUM(i.balance_due), 0) as outstanding_balance
      FROM customers c
      LEFT JOIN invoices i ON c.id = i.customer_id
      LEFT JOIN sales_orders so ON c.id = so.customer_id
      WHERE c.id = ? AND c.organization_id = ?
      GROUP BY c.id
    `).get(id, organizationId);

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Get recent invoices
    const recentInvoices = db.prepare(`
      SELECT id, invoice_number, date, total, status, balance_due
      FROM invoices 
      WHERE customer_id = ? AND organization_id = ?
      ORDER BY date DESC 
      LIMIT 5
    `).all(id, organizationId);

    // Get recent sales orders
    const recentOrders = db.prepare(`
      SELECT id, order_number, date, total, status
      FROM sales_orders 
      WHERE customer_id = ? AND organization_id = ?
      ORDER BY date DESC 
      LIMIT 5
    `).all(id, organizationId);

    res.json({
      ...customer,
      recentInvoices,
      recentOrders
    });
  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
});

// Create new customer
router.post('/', authorizeOrganization, (req, res) => {
  const { organizationId } = req.user;
  const customerData = {
    id: generateId(),
    organization_id: organizationId,
    ...req.body
  };

  try {
    // Validate required fields
    if (!customerData.name || !customerData.email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    // Check if email already exists for this organization
    const existingCustomer = db.prepare(`
      SELECT id FROM customers 
      WHERE email = ? AND organization_id = ?
    `).get(customerData.email, organizationId);

    if (existingCustomer) {
      return res.status(400).json({ error: 'Customer with this email already exists' });
    }

    db.prepare(`
      INSERT INTO customers (
        id, organization_id, name, email, phone, company_name, gstin, 
        pan_number, billing_address, shipping_address, credit_limit, 
        payment_terms, currency, is_active
      ) VALUES (
        @id, @organization_id, @name, @email, @phone, @company_name, @gstin,
        @pan_number, @billing_address, @shipping_address, @credit_limit,
        @payment_terms, @currency, @is_active
      )
    `).run(customerData);

    const newCustomer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerData.id);
    res.status(201).json(newCustomer);
  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

// Update customer
router.put('/:id', authorizeOrganization, (req, res) => {
  const { id } = req.params;
  const { organizationId } = req.user;
  const updateData = { ...req.body, id, organization_id: organizationId };

  try {
    // Check if customer exists and belongs to organization
    const existingCustomer = db.prepare(`
      SELECT id FROM customers 
      WHERE id = ? AND organization_id = ?
    `).get(id, organizationId);

    if (!existingCustomer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Check if email is being changed and if it conflicts
    if (updateData.email) {
      const emailConflict = db.prepare(`
        SELECT id FROM customers 
        WHERE email = ? AND organization_id = ? AND id != ?
      `).get(updateData.email, organizationId, id);

      if (emailConflict) {
        return res.status(400).json({ error: 'Customer with this email already exists' });
      }
    }

    const result = db.prepare(`
      UPDATE customers 
      SET name = @name, email = @email, phone = @phone, company_name = @company_name,
          gstin = @gstin, pan_number = @pan_number, billing_address = @billing_address,
          shipping_address = @shipping_address, credit_limit = @credit_limit,
          payment_terms = @payment_terms, currency = @currency, is_active = @is_active
      WHERE id = @id AND organization_id = @organization_id
    `).run(updateData);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const updatedCustomer = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
    res.json(updatedCustomer);
  } catch (error) {
    console.error('Error updating customer:', error);
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

// Delete customer
router.delete('/:id', authorizeOrganization, (req, res) => {
  const { id } = req.params;
  const { organizationId } = req.user;

  try {
    // Check if customer has related records
    const hasInvoices = db.prepare(`
      SELECT COUNT(*) as count FROM invoices 
      WHERE customer_id = ? AND organization_id = ?
    `).get(id, organizationId);

    const hasOrders = db.prepare(`
      SELECT COUNT(*) as count FROM sales_orders 
      WHERE customer_id = ? AND organization_id = ?
    `).get(id, organizationId);

    if (hasInvoices.count > 0 || hasOrders.count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete customer with existing invoices or orders. Consider deactivating instead.' 
      });
    }

    const result = db.prepare(`
      DELETE FROM customers 
      WHERE id = ? AND organization_id = ?
    `).run(id, organizationId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Error deleting customer:', error);
    res.status(500).json({ error: 'Failed to delete customer' });
  }
});

// Get customer statistics
router.get('/:id/stats', authorizeOrganization, (req, res) => {
  const { id } = req.params;
  const { organizationId } = req.user;

  try {
    const stats = db.prepare(`
      SELECT 
        COUNT(DISTINCT i.id) as total_invoices,
        COUNT(DISTINCT so.id) as total_orders,
        COALESCE(SUM(i.total), 0) as total_invoiced,
        COALESCE(SUM(i.balance_due), 0) as outstanding_balance,
        COALESCE(AVG(i.total), 0) as avg_invoice_value,
        MAX(i.date) as last_invoice_date,
        MAX(so.date) as last_order_date
      FROM customers c
      LEFT JOIN invoices i ON c.id = i.customer_id
      LEFT JOIN sales_orders so ON c.id = so.customer_id
      WHERE c.id = ? AND c.organization_id = ?
    `).get(id, organizationId);

    res.json(stats);
  } catch (error) {
    console.error('Error fetching customer stats:', error);
    res.status(500).json({ error: 'Failed to fetch customer statistics' });
  }
});

export default router; 