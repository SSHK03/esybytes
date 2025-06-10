import { body, validationResult } from 'express-validator';

// Validation middleware
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validation failed',
      details: errors.array() 
    });
  }
  next();
};

// Customer validation rules
export const validateCustomer = [
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Name is required and must be between 1-100 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('phone').optional().isMobilePhone().withMessage('Valid phone number is required'),
  body('company_name').optional().trim().isLength({ max: 100 }).withMessage('Company name must be less than 100 characters'),
  body('gstin').optional().matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/).withMessage('Invalid GSTIN format'),
  body('credit_limit').optional().isFloat({ min: 0 }).withMessage('Credit limit must be a positive number'),
  body('payment_terms').optional().isInt({ min: 0, max: 365 }).withMessage('Payment terms must be between 0-365 days'),
  validate
];

// Item validation rules
export const validateItem = [
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Name is required and must be between 1-100 characters'),
  body('sku').trim().isLength({ min: 1, max: 50 }).withMessage('SKU is required and must be between 1-50 characters'),
  body('type').isIn(['product', 'service']).withMessage('Type must be either product or service'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('quantity').optional().isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer'),
  body('unit').optional().trim().isLength({ max: 20 }).withMessage('Unit must be less than 20 characters'),
  body('reorder_level').optional().isInt({ min: 0 }).withMessage('Reorder level must be a non-negative integer'),
  validate
];

// Invoice validation rules
export const validateInvoice = [
  body('customer_id').isUUID().withMessage('Valid customer ID is required'),
  body('date').isISO8601().withMessage('Valid date is required'),
  body('due_date').isISO8601().withMessage('Valid due date is required'),
  body('status').optional().isIn(['draft', 'sent', 'paid', 'overdue', 'cancelled']).withMessage('Invalid status'),
  body('currency').optional().isLength({ min: 3, max: 3 }).withMessage('Currency must be 3 characters'),
  body('exchange_rate').optional().isFloat({ min: 0 }).withMessage('Exchange rate must be a positive number'),
  body('lineItems').isArray({ min: 1 }).withMessage('At least one line item is required'),
  body('lineItems.*.description').trim().isLength({ min: 1, max: 200 }).withMessage('Line item description is required'),
  body('lineItems.*.quantity').isInt({ min: 1 }).withMessage('Line item quantity must be at least 1'),
  body('lineItems.*.price').isFloat({ min: 0 }).withMessage('Line item price must be a positive number'),
  validate
];

// Payment validation rules
export const validatePayment = [
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('payment_method').trim().isLength({ min: 1, max: 50 }).withMessage('Payment method is required'),
  body('type').isIn(['received', 'sent']).withMessage('Type must be either received or sent'),
  body('date').isISO8601().withMessage('Valid date is required'),
  body('customer_id').optional().isUUID().withMessage('Valid customer ID is required'),
  body('vendor_id').optional().isUUID().withMessage('Valid vendor ID is required'),
  body('invoice_id').optional().isUUID().withMessage('Valid invoice ID is required'),
  body('bill_id').optional().isUUID().withMessage('Valid bill ID is required'),
  validate
];

// User validation rules
export const validateUser = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('first_name').trim().isLength({ min: 1, max: 50 }).withMessage('First name is required'),
  body('last_name').trim().isLength({ min: 1, max: 50 }).withMessage('Last name is required'),
  body('role').optional().isIn(['admin', 'staff', 'accountant', 'viewer']).withMessage('Invalid role'),
  validate
];

// Category validation rules
export const validateCategory = [
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Name is required and must be between 1-100 characters'),
  body('type').isIn(['income', 'expense', 'item']).withMessage('Type must be income, expense, or item'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),
  body('parent_id').optional().isUUID().withMessage('Valid parent category ID is required'),
  validate
];

// Tax rate validation rules
export const validateTaxRate = [
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Name is required and must be between 1-100 characters'),
  body('rate').isFloat({ min: 0, max: 100 }).withMessage('Rate must be between 0-100'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),
  validate
];

// Search and pagination validation
export const validateSearch = [
  body('search').optional().trim().isLength({ max: 100 }).withMessage('Search term must be less than 100 characters'),
  body('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  body('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1-100'),
  validate
];

// File upload validation
export const validateFileUpload = [
  body('file').custom((value, { req }) => {
    if (!req.file) {
      throw new Error('File is required');
    }
    
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'];
    
    if (!allowedTypes.includes(req.file.mimetype)) {
      throw new Error('Invalid file type');
    }
    
    if (req.file.size > 5 * 1024 * 1024) { // 5MB
      throw new Error('File size must be less than 5MB');
    }
    
    return true;
  }),
  validate
];

// UUID validation middleware
export const validateUUID = (paramName) => {
  return (req, res, next) => {
    const uuid = req.params[paramName];
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    if (!uuidRegex.test(uuid)) {
      return res.status(400).json({ error: `Invalid ${paramName} format` });
    }
    
    next();
  };
};

// Date range validation
export const validateDateRange = [
  body('date_from').optional().isISO8601().withMessage('Valid start date is required'),
  body('date_to').optional().isISO8601().withMessage('Valid end date is required'),
  body().custom((body) => {
    if (body.date_from && body.date_to) {
      const fromDate = new Date(body.date_from);
      const toDate = new Date(body.date_to);
      
      if (fromDate > toDate) {
        throw new Error('Start date must be before end date');
      }
    }
    return true;
  }),
  validate
];

// Currency validation
export const validateCurrency = [
  body('currency').optional().isLength({ min: 3, max: 3 }).withMessage('Currency must be 3 characters'),
  body('exchange_rate').optional().isFloat({ min: 0 }).withMessage('Exchange rate must be a positive number'),
  validate
];

// Sanitization middleware
export const sanitizeInput = (req, res, next) => {
  // Sanitize string inputs
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].trim();
      }
    });
  }
  
  // Sanitize query parameters
  if (req.query) {
    Object.keys(req.query).forEach(key => {
      if (typeof req.query[key] === 'string') {
        req.query[key] = req.query[key].trim();
      }
    });
  }
  
  next();
};

// Rate limiting for specific endpoints
export const createRateLimit = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// Export all validations
export default {
  validate,
  validateCustomer,
  validateItem,
  validateInvoice,
  validatePayment,
  validateUser,
  validateCategory,
  validateTaxRate,
  validateSearch,
  validateFileUpload,
  validateUUID,
  validateDateRange,
  validateCurrency,
  sanitizeInput,
  createRateLimit
}; 