# Ajuun Tex Backend Server

A comprehensive backend server for the Ajuun Tex accounting application, built with Node.js, Express, and SQLite.

## Features

### 🔐 Authentication & Authorization
- JWT-based authentication
- Role-based access control (admin, staff, accountant, viewer)
- Organization-based data isolation
- Password hashing with bcrypt
- Session management

### 📊 Core Business Features
- **Customer Management**: Complete CRUD with contact details, billing info, and transaction history
- **Vendor Management**: Supplier management with payment tracking
- **Item/Inventory Management**: Product and service catalog with stock tracking
- **Invoice Management**: Professional invoicing with line items and tax calculations
- **Bill Management**: Vendor bill tracking and payment management
- **Payment Processing**: Received and sent payment tracking
- **Category Management**: Hierarchical categorization for items and expenses
- **Tax Rate Management**: Configurable tax rates with automatic calculations

### 🛠️ Advanced Features
- **File Upload**: Support for images, PDFs, and documents
- **Bulk Import/Export**: Excel/CSV import and export functionality
- **PDF Generation**: Automatic invoice PDF generation
- **Audit Logging**: Complete audit trail for all data changes
- **Search & Filtering**: Advanced search with pagination
- **Statistics & Reporting**: Comprehensive analytics and reporting

### 🔒 Security Features
- Helmet.js for security headers
- Rate limiting to prevent abuse
- CORS configuration
- Input validation and sanitization
- SQL injection prevention with prepared statements
- File upload security

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `PUT /api/auth/password` - Change password

### Customers
- `GET /api/customers` - List customers with pagination and search
- `GET /api/customers/:id` - Get customer details with related data
- `POST /api/customers` - Create new customer
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer
- `GET /api/customers/:id/stats` - Get customer statistics

### Items
- `GET /api/items` - List items with pagination and search
- `GET /api/items/:id` - Get item details with related data
- `POST /api/items` - Create new item
- `PUT /api/items/:id` - Update item
- `DELETE /api/items/:id` - Delete item
- `PATCH /api/items/:id/quantity` - Update item quantity
- `GET /api/items/low-stock` - Get low stock items
- `GET /api/items/:id/stats` - Get item statistics

### Vendors
- `GET /api/vendors` - List vendors with pagination and search
- `GET /api/vendors/:id` - Get vendor details with related data
- `POST /api/vendors` - Create new vendor
- `PUT /api/vendors/:id` - Update vendor
- `DELETE /api/vendors/:id` - Delete vendor
- `GET /api/vendors/:id/stats` - Get vendor statistics

### Invoices
- `GET /api/invoices` - List invoices with pagination and search
- `GET /api/invoices/:id` - Get invoice details with line items
- `POST /api/invoices` - Create new invoice
- `PUT /api/invoices/:id` - Update invoice
- `DELETE /api/invoices/:id` - Delete invoice
- `PATCH /api/invoices/:id/status` - Update invoice status
- `GET /api/invoices/:id/pdf` - Generate PDF invoice
- `GET /api/invoices/stats/summary` - Get invoice statistics

### Bills
- `GET /api/bills` - List bills with pagination and search
- `GET /api/bills/:id` - Get bill details with line items
- `POST /api/bills` - Create new bill
- `PUT /api/bills/:id` - Update bill
- `DELETE /api/bills/:id` - Delete bill
- `PATCH /api/bills/:id/status` - Update bill status
- `GET /api/bills/stats/summary` - Get bill statistics

### Payments
- `GET /api/payments` - List payments with pagination and search
- `GET /api/payments/:id` - Get payment details
- `POST /api/payments` - Create new payment
- `PUT /api/payments/:id` - Update payment
- `DELETE /api/payments/:id` - Delete payment
- `GET /api/payments/stats/summary` - Get payment statistics

### Categories
- `GET /api/categories` - List categories with pagination and search
- `GET /api/categories/:id` - Get category details with subcategories
- `POST /api/categories` - Create new category
- `PUT /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Delete category
- `GET /api/categories/tree/:type` - Get category tree structure
- `GET /api/categories/:id/stats` - Get category statistics

### Tax Rates
- `GET /api/tax-rates` - List tax rates with pagination and search
- `GET /api/tax-rates/:id` - Get tax rate details with usage stats
- `POST /api/tax-rates` - Create new tax rate
- `PUT /api/tax-rates/:id` - Update tax rate
- `DELETE /api/tax-rates/:id` - Delete tax rate
- `POST /api/tax-rates/calculate` - Calculate tax for amount
- `GET /api/tax-rates/summary/period` - Get tax summary for period

### File Management
- `POST /api/upload` - Upload single file
- `POST /api/import/:type` - Bulk import data (customers, items, vendors)
- `GET /api/export/:type` - Export data (customers, items, invoices)

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics
- `GET /api/dashboard/recent` - Get recent transactions
- `GET /api/dashboard/charts` - Get chart data

## Database Schema

The application uses SQLite with the following main tables:

- **users** - User accounts and authentication
- **organizations** - Company/organization data
- **customers** - Customer information and billing details
- **vendors** - Vendor/supplier information
- **items** - Product and service catalog
- **categories** - Hierarchical categorization
- **tax_rates** - Tax rate configurations
- **invoices** - Sales invoices
- **bills** - Vendor bills
- **line_items** - Invoice and bill line items
- **payments** - Payment transactions
- **audit_logs** - Complete audit trail

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   Create a `.env` file:
   ```env
   PORT=3000
   JWT_SECRET=your-secret-key-here
   FRONTEND_URL=http://localhost:5173
   ```

4. **Start the server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## API Documentation

### Authentication Headers
All protected endpoints require a Bearer token:
```
Authorization: Bearer <jwt-token>
```

### Response Format
All API responses follow this format:
```json
{
  "data": [...],
  "page": 1,
  "totalPages": 5,
  "total": 50
}
```

### Error Handling
Errors are returned in this format:
```json
{
  "error": "Error message description"
}
```

## Security Considerations

- All passwords are hashed using bcrypt
- JWT tokens have expiration times
- Rate limiting prevents API abuse
- CORS is configured for specific origins
- Input validation prevents injection attacks
- File uploads are restricted by type and size

## Performance Features

- Database queries use prepared statements
- Pagination for large datasets
- Compression middleware for responses
- Efficient indexing on frequently queried fields
- Connection pooling for database operations

## Monitoring & Logging

- Request/response logging with timing
- Error logging with stack traces
- Audit logging for all data changes
- Health check endpoint for monitoring

## Development

### Running in Development
```bash
npm run dev
```

### Database Reset
To reset the database with sample data:
```bash
rm ajuun-tex.db
npm start
```

### Testing
```bash
npm test
```

## Deployment

### Production Considerations
- Set appropriate environment variables
- Use HTTPS in production
- Configure proper CORS origins
- Set up database backups
- Monitor server resources
- Use PM2 or similar for process management

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## Support

For issues and questions:
- Check the API documentation
- Review the error logs
- Contact the development team

## License

MIT License - see LICENSE file for details. 