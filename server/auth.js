import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { db, generateId } from './database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Authentication middleware
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Role-based authorization middleware
export const authorizeRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

// Organization access middleware
export const authorizeOrganization = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const organizationId = req.params.organizationId || req.body.organization_id;
  
  if (!organizationId) {
    return res.status(400).json({ error: 'Organization ID required' });
  }

  // Check if user has access to this organization
  const userOrg = db.prepare(`
    SELECT role FROM organization_users 
    WHERE user_id = ? AND organization_id = ? AND is_active = 1
  `).get(req.user.id, organizationId);

  if (!userOrg) {
    return res.status(403).json({ error: 'Access denied to this organization' });
  }

  req.user.organizationRole = userOrg.role;
  req.organizationId = organizationId;
  next();
};

// Helper function to verify passwords
const verifyPassword = (password, hash) => {
  return bcrypt.compareSync(password, hash);
};

// Helper function to hash passwords
const hashPassword = (password) => {
  return bcrypt.hashSync(password, 10);
};

// Login function
export const login = (email, password) => {
  const user = db.prepare(`
    SELECT u.*, ou.organization_id, ou.role as org_role 
    FROM users u 
    JOIN organization_users ou ON u.id = ou.user_id 
    WHERE u.email = ? AND u.is_active = 1
  `).get(email);

  if (!user || !verifyPassword(password, user.password_hash)) {
    throw new Error('Invalid credentials');
  }

  // Update last login
  db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);

  // Generate JWT token
  const token = jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      role: user.role,
      organizationId: user.organization_id,
      organizationRole: user.org_role
    }, 
    JWT_SECRET, 
    { expiresIn: '24h' }
  );

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      organizationId: user.organization_id,
      organizationRole: user.org_role
    }
  };
};

// Register function
export const register = (userData) => {
  const { email, password, firstName, lastName, organizationName } = userData;

  // Check if user already exists
  const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existingUser) {
    throw new Error('User already exists');
  }

  const userId = generateId();
  const organizationId = generateId();

  // Create organization
  db.prepare(`
    INSERT INTO organizations (id, name, email) 
    VALUES (?, ?, ?)
  `).run(organizationId, organizationName, email);

  // Create user
  db.prepare(`
    INSERT INTO users (id, email, password_hash, first_name, last_name, role) 
    VALUES (?, ?, ?, ?, ?, 'admin')
  `).run(userId, email, hashPassword(password), firstName, lastName);

  // Link user to organization
  db.prepare(`
    INSERT INTO organization_users (id, organization_id, user_id, role) 
    VALUES (?, ?, ?, 'owner')
  `).run(generateId(), organizationId, userId);

  // Create default company settings
  db.prepare(`
    INSERT INTO company_settings (id, organization_id, company_name) 
    VALUES (?, ?, ?)
  `).run(generateId(), organizationId, organizationName);

  return { userId, organizationId };
}; 