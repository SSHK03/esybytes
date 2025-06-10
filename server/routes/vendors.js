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

// Get all vendors with pagination and search
router.get('/', authorizeOrganization, (req, res) => {
  const { search, page = 1, limit = 10, status } = req.query;
  const { organizationId } = req.user;

  let query = `
    SELECT v.*, 
           COUNT(DISTINCT b.id) as bill_count,
           COUNT(DISTINCT po.id) as po_count,
           COALESCE(SUM(b.total), 0) as total_billed,
           COALESCE(SUM(b.balance_due), 0) as outstanding_balance
    FROM vendors v
    LEFT JOIN bills b ON v.id = b.vendor_id
    LEFT JOIN purchase_orders po ON v.id = po.vendor_id
    WHERE v.organization_id = :organizationId
    AND (:search IS NULL OR v.name LIKE '%' || :search || '%' 
         OR v.email LIKE '%' || :search || '%' 
         OR v.company_name LIKE '%' || :search || '%')
    AND (:status IS NULL OR v.is_active = :status)
    GROUP BY v.id
    ORDER BY v.created_at DESC
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
    console.error('Error fetching vendors:', error);
    res.status(500).json({ error: 'Failed to fetch vendors' });
  }
});

// Get vendor by ID with related data
router.get('/:id', authorizeOrganization, (req, res) => {
  const { id } = req.params;
  const { organizationId } = req.user;

  try {
    const vendor = db.prepare(`
      SELECT v.*, 
             COUNT(DISTINCT b.id) as bill_count,
             COUNT(DISTINCT po.id) as po_count,
             COALESCE(SUM(b.total), 0) as total_billed,
             COALESCE(SUM(b.balance_due), 0) as outstanding_balance
      FROM vendors v
      LEFT JOIN bills b ON v.id = b.vendor_id
      LEFT JOIN purchase_orders po ON v.id = po.vendor_id
      WHERE v.id = ? AND v.organization_id = ?
      GROUP BY v.id
    `).get(id, organizationId);

    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    // Get recent bills
    const recentBills = db.prepare(`
      SELECT id, bill_number, date, total, status, balance_due
      FROM bills 
      WHERE vendor_id = ? AND organization_id = ?
      ORDER BY date DESC 
      LIMIT 5
    `).all(id, organizationId);

    // Get recent purchase orders
    const recentPOs = db.prepare(`
      SELECT id, po_number, date, total, status
      FROM purchase_orders 
      WHERE vendor_id = ? AND organization_id = ?
      ORDER BY date DESC 
      LIMIT 5
    `).all(id, organizationId);

    res.json({
      ...vendor,
      recentBills,
      recentPOs
    });
  } catch (error) {
    console.error('Error fetching vendor:', error);
    res.status(500).json({ error: 'Failed to fetch vendor' });
  }
});

// Create new vendor
router.post('/', authorizeOrganization, (req, res) => {
  const { organizationId } = req.user;
  const vendorData = {
    id: generateId(),
    organization_id: organizationId,
    ...req.body
  };

  try {
    // Validate required fields
    if (!vendorData.name || !vendorData.email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    // Check if email already exists for this organization
    const existingVendor = db.prepare(`
      SELECT id FROM vendors 
      WHERE email = ? AND organization_id = ?
    `).get(vendorData.email, organizationId);

    if (existingVendor) {
      return res.status(400).json({ error: 'Vendor with this email already exists' });
    }

    db.prepare(`
      INSERT INTO vendors (
        id, organization_id, name, email, phone, company_name, gstin, 
        pan_number, billing_address, shipping_address, payment_terms, 
        currency, is_active
      ) VALUES (
        @id, @organization_id, @name, @email, @phone, @company_name, @gstin,
        @pan_number, @billing_address, @shipping_address, @payment_terms,
        @currency, @is_active
      )
    `).run(vendorData);

    const newVendor = db.prepare('SELECT * FROM vendors WHERE id = ?').get(vendorData.id);
    res.status(201).json(newVendor);
  } catch (error) {
    console.error('Error creating vendor:', error);
    res.status(500).json({ error: 'Failed to create vendor' });
  }
});

// Update vendor
router.put('/:id', authorizeOrganization, (req, res) => {
  const { id } = req.params;
  const { organizationId } = req.user;
  const updateData = { ...req.body, id, organization_id: organizationId };

  try {
    // Check if vendor exists and belongs to organization
    const existingVendor = db.prepare(`
      SELECT id FROM vendors 
      WHERE id = ? AND organization_id = ?
    `).get(id, organizationId);

    if (!existingVendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    // Check if email is being changed and if it conflicts
    if (updateData.email) {
      const emailConflict = db.prepare(`
        SELECT id FROM vendors 
        WHERE email = ? AND organization_id = ? AND id != ?
      `).get(updateData.email, organizationId, id);

      if (emailConflict) {
        return res.status(400).json({ error: 'Vendor with this email already exists' });
      }
    }

    const result = db.prepare(`
      UPDATE vendors 
      SET name = @name, email = @email, phone = @phone, company_name = @company_name,
          gstin = @gstin, pan_number = @pan_number, billing_address = @billing_address,
          shipping_address = @shipping_address, payment_terms = @payment_terms,
          currency = @currency, is_active = @is_active
      WHERE id = @id AND organization_id = @organization_id
    `).run(updateData);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    const updatedVendor = db.prepare('SELECT * FROM vendors WHERE id = ?').get(id);
    res.json(updatedVendor);
  } catch (error) {
    console.error('Error updating vendor:', error);
    res.status(500).json({ error: 'Failed to update vendor' });
  }
});

// Delete vendor
router.delete('/:id', authorizeOrganization, (req, res) => {
  const { id } = req.params;
  const { organizationId } = req.user;

  try {
    // Check if vendor has related records
    const hasBills = db.prepare(`
      SELECT COUNT(*) as count FROM bills 
      WHERE vendor_id = ? AND organization_id = ?
    `).get(id, organizationId);

    const hasPOs = db.prepare(`
      SELECT COUNT(*) as count FROM purchase_orders 
      WHERE vendor_id = ? AND organization_id = ?
    `).get(id, organizationId);

    if (hasBills.count > 0 || hasPOs.count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete vendor with existing bills or purchase orders. Consider deactivating instead.' 
      });
    }

    const result = db.prepare(`
      DELETE FROM vendors 
      WHERE id = ? AND organization_id = ?
    `).run(id, organizationId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    res.json({ message: 'Vendor deleted successfully' });
  } catch (error) {
    console.error('Error deleting vendor:', error);
    res.status(500).json({ error: 'Failed to delete vendor' });
  }
});

// Get vendor statistics
router.get('/:id/stats', authorizeOrganization, (req, res) => {
  const { id } = req.params;
  const { organizationId } = req.user;

  try {
    const stats = db.prepare(`
      SELECT 
        COUNT(DISTINCT b.id) as total_bills,
        COUNT(DISTINCT po.id) as total_pos,
        COALESCE(SUM(b.total), 0) as total_billed,
        COALESCE(SUM(b.balance_due), 0) as outstanding_balance,
        COALESCE(AVG(b.total), 0) as avg_bill_value,
        MAX(b.date) as last_bill_date,
        MAX(po.date) as last_po_date
      FROM vendors v
      LEFT JOIN bills b ON v.id = b.vendor_id
      LEFT JOIN purchase_orders po ON v.id = po.vendor_id
      WHERE v.id = ? AND v.organization_id = ?
    `).get(id, organizationId);

    res.json(stats);
  } catch (error) {
    console.error('Error fetching vendor stats:', error);
    res.status(500).json({ error: 'Failed to fetch vendor statistics' });
  }
});

export default router; 