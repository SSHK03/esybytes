import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import { db, generateId } from './database.js';
import multer from 'multer';
import xlsx from 'xlsx';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Import routes
import authRoutes from './routes/auth.js';
import dashboardRoutes from './routes/dashboard.js';
import customerRoutes from './routes/customers.js';
import itemRoutes from './routes/items.js';
import vendorRoutes from './routes/vendors.js';
import invoiceRoutes from './routes/invoices.js';
import billRoutes from './routes/bills.js';
import paymentRoutes from './routes/payments.js';
import categoryRoutes from './routes/categories.js';
import taxRateRoutes from './routes/tax-rates.js';

import { authenticateToken, authorizeOrganization } from './auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Compression middleware
app.use(compression());

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: 'connected'
  });
});

// Authentication routes (no auth required)
app.use('/api/auth', authRoutes);

// Protected routes middleware
app.use('/api', authenticateToken);

// API routes
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/tax-rates', taxRateRoutes);

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|csv/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image, PDF, and document files are allowed!'));
    }
  }
});

// File upload endpoint
app.post('/api/upload', authorizeOrganization, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    res.json({
      filename: req.file.filename,
      originalname: req.file.originalname,
      size: req.file.size,
      path: `/uploads/${req.file.filename}`
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Bulk import endpoint
app.post('/api/import/:type', authorizeOrganization, upload.single('file'), (req, res) => {
  const { type } = req.params;
  const { organizationId } = req.user;

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    let results = { success: 0, errors: [] };

    switch (type) {
      case 'customers':
        results = importCustomers(data, organizationId);
        break;
      case 'items':
        results = importItems(data, organizationId);
        break;
      case 'vendors':
        results = importVendors(data, organizationId);
        break;
      default:
        return res.status(400).json({ error: 'Invalid import type' });
    }

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json(results);
  } catch (error) {
    console.error('Error importing data:', error);
    res.status(500).json({ error: 'Failed to import data' });
  }
});

// Export endpoint
app.get('/api/export/:type', authorizeOrganization, (req, res) => {
  const { type } = req.params;
  const { organizationId } = req.user;
  const { format = 'xlsx' } = req.query;

  try {
    let data = [];
    let filename = '';

    switch (type) {
      case 'customers':
        data = db.prepare(`
          SELECT name, email, phone, company_name, gstin, billing_address, created_at
          FROM customers 
          WHERE organization_id = ?
          ORDER BY created_at DESC
        `).all(organizationId);
        filename = 'customers';
        break;
      case 'items':
        data = db.prepare(`
          SELECT name, sku, description, type, price, quantity, unit, created_at
          FROM items 
          WHERE organization_id = ?
          ORDER BY created_at DESC
        `).all(organizationId);
        filename = 'items';
        break;
      case 'invoices':
        data = db.prepare(`
          SELECT i.invoice_number, c.name as customer_name, i.date, i.total, i.status
          FROM invoices i
          LEFT JOIN customers c ON i.customer_id = c.id
          WHERE i.organization_id = ?
          ORDER BY i.date DESC
        `).all(organizationId);
        filename = 'invoices';
        break;
      default:
        return res.status(400).json({ error: 'Invalid export type' });
    }

    if (format === 'csv') {
      const csv = convertToCSV(data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      res.send(csv);
    } else {
      const workbook = xlsx.utils.book_new();
      const worksheet = xlsx.utils.json_to_sheet(data);
      xlsx.utils.book_append_sheet(workbook, worksheet, 'Data');
      
      const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
      res.send(buffer);
    }
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// Generate PDF invoice
app.get('/api/invoices/:id/pdf', authorizeOrganization, (req, res) => {
  const { id } = req.params;
  const { organizationId } = req.user;

  try {
    const invoice = db.prepare(`
      SELECT i.*, 
             c.name as customer_name,
             c.email as customer_email,
             c.billing_address as customer_billing_address,
             cs.company_name,
             cs.address as company_address,
             cs.gstin as company_gstin
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      LEFT JOIN company_settings cs ON i.organization_id = cs.organization_id
      WHERE i.id = ? AND i.organization_id = ?
    `).get(id, organizationId);

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const lineItems = db.prepare(`
      SELECT li.*, i.name as item_name, t.name as tax_rate_name
      FROM line_items li
      LEFT JOIN items i ON li.item_id = i.id
      LEFT JOIN tax_rates t ON li.tax_rate_id = t.id
      WHERE li.invoice_id = ? AND li.organization_id = ?
    `).all(id, organizationId);

    // Generate PDF
    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoice.invoice_number}.pdf"`);
    doc.pipe(res);

    // PDF content
    doc.fontSize(20).text(invoice.company_name || 'Company Name', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text('INVOICE', { align: 'center' });
    doc.moveDown();

    // Invoice details
    doc.fontSize(10);
    doc.text(`Invoice Number: ${invoice.invoice_number}`);
    doc.text(`Date: ${invoice.date}`);
    doc.text(`Due Date: ${invoice.due_date}`);
    doc.moveDown();

    // Customer details
    doc.text('Bill To:');
    doc.text(invoice.customer_name);
    doc.text(invoice.customer_billing_address);
    doc.moveDown();

    // Line items table
    doc.text('Description', 50, doc.y);
    doc.text('Qty', 300, doc.y);
    doc.text('Price', 350, doc.y);
    doc.text('Total', 450, doc.y);
    doc.moveDown();

    lineItems.forEach(item => {
      doc.text(item.description || item.item_name, 50, doc.y);
      doc.text(item.quantity.toString(), 300, doc.y);
      doc.text(`₹${item.price}`, 350, doc.y);
      doc.text(`₹${item.total}`, 450, doc.y);
      doc.moveDown();
    });

    // Totals
    doc.text(`Subtotal: ₹${invoice.subtotal}`, { align: 'right' });
    doc.text(`Tax: ₹${invoice.tax_total}`, { align: 'right' });
    doc.text(`Total: ₹${invoice.total}`, { align: 'right' });

    doc.end();
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// Helper functions
function importCustomers(data, organizationId) {
  const results = { success: 0, errors: [] };
  
  data.forEach((row, index) => {
    try {
      if (!row.name || !row.email) {
        results.errors.push(`Row ${index + 1}: Name and email are required`);
        return;
      }

      const customer = {
        id: generateId(),
        organization_id: organizationId,
        name: row.name,
        email: row.email,
        phone: row.phone || null,
        company_name: row.company_name || null,
        gstin: row.gstin || null,
        billing_address: row.billing_address || null
      };

      db.prepare(`
        INSERT INTO customers (id, organization_id, name, email, phone, company_name, gstin, billing_address)
        VALUES (@id, @organization_id, @name, @email, @phone, @company_name, @gstin, @billing_address)
      `).run(customer);

      results.success++;
    } catch (error) {
      results.errors.push(`Row ${index + 1}: ${error.message}`);
    }
  });

  return results;
}

function importItems(data, organizationId) {
  const results = { success: 0, errors: [] };
  
  data.forEach((row, index) => {
    try {
      if (!row.name || !row.sku || !row.price) {
        results.errors.push(`Row ${index + 1}: Name, SKU, and price are required`);
        return;
      }

      const item = {
        id: generateId(),
        organization_id: organizationId,
        name: row.name,
        sku: row.sku,
        description: row.description || null,
        type: row.type || 'product',
        price: parseFloat(row.price),
        quantity: parseInt(row.quantity) || 0,
        unit: row.unit || 'piece'
      };

      db.prepare(`
        INSERT INTO items (id, organization_id, name, sku, description, type, price, quantity, unit)
        VALUES (@id, @organization_id, @name, @sku, @description, @type, @price, @quantity, @unit)
      `).run(item);

      results.success++;
    } catch (error) {
      results.errors.push(`Row ${index + 1}: ${error.message}`);
    }
  });

  return results;
}

function importVendors(data, organizationId) {
  const results = { success: 0, errors: [] };
  
  data.forEach((row, index) => {
    try {
      if (!row.name || !row.email) {
        results.errors.push(`Row ${index + 1}: Name and email are required`);
        return;
      }

      const vendor = {
        id: generateId(),
        organization_id: organizationId,
        name: row.name,
        email: row.email,
        phone: row.phone || null,
        company_name: row.company_name || null,
        gstin: row.gstin || null,
        billing_address: row.billing_address || null
      };

      db.prepare(`
        INSERT INTO vendors (id, organization_id, name, email, phone, company_name, gstin, billing_address)
        VALUES (@id, @organization_id, @name, @email, @phone, @company_name, @gstin, @billing_address)
      `).run(vendor);

      results.success++;
    } catch (error) {
      results.errors.push(`Row ${index + 1}: ${error.message}`);
    }
  });

  return results;
}

function convertToCSV(data) {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
  ].join('\n');
  
  return csvContent;
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
    }
  }
  
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
});

export default app;
