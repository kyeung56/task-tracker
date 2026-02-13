import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/index.js';
import { authMiddleware, requirePermission, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Get all users
router.get('/', authMiddleware, (req: AuthRequest, res) => {
  try {
    const users = db.prepare(`
      SELECT u.id, u.name, u.email, u.avatar_url, u.is_active, u.created_at,
             r.id as role_id, r.name as role_name, r.display_name
      FROM users u
      JOIN roles r ON u.role_id = r.id
      ORDER BY u.name
    `).all() as any[];

    res.json({
      success: true,
      data: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        avatarUrl: u.avatar_url,
        isActive: u.is_active === 1,
        createdAt: u.created_at,
        role: {
          id: u.role_id,
          name: u.role_name,
          displayName: u.display_name,
        },
      })),
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_USERS_ERROR',
        message: 'Failed to get users',
      },
    });
  }
});

// Get user by ID
router.get('/:id', authMiddleware, (req: AuthRequest, res) => {
  try {
    const user = db.prepare(`
      SELECT u.id, u.name, u.email, u.avatar_url, u.is_active, u.created_at,
             r.id as role_id, r.name as role_name, r.display_name, r.permissions
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = ?
    `).get(req.params.id) as any;

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
        isActive: user.is_active === 1,
        createdAt: user.created_at,
        role: {
          id: user.role_id,
          name: user.role_name,
          displayName: user.display_name,
          permissions: JSON.parse(user.permissions),
        },
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_USER_ERROR',
        message: 'Failed to get user',
      },
    });
  }
});

// Update user (admin only)
router.put('/:id', authMiddleware, requirePermission('canManageUsers'), (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { name, email, roleId, isActive, avatarUrl } = req.body;

    const existingUser = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
    }

    db.prepare(`
      UPDATE users
      SET name = COALESCE(?, name),
          email = COALESCE(?, email),
          role_id = COALESCE(?, role_id),
          is_active = COALESCE(?, is_active),
          avatar_url = COALESCE(?, avatar_url),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name, email, roleId, isActive !== undefined ? (isActive ? 1 : 0) : undefined, avatarUrl, id);

    const user = db.prepare(`
      SELECT u.id, u.name, u.email, u.avatar_url, u.is_active, u.created_at,
             r.id as role_id, r.name as role_name, r.display_name
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = ?
    `).get(id) as any;

    res.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatar_url,
        isActive: user.is_active === 1,
        createdAt: user.created_at,
        role: {
          id: user.role_id,
          name: user.role_name,
          displayName: user.display_name,
        },
      },
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_USER_ERROR',
        message: 'Failed to update user',
      },
    });
  }
});

// Get all roles
router.get('/roles/all', authMiddleware, (req: AuthRequest, res) => {
  try {
    const roles = db.prepare('SELECT * FROM roles ORDER BY name').all() as any[];

    res.json({
      success: true,
      data: roles.map((r) => ({
        id: r.id,
        name: r.name,
        displayName: r.display_name,
        permissions: JSON.parse(r.permissions),
        createdAt: r.created_at,
      })),
    });
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_ROLES_ERROR',
        message: 'Failed to get roles',
      },
    });
  }
});

export default router;
