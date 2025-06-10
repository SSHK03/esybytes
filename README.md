# Ajuun Tex - Inventory Management System

A modern inventory management system built with React, TypeScript, and Node.js with SQLite database.

## Features

- **Customer Management**: Add, edit, and manage customer information
- **Item Management**: Manage products and services with SKU tracking
- **Sales Orders**: Create and track sales orders
- **Invoice Generation**: Generate and manage invoices
- **Excel Import**: Import items from Excel files
- **PDF Export**: Export invoices as PDF
- **Real-time Data**: All data is stored in SQLite database and synchronized

## Prerequisites

- Node.js (v20 or higher)
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd project
```

2. Install dependencies:
```bash
npm install
```

## Running the Application

### Start the Backend Server

1. Start the backend server (runs on port 3000):
```bash
npm run server
```

The server will:
- Create the SQLite database (`ajuun-tex.db`)
- Set up all required tables
- Start the API server on `http://localhost:3000`

### Start the Frontend

2. In a new terminal, start the frontend development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:5173` (or another port if 5173 is busy).

## API Endpoints

The backend provides the following API endpoints:

### Customers
- `GET /api/customers` - Get all customers (with pagination and search)
- `GET /api/customers/:id` - Get customer by ID
- `POST /api/customers` - Create new customer
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer

### Items
- `GET /api/items` - Get all items (with pagination and search)
- `GET /api/items/:id` - Get item by ID
- `POST /api/items` - Create new item
- `PUT /api/items/:id` - Update item
- `DELETE /api/items/:id` - Delete item
- `POST /api/import/items-excel` - Import items from Excel file

### Sales Orders
- `GET /api/sales-orders` - Get all sales orders
- `GET /api/sales-orders/:id` - Get sales order by ID
- `POST /api/sales-orders` - Create new sales order
- `PUT /api/sales-orders/:id` - Update sales order
- `DELETE /api/sales-orders/:id` - Delete sales order

### Invoices
- `GET /api/invoices` - Get all invoices
- `GET /api/invoices/:id` - Get invoice by ID
- `POST /api/invoices` - Create new invoice
- `PUT /api/invoices/:id` - Update invoice
- `DELETE /api/invoices/:id` - Delete invoice
- `GET /api/invoices/:id/pdf` - Download invoice as PDF

## Database Schema

The application uses SQLite with the following tables:

- **customers**: Customer information
- **items**: Products and services
- **sales_orders**: Sales orders with line items
- **invoices**: Invoices with line items
- **line_items**: Individual items in orders/invoices

## Key Changes Made

1. **Backend Integration**: Frontend now connects to the backend API instead of using localStorage
2. **Real Database**: All data is stored in SQLite database
3. **API Service**: Created comprehensive API service for frontend-backend communication
4. **Error Handling**: Added proper error handling and user feedback
5. **Data Validation**: Added validation for all forms
6. **Loading States**: Added loading indicators for better UX

## File Structure

```
├── server/
│   ├── index.js          # Backend API server
│   └── database.js       # Database setup and configuration
├── src/
│   ├── lib/
│   │   └── api.ts        # API service for frontend
│   ├── context/
│   │   └── AppContext.tsx # Updated context with API integration
│   ├── pages/
│   │   └── Items/
│   │       ├── ItemsPage.tsx      # Updated items list page
│   │       └── NewItemPage.tsx    # Updated new item form
│   └── types/
│       └── index.ts      # TypeScript type definitions
└── package.json
```

## Troubleshooting

1. **Database not found**: The database file (`ajuun-tex.db`) will be created automatically when you start the server
2. **Port conflicts**: If port 3000 is busy, change the port in `server/index.js`
3. **CORS issues**: The backend is configured to allow CORS from the frontend
4. **API connection**: Make sure both frontend and backend are running

## Development

- Backend: Node.js with Express and SQLite
- Frontend: React with TypeScript and Tailwind CSS
- Database: SQLite with better-sqlite3
- API: RESTful API with proper error handling 