import express from 'express';
import cors from 'cors';
import { db, generateId } from './database.js';
import multer from 'multer';
import xlsx from 'xlsx';
import PDFDocument from 'pdfkit';
import fs from 'fs';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const upload = multer({ dest: 'uploads/' });

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

// Customers API
app.get('/api/customers', (req, res) => {
  const { search, page = 1, limit = 10 } = req.query;
  let query = `
    SELECT * FROM customers 
    WHERE (:search IS NULL OR name LIKE '%' || :search || '%' OR email LIKE '%' || :search || '%')
    ORDER BY created_at DESC
    LIMIT :limit OFFSET :offset
  `;
  try {
    const result = paginate(query, { search: search || null }, page, limit);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/customers', (req, res) => {
  const customer = { id: generateId(), ...req.body };
  try {
    db.prepare(`
      INSERT INTO customers (id, name, email, phone, company_name, gstin, pan_number, billing_address, shipping_address)
      VALUES (@id, @name, @email, @phone, @company_name, @gstin, @pan_number, @billing_address, @shipping_address)
    `).run(customer);
    res.status(201).json(customer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Items API
app.get('/api/items', (req, res) => {
  const { search, page = 1, limit = 10 } = req.query;
  let query = `
    SELECT * FROM items 
    WHERE (:search IS NULL OR name LIKE '%' || :search || '%' OR sku LIKE '%' || :search || '%')
    ORDER BY created_at DESC
    LIMIT :limit OFFSET :offset
  `;
  try {
    const result = paginate(query, { search: search || null }, page, limit);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/items', (req, res) => {
  const item = { id: generateId(), ...req.body };
  try {
    db.prepare(`
      INSERT INTO items (id, name, sku, description, type, price, quantity, unit, tax, hsn_code)
      VALUES (@id, @name, @sku, @description, @type, @price, @quantity, @unit, @tax, @hsn_code)
    `).run(item);
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Sales Orders API
app.get('/api/sales-orders', (req, res) => {
  const { search, page = 1, limit = 10 } = req.query;
  let query = `
    SELECT so.*, c.name as customer_name 
    FROM sales_orders so
    LEFT JOIN customers c ON so.customer_id = c.id
    WHERE (:search IS NULL OR so.order_number LIKE '%' || :search || '%' OR c.name LIKE '%' || :search || '%')
    ORDER BY so.created_at DESC
    LIMIT :limit OFFSET :offset
  `;
  try {
    const result = paginate(query, { search: search || null }, page, limit);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/sales-orders', (req, res) => {
  const { items, ...orderData } = req.body;
  const orderId = generateId();
  const order = { id: orderId, ...orderData };

  try {
    db.transaction(() => {
      db.prepare(`
        INSERT INTO sales_orders (
          id, order_number, customer_id, date, due_date, status,
          notes, subtotal, tax_total, total
        )
        VALUES (
          @id, @order_number, @customer_id, @date, @due_date, @status,
          @notes, @subtotal, @tax_total, @total
        )
      `).run(order);

      const insertLineItem = db.prepare(`
        INSERT INTO line_items (
          id, item_id, description, quantity, price, tax,
          total, sales_order_id
        )
        VALUES (
          @id, @item_id, @description, @quantity, @price, @tax,
          @total, @sales_order_id
        )
      `);

      const updateItemQuantity = db.prepare(`
        UPDATE items SET quantity = quantity - @quantity WHERE id = @item_id
      `);

      items.forEach(item => {
        const lineItem = { id: generateId(), ...item, sales_order_id: orderId };
        insertLineItem.run(lineItem);
        if (order.status === 'delivered') {
          updateItemQuantity.run({ item_id: item.item_id, quantity: item.quantity });
        }
      });
    })();
    res.status(201).json({ id: orderId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Invoices API
app.get('/api/invoices', (req, res) => {
  const { search, page = 1, limit = 10 } = req.query;
  let query = `
    SELECT i.*, c.name as customer_name 
    FROM invoices i
    LEFT JOIN customers c ON i.customer_id = c.id
    WHERE (:search IS NULL OR i.invoice_number LIKE '%' || :search || '%' OR c.name LIKE '%' || :search || '%')
    ORDER BY i.created_at DESC
    LIMIT :limit OFFSET :offset
  `;
  try {
    const result = paginate(query, { search: search || null }, page, limit);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/invoices', (req, res) => {
  const { items, ...invoiceData } = req.body;
  const invoiceId = generateId();
  const invoice = { id: invoiceId, ...invoiceData };

  try {
    db.transaction(() => {
      db.prepare(`
        INSERT INTO invoices (
          id, invoice_number, customer_id, sales_order_id, date,
          due_date, status, notes, subtotal, tax_total, total
        )
        VALUES (
          @id, @invoice_number, @customer_id, @sales_order_id, @date,
          @due_date, @status, @notes, @subtotal, @tax_total, @total
        )
      `).run(invoice);

      const insertLineItem = db.prepare(`
        INSERT INTO line_items (
          id, item_id, description, quantity, price, tax,
          total, invoice_id
        )
        VALUES (
          @id, @item_id, @description, @quantity, @price, @tax,
          @total, @invoice_id
        )
      `);

      items.forEach(item => {
        const lineItem = { id: generateId(), ...item, invoice_id: invoiceId };
        insertLineItem.run(lineItem);
      });
    })();
    res.status(201).json({ id: invoiceId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Excel Upload for Items
app.post('/api/import/items-excel', upload.single('file'), (req, res) => {
  try {
    const workbook = xlsx.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);

    db.transaction(() => {
      const insert = db.prepare(`
        INSERT INTO items (id, name, sku, description, type, price, quantity, unit, tax, hsn_code)
        VALUES (@id, @name, @sku, @description, @type, @price, @quantity, @unit, @tax, @hsn_code)
      `);
      data.forEach(row => {
        insert.run({
          id: generateId(),
          name: row.name,
          sku: row.sku,
          description: row.description,
          type: row.type,
          price: row.price,
          quantity: row.quantity,
          unit: row.unit,
          tax: row.tax,
          hsn_code: row.hsn_code
        });
      });
    })();

    fs.unlinkSync(req.file.path);
    res.json({ success: true, count: data.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PDF Invoice Generator
app.get('/api/invoices/:id/pdf', (req, res) => {
  const invoice = db.prepare(`SELECT * FROM invoices WHERE id = ?`).get(req.params.id);
  if (!invoice) return res.status(404).send('Invoice not found');

  const customer = db.prepare(`SELECT * FROM customers WHERE id = ?`).get(invoice.customer_id);
  const items = db.prepare(`SELECT * FROM line_items WHERE invoice_id = ?`).all(req.params.id);

  const doc = new PDFDocument();
  res.setHeader('Content-disposition', `attachment; filename=invoice-${invoice.invoice_number}.pdf`);
  res.setHeader('Content-type', 'application/pdf');
  doc.pipe(res);

  doc.fontSize(16).text('INVOICE', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Invoice Number: ${invoice.invoice_number}`);
  doc.text(`Date: ${invoice.date}`);
  doc.text(`Customer: ${customer.name}`);
  doc.text(`Total: ₹${invoice.total}`);
  doc.moveDown();
  doc.text('Items:', { underline: true });
  items.forEach((item, i) => {
    doc.text(`${i + 1}. ${item.description} - Qty: ${item.quantity} - ₹${item.price} - Tax: ₹${item.tax}`);
  });
  doc.end();
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
