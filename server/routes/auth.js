import express from 'express';
import { login, register, authenticateToken, authorizeRole } from '../auth.js';

const router = express.Router();

// Login route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = login(email, password);
    res.json(result);
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({ error: error.message || 'Login failed' });
  }
});

// Register route
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, organizationName } = req.body;
    
    if (!email || !password || !firstName || !lastName || !organizationName) {
      return res.status(400).json({ 
        error: 'Email, password, first name, last name, and organization name are required' 
      });
    }

    const result = register({ email, password, firstName, lastName, organizationName });
    res.json({ message: 'Registration successful', ...result });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({ error: error.message || 'Registration failed' });
  }
});

// Get current user profile
router.get('/profile', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// Change password
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new passwords are required' });
    }

    // Verify current password and update
    const { db, verifyPassword, hashPassword } = await import('../database.js');
    
    const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
    
    if (!verifyPassword(currentPassword, user.password_hash)) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(
      hashPassword(newPassword), 
      req.user.id
    );

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: error.message || 'Failed to change password' });
  }
});

// Logout (client-side token removal)
router.post('/logout', authenticateToken, (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

export default router; 