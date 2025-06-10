import express from 'express';
import { db } from '../database.js';

const router = express.Router();

// Get dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;

    // Get total revenue (sum of all paid invoices)
    const totalRevenue = db.prepare(`
      SELECT COALESCE(SUM(total), 0) as total 
      FROM invoices 
      WHERE organization_id = ? AND status = 'paid'
    `).get(organizationId).total;

    // Get total expenses
    const totalExpenses = db.prepare(`
      SELECT COALESCE(SUM(total_amount), 0) as total 
      FROM expenses 
      WHERE organization_id = ? AND status = 'paid'
    `).get(organizationId).total;

    // Get outstanding invoices count
    const outstandingInvoices = db.prepare(`
      SELECT COUNT(*) as count 
      FROM invoices 
      WHERE organization_id = ? AND status IN ('sent', 'overdue')
    `).get(organizationId).count;

    // Get overdue invoices count
    const overdueInvoices = db.prepare(`
      SELECT COUNT(*) as count 
      FROM invoices 
      WHERE organization_id = ? AND status = 'overdue'
    `).get(organizationId).count;

    // Get total customers
    const totalCustomers = db.prepare(`
      SELECT COUNT(*) as count 
      FROM customers 
      WHERE organization_id = ? AND is_active = 1
    `).get(organizationId).count;

    // Get total vendors
    const totalVendors = db.prepare(`
      SELECT COUNT(*) as count 
      FROM vendors 
      WHERE organization_id = ? AND is_active = 1
    `).get(organizationId).count;

    // Get recent transactions
    const recentTransactions = db.prepare(`
      SELECT t.*, c.name as category_name
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.organization_id = ?
      ORDER BY t.created_at DESC
      LIMIT 10
    `).all(organizationId);

    // Get top customers by revenue
    const topCustomers = db.prepare(`
      SELECT c.name, c.email, COALESCE(SUM(i.total), 0) as total
      FROM customers c
      LEFT JOIN invoices i ON c.id = i.customer_id AND i.status = 'paid'
      WHERE c.organization_id = ? AND c.is_active = 1
      GROUP BY c.id
      ORDER BY total DESC
      LIMIT 5
    `).all(organizationId);

    // Get upcoming payments (invoices due in next 30 days)
    const upcomingPayments = db.prepare(`
      SELECT i.invoice_number, i.due_date, i.total as amount, c.name as customer_name
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      WHERE i.organization_id = ? 
        AND i.status IN ('sent', 'overdue')
        AND i.due_date <= date('now', '+30 days')
      ORDER BY i.due_date ASC
      LIMIT 5
    `).all(organizationId);

    res.json({
      totalRevenue,
      totalExpenses,
      outstandingInvoices,
      overdueInvoices,
      totalCustomers,
      totalVendors,
      recentTransactions,
      topCustomers,
      upcomingPayments
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get chart data for revenue trends
router.get('/revenue-trends', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { period = 'monthly' } = req.query;

    let dateFormat, groupBy;
    if (period === 'monthly') {
      dateFormat = '%Y-%m';
      groupBy = 'strftime(?, i.date)';
    } else if (period === 'weekly') {
      dateFormat = '%Y-W%W';
      groupBy = 'strftime(?, i.date)';
    } else {
      dateFormat = '%Y-%m-%d';
      groupBy = 'strftime(?, i.date)';
    }

    const revenueTrends = db.prepare(`
      SELECT 
        ${groupBy} as period,
        COALESCE(SUM(i.total), 0) as revenue,
        COUNT(i.id) as invoice_count
      FROM invoices i
      WHERE i.organization_id = ? 
        AND i.status = 'paid'
        AND i.date >= date('now', '-12 months')
      GROUP BY period
      ORDER BY period ASC
    `).all(organizationId, dateFormat);

    res.json(revenueTrends);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get expense breakdown by category
router.get('/expense-breakdown', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;

    const expenseBreakdown = db.prepare(`
      SELECT 
        c.name as category,
        COALESCE(SUM(e.total_amount), 0) as total,
        COUNT(e.id) as count
      FROM expenses e
      LEFT JOIN categories c ON e.category_id = c.id
      WHERE e.organization_id = ? AND e.status = 'paid'
      GROUP BY c.id
      ORDER BY total DESC
    `).all(organizationId);

    res.json(expenseBreakdown);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get cash flow summary
router.get('/cash-flow', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;

    // Get cash inflows (payments received)
    const cashInflows = db.prepare(`
      SELECT 
        strftime('%Y-%m', p.date) as month,
        COALESCE(SUM(p.amount), 0) as amount
      FROM payments p
      WHERE p.organization_id = ? 
        AND p.type = 'received'
        AND p.date >= date('now', '-6 months')
      GROUP BY month
      ORDER BY month ASC
    `).all(organizationId);

    // Get cash outflows (payments sent + expenses)
    const cashOutflows = db.prepare(`
      SELECT 
        strftime('%Y-%m', date) as month,
        COALESCE(SUM(amount), 0) as amount
      FROM (
        SELECT p.date, p.amount
        FROM payments p
        WHERE p.organization_id = ? AND p.type = 'sent'
        UNION ALL
        SELECT e.date, e.total_amount as amount
        FROM expenses e
        WHERE e.organization_id = ? AND e.status = 'paid'
      )
      WHERE date >= date('now', '-6 months')
      GROUP BY month
      ORDER BY month ASC
    `).all(organizationId, organizationId);

    res.json({ cashInflows, cashOutflows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router; 