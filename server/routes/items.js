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

// Get all items with pagination and search
router.get('/', authorizeOrganization, (req, res) => {
  const { search, page = 1, limit = 10, type, category, status } = req.query;
  const { organizationId } = req.user;

  let query = `
    SELECT i.*, 
           c.name as category_name,
           t.name as tax_rate_name,
           t.rate as tax_rate
    FROM items i
    LEFT JOIN categories c ON i.category_id = c.id
    LEFT JOIN tax_rates t ON i.tax_rate_id = t.id
    WHERE i.organization_id = :organizationId
    AND (:search IS NULL OR i.name LIKE '%' || :search || '%' 
         OR i.sku LIKE '%' || :search || '%' 
         OR i.description LIKE '%' || :search || '%')
    AND (:type IS NULL OR i.type = :type)
    AND (:category IS NULL OR i.category_id = :category)
    AND (:status IS NULL OR i.is_active = :status)
    ORDER BY i.created_at DESC
    LIMIT :limit OFFSET :offset
  `;

  try {
    const result = paginate(query, { 
      organizationId, 
      search: search || null, 
      type: type || null,
      category: category || null,
      status: status === 'active' ? 1 : status === 'inactive' ? 0 : null 
    }, page, limit);
    res.json(result);
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

// Get item by ID with related data
router.get('/:id', authorizeOrganization, (req, res) => {
  const { id } = req.params;
  const { organizationId } = req.user;

  try {
    const item = db.prepare(`
      SELECT i.*, 
             c.name as category_name,
             t.name as tax_rate_name,
             t.rate as tax_rate
      FROM items i
      LEFT JOIN categories c ON i.category_id = c.id
      LEFT JOIN tax_rates t ON i.tax_rate_id = t.id
      WHERE i.id = ? AND i.organization_id = ?
    `).get(id, organizationId);

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Get recent usage in invoices
    const recentInvoices = db.prepare(`
      SELECT li.invoice_id, i.invoice_number, i.date, li.quantity, li.total
      FROM line_items li
      JOIN invoices i ON li.invoice_id = i.id
      WHERE li.item_id = ? AND li.organization_id = ?
      ORDER BY i.date DESC 
      LIMIT 5
    `).all(id, organizationId);

    // Get recent usage in sales orders
    const recentOrders = db.prepare(`
      SELECT li.sales_order_id, so.order_number, so.date, li.quantity, li.total
      FROM line_items li
      JOIN sales_orders so ON li.sales_order_id = so.id
      WHERE li.item_id = ? AND li.organization_id = ?
      ORDER BY so.date DESC 
      LIMIT 5
    `).all(id, organizationId);

    res.json({
      ...item,
      recentInvoices,
      recentOrders
    });
  } catch (error) {
    console.error('Error fetching item:', error);
    res.status(500).json({ error: 'Failed to fetch item' });
  }
});

// Create new item
router.post('/', authorizeOrganization, (req, res) => {
  const { organizationId } = req.user;
  const itemData = {
    id: generateId(),
    organization_id: organizationId,
    ...req.body
  };

  try {
    // Validate required fields
    if (!itemData.name || !itemData.sku || !itemData.type) {
      return res.status(400).json({ error: 'Name, SKU, and type are required' });
    }

    // Check if SKU already exists for this organization
    const existingItem = db.prepare(`
      SELECT id FROM items 
      WHERE sku = ? AND organization_id = ?
    `).get(itemData.sku, organizationId);

    if (existingItem) {
      return res.status(400).json({ error: 'Item with this SKU already exists' });
    }

    db.prepare(`
      INSERT INTO items (
        id, organization_id, name, sku, description, type, price, cost_price,
        quantity, unit, tax_rate_id, hsn_code, category_id, reorder_level, is_active
      ) VALUES (
        @id, @organization_id, @name, @sku, @description, @type, @price, @cost_price,
        @quantity, @unit, @tax_rate_id, @hsn_code, @category_id, @reorder_level, @is_active
      )
    `).run(itemData);

    const newItem = db.prepare('SELECT * FROM items WHERE id = ?').get(itemData.id);
    res.status(201).json(newItem);
  } catch (error) {
    console.error('Error creating item:', error);
    res.status(500).json({ error: 'Failed to create item' });
  }
});

// Update item
router.put('/:id', authorizeOrganization, (req, res) => {
  const { id } = req.params;
  const { organizationId } = req.user;
  const updateData = { ...req.body, id, organization_id: organizationId };

  try {
    // Check if item exists and belongs to organization
    const existingItem = db.prepare(`
      SELECT id FROM items 
      WHERE id = ? AND organization_id = ?
    `).get(id, organizationId);

    if (!existingItem) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Check if SKU is being changed and if it conflicts
    if (updateData.sku) {
      const skuConflict = db.prepare(`
        SELECT id FROM items 
        WHERE sku = ? AND organization_id = ? AND id != ?
      `).get(updateData.sku, organizationId, id);

      if (skuConflict) {
        return res.status(400).json({ error: 'Item with this SKU already exists' });
      }
    }

    const result = db.prepare(`
      UPDATE items 
      SET name = @name, sku = @sku, description = @description, type = @type,
          price = @price, cost_price = @cost_price, quantity = @quantity, unit = @unit,
          tax_rate_id = @tax_rate_id, hsn_code = @hsn_code, category_id = @category_id,
          reorder_level = @reorder_level, is_active = @is_active
      WHERE id = @id AND organization_id = @organization_id
    `).run(updateData);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const updatedItem = db.prepare('SELECT * FROM items WHERE id = ?').get(id);
    res.json(updatedItem);
  } catch (error) {
    console.error('Error updating item:', error);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// Delete item
router.delete('/:id', authorizeOrganization, (req, res) => {
  const { id } = req.params;
  const { organizationId } = req.user;

  try {
    // Check if item has related records
    const hasLineItems = db.prepare(`
      SELECT COUNT(*) as count FROM line_items 
      WHERE item_id = ? AND organization_id = ?
    `).get(id, organizationId);

    if (hasLineItems.count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete item with existing line items. Consider deactivating instead.' 
      });
    }

    const result = db.prepare(`
      DELETE FROM items 
      WHERE id = ? AND organization_id = ?
    `).run(id, organizationId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// Update item quantity (for inventory management)
router.patch('/:id/quantity', authorizeOrganization, (req, res) => {
  const { id } = req.params;
  const { organizationId } = req.user;
  const { quantity, adjustment_type, reason } = req.body; // adjustment_type: 'add', 'subtract', 'set'

  try {
    // Check if item exists and belongs to organization
    const existingItem = db.prepare(`
      SELECT id, quantity FROM items 
      WHERE id = ? AND organization_id = ?
    `).get(id, organizationId);

    if (!existingItem) {
      return res.status(404).json({ error: 'Item not found' });
    }

    let newQuantity = existingItem.quantity;
    
    switch (adjustment_type) {
      case 'add':
        newQuantity += quantity;
        break;
      case 'subtract':
        newQuantity -= quantity;
        if (newQuantity < 0) {
          return res.status(400).json({ error: 'Insufficient stock' });
        }
        break;
      case 'set':
        newQuantity = quantity;
        break;
      default:
        return res.status(400).json({ error: 'Invalid adjustment type' });
    }

    const result = db.prepare(`
      UPDATE items 
      SET quantity = ?
      WHERE id = ? AND organization_id = ?
    `).run(newQuantity, id, organizationId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Log the inventory adjustment
    const auditLog = {
      id: generateId(),
      user_id: req.user.id,
      action: 'inventory_adjustment',
      table_name: 'items',
      record_id: id,
      old_values: JSON.stringify({ quantity: existingItem.quantity }),
      new_values: JSON.stringify({ quantity: newQuantity, reason }),
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    };

    db.prepare(`
      INSERT INTO audit_logs (id, user_id, action, table_name, record_id, old_values, new_values, ip_address, user_agent)
      VALUES (@id, @user_id, @action, @table_name, @record_id, @old_values, @new_values, @ip_address, @user_agent)
    `).run(auditLog);

    const updatedItem = db.prepare('SELECT * FROM items WHERE id = ?').get(id);
    res.json(updatedItem);
  } catch (error) {
    console.error('Error updating item quantity:', error);
    res.status(500).json({ error: 'Failed to update item quantity' });
  }
});

// Get low stock items
router.get('/low-stock', authorizeOrganization, (req, res) => {
  const { organizationId } = req.user;

  try {
    const lowStockItems = db.prepare(`
      SELECT i.*, c.name as category_name
      FROM items i
      LEFT JOIN categories c ON i.category_id = c.id
      WHERE i.organization_id = ? 
      AND i.quantity <= i.reorder_level 
      AND i.is_active = 1
      ORDER BY i.quantity ASC
    `).all(organizationId);

    res.json(lowStockItems);
  } catch (error) {
    console.error('Error fetching low stock items:', error);
    res.status(500).json({ error: 'Failed to fetch low stock items' });
  }
});

// Get item statistics
router.get('/:id/stats', authorizeOrganization, (req, res) => {
  const { id } = req.params;
  const { organizationId } = req.user;

  try {
    const stats = db.prepare(`
      SELECT 
        COUNT(DISTINCT li.invoice_id) as total_invoices,
        COUNT(DISTINCT li.sales_order_id) as total_orders,
        COALESCE(SUM(li.quantity), 0) as total_quantity_sold,
        COALESCE(SUM(li.total), 0) as total_revenue,
        COALESCE(AVG(li.price), 0) as avg_selling_price,
        MAX(i.date) as last_sold_date
      FROM items item
      LEFT JOIN line_items li ON item.id = li.item_id
      LEFT JOIN invoices i ON li.invoice_id = i.id
      WHERE item.id = ? AND item.organization_id = ?
    `).get(id, organizationId);

    res.json(stats);
  } catch (error) {
    console.error('Error fetching item stats:', error);
    res.status(500).json({ error: 'Failed to fetch item statistics' });
  }
});

export default router; 