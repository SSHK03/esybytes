import express from 'express';
import { db, generateId } from '../database.js';
import { authorizeOrganization } from '../auth.js';

const router = express.Router();

// Get all tax rates with pagination and search
router.get('/', authorizeOrganization, (req, res) => {
  const { search, page = 1, limit = 50, status } = req.query;
  const { organizationId } = req.user;

  let query = `
    SELECT t.*, 
           COUNT(DISTINCT i.id) as item_count,
           COUNT(DISTINCT li.id) as line_item_count
    FROM tax_rates t
    LEFT JOIN items i ON t.id = i.tax_rate_id
    LEFT JOIN line_items li ON t.id = li.tax_rate_id
    WHERE t.organization_id = :organizationId
    AND (:search IS NULL OR t.name LIKE '%' || :search || '%' 
         OR t.description LIKE '%' || :search || '%')
    AND (:status IS NULL OR t.is_active = :status)
    GROUP BY t.id
    ORDER BY t.rate ASC
    LIMIT :limit OFFSET :offset
  `;

  try {
    const offset = (page - 1) * limit;
    const countQuery = query.replace(/SELECT .* FROM/, 'SELECT COUNT(*) as total FROM').split('LIMIT')[0];
    const total = db.prepare(countQuery).get({ 
      organizationId, 
      search: search || null, 
      status: status === 'active' ? 1 : status === 'inactive' ? 0 : null 
    }).total;
    
    const data = db.prepare(query).all({ 
      organizationId, 
      search: search || null, 
      status: status === 'active' ? 1 : status === 'inactive' ? 0 : null,
      offset,
      limit
    });

    res.json({
      data,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    console.error('Error fetching tax rates:', error);
    res.status(500).json({ error: 'Failed to fetch tax rates' });
  }
});

// Get tax rate by ID
router.get('/:id', authorizeOrganization, (req, res) => {
  const { id } = req.params;
  const { organizationId } = req.user;

  try {
    const taxRate = db.prepare(`
      SELECT * FROM tax_rates 
      WHERE id = ? AND organization_id = ?
    `).get(id, organizationId);

    if (!taxRate) {
      return res.status(404).json({ error: 'Tax rate not found' });
    }

    // Get usage statistics
    const usage = db.prepare(`
      SELECT 
        COUNT(DISTINCT i.id) as item_count,
        COUNT(DISTINCT li.id) as line_item_count,
        COALESCE(SUM(li.tax_amount), 0) as total_tax_collected
      FROM tax_rates t
      LEFT JOIN items i ON t.id = i.tax_rate_id
      LEFT JOIN line_items li ON t.id = li.tax_rate_id
      WHERE t.id = ? AND t.organization_id = ?
    `).get(id, organizationId);

    res.json({
      ...taxRate,
      usage
    });
  } catch (error) {
    console.error('Error fetching tax rate:', error);
    res.status(500).json({ error: 'Failed to fetch tax rate' });
  }
});

// Create new tax rate
router.post('/', authorizeOrganization, (req, res) => {
  const { organizationId } = req.user;
  const taxRateData = {
    id: generateId(),
    organization_id: organizationId,
    ...req.body
  };

  try {
    // Validate required fields
    if (!taxRateData.name || taxRateData.rate === undefined || taxRateData.rate === null) {
      return res.status(400).json({ error: 'Name and rate are required' });
    }

    // Validate rate is a valid number
    const rate = parseFloat(taxRateData.rate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      return res.status(400).json({ error: 'Rate must be a valid number between 0 and 100' });
    }

    taxRateData.rate = rate;

    // Check if name already exists for this organization
    const existingTaxRate = db.prepare(`
      SELECT id FROM tax_rates 
      WHERE name = ? AND organization_id = ?
    `).get(taxRateData.name, organizationId);

    if (existingTaxRate) {
      return res.status(400).json({ error: 'Tax rate with this name already exists' });
    }

    db.prepare(`
      INSERT INTO tax_rates (id, organization_id, name, rate, description, is_active)
      VALUES (@id, @organization_id, @name, @rate, @description, @is_active)
    `).run(taxRateData);

    const newTaxRate = db.prepare('SELECT * FROM tax_rates WHERE id = ?').get(taxRateData.id);
    res.status(201).json(newTaxRate);
  } catch (error) {
    console.error('Error creating tax rate:', error);
    res.status(500).json({ error: 'Failed to create tax rate' });
  }
});

// Update tax rate
router.put('/:id', authorizeOrganization, (req, res) => {
  const { id } = req.params;
  const { organizationId } = req.user;
  const updateData = { ...req.body, id, organization_id: organizationId };

  try {
    // Check if tax rate exists and belongs to organization
    const existingTaxRate = db.prepare(`
      SELECT id FROM tax_rates 
      WHERE id = ? AND organization_id = ?
    `).get(id, organizationId);

    if (!existingTaxRate) {
      return res.status(404).json({ error: 'Tax rate not found' });
    }

    // Validate rate if being updated
    if (updateData.rate !== undefined && updateData.rate !== null) {
      const rate = parseFloat(updateData.rate);
      if (isNaN(rate) || rate < 0 || rate > 100) {
        return res.status(400).json({ error: 'Rate must be a valid number between 0 and 100' });
      }
      updateData.rate = rate;
    }

    // Check if name is being changed and if it conflicts
    if (updateData.name) {
      const nameConflict = db.prepare(`
        SELECT id FROM tax_rates 
        WHERE name = ? AND organization_id = ? AND id != ?
      `).get(updateData.name, organizationId, id);

      if (nameConflict) {
        return res.status(400).json({ error: 'Tax rate with this name already exists' });
      }
    }

    const result = db.prepare(`
      UPDATE tax_rates 
      SET name = @name, rate = @rate, description = @description, is_active = @is_active
      WHERE id = @id AND organization_id = @organization_id
    `).run(updateData);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Tax rate not found' });
    }

    const updatedTaxRate = db.prepare('SELECT * FROM tax_rates WHERE id = ?').get(id);
    res.json(updatedTaxRate);
  } catch (error) {
    console.error('Error updating tax rate:', error);
    res.status(500).json({ error: 'Failed to update tax rate' });
  }
});

// Delete tax rate
router.delete('/:id', authorizeOrganization, (req, res) => {
  const { id } = req.params;
  const { organizationId } = req.user;

  try {
    // Check if tax rate is used in items
    const usedInItems = db.prepare(`
      SELECT COUNT(*) as count FROM items 
      WHERE tax_rate_id = ? AND organization_id = ?
    `).get(id, organizationId);

    if (usedInItems.count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete tax rate that is used by items. Consider deactivating instead.' 
      });
    }

    // Check if tax rate is used in line items
    const usedInLineItems = db.prepare(`
      SELECT COUNT(*) as count FROM line_items 
      WHERE tax_rate_id = ? AND organization_id = ?
    `).get(id, organizationId);

    if (usedInLineItems.count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete tax rate that is used in transactions. Consider deactivating instead.' 
      });
    }

    const result = db.prepare(`
      DELETE FROM tax_rates 
      WHERE id = ? AND organization_id = ?
    `).run(id, organizationId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Tax rate not found' });
    }

    res.json({ message: 'Tax rate deleted successfully' });
  } catch (error) {
    console.error('Error deleting tax rate:', error);
    res.status(500).json({ error: 'Failed to delete tax rate' });
  }
});

// Calculate tax for a given amount
router.post('/calculate', authorizeOrganization, (req, res) => {
  const { amount, tax_rate_id } = req.body;
  const { organizationId } = req.user;

  try {
    if (!amount || !tax_rate_id) {
      return res.status(400).json({ error: 'Amount and tax_rate_id are required' });
    }

    const taxRate = db.prepare(`
      SELECT * FROM tax_rates 
      WHERE id = ? AND organization_id = ? AND is_active = 1
    `).get(tax_rate_id, organizationId);

    if (!taxRate) {
      return res.status(404).json({ error: 'Tax rate not found' });
    }

    const subtotal = parseFloat(amount);
    const taxAmount = (subtotal * taxRate.rate) / 100;
    const total = subtotal + taxAmount;

    res.json({
      subtotal,
      tax_rate: taxRate.rate,
      tax_amount: taxAmount,
      total
    });
  } catch (error) {
    console.error('Error calculating tax:', error);
    res.status(500).json({ error: 'Failed to calculate tax' });
  }
});

// Get tax summary for a period
router.get('/summary/period', authorizeOrganization, (req, res) => {
  const { organizationId } = req.user;
  const { date_from, date_to } = req.query;

  try {
    let dateFilter = '';
    if (date_from && date_to) {
      dateFilter = `AND i.date >= '${date_from}' AND i.date <= '${date_to}'`;
    }

    const summary = db.prepare(`
      SELECT 
        t.id,
        t.name,
        t.rate,
        COUNT(DISTINCT li.id) as transaction_count,
        COALESCE(SUM(li.tax_amount), 0) as total_tax_collected,
        COALESCE(SUM(li.total - li.tax_amount), 0) as total_taxable_amount
      FROM tax_rates t
      LEFT JOIN line_items li ON t.id = li.tax_rate_id
      LEFT JOIN invoices i ON li.invoice_id = i.id
      WHERE t.organization_id = ? ${dateFilter}
      GROUP BY t.id, t.name, t.rate
      ORDER BY t.rate ASC
    `).all(organizationId);

    res.json(summary);
  } catch (error) {
    console.error('Error fetching tax summary:', error);
    res.status(500).json({ error: 'Failed to fetch tax summary' });
  }
});

export default router; 