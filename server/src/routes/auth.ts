import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/index.js';
import { authMiddleware, generateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

const SALT_ROUNDS = 10;

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Name, email, and password are required',
        },
      });
    }

    // Check if user exists
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'EMAIL_EXISTS',
          message: 'Email already registered',
        },
      });
    }

    // Get default member role
    const memberRole = db.prepare("SELECT * FROM roles WHERE name = 'member'").get() as any;
    if (!memberRole) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'ROLE_NOT_FOUND',
          message: 'Default role not found',
        },
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user
    const userId = uuidv4();
    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, role_id, is_active)
      VALUES (?, ?, ?, ?, ?, 1)
    `).run(userId, name, email, passwordHash, memberRole.id);

    // Generate token
    const token = generateToken({
      id: userId,
      email,
      name,
      roleId: memberRole.id,
      roleName: memberRole.name,
      permissions: JSON.parse(memberRole.permissions),
    });

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: userId,
          name,
          email,
          avatarUrl: null,
          role: {
            id: memberRole.id,
            name: memberRole.name,
            displayName: memberRole.display_name,
            permissions: JSON.parse(memberRole.permissions),
          },
        },
        token,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'REGISTER_ERROR',
        message: 'Failed to register user',
      },
    });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email and password are required',
        },
      });
    }

    // Find user
    const user = db.prepare(`
      SELECT u.*, r.name as role_name, r.display_name, r.permissions
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.email = ? AND u.is_active = 1
    `).get(email) as any;

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        },
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        },
      });
    }

    // Generate token
    const token = generateToken({
      id: user.id,
      email: user.email,
      name: user.name,
      roleId: user.role_id,
      roleName: user.role_name,
      permissions: JSON.parse(user.permissions),
    });

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatarUrl: user.avatar_url,
          role: {
            id: user.role_id,
            name: user.role_name,
            displayName: user.display_name,
            permissions: JSON.parse(user.permissions),
          },
        },
        token,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'LOGIN_ERROR',
        message: 'Failed to login',
      },
    });
  }
});

// Get current user
router.get('/me', authMiddleware, (req: AuthRequest, res) => {
  const user = db.prepare(`
    SELECT u.id, u.name, u.email, u.avatar_url, u.created_at,
           r.id as role_id, r.name as role_name, r.display_name, r.permissions
    FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.id = ?
  `).get(req.user!.id) as any;

  if (!user) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      },
    });
  }

  res.json({
    success: true,
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatar_url,
      createdAt: user.created_at,
      role: {
        id: user.role_id,
        name: user.role_name,
        displayName: user.display_name,
        permissions: JSON.parse(user.permissions),
      },
    },
  });
});

// Update current user
router.put('/me', authMiddleware, (req: AuthRequest, res) => {
  const { name, avatarUrl } = req.body;

  db.prepare(`
    UPDATE users
    SET name = COALESCE(?, name),
        avatar_url = COALESCE(?, avatar_url),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(name, avatarUrl, req.user!.id);

  const user = db.prepare(`
    SELECT u.id, u.name, u.email, u.avatar_url, u.created_at,
           r.id as role_id, r.name as role_name, r.display_name, r.permissions
    FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.id = ?
  `).get(req.user!.id) as any;

  res.json({
    success: true,
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatar_url,
      createdAt: user.created_at,
      role: {
        id: user.role_id,
        name: user.role_name,
        displayName: user.display_name,
        permissions: JSON.parse(user.permissions),
      },
    },
  });
});

// Change password
router.put('/me/password', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Current password and new password are required',
        },
      });
    }

    const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user!.id) as any;

    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PASSWORD',
          message: 'Current password is incorrect',
        },
      });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
      newPasswordHash,
      req.user!.id
    );

    res.json({
      success: true,
      data: { message: 'Password updated successfully' },
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PASSWORD_CHANGE_ERROR',
        message: 'Failed to change password',
      },
    });
  }
});

export default router;
