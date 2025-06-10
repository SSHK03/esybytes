import express from 'express';
import { db, generateId } from '../database.js';
import { authorizeOrganization } from '../auth.js';

const router = express.Router();

// Get all categories with pagination and search
router.get('/', authorizeOrganization, (req, res) => {
  const { search, page = 1, limit = 50, type, parent_id } = req.query;
  const { organizationId } = req.user;

  let query = `
    SELECT c.*, 
           p.name as parent_name,
           COUNT(sc.id) as subcategory_count
    FROM categories c
    LEFT JOIN categories p ON c.parent_id = p.id
    LEFT JOIN categories sc ON c.id = sc.parent_id
    WHERE c.organization_id = :organizationId
    AND (:search IS NULL OR c.name LIKE '%' || :search || '%' 
         OR c.description LIKE '%' || :search || '%')
    AND (:type IS NULL OR c.type = :type)
    AND (:parent_id IS NULL OR c.parent_id = :parent_id)
    GROUP BY c.id
    ORDER BY c.type, c.name
    LIMIT :limit OFFSET :offset
  `;

  try {
    const offset = (page - 1) * limit;
    const countQuery = query.replace(/SELECT .* FROM/, 'SELECT COUNT(*) as total FROM').split('LIMIT')[0];
    const total = db.prepare(countQuery).get({ 
      organizationId, 
      search: search || null, 
      type: type || null,
      parent_id: parent_id || null
    }).total;
    
    const data = db.prepare(query).all({ 
      organizationId, 
      search: search || null, 
      type: type || null,
      parent_id: parent_id || null,
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
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Get category by ID
router.get('/:id', authorizeOrganization, (req, res) => {
  const { id } = req.params;
  const { organizationId } = req.user;

  try {
    const category = db.prepare(`
      SELECT c.*, p.name as parent_name
      FROM categories c
      LEFT JOIN categories p ON c.parent_id = p.id
      WHERE c.id = ? AND c.organization_id = ?
    `).get(id, organizationId);

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Get subcategories
    const subcategories = db.prepare(`
      SELECT * FROM categories 
      WHERE parent_id = ? AND organization_id = ?
      ORDER BY name
    `).all(id, organizationId);

    res.json({
      ...category,
      subcategories
    });
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({ error: 'Failed to fetch category' });
  }
});

// Create new category
router.post('/', authorizeOrganization, (req, res) => {
  const { organizationId } = req.user;
  const categoryData = {
    id: generateId(),
    organization_id: organizationId,
    ...req.body
  };

  try {
    // Validate required fields
    if (!categoryData.name || !categoryData.type) {
      return res.status(400).json({ error: 'Name and type are required' });
    }

    // Check if name already exists for this organization and type
    const existingCategory = db.prepare(`
      SELECT id FROM categories 
      WHERE name = ? AND type = ? AND organization_id = ?
    `).get(categoryData.name, categoryData.type, organizationId);

    if (existingCategory) {
      return res.status(400).json({ error: 'Category with this name already exists' });
    }

    // Validate parent category if provided
    if (categoryData.parent_id) {
      const parentCategory = db.prepare(`
        SELECT id, type FROM categories 
        WHERE id = ? AND organization_id = ?
      `).get(categoryData.parent_id, organizationId);

      if (!parentCategory) {
        return res.status(400).json({ error: 'Parent category not found' });
      }

      if (parentCategory.type !== categoryData.type) {
        return res.status(400).json({ error: 'Parent category must be of the same type' });
      }
    }

    db.prepare(`
      INSERT INTO categories (id, organization_id, name, description, type, parent_id, is_active)
      VALUES (@id, @organization_id, @name, @description, @type, @parent_id, @is_active)
    `).run(categoryData);

    const newCategory = db.prepare('SELECT * FROM categories WHERE id = ?').get(categoryData.id);
    res.status(201).json(newCategory);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Update category
router.put('/:id', authorizeOrganization, (req, res) => {
  const { id } = req.params;
  const { organizationId } = req.user;
  const updateData = { ...req.body, id, organization_id: organizationId };

  try {
    // Check if category exists and belongs to organization
    const existingCategory = db.prepare(`
      SELECT id FROM categories 
      WHERE id = ? AND organization_id = ?
    `).get(id, organizationId);

    if (!existingCategory) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Check if name is being changed and if it conflicts
    if (updateData.name) {
      const nameConflict = db.prepare(`
        SELECT id FROM categories 
        WHERE name = ? AND type = ? AND organization_id = ? AND id != ?
      `).get(updateData.name, updateData.type, organizationId, id);

      if (nameConflict) {
        return res.status(400).json({ error: 'Category with this name already exists' });
      }
    }

    // Validate parent category if being changed
    if (updateData.parent_id) {
      const parentCategory = db.prepare(`
        SELECT id, type FROM categories 
        WHERE id = ? AND organization_id = ?
      `).get(updateData.parent_id, organizationId);

      if (!parentCategory) {
        return res.status(400).json({ error: 'Parent category not found' });
      }

      if (parentCategory.type !== updateData.type) {
        return res.status(400).json({ error: 'Parent category must be of the same type' });
      }

      // Prevent circular reference
      if (updateData.parent_id === id) {
        return res.status(400).json({ error: 'Category cannot be its own parent' });
      }
    }

    const result = db.prepare(`
      UPDATE categories 
      SET name = @name, description = @description, type = @type, 
          parent_id = @parent_id, is_active = @is_active
      WHERE id = @id AND organization_id = @organization_id
    `).run(updateData);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const updatedCategory = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    res.json(updatedCategory);
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// Delete category
router.delete('/:id', authorizeOrganization, (req, res) => {
  const { id } = req.params;
  const { organizationId } = req.user;

  try {
    // Check if category has subcategories
    const hasSubcategories = db.prepare(`
      SELECT COUNT(*) as count FROM categories 
      WHERE parent_id = ? AND organization_id = ?
    `).get(id, organizationId);

    if (hasSubcategories.count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete category with subcategories. Please delete subcategories first.' 
      });
    }

    // Check if category is used in items
    const usedInItems = db.prepare(`
      SELECT COUNT(*) as count FROM items 
      WHERE category_id = ? AND organization_id = ?
    `).get(id, organizationId);

    if (usedInItems.count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete category that is used by items. Consider deactivating instead.' 
      });
    }

    // Check if category is used in expenses
    const usedInExpenses = db.prepare(`
      SELECT COUNT(*) as count FROM expenses 
      WHERE category_id = ? AND organization_id = ?
    `).get(id, organizationId);

    if (usedInExpenses.count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete category that is used by expenses. Consider deactivating instead.' 
      });
    }

    const result = db.prepare(`
      DELETE FROM categories 
      WHERE id = ? AND organization_id = ?
    `).run(id, organizationId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// Get category tree (hierarchical structure)
router.get('/tree/:type', authorizeOrganization, (req, res) => {
  const { type } = req.params;
  const { organizationId } = req.user;

  try {
    const categories = db.prepare(`
      SELECT * FROM categories 
      WHERE type = ? AND organization_id = ? AND is_active = 1
      ORDER BY name
    `).all(type, organizationId);

    // Build hierarchical structure
    const buildTree = (parentId = null) => {
      return categories
        .filter(cat => cat.parent_id === parentId)
        .map(cat => ({
          ...cat,
          children: buildTree(cat.id)
        }));
    };

    const tree = buildTree();
    res.json(tree);
  } catch (error) {
    console.error('Error fetching category tree:', error);
    res.status(500).json({ error: 'Failed to fetch category tree' });
  }
});

// Get category statistics
router.get('/:id/stats', authorizeOrganization, (req, res) => {
  const { id } = req.params;
  const { organizationId } = req.user;

  try {
    const stats = db.prepare(`
      SELECT 
        COUNT(DISTINCT i.id) as item_count,
        COUNT(DISTINCT e.id) as expense_count,
        COALESCE(SUM(e.total_amount), 0) as total_expense_amount
      FROM categories c
      LEFT JOIN items i ON c.id = i.category_id
      LEFT JOIN expenses e ON c.id = e.category_id
      WHERE c.id = ? AND c.organization_id = ?
    `).get(id, organizationId);

    res.json(stats);
  } catch (error) {
    console.error('Error fetching category stats:', error);
    res.status(500).json({ error: 'Failed to fetch category statistics' });
  }
});

export default router; 